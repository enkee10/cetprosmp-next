DO $$
DECLARE
  r record;
  c bigint;
  total bigint := 0;
BEGIN
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema='public'
      AND data_type IN ('text','character varying')
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I.%I WHERE %I LIKE %L OR %I LIKE %L',
      r.table_schema, r.table_name, r.column_name,
      '%127.0.0.1:9199%',
      r.column_name,
      '%localhost:9199%'
    ) INTO c;
    total := total + c;
  END LOOP;
  RAISE NOTICE 'local_url_rows=%', total;
END $$;
