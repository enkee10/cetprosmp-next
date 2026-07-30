DO $$
DECLARE
  seq_record record;
  max_id bigint;
BEGIN
  FOR seq_record IN
    SELECT
      sequence_namespace.nspname AS sequence_schema,
      sequence_class.relname AS sequence_name,
      table_namespace.nspname AS table_schema,
      table_class.relname AS table_name,
      table_attribute.attname AS column_name
    FROM pg_class sequence_class
    JOIN pg_namespace sequence_namespace
      ON sequence_namespace.oid = sequence_class.relnamespace
    JOIN pg_depend sequence_dependency
      ON sequence_dependency.objid = sequence_class.oid
      AND sequence_dependency.deptype = 'a'
    JOIN pg_class table_class
      ON table_class.oid = sequence_dependency.refobjid
    JOIN pg_namespace table_namespace
      ON table_namespace.oid = table_class.relnamespace
    JOIN pg_attribute table_attribute
      ON table_attribute.attrelid = table_class.oid
      AND table_attribute.attnum = sequence_dependency.refobjsubid
    WHERE sequence_class.relkind = 'S'
      AND table_namespace.nspname = 'public'
  LOOP
    EXECUTE format(
      'SELECT MAX(%I)::bigint FROM %I.%I',
      seq_record.column_name,
      seq_record.table_schema,
      seq_record.table_name
    )
    INTO max_id;

    IF max_id IS NULL THEN
      EXECUTE format(
        'SELECT setval(%L::regclass, 1, false)',
        format('%I.%I', seq_record.sequence_schema, seq_record.sequence_name)
      );
    ELSE
      EXECUTE format(
        'SELECT setval(%L::regclass, %s, true)',
        format('%I.%I', seq_record.sequence_schema, seq_record.sequence_name),
        max_id
      );
    END IF;
  END LOOP;
END $$;
