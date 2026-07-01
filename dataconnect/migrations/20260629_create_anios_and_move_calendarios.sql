-- Create academic years and move calendars from semester scope to year scope.
-- This keeps the old calendario -> semestre value as legacy data while removing
-- the active foreign-key relation.

BEGIN;

CREATE TABLE IF NOT EXISTS public.anios (
  id serial PRIMARY KEY,
  nombre text,
  titulo text
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'anios_nombre_key'
      AND conrelid = 'public.anios'::regclass
  ) THEN
    ALTER TABLE public.anios
      ADD CONSTRAINT anios_nombre_key UNIQUE (nombre);
  END IF;
END $$;

ALTER TABLE public.semestres
  ADD COLUMN IF NOT EXISTS anio_id integer;

WITH semestre_base AS (
  SELECT
    id,
    COALESCE(NULLIF(BTRIM(titulo), ''), 'Semestre ' || id::text) AS semestre_titulo,
    SUBSTRING(COALESCE(titulo, '') || ' ' || COALESCE(descripcion, '') FROM '(19[0-9]{2}|20[0-9]{2}|2100)') AS anio_nombre
  FROM public.semestres
),
anio_source AS (
  SELECT DISTINCT
    COALESCE(anio_nombre, 'semestre-' || id::text) AS nombre,
    CASE
      WHEN anio_nombre IS NOT NULL THEN 'Anio ' || anio_nombre
      ELSE 'Anio de ' || semestre_titulo
    END AS titulo
  FROM semestre_base
)
INSERT INTO public.anios (nombre, titulo)
SELECT nombre, titulo
FROM anio_source
ON CONFLICT (nombre) DO UPDATE
  SET titulo = COALESCE(public.anios.titulo, EXCLUDED.titulo);

WITH semestre_base AS (
  SELECT
    id,
    COALESCE(SUBSTRING(COALESCE(titulo, '') || ' ' || COALESCE(descripcion, '') FROM '(19[0-9]{2}|20[0-9]{2}|2100)'), 'semestre-' || id::text) AS anio_nombre
  FROM public.semestres
)
UPDATE public.semestres AS s
SET anio_id = a.id
FROM semestre_base AS sb
JOIN public.anios AS a ON a.nombre = sb.anio_nombre
WHERE s.id = sb.id
  AND s.anio_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'semestres_anio_id_fkey'
      AND conrelid = 'public.semestres'::regclass
  ) THEN
    ALTER TABLE public.semestres
      ADD CONSTRAINT semestres_anio_id_fkey
      FOREIGN KEY (anio_id) REFERENCES public.anios(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS semestres_anio_id_idx ON public.semestres (anio_id);

CREATE OR REPLACE FUNCTION public.enforce_anios_max_two_semestres()
RETURNS trigger AS $$
BEGIN
  IF NEW.anio_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF (
    SELECT count(*)
    FROM public.semestres
    WHERE anio_id = NEW.anio_id
      AND id <> COALESCE(NEW.id, -1)
  ) >= 2 THEN
    RAISE EXCEPTION 'An anio can have at most two semestres.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS semestres_anio_max_two ON public.semestres;

CREATE TRIGGER semestres_anio_max_two
BEFORE INSERT OR UPDATE OF anio_id ON public.semestres
FOR EACH ROW
EXECUTE FUNCTION public.enforce_anios_max_two_semestres();

ALTER TABLE public.calendarios
  ADD COLUMN IF NOT EXISTS anio_id integer;

CREATE TABLE IF NOT EXISTS public.calendarios_semestres_backup_20260629 (
  calendario_id integer PRIMARY KEY,
  semestre_id integer,
  anio_id integer,
  backed_up_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'calendarios'
      AND column_name = 'semestre_id'
  ) THEN
    INSERT INTO public.calendarios_semestres_backup_20260629 (
      calendario_id,
      semestre_id,
      anio_id
    )
    SELECT
      c.id,
      c.semestre_id,
      s.anio_id
    FROM public.calendarios AS c
    LEFT JOIN public.semestres AS s ON s.id = c.semestre_id
    ON CONFLICT (calendario_id) DO UPDATE SET
      semestre_id = EXCLUDED.semestre_id,
      anio_id = COALESCE(EXCLUDED.anio_id, public.calendarios_semestres_backup_20260629.anio_id);

    UPDATE public.calendarios AS c
    SET anio_id = s.anio_id
    FROM public.semestres AS s
    WHERE c.semestre_id = s.id
      AND s.anio_id IS NOT NULL
      AND c.anio_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'calendarios_anio_id_fkey'
      AND conrelid = 'public.calendarios'::regclass
  ) THEN
    ALTER TABLE public.calendarios
      ADD CONSTRAINT calendarios_anio_id_fkey
      FOREIGN KEY (anio_id) REFERENCES public.anios(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS calendarios_anio_id_idx ON public.calendarios (anio_id);

ALTER TABLE public.calendarios
  DROP CONSTRAINT IF EXISTS calendarios_semestre_id_fkey;

DROP INDEX IF EXISTS calendarios_semestre_id_idx;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'calendarios'
      AND column_name = 'semestre_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'calendarios'
      AND column_name = 'semestre_id_legacy_20260629'
  ) THEN
    ALTER TABLE public.calendarios
      RENAME COLUMN semestre_id TO semestre_id_legacy_20260629;
  END IF;
END $$;

COMMIT;

SELECT 'anios' AS metric, count(*) AS total
FROM public.anios;

SELECT 'semestres_with_anio' AS metric, count(*) AS total
FROM public.semestres
WHERE anio_id IS NOT NULL;

SELECT 'calendarios_with_anio' AS metric, count(*) AS total
FROM public.calendarios
WHERE anio_id IS NOT NULL;

SELECT 'calendarios_semestres_backup_20260629' AS backup, count(*) AS total
FROM public.calendarios_semestres_backup_20260629;
