-- Restore planes data from the original Strapi carreras dump.
-- This repair is idempotent: it upserts public.planes and rebuilds public.modulos.plan_id.
-- Source: migracion_para_firebase_sqlconnect_completo_con_datos.sql

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.planes') IS NULL THEN
    RAISE EXCEPTION 'public.planes does not exist. Apply the Plan schema/migration first.';
  END IF;

  IF to_regclass('public.modulos') IS NULL THEN
    RAISE EXCEPTION 'public.modulos does not exist. Cannot restore module-plan relations.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'modulos' AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE public.modulos ADD COLUMN plan_id integer NULL;
  END IF;
END $$;

CREATE TEMP TABLE restore_carreras (
  id integer,
  document_id text,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  published_at timestamp without time zone,
  created_by_id integer,
  updated_by_id integer,
  locale text,
  titulo text,
  codigo text,
  descripcion text,
  duracion text,
  creditos integer,
  nivel text,
  titulo_comercial text,
  slug text,
  descripcion_2 text
) ON COMMIT DROP;

INSERT INTO restore_carreras (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, codigo, descripcion, duracion, creditos, nivel, titulo_comercial, slug, descripcion_2) VALUES
  ('2', 'nseaz3sgsmvkokfa4thsvc1x', '2025-05-28 16:18:14.393', '2025-07-26 11:30:58.387', '2025-07-26 11:30:58.373', '1', '1', NULL, 'Electrónica', NULL, NULL, '1000', NULL, 'Auxiliar Técnico', 'Electrónica', 'electronica', NULL),
  ('3', 'xoigjphgez7eujq47ezr202j', '2025-05-29 10:14:05.809', '2025-07-26 11:31:27.754', '2025-07-26 11:31:27.74', '1', '1', NULL, 'Mantenimiento Básico de Sistemas Eléctricos', NULL, NULL, '1000', NULL, 'Auxiliar Técnico', 'Mantenimiento Básico de Sistemas Eléctricos', 'mantenimiento-electronico', NULL),
  ('4', 'aggyflopu32u1cd1gak5nbjp', '2025-05-29 10:15:56.251', '2025-07-26 11:31:48.412', '2025-07-26 11:31:48.397', '1', '1', NULL, 'Soporte técnico y operaciones de centros de cómputo', 'J2662-1-001', NULL, '1056', '40', 'Auxiliar Técnico', 'Soporte técnico de computadoras', 'soporte-computadoras', NULL),
  ('5', 'qkzo9rksbs43wmce9uxar4a6', '2025-05-29 10:25:53.755', '2025-07-26 11:32:17.484', '2025-07-26 11:32:17.47', '1', '1', NULL, 'Operación de Computadoras', NULL, NULL, '1000', NULL, 'Auxiliar Técnico', 'Operación de Computadoras', 'operaciones-computadoras', NULL),
  ('6', 'h85eh2qhebq8sariyo5xjo7y', '2025-05-29 10:28:30.142', '2025-07-26 11:32:36.828', '2025-07-26 11:32:36.817', '1', '1', NULL, 'Corte y Ensamblaje', 'CO714-1-003', NULL, '1056', '40', 'Auxiliar Técnico', 'Corte y Ensamblaje', 'corte-ensamblaje', NULL),
  ('7', 'ch06m02qs2hxdaoso8zjp3xy', '2025-05-29 10:29:27.495', '2025-07-26 11:32:49.738', '2025-07-26 11:32:49.727', '1', '1', NULL, 'Costura y Acabados', 'CO714-1-004', NULL, '1056', '40', 'Auxiliar Técnico', 'Costura y Acabados', 'costura-acabados', NULL),
  ('8', 's2r8v3xpdofz54zyz09oqugy', '2025-05-29 10:33:47.103', '2025-07-26 11:33:12.959', '2025-07-26 11:33:12.949', '1', '1', NULL, 'Bordado de prendas de vestir', 'C0714-1-002', NULL, '1056', '40', 'Auxiliar Técnico', 'Bordado en prendas de vestir', 'bordados-prendas', NULL),
  ('9', 'ogosh7z9j9xt6nsg26byn8et', '2025-05-29 10:35:08.498', '2025-07-26 11:33:34.712', '2025-07-26 11:33:34.696', '1', '1', NULL, 'Confección Textil', NULL, NULL, '1000', NULL, 'Auxiliar Técnico', 'Confección Textil', 'confeccion-textil', NULL),
  ('10', 'qxb804jn2yz0ataef2khk1j8', '2025-05-29 11:00:09.721', '2025-07-26 11:33:54.795', '2025-07-26 11:33:54.785', '1', '1', NULL, 'Confección de calzado', 'C0715-1-001', NULL, '1056', '40', 'Auxiliar Técnico', 'Confección de calzado', 'confeccion-calzado', NULL),
  ('11', 'y8ivt4gjfvb61qdthpej13yb', '2025-05-29 11:02:02.928', '2025-07-26 11:34:46.251', '2025-07-26 11:34:46.24', '1', '1', NULL, 'Confección de Artículos de Cuero y Marroquinería', 'C0715-1-002', NULL, '1056', '40', 'Auxiliar Técnico', 'Artículos de Cuero y Marroquinería', 'cuero-marroquineria', NULL),
  ('12', 'h6teufmxnry8ogwtxfv4cxj0', '2025-05-29 11:03:04.285', '2025-07-26 11:35:08.945', '2025-07-26 11:35:08.928', '1', '1', NULL, 'Manualidades', NULL, NULL, '1000', NULL, 'Auxiliar Técnico', 'Manualidades', 'manualidades', NULL),
  ('13', 'g8rin1mdfp55nt8o6yryyn7b', '2025-05-29 11:04:37.496', '2025-07-26 11:35:33.442', '2025-07-26 11:35:33.431', '1', '1', NULL, 'Panadería y Pastelería', 'C0610-1-001', NULL, '1056', '40', 'Auxiliar Técnico', 'Panadería y Pastelería', 'panaderia-pasteleria', NULL),
  ('14', 'itwieaftkuujghdhn9yf0do6', '2025-05-29 11:05:29.76', '2025-07-26 11:35:58.975', '2025-07-26 11:35:58.956', '1', '1', NULL, 'Asistencia en Pastelería y Panadería', NULL, NULL, '1000', NULL, 'Auxiliar Técnico', 'Asistencia en Pastelería y Panadería', 'asistente-panaderia-pasteleria', NULL),
  ('15', 'yjopowuya2lxdyo4s6s2i0x2', '2025-05-29 11:06:19.082', '2025-07-26 11:36:19.334', '2025-07-26 11:36:19.323', '1', '1', NULL, 'Mantenimiento Básico de Casas y Edificios', NULL, NULL, '1000', NULL, 'Auxiliar Técnico', 'Mantenimiento Básico de Casas y Edificios', 'mantenimiento-casas-edificios', NULL),
  ('1', 'j6oly9508e9w7kbv29zf3zg8', '2025-05-28 16:15:13.533', '2025-07-28 15:17:34.587', '2025-07-28 15:17:34.574', '1', '1', NULL, 'Peluquería y Barberia', 'S3496-1-001', NULL, '1056', '40', 'Auxiliar Técnico', 'Peluquería y Barberia', 'peluqueria-barberia', NULL);

