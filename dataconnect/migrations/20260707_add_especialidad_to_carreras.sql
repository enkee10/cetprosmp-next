ALTER TABLE public.carreras
  ADD COLUMN IF NOT EXISTS especialidad_id integer;

UPDATE public.carreras AS c
SET especialidad_id = ae.especialidad_id
FROM public.act_economicas AS ae
WHERE c.especialidad_id IS NULL
  AND c.act_economica_id = ae.id
  AND ae.especialidad_id IS NOT NULL;

WITH fallback AS (
  SELECT DISTINCT ON (e.act_economica_id)
    e.act_economica_id,
    e.id AS especialidad_id
  FROM public.especialidades AS e
  WHERE e.act_economica_id IS NOT NULL
  ORDER BY e.act_economica_id, e.orden NULLS LAST, e.id
)
UPDATE public.carreras AS c
SET especialidad_id = fallback.especialidad_id
FROM fallback
WHERE c.especialidad_id IS NULL
  AND c.act_economica_id = fallback.act_economica_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'carreras_especialidad_id_fkey'
      AND conrelid = 'public.carreras'::regclass
  ) THEN
    ALTER TABLE public.carreras
      ADD CONSTRAINT carreras_especialidad_id_fkey
      FOREIGN KEY (especialidad_id)
      REFERENCES public.especialidades(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS carreras_especialidad_id_idx
  ON public.carreras(especialidad_id);
