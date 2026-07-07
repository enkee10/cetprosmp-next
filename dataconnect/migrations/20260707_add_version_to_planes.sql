ALTER TABLE public.planes
  ADD COLUMN IF NOT EXISTS version_id integer;

UPDATE public.planes
SET version_id = periodo_vigencia_id
WHERE periodo_vigencia_id IS NOT NULL
  AND version_id IS DISTINCT FROM periodo_vigencia_id;

DO $$
BEGIN
  IF to_regclass('public.semestres') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'planes_version_id_fkey'
         AND conrelid = 'public.planes'::regclass
     ) THEN
    ALTER TABLE public.planes
      ADD CONSTRAINT planes_version_id_fkey
      FOREIGN KEY (version_id)
      REFERENCES public.semestres(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS planes_version_id_idx
  ON public.planes (version_id);
