ALTER TABLE public.carreras
  ADD COLUMN IF NOT EXISTS nivel text;

WITH niveles_por_carrera AS (
  SELECT
    carrera_id,
    MIN(NULLIF(BTRIM(nivel), '')) AS nivel,
    COUNT(DISTINCT NULLIF(BTRIM(nivel), '')) AS niveles_distintos
  FROM public.planes
  WHERE carrera_id IS NOT NULL
    AND NULLIF(BTRIM(nivel), '') IS NOT NULL
  GROUP BY carrera_id
)
UPDATE public.carreras AS carreras
SET nivel = niveles_por_carrera.nivel
FROM niveles_por_carrera
WHERE carreras.id = niveles_por_carrera.carrera_id
  AND carreras.nivel IS NULL
  AND niveles_por_carrera.niveles_distintos = 1;

-- Conservamos public.planes.nivel fisicamente para no perder data historica.
-- El campo se retira del schema y de la app, pero no se dropea la columna.
