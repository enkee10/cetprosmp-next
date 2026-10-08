BEGIN;

ALTER TABLE public.actividades
  ADD COLUMN IF NOT EXISTS modulo_id integer,
  ADD COLUMN IF NOT EXISTS clave_importacion text,
  ADD COLUMN IF NOT EXISTS numero_sesion integer,
  ADD COLUMN IF NOT EXISTS orden integer;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'actividades_modulo_id_fkey' AND conrelid = 'public.actividades'::regclass) THEN
    ALTER TABLE public.actividades ADD CONSTRAINT actividades_modulo_id_fkey
      FOREIGN KEY (modulo_id) REFERENCES public.modulos(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "actividades_moduloId_idx" ON public.actividades(modulo_id);
CREATE UNIQUE INDEX IF NOT EXISTS "actividades_claveImportacion_uidx" ON public.actividades(clave_importacion);

CREATE TABLE IF NOT EXISTS public.actividad_contenidos (
  id serial PRIMARY KEY,
  actividad_id integer NOT NULL REFERENCES public.actividades(id) ON DELETE CASCADE,
  orden integer NOT NULL,
  texto text NOT NULL
);
CREATE INDEX IF NOT EXISTS "actividad_contenidos_actividadId_idx" ON public.actividad_contenidos(actividad_id);
CREATE UNIQUE INDEX IF NOT EXISTS "actividad_contenidos_actividadId_orden_uidx" ON public.actividad_contenidos(actividad_id, orden);

CREATE TABLE IF NOT EXISTS public.actividad_materiales (
  id serial PRIMARY KEY,
  actividad_id integer NOT NULL REFERENCES public.actividades(id) ON DELETE CASCADE,
  orden integer NOT NULL,
  texto text NOT NULL
);
CREATE INDEX IF NOT EXISTS "actividad_materiales_actividadId_idx" ON public.actividad_materiales(actividad_id);
CREATE UNIQUE INDEX IF NOT EXISTS "actividad_materiales_actividadId_orden_uidx" ON public.actividad_materiales(actividad_id, orden);

CREATE TABLE IF NOT EXISTS public.grupo_modulo_actividades (
  id serial PRIMARY KEY,
  actividad_id integer NOT NULL REFERENCES public.actividades(id) ON DELETE CASCADE,
  evento_id integer REFERENCES public.eventos(id) ON DELETE SET NULL,
  grupo_modulo_id integer NOT NULL REFERENCES public.grupo_modulos(id) ON DELETE CASCADE,
  fin timestamptz NOT NULL,
  inicio timestamptz NOT NULL,
  segmento integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS "grupo_modulo_actividades_grupoModuloId_idx" ON public.grupo_modulo_actividades(grupo_modulo_id);
CREATE INDEX IF NOT EXISTS "grupo_modulo_actividades_actividadId_idx" ON public.grupo_modulo_actividades(actividad_id);
CREATE INDEX IF NOT EXISTS "grupo_modulo_actividades_eventoId_idx" ON public.grupo_modulo_actividades(evento_id);
CREATE UNIQUE INDEX IF NOT EXISTS "grupo_modulo_actividades_grupoModuloId_atividadId_segmento_uidx" ON public.grupo_modulo_actividades(grupo_modulo_id, actividad_id, segmento);

ALTER TABLE public.actividad_contenidos OWNER TO "firebaseowner_cetprosmp-db_public";
ALTER TABLE public.actividad_materiales OWNER TO "firebaseowner_cetprosmp-db_public";
ALTER TABLE public.grupo_modulo_actividades OWNER TO "firebaseowner_cetprosmp-db_public";
GRANT SELECT ON public.actividad_contenidos, public.actividad_materiales, public.grupo_modulo_actividades TO "firebasereader_cetprosmp-db_public";
GRANT ALL ON public.actividad_contenidos, public.actividad_materiales, public.grupo_modulo_actividades TO "firebasewriter_cetprosmp-db_public";
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.actividad_contenidos_id_seq, public.actividad_materiales_id_seq, public.grupo_modulo_actividades_id_seq TO "firebasewriter_cetprosmp-db_public";

COMMIT;
