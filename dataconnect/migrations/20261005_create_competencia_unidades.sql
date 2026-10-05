BEGIN;
CREATE TABLE IF NOT EXISTS public.competencia_unidades_didacticas (
  id serial PRIMARY KEY,
  orden integer,
  competencia_id integer NOT NULL REFERENCES public.competencias(id) ON DELETE CASCADE,
  unidad_didactica_id integer NOT NULL REFERENCES public.unidades_didacticas(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "competencia_unidades_didacticas_unidadDidacticaId_idx" ON public.competencia_unidades_didacticas(unidad_didactica_id);
CREATE INDEX IF NOT EXISTS "competencia_unidades_didacticas_competenciaId_idx" ON public.competencia_unidades_didacticas(competencia_id);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'competencia_unidades_didacticas_competenciaId_unidadDidacticaId') THEN
    ALTER INDEX public."competencia_unidades_didacticas_competenciaId_unidadDidacticaId" RENAME TO "competencia_unidades_didacticas_competen_unidadDidacticaId_uidx";
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "competencia_unidades_didacticas_competen_unidadDidacticaId_uidx" ON public.competencia_unidades_didacticas(competencia_id, unidad_didactica_id);
ALTER TABLE public.competencia_unidades_didacticas OWNER TO "firebaseowner_cetprosmp-db_public";
GRANT SELECT ON public.competencia_unidades_didacticas TO "firebasereader_cetprosmp-db_public";
GRANT ALL ON public.competencia_unidades_didacticas TO "firebasewriter_cetprosmp-db_public";
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.competencia_unidades_didacticas_id_seq TO "firebasewriter_cetprosmp-db_public";
SELECT setval('public.competencia_unidades_didacticas_id_seq', COALESCE(MAX(id), 1), COUNT(*) > 0) FROM public.competencia_unidades_didacticas;
COMMIT;
