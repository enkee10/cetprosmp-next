BEGIN;
DO $$ BEGIN
  CREATE TYPE public.tipo_competencia AS ENUM ('TECNICA', 'EMPLEABILIDAD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS public.competencias (
  id serial PRIMARY KEY,
  modulo_id integer NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  tipo public.tipo_competencia NOT NULL
);
CREATE INDEX IF NOT EXISTS "competencias_moduloId_idx" ON public.competencias(modulo_id);
CREATE TABLE IF NOT EXISTS public.competencia_capacidades (
  id serial PRIMARY KEY,
  capacidad_terminal_id integer NOT NULL REFERENCES public.capacidades_terminales(id) ON DELETE CASCADE,
  competencia_id integer NOT NULL REFERENCES public.competencias(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "competencia_capacidades_capacidadTerminalId_idx" ON public.competencia_capacidades(capacidad_terminal_id);
CREATE INDEX IF NOT EXISTS "competencia_capacidades_competenciaId_idx" ON public.competencia_capacidades(competencia_id);
CREATE UNIQUE INDEX IF NOT EXISTS "competencia_capacidades_competenciaId_capacidadTerminalId_uidx" ON public.competencia_capacidades(competencia_id, capacidad_terminal_id);
ALTER TABLE public.competencias OWNER TO "firebaseowner_cetprosmp-db_public";
ALTER TABLE public.competencia_capacidades OWNER TO "firebaseowner_cetprosmp-db_public";
ALTER TYPE public.tipo_competencia OWNER TO "firebaseowner_cetprosmp-db_public";
GRANT SELECT ON public.competencias, public.competencia_capacidades TO "firebasereader_cetprosmp-db_public";
GRANT ALL ON public.competencias, public.competencia_capacidades TO "firebasewriter_cetprosmp-db_public";
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.competencias_id_seq, public.competencia_capacidades_id_seq TO "firebasewriter_cetprosmp-db_public";
COMMIT;
