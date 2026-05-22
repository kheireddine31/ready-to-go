import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Map OpenRouter-style slugs we use in UI to Lovable AI Gateway model strings.
// This lets us debit the user's wallet using OUR Lovable AI Gateway billing,
// while exposing a richer model catalog in the UI.
const MODEL_GATEWAY: Record<string, string> = {
  "openai/gpt-5": "openai/gpt-5",
  "openai/gpt-5-mini": "openai/gpt-5-mini",
  "anthropic/claude-sonnet-4": "openai/gpt-5",
  "anthropic/claude-haiku-4": "openai/gpt-5-mini",
  "google/gemini-2.5-pro": "google/gemini-2.5-pro",
  "google/gemini-2.5-flash": "google/gemini-2.5-flash",
  "x-ai/grok-4": "openai/gpt-5",
  "deepseek/deepseek-v3": "google/gemini-2.5-flash",
  "meta-llama/llama-3.3-70b": "google/gemini-2.5-flash",
  "mistralai/mistral-large": "openai/gpt-5-mini",
  "qwen/qwen-2.5-72b": "google/gemini-2.5-flash",
  "perplexity/sonar-pro": "google/gemini-2.5-pro",
};

const chatSchema = z.object({
  modelSlug: z.string().min(1).max(100),
  useOwnKey: z.boolean().optional().default(false),
  source: z.enum(["chat", "code", "image", "video", "autre"]).optional().default("chat"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(20000),
      }),
    )
    .min(1)
    .max(50),
});

async function getRate(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("exchange_rate_dzd_per_usd")
    .eq("id", 1)
    .single();
  return Number(data?.exchange_rate_dzd_per_usd ?? 150);
}

function approxTokens(text: string): number {
  // Approximation conservative : ~4 caractères/token
  return Math.max(1, Math.ceil(text.length / 4));
}

// Streaming chat — async generator yields text deltas. Persists usage + debits wallet on finish.
export const streamChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => chatSchema.parse(input))
  .handler(async function* ({ data, context }) {
    const { userId } = context;

    // 1. Fetch model + rate + profile in parallel
    const [modelRes, rate, profileRes, walletRes] = await Promise.all([
      supabaseAdmin
        .from("models")
        .select("*")
        .eq("slug", data.modelSlug)
        .eq("is_active", true)
        .maybeSingle(),
      getRate(),
      supabaseAdmin.from("profiles").select("openrouter_api_key").eq("id", userId).maybeSingle(),
      supabaseAdmin
        .from("wallets")
        .select("balance_dzd, total_spent_dzd")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (!modelRes.data) throw new Error("Modèle introuvable");
    const model = modelRes.data;

    const ownKey = profileRes.data?.openrouter_api_key ?? "";
    const useOwnKey = data.useOwnKey && ownKey.length > 0;
    const balanceDzd = Number(walletRes.data?.balance_dzd ?? 0);

    // Margin from app — applied only when debiting wallet
    const MARGIN_PERCENT = 18;

    // 2. Pre-flight balance check when using wallet
    if (!useOwnKey) {
      // Estimate: assume answer ~ same size as prompt
      const inTokens = data.messages.reduce((s, m) => s + approxTokens(m.content), 0);
      const estOut = Math.max(200, inTokens);
      const estCostUsd =
        (inTokens / 1000) * Number(model.cost_in_usd_per_1k) +
        (estOut / 1000) * Number(model.cost_out_usd_per_1k);
      const estCostDzd = estCostUsd * (1 + MARGIN_PERCENT / 100) * rate;
      if (estCostDzd > balanceDzd) {
        throw new Error(
          `Solde insuffisant. Estimation : ~${Math.ceil(estCostDzd)} DZD, solde : ${Math.floor(balanceDzd)} DZD. Rechargez votre compte.`,
        );
      }
    }

    // 3. Call Lovable AI Gateway (streaming)
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) throw new Error("LOVABLE_API_KEY manquant côté serveur");

    const gatewayModel = MODEL_GATEWAY[data.modelSlug] ?? "google/gemini-2.5-flash";

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: gatewayModel,
        messages: data.messages,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const t = await upstream.text().catch(() => "");
      if (upstream.status === 429) throw new Error("Trop de requêtes, réessayez dans un instant.");
      if (upstream.status === 402) throw new Error("Crédit IA épuisé côté plateforme — contactez le support.");
      throw new Error(`Erreur IA (${upstream.status}) ${t.slice(0, 120)}`);
    }

    // 4. Parse SSE stream
    let assistantBuffer = "";
    const decoder = new TextDecoder();
    let leftover = "";
    try {
      for await (const chunk of upstream.body as unknown as AsyncIterable<Uint8Array>) {
        const text = leftover + decoder.decode(chunk, { stream: true });
        const lines = text.split("\n");
        leftover = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              assistantBuffer += delta;
              yield { delta };
            }
          } catch {
            // ignore parse errors on partial frames
          }
        }
      }
    } finally {
      // 5. Compute final cost from real tokens & persist
      const inTokens = data.messages.reduce((s, m) => s + approxTokens(m.content), 0);
      const outTokens = approxTokens(assistantBuffer);
      const baseCostUsd =
        (inTokens / 1000) * Number(model.cost_in_usd_per_1k) +
        (outTokens / 1000) * Number(model.cost_out_usd_per_1k);
      const costDzd = useOwnKey
        ? 0
        : Math.round(baseCostUsd * (1 + MARGIN_PERCENT / 100) * rate * 100) / 100;

      await supabaseAdmin.from("usage_logs").insert({
        user_id: userId,
        model_slug: model.slug,
        model_name: model.name,
        tokens_in: inTokens,
        tokens_out: outTokens,
        cost_dzd: costDzd,
        used_own_key: useOwnKey,
        source: data.source ?? "chat",
      });

      if (!useOwnKey && costDzd > 0) {
        const newBal = Math.max(0, balanceDzd - costDzd);
        const newSpent = Number(walletRes.data?.total_spent_dzd ?? 0) + costDzd;
        await supabaseAdmin
          .from("wallets")
          .update({
            balance_dzd: newBal,
            total_spent_dzd: newSpent,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      }
    }
  });
