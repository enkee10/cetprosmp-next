ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS int_value integer;
