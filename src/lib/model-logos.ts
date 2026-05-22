// Logos officiels via Brandfetch CDN (couleur), avec fallback Simple Icons (monochrome).
// → Crée un compte gratuit sur https://brandfetch.com/developers (Brand API)
//   puis colle ton clientId ci-dessous. Tant qu'il vaut "", on retombe sur Simple Icons.
export const BRANDFETCH_CLIENT_ID = "1idcNKEH6zm5BlkkMw-";

// provider name → domaine officiel (utilisé par Brandfetch)
const PROVIDER_DOMAIN: Record<string, string> = {
  OpenAI: "openai.com",
  Anthropic: "anthropic.com",
  Google: "gemini.google.com",
  xAI: "x.ai",
  DeepSeek: "deepseek.com",
  Meta: "meta.com",
  Mistral: "mistral.ai",
  Alibaba: "qwen.ai",
  Perplexity: "perplexity.ai",
  Cohere: "cohere.com",
};

// provider name → slug Simple Icons (fallback)
const PROVIDER_SI: Record<string, string> = {
  OpenAI: "openai",
  Anthropic: "anthropic",
  Google: "googlegemini",
  xAI: "x",
  DeepSeek: "deepseek",
  Meta: "meta",
  Mistral: "mistralai",
  Alibaba: "alibabacloud",
  Perplexity: "perplexity",
  Cohere: "cohere",
};

// per-model overrides (slug du modèle → provider clé)
const MODEL_PROVIDER: Record<string, keyof typeof PROVIDER_DOMAIN> = {
  "openai/gpt-5": "OpenAI",
  "openai/gpt-5-mini": "OpenAI",
  "anthropic/claude-sonnet-4": "Anthropic",
  "anthropic/claude-haiku-4": "Anthropic",
  "google/gemini-2.5-pro": "Google",
  "google/gemini-2.5-flash": "Google",
  "x-ai/grok-4": "xAI",
  "deepseek/deepseek-v3": "DeepSeek",
  "meta-llama/llama-3.3-70b": "Meta",
  "mistralai/mistral-large": "Mistral",
  "qwen/qwen-2.5-72b": "Alibaba",
  "perplexity/sonar-pro": "Perplexity",
};

// Brand colors fallback pour la tuile Simple Icons
const BRAND_BG: Record<string, string> = {
  openai: "#10A37F",
  anthropic: "#191919",
  googlegemini: "#1A73E8",
  x: "#000000",
  deepseek: "#4D6BFE",
  meta: "#0467DF",
  mistralai: "#FA520F",
  alibabacloud: "#FF6A00",
  perplexity: "#1FB8CD",
  cohere: "#FF7759",
};

export function getModelLogo(slug: string, provider?: string) {
  const providerKey = MODEL_PROVIDER[slug] ?? provider ?? "OpenAI";
  const domain = PROVIDER_DOMAIN[providerKey];
  const siSlug = PROVIDER_SI[providerKey] ?? "openai";

  const brandfetch =
    BRANDFETCH_CLIENT_ID && domain ? `https://cdn.brandfetch.io/${domain}/w/128/h/128?c=${BRANDFETCH_CLIENT_ID}` : null;

  const fallback = `https://cdn.simpleicons.org/${siSlug}/ffffff`;

  return {
    src: brandfetch ?? fallback,
    fallbackSrc: fallback,
    bg: brandfetch ? "transparent" : (BRAND_BG[siSlug] ?? "#111827"),
    isOfficial: Boolean(brandfetch),
  };
}
