
-- usage_logs
CREATE TABLE public.usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  model_slug TEXT NOT NULL,
  model_name TEXT NOT NULL,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_dzd NUMERIC(12,2) NOT NULL DEFAULT 0,
  used_own_key BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_usage_user ON public.usage_logs(user_id, created_at DESC);
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own usage" ON public.usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all usage" ON public.usage_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- models catalog
CREATE TABLE public.models (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  icon_emoji TEXT NOT NULL DEFAULT '🤖',
  badge TEXT,
  cost_in_usd_per_1k NUMERIC(10,6) NOT NULL DEFAULT 0,
  cost_out_usd_per_1k NUMERIC(10,6) NOT NULL DEFAULT 0,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads models" ON public.models FOR SELECT USING (true);
CREATE POLICY "Admins manage models" ON public.models FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.models (slug, name, provider, icon_emoji, badge, cost_in_usd_per_1k, cost_out_usd_per_1k, is_popular, sort_order) VALUES
('openai/gpt-5', 'GPT-5', 'OpenAI', '🧠', 'POPULAIRE', 0.005, 0.015, true, 1),
('anthropic/claude-sonnet-4', 'Claude Sonnet 4', 'Anthropic', '🎭', 'POPULAIRE', 0.003, 0.015, true, 2),
('google/gemini-2.5-pro', 'Gemini 2.5 Pro', 'Google', '✨', 'POPULAIRE', 0.00125, 0.005, true, 3),
('x-ai/grok-4', 'Grok 4', 'xAI', '⚡', NULL, 0.005, 0.015, false, 4),
('deepseek/deepseek-v3', 'DeepSeek V3', 'DeepSeek', '🔷', 'BON RAPPORT', 0.00027, 0.0011, false, 5),
('meta-llama/llama-3.3-70b', 'Llama 3.3 70B', 'Meta', '🦙', NULL, 0.0004, 0.0004, false, 6),
('mistralai/mistral-large', 'Mistral Large', 'Mistral', '🌬️', NULL, 0.002, 0.006, false, 7),
('qwen/qwen-2.5-72b', 'Qwen 2.5 72B', 'Alibaba', '🐉', NULL, 0.0004, 0.0004, false, 8),
('perplexity/sonar-pro', 'Perplexity Sonar', 'Perplexity', '🔍', 'WEB', 0.003, 0.015, false, 9),
('openai/gpt-5-mini', 'GPT-5 Mini', 'OpenAI', '⚡', 'RAPIDE', 0.00015, 0.0006, false, 10),
('anthropic/claude-haiku-4', 'Claude Haiku 4', 'Anthropic', '🍃', 'RAPIDE', 0.0008, 0.004, false, 11),
('google/gemini-2.5-flash', 'Gemini 2.5 Flash', 'Google', '⚡', 'RAPIDE', 0.000075, 0.0003, false, 12);

-- profile fields
ALTER TABLE public.profiles
  ADD COLUMN openrouter_api_key TEXT,
  ADD COLUMN whatsapp TEXT;

-- app_settings: redotpay QR
ALTER TABLE public.app_settings
  ADD COLUMN redotpay_qr_path TEXT;

-- public bucket for QR + icons
INSERT INTO storage.buckets (id, name, public) VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public read assets" ON storage.objects FOR SELECT USING (bucket_id = 'public-assets');
CREATE POLICY "Admins upload assets" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'public-assets' AND has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Admins update assets" ON storage.objects FOR UPDATE USING (
  bucket_id = 'public-assets' AND has_role(auth.uid(), 'admin'::app_role)
);
