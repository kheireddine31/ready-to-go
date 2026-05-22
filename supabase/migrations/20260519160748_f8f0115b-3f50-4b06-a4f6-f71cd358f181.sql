
-- 1. Plans: add private cost/margin fields, rename usd_value -> ai_value_usd
ALTER TABLE public.plans RENAME COLUMN usd_value TO ai_value_usd;
ALTER TABLE public.plans ADD COLUMN provider_cost_usd NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN margin_percent NUMERIC NOT NULL DEFAULT 18;

-- Seed real costs (OpenRouter + fees)
UPDATE public.plans SET provider_cost_usd = 6,  margin_percent = 18 WHERE slug = 'decouverte';
UPDATE public.plans SET provider_cost_usd = 11, margin_percent = 18 WHERE slug = 'debutant';
UPDATE public.plans SET provider_cost_usd = 30, margin_percent = 18 WHERE slug = 'createur';
UPDATE public.plans SET provider_cost_usd = 73, margin_percent = 18 WHERE slug = 'pro';

-- 2. Wallets
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY,
  balance_dzd NUMERIC NOT NULL DEFAULT 0,
  total_credited_dzd NUMERIC NOT NULL DEFAULT 0,
  total_spent_dzd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all wallets" ON public.wallets
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage wallets" ON public.wallets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Auto-create wallet on signup (extend handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  IF NEW.email = 'kherobb@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.wallets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill wallets for existing users
INSERT INTO public.wallets (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Ensure trigger exists (in case it wasn't created earlier)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
