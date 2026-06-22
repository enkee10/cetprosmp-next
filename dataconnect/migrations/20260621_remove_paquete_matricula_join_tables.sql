-- Remove paquete_grupos and matricula_grupos without losing their data.
--
-- Safe order:
-- 1. Back up both join tables into timestamped tables.
-- 2. Add direct nullable relation columns to grupos and matriculas.
-- 3. Abort if existing data cannot be represented by the new direct relations.
-- 4. Copy relation data into the new columns.
-- 5. Drop only the old join tables after the copy succeeds.

BEGIN;

ALTER TABLE public.grupos
  ADD COLUMN IF NOT EXISTS paquete_id integer,
  ADD COLUMN IF NOT EXISTS grupo_ord integer;

ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS grupo_id integer;

DO $$
BEGIN
  IF to_regclass('public.paquete_grupos') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS public.paquete_grupos_backup_20260621
    AS TABLE public.paquete_grupos WITH NO DATA;

    INSERT INTO public.paquete_grupos_backup_20260621
    SELECT pg.*
    FROM public.paquete_grupos pg
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.paquete_grupos_backup_20260621 b
      WHERE b.paquete_id = pg.paquete_id
        AND b.grupo_id = pg.grupo_id
    );
  END IF;

  IF to_regclass('public.matricula_grupos') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS public.matricula_grupos_backup_20260621
    AS TABLE public.matricula_grupos WITH NO DATA;

    INSERT INTO public.matricula_grupos_backup_20260621
    SELECT mg.*
    FROM public.matricula_grupos mg
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.matricula_grupos_backup_20260621 b
      WHERE b.matricula_id = mg.matricula_id
        AND b.grupo_id = mg.grupo_id
    );
  END IF;
END $$;

DO $$
DECLARE
  duplicated_groups integer := 0;
  duplicated_matriculas integer := 0;
BEGIN
  IF to_regclass('public.paquete_grupos') IS NOT NULL THEN
    SELECT count(*)
    INTO duplicated_groups
    FROM (
      SELECT grupo_id
      FROM public.paquete_grupos
      GROUP BY grupo_id
      HAVING count(DISTINCT paquete_id) > 1
    ) conflicts;
  END IF;

  IF duplicated_groups > 0 THEN
    RAISE EXCEPTION
      'Cannot migrate paquete_grupos: % grupo(s) belong to more than one paquete. Data is backed up in public.paquete_grupos_backup_20260621 and no tables were dropped.',
      duplicated_groups;
  END IF;

  IF to_regclass('public.matricula_grupos') IS NOT NULL THEN
    SELECT count(*)
    INTO duplicated_matriculas
    FROM (
      SELECT matricula_id
      FROM public.matricula_grupos
      GROUP BY matricula_id
      HAVING count(DISTINCT grupo_id) > 1
    ) conflicts;
  END IF;

  IF duplicated_matriculas > 0 THEN
    RAISE EXCEPTION
      'Cannot migrate matricula_grupos: % matricula(s) belong to more than one grupo. Data is backed up in public.matricula_grupos_backup_20260621 and no tables were dropped.',
      duplicated_matriculas;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.paquete_grupos') IS NOT NULL THEN
    UPDATE public.grupos g
    SET
      paquete_id = migrated.paquete_id,
      grupo_ord = migrated.grupo_ord
    FROM (
      SELECT
        grupo_id,
        max(paquete_id) AS paquete_id,
        max(grupo_ord) AS grupo_ord
      FROM public.paquete_grupos
      GROUP BY grupo_id
    ) migrated
    WHERE g.id = migrated.grupo_id;
  END IF;

  IF to_regclass('public.matricula_grupos') IS NOT NULL THEN
    UPDATE public.matriculas m
    SET grupo_id = migrated.grupo_id
    FROM (
      SELECT
        matricula_id,
        max(grupo_id) AS grupo_id
      FROM public.matricula_grupos
      GROUP BY matricula_id
    ) migrated
    WHERE m.id = migrated.matricula_id;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.paquetes') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'grupos_paquete_id_fkey'
         AND conrelid = 'public.grupos'::regclass
     ) THEN
    ALTER TABLE public.grupos
      ADD CONSTRAINT grupos_paquete_id_fkey
      FOREIGN KEY (paquete_id) REFERENCES public.paquetes(id);
  END IF;

  IF to_regclass('public.grupos') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'matriculas_grupo_id_fkey'
         AND conrelid = 'public.matriculas'::regclass
     ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT matriculas_grupo_id_fkey
      FOREIGN KEY (grupo_id) REFERENCES public.grupos(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS grupos_paquete_id_idx ON public.grupos (paquete_id);
CREATE INDEX IF NOT EXISTS matriculas_grupo_id_idx ON public.matriculas (grupo_id);

DROP TABLE IF EXISTS public.paquete_grupos;
DROP TABLE IF EXISTS public.matricula_grupos;

COMMIT;

SELECT 'grupos_with_paquete' AS metric, count(*) AS total
FROM public.grupos
WHERE paquete_id IS NOT NULL;

SELECT 'matriculas_with_grupo' AS metric, count(*) AS total
FROM public.matriculas
WHERE grupo_id IS NOT NULL;

SELECT 'paquete_grupos_backup_20260621' AS backup, count(*) AS total
FROM public.paquete_grupos_backup_20260621;

SELECT 'matricula_grupos_backup_20260621' AS backup, count(*) AS total
FROM public.matricula_grupos_backup_20260621;
