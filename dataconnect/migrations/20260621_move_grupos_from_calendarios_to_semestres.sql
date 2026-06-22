-- Move grupos from calendario_id to semestre_id without losing data.
--
-- Safe order:
-- 1. Back up each grupo -> calendario relation.
-- 2. Add grupos.semestre_id.
-- 3. Abort if a grupo has a calendario that cannot resolve to a semestre.
-- 4. Copy calendarios.semestre_id into grupos.semestre_id.
-- 5. Create the new FK/index and drop the old calendario FK/column.

BEGIN;

ALTER TABLE public.grupos
  ADD COLUMN IF NOT EXISTS semestre_id integer;

CREATE TABLE IF NOT EXISTS public.grupos_calendarios_backup_20260621 (
  grupo_id integer PRIMARY KEY,
  calendario_id integer,
  semestre_id integer
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'grupos'
      AND column_name = 'calendario_id'
  ) THEN
    INSERT INTO public.grupos_calendarios_backup_20260621 (
      grupo_id,
      calendario_id,
      semestre_id
    )
    SELECT
      g.id AS grupo_id,
      g.calendario_id,
      c.semestre_id
    FROM public.grupos g
    LEFT JOIN public.calendarios c ON c.id = g.calendario_id
    WHERE g.calendario_id IS NOT NULL
    ON CONFLICT (grupo_id) DO UPDATE SET
      calendario_id = EXCLUDED.calendario_id,
      semestre_id = EXCLUDED.semestre_id;
  END IF;
END $$;

DO $$
DECLARE
  unresolved_grupos integer := 0;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'grupos'
      AND column_name = 'calendario_id'
  ) THEN
    SELECT count(*)
    INTO unresolved_grupos
    FROM public.grupos g
    LEFT JOIN public.calendarios c ON c.id = g.calendario_id
    WHERE g.calendario_id IS NOT NULL
      AND c.semestre_id IS NULL;
  END IF;

  IF unresolved_grupos > 0 THEN
    RAISE EXCEPTION
      'Cannot migrate grupos.calendario_id: % grupo(s) point to calendars without semestre_id or missing calendars. Data is backed up in public.grupos_calendarios_backup_20260621 and calendario_id was not dropped.',
      unresolved_grupos;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'grupos'
      AND column_name = 'calendario_id'
  ) THEN
    UPDATE public.grupos g
    SET semestre_id = c.semestre_id
    FROM public.calendarios c
    WHERE g.calendario_id = c.id
      AND c.semestre_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.semestres') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'grupos_semestre_id_fkey'
         AND conrelid = 'public.grupos'::regclass
     ) THEN
    ALTER TABLE public.grupos
      ADD CONSTRAINT grupos_semestre_id_fkey
      FOREIGN KEY (semestre_id) REFERENCES public.semestres(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS grupos_semestre_id_idx ON public.grupos (semestre_id);

ALTER TABLE public.grupos
  DROP CONSTRAINT IF EXISTS grupos_calendario_id_fkey,
  DROP COLUMN IF EXISTS calendario_id;

COMMIT;

SELECT 'grupos_with_semestre' AS metric, count(*) AS total
FROM public.grupos
WHERE semestre_id IS NOT NULL;

SELECT 'grupos_calendarios_backup_20260621' AS backup, count(*) AS total
FROM public.grupos_calendarios_backup_20260621;
