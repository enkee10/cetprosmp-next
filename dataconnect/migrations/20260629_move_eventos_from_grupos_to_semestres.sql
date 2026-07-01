-- Move eventos from a legacy main-group relation to a semester classifier.
-- Existing evento -> grupo values are backed up and kept as a legacy column.

BEGIN;

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS semestre_id integer;

CREATE TABLE IF NOT EXISTS public.eventos_grupos_backup_20260629 (
  evento_id integer PRIMARY KEY,
  grupo_id integer,
  semestre_id integer,
  backed_up_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'eventos'
      AND column_name = 'grupo_id'
  ) THEN
    INSERT INTO public.eventos_grupos_backup_20260629 (
      evento_id,
      grupo_id,
      semestre_id
    )
    SELECT
      e.id,
      e.grupo_id,
      g.semestre_id
    FROM public.eventos AS e
    LEFT JOIN public.grupos AS g ON g.id = e.grupo_id
    ON CONFLICT (evento_id) DO UPDATE SET
      grupo_id = EXCLUDED.grupo_id,
      semestre_id = COALESCE(EXCLUDED.semestre_id, public.eventos_grupos_backup_20260629.semestre_id);

    UPDATE public.eventos AS e
    SET semestre_id = g.semestre_id
    FROM public.grupos AS g
    WHERE e.grupo_id = g.id
      AND g.semestre_id IS NOT NULL
      AND e.semestre_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'eventos_semestre_id_fkey'
      AND conrelid = 'public.eventos'::regclass
  ) THEN
    ALTER TABLE public.eventos
      ADD CONSTRAINT eventos_semestre_id_fkey
      FOREIGN KEY (semestre_id) REFERENCES public.semestres(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS eventos_semestre_id_idx ON public.eventos (semestre_id);

ALTER TABLE public.eventos
  DROP CONSTRAINT IF EXISTS eventos_grupo_id_fkey;

DROP INDEX IF EXISTS eventos_grupo_id_idx;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'eventos'
      AND column_name = 'grupo_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'eventos'
      AND column_name = 'grupo_id_legacy_20260629'
  ) THEN
    ALTER TABLE public.eventos
      RENAME COLUMN grupo_id TO grupo_id_legacy_20260629;
  END IF;
END $$;

COMMIT;

SELECT 'eventos_with_semestre' AS metric, count(*) AS total
FROM public.eventos
WHERE semestre_id IS NOT NULL;

SELECT 'eventos_grupos_backup_20260629' AS backup, count(*) AS total
FROM public.eventos_grupos_backup_20260629;
