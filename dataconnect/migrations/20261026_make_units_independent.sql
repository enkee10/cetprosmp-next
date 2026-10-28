-- Run the data-copy migration first. It preserves the complete academic tree,
-- grades, group schedules and diary references for each owning module.
-- Do not use CASCADE: unexpected dependencies must fail instead of losing data.
DO $$
BEGIN
  IF EXISTS (
    SELECT unidad_didactica_id
    FROM public.competencia_unidades_didacticas
    GROUP BY unidad_didactica_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Separate each module unit before removing the shared-unit property';
  END IF;
END $$;

ALTER TABLE public.unidades_didacticas DROP COLUMN IF EXISTS comun;
CREATE UNIQUE INDEX IF NOT EXISTS competencia_unidades_didacticas_unidad_didactica_id_key
  ON public.competencia_unidades_didacticas (unidad_didactica_id);
