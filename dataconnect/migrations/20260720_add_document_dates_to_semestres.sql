ALTER TABLE public.semestres
  ADD COLUMN IF NOT EXISTS fecha_acta date,
  ADD COLUMN IF NOT EXISTS fecha_certificado date,
  ADD COLUMN IF NOT EXISTS fecha_nomina date;
