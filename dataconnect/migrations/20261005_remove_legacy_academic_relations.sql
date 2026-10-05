BEGIN;
LOCK TABLE public.unidad_didactica_modulos, public.competencia_unidades_didacticas IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.unidad_didactica_modulos old
    FULL JOIN (
      SELECT links.id, links.orden, links.unidad_didactica_id, competencias.modulo_id
      FROM public.competencia_unidades_didacticas links
      JOIN public.competencias ON competencias.id = links.competencia_id
    ) migrated USING (id)
    WHERE old.id IS NULL OR migrated.id IS NULL
      OR old.orden IS DISTINCT FROM migrated.orden
      OR old.unidad_didactica_id IS DISTINCT FROM migrated.unidad_didactica_id
      OR old.modulo_id IS DISTINCT FROM migrated.modulo_id
  ) THEN
    RAISE EXCEPTION 'Las relaciones migradas no coinciden con las originales. No se eliminara ninguna tabla.';
  END IF;
END $$;
DROP TABLE public.competencia_capacidades;
DROP TABLE public.unidad_didactica_modulos;
COMMIT;
