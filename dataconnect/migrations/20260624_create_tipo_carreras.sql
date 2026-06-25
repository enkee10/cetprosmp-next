CREATE TABLE IF NOT EXISTS public.tipo_carreras (
  id serial PRIMARY KEY,
  nombre text
);

CREATE UNIQUE INDEX IF NOT EXISTS tipo_carreras_nombre_unique
  ON public.tipo_carreras (lower(trim(nombre)))
  WHERE nombre IS NOT NULL AND trim(nombre) <> '';

ALTER TABLE public.carreras
  ADD COLUMN IF NOT EXISTS tipo_carrera_id integer;

INSERT INTO public.tipo_carreras (nombre)
SELECT DISTINCT trim(tipo)
FROM public.carreras
WHERE tipo IS NOT NULL
  AND trim(tipo) <> ''
ON CONFLICT DO NOTHING;

UPDATE public.carreras c
SET tipo_carrera_id = tc.id
FROM public.tipo_carreras tc
WHERE c.tipo_carrera_id IS NULL
  AND c.tipo IS NOT NULL
  AND trim(c.tipo) <> ''
  AND lower(trim(c.tipo)) = lower(trim(tc.nombre));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'carreras_tipo_carrera_id_fkey'
      AND conrelid = 'public.carreras'::regclass
  ) THEN
    ALTER TABLE public.carreras
      ADD CONSTRAINT carreras_tipo_carrera_id_fkey
      FOREIGN KEY (tipo_carrera_id) REFERENCES public.tipo_carreras(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS carreras_tipo_carrera_id_idx
  ON public.carreras (tipo_carrera_id);
