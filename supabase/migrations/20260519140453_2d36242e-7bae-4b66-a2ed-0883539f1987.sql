
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- App settings (singleton)
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  exchange_rate_dzd_per_usd NUMERIC NOT NULL DEFAULT 150,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_settings (id, exchange_rate_dzd_per_usd) VALUES (1, 150);

-- Plans
CREATE TABLE public.plans (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  usd_value NUMERIC NOT NULL,
  models TEXT[] NOT NULL DEFAULT '{}',
  is_popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

INSERT INTO public.plans (slug, name, usd_value, models, is_popular, sort_order) VALUES
  ('decouverte', 'Découverte', 5, ARRAY['ChatGPT 4o-mini', 'Gemini 2.0 Flash', 'Llama 3.3'], false, 1),
  ('debutant', 'Débutant', 10, ARRAY['ChatGPT 4o-mini', 'Claude 3.5 Haiku', 'Gemini 2.0 Flash', 'Llama 3.1 (8B)'], false, 2),
  ('createur', 'Créateur', 28, ARRAY['ChatGPT 4o', 'Claude 3.5 Sonnet', 'Gemini 2.0 Pro', 'Llama 3.1 (70B & 405B)', 'DALL-E 3'], true, 3),
  ('pro', 'Pro / Agence', 70, ARRAY['Tous les modèles Créateur', 'Grok 2', 'Claude 3 Opus', 'Midjourney v6.1', 'Runway Gen-3', 'Google Veo', 'Accès Prioritaire'], false, 4);

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

-- RLS: profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS: user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS: app_settings (public read, admin write)
CREATE POLICY "Anyone reads settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins update settings" ON public.app_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS: plans (public read, admin write)
CREATE POLICY "Anyone reads plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Admins manage plans" ON public.plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS: payment_requests
CREATE POLICY "Users view own requests" ON public.payment_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own requests" ON public.payment_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all requests" ON public.payment_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update requests" ON public.payment_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Profile auto-creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  -- Default user role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  -- Auto-promote admin email
  IF NEW.email = 'kherobb@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for payment proofs (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);

-- Storage policies
CREATE POLICY "Users upload own proofs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users read own proofs" ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins read all proofs" ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));
