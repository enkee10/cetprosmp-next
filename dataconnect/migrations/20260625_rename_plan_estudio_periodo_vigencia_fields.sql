DO $$
BEGIN
  IF to_regclass('public.planes') IS NULL THEN
    RAISE EXCEPTION 'public.planes does not exist.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'planes'
      AND column_name = 'periodo_aprobacion'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'planes'
      AND column_name = 'plan_estudio'
  ) THEN
    ALTER TABLE public.planes RENAME COLUMN periodo_aprobacion TO plan_estudio;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'planes'
      AND column_name = 'periodo_aprobacion'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'planes'
      AND column_name = 'plan_estudio'
  ) THEN
    UPDATE public.planes
       SET plan_estudio = COALESCE(plan_estudio, periodo_aprobacion)
     WHERE periodo_aprobacion IS NOT NULL;
    ALTER TABLE public.planes DROP COLUMN periodo_aprobacion;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'planes'
      AND column_name = 'semestre_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'planes'
      AND column_name = 'periodo_vigencia_id'
  ) THEN
    ALTER TABLE public.planes RENAME COLUMN semestre_id TO periodo_vigencia_id;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'planes'
      AND column_name = 'semestre_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'planes'
      AND column_name = 'periodo_vigencia_id'
  ) THEN
    UPDATE public.planes
       SET periodo_vigencia_id = COALESCE(periodo_vigencia_id, semestre_id)
     WHERE semestre_id IS NOT NULL;
    ALTER TABLE public.planes DROP COLUMN semestre_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'planes_semestre_id_fkey'
  ) THEN
    ALTER TABLE public.planes DROP CONSTRAINT planes_semestre_id_fkey;
  END IF;

  IF to_regclass('public.semestres') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'planes_periodo_vigencia_id_fkey'
     )
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'planes'
         AND column_name = 'periodo_vigencia_id'
     ) THEN
    ALTER TABLE public.planes
      ADD CONSTRAINT planes_periodo_vigencia_id_fkey
      FOREIGN KEY (periodo_vigencia_id)
      REFERENCES public.semestres(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS planes_periodo_vigencia_id_idx
  ON public.planes (periodo_vigencia_id);

DROP INDEX IF EXISTS "planes_semestreId_idx";
DROP INDEX IF EXISTS planes_semestre_id_idx;
