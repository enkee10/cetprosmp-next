-- Rename the old carreras model to planes without copying or dropping data.
-- Run this before deploying/reloading the matching Data Connect schema change.
-- Do not rely on Data Connect's inferred migration for this rename: it may
-- create planes, drop carreras, and lose the existing rows instead of renaming.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.planes') IS NULL AND to_regclass('public.carreras') IS NOT NULL THEN
    ALTER TABLE public.carreras RENAME TO planes;
  ELSIF to_regclass('public.planes') IS NOT NULL AND to_regclass('public.carreras') IS NOT NULL THEN
    RAISE EXCEPTION 'Both public.carreras and public.planes exist. Resolve manually before continuing.';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.modulos') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'modulos'
        AND column_name = 'carrera_id'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'modulos'
        AND column_name = 'plan_id'
    ) THEN
      ALTER TABLE public.modulos RENAME COLUMN carrera_id TO plan_id;
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'modulos'
        AND column_name = 'carrera_id'
    ) AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'modulos'
        AND column_name = 'plan_id'
    ) THEN
      RAISE EXCEPTION 'Both public.modulos.carrera_id and public.modulos.plan_id exist. Resolve manually before continuing.';
    END IF;
  END IF;
END $$;

COMMIT;
