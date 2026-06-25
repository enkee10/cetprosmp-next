ALTER TABLE public.planes
  ADD COLUMN IF NOT EXISTS semestre_id integer;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'planes'
      AND column_name = 'plan_estudio'
  ) THEN
    UPDATE public.planes AS planes
    SET semestre_id = semestres.id
    FROM public.semestres AS semestres
    WHERE planes.semestre_id IS NULL
      AND planes.plan_estudio IS NOT NULL
      AND BTRIM(planes.plan_estudio) = BTRIM(semestres.titulo);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'planes_semestre_id_fkey'
  ) THEN
    ALTER TABLE public.planes
      ADD CONSTRAINT planes_semestre_id_fkey
      FOREIGN KEY (semestre_id)
      REFERENCES public.semestres(id)
      ON UPDATE NO ACTION
      ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.planes
  DROP COLUMN IF EXISTS plan_estudio;
