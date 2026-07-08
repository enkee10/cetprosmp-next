ALTER TABLE public."grupos"
  ADD COLUMN IF NOT EXISTS "workspace_name" text,
  ADD COLUMN IF NOT EXISTS "workspace_correo" text;
