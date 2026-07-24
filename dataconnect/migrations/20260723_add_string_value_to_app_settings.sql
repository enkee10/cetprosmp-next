ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS string_value text;
