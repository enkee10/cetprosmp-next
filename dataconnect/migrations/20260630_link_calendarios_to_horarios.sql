BEGIN;

ALTER TABLE public.calendarios
  ADD COLUMN IF NOT EXISTS horario_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'calendarios_horario_id_fkey'
      AND conrelid = 'public.calendarios'::regclass
  ) THEN
    ALTER TABLE public.calendarios
      ADD CONSTRAINT calendarios_horario_id_fkey
      FOREIGN KEY (horario_id) REFERENCES public.horarios(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS calendarios_horario_id_idx ON public.calendarios (horario_id);

COMMIT;
