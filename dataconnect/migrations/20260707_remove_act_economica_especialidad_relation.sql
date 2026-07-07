DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.especialidades'::regclass
      AND conkey = ARRAY[
        (
          SELECT attnum
          FROM pg_attribute
          WHERE attrelid = 'public.especialidades'::regclass
            AND attname = 'act_economica_id'
        )
      ]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE public.especialidades DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;

  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.act_economicas'::regclass
      AND conkey = ARRAY[
        (
          SELECT attnum
          FROM pg_attribute
          WHERE attrelid = 'public.act_economicas'::regclass
            AND attname = 'especialidad_id'
        )
      ]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE public.act_economicas DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.especialidades_act_economica_id_idx;
DROP INDEX IF EXISTS public.act_economicas_especialidad_id_idx;

ALTER TABLE public.especialidades
  DROP COLUMN IF EXISTS act_economica_id;

ALTER TABLE public.act_economicas
  DROP COLUMN IF EXISTS especialidad_id;
