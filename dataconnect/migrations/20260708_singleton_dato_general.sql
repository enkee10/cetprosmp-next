ALTER TABLE public."dato_general"
  ADD COLUMN IF NOT EXISTS "codigo_modular" text;

INSERT INTO public."dato_general" (
  "id",
  "nombre_institucion",
  "direccion",
  "telefono_1",
  "telefono_2",
  "correo",
  "pagina_web",
  "facebook",
  "youtube",
  "twitter",
  "instagram",
  "tiktok",
  "ruc",
  "rd",
  "logo_url",
  "codigo_modular"
) VALUES (
  1,
  'CETPRO "San Martin de Porres"',
  'Jiron Santa Clorinda 971 Urb. Palao SMP',
  '5341588',
  '5346663',
  'cetprosanmartindeporres@cetprosmp.edu.pe',
  'cetprosmp.edu.pe',
  'https://www.facebook.com/cetprosanmartindeporres1/',
  'https://www.youtube.com/@enriquerafaelpalominohorna3697',
  'https://x.com/enkee032',
  'https://www.instagram.com/cetpro.smp/',
  'https://www.tiktok.com/@cetpro.sanmartindeporres',
  '20610635939',
  'R.D. N 1839 - 05 - DRELM',
  NULL,
  NULL
) ON CONFLICT ("id") DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('public."dato_general"', 'id'),
  GREATEST((SELECT COALESCE(MAX("id"), 1) FROM public."dato_general"), 1),
  true
);

ALTER TABLE public."dato_general"
  ADD CONSTRAINT dato_general_singleton_id CHECK ("id" = 1) NOT VALID;
