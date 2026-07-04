-- Datos para tablas educativas de Firebase SQL Connect
-- Este archivo corrige la versión anterior que creó tablas pero no cargó registros.
-- Ejecutar sobre la base cetprosmp-db donde ya existe la estructura.

BEGIN;

-- Limpia las tablas educativas antes de cargar los datos.
TRUNCATE TABLE
  public.users,
  public.semestres_director_lnk,
  public.semestres_coordinador_2_lnk,
  public.semestres_coordinador_1_lnk,
  public.semestres,
  public.sectores,
  public.publicaciones_cmps,
  public.publicaciones,
  public.personales_user_lnk,
  public.personales_especialidad_lnk,
  public.personales,
  public.paquetes_grupos_lnk,
  public.paquetes,
  public.modulos_cmps,
  public.modulos_carrera_lnk,
  public.modulos,
  public.matriculas_users_lnk,
  public.matriculas_paquete_lnk,
  public.matriculas_grupo_lnk,
  public.matriculas,
  public.grupos_personal_lnk,
  public.grupos_modulo_lnk,
  public.grupos_calendario_lnk,
  public.grupos,
  public.familias_sector_lnk,
  public.familias,
  public.especialidades,
  public.dato_general,
  public.components_video_youtubes,
  public.carreras_act_economica_lnk,
  public.carreras,
  public.calendarios_semestre_lnk,
  public.calendarios,
  public.act_economicas_familia_lnk,
  public.act_economicas_especialidad_lnk
RESTART IDENTITY CASCADE;

-- Carga de datos originales.
COPY public.act_economicas_especialidad_lnk (id, act_economica_id, especialidad_id) FROM stdin;
1	1	1
2	2	2
3	3	2
4	4	3
5	5	4
6	6	5
7	7	6
8	8	7
9	9	8
\.

COPY public.act_economicas_familia_lnk (id, act_economica_id, familia_id) FROM stdin;
1	1	1
2	2	1
3	3	2
4	4	3
5	5	4
6	6	4
7	7	5
8	8	6
9	9	7
\.

COPY public.calendarios (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, descripcion, fecha_ini, fecha_fin, tipo, archivado) FROM stdin;
9	xneac7dfo9ebi8kbyutuo4qt	2025-06-10 11:52:19.17	2025-08-06 22:29:20.469	2025-08-06 22:29:20.46	2	1	\N	150 horas [lu, mi, vi@]	<h1 style="margin-left:40px;text-align:justify;">Titulo 1</h1><figure class="image image_resized image-style-align-left" style="width:29.86%;"><img src="http://localhost:1337/uploads/paseo_campo_ac24fc681a.png" alt="paseo-campo.png" srcset="http://localhost:1337/uploads/thumbnail_paseo_campo_ac24fc681a.png 245w, http://localhost:1337/uploads/small_paseo_campo_ac24fc681a.png 500w, http://localhost:1337/uploads/medium_paseo_campo_ac24fc681a.png 750w, http://localhost:1337/uploads/large_paseo_campo_ac24fc681a.png 1000w" sizes="100vw" width="1000"><figcaption>Family<a target="_blank" rel="noopener noreferrer" href="https://www.america.com">https://www.america.com</a></figcaption></figure><p style="margin-left:40px;text-align:justify;"><span style="font-family:Tahoma, Geneva, sans-serif;">Este es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo.</span></p><figure class="table" style="width:66.38%;"><table class="ck-table-resized"><colgroup><col style="width:10.89%;"><col style="width:48.92%;"><col style="width:18.87%;"><col style="width:21.32%;"></colgroup><tbody><tr><td><p style="text-align:center;">Hola</p></td><td><p style="text-align:center;">Nombres y Apellidos</p></td><td><p style="text-align:center;">Edad</p></td><td><p style="text-align:center;">Sexo</p></td></tr><tr><td>1</td><td>Enrique</td><td>18</td><td>M</td></tr><tr><td>2</td><td>María</td><td>16</td><td>F</td></tr></tbody></table><figcaption>Dime que no</figcaption></figure><ol><li>Lima </li><li>peru</li><li>lito</li></ol><p>Continuamos el texto</p><ul><li>Esto es o no es</li><li>Esto Tambien</li><li>Lindo que sepas</li></ul><ul class="todo-list"><li><label class="todo-list__label"><input type="checkbox" disabled="disabled"><span class="todo-list__label__description">Hola&nbsp;</span></label></li><li><label class="todo-list__label"><input type="checkbox" disabled="disabled"><span class="todo-list__label__description">Moda</span></label></li><li><label class="todo-list__label"><input type="checkbox" disabled="disabled"><span class="todo-list__label__description">Meta</span></label></li></ul><p>&nbsp;</p><p><a target="_blank" rel="noopener noreferrer" href="https://www.america.com.pe">digo no</a>₲</p><hr><div class="page-break" style="page-break-after:always;"><span style="display:none;">&nbsp;</span></div><p>&nbsp;</p>	2025-08-11	2025-12-23	Academico	t
1	e7dcdiiamthbd3zwyq7pwsul	2025-05-30 07:46:24.591	2025-06-10 13:39:47.78	2025-06-10 13:39:47.776	1	1	\N	528 horas [Lu - Vi]	\N	2025-03-17	2025-07-22	Academico	f
2	hhuqgl9ai4x6g0qzkz4bnjwr	2025-05-30 07:50:17.389	2025-06-10 13:39:47.783	2025-06-10 13:39:47.777	1	1	\N	512 horas [Lu - Vi]	\N	2025-03-17	2025-07-18	Academico	f
3	p7qvd1k5ibhmc8hylcbto9ut	2025-05-30 07:54:55.91	2025-06-10 13:39:47.792	2025-06-10 13:39:47.788	1	1	\N	150 horas [Lu, Mi, Vi@] (1)	\N	2025-03-17	2025-05-21	Academico	f
4	ljyb7eui546oj44w0rfqwgge	2025-05-30 07:57:44.587	2025-06-10 13:39:47.797	2025-06-10 13:39:47.793	1	1	\N	150 horas [Ma, Ju, Vi@] (1)	\N	2025-03-18	2025-05-22	Academico	f
5	f3rkvxe54cdx5sd1gb4z09cn	2025-05-30 08:01:42.834	2025-06-10 13:39:47.803	2025-06-10 13:39:47.8	1	1	\N	150 horas [Lu, Mi, Vi@] (2)	\N	2025-05-26	2025-07-25	Academico	f
6	w5uioz0ec7z0wze94ydt0x6q	2025-05-30 08:08:35.015	2025-06-10 13:39:47.809	2025-06-10 13:39:47.806	1	1	\N	150 horas [Ma, Ju, Vi@] (2)	\N	2025-05-23	2025-07-24	Academico	f
8	js7tzx9ii3efwpl08js8zgms	2025-05-30 08:32:04.053	2025-06-10 13:39:47.818	2025-06-10 13:39:47.816	1	1	\N	300 horas [Ma, Ju, Vi@]	\N	2025-03-18	2025-07-24	Academico	f
7	nirvsf2fbcg1rzgpmfkilu9w	2025-05-30 08:11:05.034	2025-06-10 13:39:47.813	2025-06-10 13:39:47.811	1	1	\N	300 horas [Lu, Mi, Vi@]	\N	2025-03-17	2025-07-25	Academico	f
\.

COPY public.calendarios_semestre_lnk (id, calendario_id, semestre_id) FROM stdin;
1	1	1
3	2	1
4	3	1
5	4	1
6	5	1
7	6	1
8	7	1
9	8	1
10	9	2
\.

