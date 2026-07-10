BEGIN;

ALTER TABLE public.unidades_didacticas
  ADD COLUMN IF NOT EXISTS duracion integer,
  ADD COLUMN IF NOT EXISTS creditos integer;

ALTER TABLE public.grupo_modulos
  ADD COLUMN IF NOT EXISTS inicio timestamptz,
  ADD COLUMN IF NOT EXISTS fin timestamptz;

ALTER TABLE public.grupo_modulo_unidades_didacticas
  ADD COLUMN IF NOT EXISTS inicio timestamptz,
  ADD COLUMN IF NOT EXISTS fin timestamptz;

CREATE OR REPLACE FUNCTION pg_temp.cetprosmp_norm(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(
    translate(
      lower(coalesce(value, '')),
      '??????????????????????',
      'aaaaeeeeiiiioooouuuunc'
    ),
    '[^a-z0-9]+',
    ' ',
    'g'
  ));
$$;

CREATE TEMP TABLE academic_module_dates_20260709 (
  module_id integer PRIMARY KEY,
  inicio date,
  fin date
) ON COMMIT DROP;

INSERT INTO academic_module_dates_20260709 (module_id, inicio, fin)
VALUES
  (1, DATE '2026-03-16', DATE '2026-07-20'),
  (2, DATE '2026-03-16', DATE '2026-07-20'),
  (3, DATE '2026-03-17', DATE '2026-07-24'),
  (4, DATE '2026-03-16', DATE '2026-07-24'),
  (5, DATE '2026-03-16', DATE '2026-07-22'),
  (7, DATE '2026-03-16', DATE '2026-07-24'),
  (8, DATE '2026-03-16', DATE '2026-07-24'),
  (10, DATE '2026-03-16', DATE '2026-07-22'),
  (11, DATE '2026-03-16', DATE '2026-07-22'),
  (14, DATE '2026-03-16', DATE '2026-07-24'),
  (15, DATE '2026-03-16', DATE '2026-07-24'),
  (16, DATE '2026-03-17', DATE '2026-07-21'),
  (18, DATE '2026-03-16', DATE '2026-07-24'),
  (19, DATE '2026-03-16', DATE '2026-07-24'),
  (20, DATE '2026-03-16', DATE '2026-07-24'),
  (21, DATE '2026-03-16', DATE '2026-07-24'),
  (22, DATE '2026-03-17', DATE '2026-05-19'),
  (23, DATE '2026-03-17', DATE '2026-05-19'),
  (24, DATE '2026-05-21', DATE '2026-07-09'),
  (25, DATE '2026-03-16', DATE '2026-07-24'),
  (31, DATE '2026-03-16', DATE '2026-07-24'),
  (32, DATE '2026-03-17', DATE '2026-07-21'),
  (33, DATE '2026-03-16', DATE '2026-06-01'),
  (35, DATE '2026-03-16', DATE '2026-07-24')
ON CONFLICT (module_id) DO UPDATE
SET inicio = EXCLUDED.inicio,
    fin = EXCLUDED.fin;

CREATE TEMP TABLE academic_unit_details_20260709 (
  module_id integer NOT NULL,
  unit_norm text NOT NULL,
  duracion integer,
  creditos integer,
  inicio date,
  fin date,
  PRIMARY KEY (module_id, unit_norm)
) ON COMMIT DROP;

