-- Transitabilidad belongs to the offered group-module, not the module catalog.
ALTER TABLE public.grupo_modulos
  ADD COLUMN IF NOT EXISTS transitabilidad boolean DEFAULT false;