COPY public.carreras (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, codigo, descripcion, duracion, creditos, nivel, titulo_comercial, slug, descripcion_2) FROM stdin;
2	nseaz3sgsmvkokfa4thsvc1x	2025-05-28 16:18:14.393	2025-07-26 11:30:58.387	2025-07-26 11:30:58.373	1	1	\N	Electrónica	\N	\N	1000	\N	Auxiliar Técnico	Electrónica	electronica	\N
3	xoigjphgez7eujq47ezr202j	2025-05-29 10:14:05.809	2025-07-26 11:31:27.754	2025-07-26 11:31:27.74	1	1	\N	Mantenimiento Básico de Sistemas Eléctricos	\N	\N	1000	\N	Auxiliar Técnico	Mantenimiento Básico de Sistemas Eléctricos	mantenimiento-electronico	\N
4	aggyflopu32u1cd1gak5nbjp	2025-05-29 10:15:56.251	2025-07-26 11:31:48.412	2025-07-26 11:31:48.397	1	1	\N	Soporte técnico y operaciones de centros de cómputo	J2662-1-001	\N	1056	40	Auxiliar Técnico	Soporte técnico de computadoras	soporte-computadoras	\N
5	qkzo9rksbs43wmce9uxar4a6	2025-05-29 10:25:53.755	2025-07-26 11:32:17.484	2025-07-26 11:32:17.47	1	1	\N	Operación de Computadoras	\N	\N	1000	\N	Auxiliar Técnico	Operación de Computadoras	operaciones-computadoras	\N
6	h85eh2qhebq8sariyo5xjo7y	2025-05-29 10:28:30.142	2025-07-26 11:32:36.828	2025-07-26 11:32:36.817	1	1	\N	Corte y Ensamblaje	CO714-1-003	\N	1056	40	Auxiliar Técnico	Corte y Ensamblaje	corte-ensamblaje	\N
7	ch06m02qs2hxdaoso8zjp3xy	2025-05-29 10:29:27.495	2025-07-26 11:32:49.738	2025-07-26 11:32:49.727	1	1	\N	Costura y Acabados	CO714-1-004	\N	1056	40	Auxiliar Técnico	Costura y Acabados	costura-acabados	\N
8	s2r8v3xpdofz54zyz09oqugy	2025-05-29 10:33:47.103	2025-07-26 11:33:12.959	2025-07-26 11:33:12.949	1	1	\N	Bordado de prendas de vestir	C0714-1-002	\N	1056	40	Auxiliar Técnico	Bordado en prendas de vestir	bordados-prendas	\N
9	ogosh7z9j9xt6nsg26byn8et	2025-05-29 10:35:08.498	2025-07-26 11:33:34.712	2025-07-26 11:33:34.696	1	1	\N	Confección Textil	\N	\N	1000	\N	Auxiliar Técnico	Confección Textil	confeccion-textil	\N
10	qxb804jn2yz0ataef2khk1j8	2025-05-29 11:00:09.721	2025-07-26 11:33:54.795	2025-07-26 11:33:54.785	1	1	\N	Confección de calzado	C0715-1-001	\N	1056	40	Auxiliar Técnico	Confección de calzado	confeccion-calzado	\N
11	y8ivt4gjfvb61qdthpej13yb	2025-05-29 11:02:02.928	2025-07-26 11:34:46.251	2025-07-26 11:34:46.24	1	1	\N	Confección de Artículos de Cuero y Marroquinería	C0715-1-002	\N	1056	40	Auxiliar Técnico	Artículos de Cuero y Marroquinería	cuero-marroquineria	\N
12	h6teufmxnry8ogwtxfv4cxj0	2025-05-29 11:03:04.285	2025-07-26 11:35:08.945	2025-07-26 11:35:08.928	1	1	\N	Manualidades	\N	\N	1000	\N	Auxiliar Técnico	Manualidades	manualidades	\N
13	g8rin1mdfp55nt8o6yryyn7b	2025-05-29 11:04:37.496	2025-07-26 11:35:33.442	2025-07-26 11:35:33.431	1	1	\N	Panadería y Pastelería	C0610-1-001	\N	1056	40	Auxiliar Técnico	Panadería y Pastelería	panaderia-pasteleria	\N
14	itwieaftkuujghdhn9yf0do6	2025-05-29 11:05:29.76	2025-07-26 11:35:58.975	2025-07-26 11:35:58.956	1	1	\N	Asistencia en Pastelería y Panadería	\N	\N	1000	\N	Auxiliar Técnico	Asistencia en Pastelería y Panadería	asistente-panaderia-pasteleria	\N
15	yjopowuya2lxdyo4s6s2i0x2	2025-05-29 11:06:19.082	2025-07-26 11:36:19.334	2025-07-26 11:36:19.323	1	1	\N	Mantenimiento Básico de Casas y Edificios	\N	\N	1000	\N	Auxiliar Técnico	Mantenimiento Básico de Casas y Edificios	mantenimiento-casas-edificios	\N
1	j6oly9508e9w7kbv29zf3zg8	2025-05-28 16:15:13.533	2025-07-28 15:17:34.587	2025-07-28 15:17:34.574	1	1	\N	Peluquería y Barberia	S3496-1-001	\N	1056	40	Auxiliar Técnico	Peluquería y Barberia	peluqueria-barberia	\N
\.

COPY public.carreras_act_economica_lnk (id, carrera_id, act_economica_id) FROM stdin;
1	1	1
2	2	2
3	3	3
4	4	4
5	5	4
6	6	5
7	7	5
8	8	5
9	9	5
10	10	6
11	11	6
12	12	7
13	13	8
14	14	8
15	15	9
\.

COPY public.components_video_youtubes (id, url) FROM stdin;
1	https://www.youtube.com/watch?v=_6oKX-ZCP_8
2	https://www.youtube.com/watch?v=IyKoAaLrTzw
\.

COPY public.dato_general (id, document_id, nombre_institucion, direccion, telefono_1, telefono_2, correo, pagina_web, facebook, ruc, rd, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, youtube, twitter, instagram, tiktok) FROM stdin;
1	e673vmbngdw1snggolt25hee	CETPRO "San Martin de Porres"	Jirón Santa Clorinda 971 Urb. Palao SMP	5341588	5346663	cetprosanmartindeporres@cetprosmp.edu.pe	cetprosmp.edu.pe	https://www.facebook.com/cetprosanmartindeporres1/	20610635939	R.D. N° 1839 - 05 - DRELM	2025-07-27 20:28:21.038	2025-07-28 23:54:58.767	2025-07-28 23:54:58.678	1	1	\N	https://www.youtube.com/@enriquerafaelpalominohorna3697	https://x.com/enkee032	https://www.instagram.com/cetpro.smp/	https://www.tiktok.com/@cetpro.sanmartindeporres
\.

