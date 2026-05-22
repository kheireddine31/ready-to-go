import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- helpers ----------
function computePriceDzd(providerCostUsd: number, marginPercent: number, rate: number): number {
  return Math.round(providerCostUsd * (1 + marginPercent / 100) * rate);
}

async function getRate(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("exchange_rate_dzd_per_usd")
    .eq("id", 1)
    .single();
  return Number(data?.exchange_rate_dzd_per_usd ?? 150);
}

async function assertAdmin(userId: string) {
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (!roles?.some((r) => r.role === "admin")) throw new Error("Accès refusé");
}

// ---------- PUBLIC ----------
export const getPublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  const [rate, plansRes, settingsRes] = await Promise.all([
    getRate(),
    supabaseAdmin.from("plans").select("*").order("sort_order"),
    supabaseAdmin.from("app_settings").select("redotpay_qr_path").eq("id", 1).single(),
  ]);

  let redotpayQrUrl: string | null = null;
  if (settingsRes.data?.redotpay_qr_path) {
    const { data: pub } = supabaseAdmin.storage
      .from("public-assets")
      .getPublicUrl(settingsRes.data.redotpay_qr_path);
    redotpayQrUrl = pub.publicUrl;
  }

  return {
    redotpayQrUrl,
    plans:
      plansRes.data?.map((p) => ({
        slug: p.slug,
        name: p.name,
        models: p.models,
        isPopular: p.is_popular,
        priceDzd: computePriceDzd(
          Number(p.provider_cost_usd),
          Number(p.margin_percent),
          rate,
        ),
      })) ?? [],
  };
});

export const listModels = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("models")
    .select("slug, name, provider, icon_emoji, badge, is_popular")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []).map((m) => ({
    slug: m.slug,
    name: m.name,
    provider: m.provider,
    iconEmoji: m.icon_emoji,
    badge: m.badge,
    isPopular: m.is_popular,
  }));
});

// ---------- AUTH: submit payment ----------
const submitSchema = z.object({
  planSlug: z.string().min(1),
  receiptNumber: z.string().trim().min(3).max(100),
  paymentMethod: z.enum(["BaridiMob", "Redotpay", "CCP", "CIB", "Virement bancaire"]),
  proofPath: z.string().max(500).optional().nullable(),
});

export const submitPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => submitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;

    const [planRes, rate] = await Promise.all([
      supabaseAdmin
        .from("plans")
        .select("name, provider_cost_usd, margin_percent")
        .eq("slug", data.planSlug)
        .single(),
      getRate(),
    ]);

    if (!planRes.data) throw new Error("Forfait introuvable");
    const amountDzd = computePriceDzd(
      Number(planRes.data.provider_cost_usd),
      Number(planRes.data.margin_percent),
      rate,
    );

    const { data: existing } = await supabaseAdmin
      .from("payment_requests")
      .select("id")
      .eq("receipt_number", data.receiptNumber)
      .maybeSingle();
    if (existing) throw new Error("Ce numéro de reçu a déjà été soumis");

    const email = (claims as { email?: string }).email ?? "";
    const { error } = await supabase.from("payment_requests").insert({
      user_id: userId,
      user_email: email,
      plan_slug: data.planSlug,
      receipt_number: data.receiptNumber,
      payment_method: data.paymentMethod,
      proof_path: data.proofPath ?? null,
      amount_dzd: amountDzd,
    });
    if (error) throw new Error(error.message);

    return { ok: true, amountDzd, planName: planRes.data.name };
  });

// ---------- AUTH: my requests ----------
export const getMyRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("payment_requests")
      .select("id, plan_slug, receipt_number, payment_method, amount_dzd, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- AUTH: my wallet ----------
export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("wallets")
      .select("balance_dzd, total_credited_dzd, total_spent_dzd")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      balanceDzd: Number(data?.balance_dzd ?? 0),
      totalCreditedDzd: Number(data?.total_credited_dzd ?? 0),
      totalSpentDzd: Number(data?.total_spent_dzd ?? 0),
    };
  });

