-- Remove matricula_users without losing its data.
--
-- Safe order:
-- 1. Back up the join table.
-- 2. Add a direct nullable user_id column to matriculas.
-- 3. Abort if existing rows cannot be represented by one user per matricula.
-- 4. Copy relation data into matriculas.user_id.
-- 5. Drop the old join table after the copy succeeds.

BEGIN;

ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS user_id integer;

DO $$
BEGIN
  IF to_regclass('public.matricula_users') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS public.matricula_users_backup_20260621
    AS TABLE public.matricula_users WITH NO DATA;

    INSERT INTO public.matricula_users_backup_20260621
    SELECT mu.*
    FROM public.matricula_users mu
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.matricula_users_backup_20260621 b
      WHERE b.matricula_id = mu.matricula_id
        AND b.user_id = mu.user_id
    );
  ELSE
    CREATE TABLE IF NOT EXISTS public.matricula_users_backup_20260621 (
      id integer,
      matricula_id integer,
      user_id integer
    );
  END IF;
END $$;

DO $$
DECLARE
  duplicated_matriculas integer := 0;
BEGIN
  IF to_regclass('public.matricula_users') IS NOT NULL THEN
    SELECT count(*)
    INTO duplicated_matriculas
    FROM (
      SELECT matricula_id
      FROM public.matricula_users
      GROUP BY matricula_id
      HAVING count(DISTINCT user_id) > 1
    ) conflicts;
  END IF;

  IF duplicated_matriculas > 0 THEN
    RAISE EXCEPTION
      'Cannot migrate matricula_users: % matricula(s) belong to more than one user. Data is backed up in public.matricula_users_backup_20260621 and no tables were dropped.',
      duplicated_matriculas;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.matricula_users') IS NOT NULL THEN
    UPDATE public.matriculas m
    SET user_id = migrated.user_id
    FROM (
      SELECT
        matricula_id,
        max(user_id) AS user_id
      FROM public.matricula_users
      GROUP BY matricula_id
    ) migrated
    WHERE m.id = migrated.matricula_id;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'matriculas_user_id_fkey'
         AND conrelid = 'public.matriculas'::regclass
     ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT matriculas_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS matriculas_user_id_idx ON public.matriculas (user_id);

DROP TABLE IF EXISTS public.matricula_users;

COMMIT;

SELECT 'matriculas_with_user' AS metric, count(*) AS total
FROM public.matriculas
WHERE user_id IS NOT NULL;

SELECT 'matricula_users_backup_20260621' AS backup, count(*) AS total
FROM public.matricula_users_backup_20260621;
