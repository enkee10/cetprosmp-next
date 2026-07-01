BEGIN;

ALTER TABLE public.calendarios
  ADD COLUMN IF NOT EXISTS duracion integer;

COMMIT;