// ---------- AUTH: my profile (whatsapp + own openrouter key presence) ----------
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("full_name, whatsapp, openrouter_api_key")
      .eq("id", userId)
      .maybeSingle();
    return {
      email: (claims as { email?: string }).email ?? "",
      fullName: data?.full_name ?? "",
      whatsapp: data?.whatsapp ?? "",
      hasOwnKey: Boolean(data?.openrouter_api_key && data.openrouter_api_key.length > 0),
    };
  });

const updateProfileSchema = z.object({
  fullName: z.string().trim().max(120).optional(),
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+0-9 ()-]*$/, "Format invalide")
    .optional(),
  openrouterApiKey: z.string().trim().max(200).optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const update: {
      full_name?: string | null;
      whatsapp?: string | null;
      openrouter_api_key?: string | null;
    } = {};
    if (data.fullName !== undefined) update.full_name = data.fullName;
    if (data.whatsapp !== undefined) update.whatsapp = data.whatsapp || null;
    if (data.openrouterApiKey !== undefined) {
      update.openrouter_api_key = data.openrouterApiKey || null;
    }
    const { error } = await supabaseAdmin.from("profiles").update(update).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- AUTH: usage stats ----------
export const getMyUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("usage_logs")
      .select("model_slug, model_name, tokens_in, tokens_out, cost_dzd, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);

    const logs = data ?? [];
    const byModel = new Map<
      string,
      { slug: string; name: string; count: number; tokens: number; costDzd: number }
    >();
    let totalMessages = 0;
    let totalTokens = 0;
    let totalCostDzd = 0;
    for (const l of logs) {
      const t = (l.tokens_in ?? 0) + (l.tokens_out ?? 0);
      const c = Number(l.cost_dzd ?? 0);
      totalMessages += 1;
      totalTokens += t;
      totalCostDzd += c;
      const prev = byModel.get(l.model_slug) ?? {
        slug: l.model_slug,
        name: l.model_name,
        count: 0,
        tokens: 0,
        costDzd: 0,
      };
      prev.count += 1;
      prev.tokens += t;
      prev.costDzd += c;
      byModel.set(l.model_slug, prev);
    }
    return {
      totalMessages,
      totalTokens,
      totalCostDzd: Math.round(totalCostDzd * 100) / 100,
      byModel: Array.from(byModel.values()).sort((a, b) => b.costDzd - a.costDzd),
      recent: logs.slice(0, 20),
    };
  });

// ---------- AUTH: who am I ----------
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = roles?.some((r) => r.role === "admin") ?? false;
    return {
      userId,
      email: (claims as { email?: string }).email ?? "",
      isAdmin,
    };
  });

// ---------- ADMIN ----------
export const updateExchangeRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ rate: z.number().min(1).max(10000) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update({ exchange_rate_dzd_per_usd: data.rate, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setRedotpayQrPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ path: z.string().min(1).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update({ redotpay_qr_path: data.path, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [rate, plansRes] = await Promise.all([
      getRate(),
      supabaseAdmin.from("plans").select("*").order("sort_order"),
    ]);
    return {
      rate,
      plans:
        plansRes.data?.map((p) => {
          const cost = Number(p.provider_cost_usd);
          const margin = Number(p.margin_percent);
          const priceDzd = computePriceDzd(cost, margin, rate);
          const profitDzd = Math.round(priceDzd - cost * rate);
          return {
            slug: p.slug,
            name: p.name,
            aiValueUsd: Number(p.ai_value_usd),
            providerCostUsd: cost,
            marginPercent: margin,
            priceDzd,
            profitDzd,
            isPopular: p.is_popular,
            models: p.models,
          };
        }) ?? [],
    };
  });

const updatePlanSchema = z.object({
  slug: z.string().min(1).max(50),
  providerCostUsd: z.number().min(0).max(10000),
  marginPercent: z.number().min(0).max(500),
});

export const updatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updatePlanSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("plans")
      .update({
        provider_cost_usd: data.providerCostUsd,
        margin_percent: data.marginPercent,
      })
      .eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAllRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("payment_requests")
      .select("*")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

const decideSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().max(500).optional().nullable(),
});