CREATE TEMP TABLE restore_carreras_act_economica_lnk (
  id integer,
  carrera_id integer,
  act_economica_id integer
) ON COMMIT DROP;

INSERT INTO restore_carreras_act_economica_lnk (id, carrera_id, act_economica_id) VALUES
  ('1', '1', '1'),
  ('2', '2', '2'),
  ('3', '3', '3'),
  ('4', '4', '4'),
  ('5', '5', '4'),
  ('6', '6', '5'),
  ('7', '7', '5'),
  ('8', '8', '5'),
  ('9', '9', '5'),
  ('10', '10', '6'),
  ('11', '11', '6'),
  ('12', '12', '7'),
  ('13', '13', '8'),
  ('14', '14', '8'),
  ('15', '15', '9');

CREATE TEMP TABLE restore_modulos_carrera_lnk (
  id integer,
  modulo_id integer,
  carrera_id integer
) ON COMMIT DROP;

INSERT INTO restore_modulos_carrera_lnk (id, modulo_id, carrera_id) VALUES
  ('1', '1', '1'),
  ('2', '2', '1'),
  ('3', '3', '2'),
  ('4', '4', '3'),
  ('5', '5', '4'),
  ('6', '6', '4'),
  ('7', '7', '5'),
  ('8', '8', '5'),
  ('9', '9', '5'),
  ('10', '10', '6'),
  ('11', '11', '6'),
  ('12', '12', '7'),
  ('13', '13', '7'),
  ('14', '14', '8'),
  ('15', '15', '9'),
  ('16', '16', '9'),
  ('19', '17', '11'),
  ('20', '18', '11'),
  ('21', '19', '10'),
  ('22', '20', '10'),
  ('23', '21', '12'),
  ('24', '22', '12'),
  ('25', '23', '12'),
  ('26', '24', '12'),
  ('27', '25', '13'),
  ('28', '26', '13'),
  ('29', '27', '14'),
  ('30', '28', '14'),
  ('31', '29', '14'),
  ('32', '30', '14'),
  ('33', '31', '15'),
  ('34', '32', '15');

