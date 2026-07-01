-- Move group assignment from the package-level matricula to each module-level
-- student record. A matricula is the enrollment header; modulos_estudiantes is
-- where module-specific operations such as group, grades, and progress belong.

ALTER TABLE public.modulos_estudiantes
  ADD COLUMN IF NOT EXISTS grupo_id integer;

ALTER TABLE public.modulos_estudiantes
  DROP CONSTRAINT IF EXISTS modulos_estudiantes_grupo_id_fkey;

ALTER TABLE public.modulos_estudiantes
  ADD CONSTRAINT modulos_estudiantes_grupo_id_fkey
  FOREIGN KEY (grupo_id)
  REFERENCES public.grupos(id)
  ON DELETE SET NULL;

UPDATE public.modulos_estudiantes me
SET grupo_id = m.grupo_id
FROM public.matriculas m
WHERE me.matricula_id = m.id
  AND me.grupo_id IS NULL
  AND m.grupo_id IS NOT NULL;

ALTER TABLE public.matriculas
  DROP CONSTRAINT IF EXISTS matriculas_grupo_id_fkey,
  DROP COLUMN IF EXISTS grupo_id;