COPY public.especialidades (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, titulo_comercial, descripcion, descripcion_2, slug) FROM stdin;
1	wwfg3o6e49a2bcykm2hmglq5	2025-05-28 15:48:46.8	2025-08-09 02:29:34.393	2025-08-09 02:29:34.353	1	1	\N	Estética Personal	Estética Personal	\N	[{"type": "paragraph", "children": [{"text": "Solanum tuberosum, de nombre común patata (en la mayor parte de España, Filipinas y Guinea Ecuatorial) o papa (en Hispanoamérica y en las Islas Canarias)[1]​ [2]​", "type": "text"}]}]	estetica-personal
2	yfu8vq9ao3v9i7cqqs4m9kdq	2025-05-28 15:49:11.254	2025-07-13 18:42:46.069	2025-07-13 18:42:46.047	1	1	\N	Electricidad y Electrónica	Electricidad y Electrónica	\N	\N	electricidad-electronica
4	cavjjtdvrnl44637ryvieota	2025-05-28 15:52:56.45	2025-07-13 18:43:32.305	2025-07-13 18:43:32.297	1	1	\N	Textil y Confección	Confección Textil	\N	\N	confeccion-textil
5	n3sri0rafju1m4m47rta6gjh	2025-05-28 15:53:53.024	2025-07-13 18:43:57.387	2025-07-13 18:43:57.372	1	1	\N	Cuero y Calzado	Cuero y Calzado	\N	\N	cuero-calzado
6	wfy1goqi2y32obugd58pw7eq	2025-05-28 15:54:18.263	2025-07-13 18:44:57.666	2025-07-13 18:44:57.644	1	1	\N	Artesanía y Manualidades	Manualidades	\N	\N	manualidades
7	wvuqdosfpn00oux8ayfvg0yu	2025-05-28 15:54:42.065	2025-07-13 18:45:19.777	2025-07-13 18:45:19.768	1	1	\N	Hostelería y Turismo	Hostelería y Turismo	\N	\N	hosteleria-turismo
8	gjcdvg8du8xe0j9692n8v089	2025-05-28 15:55:10.391	2025-07-13 18:45:45.378	2025-07-13 18:45:45.363	1	1	\N	Carpintería	Carpintería	\N	\N	carpinteria
3	z9kd2xqh6nf6d43u57hg7bux	2025-05-28 15:52:19.226	2025-08-10 22:18:20.828	2025-08-10 22:18:20.791	1	1	\N	Computación e Informática	Computación	<p data-start="273" data-end="636">La especialidad de Computación del CETPRO San Martín de Porres ofrece una formación técnica integral orientada a las exigencias del mercado laboral actual. Nuestro objetivo es preparar a los estudiantes para desempeñarse con eficiencia en diversas áreas de la tecnología, brindándoles una base sólida tanto en conocimientos teóricos como en habilidades prácticas.</p><p data-start="638" data-end="1115">A lo largo de la formación, los estudiantes desarrollan competencias en cuatro módulos especializados. En el módulo de <strong data-start="757" data-end="782">Soporte Técnico de PC</strong>, aprenden a ensamblar computadoras, instalar y configurar sistemas operativos, dar mantenimiento preventivo y correctivo, y solucionar fallas comunes de hardware y software. Además, se introducen en el manejo básico de redes y en buenas prácticas de seguridad informática, habilidades muy valoradas en empresas y servicios técnicos.</p><p data-start="1117" data-end="1488">En el módulo de <strong data-start="1133" data-end="1174">Aplicativos Informáticos de Ofimática</strong>, se entrenan en el uso profesional de herramientas como Microsoft Word, Excel, PowerPoint y otras plataformas colaborativas. Se enfatiza la creación de documentos formales, hojas de cálculo con funciones automatizadas, presentaciones efectivas y el manejo de datos, esenciales en cualquier entorno administrativo.</p><p data-start="1490" data-end="1828">El módulo de <strong data-start="1503" data-end="1534">Diseño Gráfico Publicitario</strong> desarrolla la creatividad del estudiante mediante el uso de programas como Photoshop y Corel Draw. Se enseña a crear piezas gráficas para medios impresos y digitales, como logotipos, afiches, banners y contenido visual para redes sociales, aplicando principios de diseño, color y composición.</p><p data-start="1830" data-end="2157">Finalmente, el módulo de <strong data-start="1855" data-end="1884">Diseño y Programación Web</strong> introduce al estudiante en el mundo del desarrollo web. Se aprenden lenguajes como HTML, CSS y JavaScript, así como el uso de gestores de contenido, permitiendo crear sitios web modernos, responsivos y funcionales, adaptados a las necesidades actuales del entorno digital.</p>	[{"type": "paragraph", "children": [{"text": "La especialidad de Computación del CETPRO San Martín de Porres ofrece una formación técnica integral orientada a las exigencias del mercado laboral actual. Nuestro objetivo es preparar a los estudiantes para desempeñarse con eficiencia en diversas áreas de la tecnología, brindándoles una base sólida tanto en conocimientos teóricos como en habilidades prácticas.", "type": "text"}]}, {"type": "list", "format": "ordered", "children": [{"type": "list-item", "children": [{"text": "A lo largo de la formación, los estudiantes desarrollan competencias en cuatro módulos especializados. ", "type": "text"}, {"bold": true, "text": "En el módulo de Soporte Técnico de PC", "type": "text"}, {"text": ", aprenden a ensamblar computadoras, instalar y configurar sistemas operativos, dar mantenimiento preventivo y correctivo, y solucionar fallas comunes de hardware y software. Además, se introducen en el manejo básico de redes y en buenas prácticas de seguridad informática, habilidades muy valoradas en empresas y servicios técnicos.", "type": "text"}]}]}, {"type": "list", "format": "unordered", "children": [{"type": "list-item", "children": [{"text": "En el ", "type": "text"}, {"bold": true, "text": "módulo de Aplicativos Informáticos de Ofimática", "type": "text"}, {"text": ", se entrenan en el uso profesional de herramientas como Microsoft Word, Excel, PowerPoint y otras plataformas colaborativas. Se enfatiza la creación de documentos formales, hojas de cálculo con funciones automatizadas, presentaciones efectivas y el manejo de datos, esenciales en cualquier entorno administrativo.", "type": "text"}]}]}, {"type": "paragraph", "children": [{"text": "El ", "type": "text"}, {"bold": true, "text": "módulo de Diseño Gráfico Publicitario", "type": "text"}, {"text": " desarrolla la creatividad del estudiante mediante el uso de programas como Photoshop e Illustrator. Se enseña a crear piezas gráficas para medios impresos y digitales, como logotipos, afiches, banners y contenido visual para redes sociales, aplicando principios de diseño, color y composición.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Finalmente, el ", "type": "text"}, {"bold": true, "text": "módulo de Diseño y Programación Web", "type": "text"}, {"text": " introduce al estudiante en el mundo del desarrollo web. Se aprenden lenguajes como HTML, CSS y JavaScript, así como el uso de gestores de contenido, permitiendo crear sitios web modernos, responsivos y funcionales, adaptados a las necesidades actuales del entorno digital.", "type": "text"}]}]	computacion
\.

COPY public.familias (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, descripcion) FROM stdin;
1	p0hwjz9vcufmj97g4ti4fzat	2025-05-28 15:44:58.322	2025-05-28 16:00:52.826	2025-05-28 16:00:52.805	1	1	\N	SERVICIOS PERSONALES Y DE HOGARES	\N
2	zeyqud9indo55ci7w5noy3tq	2025-05-28 15:45:10.666	2025-05-28 16:01:08.707	2025-05-28 16:01:08.694	1	1	\N	ENERGÍA, AGUA, Y SANEAMIENTO	\N
3	q2dpe8cwagld0q23kw2yxwj8	2025-05-28 15:46:17.085	2025-05-28 16:02:04.452	2025-05-28 16:02:04.442	1	1	\N	TECNOLOGIAS DE LA INFORMACIÓN Y COMUNICACIONES – TIC’s	\N
4	rwqkt4hsjr8vyxf97aab6lsx	2025-05-28 15:46:49.764	2025-05-28 16:02:23.619	2025-05-28 16:02:23.607	1	1	\N	INDUSTRIA TEXTIL, CONFECCIÓN Y DEL CUERO	\N
5	vl4eieswwy1ct52cy0rly7cr	2025-05-28 15:47:11.099	2025-05-28 16:02:37.237	2025-05-28 16:02:37.221	1	1	\N	INDUSTRIA DIVERSAS	\N
6	cfb8yj4bkydt3xr7zkaidvw6	2025-05-28 15:47:25.977	2025-05-28 16:02:54.855	2025-05-28 16:02:54.842	1	1	\N	INDUSTRIA ALIMENTARIA BEBIDA Y TABACO	\N
7	d9f09s606td6s7xnjtn2zr9w	2025-05-28 15:47:42.108	2025-05-28 16:03:17.734	2025-05-28 16:03:17.724	1	1	\N	INDUSTRIA DE LA MADERA Y MUEBLES	\N
\.

