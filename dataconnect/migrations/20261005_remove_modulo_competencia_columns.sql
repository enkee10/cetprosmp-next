BEGIN;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM public.modulos m
    WHERE nullif(btrim(m.competencia), '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.competencias c
        WHERE c.modulo_id = m.id AND c.tipo = 'TECNICA'
          AND btrim(c.nombre) = btrim(m.competencia)
      )
  ) THEN
    RAISE EXCEPTION 'Existen competencias antiguas sin migrar; no se quitaran las columnas';
  END IF;
END $$;
ALTER TABLE public.modulos DROP COLUMN competencia, DROP COLUMN tipo_competencia;
COMMIT;
