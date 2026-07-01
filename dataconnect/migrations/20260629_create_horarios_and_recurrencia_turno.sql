-- Create horario catalog and let event recurrences use horario + turno.

CREATE TABLE IF NOT EXISTS public.horarios (
  id serial PRIMARY KEY,
  nombre text,
  descripcion text,
  regla text,
  dias_semana text,
  viernes_alterno_inicio text,
  activo boolean,
  fecha_creacion timestamp with time zone,
  fecha_actualizacion timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS horarios_regla_key ON public.horarios (regla);

ALTER TABLE public.evento_recurrencias
  ADD COLUMN IF NOT EXISTS horario_id integer,
  ADD COLUMN IF NOT EXISTS turno_id integer;

ALTER TABLE public.grupos
  ADD COLUMN IF NOT EXISTS horario_id integer;

DO $$
BEGIN
  IF to_regclass('public.horarios') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'evento_recurrencias_horario_id_fkey'
    ) THEN
      ALTER TABLE public.evento_recurrencias
        ADD CONSTRAINT evento_recurrencias_horario_id_fkey
        FOREIGN KEY (horario_id) REFERENCES public.horarios(id);
    END IF;
  END IF;

  IF to_regclass('public.turnos') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'evento_recurrencias_turno_id_fkey'
    ) THEN
      ALTER TABLE public.evento_recurrencias
        ADD CONSTRAINT evento_recurrencias_turno_id_fkey
        FOREIGN KEY (turno_id) REFERENCES public.turnos(id);
    END IF;
  END IF;

  IF to_regclass('public.grupos') IS NOT NULL AND to_regclass('public.horarios') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'grupos_horario_id_fkey'
    ) THEN
      ALTER TABLE public.grupos
        ADD CONSTRAINT grupos_horario_id_fkey
        FOREIGN KEY (horario_id) REFERENCES public.horarios(id);
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS evento_recurrencias_horario_id_idx ON public.evento_recurrencias (horario_id);
CREATE INDEX IF NOT EXISTS evento_recurrencias_turno_id_idx ON public.evento_recurrencias (turno_id);
CREATE INDEX IF NOT EXISTS grupos_horario_id_idx ON public.grupos (horario_id);

INSERT INTO public.horarios (
  nombre,
  descripcion,
  regla,
  dias_semana,
  viernes_alterno_inicio,
  activo,
  fecha_creacion,
  fecha_actualizacion
)
VALUES
  ('Lun, Mie, Vie@ (primer viernes)', 'Lunes, miercoles y viernes intercalado empezando por el primer viernes disponible.', 'LUN,MIE,VIE@1', '1,3,5', 'primer', true, now(), now()),
  ('Lun, Mie, Vie@ (segundo viernes)', 'Lunes, miercoles y viernes intercalado empezando por el segundo viernes disponible.', 'LUN,MIE,VIE@2', '1,3,5', 'segundo', true, now(), now()),
  ('Mar, Jue, Vie@ (primer viernes)', 'Martes, jueves y viernes intercalado empezando por el primer viernes disponible.', 'MAR,JUE,VIE@1', '2,4,5', 'primer', true, now(), now()),
  ('Mar, Jue, Vie@ (segundo viernes)', 'Martes, jueves y viernes intercalado empezando por el segundo viernes disponible.', 'MAR,JUE,VIE@2', '2,4,5', 'segundo', true, now(), now()),
  ('Lun - Vie', 'Lunes a viernes.', 'LUN-VIE', '1,2,3,4,5', NULL, true, now(), now()),
  ('Lun, Mie', 'Lunes y miercoles.', 'LUN,MIE', '1,3', NULL, true, now(), now()),
  ('Mar, Jue', 'Martes y jueves.', 'MAR,JUE', '2,4', NULL, true, now(), now())
ON CONFLICT (regla) DO UPDATE
SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  dias_semana = EXCLUDED.dias_semana,
  viernes_alterno_inicio = EXCLUDED.viernes_alterno_inicio,
  activo = EXCLUDED.activo,
  fecha_actualizacion = now();

SELECT 'horarios' AS table_name, count(*) AS total
FROM public.horarios;
