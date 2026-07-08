BEGIN;

ALTER TABLE public.grupo_modulos
  ADD COLUMN IF NOT EXISTS inicio timestamptz,
  ADD COLUMN IF NOT EXISTS fin timestamptz;

CREATE TABLE IF NOT EXISTS public.grupo_modulo_unidades_didacticas (
  id serial PRIMARY KEY,
  orden integer,
  inicio timestamptz,
  fin timestamptz,
  grupo_modulo_id integer NOT NULL,
  unidad_didactica_id integer NOT NULL,
  CONSTRAINT grupo_modulo_unidades_didacticas_grupo_modulo_id_fkey
    FOREIGN KEY (grupo_modulo_id) REFERENCES public.grupo_modulos(id) ON DELETE CASCADE,
  CONSTRAINT grupo_modulo_unidades_didacticas_unidad_didactica_id_fkey
    FOREIGN KEY (unidad_didactica_id) REFERENCES public.unidades_didacticas(id) ON DELETE CASCADE,
  CONSTRAINT grupo_modulo_unidades_didacticas_unique
    UNIQUE (grupo_modulo_id, unidad_didactica_id)
);

CREATE INDEX IF NOT EXISTS grupo_modulo_unidades_didacticas_grupo_modulo_id_idx
  ON public.grupo_modulo_unidades_didacticas (grupo_modulo_id);

CREATE INDEX IF NOT EXISTS grupo_modulo_unidades_didacticas_unidad_didactica_id_idx
  ON public.grupo_modulo_unidades_didacticas (unidad_didactica_id);

COMMIT;
