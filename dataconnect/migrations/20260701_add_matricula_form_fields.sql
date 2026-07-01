ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS dni_imagen_frente_url text,
  ADD COLUMN IF NOT EXISTS dni_imagen_reverso_url text;

ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS semestre_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matriculas_semestre_id_fkey'
      AND conrelid = 'public.matriculas'::regclass
  ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT matriculas_semestre_id_fkey
      FOREIGN KEY (semestre_id) REFERENCES public.semestres(id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS matriculas_recibo_unique_idx
  ON public.matriculas (recibo)
  WHERE recibo IS NOT NULL AND btrim(recibo) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS matriculas_user_semestre_paquete_unique_idx
  ON public.matriculas (user_id, semestre_id, paquete_id)
  WHERE user_id IS NOT NULL AND semestre_id IS NOT NULL AND paquete_id IS NOT NULL;
