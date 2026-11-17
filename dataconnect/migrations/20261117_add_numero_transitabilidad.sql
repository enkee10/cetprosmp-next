-- Assigned once when transitabilidad instances repeat; null for a single instance.
ALTER TABLE public.grupo_modulos
  ADD COLUMN IF NOT EXISTS numero_transitabilidad integer;