export const decidePaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => decideSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: req, error: fetchErr } = await supabaseAdmin
      .from("payment_requests")
      .select("id, user_id, amount_dzd, status")
      .eq("id", data.id)
      .single();
    if (fetchErr || !req) throw new Error("Demande introuvable");
    if (req.status !== "pending") throw new Error("Demande déjà traitée");

    const { error: updErr } = await supabaseAdmin
      .from("payment_requests")
      .update({
        status: data.decision,
        rejection_reason: data.decision === "rejected" ? (data.reason ?? null) : null,
      })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    if (data.decision === "approved") {
      const amount = Number(req.amount_dzd);
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("balance_dzd, total_credited_dzd")
        .eq("user_id", req.user_id)
        .maybeSingle();

      if (wallet) {
        await supabaseAdmin
          .from("wallets")
          .update({
            balance_dzd: Number(wallet.balance_dzd) + amount,
            total_credited_dzd: Number(wallet.total_credited_dzd) + amount,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", req.user_id);
      } else {
        await supabaseAdmin.from("wallets").insert({
          user_id: req.user_id,
          balance_dzd: amount,
          total_credited_dzd: amount,
        });
      }
    }

    return { ok: true };
  });

export const getProofSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ path: z.string().min(1).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: signed, error } = await supabaseAdmin.storage
      .from("payment-proofs")
      .createSignedUrl(data.path, 300);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

// ---------- ADMIN: pending users (for sending QR via WhatsApp) ----------
export const getPendingUsersForQr = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: reqs } = await supabaseAdmin
      .from("payment_requests")
      .select("user_id, user_email, plan_slug, amount_dzd, payment_method, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const ids = Array.from(new Set((reqs ?? []).map((r) => r.user_id)));
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, whatsapp").in("id", ids)
      : { data: [] as Array<{ id: string; full_name: string | null; whatsapp: string | null }> };
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));

    return (reqs ?? []).map((r) => {
      const p = profMap.get(r.user_id);
      return {
        userId: r.user_id,
        email: r.user_email,
        fullName: p?.full_name ?? "",
        whatsapp: p?.whatsapp ?? "",
        planSlug: r.plan_slug,
        amountDzd: Number(r.amount_dzd),
        paymentMethod: r.payment_method,
        createdAt: r.created_at,
      };
    });
  });

