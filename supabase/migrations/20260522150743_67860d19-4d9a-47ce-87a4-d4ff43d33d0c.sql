-- Combined initial schema for DZD AI Hub

-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  openrouter_api_key TEXT,
  whatsapp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- App settings (singleton)
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  exchange_rate_dzd_per_usd NUMERIC NOT NULL DEFAULT 150,
  redotpay_qr_path TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_settings (id, exchange_rate_dzd_per_usd) VALUES (1, 150);

-- Plans
CREATE TABLE public.plans (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ai_value_usd NUMERIC NOT NULL,
  provider_cost_usd NUMERIC NOT NULL DEFAULT 0,
  margin_percent NUMERIC NOT NULL DEFAULT 18,
  models TEXT[] NOT NULL DEFAULT '{}',
  is_popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

INSERT INTO public.plans (slug, name, ai_value_usd, provider_cost_usd, margin_percent, models, is_popular, sort_order) VALUES
  ('decouverte', 'Découverte', 5, 6, 18, ARRAY['Clé API OpenRouter dédiée','Accès aux modèles économiques (~150 modèles)','GPT-4o-mini, Gemini Flash, Llama 3.3, Mistral','Idéal pour tester et découvrir'], false, 1),
  ('debutant', 'Débutant', 10, 11, 18, ARRAY['Clé API OpenRouter dédiée','Accès à ~200 modèles texte','GPT-4o-mini, Claude Haiku, Gemini Flash, DeepSeek','Llama, Mistral, Qwen, Command-R','Parfait pour usage régulier'], false, 2),
  ('createur', 'Créateur', 28, 30, 18, ARRAY['Clé API OpenRouter dédiée','Accès aux ~300 modèles OpenRouter','GPT-4o, Claude 3.5 Sonnet, Gemini 2.0 Pro','Llama 405B, DeepSeek R1, Grok','Modèles image (DALL-E, Flux, SDXL)','Pour créateurs et développeurs'], true, 3),
  ('pro', 'Pro / Agence', 70, 73, 18, ARRAY['Clé API OpenRouter dédiée — quota élevé','Accès complet aux ~300 modèles OpenRouter','Tous modèles premium : GPT-4o, Claude Opus, o1','Gemini 2.0 Pro, Grok 2, DeepSeek R1','Modèles image & multimodaux','Limites de débit supérieures','Support prioritaire WhatsApp'], false, 4);

-- Payment requests
CREATE TABLE public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  plan_slug TEXT NOT NULL REFERENCES public.plans(slug),
  receipt_number TEXT NOT NULL UNIQUE,
  payment_method TEXT NOT NULL,
  proof_path TEXT,
  amount_dzd NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Wallets
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY,
  balance_dzd NUMERIC NOT NULL DEFAULT 0,
  total_credited_dzd NUMERIC NOT NULL DEFAULT 0,
  total_spent_dzd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

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
  source TEXT NOT NULL DEFAULT 'chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX usage_logs_user_created_idx ON public.usage_logs (user_id, created_at DESC);
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

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

-- RLS policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone reads settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins update settings" ON public.app_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone reads plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Admins manage plans" ON public.plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own requests" ON public.payment_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own requests" ON public.payment_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all requests" ON public.payment_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update requests" ON public.payment_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all wallets" ON public.wallets FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage wallets" ON public.wallets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own usage" ON public.usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all usage" ON public.usage_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone reads models" ON public.models FOR SELECT USING (true);
CREATE POLICY "Admins manage models" ON public.models FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto profile/wallet/role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, whatsapp)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NULLIF(NEW.raw_user_meta_data->>'whatsapp', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  IF NEW.email = 'kherobb@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('public-assets', 'public-assets', true);

CREATE POLICY "Users upload own proofs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users read own proofs" ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins read all proofs" ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read assets" ON storage.objects FOR SELECT USING (bucket_id = 'public-assets');
CREATE POLICY "Admins upload assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'public-assets' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update assets" ON storage.objects FOR UPDATE USING (bucket_id = 'public-assets' AND has_role(auth.uid(), 'admin'::app_role));