COPY public.familias_sector_lnk (id, familia_id, sector_id) FROM stdin;
1	1	1
2	2	2
3	3	3
4	4	4
5	5	4
6	6	4
7	7	4
\.

COPY public.grupos (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, turno, descripcion, nombre_display, archivado) FROM stdin;
21	wdpdmi4rh9bueh8hn8cqv61k	2025-06-10 11:55:04.666	2025-06-20 11:51:09.104	2025-06-20 11:51:09.102	2	2	\N	Tarde	\N	Bisutería  [Tarde]  lu, mi, vi@  (Marco Palomino)	t
22	uq7ccjfgjmersev56hfzwoqf	2025-06-10 13:31:42.137	2025-06-20 11:51:09.108	2025-06-20 11:51:09.106	2	2	\N	Tarde	\N	Cerámica al Frio  [Tarde]  lu, mi, vi@  (Manuel Quispe)	t
19	y3djw0bfonxyfupkdh1e9feu	2025-06-03 15:26:30.505	2025-06-10 13:39:47.884	2025-06-10 13:39:47.849	1	1	\N	Mañana	\N	Bisutería  [Mañana]  Ma, Ju, Vi@  (Margarita Postillon)	f
20	lbwxirr1jghfb7x11gvrxf5j	2025-06-03 15:27:30.905	2025-06-10 13:39:47.886	2025-06-10 13:39:47.853	1	1	\N	Noche	\N	Cocina Nacional  [Noche]  Ma, Ju, Vi@  (Marco Palomino)	f
\.

COPY public.grupos_calendario_lnk (id, grupo_id, calendario_id) FROM stdin;
30	19	4
31	20	8
32	21	9
33	22	9
\.

COPY public.grupos_modulo_lnk (id, grupo_id, modulo_id) FROM stdin;
35	19	22
36	20	29
37	21	22
38	22	24
\.

COPY public.grupos_personal_lnk (id, grupo_id, personal_id) FROM stdin;
15	19	4
16	20	1
17	21	1
18	22	3
\.

COPY public.matriculas (id, document_id, recibo, fecha, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, archivado) FROM stdin;
2	d0t91euqxm180m6boctb1vl4	65453	2025-06-19	2025-06-09 07:45:11.453	2025-06-10 13:39:48.14	2025-06-10 13:39:48.131	1	1	\N	f
\.

COPY public.matriculas_grupo_lnk (id, matricula_id, grupo_id) FROM stdin;
\.

COPY public.matriculas_paquete_lnk (id, matricula_id, paquete_id) FROM stdin;
1	2	13
\.

COPY public.matriculas_users_lnk (id, matricula_id, user_id) FROM stdin;
2	2	7
\.

