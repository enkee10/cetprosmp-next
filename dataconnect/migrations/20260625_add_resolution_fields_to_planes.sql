ALTER TABLE public.planes
  ADD COLUMN IF NOT EXISTS periodo_aprobacion text,
  ADD COLUMN IF NOT EXISTS plan_estudio text,
  ADD COLUMN IF NOT EXISTS periodo_caducidad text,
  ADD COLUMN IF NOT EXISTS resolucion_tipo text,
  ADD COLUMN IF NOT EXISTS nro text,
  ADD COLUMN IF NOT EXISTS anio integer,
  ADD COLUMN IF NOT EXISTS genera text;
