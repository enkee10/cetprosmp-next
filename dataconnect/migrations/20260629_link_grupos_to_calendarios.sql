-- Link groups to calendars without dropping or overwriting existing data.
-- A group can reference one calendar; a calendar can be referenced by many groups.

BEGIN;

ALTER TABLE public.grupos
  ADD COLUMN IF NOT EXISTS calendario_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'grupos_calendario_id_fkey'
      AND conrelid = 'public.grupos'::regclass
  ) THEN
    ALTER TABLE public.grupos
      ADD CONSTRAINT grupos_calendario_id_fkey
      FOREIGN KEY (calendario_id) REFERENCES public.calendarios(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS grupos_calendario_id_idx ON public.grupos (calendario_id);

WITH calendario_unico_por_anio AS (
  SELECT
    anio_id,
    min(id) AS calendario_id
  FROM public.calendarios
  WHERE anio_id IS NOT NULL
  GROUP BY anio_id
  HAVING count(*) = 1
)
UPDATE public.grupos AS g
SET calendario_id = c.calendario_id
FROM public.semestres AS s
JOIN calendario_unico_por_anio AS c ON c.anio_id = s.anio_id
WHERE g.semestre_id = s.id
  AND g.calendario_id IS NULL;

COMMIT;

SELECT 'grupos_with_calendario' AS metric, count(*) AS total
FROM public.grupos
WHERE calendario_id IS NOT NULL;
