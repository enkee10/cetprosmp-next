ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS nacionalidad text;

UPDATE public.users
SET nacionalidad = 'PERUANA'
WHERE nacionalidad IS NULL OR btrim(nacionalidad) = '';

ALTER TABLE public.users
  ALTER COLUMN nacionalidad SET DEFAULT 'PERUANA';