WITH carrera_act_economica AS (
  SELECT carrera_id, min(act_economica_id) AS act_economica_id
  FROM restore_carreras_act_economica_lnk
  GROUP BY carrera_id
)
INSERT INTO public.planes (
  id, titulo, codigo, version, descripcion, duracion, creditos, nivel,
  titulo_comercial, slug, descripcion_2, act_economica_id
)
SELECT
  c.id, c.titulo, c.codigo, NULL::text AS version, c.descripcion, c.duracion,
  c.creditos, c.nivel, c.titulo_comercial, c.slug, c.descripcion_2,
  cae.act_economica_id
FROM restore_carreras c
LEFT JOIN carrera_act_economica cae ON cae.carrera_id = c.id
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  codigo = EXCLUDED.codigo,
  version = COALESCE(public.planes.version, EXCLUDED.version),
  descripcion = EXCLUDED.descripcion,
  duracion = EXCLUDED.duracion,
  creditos = EXCLUDED.creditos,
  nivel = EXCLUDED.nivel,
  titulo_comercial = EXCLUDED.titulo_comercial,
  slug = EXCLUDED.slug,
  descripcion_2 = EXCLUDED.descripcion_2,
  act_economica_id = EXCLUDED.act_economica_id;

WITH modulo_plan AS (
  SELECT modulo_id, min(carrera_id) AS plan_id
  FROM restore_modulos_carrera_lnk
  GROUP BY modulo_id
), valid_modulo_plan AS (
  SELECT mp.modulo_id, mp.plan_id
  FROM modulo_plan mp
  JOIN public.planes p ON p.id = mp.plan_id
)
UPDATE public.modulos m
SET plan_id = vmp.plan_id
FROM valid_modulo_plan vmp
WHERE m.id = vmp.modulo_id
  AND m.plan_id IS DISTINCT FROM vmp.plan_id;

DO $$
BEGIN
  IF to_regclass('public.modulos') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'modulos'
         AND indexname = 'modulos_planId_idx'
     ) THEN
    CREATE INDEX "modulos_planId_idx" ON public.modulos (plan_id);
  END IF;
END $$;

SELECT setval(pg_get_serial_sequence('public.planes', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.planes), 1), true);

DO $$
DECLARE
  missing_plan_links integer;
  missing_modulo_links integer;
BEGIN
  SELECT count(*)
  INTO missing_plan_links
  FROM restore_modulos_carrera_lnk l
  LEFT JOIN public.planes p ON p.id = l.carrera_id
  WHERE p.id IS NULL;

  SELECT count(*)
  INTO missing_modulo_links
  FROM restore_modulos_carrera_lnk l
  LEFT JOIN public.modulos m ON m.id = l.modulo_id
  WHERE m.id IS NULL;

  IF missing_plan_links > 0 THEN
    RAISE WARNING 'Some module links reference plans that do not exist: %', missing_plan_links;
  END IF;

  IF missing_modulo_links > 0 THEN
    RAISE WARNING 'Some module links reference modules that do not exist: %', missing_modulo_links;
  END IF;
END $$;

SELECT 'restored_planes' AS metric, count(*) AS total
FROM public.planes
WHERE id IN (SELECT id FROM restore_carreras);

SELECT 'linked_modulos' AS metric, count(*) AS total
FROM public.modulos m
JOIN restore_modulos_carrera_lnk l
  ON l.modulo_id = m.id
 AND l.carrera_id = m.plan_id;

COMMIT;
