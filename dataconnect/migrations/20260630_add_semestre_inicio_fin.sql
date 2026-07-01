BEGIN;

ALTER TABLE public.semestres
  ADD COLUMN IF NOT EXISTS inicio timestamptz,
  ADD COLUMN IF NOT EXISTS fin timestamptz;

COMMIT;
