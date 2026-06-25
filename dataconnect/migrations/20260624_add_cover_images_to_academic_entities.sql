ALTER TABLE "public"."sectores"
  ADD COLUMN IF NOT EXISTS "imagen_portada_url" text NULL;

ALTER TABLE "public"."familias"
  ADD COLUMN IF NOT EXISTS "imagen_portada_url" text NULL;

ALTER TABLE "public"."act_economicas"
  ADD COLUMN IF NOT EXISTS "imagen_portada_url" text NULL;

ALTER TABLE "public"."especialidades"
  ADD COLUMN IF NOT EXISTS "imagen_portada_url" text NULL;
