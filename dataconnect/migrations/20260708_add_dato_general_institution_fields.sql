ALTER TABLE public."dato_general"
  ADD COLUMN IF NOT EXISTS "tipo_gestion" text,
  ADD COLUMN IF NOT EXISTS "departamento" text,
  ADD COLUMN IF NOT EXISTS "provincia" text,
  ADD COLUMN IF NOT EXISTS "distrito" text,
  ADD COLUMN IF NOT EXISTS "dre" text;