COPY public.modulos (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, titulo_comercial, orden, descripcion, horas, creditos, metas, activo, slug, descripcion_2) FROM stdin;
23	qfpbx2u413wu0jmgg0ykxnvx	2025-05-29 14:03:32.051	2025-07-26 14:19:32.745	2025-07-26 14:19:32.724	1	1	\N	Pintura Decorativa	Pintura Decorativa	3	\N	150	\N	15	t	pintura-decorativa	\N
24	cot01twa1gexm55nz68jk0k6	2025-05-29 14:04:14.558	2025-07-26 14:22:22.796	2025-07-26 14:22:22.768	1	1	\N	Cerámica al Frio	Cerámica al Frio	4	\N	150	\N	15	t	ceramica-al-frio	\N
25	tthxdw3fwk2ey1xfl7m8a4w1	2025-05-29 14:06:03.39	2025-07-26 14:23:42.009	2025-07-26 14:23:41.995	1	1	\N	Acondicionamiento y Elaboración de Productos de Panadería y Pastelería	Productos Pastelería y Panadería 1	1	\N	528	20	15	t	acondicionamiento-preparacion-panaderia-pasteleria	\N
26	ppp704ogk42413i1tba1llr1	2025-05-29 14:07:32.659	2025-07-26 14:24:35.471	2025-07-26 14:24:35.455	1	1	\N	Decoración y Presentación de los Productos de Panadería y Pastelería	Productos Pastelería y Panadería 2	2	\N	528	20	15	t	decoracion-presentacion-panaderia-pasteleria	\N
27	p9scy13lqhj1s1u0bbkksygs	2025-05-29 14:08:46.356	2025-07-26 14:24:57.07	2025-07-26 14:24:57.056	1	1	\N	Técnicas de Decoración de Tortas	Técnicas de Decoración de Tortas	1	\N	300	\N	15	t	decoracion-tortas	\N
28	bs38cdlymk09msbkaoh8u0sy	2025-05-29 14:09:24.42	2025-07-26 14:25:23.633	2025-07-26 14:25:23.608	1	1	\N	Buffet	Buffet	2	\N	300	\N	15	t	buffet	\N
29	v3y2tsrdr8ncv70873r6s9yn	2025-05-29 14:10:08.388	2025-07-26 14:26:13.449	2025-07-26 14:26:13.418	1	1	\N	Cocina Nacional	Cocina Nacional	3	\N	300	\N	15	t	cocina-nacional	\N
30	jv0gy7syl7rgzwgocb8dur4n	2025-05-29 14:10:50.411	2025-07-26 14:26:46.82	2025-07-26 14:26:46.794	1	1	\N	Técnicas Culinarias	Técnicas Culinarias	4	\N	300	\N	15	t	tecnicas-culinarias	\N
31	zshujc3t6imihihbk6opa2s4	2025-05-29 14:11:53.388	2025-07-26 14:27:04.349	2025-07-26 14:27:04.325	1	1	\N	Mantenimiento de Carpintería	Carpintería en Madera	1	\N	300	\N	15	t	carpinteria-madera	\N
32	kro2buach7gk419760qcb5n1	2025-05-29 14:12:46.616	2025-07-26 14:27:26.999	2025-07-26 14:27:26.985	1	1	\N	Confección de Muebles en Melamina	Carpintería en Melamina	2	\N	300	\N	15	t	carpinteria-melamine	\N
1	r8hqyher86brqohevtfp8dd7	2025-05-29 13:17:39.14	2025-07-27 01:52:35.281	2025-07-27 01:52:35.259	1	1	\N	Corte De Cabello, Barba y Peinado	Corte De Cabello, Barba y Peinado	1	\N	528	20	15	t	corte-barba-peinado	\N
11	st27dg7bacylvokowlwbsj9f	2025-05-29 13:40:52.889	2025-07-27 02:00:44.567	2025-07-27 02:00:44.541	1	1	\N	Técnicas de Confección de Prendas de Vestir	Técnicas de Confección de Prendas de Vestir	2	\N	544	19	15	t	confeccion-prendas-vestir	\N
12	tlx9yrf2v6n33mphxk1mkwrp	2025-05-29 13:43:39.8	2025-07-27 02:02:39.236	2025-07-27 02:02:39.216	1	1	\N	Técnicas de Confección de Prendas de Vestir	Oper. Maquinas, Conf. Prendas Damas, Niños, Deportivas	2	\N	544	21	15	t	operatividad-confeccion-damas-ninios-deportiva	\N
13	grt10ws5mnqu3p9489oq52fd	2025-05-29 13:45:37.219	2025-07-27 02:03:34.836	2025-07-27 02:03:34.81	1	1	\N	Técnicas de Procesos de Acabados en Prendas de Vestir	Técnicas de Procesos de Acabados en Prendas de Vestir	2	\N	528	19	15	t	tecnicas-acabados-prendas-vestir	\N
2	vssnq87ddp2rid6txqcix13w	2025-05-29 13:19:07.077	2025-07-26 14:06:11.512	2025-07-26 14:06:11.495	1	1	\N	Tratamiento Capilar, Coloración, Ondulación y Laceado 	Tratamiento Capilar, Trituración, Ondulación, Laceado	2	\N	528	20	15	t	capilar-coloracion-ondulacion-laceado	\N
3	g7pyaj1rwfpnjtdsnm3ykk1o	2025-05-29 13:21:46.575	2025-07-26 14:06:30.56	2025-07-26 14:06:30.532	1	1	\N	Mantenimiento de Teléfonos Celulares	Reparacion de Celulares	1	\N	300	\N	15	t	reparacion-celulares	\N
4	gou0662sy32plzq34mkp9l08	2025-05-29 13:26:59.667	2025-07-26 14:06:45.642	2025-07-26 14:06:45.626	1	1	\N	Mantenimiento de Instalaciones Eléctricas Domiciliarias 	Instalaciones Eléctricas	2	\N	300	\N	15	t	intalaciones-electricas	\N
5	dszp3hzqc4b9rjm3s8rtoatm	2025-05-29 13:28:29.086	2025-07-26 14:07:20.315	2025-07-26 14:07:20.3	1	1	\N	Atención de Incidentes y Problemas de Operatividad en El Centro de Cómputo	Atención De Incidentes y Problemas de Operatividad en El Centro de Cómputo	1	\N	528	20	15	t	incidentes-operatividad-computo	\N
6	os0utwhbezwv8291f2qiw3hq	2025-05-29 13:30:20.783	2025-07-26 14:08:05.675	2025-07-26 14:08:05.658	1	1	\N	Monitoreo y Acciones de Mantenimiento de Centros de Cómputo	Monitoreo y Acciones de Mantenimiento de Centros de Cómputo	2	\N	528	20	15	t	monitoreo-mantenimiento-computo	\N
7	ti3q76vva62bl3gqtd7zv0a1	2025-05-29 13:31:59.05	2025-07-26 14:09:06.43	2025-07-26 14:09:06.414	1	1	\N	Ofimática	Ofimática	1	\N	300	\N	15	t	ofimatica	\N
8	mrpkusioji6nsk0c8pkwpj3e	2025-05-29 13:33:02.343	2025-07-26 14:09:40.926	2025-07-26 14:09:40.908	1	1	\N	Diseño Publicitario	Diseño Publicitario	2	\N	300	\N	15	t	disenio-publicitario	\N
9	sny04jqizrrellqdjj4ya5vx	2025-05-29 13:36:56.783	2025-07-26 14:09:57.483	2025-07-26 14:09:57.458	1	1	\N	Diseño Web	Diseño Web	3	\N	300	\N	15	t	disenio-web	\N
10	iis0a3s8s3ry2e3a0vij4p4i	2025-05-29 13:39:59.757	2025-07-26 14:10:36.732	2025-07-26 14:10:36.714	1	1	\N	Técnicas de Tizado, Tendido y Corte de Prendas de Vestir	Técnicas de Tizado, Tendido y Corte de Prendas de Vestir	1	\N	560	21	15	t	tizado-tendido-corte	\N
14	tpm59g3ev7o0lg3k8oa0hi2i	2025-05-29 13:46:36.262	2025-07-26 14:11:00.616	2025-07-26 14:11:00.587	1	1	\N	Bordados Computarizado	Bordados Computarizado	1	\N	528	20	15	t	bordado-computarizado	\N
15	fy4gm37ey3zg1iivt0l7zp89	2025-05-29 13:47:36.11	2025-07-26 14:14:37.008	2025-07-26 14:14:36.987	1	1	\N	Tejido a Maquina	Tejido a Maquina	1	\N	300	\N	15	t	tejido-maquina	\N
16	u1p7wfhn2kyw8x1a8l1vi5uv	2025-05-29 13:48:18.5	2025-07-26 14:14:59.171	2025-07-26 14:14:59.147	1	1	\N	Tejido a Mano	Tejido a Mano	2	\N	300	\N	15	t	tejido-mano	\N
18	xhy61e54ticqubp776izh60w	2025-05-29 13:52:34.184	2025-07-26 14:16:36.089	2025-07-26 14:16:36.076	1	1	\N	Ensamblado y Acabado de Artículos de Cuero	Ensamblado y Acabado de Artículos de Cuero	2	\N	528	20	15	t	ensamblado-acabado-articulos-cuero	\N
17	ce0kzk6kc7c9ywlmy08xf3ho	2025-05-29 13:51:41.201	2025-07-26 14:16:57.53	2025-07-26 14:16:57.517	1	1	\N	Diseño y Corte de Articulos de Cuero	Patronaje y Corte de Artículos de Cuero y Marroquinería	1	\N	528	20	15	t	disenio-corte-articulos-cuero	\N
19	tuoyeqvy9xxxkwd5b69fergf	2025-05-29 13:56:44.948	2025-07-26 14:17:22.51	2025-07-26 14:17:22.494	1	1	\N	Diseño y Corte de Calzado	Patronaje y Corte de Calzado	1	\N	528	20	15	t	disenio-corte-calzado	\N
20	soe6ojnvmbumzn81ylm0hdxr	2025-05-29 13:57:49.439	2025-07-26 14:18:26.9	2025-07-26 14:18:26.885	1	1	\N	Aparado, Armado y Acabado de Calzado	Aparado, Armado y Acabado de Calzado	2	\N	528	20	15	t	aparado-armado-acabado-calzado	\N
21	iv5cbp2yw0e6w1piuzyr18ow	2025-05-29 13:59:52.509	2025-07-26 14:19:00.347	2025-07-26 14:19:00.323	1	1	\N	Decoración de Eventos Especiales	Decoración de Eventos Especiales	1	\N	300	\N	15	t	decoracion-eventos-especiales	\N
22	snvdz5bu2uwcevnuvxs86z1j	2025-05-29 14:01:28.729	2025-07-26 14:19:17.886	2025-07-26 14:19:17.858	1	1	\N	Bisuterías	Bisutería	2	\N	150	\N	15	t	bisuteria	\N
\.

COPY public.modulos_carrera_lnk (id, modulo_id, carrera_id) FROM stdin;
1	1	1
2	2	1
3	3	2
4	4	3
5	5	4
6	6	4
7	7	5
8	8	5
9	9	5
10	10	6
11	11	6
12	12	7
13	13	7
14	14	8
15	15	9
16	16	9
19	17	11
20	18	11
21	19	10
22	20	10
23	21	12
24	22	12
25	23	12
26	24	12
27	25	13
28	26	13
29	27	14
30	28	14
31	29	14
32	30	14
33	31	15
34	32	15
\.

COPY public.modulos_cmps (id, entity_id, cmp_id, component_type, field, "order") FROM stdin;
1	1	1	default.video-youtube	videosYoutube	1
2	1	2	default.video-youtube	videosYoutube	2
\.

COPY public.paquetes (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, descripcion, archivado) FROM stdin;
13	gc395yv2t6sqf0ntahynn053	2025-06-03 15:28:13.319	2025-06-10 13:39:48.102	2025-06-10 13:39:48.1	1	1	\N	Bisutería / Cocina Nacional  [Mañana]  Ma, Ju, Vi@  (Margarita Postillon)	\N	f
14	mg0e3dsqc49cmiedzcdr0nv8	2025-06-10 13:32:43.768	2025-06-20 11:51:09.124	2025-06-20 11:51:09.122	2	2	\N	Bisutería / Cerámica al Frio  [Tarde]  lu, mi, vi@  (Marco Palomino)	\N	t
\.

COPY public.paquetes_grupos_lnk (id, paquete_id, grupo_id, grupo_ord) FROM stdin;
51	13	19	0
52	13	20	1
53	14	21	0
54	14	22	1
\.

