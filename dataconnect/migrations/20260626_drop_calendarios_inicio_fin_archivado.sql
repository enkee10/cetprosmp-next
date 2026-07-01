-- Remove deprecated calendar range/archive columns.
-- The calendario table is expected to be empty. Abort if rows exist so data is not
-- discarded silently.

DO $$
DECLARE
  row_count bigint;
BEGIN
  SELECT count(*) INTO row_count
  FROM public.calendarios;

  IF row_count > 0 THEN
    RAISE EXCEPTION
      'Refusing to drop calendarios date/archive columns because public.calendarios contains % row(s).',
      row_count;
  END IF;
END $$;

ALTER TABLE public.calendarios
  DROP COLUMN IF EXISTS fecha_ini,
  DROP COLUMN IF EXISTS fecha_fin,
  DROP COLUMN IF EXISTS inicio,
  DROP COLUMN IF EXISTS fin,
  DROP COLUMN IF EXISTS archivado;
