-- Add semester selections and cloning provenance without changing existing plans.
ALTER TABLE public.planes ADD COLUMN IF NOT EXISTS plan_anterior_id integer NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.planes'::regclass AND conname = 'planes_plan_anterior_id_fkey') THEN
    ALTER TABLE public.planes ADD CONSTRAINT planes_plan_anterior_id_fkey
      FOREIGN KEY (plan_anterior_id) REFERENCES public.planes(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "planes_planAnteriorId_idx" ON public.planes(plan_anterior_id);

CREATE TABLE IF NOT EXISTS public.plan_semestres (
  id serial NOT NULL PRIMARY KEY,
  plan_id integer NOT NULL,
  semestre_id integer NOT NULL,
  actualizado_en timestamptz NOT NULL,
  revision integer NOT NULL DEFAULT 0,
  seleccion jsonb NOT NULL,
  CONSTRAINT plan_semestres_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.planes(id) ON DELETE CASCADE,
  CONSTRAINT plan_semestres_semestre_id_fkey FOREIGN KEY (semestre_id) REFERENCES public.semestres(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "plan_semestres_planId_idx" ON public.plan_semestres(plan_id);
CREATE INDEX IF NOT EXISTS "plan_semestres_semestreId_idx" ON public.plan_semestres(semestre_id);
CREATE UNIQUE INDEX IF NOT EXISTS "plan_semestres_planId_semestreId_uidx" ON public.plan_semestres(plan_id, semestre_id);

ALTER TABLE public.plan_semestres OWNER TO "firebaseowner_cetprosmp-db_public";
GRANT SELECT ON public.plan_semestres TO "firebasereader_cetprosmp-db_public";
GRANT ALL ON public.plan_semestres TO "firebasewriter_cetprosmp-db_public";
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.plan_semestres_id_seq TO "firebasewriter_cetprosmp-db_public";