COPY public.personales (id, document_id, memo, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, display_name) FROM stdin;
3	nxb5cpcuncipanxvmfvcm5vu	<p>Mi reseña</p>	2025-06-01 11:22:31.182	2025-06-01 11:48:32.629	2025-06-01 11:48:32.626	1	1	\N	Manuel Quispe
4	c4pyiqrth7jajsms0ybpm7g9	\N	2025-06-01 12:12:46.762	2025-06-01 12:12:46.874	2025-06-01 12:12:46.866	1	1	\N	Margarita Postillon
1	bvk9pie0eykss15u3paf147d	<p>Este es su trayector</p>	2025-05-31 20:11:49.881	2025-07-29 14:42:08.445	2025-07-29 14:42:08.365	1	1	\N	Marco Palomino
\.

COPY public.personales_especialidad_lnk (id, personal_id, especialidad_id, especialidad_ord) FROM stdin;
10	3	8	1
12	3	6	2
13	4	4	0
9	1	5	1
14	1	8	2
\.

COPY public.personales_user_lnk (id, personal_id, user_id) FROM stdin;
7	3	7
9	4	8
11	1	6
\.

COPY public.publicaciones (id, document_id, titulo, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, slug, tipo, descripcion_corta, fecha_publicacion, fecha_evento_inicio, fecha_evento_fin, ubicacion, destacado, contenido_2, contenido_1) FROM stdin;
3	e8msz69b491teu1zrow62yns	Novenario a la Virgen del Carmen	2025-07-29 21:10:27.727	2025-07-29 21:10:27.727	\N	1	1	\N	novenario-virgen-carmen-2025	noticia	\N	2025-07-21	\N	\N	\N	t	\N	\N
4	e8msz69b491teu1zrow62yns	Novenario a la Virgen del Carmen	2025-07-29 21:10:27.727	2025-07-29 21:10:27.727	2025-07-29 21:10:27.746	1	1	\N	novenario-virgen-carmen-2025	noticia	\N	2025-07-21	\N	\N	\N	t	\N	\N
1	yyg2j46wlys43uaig85gjou8	Matricula 2025-2 (Agosto - Diciembre)	2025-07-29 21:08:33.052	2025-08-10 20:28:48.708	\N	1	1	\N	matricula-2025-	comunicado	Matricula Abierta para este segundo periodo académico 2025-2 de Agosto a fines de Diciembre, separa con tiempo tu matricula, las vacantes son limitadas...	2025-07-21	2025-07-21 00:00:00	2025-09-10 00:00:00	CETPRO "SAN MARTIN DE PORRES"	t	\N	\N
15	f0s2clovur6issqjbvhabufv	Gran Inicio de Clasess Periodo Academico  2025-2	2025-08-10 20:33:45.559	2025-08-10 20:33:45.559	\N	1	1	\N	publicacion	evento	\N	2025-08-10	\N	\N	\N	t	<h1>Contenido 2</h1>	\N
14	yyg2j46wlys43uaig85gjou8	Matricula 2025-2 (Agosto - Diciembre)	2025-07-29 21:08:33.052	2025-08-10 20:28:48.708	2025-08-10 20:28:48.765	1	1	\N	matricula-2025-	comunicado	Matricula Abierta para este segundo periodo académico 2025-2 de Agosto a fines de Diciembre, separa con tiempo tu matricula, las vacantes son limitadas...	2025-07-21	2025-07-21 00:00:00	2025-09-10 00:00:00	CETPRO "SAN MARTIN DE PORRES"	t	\N	\N
9	ql3k450nh56nq25ukya9lvwj	Se busca personal de servicio	2025-07-29 21:18:30.808	2025-08-10 20:41:34.436	\N	1	1	\N	personal-servicio	comunicado	\N	2025-07-30	\N	\N	\N	t	\N	\N
17	ql3k450nh56nq25ukya9lvwj	Se busca personal de servicio	2025-07-29 21:18:30.808	2025-08-10 20:41:34.436	2025-08-10 20:41:34.471	1	1	\N	personal-servicio	comunicado	\N	2025-07-30	\N	\N	\N	t	\N	\N
21	eu7k2bljayqze2mn1047so77	Bienvenidos al CETPRO "San Martin de Porres"	2025-08-15 22:02:16.891	2025-08-15 22:03:01.444	2025-08-15 22:03:01.473	1	1	\N	presentacion	noticia	\N	2025-08-16	\N	\N	\N	f	\N	[{"type": "paragraph", "children": [{"text": "Queridos estudiantes, padres de familia y comunidad educativa:", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Es para mí un honor darles la más cordial bienvenida al CETPRO San Martín de Porres, institución dedicada a la formación de técnicos emprendedores que buscan superarse y aportar al desarrollo de nuestra sociedad.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Nuestro compromiso es brindarles una educación de calidad, práctica y actualizada, que les permita adquirir competencias profesionales y valores que fortalezcan su desarrollo personal y laboral. Aquí encontrarán docentes comprometidos, un ambiente de respeto y oportunidades para crecer en lo académico y humano.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Los invito a asumir con entusiasmo este nuevo camino de aprendizaje, confiando en que cada esfuerzo los acercará a sus metas. Cuenten siempre con nuestro acompañamiento y apoyo.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "¡Bienvenidos al CETPRO San Martín de Porres!", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Atentamente,", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Mg. Maria Elena Cordova Galindo", "type": "text"}]}]
20	eu7k2bljayqze2mn1047so77	Bienvenidos al CETPRO "San Martin de Porres"	2025-08-15 22:02:16.891	2025-08-15 22:03:01.444	\N	1	1	\N	presentacion	noticia	\N	2025-08-16	\N	\N	\N	f	\N	[{"type": "paragraph", "children": [{"text": "Queridos estudiantes, padres de familia y comunidad educativa:", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Es para mí un honor darles la más cordial bienvenida al CETPRO San Martín de Porres, institución dedicada a la formación de técnicos emprendedores que buscan superarse y aportar al desarrollo de nuestra sociedad.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Nuestro compromiso es brindarles una educación de calidad, práctica y actualizada, que les permita adquirir competencias profesionales y valores que fortalezcan su desarrollo personal y laboral. Aquí encontrarán docentes comprometidos, un ambiente de respeto y oportunidades para crecer en lo académico y humano.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Los invito a asumir con entusiasmo este nuevo camino de aprendizaje, confiando en que cada esfuerzo los acercará a sus metas. Cuenten siempre con nuestro acompañamiento y apoyo.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "¡Bienvenidos al CETPRO San Martín de Porres!", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Atentamente,", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Mg. Maria Elena Cordova Galindo", "type": "text"}]}]
7	trjmzv26fqtz8zkzyk731zm8	MISION / VISION	2025-07-29 21:15:07.065	2025-08-15 23:20:13.042	\N	1	1	\N	mision-vision	noticia	Formar técnicos competentes y emprendedores, con valores y habilidades prácticas que impulsen su empleabilidad, autoempleo y compromiso con la comunidad.	2025-01-01	\N	\N	\N	f	<p>Para otros usos de este término, véase Familia (desambiguación).</p><p>Escultura de Henry Moore con el título Familia. Barclay School, Stevenage, Hertfordshire, Gran Bretaña.<br>La familia es un grupo de personas formado por individuos unidos, y primordialment<img class="image_resized image-style-align-left" style="aspect-ratio:1120/643;width:38.92%;" src="http://localhost:1337/uploads/paseo_campo_ac24fc681a.png" alt="paseo-campo.png" srcset="http://localhost:1337/uploads/thumbnail_paseo_campo_ac24fc681a.png 245w,http://localhost:1337/uploads/small_paseo_campo_ac24fc681a.png 500w,http://localhost:1337/uploads/medium_paseo_campo_ac24fc681a.png 750w,http://localhost:1337/uploads/large_paseo_campo_ac24fc681a.png 1000w," sizes="100vw" width="1120" height="643">e vinculados por relaciones de filiación o de pareja.[1]​ El Diccionario de la lengua española la define, entre otras cosas, como un grupo de personas emparentadas entre sí que viven juntas, lo que lleva implícito los conceptos de parentesco y convivencia.[2]​ Según la Declaración Universal de los Derechos Humanos, es el elemento natural, universal y fundamental de la sociedad, tiene derecho a la protección de la sociedad y del Estado.[3]​</p><p>Los lazos principales que definen una familia son de dos tipos: vínculos de afinidad derivados del establecimiento de un vínculo reconocido socialmente, como el matrimonio[4]​ —que, en algunas sociedades, solo permite la unión entre dos personas mientras que en otras es posible la poligamia—, y vínculos de consanguinidad, como la filiación entre padres e hijos o los lazos que se establecen entre los hermanos que descienden de un mismo padre. También puede diferenciarse la familia según el grado de parentesco entre sus miembros.</p>	[{"type": "heading", "level": 3, "children": [{"text": "MISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres tiene como misión formar técnicos competentes, emprendedores y con valores, capaces de responder a las necesidades del mundo laboral y social. Brindamos una educación técnico-productiva de calidad, orientada a la práctica, la innovación y el desarrollo de habilidades que permitan a nuestros estudiantes alcanzar autonomía económica y profesional. Promovemos la responsabilidad, la creatividad y el liderazgo, impulsando el espíritu emprendedor y el compromiso con la comunidad, para contribuir al progreso individual y al bienestar colectivo.", "type": "text"}]}, {"type": "heading", "level": 3, "children": [{"text": "VISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres se proyecta como una institución líder en la formación técnico-productiva, reconocida por la excelencia académica y la innovación en sus programas. Aspiramos a ser un referente en la formación de técnicos emprendedores, preparados para enfrentar los retos de un mundo globalizado y tecnológico. Nuestra visión es consolidarnos como un espacio de aprendizaje integral que fomente la empleabilidad, el autoempleo y el emprendimiento sostenible, contribuyendo al desarrollo económico y social de nuestro entorno y del país.", "type": "text"}]}]
23	trjmzv26fqtz8zkzyk731zm8	MISION / VISION	2025-07-29 21:15:07.065	2025-08-15 23:20:13.042	2025-08-15 23:20:13.069	1	1	\N	mision-vision	noticia	Formar técnicos competentes y emprendedores, con valores y habilidades prácticas que impulsen su empleabilidad, autoempleo y compromiso con la comunidad.	2025-01-01	\N	\N	\N	f	<p>Para otros usos de este término, véase Familia (desambiguación).</p><p>Escultura de Henry Moore con el título Familia. Barclay School, Stevenage, Hertfordshire, Gran Bretaña.<br>La familia es un grupo de personas formado por individuos unidos, y primordialment<img class="image_resized image-style-align-left" style="aspect-ratio:1120/643;width:38.92%;" src="http://localhost:1337/uploads/paseo_campo_ac24fc681a.png" alt="paseo-campo.png" srcset="http://localhost:1337/uploads/thumbnail_paseo_campo_ac24fc681a.png 245w,http://localhost:1337/uploads/small_paseo_campo_ac24fc681a.png 500w,http://localhost:1337/uploads/medium_paseo_campo_ac24fc681a.png 750w,http://localhost:1337/uploads/large_paseo_campo_ac24fc681a.png 1000w," sizes="100vw" width="1120" height="643">e vinculados por relaciones de filiación o de pareja.[1]​ El Diccionario de la lengua española la define, entre otras cosas, como un grupo de personas emparentadas entre sí que viven juntas, lo que lleva implícito los conceptos de parentesco y convivencia.[2]​ Según la Declaración Universal de los Derechos Humanos, es el elemento natural, universal y fundamental de la sociedad, tiene derecho a la protección de la sociedad y del Estado.[3]​</p><p>Los lazos principales que definen una familia son de dos tipos: vínculos de afinidad derivados del establecimiento de un vínculo reconocido socialmente, como el matrimonio[4]​ —que, en algunas sociedades, solo permite la unión entre dos personas mientras que en otras es posible la poligamia—, y vínculos de consanguinidad, como la filiación entre padres e hijos o los lazos que se establecen entre los hermanos que descienden de un mismo padre. También puede diferenciarse la familia según el grado de parentesco entre sus miembros.</p>	[{"type": "heading", "level": 3, "children": [{"text": "MISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres tiene como misión formar técnicos competentes, emprendedores y con valores, capaces de responder a las necesidades del mundo laboral y social. Brindamos una educación técnico-productiva de calidad, orientada a la práctica, la innovación y el desarrollo de habilidades que permitan a nuestros estudiantes alcanzar autonomía económica y profesional. Promovemos la responsabilidad, la creatividad y el liderazgo, impulsando el espíritu emprendedor y el compromiso con la comunidad, para contribuir al progreso individual y al bienestar colectivo.", "type": "text"}]}, {"type": "heading", "level": 3, "children": [{"text": "VISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres se proyecta como una institución líder en la formación técnico-productiva, reconocida por la excelencia académica y la innovación en sus programas. Aspiramos a ser un referente en la formación de técnicos emprendedores, preparados para enfrentar los retos de un mundo globalizado y tecnológico. Nuestra visión es consolidarnos como un espacio de aprendizaje integral que fomente la empleabilidad, el autoempleo y el emprendimiento sostenible, contribuyendo al desarrollo económico y social de nuestro entorno y del país.", "type": "text"}]}]
\.

