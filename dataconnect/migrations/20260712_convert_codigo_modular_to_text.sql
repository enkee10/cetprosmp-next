ALTER TABLE public.dato_general
  ALTER COLUMN codigo_modular TYPE text
  USING codigo_modular::text;
