ALTER TABLE public.unidades_didacticas
  ADD COLUMN IF NOT EXISTS comun boolean NOT NULL DEFAULT false;

UPDATE public.unidades_didacticas ud
SET comun = true
FROM (
  SELECT unidad_didactica_id
  FROM public.unidad_didactica_modulos
  GROUP BY unidad_didactica_id
  HAVING COUNT(DISTINCT modulo_id) > 1
) comunes
WHERE ud.id = comunes.unidad_didactica_id
  AND ud.comun IS DISTINCT FROM true;
