ALTER TABLE public.modulos
  ADD COLUMN IF NOT EXISTS duracion_efsrt integer,
  ADD COLUMN IF NOT EXISTS creditos_efsrt integer;
