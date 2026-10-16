ALTER TABLE public.parte_diario_registros
  ADD COLUMN IF NOT EXISTS compromisos jsonb NULL;
