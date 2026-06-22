-- Split the mixed planes table into carreras + planes without losing data.
--
-- Safe order:
-- 1. Create/prepare public.carreras.
-- 2. Copy the career fields that currently live in public.planes.
-- 3. Link each existing plan to its new carrera.
-- 4. Drop only the columns already copied to carreras.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.planes') IS NULL THEN
    RAISE EXCEPTION 'public.planes does not exist. Restore or create planes before splitting carreras.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.carreras (
  id serial PRIMARY KEY,
  nombre text,
  codigo text,
  descripcion text,
  tipo text,
  estado text DEFAULT 'activo',
  creado_en timestamp with time zone DEFAULT now(),
  actualizado_en timestamp with time zone DEFAULT now(),
  act_economica_id integer
);

ALTER TABLE public.carreras
  ADD COLUMN IF NOT EXISTS nombre text,
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS descripcion text,
  ADD COLUMN IF NOT EXISTS tipo text,
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS creado_en timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS actualizado_en timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS act_economica_id integer;

ALTER TABLE public.planes
  ADD COLUMN IF NOT EXISTS carrera_id integer;

DO $$
DECLARE
  has_titulo boolean;
  has_codigo boolean;
  has_descripcion boolean;
  has_act_economica_id boolean;
  sql text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planes' AND column_name = 'titulo'
  ) INTO has_titulo;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planes' AND column_name = 'codigo'
  ) INTO has_codigo;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planes' AND column_name = 'descripcion'
  ) INTO has_descripcion;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planes' AND column_name = 'act_economica_id'
  ) INTO has_act_economica_id;

  IF has_titulo THEN
    sql := format(
      'INSERT INTO public.carreras (id, nombre, codigo, descripcion, tipo, estado, creado_en, actualizado_en, act_economica_id)
       SELECT
         p.id,
         NULLIF(p.titulo, '''') AS nombre,
         %s AS codigo,
         %s AS descripcion,
         NULL::text AS tipo,
         ''activo''::text AS estado,
         now() AS creado_en,
         now() AS actualizado_en,
         %s AS act_economica_id
       FROM public.planes p
       ON CONFLICT (id) DO UPDATE SET
         nombre = COALESCE(EXCLUDED.nombre, public.carreras.nombre),
         codigo = COALESCE(EXCLUDED.codigo, public.carreras.codigo),
         descripcion = COALESCE(EXCLUDED.descripcion, public.carreras.descripcion),
         estado = COALESCE(public.carreras.estado, EXCLUDED.estado, ''activo''),
         actualizado_en = now(),
         act_economica_id = COALESCE(EXCLUDED.act_economica_id, public.carreras.act_economica_id)',
      CASE WHEN has_codigo THEN 'p.codigo' ELSE 'NULL::text' END,
      CASE WHEN has_descripcion THEN 'p.descripcion' ELSE 'NULL::text' END,
      CASE WHEN has_act_economica_id THEN 'p.act_economica_id' ELSE 'NULL::integer' END
    );

    EXECUTE sql;
  END IF;
END $$;

UPDATE public.planes
SET carrera_id = id
WHERE carrera_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.carreras c
    WHERE c.id = public.planes.id
  );

DO $$
BEGIN
  IF to_regclass('public.act_economicas') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'carreras_act_economica_id_fkey'
         AND conrelid = 'public.carreras'::regclass
     ) THEN
    ALTER TABLE public.carreras
      ADD CONSTRAINT carreras_act_economica_id_fkey
      FOREIGN KEY (act_economica_id) REFERENCES public.act_economicas(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'planes_carrera_id_fkey'
      AND conrelid = 'public.planes'::regclass
  ) THEN
    ALTER TABLE public.planes
      ADD CONSTRAINT planes_carrera_id_fkey
      FOREIGN KEY (carrera_id) REFERENCES public.carreras(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS carreras_act_economica_id_idx ON public.carreras (act_economica_id);
CREATE INDEX IF NOT EXISTS planes_carrera_id_idx ON public.planes (carrera_id);

ALTER TABLE public.planes
  DROP COLUMN IF EXISTS titulo,
  DROP COLUMN IF EXISTS codigo,
  DROP COLUMN IF EXISTS descripcion,
  DROP COLUMN IF EXISTS act_economica_id;

SELECT setval(pg_get_serial_sequence('public.carreras', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.carreras), 1), true);
SELECT setval(pg_get_serial_sequence('public.planes', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.planes), 1), true);

COMMIT;

SELECT 'carreras' AS metric, count(*) AS total FROM public.carreras;
SELECT 'planes' AS metric, count(*) AS total FROM public.planes;
SELECT 'planes_linked_to_carreras' AS metric, count(*) AS total FROM public.planes WHERE carrera_id IS NOT NULL;
