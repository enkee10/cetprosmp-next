BEGIN;

CREATE TABLE IF NOT EXISTS public.programaciones_horarias (
  id serial PRIMARY KEY,
  clave text NOT NULL,
  titulo text NOT NULL,
  horas_objetivo double precision NOT NULL,
  minutos_hora_academica integer NOT NULL,
  minutos_sesion integer NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  dias_semana integer[] NOT NULL,
  hora_inicio text NOT NULL,
  hora_fin text NOT NULL,
  excluir_feriados boolean NOT NULL,
  evitar_cruces boolean NOT NULL,
  fecha_creacion timestamptz NOT NULL,
  calendario_id integer NOT NULL REFERENCES public.calendarios(id) ON DELETE CASCADE,
  grupo_modulo_id integer REFERENCES public.grupo_modulos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "programaciones_horarias_calendarioId_idx" ON public.programaciones_horarias(calendario_id);
CREATE INDEX IF NOT EXISTS "programaciones_horarias_grupoModuloId_idx" ON public.programaciones_horarias(grupo_modulo_id);
CREATE UNIQUE INDEX IF NOT EXISTS "programaciones_horarias_clave_uidx" ON public.programaciones_horarias(clave);

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS minutos_hora_academica integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS computa_horas boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS programacion_horaria_id integer;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eventos_programacion_horaria_id_fkey' AND conrelid = 'public.eventos'::regclass) THEN
    ALTER TABLE public.eventos ADD CONSTRAINT eventos_programacion_horaria_id_fkey
      FOREIGN KEY (programacion_horaria_id) REFERENCES public.programaciones_horarias(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "eventos_programacionHorariaId_idx" ON public.eventos(programacion_horaria_id);

ALTER TABLE public.programaciones_horarias OWNER TO "firebaseowner_cetprosmp-db_public";
GRANT SELECT ON public.programaciones_horarias TO "firebasereader_cetprosmp-db_public";
GRANT ALL ON public.programaciones_horarias TO "firebasewriter_cetprosmp-db_public";
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.programaciones_horarias_id_seq TO "firebasewriter_cetprosmp-db_public";

COMMIT;