INSERT INTO academic_unit_details_20260709 (module_id, unit_norm, duracion, creditos, inicio, fin)
VALUES
  (1, 'aplicaciones de herramientas informaticas', 48, 2, DATE '2026-04-27', DATE '2026-06-01'),
  (1, 'comunicacion para el desarrollo personal y profesional', 48, 2, DATE '2026-03-18', DATE '2026-04-22'),
  (1, 'corte de cabello', 112, 5, DATE '2026-03-16', DATE '2026-04-23'),
  (1, 'corte y diseno de barba', 48, 2, DATE '2026-05-20', DATE '2026-06-03'),
  (1, 'peinados', 64, 3, DATE '2026-04-24', DATE '2026-05-18'),
  (2, 'coloracion', 112, 5, DATE '2026-04-08', DATE '2026-05-18'),
  (2, 'comportamiento etico', 48, 2, DATE '2026-04-27', DATE '2026-05-01'),
  (2, 'ondulacion y laceado', 48, 2, DATE '2026-05-20', DATE '2026-06-03'),
  (2, 'plan de negocio', 48, 2, DATE '2026-03-18', DATE '2026-04-22'),
  (2, 'tratamiento capilar', 64, 3, DATE '2026-03-16', DATE '2026-04-07'),
  (3, 'diagnostico de celulares', 42, 2, DATE '2026-05-14', DATE '2026-06-02'),
  (3, 'dispositivos y accesorios electronicos', 54, 2, DATE '2026-03-17', DATE '2026-04-16'),
  (3, 'gestion empresarial y emprendimiento', 30, 2, DATE '2026-03-31', DATE '2026-06-18'),
  (3, 'mantenimiento de celulares', 48, 2, DATE '2026-04-21', DATE '2026-05-12'),
  (3, 'reparacion de celulares', 36, 2, DATE '2026-06-04', DATE '2026-06-19'),
  (4, 'conductores electricos', 36, 2, DATE '2026-03-16', DATE '2026-04-01'),
  (4, 'gestion empresarial y emprendimiento', 30, 2, DATE '2026-03-30', DATE '2026-07-01'),
  (4, 'mantenimiento de luminarias y tomacorrientes', 48, 2, DATE '2026-04-29', DATE '2026-05-25'),
  (4, 'mantenimiento de tableros electricos y pozo a tierra', 54, 2, DATE '2026-05-27', DATE '2026-06-22'),
  (4, 'materiales y dispositivos electricos', 42, 2, DATE '2026-04-06', DATE '2026-04-27'),
  (5, 'aplicaciones de herramientas informaticas', 48, 2, DATE '2026-04-30', DATE '2026-07-01'),
  (5, 'capacitacion en el uso del sistema informatico', 80, 3, DATE '2026-05-20', DATE '2026-05-08'),
  (5, 'comunicacion para el desarrollo personal y profesional', 48, 2, DATE '2026-03-18', DATE '2026-04-22'),
  (5, 'incidente informatico del centro de computo', 48, 2, DATE '2026-04-15', DATE '2026-04-29'),
  (5, 'mantenimiento predictivo de equipos y sistemas del centro de computo', 48, 2, DATE '2026-04-04', DATE '2026-05-18'),
  (5, 'organizacion del area de trabajo y arquitectura de hardware', 80, 3, DATE '2026-03-16', DATE '2026-04-13'),
  (7, 'gestion empresarial y emprendimiento', 30, 2, DATE '2026-03-30', DATE '2026-06-01'),
  (7, 'hojas de calculo', 54, 2, DATE '2026-05-25', DATE '2026-06-22'),
  (7, 'presentacion con diapositivas', 36, 2, DATE '2026-05-11', DATE '2026-05-22'),
  (7, 'procesador de textos', 54, 2, DATE '2026-04-06', DATE '2026-05-04'),
  (7, 'uso del computador e internet', 36, 2, DATE '2026-03-16', DATE '2026-04-01'),
  (8, 'dibujo vectorial', 54, 2, DATE '2026-03-01', DATE '2026-03-29'),
  (8, 'gestion empresarial y emprendimiento', 30, 2, DATE '2026-03-30', DATE '2026-06-01'),
  (8, 'maquetacion publicitaria', 42, 2, DATE '2026-06-03', DATE '2026-06-22'),
  (8, 'retoque fotografico', 54, 2, DATE '2026-05-04', DATE '2026-05-29'),
  (8, 'uso del computador e internet', 54, 2, DATE '2026-03-16', DATE '2026-03-25'),
  (10, 'aplicaciones de herramientas informaticas', 48, 2, DATE '2026-04-27', DATE '2026-06-01'),
  (10, 'taller de corte y normas de seguridad', 64, 2, DATE '2026-04-24', DATE '2026-05-12'),
  (10, 'tecnicas de armado de prototipos', 80, 3, DATE '2026-05-13', DATE '2026-06-05'),
  (10, 'tecnicas de tizado de prendas de vestir', 64, 3, DATE '2026-03-16', DATE '2026-04-07'),
  (10, 'tecnicas y control de calidad en el tendido', 64, 2, DATE '2026-04-08', DATE '2026-04-23'),
  (11, 'aplicaciones de herramientas informaticas', 48, 2, DATE '2026-03-27', DATE '2026-06-01'),
  (11, 'comunicacion para el desarrollo personal y profesional', 48, 2, DATE '2026-03-23', DATE '2026-04-27'),
  (11, 'confeccion de prendas en tejido de punto', 64, 3, DATE '2026-04-20', DATE '2026-05-12'),
  (11, 'confeccion de prendas en tejido plano', 80, 3, DATE '2026-05-13', DATE '2026-06-05'),
  (11, 'operatividad de maquinas de confeccion', 64, 3, DATE '2026-03-25', DATE '2026-04-16'),
  (11, 'tecnicas de habilitado de piezas de prendas', 32, 1, DATE '2026-03-16', DATE '2026-03-24'),
  (14, 'bordado computarizado', 36, 2, DATE '2026-06-04', DATE '2026-06-22'),
  (14, 'diseno y programacion de bordados en wilcom', 48, 2, DATE '2026-04-17', DATE '2026-05-13'),
  (14, 'gestion empresarial y emprendimiento', 30, 2, DATE '2026-03-30', DATE '2026-06-01'),
  (14, 'operatividad de maquinas de bordado computarizadas', 42, 2, DATE '2026-05-14', DATE '2026-06-03'),
  (14, 'reconociendo la interfaz de wilcom', 54, 2, DATE '2026-03-16', DATE '2026-04-16'),
  (15, 'gestion empresarial y emprendimiento', 30, 2, DATE '2026-03-30', DATE '2026-06-01'),
  (15, 'organiza el taller y realiza muestras', 42, 2, DATE '2026-03-16', DATE '2026-04-06'),
  (15, 'tejido a maquina de prendas para caballeros', 42, 2, DATE '2026-05-08', DATE '2026-05-24'),
  (15, 'tejido a maquina de prendas para damas', 48, 2, DATE '2026-04-08', DATE '2026-04-29'),
  (15, 'tejido a maquina de prendas para ninos', 48, 2, DATE '2026-05-11', DATE '2026-05-03'),
  (16, 'gestion empresarial y emprendimiento', 30, 2, DATE '2026-03-21', DATE '2026-06-18'),
  (16, 'organiza taller y realiza muestra', 42, 2, DATE '2026-03-17', DATE '2026-04-09'),
  (16, 'tejido a mano de prendas de caballeros', 42, 2, DATE '2026-06-02', DATE '2026-06-23'),
  (16, 'tejido a mano de prendas para damas', 48, 2, DATE '2026-04-10', DATE '2026-05-07'),
  (16, 'tejido a mano de prendas para ninos a', 48, 2, DATE '2026-05-08', DATE '2026-05-29'),
  (18, 'aplicacion de accesorios y avios de los articulos de cuero', 64, 3, DATE '2026-04-29', DATE '2026-05-20'),
  (18, 'aplicaciones de herramientas informaticas', 48, 2, DATE '2026-04-23', DATE '2026-05-30'),
  (18, 'empacado del producto', 48, 2, DATE '2026-05-25', DATE '2026-06-05'),
  (18, 'ensamblado de articulos de cuero', 128, 5, DATE '2026-03-16', DATE '2026-04-28'),
  (18, 'plan de negocio', 48, 2, DATE '2026-03-18', DATE '2026-04-30'),
  (19, 'comportamiento etico', 80, 3, DATE '2026-04-27', DATE '2026-05-01'),
  (19, 'disenos y moldes de calzado', 96, 4, DATE '2026-04-20', DATE '2026-05-21'),
  (19, 'plan de negocio', 48, 2, DATE '2026-03-18', DATE '2026-04-22'),
  (20, 'acabado de calzado', 48, 2, DATE '2026-05-25', DATE '2026-06-05'),
  (20, 'aparado de los diferentes modelos de calzado', 80, 2, DATE '2026-03-16', DATE '2026-04-16'),
  (20, 'aplicaciones de herramientas informaticas', 48, 2, DATE '2026-04-27', DATE '2026-06-01'),
  (20, 'armado de calzado', 48, 4, DATE '2026-04-20', DATE '2026-05-21'),
  (20, 'comunicacion para el desarrollo personal y profesional', 48, 2, DATE '2026-03-18', DATE '2026-04-22'),
  (21, 'decoracion con cartulina y tecnopor', 48, 2, DATE '2026-04-08', DATE '2026-05-04'),
  (21, 'decoracion con flores y telas', 48, 2, DATE '2026-05-11', DATE '2026-06-01'),
  (21, 'decoracion con globos', 42, 2, DATE '2026-03-16', DATE '2026-04-06'),
  (21, 'decoracion con trupan', 42, 2, DATE '2026-06-08', DATE '2026-06-24'),
  (21, 'gestion empresarial y emprendimiento', 30, 2, DATE '2026-06-30', DATE '2026-06-17'),
  (22, 'confeccion de anillos', 18, 2, DATE '2026-04-28', DATE '2026-05-05'),
  (22, 'confeccion de pulseras', 24, 2, DATE '2026-03-27', DATE '2026-04-10'),
  (22, 'emsamblado de collares', 24, 2, DATE '2026-04-16', DATE '2026-04-24'),
  (22, 'ensamblado del aretes', 24, 2, DATE '2026-03-17', DATE '2026-03-26'),
  (22, 'gestion empresarial y emprendimiento', 15, 2, DATE '2026-03-31', DATE '2026-05-07'),
  (23, 'gestion empresarial y emprendimiento', 15, 2, DATE '2026-03-31', DATE '2026-05-07'),
  (23, 'pintura en bizcocho y microporoso', 24, 2, DATE '2026-04-10', DATE '2026-04-23'),
  (23, 'pintura en madera', 24, 2, DATE '2026-03-26', DATE '2026-04-09'),
  (23, 'pintura en tela', 18, 2, DATE '2026-03-13', DATE '2026-03-24'),
  (23, 'pintura en vidrio', 24, 2, DATE '2026-04-24', DATE '2026-05-05'),
  (24, 'gestion empresarial y emprendimiento', 15, 2, DATE '2026-05-22', DATE '2026-07-09'),
  (24, 'objetos utilitarios para el hogar', 24, 2, DATE '2026-06-30', DATE '2026-07-10'),
  (24, 'ornamentos de 15 anos', 18, 2, DATE '2026-06-16', DATE '2026-06-25'),
  (24, 'recuerdos de bautizo', 24, 2, DATE '2026-06-04', DATE '2026-06-12'),
  (24, 'recuerdos de bodas', 24, 2, DATE '2026-05-21', DATE '2026-05-29'),
  (25, 'acondiciona y reutiliza insumos y mermas', 48, 2, DATE '2026-04-20', DATE '2026-05-05'),
  (25, 'aplicaciones de herramientas informaticas', 48, 2, DATE '2026-04-27', DATE '2026-06-01'),
  (25, 'comunicacion para el desarrollo personal y profesional', 48, 2, DATE '2026-03-18', DATE '2026-04-22'),
  (25, 'equipamiento y tratamiento termicos', 48, 2, DATE '2026-05-25', DATE '2026-06-05'),
  (25, 'formulacion y elaboracion de masas', 48, 2, DATE '2026-05-07', DATE '2026-05-21'),
  (25, 'organizacion del area equipos y utensilios', 48, 2, DATE '2026-03-16', DATE '2026-03-30'),
  (25, 'organizacion y seleccion de materia prima e insumos', 48, 2, DATE '2026-04-01', DATE '2026-04-16'),
  (31, 'elaboracion de mesa noche', 36, 2, DATE '2026-05-15', DATE '2026-05-29'),
  (31, 'elaboracion gabinetes de bano', 36, 2, DATE '2026-04-08', DATE '2026-04-22'),
  (31, 'estante de oficina aereo', 24, 2, DATE '2026-06-01', DATE '2026-06-10'),
  (31, 'gestion empresarial y emprendimiento', 30, 2, DATE '2026-03-30', DATE '2026-06-17'),
  (31, 'mantenimiento de puertas interiores y exteriores', 36, 2, DATE '2026-04-27', DATE '2026-05-13'),
  (31, 'organiza equipos herramientas y materiales de carpinteria', 48, 2, DATE '2026-03-16', DATE '2026-04-06'),
  (32, 'elaboracion de muebles de cocina reposteros', 36, 2, DATE '2026-05-15', DATE '2026-05-29'),
  (32, 'elaboracion de muebles de entretenimiento', 36, 2, DATE '2026-04-08', DATE '2026-04-22'),
  (32, 'elaboracion de muebles de oficina archivador', 36, 2, DATE '2026-04-27', DATE '2026-05-13'),
  (32, 'gestion empresarial y emprendimiento', 30, 2, DATE '2026-03-30', DATE '2026-06-17'),
  (32, 'organiza equipos herramientas y materiales de melamina', 48, 2, DATE '2026-03-16', DATE '2026-04-06'),
  (32, 'procesos de acabado del mueble con articulos de cerrajeria', 24, 2, DATE '2026-06-01', DATE '2026-06-10'),
  (33, 'acondicionamiento de herramientas y equipos en cocina', 48, 2, DATE '2026-03-16', DATE '2026-03-30'),
  (33, 'aplicaciones de herramientas informaticas', 48, 2, DATE '2026-04-27', DATE '2026-06-01'),
  (33, 'comunicacion para el desarrollo personal y profesional', 48, 2, DATE '2026-03-18', DATE '2026-04-22'),
  (33, 'control operativo de insumos y programacion diaria en cocina', 48, 2, DATE '2026-04-01', DATE '2026-04-16'),
  (33, 'gestion de insumos y control de mermas en cocina', 48, 2, DATE '2026-05-07', DATE '2026-05-21'),
  (33, 'procesos de conservacion y prevencion de contaminacion en cocina', 48, 2, DATE '2026-05-22', DATE '2026-06-04'),
  (33, 'tecnicas de desinfeccion y preparavcion de insumos de cocina', 48, 2, DATE '2026-04-20', DATE '2026-05-05'),
  (35, 'confeccion delprototipo el polo', 30, 2, DATE '2026-04-12', DATE '2026-04-22'),
  (35, 'elaboracion del prototipo la camisa', 42, 2, DATE '2026-04-20', DATE '2026-06-05'),
  (35, 'gestion empresarial y emprendimiento', 30, 2, DATE '2026-06-07', DATE '2026-06-19'),
  (35, 'manejo de la maquina recta', 54, 2, DATE '2026-04-24', DATE '2026-05-16'),
  (35, 'manejo de maquina remalladora y recubrid0ra', 54, 2, DATE '2026-03-16', DATE '2026-04-08')
