ALTER TABLE public.paquete_modulos
  ADD COLUMN IF NOT EXISTS multiplicador integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sufijos text;

UPDATE public.paquete_modulos
SET multiplicador = 1
WHERE multiplicador IS NULL OR multiplicador < 1;

ALTER TABLE public.paquete_modulos
  ALTER COLUMN multiplicador DROP DEFAULT;

ALTER TABLE public.grupo_modulos
  ADD COLUMN IF NOT EXISTS instancia integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sufijo text;

UPDATE public.grupo_modulos
SET instancia = 1
WHERE instancia IS NULL OR instancia < 1;

ALTER TABLE public.grupo_modulos
  ALTER COLUMN instancia DROP DEFAULT;

ALTER TABLE public.modulos_estudiantes
  ADD COLUMN IF NOT EXISTS grupo_modulo_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'modulos_estudiantes_grupo_modulo_id_fkey'
      AND conrelid = 'public.modulos_estudiantes'::regclass
  ) THEN
    ALTER TABLE public.modulos_estudiantes
      ADD CONSTRAINT modulos_estudiantes_grupo_modulo_id_fkey
      FOREIGN KEY (grupo_modulo_id) REFERENCES public.grupo_modulos(id)
      ON DELETE SET NULL;
  END IF;
END $$;

UPDATE public.modulos_estudiantes me
SET grupo_modulo_id = gm.id
FROM public.grupo_modulos gm
WHERE me.grupo_modulo_id IS NULL
  AND me.grupo_id = gm.grupo_id
  AND me.modulo_id = gm.modulo_id
  AND COALESCE(gm.instancia, 1) = 1;

ALTER TABLE public.grupo_modulos
  DROP CONSTRAINT IF EXISTS grupo_modulos_grupo_id_modulo_id_key;

DROP INDEX IF EXISTS public."grupo_modulos_grupoId_moduloId_uidx";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'grupo_modulos'
      AND indexname = 'grupo_modulos_grupoId_moduloId_instancia_uidx'
  ) THEN
    CREATE UNIQUE INDEX "grupo_modulos_grupoId_moduloId_instancia_uidx"
      ON public.grupo_modulos (grupo_id, modulo_id, instancia);
  END IF;
END $$;

ALTER TABLE public.modulos_estudiantes
  DROP CONSTRAINT IF EXISTS modulos_estudiantes_matricula_id_modulo_id_key;

DROP INDEX IF EXISTS public."modulos_estudiantes_matriculaId_moduloId_uidx";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'modulos_estudiantes'
      AND indexname = 'modulos_estudiantes_matriculaId_grupoModuloId_uidx'
  ) THEN
    CREATE UNIQUE INDEX "modulos_estudiantes_matriculaId_grupoModuloId_uidx"
      ON public.modulos_estudiantes (matricula_id, grupo_modulo_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "modulos_estudiantes_grupoModuloId_idx"
  ON public.modulos_estudiantes (grupo_modulo_id);
