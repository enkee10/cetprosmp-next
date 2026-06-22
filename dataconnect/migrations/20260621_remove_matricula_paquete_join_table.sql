-- Remove matricula_paquetes without losing its data.
--
-- Safe order:
-- 1. Back up the join table.
-- 2. Add a direct nullable paquete_id column to matriculas.
-- 3. Abort if existing rows cannot be represented by one paquete per matricula.
-- 4. Copy relation data into matriculas.paquete_id.
-- 5. Drop the old join table after the copy succeeds.

BEGIN;

ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS paquete_id integer;

DO $$
BEGIN
  IF to_regclass('public.matricula_paquetes') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS public.matricula_paquetes_backup_20260621
    AS TABLE public.matricula_paquetes WITH NO DATA;

    INSERT INTO public.matricula_paquetes_backup_20260621
    SELECT mp.*
    FROM public.matricula_paquetes mp
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.matricula_paquetes_backup_20260621 b
      WHERE b.matricula_id = mp.matricula_id
        AND b.paquete_id = mp.paquete_id
    );
  ELSE
    CREATE TABLE IF NOT EXISTS public.matricula_paquetes_backup_20260621 (
      id integer,
      matricula_id integer,
      paquete_id integer
    );
  END IF;
END $$;

DO $$
DECLARE
  duplicated_matriculas integer := 0;
BEGIN
  IF to_regclass('public.matricula_paquetes') IS NOT NULL THEN
    SELECT count(*)
    INTO duplicated_matriculas
    FROM (
      SELECT matricula_id
      FROM public.matricula_paquetes
      GROUP BY matricula_id
      HAVING count(DISTINCT paquete_id) > 1
    ) conflicts;
  END IF;

  IF duplicated_matriculas > 0 THEN
    RAISE EXCEPTION
      'Cannot migrate matricula_paquetes: % matricula(s) belong to more than one paquete. Data is backed up in public.matricula_paquetes_backup_20260621 and no tables were dropped.',
      duplicated_matriculas;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.matricula_paquetes') IS NOT NULL THEN
    UPDATE public.matriculas m
    SET paquete_id = migrated.paquete_id
    FROM (
      SELECT
        matricula_id,
        max(paquete_id) AS paquete_id
      FROM public.matricula_paquetes
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
       WHERE conname = 'matriculas_paquete_id_fkey'
         AND conrelid = 'public.matriculas'::regclass
     ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT matriculas_paquete_id_fkey
      FOREIGN KEY (paquete_id) REFERENCES public.paquetes(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS matriculas_paquete_id_idx ON public.matriculas (paquete_id);

DROP TABLE IF EXISTS public.matricula_paquetes;

COMMIT;

SELECT 'matriculas_with_paquete' AS metric, count(*) AS total
FROM public.matriculas
WHERE paquete_id IS NOT NULL;

SELECT 'matricula_paquetes_backup_20260621' AS backup, count(*) AS total
FROM public.matricula_paquetes_backup_20260621;
