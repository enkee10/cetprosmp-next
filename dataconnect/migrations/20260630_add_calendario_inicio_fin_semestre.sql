BEGIN;

ALTER TABLE public.calendarios
  ADD COLUMN IF NOT EXISTS inicio timestamptz,
  ADD COLUMN IF NOT EXISTS fin timestamptz,
  ADD COLUMN IF NOT EXISTS semestre_id integer;

DO $$
BEGIN
  IF to_regclass('public.calendarios_semestres_backup_20260629') IS NOT NULL THEN
    UPDATE public.calendarios AS c
    SET semestre_id = b.semestre_id
    FROM public.calendarios_semestres_backup_20260629 AS b
    WHERE c.id = b.calendario_id
      AND c.semestre_id IS NULL
      AND b.semestre_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'calendarios_semestre_id_fkey'
      AND conrelid = 'public.calendarios'::regclass
  ) THEN
    ALTER TABLE public.calendarios
      ADD CONSTRAINT calendarios_semestre_id_fkey
      FOREIGN KEY (semestre_id) REFERENCES public.semestres(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS calendarios_semestre_id_idx ON public.calendarios (semestre_id);

COMMIT;
