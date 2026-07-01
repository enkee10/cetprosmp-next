-- Move calendar assignment from grupos to grupo_modulos without discarding existing links.
-- Existing grupo_modulos inherit their parent group's calendario_id, then grupos.calendario_id is removed.

BEGIN;

ALTER TABLE public.grupo_modulos
  ADD COLUMN IF NOT EXISTS calendario_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'grupo_modulos_calendario_id_fkey'
      AND conrelid = 'public.grupo_modulos'::regclass
  ) THEN
    ALTER TABLE public.grupo_modulos
      ADD CONSTRAINT grupo_modulos_calendario_id_fkey
      FOREIGN KEY (calendario_id) REFERENCES public.calendarios(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS grupo_modulos_calendario_id_idx ON public.grupo_modulos (calendario_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'grupos'
      AND column_name = 'calendario_id'
  ) THEN
    UPDATE public.grupo_modulos gm
    SET calendario_id = g.calendario_id
    FROM public.grupos g
    WHERE gm.grupo_id = g.id
      AND gm.calendario_id IS NULL
      AND g.calendario_id IS NOT NULL;

    ALTER TABLE public.grupos DROP CONSTRAINT IF EXISTS grupos_calendario_id_fkey;
    DROP INDEX IF EXISTS public.grupos_calendario_id_idx;
    ALTER TABLE public.grupos DROP COLUMN calendario_id;
  END IF;
END $$;

COMMIT;
