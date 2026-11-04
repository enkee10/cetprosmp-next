ALTER TABLE public.indicador_contenidos
  ADD COLUMN IF NOT EXISTS contenido_padre_id integer NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.indicador_contenidos'::regclass
      AND conname = 'indicador_contenidos_contenido_padre_id_fkey'
  ) THEN
    ALTER TABLE public.indicador_contenidos
      ADD CONSTRAINT indicador_contenidos_contenido_padre_id_fkey
      FOREIGN KEY (contenido_padre_id)
      REFERENCES public.indicador_contenidos (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "indicador_contenidos_indicadorCapacidadItenidoPadreId_orden_idx"
  ON public.indicador_contenidos (indicador_capacidad_id, contenido_padre_id, orden);

CREATE INDEX IF NOT EXISTS "indicador_contenidos_contenidoPadreId_idx"
  ON public.indicador_contenidos (contenido_padre_id);
