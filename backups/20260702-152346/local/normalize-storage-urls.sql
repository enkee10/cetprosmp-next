DO $$
DECLARE
  r record;
  affected integer;
BEGIN
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text', 'character varying')
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET %I = replace(replace(%I, %L, %L), %L, %L) WHERE %I LIKE %L OR %I LIKE %L',
      r.table_schema, r.table_name, r.column_name,
      r.column_name,
      'http://127.0.0.1:9199', 'https://firebasestorage.googleapis.com',
      'http://localhost:9199', 'https://firebasestorage.googleapis.com',
      r.column_name, '%127.0.0.1:9199%',
      r.column_name, '%localhost:9199%'
    );
  END LOOP;
END $$;
