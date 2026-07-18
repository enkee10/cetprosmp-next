ALTER TABLE public.capacidades_terminales
  ADD COLUMN IF NOT EXISTS orden integer;

ALTER TABLE public.indicadores_capacidad
  ADD COLUMN IF NOT EXISTS orden integer;
