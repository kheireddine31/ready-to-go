import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send, Sparkles, KeyRound, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { ModelLogo } from "@/components/model-logo";
import { supabase } from "@/integrations/supabase/client";
import { listModels, getMyWallet, getMyProfile } from "@/lib/app.functions";
import { streamChat } from "@/lib/chat.functions";
import { formatDZD } from "@/lib/constants";

export const Route = createFileRoute("/platform")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [{ title: "Chat — DZD.AI" }],
  }),
  component: PlatformPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function PlatformPage() {
  const fetchModels = useServerFn(listModels);
  const fetchWallet = useServerFn(getMyWallet);
  const fetchProfile = useServerFn(getMyProfile);
  const sendChat = useServerFn(streamChat);

  const { data: models } = useQuery({ queryKey: ["models"], queryFn: () => fetchModels() });
  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => fetchWallet(),
  });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [selectedModel, setSelectedModel] = useState<string>("openai/gpt-5-mini");
  const [useOwnKey, setUseOwnKey] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (models?.length && !models.find((m) => m.slug === selectedModel)) {
      setSelectedModel(models[0].slug);
    }
  }, [models, selectedModel]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const hasOwnKey = profile?.hasOwnKey ?? false;
  const currentModel = models?.find((m) => m.slug === selectedModel);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    if (!useOwnKey && (wallet?.balanceDzd ?? 0) <= 0) {
      toast.error("Votre solde est à 0 DZD. Rechargez votre compte.");
      return;
    }

    const nextMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...nextMsgs, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    try {
      const stream = await sendChat({
        data: {
          modelSlug: selectedModel,
          useOwnKey: useOwnKey && hasOwnKey,
          messages: nextMsgs,
        },
      });
      for await (const chunk of stream as AsyncIterable<{ delta: string }>) {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: last.content + chunk.delta };
          }
          return copy;
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast.error(msg);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
      refetchWallet();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 flex flex-col lg:flex-row gap-4">
        {/* SIDEBAR */}
        <aside className="lg:w-72 shrink-0 space-y-4">
          <div className="glass-strong rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Solde
              </span>
            </div>
            <div className="text-2xl font-bold text-gradient mb-1">
              {formatDZD(wallet?.balanceDzd ?? 0)}
            </div>
            <Link to="/dashboard" className="text-xs text-primary hover:underline">
              Recharger →
            </Link>
          </div>

          <div className="glass rounded-2xl p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Mode de paiement IA
            </label>
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (!hasOwnKey) {
                    toast.error("Ajoutez d'abord votre clé OpenRouter dans Mon Compte.");
                    return;
                  }
                  setUseOwnKey(true);
                }}
                className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                  useOwnKey
                    ? "border-primary bg-accent/40"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <KeyRound className="w-4 h-4" /> Ma clé API
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {hasOwnKey
                    ? "Aucune déduction du solde."
                    : "Configurez votre clé dans Mon Compte pour l'utiliser."}
                </p>
              </button>
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Modèle
            </label>
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {models?.map((m) => (
                <button
                  key={m.slug}
                  onClick={() => setSelectedModel(m.slug)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left text-sm transition-colors ${
                    selectedModel === m.slug
                      ? "bg-accent/40 border border-primary/40"
                      : "border border-transparent hover:bg-accent/20"
                  }`}
                >
                  <ModelLogo slug={m.slug} provider={m.provider} size={32} rounded="rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{m.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{m.provider}</div>
                  </div>
                  {m.badge && (
                    <span className="text-[8px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-bold">
                      {m.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* CHAT */}
        <section className="flex-1 flex flex-col glass-strong rounded-2xl overflow-hidden min-h-[70vh]">
          <header className="px-5 py-3 border-b border-border flex items-center gap-3">
            {currentModel ? (
              <ModelLogo slug={currentModel.slug} provider={currentModel.provider} size={36} />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-xl">
                🤖
              </div>
            )}
            <div className="flex-1">
              <div className="text-sm font-semibold">{currentModel?.name ?? "Modèle"}</div>
              <div className="text-[11px] text-muted-foreground">
                {currentModel?.provider} · {useOwnKey ? "Votre clé API" : "Débit du solde DZD"}
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Nouveau chat
              </button>
            )}
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">Posez votre première question</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Choisissez un modèle dans la sidebar et commencez à discuter. Le coût est
                  débité de votre solde uniquement après la réponse complète.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent/40 text-foreground"
                  }`}
                >
                  {m.content || (isStreaming && i === messages.length - 1 ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null)}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="border-t border-border p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder="Votre message…"
                className="flex-1 resize-none rounded-xl px-4 py-2.5 bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm max-h-40"
                disabled={isStreaming}
              />
              <button
                type="submit"
                disabled={isStreaming || !input.trim()}
                className="bg-primary hover:bg-primary-glow text-primary-foreground font-medium px-4 py-2.5 rounded-xl flex items-center gap-1.5 disabled:opacity-50 text-sm"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Envoyer
              </button>
            </form>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Les coûts indiqués sont approximatifs (basés sur le nombre de tokens estimé).
            </p>
          </div>
        </section>
      </main>

      <BotsShowcase
        models={models ?? []}
        onPick={(slug) => {
          setSelectedModel(slug);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}

type ShowcaseBot = {
  slug: string;
  name: string;
  provider: string;
  external?: boolean;
};

// Curated catalog inspired by poe.com/explore categories.
// `external: true` bots are showcase-only (not wired to the chat backend yet).
const CATALOG: Array<{ title: string; items: ShowcaseBot[] }> = [
  {
    title: "Bots officiels",
    items: [
      { slug: "openai/gpt-5", name: "GPT-5", provider: "OpenAI" },
      { slug: "anthropic/claude-sonnet-4", name: "Claude-Sonnet-4", provider: "Anthropic" },
      { slug: "google/gemini-2.5-pro", name: "Gemini-2.5-Pro", provider: "Google" },
      { slug: "x-ai/grok-4", name: "Grok-4", provider: "xAI" },
      { slug: "meta-llama/llama-3.3-70b", name: "Llama-3.3", provider: "Meta" },
      { slug: "mistralai/mistral-large", name: "Mistral-Large", provider: "Mistral" },
    ],
  },
  {
    title: "Bots économiques",
    items: [
      { slug: "openai/gpt-5-mini", name: "GPT-5-Mini", provider: "OpenAI" },
      { slug: "anthropic/claude-haiku-4", name: "Claude-Haiku-4", provider: "Anthropic" },
      { slug: "google/gemini-2.5-flash", name: "Gemini-2.5-Flash", provider: "Google" },
      { slug: "deepseek/deepseek-v3", name: "DeepSeek-V3", provider: "DeepSeek" },
      { slug: "qwen/qwen-2.5-72b", name: "Qwen-2.5", provider: "Alibaba" },
    ],
  },
  {
    title: "Bots de recherche",
    items: [
      { slug: "perplexity/sonar-pro", name: "Perplexity-Sonar", provider: "Perplexity" },
      { slug: "perplexity/sonar", name: "Sonar-Web", provider: "Perplexity", external: true },
      { slug: "google/gemini-2.5-pro", name: "Gemini-Search", provider: "Google" },
      { slug: "you/research", name: "You-Research", provider: "You.com", external: true },
    ],
  },
  {
    title: "Bots d'images",
    items: [
      { slug: "midjourney/v6", name: "Midjourney-V6", provider: "Midjourney", external: true },
      { slug: "stability/sdxl", name: "Stable-Diffusion-XL", provider: "Stability AI", external: true },
      { slug: "black-forest-labs/flux", name: "FLUX-Pro", provider: "Black Forest", external: true },
      { slug: "openai/dalle-3", name: "DALL·E-3", provider: "OpenAI", external: true },
      { slug: "ideogram/v2", name: "Ideogram-V2", provider: "Ideogram", external: true },
    ],
  },
  {
    title: "Bots vidéo",
    items: [
      { slug: "runway/gen-3", name: "Runway-Gen-3", provider: "Runway", external: true },
      { slug: "pika/v2", name: "Pika-2.0", provider: "Pika Labs", external: true },
      { slug: "luma/dream-machine", name: "Luma-Dream", provider: "Luma", external: true },
      { slug: "kling/v2", name: "Kling-V2", provider: "Kuaishou", external: true },
      { slug: "openai/sora", name: "Sora", provider: "OpenAI", external: true },
    ],
  },
  {
    title: "Bots audio",
    items: [
      { slug: "elevenlabs/voice", name: "ElevenLabs", provider: "ElevenLabs", external: true },
      { slug: "suno/v4", name: "Suno-V4", provider: "Suno", external: true },
      { slug: "udio/music", name: "Udio", provider: "Udio", external: true },
      { slug: "openai/whisper", name: "Whisper", provider: "OpenAI", external: true },
    ],
  },
  {
    title: "Bots de programmation",
    items: [
      { slug: "anthropic/claude-sonnet-4", name: "Claude-Code", provider: "Anthropic" },
      { slug: "openai/gpt-5", name: "GPT-5-Coder", provider: "OpenAI" },
      { slug: "deepseek/deepseek-v3", name: "DeepSeek-Coder", provider: "DeepSeek" },
      { slug: "qwen/qwen-2.5-72b", name: "Qwen-Coder", provider: "Alibaba" },
      { slug: "mistralai/mistral-large", name: "Codestral", provider: "Mistral" },
    ],
  },
];

function BotsShowcase({
  models,
  onPick,
}: {
  models: Array<{ slug: string; name: string; provider: string; isPopular?: boolean }>;
  onPick: (slug: string) => void;
}) {
  const availableSlugs = new Set(models.map((m) => m.slug));
  return (
    <section className="max-w-6xl w-full mx-auto px-4 pb-12 space-y-10">
      {CATALOG.map((row) => (
        <BotRow
          key={row.title}
          title={row.title}
          items={row.items}
          available={availableSlugs}
          onPick={onPick}
        />
      ))}
    </section>
  );
}

function BotRow({
  title,
  items,
  available,
  onPick,
}: {
  title: string;
  items: ShowcaseBot[];
  available: Set<string>;
  onPick: (slug: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {items.map((m) => {
          const isAvailable = !m.external && available.has(m.slug);
          return (
            <button
              key={`${title}-${m.slug}-${m.name}`}
              type="button"
              onClick={() => {
                if (isAvailable) onPick(m.slug);
                else toast.message(`${m.name} : bientôt disponible dans le chat`);
              }}
              className="shrink-0 w-24 text-center group"
            >
              <div className="relative">
                <ModelLogo
                  slug={m.slug}
                  provider={m.provider}
                  size={72}
                  rounded="rounded-2xl"
                  className={`mx-auto mb-2 group-hover:scale-105 transition-transform ${
                    isAvailable ? "" : "opacity-70"
                  }`}
                />
                {!isAvailable && (
                  <span className="absolute -top-1 -right-1 text-[8px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-semibold">
                    SOON
                  </span>
                )}
              </div>
              <div className="text-xs font-medium truncate">{m.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{m.provider}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