ON CONFLICT (module_id, unit_norm) DO UPDATE
SET duracion = EXCLUDED.duracion,
    creditos = EXCLUDED.creditos,
    inicio = EXCLUDED.inicio,
    fin = EXCLUDED.fin;

WITH matched_unit_values AS (
  SELECT
    ud.id AS unidad_id,
    aud.duracion,
    aud.creditos
  FROM academic_unit_details_20260709 aud
  JOIN public.unidad_didactica_modulos udm
    ON udm.modulo_id = aud.module_id
  JOIN public.unidades_didacticas ud
    ON ud.id = udm.unidad_didactica_id
   AND pg_temp.cetprosmp_norm(ud.nombre) = aud.unit_norm
),
duration_mode AS (
  SELECT unidad_id, duracion
  FROM (
    SELECT
      unidad_id,
      duracion,
      row_number() OVER (PARTITION BY unidad_id ORDER BY count(*) DESC, duracion DESC NULLS LAST) AS rn
    FROM matched_unit_values
    WHERE duracion IS NOT NULL
    GROUP BY unidad_id, duracion
  ) ranked
  WHERE rn = 1
),
credits_mode AS (
  SELECT unidad_id, creditos
  FROM (
    SELECT
      unidad_id,
      creditos,
      row_number() OVER (PARTITION BY unidad_id ORDER BY count(*) DESC, creditos DESC NULLS LAST) AS rn
    FROM matched_unit_values
    WHERE creditos IS NOT NULL
    GROUP BY unidad_id, creditos
  ) ranked
  WHERE rn = 1
),
unit_modes AS (
  SELECT
    ids.unidad_id,
    dm.duracion,
    cm.creditos
  FROM (SELECT DISTINCT unidad_id FROM matched_unit_values) ids
  LEFT JOIN duration_mode dm ON dm.unidad_id = ids.unidad_id
  LEFT JOIN credits_mode cm ON cm.unidad_id = ids.unidad_id
)
UPDATE public.unidades_didacticas ud
SET
  duracion = COALESCE(um.duracion, ud.duracion),
  creditos = COALESCE(um.creditos, ud.creditos)