COPY public.publicaciones_cmps (id, entity_id, cmp_id, component_type, field, "order") FROM stdin;
\.

COPY public.sectores (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, descripcion) FROM stdin;
1	ksic21k90iexd2qj76s9f55v	2025-05-28 15:43:06.571	2025-05-28 15:43:06.571	2025-05-28 15:43:06.564	1	1	\N	OTRAS ACTIVIDADES DE SERVICIOS	\N
2	joqs621wwvbggyslc432y87r	2025-05-28 15:43:23.45	2025-05-28 15:43:23.45	2025-05-28 15:43:23.444	1	1	\N	ELECTRICIDAD, GAS Y AGUA	\N
3	pkt3aj0zjh0oybbdi971c1yz	2025-05-28 15:43:37.578	2025-05-28 15:43:37.578	2025-05-28 15:43:37.574	1	1	\N	INFORMACIÓN Y COMUNICACIONES	\N
4	n54ledd28nu6944zlgvu7g01	2025-05-28 15:43:53.091	2025-05-28 15:44:19.609	2025-05-28 15:44:19.558	1	1	\N	INDUSTRIAS MANUFACTURERAS	\N
\.

COPY public.semestres (id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, titulo, descripcion, archivado) FROM stdin;
1	pt5yevsoi7s95e6hfn2daw8y	2025-05-29 14:25:37.223	2025-06-10 13:39:48.163	2025-06-10 13:39:48.16	1	1	\N	2025-1	\N	f
2	mryevrg1hc9si9qn3mhnfzec	2025-05-29 14:25:56.805	2025-06-20 11:51:09.156	2025-06-20 11:51:09.153	1	1	\N	2025-2	\N	t
\.

COPY public.semestres_coordinador_1_lnk (id, semestre_id, personal_id) FROM stdin;
1	1	4
2	2	4
\.

COPY public.semestres_coordinador_2_lnk (id, semestre_id, personal_id) FROM stdin;
1	1	1
2	2	3
\.

COPY public.semestres_director_lnk (id, semestre_id, personal_id) FROM stdin;
1	1	3
2	2	1
\.

