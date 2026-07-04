--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4 (PGlite 0.3.3)
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'SQL_ASCII';
SET standard_conforming_strings = off;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET escape_string_warning = off;
SET row_security = off;

--
-- Data for Name: acciones; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE "public"."acciones" DISABLE TRIGGER ALL;



ALTER TABLE "public"."acciones" ENABLE TRIGGER ALL;

--
-- Data for Name: sectores; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."sectores" DISABLE TRIGGER ALL;

INSERT INTO "public"."sectores" VALUES (1, NULL, 'OTRAS ACTIVIDADES DE SERVICIOS', NULL);
INSERT INTO "public"."sectores" VALUES (3, NULL, 'INFORMACIÓN Y COMUNICACIONES', NULL);
INSERT INTO "public"."sectores" VALUES (4, NULL, 'INDUSTRIAS MANUFACTURERAS', NULL);
INSERT INTO "public"."sectores" VALUES (2, NULL, 'ELECTRICIDAD, GAS Y AGUA', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/academico%2Fsectores%2F1782352585249_ELECTRICIDAD-GAS-Y-AGUA.jpg?alt=media&token=55d2b6c0-abee-4daa-993e-d9b38a4d1af8');


ALTER TABLE "public"."sectores" ENABLE TRIGGER ALL;

--
-- Data for Name: familias; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."familias" DISABLE TRIGGER ALL;

INSERT INTO "public"."familias" VALUES (1, 1, NULL, 'SERVICIOS PERSONALES Y DE HOGARES', NULL);
INSERT INTO "public"."familias" VALUES (3, 3, NULL, 'TECNOLOGIAS DE LA INFORMACIÓN Y COMUNICACIONES – TIC’s', NULL);
INSERT INTO "public"."familias" VALUES (4, 4, NULL, 'INDUSTRIA TEXTIL, CONFECCIÓN Y DEL CUERO', NULL);
INSERT INTO "public"."familias" VALUES (5, 4, NULL, 'INDUSTRIA DIVERSAS', NULL);
INSERT INTO "public"."familias" VALUES (6, 4, NULL, 'INDUSTRIA ALIMENTARIA BEBIDA Y TABACO', NULL);
INSERT INTO "public"."familias" VALUES (7, 4, NULL, 'INDUSTRIA DE LA MADERA Y MUEBLES', NULL);
INSERT INTO "public"."familias" VALUES (2, 2, 'Rubro técnico orientado a la formación de profesionales capaces de instalar, operar, mantener y supervisar sistemas relacionados con el suministro de energía, redes de agua potable, alcantarillado y servicios de saneamiento básico. Incluye actividades vinculadas al uso eficiente de recursos, mantenimiento de instalaciones, control de calidad y apoyo a la sostenibilidad ambiental en viviendas, empresas e instituciones.', 'ENERGÍA, AGUA, Y SANEAMIENTO', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/academico%2Ffamilias%2F1782350878044_ENERGIA-AGUA-Y-SANEAMIENTO.jpg?alt=media&token=5009aa98-87bd-4e85-9515-5227359a08d4');


ALTER TABLE "public"."familias" ENABLE TRIGGER ALL;

--
-- Data for Name: act_economicas; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."act_economicas" DISABLE TRIGGER ALL;

INSERT INTO "public"."act_economicas" VALUES (1, 1, 1, NULL, 'OTRAS ACTIVIDADES DE SERVICIOS PERSONALES  ', NULL);
INSERT INTO "public"."act_economicas" VALUES (2, 2, 1, NULL, 'REPARACIÓN DE ORDENADORES Y DE EFECTOS Y ENSERES DOMÉSTICOS', NULL);
INSERT INTO "public"."act_economicas" VALUES (3, 2, 2, NULL, 'SUMINISTRO DE ELECTRICIDAD, GAS, VAPOR Y AIRE ACONDICIONADO', NULL);
INSERT INTO "public"."act_economicas" VALUES (4, 3, 3, NULL, 'PROGRAMACIÓN INFORMÁTICA, CONSULTORÍA DE INFORMÁTICA Y ACTIVIDADES CONEXAS', NULL);
INSERT INTO "public"."act_economicas" VALUES (5, 4, 4, NULL, 'FABRICACION DE PRENDAS DE VESTIR', NULL);
INSERT INTO "public"."act_economicas" VALUES (6, 5, 4, NULL, 'FABRICACION DE PRODUCTOS DE CUERO Y PRODUCTOS CONEXOS', NULL);
INSERT INTO "public"."act_economicas" VALUES (7, 6, 5, NULL, 'OTRAS INDUSTRIAS MANUFACTURERA', NULL);
INSERT INTO "public"."act_economicas" VALUES (8, 7, 6, NULL, 'ELABORACIÓN DE PRODUCTOS ALIMENTICIOS', NULL);
INSERT INTO "public"."act_economicas" VALUES (9, 8, 7, NULL, 'PRODUCCIÓN DE MADERA Y FABRICACIÓN DE PRODUCTOS DE MADERA Y CORCHO, EXCEPTO MUEBLES, FABRICACIÓN DE ARTÍCULOS DE PAJA Y DE MATERIALES TRENSABLES', NULL);


ALTER TABLE "public"."act_economicas" ENABLE TRIGGER ALL;

--
-- Data for Name: anios; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."anios" DISABLE TRIGGER ALL;

INSERT INTO "public"."anios" VALUES (1, '2026', '“Año de la Esperanza y el Fortalecimiento de la Democracia”');
INSERT INTO "public"."anios" VALUES (2, '2021', NULL);
INSERT INTO "public"."anios" VALUES (3, '2022', NULL);
INSERT INTO "public"."anios" VALUES (4, '2023', NULL);
INSERT INTO "public"."anios" VALUES (5, '2024', NULL);
INSERT INTO "public"."anios" VALUES (6, '2025', NULL);


ALTER TABLE "public"."anios" ENABLE TRIGGER ALL;

--
-- Data for Name: tipo_carreras; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."tipo_carreras" DISABLE TRIGGER ALL;

INSERT INTO "public"."tipo_carreras" VALUES (1, 'Especialidad (nivel técnico)');
INSERT INTO "public"."tipo_carreras" VALUES (2, 'Módulo ocupacional');
INSERT INTO "public"."tipo_carreras" VALUES (3, 'Opción ocupacional (nivel auxiliar técnico)');
INSERT INTO "public"."tipo_carreras" VALUES (4, 'Programa de estudio (alineado al CNOF - Auxiliar Técnico / Técnico)');


ALTER TABLE "public"."tipo_carreras" ENABLE TRIGGER ALL;

--
-- Data for Name: carreras; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."carreras" DISABLE TRIGGER ALL;

INSERT INTO "public"."carreras" VALUES (13, 'Panadería y Pastelería', 'C0610-1-001', NULL, '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', 8, NULL, 4, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (6, 'Corte y Ensamblaje', 'CO714-1-003', NULL, '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', 5, NULL, 4, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (7, 'Costura y Acabados', 'CO714-1-004', NULL, '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', 5, NULL, 4, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (4, 'Soporte Técnico y Operaciones de Centros de Computo', 'J2662-1-001', NULL, '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', 4, NULL, 4, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (16, 'Servicios Básicos Gastronómicos', NULL, NULL, NULL, NULL, 8, NULL, 4, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (1, 'Peluquería y Barbería', 'S3496-1-001', NULL, '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', 1, NULL, 4, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (17, 'Hilandería', NULL, NULL, NULL, NULL, NULL, NULL, 3, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (18, 'Equipos Electrónicos de Consumo', NULL, NULL, NULL, NULL, NULL, NULL, 3, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (12, 'Manualidades', NULL, NULL, '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', 7, NULL, 3, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (15, 'Mantenimiento Básico de Casas y Edificios', NULL, NULL, '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', 9, NULL, 3, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (5, 'Operación de Computadoras', NULL, NULL, '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', 4, NULL, 3, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (9, 'Confección Textil', NULL, NULL, '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', 5, NULL, 3, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (20, 'Asistencia en Cocina', NULL, NULL, NULL, NULL, NULL, NULL, 3, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (21, 'Peluquería', NULL, NULL, NULL, NULL, NULL, NULL, 3, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (22, 'Asistencia de Pastelería y Panadería', NULL, NULL, NULL, NULL, NULL, NULL, 3, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (23, 'Cuero y Calzado', NULL, NULL, NULL, NULL, NULL, NULL, 3, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (8, 'Bordados Computarizados y Manuales', NULL, NULL, '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', 5, NULL, 3, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (11, 'Confección de Artículos de Cuero y Marroquinería', 'C0715-1-002', NULL, '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', 6, NULL, 4, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "public"."carreras" VALUES (10, 'Corte Aparado y Armado de Calzado', 'C0715-1-001', NULL, '2026-06-21 16:40:26.514+00', '2026-06-21 16:40:26.514+00', 6, NULL, 4, 'Auxiliar Técnico', NULL, NULL, NULL, NULL, NULL, NULL);


ALTER TABLE "public"."carreras" ENABLE TRIGGER ALL;

--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."roles" DISABLE TRIGGER ALL;

INSERT INTO "public"."roles" VALUES (1, 0, 'Visitante');
INSERT INTO "public"."roles" VALUES (2, 50, 'Ex-estudiante');
INSERT INTO "public"."roles" VALUES (3, 100, 'Estudiante');
INSERT INTO "public"."roles" VALUES (4, 200, 'Docente');
INSERT INTO "public"."roles" VALUES (5, 300, 'Administrativo');
INSERT INTO "public"."roles" VALUES (6, 400, 'Coordinador');
INSERT INTO "public"."roles" VALUES (7, 500, 'Director');
INSERT INTO "public"."roles" VALUES (8, 600, 'Superusuario');
INSERT INTO "public"."roles" VALUES (9, 150, 'Ex-docente');


ALTER TABLE "public"."roles" ENABLE TRIGGER ALL;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."users" DISABLE TRIGGER ALL;

INSERT INTO "public"."users" VALUES (1037, 'BERROCAL', 'EVANS', 'EVANS BERROCAL', 'https://lh3.google.com/ao/AHP4FtmwNhlha7QkmrJLXMST8oPbrNkp5xebWxI15U6kYpzE6MzzwXmSMx1nqj7_tRP6QUYRBA=s96-c', false, '997651614', true, NULL, NULL, NULL, 'y6KZOwiREW6rrJrNwd9Dq0i7dkkx', 'maribelevansberrocal@gmail.com', NULL, NULL, NULL, 'Consuelo Maribel', 'workspace-import', NULL, NULL, NULL, 'Consuelo Maribel EVANS BERROCAL', 4, 'workspace-import-script', '2021-02-28 23:38:46+00', '2026-06-26 06:53:27.783+00', 'cevansb@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (872, 'Quetos', 'Moligams', 'Moligams Quetos', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/usuarios%2F1780293556687_dama4.webp?alt=media&token=28450cb2-1373-4351-963c-79a4fb658d30', false, '985858789', true, 'La abutardas 125', 'Santa Beatriz', '87548968', 'hhUHljNj4ALYkrA825zBtrC6xVzC', 'rociomoligams@cetprosmp.edu.pe', 'Viudo(a)', '2000-02-02 00:00:00+00', 'Secundaria', 'Rocio', NULL, 'F', '7586258', 'DNI', 'Rocio Moligams', 6, 'enkee03@cetprosmp.edu.pe', '2026-06-01 05:15:12.695+00', '2026-06-26 07:18:55.866+00', 'Chio03@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (970, 'Horna', 'Palomino', 'Palomino Horna', NULL, false, '941689574', true, 'Jr. La hiedra 702', 'Los Olivos', '10698579', 'jiqXveE41LHux89eDraOFp9YCxOD', 'enkee03@gmail.com', 'Soltero', '1977-11-01 00:00:00+00', 'Secundaria', 'Enrique', 'matricula', 'M', NULL, 'DNI', 'Enrique Palomino Horna', NULL, 'workspace-import-script', '2020-07-08 16:30:06+00', '2026-07-02 02:27:45.773+00', 'epalominoh@cetprosmp.edu.pe', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos%2FDNI-10698579-frente-1782958881141-dni2-a.jpg?alt=media&token=266498d3-ee97-49d1-9b9d-d0480915da23', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos%2FDNI-10698579-reverso-1782958881220-dni2-b.jpg?alt=media&token=ba888e29-d450-46cb-8454-c573de67ebfb', 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1003, 'Rockefeller', 'Martínez', 'Martínez Rockefeller', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/usuarios%2F1780551242674_dama1.webp?alt=media&token=3b4386dd-3b57-48a4-ad2a-1c0e8674c40a', false, '965325897', NULL, NULL, NULL, '89325785', 'cjjSrfIcXZkifFmQkUiGmDKXnKkw', 'margarita12@cetprosmp.edu.pe', 'Soltero', NULL, 'Primaria', 'Margarita', NULL, 'M', NULL, 'DNI', 'Margarita Martínez', 4, 'margarita12@cetprosmp.edu.pe', '2026-06-04 05:33:00.741+00', '2026-06-04 06:01:40.655+00', 'margarita12@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (13, 'Horna', 'Palomino', 'Palomino Horna', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/usuarios%2F1780549698599_EPH.jpg?alt=media&token=e9bdf40a-d937-463c-be71-58bc767e3a1b', false, '941689574', true, 'Jr. La Hiedra 702 Urb. Las Palmeras', 'Los Olivos', '10698579', 'HggJCjXw6eCNW8uI00uKxuZlPTQT', 'enkee03@gmail.com', 'Soltero', '1977-11-01 00:00:00+00', 'Primaria', 'Enrique Rafael', NULL, 'M', NULL, 'DNI', 'Enrique Palomino', 8, 'enkee03@cetprosmp.edu.pe', '2026-06-04 04:19:32.456+00', '2026-06-04 04:19:32.456+00', 'enkee03@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (871, 'Moreno', 'Moligams', 'Moligams Moreno', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/usuarios%2F1780293574142_dama3.webp?alt=media&token=cd28cb9f-486a-4893-894e-543a51a6e9ef', false, '958545895', true, 'Las hiedras 125', 'Chorrillos', '87548968', '0tYkMkRHDlrSEgetyHhkCJ0r8vUe', 'rociomoligams@gmail.com', 'Casado(a)', '2000-02-02 00:00:00+00', 'Secundaria', 'Rocio', NULL, 'F', '7854589', 'DNI', 'Rocio Moligams', 3, 'enkee03@cetprosmp.edu.pe', '2026-06-01 05:10:31.548+00', '2026-06-26 07:57:27.896+00', '87548968@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1036, 'DIAS', 'RAMIREZ', 'RAMIREZ DIAS', 'https://lh3.googleusercontent.com/a-/ALV-UjWrYjfk509YZI8TKhxVCqFA1C46HWN2nrDYZa4KOO9qEui5In3r=s96-c', false, '934565680', true, NULL, NULL, NULL, 'hDHK5yumf0Ca0dKOWn8xrgFFpYrX', 'anamicaela000@gmail.com', NULL, NULL, NULL, 'Ana María', 'workspace-import', NULL, NULL, NULL, 'Ana María RAMIREZ DIAS', 4, 'workspace-import-script', '2021-02-28 23:38:46+00', '2026-06-26 06:53:27.769+00', 'aramirezd@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1038, 'Rodriguez', 'Postillon', 'Postillon Rodriguez', 'https://lh3.google.com/ao/AHP4Ftle98Ku205B5xchAJiqDWOycM4Sjzd9fkDmyC_9AkJ9K3dPKN8TmsoT_O4ndEJRs8tg2w=s96-c', false, '977104852', true, NULL, NULL, NULL, 'uDdsmOpffFwfJfWiyyyuzhpf32pw', 'celedoniapostillonrodriguez86@gmail.com', NULL, NULL, NULL, 'Celedonia', 'workspace-import', NULL, NULL, NULL, 'Celedonia Postillon Rodriguez', 4, 'workspace-import-script', '2020-05-29 02:24:10+00', '2026-06-26 06:53:27.794+00', 'cpostillonr@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1039, 'Bravo', 'Gonzalo', 'Gonzalo Bravo', 'https://lh3.google.com/ao/AHP4Ftld5op1VHRDtrHFGPSlv-hMdk8SVn8UD6cS95sg9lexYoQ_nTgQE0vRj9OcvmvuoIqQ90w=s96-c', false, '957328449', true, NULL, NULL, NULL, 'zc5ux0m4kH1t0wn58b4tjKWMjgLs', 'gonzalitobravo@hotmail.com', NULL, NULL, NULL, 'Dora', 'workspace-import', NULL, '957328449', NULL, 'Dora Gonzalo Bravo', 4, 'workspace-import-script', '2020-08-01 13:29:37+00', '2026-06-26 06:53:27.804+00', 'dgonzalob@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1040, 'Palomino', 'Jimenez', 'Jimenez Palomino', 'https://lh3.googleusercontent.com/a-/ALV-UjXdg5Gr3MEwf3fQUOq2qNfGPe4Djct4HQ3lZOosbP8lU0xNZEfp=s96-c', false, '983058776', true, NULL, NULL, NULL, 'C7WSXu6NTe6vKOCPaQP6NURd3Pot', 'dorisjipa24@gmail.com', NULL, NULL, NULL, 'Doris Epifania', 'workspace-import', NULL, NULL, NULL, 'Doris Epifania Jimenez Palomino', 4, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:27.813+00', 'djimenezp@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1041, 'Flores', 'Acuña', 'Acuña Flores', 'https://lh3.google.com/ao/AHP4Ftmp0io1PXdBvodqelo5ecS-FbI8HikJ_wVxjtYM23Vsqpogx_IdnSYddgVEzqA6jdnNDww=s96-c', false, '987082603', true, NULL, NULL, NULL, '743UqYgaivbpvX9f14AUHKHRuJLH', 'fannyflores1271@gmail.com', NULL, NULL, NULL, 'Fanny Celina', 'workspace-import', NULL, NULL, NULL, 'Fanny Celina Acuña Flores', 4, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:27.834+00', 'facunaf@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1044, 'Flores', 'Flores', 'Flores Flores', 'https://lh3.google.com/ao/AHP4Ftnejsq4-7fauG3k33aRaJmwIVbR_TeicjvOLJbXYbcI1FH_9fPw9c1bA4tHI3JRmnDVxA=s96-c', false, NULL, true, NULL, NULL, NULL, 'iKHHHGkG7y88o9uR1rREBkLZ4QTg', 'jfloresf@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'José María', 'workspace-import', NULL, '941689574', NULL, 'José María Flores Flores', 4, 'workspace-import-script', '2025-04-15 21:13:52+00', '2026-06-26 06:53:27.865+00', 'jfloresf@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1045, 'Limaymanta', 'Jesus', 'Jesus Limaymanta', 'https://lh3.google.com/ao/AHP4FtlVgzt5y_9Dl5Mi5IcQ6nLkFNLf45gkAggJfroygbhLAkEou3jE9-Pk6ZJ5NA8suGdjFg=s96-c', false, NULL, true, NULL, NULL, NULL, 'H8cpeZkMJWDu2Sfw21jWqknvhnnx', 'ljesusl@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Lila Giovanna', 'workspace-import', NULL, '987349478', NULL, 'Lila Giovanna Jesus Limaymanta', 4, 'workspace-import-script', '2026-03-12 16:40:21+00', '2026-06-26 06:53:27.874+00', 'ljesusl@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1046, 'Mercado', 'Millan', 'Millan Mercado', 'https://lh3.google.com/ao/AHP4Ftl-4qBqOaCDgOzomV7BkcB2E4WJoRXasPY9KPANiddJhS3qfofbK8IPcJjoHvsJHEgIPg=s96-c', false, NULL, true, NULL, NULL, NULL, 'jTxCmEjbpwbDL0Tmv5Il1UAYEPuL', 'lmillanm@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Liliana Rocio', 'workspace-import', NULL, '928792153', NULL, 'Liliana Rocio Millan Mercado', 4, 'workspace-import-script', '2025-03-04 14:34:30+00', '2026-06-26 06:53:27.886+00', 'lmillanm@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1047, 'Lizana', 'Aguilar', 'Aguilar Lizana', 'https://lh3.google.com/ao/AHP4FtnoFnsFjsCmDbDGweDrb1DAqy2srjf_yMyJsFihuJtnwdcuGFjIFOEUdVOcyngnJtK3enk=s96-c', false, NULL, true, NULL, NULL, NULL, 'SJ6UpoXzyHCfcbdP9L7ur0BIKyeY', 'maguilarl@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Milton', 'workspace-import', NULL, '942762536', NULL, 'Milton Aguilar Lizana', 4, 'workspace-import-script', '2026-03-12 16:08:57+00', '2026-06-26 06:53:27.896+00', 'maguilarl@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1048, 'Vega', 'Blas', 'Blas Vega', 'https://lh3.googleusercontent.com/a-/ALV-UjX65aLffUszG8mSB5GEbelIasWw_BkrtCmAGg_DkSKCLjdQlSs=s96-c', false, NULL, true, NULL, NULL, NULL, '5HniNwPhFShleQ1invywB72CAB4t', 'mblasv@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'María', 'workspace-import', NULL, '976813457', NULL, 'María Blas Vega', 4, 'workspace-import-script', '2025-03-04 14:49:21+00', '2026-06-26 06:53:27.906+00', 'mblasv@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1049, 'Cardenas', 'Ferreñan', 'Ferreñan Cardenas', 'https://lh3.google.com/ao/AHP4FtnKOWSxS63cucDe9ydSWL6CX4dXmgBYzy5TUiKXwjOvd2TyiCepT-Co3Qk1WrWTts6Tjg=s96-c', false, '937432948', true, NULL, NULL, NULL, 'cQamHfF7BnVVsKJQy2QklzYItzzc', 'mferrenanc@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Miriam Salome', 'workspace-import', NULL, '990402965', NULL, 'Miriam Salome Ferreñan Cardenas', 4, 'workspace-import-script', '2026-03-12 18:26:14+00', '2026-06-26 06:53:27.917+00', 'mferrenanc@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1050, 'Quispe', 'Lazo', 'Lazo Quispe', 'https://lh3.google.com/ao/AHP4Ftms_XLDyvF6CpiaXkG3d3grd5h9wLr6IFlLUaGLFNxcmSO5o2adeIxZ1E9dtoOj-sMTAog=s96-c', false, '994803839', true, NULL, NULL, NULL, 'wncYOZiJKf1HmoXfYYilJGrr0x0M', 'maryglorial03@gmail.com', NULL, NULL, NULL, 'Mary Gloria', 'workspace-import', NULL, NULL, NULL, 'Mary Gloria Lazo Quispe', 4, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:27.927+00', 'mlazoq@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1051, 'Yanac', 'Martinez', 'Martinez Yanac', 'https://lh3.google.com/ao/AHP4Ftn4__RPAX77sfr9Sr3gRVlMzAiA3m5W1jCn1lW7BmtrnERTwUSn373THxuNpzWbS9v0SMg=s96-c', false, '939791691', true, NULL, NULL, NULL, 'yH2pYEwFc9kifY22soGmQLdIOelL', 'atigram006@gmail.com', NULL, NULL, NULL, 'Margarita Edelmira', 'workspace-import', NULL, NULL, NULL, 'Margarita Edelmira Martinez Yanac', 4, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:27.937+00', 'mmartinezy@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1052, 'Gonzáles de Charca', 'Torres', 'Torres Gonzáles de Charca', 'https://lh3.googleusercontent.com/a-/ALV-UjXMZjiKhjGQmoKpEay5CF4CXv8yUdaxDVN46vEx1NgnJW7JFNM=s96-c', false, '994080666', true, NULL, NULL, NULL, 'z79yCTcQxRr4RForizLNfzmDudfL', 'mtg1509@gmail.com', NULL, NULL, NULL, 'Marcelina', 'workspace-import', NULL, NULL, NULL, 'Marcelina Torres Gonzáles de Charca', 4, 'workspace-import-script', '2021-04-20 00:19:33+00', '2026-06-26 06:53:27.946+00', 'mtorresg@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1053, 'CAYTUIRO', 'SOLGORRE', 'SOLGORRE CAYTUIRO', 'https://lh3.google.com/ao/AHP4Ftky1rfg91DGt7g_i2wMsjWDyOnPI5rE1QCoWEBjYZ6Myp7HYWhqOH9g4oV4bNXQe8vo8F0=s96-c', false, '945287596', true, 'Jr las bellotas 125', 'Los Olivos', '87236958', 'stIYrQkjRbakgegUeEXWNf0IN0g4', 'nievessolgorre@gmail.com', 'Casado(a)', '1976-08-25 00:00:00+00', 'Superior', 'Nieves Orfelinda', 'workspace-import', 'F', '7832586', 'DNI', 'Nieves Orfelinda SOLGORRE CAYTUIRO', 4, 'workspace-import-script', '2022-03-09 04:47:07+00', '2026-06-26 06:53:27.955+00', 'nsolgorrec@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1055, 'Ipanaque', 'Ramos', 'Ramos Ipanaque', 'https://lh3.google.com/ao/AHP4FtmEQ_B8APkzVwiSXvu6wS6-gElJ2uBv38nA1DL8J_pT3dvWqGI1Z8cwSvD08IYel0Cniw=s96-c', false, '930684024', true, NULL, NULL, NULL, '1NAoISe57EN4r48dQE2bfshW3MyH', 'rramosi@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Richard', 'workspace-import', NULL, '930684024', NULL, 'Richard Ramos Ipanaque', 4, 'workspace-import-script', '2024-03-09 05:22:24+00', '2026-06-26 06:53:27.979+00', 'rramosi@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1056, 'Manrique', 'Cordero', 'Cordero Manrique', 'https://lh3.google.com/ao/AHP4FtntQZZwIT1liZ9jTQjYYICsCN1kiCCUA--k0qNedTrHmSu7-lNt_X8ajxb_xIT7JxLUdHs=s96-c', false, '995228570', true, NULL, NULL, NULL, 'YSVCGzDbQtoGoAWrUAaM4Op4Horw', 'soniacordero61m@gmail.com', NULL, NULL, NULL, 'Sonia Priscila', 'workspace-import', NULL, NULL, NULL, 'Sonia Priscila Cordero Manrique', 4, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:27.988+00', 'scorderom@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1057, 'Ramírez', 'Meza', 'Meza Ramírez', 'https://lh3.google.com/ao/AHP4FtlLLBi7KWsWgMLetGX7KDyNdWozwvmUARahEN2ciH2XVbxnQ41JpT6H3r1ffz54QY9cyw=s96-c', false, NULL, true, NULL, NULL, NULL, '5ycI8mEdPPqV6RBySokMRhFE3axG', 'smezar@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Sandra Lourdes', 'workspace-import', NULL, '972223670', NULL, 'Sandra Lourdes Meza Ramírez', 4, 'workspace-import-script', '2025-03-04 14:41:39+00', '2026-06-26 06:53:27.997+00', 'smezar@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1058, 'AGUILAR', 'OSTOS', 'OSTOS AGUILAR', 'https://lh3.google.com/ao/AHP4FtkdazigH9CWuU6yNTyos75B038VKuj9eDjXpQ0MwGGPG3CCWLAjbZ2BGjRJjQud7M_wIA=s96-c', false, '975169340', true, NULL, NULL, NULL, 'bLScdqxphmk11P2M2kyuLaeJWNqs', 'sostosa@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Sara Elvira', 'workspace-import', NULL, '975169340', NULL, 'Sara Elvira OSTOS AGUILAR', 4, 'workspace-import-script', '2025-03-21 20:39:31+00', '2026-06-26 06:53:28.006+00', 'sostosa@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1059, 'Barrera', 'Zamalloa', 'Zamalloa Barrera', 'https://lh3.google.com/ao/AHP4FtkmIXRcCBQ8rjm7zaA1LBeaJxR1YtTxB26c0p_9E5R6KyW1ucIkjBoYWJZfxWvkD1r5FA=s96-c', false, NULL, true, NULL, NULL, NULL, 'lGZnuuIov2pwUy81Mj2Y8XkmP9st', 'vzamalloab@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Victor Hugo', 'workspace-import', NULL, '997946332', NULL, 'Victor Hugo Zamalloa Barrera', 4, 'workspace-import-script', '2025-03-04 14:45:31+00', '2026-06-26 06:53:28.016+00', 'vzamalloab@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1060, 'Zelaya', 'Guevara', 'Guevara Zelaya', 'https://lh3.googleusercontent.com/a-/ALV-UjUZU6IPWxW1O6qb_G33IGeJ16FzBqsnpLJhFcja2d4ufWYpWCEe=s96-c', false, '955982580', true, NULL, NULL, NULL, 'VDpk9BfzBtp2yhnddeSN1cbzZA2j', 'wguevarazelaya@gmail.com', NULL, NULL, NULL, 'Walter', 'workspace-import', NULL, NULL, NULL, 'Walter Guevara Zelaya', 4, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:28.026+00', 'wguevaraz@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1061, 'Olivas', 'Miraval', 'Miraval Olivas', 'https://lh3.googleusercontent.com/a-/ALV-UjXNC9VEftoamCkWO_Tdgb1LNjFB7ARe4yIdJCduE9j9M20P_yU=s96-c', false, '987947446', true, NULL, NULL, NULL, 'qbi8QK2MwZO4klTOaGtax2SN0ZmD', 'walter.miravalo@gmail.com', NULL, NULL, NULL, 'Walter Huber', 'workspace-import', NULL, NULL, NULL, 'Walter Huber Miraval Olivas', 4, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:28.035+00', 'wmiravalo@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1043, 'Flores', 'Moscol', 'Moscol Flores', 'https://lh3.google.com/ao/AHP4FtmUc7Gub3D4x7WB_e94_t3XUntZzAUTbsCfNafMD8XiSdw8AGxe_z3PsQRRBiw-vteZwg=s96-c', false, '935256709', true, NULL, NULL, NULL, '9tzsLL0pXvzQggJGPqznlWcqjvsr', 'rimf271966@gmail.com', NULL, NULL, NULL, 'Rosa Isabel', 'workspace-import', NULL, '935256709', NULL, 'Rosa Isabel Moscol Flores', 4, 'workspace-import-script', '2024-03-09 05:09:31+00', '2026-06-26 06:53:27.855+00', 'imoscolf@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1054, 'Ávila', 'Figueroa', 'Figueroa Ávila', 'https://lh3.google.com/ao/AHP4Ftn3tfQkhJ7kWrI_TYFI1FqAbLQKnmZvQqYwCSm0AoX-sL_VE9d5A-Xv5nApqB7WjQGQTRs=s96-c', false, '943221605', true, NULL, NULL, NULL, 'tExSwNMl6Muv0wEmVyHQR2FWYtaw', 'rfigueroaa@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Romelio', 'workspace-import', NULL, '943221605', NULL, 'Romelio Figueroa Ávila', 4, 'workspace-import-script', '2023-03-28 23:21:11+00', '2026-06-26 06:53:27.966+00', 'rfigueroaa@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1102, 'PULACHE', 'SALAZAR', 'SALAZAR PULACHE', NULL, false, '958456878', true, 'CALLE 5-181 ASENT.H VILLA EL ANGEL', 'INDEPENDENCIA', '41884433', 'AO42Fe2pS6PJW2xe20nJ31paF4gh', '41884433@cetprosmp.edu.pe', 'Soltero', '1983-04-10 00:00:00+00', 'Secundaria', 'DIANA LUCILA', 'password', 'F', NULL, 'DNI', 'DIANA LUCILA SALAZAR PULACHE', 3, 'enkee03@cetprosmp.edu.pe', '2026-07-02 17:30:06.552+00', '2026-07-02 17:59:05.688+00', '41884433@cetprosmp.edu.pe', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos%2FDNI-41884433-frente-1783013369995-DNI-COMPLETO.pdf?alt=media&token=941323f3-9446-46ea-9a28-de7e6e3035b2', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos%2FDNI-41884433-reverso-1783013370174-DNI-COMPLETO.pdf?alt=media&token=7c4bbe19-e5e1-4854-95ec-90acff3b1dd8', 'PERUANA', NULL, NULL, '2030-02-25 00:00:00+00');
INSERT INTO "public"."users" VALUES (1135, 'CELIS', 'GUERRERO', 'GUERRERO CELIS', NULL, false, '985625457', true, 'JR. SANTA MARIA 333 URB. PALAO ETAPA 2DA', 'SAN MARTIN DE PORRES', '61433593', 'PIRhGOWaV4WvSc7EK30IxwdNs8sU', '61433593@cetprosmp.edu.pe', 'Soltero', '2008-08-18 00:00:00+00', 'Secundaria', 'DIANA PATRICIA', 'password', 'F', NULL, 'DNI', 'DIANA PATRICIA GUERRERO CELIS', 3, 'enkee03@cetprosmp.edu.pe', '2026-07-02 18:27:17.793+00', '2026-07-02 18:27:17.793+00', '61433593@cetprosmp.edu.pe', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos%2FDNI-61433593-frente-1783016796435-diana-1-2--1-.jpeg?alt=media&token=e3efc1e5-2fca-454a-abc6-d73db3621c5e', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos%2FDNI-61433593-reverso-1783016796633-diana-1-2--1-.jpeg?alt=media&token=c376ae8f-f18e-4a44-9740-577563deb623', 'PERUANA', NULL, NULL, '2035-08-27 00:00:00+00');
INSERT INTO "public"."users" VALUES (1168, 'CHECASACA', 'MARTINEZ', 'MARTINEZ CHECASACA', NULL, false, '985465875', true, 'PIERRY CONSTANTINO CHEVALY 281 URB. CAYETANO HEREDIA', 'SAN MARTIN DE PORRES', '77512747', 'cu3cq9Wmxms8FBkAucvQVhl7H87Y', '77512747@cetprosmp.edu.pe', 'Soltero', '2011-12-29 00:00:00+00', 'Secundaria', 'SOL SARALY', 'password', 'F', NULL, 'DNI', 'SOL SARALY MARTINEZ CHECASACA', 3, 'enkee03@cetprosmp.edu.pe', '2026-07-02 19:23:29.89+00', '2026-07-02 19:23:29.89+00', '77512747@cetprosmp.edu.pe', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos%2FDNI-77512747-frente-1783020155017-SOL-2.jpeg?alt=media&token=ef44519c-d81d-407b-93e0-7230df850c0c', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos%2FDNI-77512747-reverso-1783020155172-SOL-1.jpeg?alt=media&token=d3fa4ba5-6a2b-4b6e-bd39-4729b85e06f3', 'PERUANA', NULL, NULL, '2028-12-29 00:00:00+00');
INSERT INTO "public"."users" VALUES (1042, 'Villanueva', 'Grijalba', 'Grijalba Villanueva', 'https://lh3.googleusercontent.com/a-/ALV-UjWhIOtLdebbiw4d-FKr0242BkygmOCS2NtTdLymuZdqDel-zmtn=s96-c', false, '935152912', true, NULL, NULL, NULL, '7z0E1foyJygx1bloNnkKcwAsVzoS', 'toshitogv74@gmail.com', NULL, NULL, NULL, 'Isaias John', 'workspace-import', NULL, NULL, NULL, 'Isaias John Grijalba Villanueva', 4, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:27.846+00', 'igrijalbav@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1062, 'Martin de Porres"', '"San', '"San Martin de Porres"', 'https://lh3.google.com/ao/AHP4FtkzhSsk9eIygSKtuFRxPRlabY7kPzxCr2MHNBb9TpUu0Pc970iGMpPIeq3sXA_WUnwdNA=s96-c', false, NULL, true, NULL, NULL, NULL, '2MjA7p8mRl24dYerMiw4OPYrJ5tC', 'elenacordovagalindo@gmail.com', NULL, NULL, NULL, 'CETPRO', 'workspace-import', NULL, NULL, NULL, 'CETPRO "San Martin de Porres"', 5, 'workspace-import-script', '2021-08-14 03:06:41+00', '2026-06-26 06:53:28.046+00', 'cetprosanmartindeporres@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1063, 'MATA', 'GIRALDO', 'GIRALDO MATA', NULL, false, NULL, true, NULL, NULL, NULL, 'j5P6xFdU3T61FPaG5mEBFHHn6CTs', 'ggiraldom@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Guissela Pilar', 'workspace-import', NULL, '960347851', NULL, 'Guissela Pilar GIRALDO MATA', 5, 'workspace-import-script', '2024-05-24 20:47:02+00', '2026-06-26 06:53:28.054+00', 'ggiraldom@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1064, 'CANCINO', 'MALCA', 'MALCA CANCINO', 'https://lh3.googleusercontent.com/a-/ALV-UjUcnNBYE6JNTFF_41OFRYexq1IZc-33p7ovR7PtEJ-HPMi8FDM3=s96-c', false, '959214849', true, NULL, NULL, NULL, 'ygIdsy0PH7yzqUrCedibdH0hMc76', 'yuli_m2000@hotmail.com', NULL, NULL, NULL, 'Guiliana', 'workspace-import', NULL, NULL, NULL, 'Guiliana MALCA CANCINO', 5, 'workspace-import-script', '2020-05-31 07:26:58+00', '2026-06-26 06:53:28.065+00', 'gmalcac@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1065, 'Madueño', 'Saavedra', 'Saavedra Madueño', 'https://lh3.googleusercontent.com/a-/ALV-UjUuaqC-8y_gb3GnlNcyHjmUNRmXGxFcQlVP74zsAq5tVeG670Se=s96-c', false, '929182186', true, NULL, NULL, NULL, 'cDmwcWXgBgJoK2ZLwXLph9PBwYtA', 'marialsm64@gmail.com', NULL, NULL, NULL, 'Maria Luz', 'workspace-import', NULL, NULL, NULL, 'Maria Luz Saavedra Madueño', 5, 'workspace-import-script', '2020-05-18 01:49:34+00', '2026-06-26 06:53:28.075+00', 'msaavedram@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1066, 'Vicuña', 'Llacsa', 'Llacsa Vicuña', 'https://lh3.google.com/ao/AHP4FtmS06MsCRHWcmqtkaRNtVnp2zehyuXHk5EPJZPSYeiu6XHNjJGK1EL2T2UaFwBDsn9CFw=s96-c', false, NULL, true, NULL, NULL, NULL, 'kayFBC5j4sSGfaPrmNM7oCMVa1uU', 'sllacsav@cetprosmp.edu.pe.test-google-a.com', NULL, NULL, NULL, 'Susana', 'workspace-import', NULL, '984160033', NULL, 'Susana Llacsa Vicuña', 5, 'workspace-import-script', '2026-01-02 16:59:30+00', '2026-06-26 06:53:28.085+00', 'sllacsav@cetprosmp.edu.pe', NULL, NULL, 'PERUANA', NULL, NULL, NULL);
INSERT INTO "public"."users" VALUES (1069, 'BRAVO', 'PIZARRO', 'PIZARRO BRAVO', NULL, false, '941689574', true, 'AV. RICARDO PALMA MZ. C LT. 4 STA. CECILIA', 'SAN MARTIN DE PORRES', '46539510', 'hnAgXgqQrleo9u6v41d0esJZ2yZq', '46539510@cetprosmp.edu.pe', 'Soltero', '1990-09-24 00:00:00+00', 'Secundaria', 'ANNES DEL PILAR', 'password', 'F', NULL, 'DNI', 'ANNES DEL PILAR PIZARRO BRAVO', 3, 'enkee03@cetprosmp.edu.pe', '2026-07-02 16:52:35.762+00', '2026-07-02 16:52:35.762+00', '46539510@cetprosmp.edu.pe', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos%2FDNI-46539510-frente-1783011069600-ANY-1-2.pdf?alt=media&token=cf1c6ad3-b8a7-456d-8b0c-655ac3a67c3c', 'http://127.0.0.1:9199/v0/b/cetprosmp-2026.firebasestorage.app/o/matriculas%2Fdocumentos%2FDNI-46539510-reverso-1783011069789-ANY-1-2.pdf?alt=media&token=dc759155-2b03-4d35-b7ef-e051d9b5ef0e', 'PERUANA', NULL, NULL, '2033-01-27 00:00:00+00');


ALTER TABLE "public"."users" ENABLE TRIGGER ALL;

--
-- Data for Name: personales; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."personales" DISABLE TRIGGER ALL;

INSERT INTO "public"."personales" VALUES (5, 1037, 'Consuelo Maribel EVANS BERROCAL', NULL);
INSERT INTO "public"."personales" VALUES (10, 1038, 'Celedonia Postillon Rodriguez', NULL);
INSERT INTO "public"."personales" VALUES (11, 1039, 'Dora Gonzalo Bravo', NULL);
INSERT INTO "public"."personales" VALUES (12, 1040, 'Doris Epifania Jimenez Palomino', NULL);
INSERT INTO "public"."personales" VALUES (13, 970, 'Enrique Palomino Horna', NULL);
INSERT INTO "public"."personales" VALUES (14, 1041, 'Fanny Celina Acuña Flores', NULL);
INSERT INTO "public"."personales" VALUES (15, 1044, 'José María Flores Flores', NULL);
INSERT INTO "public"."personales" VALUES (16, 1045, 'Lila Giovanna Jesus Limaymanta', NULL);
INSERT INTO "public"."personales" VALUES (17, 1046, 'Liliana Rocio Millan Mercado', NULL);
INSERT INTO "public"."personales" VALUES (18, 1048, 'María Blas Vega', NULL);
INSERT INTO "public"."personales" VALUES (19, 1047, 'Milton Aguilar Lizana', NULL);
INSERT INTO "public"."personales" VALUES (20, 1049, 'Miriam Salome Ferreñan Cardenas', NULL);
INSERT INTO "public"."personales" VALUES (21, 1050, 'Mary Gloria Lazo Quispe', NULL);
INSERT INTO "public"."personales" VALUES (22, 1053, 'Nieves Orfelinda SOLGORRE CAYTUIRO', NULL);
INSERT INTO "public"."personales" VALUES (23, 1051, 'Margarita Edelmira Martinez Yanac', NULL);
INSERT INTO "public"."personales" VALUES (24, 1055, 'Richard Ramos Ipanaque', NULL);
INSERT INTO "public"."personales" VALUES (25, 1052, 'Marcelina Torres Gonzáles de Charca', NULL);
INSERT INTO "public"."personales" VALUES (26, 1056, 'Sonia Priscila Cordero Manrique', NULL);
INSERT INTO "public"."personales" VALUES (27, 1059, 'Victor Hugo Zamalloa Barrera', NULL);
INSERT INTO "public"."personales" VALUES (28, 1058, 'Sara Elvira OSTOS AGUILAR', NULL);
INSERT INTO "public"."personales" VALUES (29, 1057, 'Sandra Lourdes Meza Ramírez', NULL);
INSERT INTO "public"."personales" VALUES (30, 1060, 'Walter Guevara Zelaya', NULL);
INSERT INTO "public"."personales" VALUES (31, 1061, 'Walter Huber Miraval Olivas', NULL);
INSERT INTO "public"."personales" VALUES (32, 1043, 'Rosa Isabel Moscol Flores', NULL);
INSERT INTO "public"."personales" VALUES (33, 1054, 'Romelio Figueroa Ávila', NULL);
INSERT INTO "public"."personales" VALUES (34, 1042, 'Isaias John Grijalba Villanueva', NULL);
INSERT INTO "public"."personales" VALUES (35, 1063, 'Guissela Pilar GIRALDO MATA', NULL);
INSERT INTO "public"."personales" VALUES (36, 1064, 'Guiliana MALCA CANCINO', NULL);
INSERT INTO "public"."personales" VALUES (37, 1065, 'Maria Luz Saavedra Madueño', NULL);
INSERT INTO "public"."personales" VALUES (38, 1066, 'Susana Llacsa Vicuña', NULL);
INSERT INTO "public"."personales" VALUES (9, 1036, 'Ana María RAMIREZ DIAS', NULL);


ALTER TABLE "public"."personales" ENABLE TRIGGER ALL;

--
-- Data for Name: semestres; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."semestres" DISABLE TRIGGER ALL;

INSERT INTO "public"."semestres" VALUES (2, NULL, NULL, NULL, true, NULL, '2025-2', 6, NULL, NULL);
INSERT INTO "public"."semestres" VALUES (40, NULL, NULL, NULL, false, NULL, '2022-1', 2, NULL, NULL);
INSERT INTO "public"."semestres" VALUES (41, NULL, NULL, NULL, false, NULL, '2022-2', 3, NULL, NULL);
INSERT INTO "public"."semestres" VALUES (38, NULL, NULL, NULL, false, NULL, '2023-1', 4, NULL, NULL);
INSERT INTO "public"."semestres" VALUES (39, NULL, NULL, NULL, false, NULL, '2023-2', 4, NULL, NULL);
INSERT INTO "public"."semestres" VALUES (36, NULL, NULL, NULL, false, NULL, '2024-1', 5, NULL, NULL);
INSERT INTO "public"."semestres" VALUES (37, NULL, NULL, NULL, false, NULL, '2024-2', 5, NULL, NULL);
INSERT INTO "public"."semestres" VALUES (1, NULL, NULL, NULL, false, NULL, '2025-1', 6, NULL, NULL);
INSERT INTO "public"."semestres" VALUES (4, NULL, NULL, NULL, false, NULL, '2026-2', 1, '2026-12-23 23:00:00+00', '2026-08-10 08:00:00+00');
INSERT INTO "public"."semestres" VALUES (3, NULL, NULL, NULL, false, NULL, '2026-1', 1, '2026-07-24 23:00:00+00', '2026-03-16 08:00:00+00');


ALTER TABLE "public"."semestres" ENABLE TRIGGER ALL;

--
-- Data for Name: planes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."planes" DISABLE TRIGGER ALL;

INSERT INTO "public"."planes" VALUES (4, 40, NULL, '1056', 'soporte-computadoras', 'Soporte técnico de computadoras', 4, NULL, 2025, 'UGEL', '01643', NULL, 'R.D.', 1, 'Plan 2025-1');
INSERT INTO "public"."planes" VALUES (3, NULL, NULL, '1000', 'hilanderia', 'Hilandería', 17, NULL, 2026, 'UGEL', '03602', NULL, 'R.D.', 3, 'Plan 2026-1');
INSERT INTO "public"."planes" VALUES (18, NULL, NULL, '1000', 'cuero-calzado', 'Cuero y Calzado', 23, NULL, 2023, 'UGEL', '04504', NULL, 'R.D.', 38, 'Plan 2023-1');
INSERT INTO "public"."planes" VALUES (17, NULL, NULL, '1000', 'asistencia-cocina', 'Asistencia en cocina', 20, NULL, 2024, 'UGEL', '00957', NULL, 'R.D.', 36, 'Plan 2024-1');
INSERT INTO "public"."planes" VALUES (5, NULL, NULL, '1000', 'operaciones-computadoras', 'Operación de Computadoras', 5, NULL, 2026, 'UGEL', '03602', NULL, 'R.D.', 3, 'Plan 2026-1');
INSERT INTO "public"."planes" VALUES (19, NULL, NULL, '1000', 'peluqueria', 'Peluquería', 21, NULL, 2022, 'UGEL', '02198', NULL, 'R.D.', 40, 'Plan 2022-1');
INSERT INTO "public"."planes" VALUES (2, NULL, NULL, '1000', 'equipos-electronicos-de-consumo', 'Equipos Electrónicos de Consumo', 18, NULL, 2026, 'UGEL', '03602', NULL, 'R.D.', 3, 'Plan 2026-1');
INSERT INTO "public"."planes" VALUES (15, NULL, NULL, '1000', 'mantenimiento-basico-de-casas-y-edificios', 'Mantenimiento Básico de Casas y Edificios', 15, NULL, 2026, 'UGEL', '03602', NULL, 'R.D.', 3, 'Plan 2026-1');
INSERT INTO "public"."planes" VALUES (8, 40, NULL, '1056', 'bordados-prendas', 'Bordado en prendas de vestir', 8, NULL, 2026, 'UGEL', '03601', NULL, 'R.D.', 3, 'Plan 2026-1');
INSERT INTO "public"."planes" VALUES (11, 40, NULL, '1056', 'cuero-marroquineria', 'Artículos de Cuero y Marroquinería', 11, NULL, 2025, 'UGEL', '01643', NULL, 'R.D.', 1, 'Plan 2025-1');
INSERT INTO "public"."planes" VALUES (6, 40, NULL, '1056', 'corte-ensamblaje', 'Corte y Ensamblaje', 6, NULL, 2025, 'UGEL', '01643', NULL, 'R.D.', 1, 'Plan 2025-1');
INSERT INTO "public"."planes" VALUES (10, 40, NULL, '1056', 'confeccion-calzado', 'Confección de calzado', 10, NULL, 2025, 'UGEL', '01643', NULL, 'R.D.', 1, 'Plan 2025-1');
INSERT INTO "public"."planes" VALUES (7, 40, NULL, '1056', 'costura-acabados', 'Costura y Acabados', 7, NULL, 2025, 'UGEL', '01643', NULL, 'R.D.', 1, 'Plan 2025-1');
INSERT INTO "public"."planes" VALUES (13, 40, NULL, '1056', 'panaderia-pasteleria', 'Panadería y Pastelería', 13, NULL, 2025, 'UGEL', '01643', NULL, 'R.D.', 1, 'Plan 2025-1');
INSERT INTO "public"."planes" VALUES (1, 40, NULL, '1056', 'peluqueria-barberia', 'Peluquería y Barberia', 1, NULL, 2025, 'UGEL', '01643', NULL, 'R.D.', 1, 'Plan 2025-1');
INSERT INTO "public"."planes" VALUES (16, 40, NULL, '1056', NULL, NULL, 16, NULL, 2026, 'UGEL', '03601', NULL, 'R.D.', 3, 'Plan 2026-1');
INSERT INTO "public"."planes" VALUES (9, NULL, NULL, '1000', 'confeccion-textil', 'Confección Textil', 9, NULL, 2023, 'UGEL', '04504', NULL, 'R.D.', 38, 'Plan 2023-1');
INSERT INTO "public"."planes" VALUES (12, NULL, NULL, '1000', 'manualidades', 'Manualidades', 12, NULL, 2026, 'UGEL', '03602', NULL, 'R.D.', 3, 'Plan 2026-1');
INSERT INTO "public"."planes" VALUES (14, NULL, NULL, '1000', 'asistente-panaderia-pasteleria', 'Asistencia de Pastelería y Panadería', 22, NULL, 2022, 'UGEL', '02198', NULL, 'R.D.', 40, 'Plan 2022-1');


ALTER TABLE "public"."planes" ENABLE TRIGGER ALL;

--
-- Data for Name: modulos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."modulos" DISABLE TRIGGER ALL;

INSERT INTO "public"."modulos" VALUES (14, true, 20, NULL, 528, 15, 1, 'bordado-computarizado', 'Bordados Computarizado', 'Bordados Computarizado', 8, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (17, true, 20, NULL, 528, 15, 1, 'disenio-corte-articulos-cuero', 'Diseño y Corte de Articulos de Cuero', 'Patronaje y Corte de Artículos de Cuero y Marroquinería', 11, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (18, true, 20, NULL, 528, 15, 2, 'ensamblado-acabado-articulos-cuero', 'Ensamblado y Acabado de Artículos de Cuero', 'Ensamblado y Acabado de Artículos de Cuero', 11, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (10, true, 21, NULL, 560, 15, 1, 'tizado-tendido-corte', 'Técnicas de Tizado, Tendido y Corte de Prendas de Vestir', 'Técnicas de Tizado, Tendido y Corte de Prendas de Vestir', 6, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (11, true, 19, NULL, 544, 15, 2, 'confeccion-prendas-vestir', 'Técnicas de Confección de Prendas de Vestir', 'Técnicas de Confección de Prendas de Vestir', 6, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (13, true, 19, NULL, 528, 15, 2, 'tecnicas-acabados-prendas-vestir', 'Técnicas de Procesos de Acabados en Prendas de Vestir', 'Técnicas de Procesos de Acabados en Prendas de Vestir', 7, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (1, true, 20, NULL, 528, 15, 1, 'corte-barba-peinado', 'Corte De Cabello, Barba y Peinado', 'Corte De Cabello, Barba y Peinado', 1, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (2, true, 20, NULL, 528, 15, 2, 'capilar-coloracion-ondulacion-laceado', 'Tratamiento Capilar, Coloración, Ondulación y Laceado', 'Tratamiento Capilar, Trituración, Ondulación, Laceado', 1, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (15, true, NULL, NULL, 300, 15, 1, 'tejido-maquina', 'Tejido a Maquina', 'Tejido a Maquina', 9, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (16, true, NULL, NULL, 300, 15, 2, 'tejido-mano', 'Tejido a Mano', 'Tejido a Mano', 9, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (5, true, 20, NULL, 528, 15, 1, 'incidentes-operatividad-computo', 'Atención de Incidentes y Problemas de Operatividad en El Centro de Cómputo', 'Atención De Incidentes y Problemas de Operatividad en El Centro de Cómputo', 4, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (6, true, 20, NULL, 528, 15, 2, 'monitoreo-mantenimiento-computo', 'Monitoreo y Acciones de Mantenimiento de Centros de Cómputo', 'Monitoreo y Acciones de Mantenimiento de Centros de Cómputo', 4, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (4, true, NULL, NULL, 300, 15, 2, 'intalaciones-electricas', 'Mantenimiento de Instalaciones Eléctricas Domiciliarias', 'Instalaciones Eléctricas', 3, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (7, true, NULL, NULL, 300, 15, 1, 'ofimatica', 'Ofimática', 'Ofimática', 5, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (8, true, NULL, NULL, 300, 15, 2, 'disenio-publicitario', 'Diseño Publicitario', 'Diseño Publicitario', 5, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (9, true, NULL, NULL, 300, 15, 3, 'disenio-web', 'Diseño Web', 'Diseño Web', 5, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (3, true, NULL, NULL, 300, 15, 1, 'reparacion-celulares', 'Mantenimiento de Teléfonos Celulares', 'Reparacion de Celulares', 2, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (19, true, 20, NULL, 528, 15, 1, 'disenio-corte-calzado', 'Diseño y Corte de Calzado', 'Patronaje y Corte de Calzado', 10, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (20, true, 20, NULL, 528, 15, 2, 'aparado-armado-acabado-calzado', 'Aparado, Armado y Acabado de Calzado', 'Aparado, Armado y Acabado de Calzado', 10, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (26, true, 20, NULL, 528, 15, 2, 'decoracion-presentacion-panaderia-pasteleria', 'Decoración y Presentación de los Productos de Panadería y Pastelería', 'Productos Pastelería y Panadería 2', 13, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (21, true, NULL, NULL, 300, 15, 1, 'decoracion-eventos-especiales', 'Decoración de Eventos Especiales', 'Decoración de Eventos Especiales', 12, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (22, true, NULL, NULL, 150, 15, 2, 'bisuteria', 'Bisuterías', 'Bisutería', 12, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (24, true, NULL, NULL, 150, 15, 4, 'ceramica-al-frio', 'Cerámica al Frio', 'Cerámica al Frio', 12, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (27, true, NULL, NULL, 300, 15, 1, 'decoracion-tortas', 'Técnicas de Decoración de Tortas', 'Técnicas de Decoración de Tortas', 14, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (28, true, NULL, NULL, 300, 15, 2, 'buffet', 'Buffet', 'Buffet', 14, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (29, true, NULL, NULL, 300, 15, 3, 'cocina-nacional', 'Cocina Nacional', 'Cocina Nacional', 14, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (30, true, NULL, NULL, 300, 15, 4, 'tecnicas-culinarias', 'Técnicas Culinarias', 'Técnicas Culinarias', 14, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (31, true, NULL, NULL, 300, 15, 1, 'carpinteria-madera', 'Mantenimiento de Carpintería', 'Carpintería en Madera', 15, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (32, true, NULL, NULL, 300, 15, 2, 'carpinteria-melamine', 'Confección de Muebles en Melamina', 'Carpintería en Melamina', 15, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (25, true, 20, NULL, 528, 15, 1, 'acondicionamiento-y-elaboracion-de-productos-de-panaderia-y-pasteleria', 'Acondicionamiento y Elaboración de Productos de Panadería y Pastelería', 'Productos Pastelería y Panadería 1', 13, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (33, true, 14, NULL, 336, 15, NULL, 'operaciones-basicas-de-cocina-y-manejo-de-insumos', 'Operaciones Básicas de Cocina y Manejo de Insumos', NULL, 16, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (34, true, 20, NULL, 528, 15, NULL, 'soporte-y-mantenimiento-de-sistemas-informaticos', 'Soporte y Mantenimiento de Sistemas Informáticos', NULL, 4, NULL, NULL);
INSERT INTO "public"."modulos" VALUES (23, true, NULL, NULL, 150, 15, 3, 'pintura-decorativa', 'Pintura Decorativa', 'Pintura Decorativa', 12, NULL, NULL);


ALTER TABLE "public"."modulos" ENABLE TRIGGER ALL;

--
-- Data for Name: unidades_didacticas; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."unidades_didacticas" DISABLE TRIGGER ALL;



ALTER TABLE "public"."unidades_didacticas" ENABLE TRIGGER ALL;

--
-- Data for Name: capacidades_terminales; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."capacidades_terminales" DISABLE TRIGGER ALL;



ALTER TABLE "public"."capacidades_terminales" ENABLE TRIGGER ALL;

--
-- Data for Name: indicadores_capacidad; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."indicadores_capacidad" DISABLE TRIGGER ALL;



ALTER TABLE "public"."indicadores_capacidad" ENABLE TRIGGER ALL;

--
-- Data for Name: aprendizajes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."aprendizajes" DISABLE TRIGGER ALL;



ALTER TABLE "public"."aprendizajes" ENABLE TRIGGER ALL;

--
-- Data for Name: ejes_transversales; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."ejes_transversales" DISABLE TRIGGER ALL;



ALTER TABLE "public"."ejes_transversales" ENABLE TRIGGER ALL;

--
-- Data for Name: valores_institucionales; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."valores_institucionales" DISABLE TRIGGER ALL;



ALTER TABLE "public"."valores_institucionales" ENABLE TRIGGER ALL;

--
-- Data for Name: actividades; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."actividades" DISABLE TRIGGER ALL;



ALTER TABLE "public"."actividades" ENABLE TRIGGER ALL;

--
-- Data for Name: horarios; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."horarios" DISABLE TRIGGER ALL;

INSERT INTO "public"."horarios" VALUES (6, true, 'Lunes y miercoles.', '1,3', '2026-06-29 05:19:04.547+00', '2026-06-29 05:19:04.547+00', 'Lun, Mie', 'LUN,MIE', NULL);
INSERT INTO "public"."horarios" VALUES (7, true, 'Martes y jueves.', '2,4', '2026-06-29 05:19:04.547+00', '2026-06-29 05:19:04.547+00', 'Mar, Jue', 'MAR,JUE', NULL);
INSERT INTO "public"."horarios" VALUES (1, true, 'Lunes, miercoles y viernes intercalado empezando por el primer viernes disponible.', '1,3,5', '2026-06-30 01:56:07.364+00', '2026-06-29 05:19:04.547+00', 'Lun, Mie, @Vie', 'LUN,MIE,VIE', NULL);
INSERT INTO "public"."horarios" VALUES (3, true, 'Martes, jueves y viernes intercalado empezando por el primer viernes disponible.', '2,4,5', '2026-06-30 01:56:14.694+00', '2026-06-29 05:19:04.547+00', 'Mar, Jue, @Vie', 'MAR,JUE,VIE', NULL);
INSERT INTO "public"."horarios" VALUES (5, true, 'De lunes a viernes.', '1,2,3,4,5', '2026-06-30 02:17:57.239+00', '2026-06-29 05:19:04.547+00', 'Lun - Vie', 'LUN,MAR,MIE,JUE,VIE', NULL);


ALTER TABLE "public"."horarios" ENABLE TRIGGER ALL;

--
-- Data for Name: calendarios; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."calendarios" DISABLE TRIGGER ALL;

INSERT INTO "public"."calendarios" VALUES (10, 'Calendario de 528 horas de lunes a viernes del primer semestre', '2026 Lun - Vie 528', true, '#1976d2', '2026-06-30 04:35:12.25+00', '2026-06-27 02:20:01.639+00', 1, 3, '2026-07-24 00:00:00+00', '2026-03-16 00:00:00+00', 5, 528, NULL, NULL, NULL, NULL);


ALTER TABLE "public"."calendarios" ENABLE TRIGGER ALL;

--
-- Data for Name: eventos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."eventos" DISABLE TRIGGER ALL;

INSERT INTO "public"."eventos" VALUES (1, 10, '#2e7d32', 'Desarrollo de Clases de los módulos con esa cantidad de horas.', 'confirmado', '2026-06-29 19:59:56.013+00', '2026-06-27 02:36:44.831+00', '2026-07-25 04:00:00+00', '2026-03-16 13:00:00+00', 'clase', '528 horas (S1)', true, 'Institución', 3);
INSERT INTO "public"."eventos" VALUES (34, 10, '#2e7d32', NULL, 'programado', '2026-06-29 20:06:58.259+00', '2026-06-29 20:04:31.211+00', '2026-12-19 04:00:00+00', '2026-08-10 13:00:00+00', 'clase', '528 horas (S2)', true, 'La institución', 4);
INSERT INTO "public"."eventos" VALUES (35, 10, '#d12323', NULL, 'programado', '2026-06-29 20:14:22.567+00', '2026-06-29 20:14:22.567+00', '2026-07-22 04:00:00+00', '2026-03-16 13:00:00+00', 'clase', '512 horas (S1)', true, 'La institucion', 3);
INSERT INTO "public"."eventos" VALUES (38, 10, '#2f347f', NULL, 'programado', '2026-06-29 22:41:41.917+00', '2026-06-29 22:41:41.917+00', '2026-08-01 04:00:00+00', '2026-05-22 13:00:00+00', 'clase', '300 horas lun - vie (S1-2)', true, 'institucion', 3);
INSERT INTO "public"."eventos" VALUES (37, 10, '#2f347f', NULL, 'programado', '2026-06-29 22:42:14.322+00', '2026-06-29 22:36:56.487+00', '2026-05-22 04:00:00+00', '2026-03-16 13:00:00+00', 'clase', '300 horas lun - vie (S1-1)', true, 'la institucion', 3);
INSERT INTO "public"."eventos" VALUES (36, 10, '#ff0000', NULL, 'programado', '2026-06-29 22:43:24.823+00', '2026-06-29 22:24:24.448+00', '2026-12-17 04:00:00+00', '2026-08-10 13:00:00+00', 'clase', '512 horas (S2)', true, 'la institucion', 4);
INSERT INTO "public"."eventos" VALUES (39, 10, '#2f347f', NULL, 'programado', '2026-06-29 22:51:52.434+00', '2026-06-29 22:51:52.434+00', '2026-10-16 04:00:00+00', '2026-08-10 13:00:00+00', 'clase', '300 horas lun - vie (S2-1)', true, 'la institucion', 4);
INSERT INTO "public"."eventos" VALUES (40, 10, '#2f347f', NULL, 'programado', '2026-06-29 22:55:31.417+00', '2026-06-29 22:55:31.417+00', '2026-12-24 04:00:00+00', '2026-10-16 13:00:00+00', 'clase', '300 horas lun - vie (S2-2)', true, 'La institucion', 4);


ALTER TABLE "public"."eventos" ENABLE TRIGGER ALL;

--
-- Data for Name: turnos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."turnos" DISABLE TRIGGER ALL;

INSERT INTO "public"."turnos" VALUES (2, 'activo', '2026-06-29 05:58:31.303+00', '2026-06-29 05:58:31.303+00', '1970-01-01 17:45:00+00', '1970-01-01 13:15:00+00', 'Tarde');
INSERT INTO "public"."turnos" VALUES (1, 'activo', '2026-06-29 05:59:14.175+00', '2026-06-29 05:56:05.093+00', '1970-01-01 13:00:00+00', '1970-01-01 08:30:00+00', 'Mañana');
INSERT INTO "public"."turnos" VALUES (3, 'activo', '2026-06-29 06:04:22.912+00', '2026-06-29 06:03:08.086+00', '1970-01-01 22:15:00+00', '1970-01-01 17:45:00+00', 'Noche');


ALTER TABLE "public"."turnos" ENABLE TRIGGER ALL;

--
-- Data for Name: evento_recurrencias; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."evento_recurrencias" DISABLE TRIGGER ALL;



ALTER TABLE "public"."evento_recurrencias" ENABLE TRIGGER ALL;

--
-- Data for Name: paquetes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."paquetes" DISABLE TRIGGER ALL;

INSERT INTO "public"."paquetes" VALUES (15, false, 'Paquete individual generado para el modulo Corte De Cabello, Barba y Peinado', 'Corte De Cabello, Barba y Peinado');
INSERT INTO "public"."paquetes" VALUES (16, false, 'Paquete individual generado para el modulo Tratamiento Capilar, Trituración, Ondulación, Laceado', 'Tratamiento Capilar, Trituración, Ondulación, Laceado');
INSERT INTO "public"."paquetes" VALUES (17, false, 'Paquete individual generado para el modulo Reparacion de Celulares', 'Reparacion de Celulares');
INSERT INTO "public"."paquetes" VALUES (18, false, 'Paquete individual generado para el modulo Instalaciones Eléctricas', 'Instalaciones Eléctricas');
INSERT INTO "public"."paquetes" VALUES (19, false, 'Paquete individual generado para el modulo Atención De Incidentes y Problemas de Operatividad en El Centro de Cómputo', 'Atención De Incidentes y Problemas de Operatividad en El Centro de Cómputo');
INSERT INTO "public"."paquetes" VALUES (20, false, 'Paquete individual generado para el modulo Monitoreo y Acciones de Mantenimiento de Centros de Cómputo', 'Monitoreo y Acciones de Mantenimiento de Centros de Cómputo');
INSERT INTO "public"."paquetes" VALUES (21, false, 'Paquete individual generado para el modulo Ofimática', 'Ofimática');
INSERT INTO "public"."paquetes" VALUES (22, false, 'Paquete individual generado para el modulo Diseño Publicitario', 'Diseño Publicitario');
INSERT INTO "public"."paquetes" VALUES (23, false, 'Paquete individual generado para el modulo Diseño Web', 'Diseño Web');
INSERT INTO "public"."paquetes" VALUES (24, false, 'Paquete individual generado para el modulo Técnicas de Tizado, Tendido y Corte de Prendas de Vestir', 'Técnicas de Tizado, Tendido y Corte de Prendas de Vestir');
INSERT INTO "public"."paquetes" VALUES (25, false, 'Paquete individual generado para el modulo Técnicas de Confección de Prendas de Vestir', 'Técnicas de Confección de Prendas de Vestir');
INSERT INTO "public"."paquetes" VALUES (26, false, 'Paquete individual generado para el modulo Técnicas de Procesos de Acabados en Prendas de Vestir', 'Técnicas de Procesos de Acabados en Prendas de Vestir');
INSERT INTO "public"."paquetes" VALUES (27, false, 'Paquete individual generado para el modulo Bordados Computarizado', 'Bordados Computarizado');
INSERT INTO "public"."paquetes" VALUES (28, false, 'Paquete individual generado para el modulo Tejido a Maquina', 'Tejido a Maquina');
INSERT INTO "public"."paquetes" VALUES (29, false, 'Paquete individual generado para el modulo Tejido a Mano', 'Tejido a Mano');
INSERT INTO "public"."paquetes" VALUES (30, false, 'Paquete individual generado para el modulo Patronaje y Corte de Artículos de Cuero y Marroquinería', 'Patronaje y Corte de Artículos de Cuero y Marroquinería');
INSERT INTO "public"."paquetes" VALUES (31, false, 'Paquete individual generado para el modulo Ensamblado y Acabado de Artículos de Cuero', 'Ensamblado y Acabado de Artículos de Cuero');
INSERT INTO "public"."paquetes" VALUES (32, false, 'Paquete individual generado para el modulo Patronaje y Corte de Calzado', 'Patronaje y Corte de Calzado');
INSERT INTO "public"."paquetes" VALUES (33, false, 'Paquete individual generado para el modulo Aparado, Armado y Acabado de Calzado', 'Aparado, Armado y Acabado de Calzado');
INSERT INTO "public"."paquetes" VALUES (34, false, 'Paquete individual generado para el modulo Decoración de Eventos Especiales', 'Decoración de Eventos Especiales');
INSERT INTO "public"."paquetes" VALUES (35, false, 'Paquete individual generado para el modulo Bisutería', 'Bisutería');
INSERT INTO "public"."paquetes" VALUES (37, false, 'Paquete individual generado para el modulo Cerámica al Frio', 'Cerámica al Frio');
INSERT INTO "public"."paquetes" VALUES (38, false, 'Paquete individual generado para el modulo Productos Pastelería y Panadería 1', 'Productos Pastelería y Panadería 1');
INSERT INTO "public"."paquetes" VALUES (39, false, 'Paquete individual generado para el modulo Productos Pastelería y Panadería 2', 'Productos Pastelería y Panadería 2');
INSERT INTO "public"."paquetes" VALUES (40, false, 'Paquete individual generado para el modulo Técnicas de Decoración de Tortas', 'Técnicas de Decoración de Tortas');
INSERT INTO "public"."paquetes" VALUES (41, false, 'Paquete individual generado para el modulo Buffet', 'Buffet');
INSERT INTO "public"."paquetes" VALUES (42, false, 'Paquete individual generado para el modulo Cocina Nacional', 'Cocina Nacional');
INSERT INTO "public"."paquetes" VALUES (43, false, 'Paquete individual generado para el modulo Técnicas Culinarias', 'Técnicas Culinarias');
INSERT INTO "public"."paquetes" VALUES (44, false, 'Paquete individual generado para el modulo Carpintería en Madera', 'Carpintería en Madera');
INSERT INTO "public"."paquetes" VALUES (45, false, 'Paquete individual generado para el modulo Carpintería en Melamina', 'Carpintería en Melamina');
INSERT INTO "public"."paquetes" VALUES (46, false, 'Paquete individual generado para el modulo Operaciones Básicas de Cocina y Manejo de Insumos', 'Operaciones Básicas de Cocina y Manejo de Insumos');
INSERT INTO "public"."paquetes" VALUES (47, false, 'Paquete individual generado para el modulo Soporte y Mantenimiento de Sistemas Informáticos', 'Soporte y Mantenimiento de Sistemas Informáticos');
INSERT INTO "public"."paquetes" VALUES (36, false, 'Paquete individual generado para el modulo Pintura Decorativa', 'Pintura Decorativa');
INSERT INTO "public"."paquetes" VALUES (81, false, NULL, 'Pintura Decorativa / Cerámica al Frio');
INSERT INTO "public"."paquetes" VALUES (114, false, NULL, 'Bisutería / Pintura Decorativa');


ALTER TABLE "public"."paquetes" ENABLE TRIGGER ALL;

--
-- Data for Name: grupos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."grupos" DISABLE TRIGGER ALL;

INSERT INTO "public"."grupos" VALUES (89, 5, false, NULL, '26-1 Corte De Cabello, Barba y Peinado [Mañana] Lun - Vie (Maribel Evans)', 'Mañana', 15, NULL, 3, 1, 'activo', '2026-07-01 06:44:03.094+00', '2026-06-30 05:18:16.611+00', 5, NULL, NULL);


ALTER TABLE "public"."grupos" ENABLE TRIGGER ALL;

--
-- Data for Name: evento_ocurrencias; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."evento_ocurrencias" DISABLE TRIGGER ALL;



ALTER TABLE "public"."evento_ocurrencias" ENABLE TRIGGER ALL;

--
-- Data for Name: matriculas; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."matriculas" DISABLE TRIGGER ALL;

INSERT INTO "public"."matriculas" VALUES (3, false, '2026-07-02 02:27:45.804+00', '56214', 15, 970, 3);
INSERT INTO "public"."matriculas" VALUES (36, false, '2026-07-02 16:52:41.816+00', '12545', 15, 1069, 3);
INSERT INTO "public"."matriculas" VALUES (69, false, '2026-07-02 17:30:12.203+00', '12586', 15, 1102, 3);
INSERT INTO "public"."matriculas" VALUES (102, false, '2026-07-02 18:27:24.557+00', '52658', 15, 1135, 3);
INSERT INTO "public"."matriculas" VALUES (135, false, '2026-07-02 19:23:38.012+00', '23256', 15, 1168, 3);


ALTER TABLE "public"."matriculas" ENABLE TRIGGER ALL;

--
-- Data for Name: asistencias; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."asistencias" DISABLE TRIGGER ALL;



ALTER TABLE "public"."asistencias" ENABLE TRIGGER ALL;

--
-- Data for Name: metodos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."metodos" DISABLE TRIGGER ALL;



ALTER TABLE "public"."metodos" ENABLE TRIGGER ALL;

--
-- Data for Name: tecnicas; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."tecnicas" DISABLE TRIGGER ALL;



ALTER TABLE "public"."tecnicas" ENABLE TRIGGER ALL;

--
-- Data for Name: evaluaciones; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."evaluaciones" DISABLE TRIGGER ALL;



ALTER TABLE "public"."evaluaciones" ENABLE TRIGGER ALL;

--
-- Data for Name: aspectos_evaluacion; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."aspectos_evaluacion" DISABLE TRIGGER ALL;



ALTER TABLE "public"."aspectos_evaluacion" ENABLE TRIGGER ALL;

--
-- Data for Name: evaluaciones_estudiantes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."evaluaciones_estudiantes" DISABLE TRIGGER ALL;



ALTER TABLE "public"."evaluaciones_estudiantes" ENABLE TRIGGER ALL;

--
-- Data for Name: aspectos_evaluacion_estudiantes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."aspectos_evaluacion_estudiantes" DISABLE TRIGGER ALL;



ALTER TABLE "public"."aspectos_evaluacion_estudiantes" ENABLE TRIGGER ALL;

--
-- Data for Name: capacidades_terminales_estudiantes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."capacidades_terminales_estudiantes" DISABLE TRIGGER ALL;



ALTER TABLE "public"."capacidades_terminales_estudiantes" ENABLE TRIGGER ALL;

--
-- Data for Name: dato_general; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."dato_general" DISABLE TRIGGER ALL;

INSERT INTO "public"."dato_general" VALUES (1, 'cetprosanmartindeporres@cetprosmp.edu.pe', 'Jirón Santa Clorinda 971 Urb. Palao SMP', 'https://www.facebook.com/cetprosanmartindeporres1/', 'https://www.instagram.com/cetpro.smp/', 'CETPRO "San Martin de Porres"', 'cetprosmp.edu.pe', 'R.D. N° 1839 - 05 - DRELM', '20610635939', '5341588', '5346663', 'https://www.tiktok.com/@cetpro.sanmartindeporres', 'https://x.com/enkee032', 'https://www.youtube.com/@enriquerafaelpalominohorna3697');


ALTER TABLE "public"."dato_general" ENABLE TRIGGER ALL;

--
-- Data for Name: especialidades; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."especialidades" DISABLE TRIGGER ALL;

INSERT INTO "public"."especialidades" VALUES (1, 1, NULL, '[{"type": "paragraph", "children": [{"text": "Solanum tuberosum, de nombre común patata (en la mayor parte de España, Filipinas y Guinea Ecuatorial) o papa (en Hispanoamérica y en las Islas Canarias)[1]​ [2]​", "type": "text"}]}]', 'estetica-personal', 'Estética Personal', 'Estética Personal', NULL);
INSERT INTO "public"."especialidades" VALUES (2, 2, NULL, NULL, 'electricidad-electronica', 'Electricidad y Electrónica', 'Electricidad y Electrónica', NULL);
INSERT INTO "public"."especialidades" VALUES (4, 5, NULL, NULL, 'confeccion-textil', 'Textil y Confección', 'Confección Textil', NULL);
INSERT INTO "public"."especialidades" VALUES (5, 6, NULL, NULL, 'cuero-calzado', 'Cuero y Calzado', 'Cuero y Calzado', NULL);
INSERT INTO "public"."especialidades" VALUES (6, 7, NULL, NULL, 'manualidades', 'Artesanía y Manualidades', 'Manualidades', NULL);
INSERT INTO "public"."especialidades" VALUES (7, 8, NULL, NULL, 'hosteleria-turismo', 'Hostelería y Turismo', 'Hostelería y Turismo', NULL);
INSERT INTO "public"."especialidades" VALUES (8, 9, NULL, NULL, 'carpinteria', 'Carpintería', 'Carpintería', NULL);
INSERT INTO "public"."especialidades" VALUES (3, 4, '<p data-start="273" data-end="636">La especialidad de Computación del CETPRO San Martín de Porres ofrece una formación técnica integral orientada a las exigencias del mercado laboral actual. Nuestro objetivo es preparar a los estudiantes para desempeñarse con eficiencia en diversas áreas de la tecnología, brindándoles una base sólida tanto en conocimientos teóricos como en habilidades prácticas.</p><p data-start="638" data-end="1115">A lo largo de la formación, los estudiantes desarrollan competencias en cuatro módulos especializados. En el módulo de <strong data-start="757" data-end="782">Soporte Técnico de PC</strong>, aprenden a ensamblar computadoras, instalar y configurar sistemas operativos, dar mantenimiento preventivo y correctivo, y solucionar fallas comunes de hardware y software. Además, se introducen en el manejo básico de redes y en buenas prácticas de seguridad informática, habilidades muy valoradas en empresas y servicios técnicos.</p><p data-start="1117" data-end="1488">En el módulo de <strong data-start="1133" data-end="1174">Aplicativos Informáticos de Ofimática</strong>, se entrenan en el uso profesional de herramientas como Microsoft Word, Excel, PowerPoint y otras plataformas colaborativas. Se enfatiza la creación de documentos formales, hojas de cálculo con funciones automatizadas, presentaciones efectivas y el manejo de datos, esenciales en cualquier entorno administrativo.</p><p data-start="1490" data-end="1828">El módulo de <strong data-start="1503" data-end="1534">Diseño Gráfico Publicitario</strong> desarrolla la creatividad del estudiante mediante el uso de programas como Photoshop y Corel Draw. Se enseña a crear piezas gráficas para medios impresos y digitales, como logotipos, afiches, banners y contenido visual para redes sociales, aplicando principios de diseño, color y composición.</p><p data-start="1830" data-end="2157">Finalmente, el módulo de <strong data-start="1855" data-end="1884">Diseño y Programación Web</strong> introduce al estudiante en el mundo del desarrollo web. Se aprenden lenguajes como HTML, CSS y JavaScript, así como el uso de gestores de contenido, permitiendo crear sitios web modernos, responsivos y funcionales, adaptados a las necesidades actuales del entorno digital.</p>', '[{"type": "paragraph", "children": [{"text": "La especialidad de Computación del CETPRO San Martín de Porres ofrece una formación técnica integral orientada a las exigencias del mercado laboral actual. Nuestro objetivo es preparar a los estudiantes para desempeñarse con eficiencia en diversas áreas de la tecnología, brindándoles una base sólida tanto en conocimientos teóricos como en habilidades prácticas.", "type": "text"}]}, {"type": "list", "format": "ordered", "children": [{"type": "list-item", "children": [{"text": "A lo largo de la formación, los estudiantes desarrollan competencias en cuatro módulos especializados. ", "type": "text"}, {"bold": true, "text": "En el módulo de Soporte Técnico de PC", "type": "text"}, {"text": ", aprenden a ensamblar computadoras, instalar y configurar sistemas operativos, dar mantenimiento preventivo y correctivo, y solucionar fallas comunes de hardware y software. Además, se introducen en el manejo básico de redes y en buenas prácticas de seguridad informática, habilidades muy valoradas en empresas y servicios técnicos.", "type": "text"}]}]}, {"type": "list", "format": "unordered", "children": [{"type": "list-item", "children": [{"text": "En el ", "type": "text"}, {"bold": true, "text": "módulo de Aplicativos Informáticos de Ofimática", "type": "text"}, {"text": ", se entrenan en el uso profesional de herramientas como Microsoft Word, Excel, PowerPoint y otras plataformas colaborativas. Se enfatiza la creación de documentos formales, hojas de cálculo con funciones automatizadas, presentaciones efectivas y el manejo de datos, esenciales en cualquier entorno administrativo.", "type": "text"}]}]}, {"type": "paragraph", "children": [{"text": "El ", "type": "text"}, {"bold": true, "text": "módulo de Diseño Gráfico Publicitario", "type": "text"}, {"text": " desarrolla la creatividad del estudiante mediante el uso de programas como Photoshop e Illustrator. Se enseña a crear piezas gráficas para medios impresos y digitales, como logotipos, afiches, banners y contenido visual para redes sociales, aplicando principios de diseño, color y composición.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Finalmente, el ", "type": "text"}, {"bold": true, "text": "módulo de Diseño y Programación Web", "type": "text"}, {"text": " introduce al estudiante en el mundo del desarrollo web. Se aprenden lenguajes como HTML, CSS y JavaScript, así como el uso de gestores de contenido, permitiendo crear sitios web modernos, responsivos y funcionales, adaptados a las necesidades actuales del entorno digital.", "type": "text"}]}]', 'computacion', 'Computación e Informática', 'Computación', NULL);


ALTER TABLE "public"."especialidades" ENABLE TRIGGER ALL;

--
-- Data for Name: evento_relaciones; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."evento_relaciones" DISABLE TRIGGER ALL;



ALTER TABLE "public"."evento_relaciones" ENABLE TRIGGER ALL;

--
-- Data for Name: fases; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."fases" DISABLE TRIGGER ALL;



ALTER TABLE "public"."fases" ENABLE TRIGGER ALL;

--
-- Data for Name: fases_metodos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."fases_metodos" DISABLE TRIGGER ALL;



ALTER TABLE "public"."fases_metodos" ENABLE TRIGGER ALL;

--
-- Data for Name: recursos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."recursos" DISABLE TRIGGER ALL;



ALTER TABLE "public"."recursos" ENABLE TRIGGER ALL;

--
-- Data for Name: fases_recursos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."fases_recursos" DISABLE TRIGGER ALL;



ALTER TABLE "public"."fases_recursos" ENABLE TRIGGER ALL;

--
-- Data for Name: fases_tecnicas; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."fases_tecnicas" DISABLE TRIGGER ALL;



ALTER TABLE "public"."fases_tecnicas" ENABLE TRIGGER ALL;

--
-- Data for Name: grupo_modulos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."grupo_modulos" DISABLE TRIGGER ALL;

INSERT INTO "public"."grupo_modulos" VALUES (69, 89, 1, true, 1, 10);


ALTER TABLE "public"."grupo_modulos" ENABLE TRIGGER ALL;

--
-- Data for Name: indicadores_capacidad_estudiantes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."indicadores_capacidad_estudiantes" DISABLE TRIGGER ALL;



ALTER TABLE "public"."indicadores_capacidad_estudiantes" ENABLE TRIGGER ALL;

--
-- Data for Name: matricula_grupos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."matricula_grupos" DISABLE TRIGGER ALL;



ALTER TABLE "public"."matricula_grupos" ENABLE TRIGGER ALL;

--
-- Data for Name: matricula_paquetes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."matricula_paquetes" DISABLE TRIGGER ALL;



ALTER TABLE "public"."matricula_paquetes" ENABLE TRIGGER ALL;

--
-- Data for Name: matricula_users; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."matricula_users" DISABLE TRIGGER ALL;



ALTER TABLE "public"."matricula_users" ENABLE TRIGGER ALL;

--
-- Data for Name: videos_youtube; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."videos_youtube" DISABLE TRIGGER ALL;

INSERT INTO "public"."videos_youtube" VALUES (1, 'https://www.youtube.com/watch?v=_6oKX-ZCP_8');
INSERT INTO "public"."videos_youtube" VALUES (2, 'https://www.youtube.com/watch?v=IyKoAaLrTzw');


ALTER TABLE "public"."videos_youtube" ENABLE TRIGGER ALL;

--
-- Data for Name: modulo_videos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."modulo_videos" DISABLE TRIGGER ALL;



ALTER TABLE "public"."modulo_videos" ENABLE TRIGGER ALL;

--
-- Data for Name: modulos_estudiantes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."modulos_estudiantes" DISABLE TRIGGER ALL;

INSERT INTO "public"."modulos_estudiantes" VALUES (1, 3, 1, NULL, 89);
INSERT INTO "public"."modulos_estudiantes" VALUES (34, 36, 1, NULL, 89);
INSERT INTO "public"."modulos_estudiantes" VALUES (68, 69, 1, NULL, 89);
INSERT INTO "public"."modulos_estudiantes" VALUES (100, 102, 1, NULL, 89);
INSERT INTO "public"."modulos_estudiantes" VALUES (133, 135, 1, NULL, 89);


ALTER TABLE "public"."modulos_estudiantes" ENABLE TRIGGER ALL;

--
-- Data for Name: paquete_grupos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."paquete_grupos" DISABLE TRIGGER ALL;



ALTER TABLE "public"."paquete_grupos" ENABLE TRIGGER ALL;

--
-- Data for Name: paquete_modulos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."paquete_modulos" DISABLE TRIGGER ALL;

INSERT INTO "public"."paquete_modulos" VALUES (1, 1, 15, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (2, 2, 16, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (3, 3, 17, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (4, 4, 18, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (5, 5, 19, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (6, 6, 20, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (7, 7, 21, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (8, 8, 22, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (9, 9, 23, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (10, 10, 24, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (11, 11, 25, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (12, 13, 26, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (13, 14, 27, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (14, 15, 28, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (15, 16, 29, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (16, 17, 30, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (17, 18, 31, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (18, 19, 32, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (19, 20, 33, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (20, 21, 34, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (21, 22, 35, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (22, 23, 36, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (23, 24, 37, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (24, 25, 38, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (25, 26, 39, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (26, 27, 40, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (27, 28, 41, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (28, 29, 42, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (29, 30, 43, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (30, 31, 44, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (31, 32, 45, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (32, 33, 46, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (33, 34, 47, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (100, 23, 81, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (101, 24, 81, true, 2);
INSERT INTO "public"."paquete_modulos" VALUES (102, 22, 114, true, 1);
INSERT INTO "public"."paquete_modulos" VALUES (103, 23, 114, true, 2);


ALTER TABLE "public"."paquete_modulos" ENABLE TRIGGER ALL;

--
-- Data for Name: personal_especialidades; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."personal_especialidades" DISABLE TRIGGER ALL;

INSERT INTO "public"."personal_especialidades" VALUES (9, 3, 15, 1);
INSERT INTO "public"."personal_especialidades" VALUES (9, 6, 16, 2);


ALTER TABLE "public"."personal_especialidades" ENABLE TRIGGER ALL;

--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."posts" DISABLE TRIGGER ALL;



ALTER TABLE "public"."posts" ENABLE TRIGGER ALL;

--
-- Data for Name: publicaciones; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."publicaciones" DISABLE TRIGGER ALL;

INSERT INTO "public"."publicaciones" VALUES (3, NULL, NULL, NULL, true, NULL, NULL, '2025-07-21 00:00:00+00', 'novenario-virgen-carmen-2025', 'noticia', 'Novenario a la Virgen del Carmen', NULL);
INSERT INTO "public"."publicaciones" VALUES (4, NULL, NULL, NULL, true, NULL, NULL, '2025-07-21 00:00:00+00', 'novenario-virgen-carmen-2025', 'noticia', 'Novenario a la Virgen del Carmen', NULL);
INSERT INTO "public"."publicaciones" VALUES (1, NULL, NULL, 'Matricula Abierta para este segundo periodo académico 2025-2 de Agosto a fines de Diciembre, separa con tiempo tu matricula, las vacantes son limitadas...', true, '2025-09-10 00:00:00+00', '2025-07-21 00:00:00+00', '2025-07-21 00:00:00+00', 'matricula-2025-', 'comunicado', 'Matricula 2025-2 (Agosto - Diciembre)', 'CETPRO "SAN MARTIN DE PORRES"');
INSERT INTO "public"."publicaciones" VALUES (15, NULL, '<h1>Contenido 2</h1>', NULL, true, NULL, NULL, '2025-08-10 00:00:00+00', 'publicacion', 'evento', 'Gran Inicio de Clasess Periodo Academico  2025-2', NULL);
INSERT INTO "public"."publicaciones" VALUES (14, NULL, NULL, 'Matricula Abierta para este segundo periodo académico 2025-2 de Agosto a fines de Diciembre, separa con tiempo tu matricula, las vacantes son limitadas...', true, '2025-09-10 00:00:00+00', '2025-07-21 00:00:00+00', '2025-07-21 00:00:00+00', 'matricula-2025-', 'comunicado', 'Matricula 2025-2 (Agosto - Diciembre)', 'CETPRO "SAN MARTIN DE PORRES"');
INSERT INTO "public"."publicaciones" VALUES (9, NULL, NULL, NULL, true, NULL, NULL, '2025-07-30 00:00:00+00', 'personal-servicio', 'comunicado', 'Se busca personal de servicio', NULL);
INSERT INTO "public"."publicaciones" VALUES (17, NULL, NULL, NULL, true, NULL, NULL, '2025-07-30 00:00:00+00', 'personal-servicio', 'comunicado', 'Se busca personal de servicio', NULL);
INSERT INTO "public"."publicaciones" VALUES (21, '[{"type": "paragraph", "children": [{"text": "Queridos estudiantes, padres de familia y comunidad educativa:", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Es para mí un honor darles la más cordial bienvenida al CETPRO San Martín de Porres, institución dedicada a la formación de técnicos emprendedores que buscan superarse y aportar al desarrollo de nuestra sociedad.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Nuestro compromiso es brindarles una educación de calidad, práctica y actualizada, que les permita adquirir competencias profesionales y valores que fortalezcan su desarrollo personal y laboral. Aquí encontrarán docentes comprometidos, un ambiente de respeto y oportunidades para crecer en lo académico y humano.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Los invito a asumir con entusiasmo este nuevo camino de aprendizaje, confiando en que cada esfuerzo los acercará a sus metas. Cuenten siempre con nuestro acompañamiento y apoyo.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "¡Bienvenidos al CETPRO San Martín de Porres!", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Atentamente,", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Mg. Maria Elena Cordova Galindo", "type": "text"}]}]', NULL, NULL, false, NULL, NULL, '2025-08-16 00:00:00+00', 'presentacion', 'noticia', 'Bienvenidos al CETPRO "San Martin de Porres"', NULL);
INSERT INTO "public"."publicaciones" VALUES (20, '[{"type": "paragraph", "children": [{"text": "Queridos estudiantes, padres de familia y comunidad educativa:", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Es para mí un honor darles la más cordial bienvenida al CETPRO San Martín de Porres, institución dedicada a la formación de técnicos emprendedores que buscan superarse y aportar al desarrollo de nuestra sociedad.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Nuestro compromiso es brindarles una educación de calidad, práctica y actualizada, que les permita adquirir competencias profesionales y valores que fortalezcan su desarrollo personal y laboral. Aquí encontrarán docentes comprometidos, un ambiente de respeto y oportunidades para crecer en lo académico y humano.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Los invito a asumir con entusiasmo este nuevo camino de aprendizaje, confiando en que cada esfuerzo los acercará a sus metas. Cuenten siempre con nuestro acompañamiento y apoyo.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "¡Bienvenidos al CETPRO San Martín de Porres!", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Atentamente,", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Mg. Maria Elena Cordova Galindo", "type": "text"}]}]', NULL, NULL, false, NULL, NULL, '2025-08-16 00:00:00+00', 'presentacion', 'noticia', 'Bienvenidos al CETPRO "San Martin de Porres"', NULL);
INSERT INTO "public"."publicaciones" VALUES (7, '[{"type": "heading", "level": 3, "children": [{"text": "MISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres tiene como misión formar técnicos competentes, emprendedores y con valores, capaces de responder a las necesidades del mundo laboral y social. Brindamos una educación técnico-productiva de calidad, orientada a la práctica, la innovación y el desarrollo de habilidades que permitan a nuestros estudiantes alcanzar autonomía económica y profesional. Promovemos la responsabilidad, la creatividad y el liderazgo, impulsando el espíritu emprendedor y el compromiso con la comunidad, para contribuir al progreso individual y al bienestar colectivo.", "type": "text"}]}, {"type": "heading", "level": 3, "children": [{"text": "VISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres se proyecta como una institución líder en la formación técnico-productiva, reconocida por la excelencia académica y la innovación en sus programas. Aspiramos a ser un referente en la formación de técnicos emprendedores, preparados para enfrentar los retos de un mundo globalizado y tecnológico. Nuestra visión es consolidarnos como un espacio de aprendizaje integral que fomente la empleabilidad, el autoempleo y el emprendimiento sostenible, contribuyendo al desarrollo económico y social de nuestro entorno y del país.", "type": "text"}]}]', '<p>Para otros usos de este término, véase Familia (desambiguación).</p><p>Escultura de Henry Moore con el título Familia. Barclay School, Stevenage, Hertfordshire, Gran Bretaña.<br>La familia es un grupo de personas formado por individuos unidos, y primordialment<img class="image_resized image-style-align-left" style="aspect-ratio:1120/643;width:38.92%;" src="http://localhost:1337/uploads/paseo_campo_ac24fc681a.png" alt="paseo-campo.png" srcset="http://localhost:1337/uploads/thumbnail_paseo_campo_ac24fc681a.png 245w,http://localhost:1337/uploads/small_paseo_campo_ac24fc681a.png 500w,http://localhost:1337/uploads/medium_paseo_campo_ac24fc681a.png 750w,http://localhost:1337/uploads/large_paseo_campo_ac24fc681a.png 1000w," sizes="100vw" width="1120" height="643">e vinculados por relaciones de filiación o de pareja.[1]​ El Diccionario de la lengua española la define, entre otras cosas, como un grupo de personas emparentadas entre sí que viven juntas, lo que lleva implícito los conceptos de parentesco y convivencia.[2]​ Según la Declaración Universal de los Derechos Humanos, es el elemento natural, universal y fundamental de la sociedad, tiene derecho a la protección de la sociedad y del Estado.[3]​</p><p>Los lazos principales que definen una familia son de dos tipos: vínculos de afinidad derivados del establecimiento de un vínculo reconocido socialmente, como el matrimonio[4]​ —que, en algunas sociedades, solo permite la unión entre dos personas mientras que en otras es posible la poligamia—, y vínculos de consanguinidad, como la filiación entre padres e hijos o los lazos que se establecen entre los hermanos que descienden de un mismo padre. También puede diferenciarse la familia según el grado de parentesco entre sus miembros.</p>', 'Formar técnicos competentes y emprendedores, con valores y habilidades prácticas que impulsen su empleabilidad, autoempleo y compromiso con la comunidad.', false, NULL, NULL, '2025-01-01 00:00:00+00', 'mision-vision', 'noticia', 'MISION / VISION', NULL);
INSERT INTO "public"."publicaciones" VALUES (23, '[{"type": "heading", "level": 3, "children": [{"text": "MISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres tiene como misión formar técnicos competentes, emprendedores y con valores, capaces de responder a las necesidades del mundo laboral y social. Brindamos una educación técnico-productiva de calidad, orientada a la práctica, la innovación y el desarrollo de habilidades que permitan a nuestros estudiantes alcanzar autonomía económica y profesional. Promovemos la responsabilidad, la creatividad y el liderazgo, impulsando el espíritu emprendedor y el compromiso con la comunidad, para contribuir al progreso individual y al bienestar colectivo.", "type": "text"}]}, {"type": "heading", "level": 3, "children": [{"text": "VISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres se proyecta como una institución líder en la formación técnico-productiva, reconocida por la excelencia académica y la innovación en sus programas. Aspiramos a ser un referente en la formación de técnicos emprendedores, preparados para enfrentar los retos de un mundo globalizado y tecnológico. Nuestra visión es consolidarnos como un espacio de aprendizaje integral que fomente la empleabilidad, el autoempleo y el emprendimiento sostenible, contribuyendo al desarrollo económico y social de nuestro entorno y del país.", "type": "text"}]}]', '<p>Para otros usos de este término, véase Familia (desambiguación).</p><p>Escultura de Henry Moore con el título Familia. Barclay School, Stevenage, Hertfordshire, Gran Bretaña.<br>La familia es un grupo de personas formado por individuos unidos, y primordialment<img class="image_resized image-style-align-left" style="aspect-ratio:1120/643;width:38.92%;" src="http://localhost:1337/uploads/paseo_campo_ac24fc681a.png" alt="paseo-campo.png" srcset="http://localhost:1337/uploads/thumbnail_paseo_campo_ac24fc681a.png 245w,http://localhost:1337/uploads/small_paseo_campo_ac24fc681a.png 500w,http://localhost:1337/uploads/medium_paseo_campo_ac24fc681a.png 750w,http://localhost:1337/uploads/large_paseo_campo_ac24fc681a.png 1000w," sizes="100vw" width="1120" height="643">e vinculados por relaciones de filiación o de pareja.[1]​ El Diccionario de la lengua española la define, entre otras cosas, como un grupo de personas emparentadas entre sí que viven juntas, lo que lleva implícito los conceptos de parentesco y convivencia.[2]​ Según la Declaración Universal de los Derechos Humanos, es el elemento natural, universal y fundamental de la sociedad, tiene derecho a la protección de la sociedad y del Estado.[3]​</p><p>Los lazos principales que definen una familia son de dos tipos: vínculos de afinidad derivados del establecimiento de un vínculo reconocido socialmente, como el matrimonio[4]​ —que, en algunas sociedades, solo permite la unión entre dos personas mientras que en otras es posible la poligamia—, y vínculos de consanguinidad, como la filiación entre padres e hijos o los lazos que se establecen entre los hermanos que descienden de un mismo padre. También puede diferenciarse la familia según el grado de parentesco entre sus miembros.</p>', 'Formar técnicos competentes y emprendedores, con valores y habilidades prácticas que impulsen su empleabilidad, autoempleo y compromiso con la comunidad.', false, NULL, NULL, '2025-01-01 00:00:00+00', 'mision-vision', 'noticia', 'MISION / VISION', NULL);


ALTER TABLE "public"."publicaciones" ENABLE TRIGGER ALL;

--
-- Data for Name: publicacion_videos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."publicacion_videos" DISABLE TRIGGER ALL;



ALTER TABLE "public"."publicacion_videos" ENABLE TRIGGER ALL;

--
-- Data for Name: recordatorios; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."recordatorios" DISABLE TRIGGER ALL;



ALTER TABLE "public"."recordatorios" ENABLE TRIGGER ALL;

--
-- Data for Name: unidades_didacticas_estudiantes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."unidades_didacticas_estudiantes" DISABLE TRIGGER ALL;



ALTER TABLE "public"."unidades_didacticas_estudiantes" ENABLE TRIGGER ALL;

--
-- Name: acciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."acciones_id_seq"', 1, false);


--
-- Name: act_economicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."act_economicas_id_seq"', 9, true);


--
-- Name: actividades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."actividades_id_seq"', 1, false);


--
-- Name: anios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."anios_id_seq"', 33, true);


--
-- Name: aprendizajes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."aprendizajes_id_seq"', 1, false);


--
-- Name: asistencias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."asistencias_id_seq"', 1, false);


--
-- Name: aspectos_evaluacion_estudiantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."aspectos_evaluacion_estudiantes_id_seq"', 1, false);


--
-- Name: aspectos_evaluacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."aspectos_evaluacion_id_seq"', 1, false);


--
-- Name: calendarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."calendarios_id_seq"', 42, true);


--
-- Name: capacidades_terminales_estudiantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."capacidades_terminales_estudiantes_id_seq"', 1, false);


--
-- Name: capacidades_terminales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."capacidades_terminales_id_seq"', 1, false);


--
-- Name: carreras_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."carreras_id_seq"', 48, true);


--
-- Name: dato_general_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."dato_general_id_seq"', 1, true);


--
-- Name: ejes_transversales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."ejes_transversales_id_seq"', 1, false);


--
-- Name: especialidades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."especialidades_id_seq"', 8, true);


--
-- Name: evaluaciones_estudiantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."evaluaciones_estudiantes_id_seq"', 1, false);


--
-- Name: evaluaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."evaluaciones_id_seq"', 1, false);


--
-- Name: evento_ocurrencias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."evento_ocurrencias_id_seq"', 1, false);


--
-- Name: evento_recurrencias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."evento_recurrencias_id_seq"', 1, false);


--
-- Name: evento_relaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."evento_relaciones_id_seq"', 1, false);


--
-- Name: eventos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."eventos_id_seq"', 66, true);


--
-- Name: familias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."familias_id_seq"', 7, true);


--
-- Name: fases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."fases_id_seq"', 1, false);


--
-- Name: fases_metodos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."fases_metodos_id_seq"', 1, false);


--
-- Name: fases_recursos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."fases_recursos_id_seq"', 1, false);


--
-- Name: fases_tecnicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."fases_tecnicas_id_seq"', 1, false);


--
-- Name: grupo_modulos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."grupo_modulos_id_seq"', 99, true);


--
-- Name: grupos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."grupos_id_seq"', 121, true);


--
-- Name: horarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."horarios_id_seq"', 33, true);


--
-- Name: indicadores_capacidad_estudiantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."indicadores_capacidad_estudiantes_id_seq"', 1, false);


--
-- Name: indicadores_capacidad_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."indicadores_capacidad_id_seq"', 1, false);


--
-- Name: matricula_grupos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."matricula_grupos_id_seq"', 1, false);


--
-- Name: matricula_paquetes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."matricula_paquetes_id_seq"', 1, false);


--
-- Name: matricula_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."matricula_users_id_seq"', 1, false);


--
-- Name: matriculas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."matriculas_id_seq"', 167, true);


--
-- Name: metodos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."metodos_id_seq"', 1, false);


--
-- Name: modulo_videos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."modulo_videos_id_seq"', 1, true);


--
-- Name: modulos_estudiantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."modulos_estudiantes_id_seq"', 165, true);


--
-- Name: modulos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."modulos_id_seq"', 98, true);


--
-- Name: paquete_grupos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."paquete_grupos_id_seq"', 1, false);


--
-- Name: paquete_modulos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."paquete_modulos_id_seq"', 132, true);


--
-- Name: paquetes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."paquetes_id_seq"', 146, true);


--
-- Name: personal_especialidades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."personal_especialidades_id_seq"', 47, true);


--
-- Name: personales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."personales_id_seq"', 70, true);


--
-- Name: planes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."planes_id_seq"', 48, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."posts_id_seq"', 1, false);


--
-- Name: publicacion_videos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."publicacion_videos_id_seq"', 1, true);


--
-- Name: publicaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."publicaciones_id_seq"', 23, true);


--
-- Name: recordatorios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."recordatorios_id_seq"', 1, false);


--
-- Name: recursos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."recursos_id_seq"', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."roles_id_seq"', 66, true);


--
-- Name: sectores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."sectores_id_seq"', 4, true);


--
-- Name: semestres_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."semestres_id_seq"', 68, true);


--
-- Name: tecnicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."tecnicas_id_seq"', 1, false);


--
-- Name: tipo_carreras_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."tipo_carreras_id_seq"', 33, true);


--
-- Name: turnos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."turnos_id_seq"', 33, true);


--
-- Name: unidades_didacticas_estudiantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."unidades_didacticas_estudiantes_id_seq"', 1, false);


--
-- Name: unidades_didacticas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."unidades_didacticas_id_seq"', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."users_id_seq"', 1200, true);


--
-- Name: valores_institucionales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."valores_institucionales_id_seq"', 1, false);


--
-- Name: videos_youtube_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('"public"."videos_youtube_id_seq"', 2, true);


--
-- PostgreSQL database dump complete
--