// ---------- ADMIN: users overview ----------
// Returns every user with profile + wallet aggregates + usage rollups
// (per-model totals) AND the 20 most recent usage events for the detail view.
export const getAllUsersOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const [profilesRes, walletsRes, usageRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name, whatsapp"),
      supabaseAdmin
        .from("wallets")
        .select("user_id, balance_dzd, total_credited_dzd, total_spent_dzd"),
      supabaseAdmin
        .from("usage_logs")
        .select(
          "user_id, model_slug, model_name, tokens_in, tokens_out, cost_dzd, source, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

    const profiles = profilesRes.data ?? [];
    const wallets = new Map(
      (walletsRes.data ?? []).map((w) => [w.user_id, w]),
    );
    const logs = usageRes.data ?? [];

    type UsageRow = {
      modelSlug: string;
      modelName: string;
      source: string;
      tokens: number;
      costDzd: number;
      createdAt: string;
    };
    const usageByUser = new Map<
      string,
      {
        recent: UsageRow[];
        byModel: Map<string, { name: string; tokens: number; costDzd: number; count: number }>;
        bySource: Map<string, { tokens: number; costDzd: number; count: number }>;
      }
    >();

    for (const l of logs) {
      const tokens = (l.tokens_in ?? 0) + (l.tokens_out ?? 0);
      const cost = Number(l.cost_dzd ?? 0);
      const bucket =
        usageByUser.get(l.user_id) ??
        ({
          recent: [] as UsageRow[],
          byModel: new Map<
            string,
            { name: string; tokens: number; costDzd: number; count: number }
          >(),
          bySource: new Map<string, { tokens: number; costDzd: number; count: number }>(),
        });
      if (bucket.recent.length < 20) {
        bucket.recent.push({
          modelSlug: l.model_slug,
          modelName: l.model_name,
          source: l.source ?? "chat",
          tokens,
          costDzd: cost,
          createdAt: l.created_at,
        });
      }
      const m = bucket.byModel.get(l.model_slug) ?? {
        name: l.model_name,
        tokens: 0,
        costDzd: 0,
        count: 0,
      };
      m.tokens += tokens;
      m.costDzd += cost;
      m.count += 1;
      bucket.byModel.set(l.model_slug, m);

      const src = l.source ?? "chat";
      const s = bucket.bySource.get(src) ?? { tokens: 0, costDzd: 0, count: 0 };
      s.tokens += tokens;
      s.costDzd += cost;
      s.count += 1;
      bucket.bySource.set(src, s);

      usageByUser.set(l.user_id, bucket);
    }

    return profiles
      .map((p) => {
        const w = wallets.get(p.id);
        const u = usageByUser.get(p.id);
        return {
          userId: p.id,
          email: p.email,
          fullName: p.full_name ?? "",
          whatsapp: p.whatsapp ?? "",
          balanceDzd: Number(w?.balance_dzd ?? 0),
          totalCreditedDzd: Number(w?.total_credited_dzd ?? 0),
          totalSpentDzd: Number(w?.total_spent_dzd ?? 0),
          totalMessages: u
            ? Array.from(u.byModel.values()).reduce((s, m) => s + m.count, 0)
            : 0,
          recent: u?.recent ?? [],
          byModel: u
            ? Array.from(u.byModel.entries())
                .map(([slug, v]) => ({ slug, ...v }))
                .sort((a, b) => b.costDzd - a.costDzd)
            : [],
          bySource: u
            ? Array.from(u.bySource.entries())
                .map(([source, v]) => ({ source, ...v }))
                .sort((a, b) => b.costDzd - a.costDzd)
            : [],
        };
      })
      .sort((a, b) => b.totalSpentDzd - a.totalSpentDzd);
  });

// ---------- PUBLIC: trending models ----------
// Curated ranking from OpenRouter top-week + Chatbot Arena leaderboard.
// Updated manually; static here to avoid live scraping.
export const getTrendingModels = createServerFn({ method: "GET" }).handler(async () => {
  return {
    updatedAt: "2026-05-21",
    sources: [
      { label: "OpenRouter Rankings", url: "https://openrouter.ai/models" },
      { label: "Chatbot Arena Leaderboard", url: "https://arena.ai/leaderboard/text/overall" },
    ],
    items: [
      { rank: 1, slug: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic", change: "up" },
      { rank: 2, slug: "openai/gpt-5", name: "GPT-5", provider: "OpenAI", change: "same" },
      { rank: 3, slug: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", change: "up" },
      { rank: 4, slug: "x-ai/grok-4", name: "Grok 4", provider: "xAI", change: "up" },
      { rank: 5, slug: "deepseek/deepseek-v3", name: "DeepSeek V3", provider: "DeepSeek", change: "up" },
      { rank: 6, slug: "openai/gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI", change: "same" },
      { rank: 7, slug: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", change: "down" },
      { rank: 8, slug: "meta-llama/llama-3.3-70b", name: "Llama 3.3 70B", provider: "Meta", change: "same" },
    ] as Array<{
      rank: number;
      slug: string;
      name: string;
      provider: string;
      change: "up" | "down" | "same";
    }>,
  };
});