COPY public.users (id, document_id, dni, telefono, created_at, updated_at, published_at, created_by_id, updated_by_id, locale, username, email, provider, password, reset_password_token, confirmation_token, confirmed, blocked, direccion, fecha_nacimiento, celular, distrito, tipo_documento, sexo, estado_civil, instruccion, apellido_materno, apellido_paterno, nombre, apellidos, avatar) FROM stdin;
7	ji7fnbke040ltkunbbzaeh97	69587589	\N	2025-05-31 23:33:00.094	2025-05-31 23:33:00.094	2025-05-31 23:32:59.975	1	1	\N	Manuel Quispe	manuel@gmail.com	local	$2a$10$CZB3uu75uAO2TZs5AWsDhOFbAiiXviAFCAI7jmYVE1dbWzU2xCmZ2	\N	\N	t	f	\N	2000-10-21	962325873	\N	DNI	M	\N	\N	Aliaga	Quipe	Manuel Jesús	\N	\N
8	ylx21hugj011wbivzlmlu3gz	14698579	\N	2025-06-01 12:12:08.659	2025-06-01 12:12:08.659	2025-06-01 12:12:08.546	1	1	\N	Margarita Postillon	margarita@gmail.com	local	$2a$10$0wM17Pfcp1gOQznfYxhidOj1OnWQCpHNNStLf9mQYYxx9N/PUKL1a	\N	\N	t	f	\N	\N	963232587	\N	DNI	\N	\N	\N	Vega	Postillon	Margarita Liliana	\N	\N
6	kfzpyy7v08fkgajxmhew1o9q	10698579	\N	2025-05-30 16:12:03.653	2025-06-10 13:04:39.086	2025-06-10 13:04:39.061	1	2	\N	Marco Palomino	enkee03@gmail.com	local	$2a$10$86gwVMI.CSZEaEXuRItugO8BOZEXdRDS.h4XwtF8lhPzacj45GuRe	\N	\N	t	f	\N	\N	963232358	\N	DNI	\N	\N	\N	Horna	Palomino	Marco Polo	\N	\N
9	hut66giaazya8gpoe3rbt72b	10000010	941689574	2025-06-20 13:45:12.017	2025-07-05 15:32:02.351	2025-06-20 13:45:12.021	\N	\N	\N	Alberto Jimmy Adama Hilario	10000010@cetprosmp.edu.pe	google	\N	\N	\N	t	f	Jr. Las Grullas 1135 Santa Anita	1977-11-01	941689574	\N	DNI	\N	Soltero	Superior	\N	\N	Alberto Jimmy	Adama Hilario	https://lh3.googleusercontent.com/a-/ALV-UjWQ6MHjheOGcwF7zlQq5syMv1wwasbs2L2Rs4jXEFu-P8vPrS4=s96-c
12	em3qww97h0321whpowpqmzup	epalomin	\N	2025-06-29 13:21:52.125	2025-08-14 00:13:33.184	2025-06-29 13:21:52.135	\N	\N	\N	Enrique Rafael Palomino Horna	epalominoh@cetprosmp.edu.pe	google	\N	\N	\N	t	f		\N	941689574	\N	DNI	\N			\N	\N	Enrique Rafael	Palomino Horna	https://lh3.googleusercontent.com/a-/ALV-UjWBcAZg3CZKv-EEYeMWK8htvd_YZARktO1ZH96jjiVw7iyxlgE=s96-c
10	d7pin51shj5oejzyn7sdol3t	enkee03@		2025-06-20 14:01:27.966	2025-08-14 00:18:02.399	2025-06-20 14:01:27.967	\N	\N	\N	Enrique Rafael Palomino Horna	enkee03@cetprosmp.edu.pe	google	\N	\N	\N	t	f		\N		\N	DNI	\N			\N	\N	Enrique Rafael	Palomino Horna	https://lh3.googleusercontent.com/a-/ALV-UjXV5jenZ71qCyXVDnoRVStcdR4qRQocWbv6e5Qkzbc-vW2FEea_=s96-c
11	s3j2dgy7iejsm1xrkj2aeli1	11111111		2025-06-20 15:23:01.845	2025-07-05 14:35:22.965	2025-06-20 15:23:01.847	\N	\N	\N	Octavio Horna Palomino	11111111@cetprosmp.edu.pe	google	\N	\N	\N	t	f		\N		\N	DNI	\N			\N	\N	Octavio	Horna Palomino	https://lh3.googleusercontent.com/a-/ALV-UjVF5mdDlo1GrbBEGXT9XHMEp2sEighIcyLVk_G4J4j7Pu5nSeE=s96-c
\.


-- Ajuste de secuencias.
SELECT pg_catalog.setval('public.act_economicas_especialidad_lnk_id_seq', 9, true);
SELECT pg_catalog.setval('public.act_economicas_familia_lnk_id_seq', 9, true);
SELECT pg_catalog.setval('public.calendarios_id_seq', 9, true);
SELECT pg_catalog.setval('public.calendarios_semestre_lnk_id_seq', 10, true);
SELECT pg_catalog.setval('public.carreras_act_economica_lnk_id_seq', 15, true);
SELECT pg_catalog.setval('public.carreras_id_seq', 15, true);
SELECT pg_catalog.setval('public.components_video_youtubes_id_seq', 2, true);
SELECT pg_catalog.setval('public.dato_general_id_seq', 1, true);
SELECT pg_catalog.setval('public.especialidades_id_seq', 8, true);
SELECT pg_catalog.setval('public.familias_id_seq', 7, true);
SELECT pg_catalog.setval('public.familias_sector_lnk_id_seq', 7, true);
SELECT pg_catalog.setval('public.grupos_calendario_lnk_id_seq', 33, true);
SELECT pg_catalog.setval('public.grupos_id_seq', 22, true);
SELECT pg_catalog.setval('public.grupos_modulo_lnk_id_seq', 38, true);
SELECT pg_catalog.setval('public.grupos_personal_lnk_id_seq', 18, true);
SELECT pg_catalog.setval('public.matriculas_grupo_lnk_id_seq', 1, true);
SELECT pg_catalog.setval('public.matriculas_id_seq', 2, true);
SELECT pg_catalog.setval('public.matriculas_paquete_lnk_id_seq', 1, true);
SELECT pg_catalog.setval('public.matriculas_users_lnk_id_seq', 2, true);
SELECT pg_catalog.setval('public.modulos_carrera_lnk_id_seq', 34, true);
SELECT pg_catalog.setval('public.modulos_cmps_id_seq', 24, true);
SELECT pg_catalog.setval('public.modulos_id_seq', 32, true);
SELECT pg_catalog.setval('public.paquetes_grupos_lnk_id_seq', 54, true);
SELECT pg_catalog.setval('public.paquetes_id_seq', 14, true);
SELECT pg_catalog.setval('public.personales_especialidad_lnk_id_seq', 14, true);
SELECT pg_catalog.setval('public.personales_id_seq', 4, true);
SELECT pg_catalog.setval('public.personales_user_lnk_id_seq', 11, true);
SELECT pg_catalog.setval('public.publicaciones_cmps_id_seq', 1, false);
SELECT pg_catalog.setval('public.publicaciones_id_seq', 23, true);
SELECT pg_catalog.setval('public.sectores_id_seq', 4, true);
SELECT pg_catalog.setval('public.semestres_coordinador_1_lnk_id_seq', 2, true);
SELECT pg_catalog.setval('public.semestres_coordinador_2_lnk_id_seq', 2, true);
SELECT pg_catalog.setval('public.semestres_director_lnk_id_seq', 2, true);
SELECT pg_catalog.setval('public.semestres_id_seq', 2, true);
SELECT pg_catalog.setval('public.users_id_seq', 12, true);
SELECT pg_catalog.setval('public.users_role_lnk_id_seq', 9, true);

COMMIT;
