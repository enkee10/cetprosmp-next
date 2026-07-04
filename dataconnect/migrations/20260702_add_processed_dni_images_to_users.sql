ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS dni_imagen_frente_procesada_url text,
  ADD COLUMN IF NOT EXISTS dni_imagen_reverso_procesada_url text;
