CREATE TABLE IF NOT EXISTS public.efsrt_ppp_estudiantes (
  id serial PRIMARY KEY,
  promedio_final double precision,
  modo_calculo varchar(20),
  observacion text,
  fecha_registro timestamptz,
  fecha_actualizacion timestamptz,
  grupo_modulo_id integer NOT NULL,
  modulo_estudiante_id integer NOT NULL,
  registrado_por_id integer
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.efsrt_ppp_estudiantes'::regclass
      AND conname = 'efsrt_ppp_estudiantes_grupo_modulo_id_fkey'
  ) THEN
    ALTER TABLE public.efsrt_ppp_estudiantes
      ADD CONSTRAINT efsrt_ppp_estudiantes_grupo_modulo_id_fkey
      FOREIGN KEY (grupo_modulo_id)
      REFERENCES public.grupo_modulos(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.efsrt_ppp_estudiantes'::regclass
      AND conname = 'efsrt_ppp_estudiantes_modulo_estudiante_id_fkey'
  ) THEN
    ALTER TABLE public.efsrt_ppp_estudiantes
      ADD CONSTRAINT efsrt_ppp_estudiantes_modulo_estudiante_id_fkey
      FOREIGN KEY (modulo_estudiante_id)
      REFERENCES public.modulos_estudiantes(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.efsrt_ppp_estudiantes'::regclass
      AND conname = 'efsrt_ppp_estudiantes_registrado_por_id_fkey'
  ) THEN
    ALTER TABLE public.efsrt_ppp_estudiantes
      ADD CONSTRAINT efsrt_ppp_estudiantes_registrado_por_id_fkey
      FOREIGN KEY (registrado_por_id)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS efsrt_ppp_estudiantes_grupo_modulo_estudiante_unique_idx
  ON public.efsrt_ppp_estudiantes (grupo_modulo_id, modulo_estudiante_id);

CREATE INDEX IF NOT EXISTS efsrt_ppp_estudiantes_grupo_modulo_id_idx
  ON public.efsrt_ppp_estudiantes (grupo_modulo_id);

CREATE INDEX IF NOT EXISTS efsrt_ppp_estudiantes_modulo_estudiante_id_idx
  ON public.efsrt_ppp_estudiantes (modulo_estudiante_id);

ALTER TABLE public.efsrt_ppp_notas
  ADD COLUMN IF NOT EXISTS efsrt_ppp_estudiante_id integer;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'efsrt_ppp_notas'
      AND column_name = 'modulo_estudiante_id'
  ) THEN
    EXECUTE $sql$
      INSERT INTO public.efsrt_ppp_estudiantes (
        grupo_modulo_id,
        modulo_estudiante_id,
        modo_calculo,
        fecha_registro,
        fecha_actualizacion
      )
      SELECT DISTINCT
        practica.grupo_modulo_id,
        nota.modulo_estudiante_id,
        'automatico',
        now(),
        now()
      FROM public.efsrt_ppp_notas AS nota
      JOIN public.efsrt_ppp_practicas AS practica
        ON practica.id = nota.practica_id
      WHERE nota.efsrt_ppp_estudiante_id IS NULL
        AND nota.modulo_estudiante_id IS NOT NULL
      ON CONFLICT (grupo_modulo_id, modulo_estudiante_id) DO NOTHING
    $sql$;

    EXECUTE $sql$
      UPDATE public.efsrt_ppp_notas AS nota
      SET efsrt_ppp_estudiante_id = estudiante.id
      FROM public.efsrt_ppp_practicas AS practica
      JOIN public.efsrt_ppp_estudiantes AS estudiante
        ON estudiante.grupo_modulo_id = practica.grupo_modulo_id
      WHERE practica.id = nota.practica_id
        AND estudiante.modulo_estudiante_id = nota.modulo_estudiante_id
        AND nota.efsrt_ppp_estudiante_id IS NULL
        AND nota.modulo_estudiante_id IS NOT NULL
    $sql$;
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.efsrt_ppp_notas'::regclass
      AND contype IN ('u', 'f')
      AND conname LIKE '%modulo_estudiante%'
  LOOP
    EXECUTE format('ALTER TABLE public.efsrt_ppp_notas DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.efsrt_ppp_notas'::regclass
      AND conname = 'efsrt_ppp_notas_efsrt_ppp_estudiante_id_fkey'
  ) THEN
    ALTER TABLE public.efsrt_ppp_notas
      ADD CONSTRAINT efsrt_ppp_notas_efsrt_ppp_estudiante_id_fkey
      FOREIGN KEY (efsrt_ppp_estudiante_id)
      REFERENCES public.efsrt_ppp_estudiantes(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS efsrt_ppp_notas_practica_estudiante_unique_idx
  ON public.efsrt_ppp_notas (practica_id, efsrt_ppp_estudiante_id);

CREATE INDEX IF NOT EXISTS efsrt_ppp_notas_efsrt_ppp_estudiante_id_idx
  ON public.efsrt_ppp_notas (efsrt_ppp_estudiante_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.efsrt_ppp_notas
    WHERE efsrt_ppp_estudiante_id IS NULL
  ) THEN
    ALTER TABLE public.efsrt_ppp_notas
      ALTER COLUMN efsrt_ppp_estudiante_id SET NOT NULL;

    ALTER TABLE public.efsrt_ppp_notas
      DROP COLUMN IF EXISTS modulo_estudiante_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.recalcular_promedio_efsrt_ppp_estudiante(
  p_efsrt_ppp_estudiante_id integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  promedio double precision;
BEGIN
  IF p_efsrt_ppp_estudiante_id IS NULL THEN
    RETURN;
  END IF;

  SELECT AVG(nota)
  INTO promedio
  FROM public.efsrt_ppp_notas
  WHERE efsrt_ppp_estudiante_id = p_efsrt_ppp_estudiante_id
    AND nota IS NOT NULL;

  UPDATE public.efsrt_ppp_estudiantes
  SET promedio_final = promedio,
      modo_calculo = CASE WHEN promedio IS NULL THEN modo_calculo ELSE 'automatico' END,
      fecha_actualizacion = now()
  WHERE id = p_efsrt_ppp_estudiante_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.efsrt_ppp_notas_recalcular_promedio()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalcular_promedio_efsrt_ppp_estudiante(NEW.efsrt_ppp_estudiante_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    PERFORM public.recalcular_promedio_efsrt_ppp_estudiante(NEW.efsrt_ppp_estudiante_id);
    IF OLD.efsrt_ppp_estudiante_id IS DISTINCT FROM NEW.efsrt_ppp_estudiante_id THEN
      PERFORM public.recalcular_promedio_efsrt_ppp_estudiante(OLD.efsrt_ppp_estudiante_id);
    END IF;
    RETURN NEW;
  END IF;

  PERFORM public.recalcular_promedio_efsrt_ppp_estudiante(OLD.efsrt_ppp_estudiante_id);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS efsrt_ppp_notas_recalcular_promedio_trigger
  ON public.efsrt_ppp_notas;

CREATE TRIGGER efsrt_ppp_notas_recalcular_promedio_trigger
AFTER INSERT OR UPDATE OF nota, efsrt_ppp_estudiante_id OR DELETE
ON public.efsrt_ppp_notas
FOR EACH ROW
EXECUTE FUNCTION public.efsrt_ppp_notas_recalcular_promedio();
