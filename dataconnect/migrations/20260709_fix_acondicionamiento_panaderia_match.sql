WITH affected_groups AS (
  SELECT g.id
  FROM public.grupos g
  WHERE g.paquete_id = 39
    AND g.nombre_display ILIKE '%ACOND.%PANAD.%PASTE.%'
)
UPDATE public.grupos g
SET paquete_id = 38
FROM affected_groups ag
WHERE g.id = ag.id;

WITH affected_grupo_modulos AS (
  SELECT gm.id, gm.grupo_id, g.nombre_display
  FROM public.grupo_modulos gm
  JOIN public.grupos g ON g.id = gm.grupo_id
  WHERE gm.modulo_id = 26
    AND g.nombre_display ILIKE '%ACOND.%PANAD.%PASTE.%'
)
UPDATE public.grupo_modulos gm
SET
  modulo_id = 25,
  nombre = regexp_replace(
    agm.nombre_display,
    '^([^ ]+ )(.+?)( \[[^]]+\].*)$',
    '\1Acondicionamiento y Elaboración de Productos de Panadería y Pastelería\3'
  )
FROM affected_grupo_modulos agm
WHERE gm.id = agm.id;

UPDATE public.modulos_estudiantes me
SET modulo_id = 25
FROM public.grupos g
WHERE me.grupo_id = g.id
  AND me.modulo_id = 26
  AND g.nombre_display ILIKE '%ACOND.%PANAD.%PASTE.%';

INSERT INTO public.grupo_modulo_unidades_didacticas (
  grupo_modulo_id,
  unidad_didactica_id,
  orden
)
SELECT
  gm.id,
  udm.unidad_didactica_id,
  udm.orden
FROM public.grupo_modulos gm
JOIN public.grupos g ON g.id = gm.grupo_id
JOIN public.unidad_didactica_modulos udm ON udm.modulo_id = gm.modulo_id
WHERE gm.modulo_id = 25
  AND g.nombre_display ILIKE '%ACOND.%PANAD.%PASTE.%'
ON CONFLICT (grupo_modulo_id, unidad_didactica_id) DO NOTHING;