FROM unit_modes um
WHERE ud.id = um.unidad_id
  AND (
    ud.duracion IS DISTINCT FROM COALESCE(um.duracion, ud.duracion)
    OR ud.creditos IS DISTINCT FROM COALESCE(um.creditos, ud.creditos)
  );

UPDATE public.grupo_modulos gm
SET
  inicio = amd.inicio::timestamptz,
  fin = amd.fin::timestamptz
FROM academic_module_dates_20260709 amd
JOIN public.grupos g ON g.id = gm.grupo_id
JOIN public.semestres s ON s.id = g.semestre_id
WHERE gm.modulo_id = amd.module_id
  AND s.titulo = '2026-1'
  AND (
    gm.inicio IS DISTINCT FROM amd.inicio::timestamptz
    OR gm.fin IS DISTINCT FROM amd.fin::timestamptz
  );

WITH matched_group_unit_dates AS (
  SELECT
    gmud.id AS grupo_modulo_unidad_id,
    aud.inicio,
    aud.fin
  FROM academic_unit_details_20260709 aud
  JOIN public.grupo_modulos gm ON gm.modulo_id = aud.module_id
  JOIN public.grupos g ON g.id = gm.grupo_id
  JOIN public.semestres s ON s.id = g.semestre_id
  JOIN public.unidad_didactica_modulos udm
    ON udm.modulo_id = aud.module_id
  JOIN public.unidades_didacticas ud
    ON ud.id = udm.unidad_didactica_id
   AND pg_temp.cetprosmp_norm(ud.nombre) = aud.unit_norm
  JOIN public.grupo_modulo_unidades_didacticas gmud
    ON gmud.grupo_modulo_id = gm.id
   AND gmud.unidad_didactica_id = ud.id
  WHERE s.titulo = '2026-1'
    AND (aud.inicio IS NULL OR aud.fin IS NULL OR aud.inicio <= aud.fin)
)
UPDATE public.grupo_modulo_unidades_didacticas gmud
SET
  inicio = mgud.inicio::timestamptz,
  fin = mgud.fin::timestamptz
FROM matched_group_unit_dates mgud
WHERE gmud.id = mgud.grupo_modulo_unidad_id
  AND (
    gmud.inicio IS DISTINCT FROM mgud.inicio::timestamptz
    OR gmud.fin IS DISTINCT FROM mgud.fin::timestamptz
  );

COMMIT;
