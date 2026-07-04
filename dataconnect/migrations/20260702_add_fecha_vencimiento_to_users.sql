ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS fecha_vencimiento timestamp;
