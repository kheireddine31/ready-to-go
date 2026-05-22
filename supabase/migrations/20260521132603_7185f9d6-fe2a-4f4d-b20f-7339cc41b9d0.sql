ALTER TABLE public.usage_logs
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'chat';
CREATE INDEX IF NOT EXISTS usage_logs_user_created_idx
  ON public.usage_logs (user_id, created_at DESC);