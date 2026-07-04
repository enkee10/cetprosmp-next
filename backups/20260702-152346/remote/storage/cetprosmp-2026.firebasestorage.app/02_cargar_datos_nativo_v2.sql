-- Datos transformados desde Strapi hacia estructura nativa Data Connect.
BEGIN;

INSERT INTO public."users" (id, document_id, username, email, provider, confirmed, blocked, dni, tipo_documento, nombre, apellidos, apellido_paterno, apellido_materno, sexo, estado_civil, instruccion, fecha_nacimiento, direccion, distrito, telefono, celular, avatar) VALUES
  (7, 'ji7fnbke040ltkunbbzaeh97', 'Manuel Quispe', 'manuel@gmail.com', 'local', TRUE, FALSE, '69587589', 'DNI', 'Manuel Jesús', NULL, 'Quipe', 'Aliaga', 'M', NULL, NULL, '2000-10-21', NULL, NULL, NULL, '962325873', NULL),
  (8, 'ylx21hugj011wbivzlmlu3gz', 'Margarita Postillon', 'margarita@gmail.com', 'local', TRUE, FALSE, '14698579', 'DNI', 'Margarita Liliana', NULL, 'Postillon', 'Vega', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '963232587', NULL),
  (6, 'kfzpyy7v08fkgajxmhew1o9q', 'Marco Palomino', 'enkee03@gmail.com', 'local', TRUE, FALSE, '10698579', 'DNI', 'Marco Polo', NULL, 'Palomino', 'Horna', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '963232358', NULL),
  (9, 'hut66giaazya8gpoe3rbt72b', 'Alberto Jimmy Adama Hilario', '10000010@cetprosmp.edu.pe', 'google', TRUE, FALSE, '10000010', 'DNI', 'Alberto Jimmy', 'Adama Hilario', NULL, NULL, NULL, 'Soltero', 'Superior', '1977-11-01', 'Jr. Las Grullas 1135 Santa Anita', NULL, '941689574', '941689574', 'https://lh3.googleusercontent.com/a-/ALV-UjWQ6MHjheOGcwF7zlQq5syMv1wwasbs2L2Rs4jXEFu-P8vPrS4=s96-c'),
  (12, 'em3qww97h0321whpowpqmzup', 'Enrique Rafael Palomino Horna', 'epalominoh@cetprosmp.edu.pe', 'google', TRUE, FALSE, 'epalomin', 'DNI', 'Enrique Rafael', 'Palomino Horna', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '941689574', 'https://lh3.googleusercontent.com/a-/ALV-UjWBcAZg3CZKv-EEYeMWK8htvd_YZARktO1ZH96jjiVw7iyxlgE=s96-c'),
  (10, 'd7pin51shj5oejzyn7sdol3t', 'Enrique Rafael Palomino Horna', 'enkee03@cetprosmp.edu.pe', 'google', TRUE, FALSE, 'enkee03@', 'DNI', 'Enrique Rafael', 'Palomino Horna', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://lh3.googleusercontent.com/a-/ALV-UjXV5jenZ71qCyXVDnoRVStcdR4qRQocWbv6e5Qkzbc-vW2FEea_=s96-c'),
  (11, 's3j2dgy7iejsm1xrkj2aeli1', 'Octavio Horna Palomino', '11111111@cetprosmp.edu.pe', 'google', TRUE, FALSE, '11111111', 'DNI', 'Octavio', 'Horna Palomino', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://lh3.googleusercontent.com/a-/ALV-UjVF5mdDlo1GrbBEGXT9XHMEp2sEighIcyLVk_G4J4j7Pu5nSeE=s96-c');

INSERT INTO public."sectores" (id, titulo, descripcion) VALUES
  (1, 'OTRAS ACTIVIDADES DE SERVICIOS', NULL),
  (2, 'ELECTRICIDAD, GAS Y AGUA', NULL),
  (3, 'INFORMACIÓN Y COMUNICACIONES', NULL),
  (4, 'INDUSTRIAS MANUFACTURERAS', NULL);

INSERT INTO public."familias" (id, titulo, descripcion, sector_id) VALUES
  (1, 'SERVICIOS PERSONALES Y DE HOGARES', NULL, 1),
  (2, 'ENERGÍA, AGUA, Y SANEAMIENTO', NULL, 2),
  (3, 'TECNOLOGIAS DE LA INFORMACIÓN Y COMUNICACIONES – TIC’s', NULL, 3),
  (4, 'INDUSTRIA TEXTIL, CONFECCIÓN Y DEL CUERO', NULL, 4),
  (5, 'INDUSTRIA DIVERSAS', NULL, 4),
  (6, 'INDUSTRIA ALIMENTARIA BEBIDA Y TABACO', NULL, 4),
  (7, 'INDUSTRIA DE LA MADERA Y MUEBLES', NULL, 4);

INSERT INTO public."act_economicas" (id, titulo, descripcion, familia_id, especialidad_id) VALUES
  (1, 'OTRAS ACTIVIDADES DE SERVICIOS PERSONALES  ', NULL, 1, 1),
  (2, 'REPARACIÓN DE ORDENADORES Y DE EFECTOS Y ENSERES DOMÉSTICOS', NULL, 1, 2),
  (3, 'SUMINISTRO DE ELECTRICIDAD, GAS, VAPOR Y AIRE ACONDICIONADO', NULL, 2, 2),
  (4, 'PROGRAMACIÓN INFORMÁTICA, CONSULTORÍA DE INFORMÁTICA Y ACTIVIDADES CONEXAS', NULL, 3, 3),
  (5, 'FABRICACION DE PRENDAS DE VESTIR', NULL, 4, 4),
  (6, 'FABRICACION DE PRODUCTOS DE CUERO Y PRODUCTOS CONEXOS', NULL, 4, 5),
  (7, 'OTRAS INDUSTRIAS MANUFACTURERA', NULL, 5, 6),
  (8, 'ELABORACIÓN DE PRODUCTOS ALIMENTICIOS', NULL, 6, 7),
  (9, 'PRODUCCIÓN DE MADERA Y FABRICACIÓN DE PRODUCTOS DE MADERA Y CORCHO, EXCEPTO MUEBLES, FABRICACIÓN DE ARTÍCULOS DE PAJA Y DE MATERIALES TRENSABLES', NULL, 7, 8);

INSERT INTO public."especialidades" (id, titulo, titulo_comercial, descripcion, descripcion_2, slug, act_economica_id) VALUES
  (1, 'Estética Personal', 'Estética Personal', NULL, '[{"type": "paragraph", "children": [{"text": "Solanum tuberosum, de nombre común patata (en la mayor parte de España, Filipinas y Guinea Ecuatorial) o papa (en Hispanoamérica y en las Islas Canarias)[1]​ [2]​", "type": "text"}]}]', 'estetica-personal', 1),
  (2, 'Electricidad y Electrónica', 'Electricidad y Electrónica', NULL, NULL, 'electricidad-electronica', 2),
  (4, 'Textil y Confección', 'Confección Textil', NULL, NULL, 'confeccion-textil', 5),
  (5, 'Cuero y Calzado', 'Cuero y Calzado', NULL, NULL, 'cuero-calzado', 6),
  (6, 'Artesanía y Manualidades', 'Manualidades', NULL, NULL, 'manualidades', 7),
  (7, 'Hostelería y Turismo', 'Hostelería y Turismo', NULL, NULL, 'hosteleria-turismo', 8),
  (8, 'Carpintería', 'Carpintería', NULL, NULL, 'carpinteria', 9),
  (3, 'Computación e Informática', 'Computación', '<p data-start="273" data-end="636">La especialidad de Computación del CETPRO San Martín de Porres ofrece una formación técnica integral orientada a las exigencias del mercado laboral actual. Nuestro objetivo es preparar a los estudiantes para desempeñarse con eficiencia en diversas áreas de la tecnología, brindándoles una base sólida tanto en conocimientos teóricos como en habilidades prácticas.</p><p data-start="638" data-end="1115">A lo largo de la formación, los estudiantes desarrollan competencias en cuatro módulos especializados. En el módulo de <strong data-start="757" data-end="782">Soporte Técnico de PC</strong>, aprenden a ensamblar computadoras, instalar y configurar sistemas operativos, dar mantenimiento preventivo y correctivo, y solucionar fallas comunes de hardware y software. Además, se introducen en el manejo básico de redes y en buenas prácticas de seguridad informática, habilidades muy valoradas en empresas y servicios técnicos.</p><p data-start="1117" data-end="1488">En el módulo de <strong data-start="1133" data-end="1174">Aplicativos Informáticos de Ofimática</strong>, se entrenan en el uso profesional de herramientas como Microsoft Word, Excel, PowerPoint y otras plataformas colaborativas. Se enfatiza la creación de documentos formales, hojas de cálculo con funciones automatizadas, presentaciones efectivas y el manejo de datos, esenciales en cualquier entorno administrativo.</p><p data-start="1490" data-end="1828">El módulo de <strong data-start="1503" data-end="1534">Diseño Gráfico Publicitario</strong> desarrolla la creatividad del estudiante mediante el uso de programas como Photoshop y Corel Draw. Se enseña a crear piezas gráficas para medios impresos y digitales, como logotipos, afiches, banners y contenido visual para redes sociales, aplicando principios de diseño, color y composición.</p><p data-start="1830" data-end="2157">Finalmente, el módulo de <strong data-start="1855" data-end="1884">Diseño y Programación Web</strong> introduce al estudiante en el mundo del desarrollo web. Se aprenden lenguajes como HTML, CSS y JavaScript, así como el uso de gestores de contenido, permitiendo crear sitios web modernos, responsivos y funcionales, adaptados a las necesidades actuales del entorno digital.</p>', '[{"type": "paragraph", "children": [{"text": "La especialidad de Computación del CETPRO San Martín de Porres ofrece una formación técnica integral orientada a las exigencias del mercado laboral actual. Nuestro objetivo es preparar a los estudiantes para desempeñarse con eficiencia en diversas áreas de la tecnología, brindándoles una base sólida tanto en conocimientos teóricos como en habilidades prácticas.", "type": "text"}]}, {"type": "list", "format": "ordered", "children": [{"type": "list-item", "children": [{"text": "A lo largo de la formación, los estudiantes desarrollan competencias en cuatro módulos especializados. ", "type": "text"}, {"bold": true, "text": "En el módulo de Soporte Técnico de PC", "type": "text"}, {"text": ", aprenden a ensamblar computadoras, instalar y configurar sistemas operativos, dar mantenimiento preventivo y correctivo, y solucionar fallas comunes de hardware y software. Además, se introducen en el manejo básico de redes y en buenas prácticas de seguridad informática, habilidades muy valoradas en empresas y servicios técnicos.", "type": "text"}]}]}, {"type": "list", "format": "unordered", "children": [{"type": "list-item", "children": [{"text": "En el ", "type": "text"}, {"bold": true, "text": "módulo de Aplicativos Informáticos de Ofimática", "type": "text"}, {"text": ", se entrenan en el uso profesional de herramientas como Microsoft Word, Excel, PowerPoint y otras plataformas colaborativas. Se enfatiza la creación de documentos formales, hojas de cálculo con funciones automatizadas, presentaciones efectivas y el manejo de datos, esenciales en cualquier entorno administrativo.", "type": "text"}]}]}, {"type": "paragraph", "children": [{"text": "El ", "type": "text"}, {"bold": true, "text": "módulo de Diseño Gráfico Publicitario", "type": "text"}, {"text": " desarrolla la creatividad del estudiante mediante el uso de programas como Photoshop e Illustrator. Se enseña a crear piezas gráficas para medios impresos y digitales, como logotipos, afiches, banners y contenido visual para redes sociales, aplicando principios de diseño, color y composición.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Finalmente, el ", "type": "text"}, {"bold": true, "text": "módulo de Diseño y Programación Web", "type": "text"}, {"text": " introduce al estudiante en el mundo del desarrollo web. Se aprenden lenguajes como HTML, CSS y JavaScript, así como el uso de gestores de contenido, permitiendo crear sitios web modernos, responsivos y funcionales, adaptados a las necesidades actuales del entorno digital.", "type": "text"}]}]', 'computacion', 4);

INSERT INTO public."carreras" (id, titulo, codigo, descripcion, duracion, creditos, nivel, titulo_comercial, slug, descripcion_2, act_economica_id) VALUES
  (2, 'Electrónica', NULL, NULL, '1000', NULL, 'Auxiliar Técnico', 'Electrónica', 'electronica', NULL, 2),
  (3, 'Mantenimiento Básico de Sistemas Eléctricos', NULL, NULL, '1000', NULL, 'Auxiliar Técnico', 'Mantenimiento Básico de Sistemas Eléctricos', 'mantenimiento-electronico', NULL, 3),
  (4, 'Soporte técnico y operaciones de centros de cómputo', 'J2662-1-001', NULL, '1056', 40, 'Auxiliar Técnico', 'Soporte técnico de computadoras', 'soporte-computadoras', NULL, 4),
  (5, 'Operación de Computadoras', NULL, NULL, '1000', NULL, 'Auxiliar Técnico', 'Operación de Computadoras', 'operaciones-computadoras', NULL, 4),
  (6, 'Corte y Ensamblaje', 'CO714-1-003', NULL, '1056', 40, 'Auxiliar Técnico', 'Corte y Ensamblaje', 'corte-ensamblaje', NULL, 5),
  (7, 'Costura y Acabados', 'CO714-1-004', NULL, '1056', 40, 'Auxiliar Técnico', 'Costura y Acabados', 'costura-acabados', NULL, 5),
  (8, 'Bordado de prendas de vestir', 'C0714-1-002', NULL, '1056', 40, 'Auxiliar Técnico', 'Bordado en prendas de vestir', 'bordados-prendas', NULL, 5),
  (9, 'Confección Textil', NULL, NULL, '1000', NULL, 'Auxiliar Técnico', 'Confección Textil', 'confeccion-textil', NULL, 5),
  (10, 'Confección de calzado', 'C0715-1-001', NULL, '1056', 40, 'Auxiliar Técnico', 'Confección de calzado', 'confeccion-calzado', NULL, 6),
  (11, 'Confección de Artículos de Cuero y Marroquinería', 'C0715-1-002', NULL, '1056', 40, 'Auxiliar Técnico', 'Artículos de Cuero y Marroquinería', 'cuero-marroquineria', NULL, 6),
  (12, 'Manualidades', NULL, NULL, '1000', NULL, 'Auxiliar Técnico', 'Manualidades', 'manualidades', NULL, 7),
  (13, 'Panadería y Pastelería', 'C0610-1-001', NULL, '1056', 40, 'Auxiliar Técnico', 'Panadería y Pastelería', 'panaderia-pasteleria', NULL, 8),
  (14, 'Asistencia en Pastelería y Panadería', NULL, NULL, '1000', NULL, 'Auxiliar Técnico', 'Asistencia en Pastelería y Panadería', 'asistente-panaderia-pasteleria', NULL, 8),
  (15, 'Mantenimiento Básico de Casas y Edificios', NULL, NULL, '1000', NULL, 'Auxiliar Técnico', 'Mantenimiento Básico de Casas y Edificios', 'mantenimiento-casas-edificios', NULL, 9),
  (1, 'Peluquería y Barberia', 'S3496-1-001', NULL, '1056', 40, 'Auxiliar Técnico', 'Peluquería y Barberia', 'peluqueria-barberia', NULL, 1);

INSERT INTO public."modulos" (id, titulo, titulo_comercial, orden, descripcion, horas, creditos, metas, activo, slug, descripcion_2, carrera_id) VALUES
  (23, 'Pintura Decorativa', 'Pintura Decorativa', 3, NULL, 150, NULL, 15, TRUE, 'pintura-decorativa', NULL, 12),
  (24, 'Cerámica al Frio', 'Cerámica al Frio', 4, NULL, 150, NULL, 15, TRUE, 'ceramica-al-frio', NULL, 12),
  (25, 'Acondicionamiento y Elaboración de Productos de Panadería y Pastelería', 'Productos Pastelería y Panadería 1', 1, NULL, 528, 20, 15, TRUE, 'acondicionamiento-preparacion-panaderia-pasteleria', NULL, 13),
  (26, 'Decoración y Presentación de los Productos de Panadería y Pastelería', 'Productos Pastelería y Panadería 2', 2, NULL, 528, 20, 15, TRUE, 'decoracion-presentacion-panaderia-pasteleria', NULL, 13),
  (27, 'Técnicas de Decoración de Tortas', 'Técnicas de Decoración de Tortas', 1, NULL, 300, NULL, 15, TRUE, 'decoracion-tortas', NULL, 14),
  (28, 'Buffet', 'Buffet', 2, NULL, 300, NULL, 15, TRUE, 'buffet', NULL, 14),
  (29, 'Cocina Nacional', 'Cocina Nacional', 3, NULL, 300, NULL, 15, TRUE, 'cocina-nacional', NULL, 14),
  (30, 'Técnicas Culinarias', 'Técnicas Culinarias', 4, NULL, 300, NULL, 15, TRUE, 'tecnicas-culinarias', NULL, 14),
  (31, 'Mantenimiento de Carpintería', 'Carpintería en Madera', 1, NULL, 300, NULL, 15, TRUE, 'carpinteria-madera', NULL, 15),
  (32, 'Confección de Muebles en Melamina', 'Carpintería en Melamina', 2, NULL, 300, NULL, 15, TRUE, 'carpinteria-melamine', NULL, 15),
  (1, 'Corte De Cabello, Barba y Peinado', 'Corte De Cabello, Barba y Peinado', 1, NULL, 528, 20, 15, TRUE, 'corte-barba-peinado', NULL, 1),
  (11, 'Técnicas de Confección de Prendas de Vestir', 'Técnicas de Confección de Prendas de Vestir', 2, NULL, 544, 19, 15, TRUE, 'confeccion-prendas-vestir', NULL, 6),
  (12, 'Técnicas de Confección de Prendas de Vestir', 'Oper. Maquinas, Conf. Prendas Damas, Niños, Deportivas', 2, NULL, 544, 21, 15, TRUE, 'operatividad-confeccion-damas-ninios-deportiva', NULL, 7),
  (13, 'Técnicas de Procesos de Acabados en Prendas de Vestir', 'Técnicas de Procesos de Acabados en Prendas de Vestir', 2, NULL, 528, 19, 15, TRUE, 'tecnicas-acabados-prendas-vestir', NULL, 7),
  (2, 'Tratamiento Capilar, Coloración, Ondulación y Laceado ', 'Tratamiento Capilar, Trituración, Ondulación, Laceado', 2, NULL, 528, 20, 15, TRUE, 'capilar-coloracion-ondulacion-laceado', NULL, 1),
  (3, 'Mantenimiento de Teléfonos Celulares', 'Reparacion de Celulares', 1, NULL, 300, NULL, 15, TRUE, 'reparacion-celulares', NULL, 2),
  (4, 'Mantenimiento de Instalaciones Eléctricas Domiciliarias ', 'Instalaciones Eléctricas', 2, NULL, 300, NULL, 15, TRUE, 'intalaciones-electricas', NULL, 3),
  (5, 'Atención de Incidentes y Problemas de Operatividad en El Centro de Cómputo', 'Atención De Incidentes y Problemas de Operatividad en El Centro de Cómputo', 1, NULL, 528, 20, 15, TRUE, 'incidentes-operatividad-computo', NULL, 4),
  (6, 'Monitoreo y Acciones de Mantenimiento de Centros de Cómputo', 'Monitoreo y Acciones de Mantenimiento de Centros de Cómputo', 2, NULL, 528, 20, 15, TRUE, 'monitoreo-mantenimiento-computo', NULL, 4),
  (7, 'Ofimática', 'Ofimática', 1, NULL, 300, NULL, 15, TRUE, 'ofimatica', NULL, 5),
  (8, 'Diseño Publicitario', 'Diseño Publicitario', 2, NULL, 300, NULL, 15, TRUE, 'disenio-publicitario', NULL, 5),
  (9, 'Diseño Web', 'Diseño Web', 3, NULL, 300, NULL, 15, TRUE, 'disenio-web', NULL, 5),
  (10, 'Técnicas de Tizado, Tendido y Corte de Prendas de Vestir', 'Técnicas de Tizado, Tendido y Corte de Prendas de Vestir', 1, NULL, 560, 21, 15, TRUE, 'tizado-tendido-corte', NULL, 6),
  (14, 'Bordados Computarizado', 'Bordados Computarizado', 1, NULL, 528, 20, 15, TRUE, 'bordado-computarizado', NULL, 8),
  (15, 'Tejido a Maquina', 'Tejido a Maquina', 1, NULL, 300, NULL, 15, TRUE, 'tejido-maquina', NULL, 9),
  (16, 'Tejido a Mano', 'Tejido a Mano', 2, NULL, 300, NULL, 15, TRUE, 'tejido-mano', NULL, 9),
  (18, 'Ensamblado y Acabado de Artículos de Cuero', 'Ensamblado y Acabado de Artículos de Cuero', 2, NULL, 528, 20, 15, TRUE, 'ensamblado-acabado-articulos-cuero', NULL, 11),
  (17, 'Diseño y Corte de Articulos de Cuero', 'Patronaje y Corte de Artículos de Cuero y Marroquinería', 1, NULL, 528, 20, 15, TRUE, 'disenio-corte-articulos-cuero', NULL, 11),
  (19, 'Diseño y Corte de Calzado', 'Patronaje y Corte de Calzado', 1, NULL, 528, 20, 15, TRUE, 'disenio-corte-calzado', NULL, 10),
  (20, 'Aparado, Armado y Acabado de Calzado', 'Aparado, Armado y Acabado de Calzado', 2, NULL, 528, 20, 15, TRUE, 'aparado-armado-acabado-calzado', NULL, 10),
  (21, 'Decoración de Eventos Especiales', 'Decoración de Eventos Especiales', 1, NULL, 300, NULL, 15, TRUE, 'decoracion-eventos-especiales', NULL, 12),
  (22, 'Bisuterías', 'Bisutería', 2, NULL, 150, NULL, 15, TRUE, 'bisuteria', NULL, 12);

INSERT INTO public."personales" (id, display_name, memo, user_id) VALUES
  (3, 'Manuel Quispe', '<p>Mi reseña</p>', 7),
  (4, 'Margarita Postillon', NULL, 8),
  (1, 'Marco Palomino', '<p>Este es su trayector</p>', 6);

INSERT INTO public."personal_especialidades" (id, personal_id, especialidad_id, orden) VALUES
  (10, 3, 8, 1),
  (12, 3, 6, 2),
  (13, 4, 4, 0),
  (9, 1, 5, 1),
  (14, 1, 8, 2);

INSERT INTO public."semestres" (id, titulo, descripcion, archivado, director_id, coordinador_1_id, coordinador_2_id) VALUES
  (1, '2025-1', NULL, FALSE, 3, 4, 1),
  (2, '2025-2', NULL, TRUE, 1, 4, 3);

INSERT INTO public."calendarios" (id, titulo, descripcion, fecha_ini, fecha_fin, tipo, archivado, semestre_id) VALUES
  (9, '150 horas [lu, mi, vi@]', '<h1 style="margin-left:40px;text-align:justify;">Titulo 1</h1><figure class="image image_resized image-style-align-left" style="width:29.86%;"><img src="http://localhost:1337/uploads/paseo_campo_ac24fc681a.png" alt="paseo-campo.png" srcset="http://localhost:1337/uploads/thumbnail_paseo_campo_ac24fc681a.png 245w, http://localhost:1337/uploads/small_paseo_campo_ac24fc681a.png 500w, http://localhost:1337/uploads/medium_paseo_campo_ac24fc681a.png 750w, http://localhost:1337/uploads/large_paseo_campo_ac24fc681a.png 1000w" sizes="100vw" width="1000"><figcaption>Family<a target="_blank" rel="noopener noreferrer" href="https://www.america.com">https://www.america.com</a></figcaption></figure><p style="margin-left:40px;text-align:justify;"><span style="font-family:Tahoma, Geneva, sans-serif;">Este es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo es un texto repetitivo.</span></p><figure class="table" style="width:66.38%;"><table class="ck-table-resized"><colgroup><col style="width:10.89%;"><col style="width:48.92%;"><col style="width:18.87%;"><col style="width:21.32%;"></colgroup><tbody><tr><td><p style="text-align:center;">Hola</p></td><td><p style="text-align:center;">Nombres y Apellidos</p></td><td><p style="text-align:center;">Edad</p></td><td><p style="text-align:center;">Sexo</p></td></tr><tr><td>1</td><td>Enrique</td><td>18</td><td>M</td></tr><tr><td>2</td><td>María</td><td>16</td><td>F</td></tr></tbody></table><figcaption>Dime que no</figcaption></figure><ol><li>Lima </li><li>peru</li><li>lito</li></ol><p>Continuamos el texto</p><ul><li>Esto es o no es</li><li>Esto Tambien</li><li>Lindo que sepas</li></ul><ul class="todo-list"><li><label class="todo-list__label"><input type="checkbox" disabled="disabled"><span class="todo-list__label__description">Hola&nbsp;</span></label></li><li><label class="todo-list__label"><input type="checkbox" disabled="disabled"><span class="todo-list__label__description">Moda</span></label></li><li><label class="todo-list__label"><input type="checkbox" disabled="disabled"><span class="todo-list__label__description">Meta</span></label></li></ul><p>&nbsp;</p><p><a target="_blank" rel="noopener noreferrer" href="https://www.america.com.pe">digo no</a>₲</p><hr><div class="page-break" style="page-break-after:always;"><span style="display:none;">&nbsp;</span></div><p>&nbsp;</p>', '2025-08-11', '2025-12-23', 'Academico', TRUE, 2),
  (1, '528 horas [Lu - Vi]', NULL, '2025-03-17', '2025-07-22', 'Academico', FALSE, 1),
  (2, '512 horas [Lu - Vi]', NULL, '2025-03-17', '2025-07-18', 'Academico', FALSE, 1),
  (3, '150 horas [Lu, Mi, Vi@] (1)', NULL, '2025-03-17', '2025-05-21', 'Academico', FALSE, 1),
  (4, '150 horas [Ma, Ju, Vi@] (1)', NULL, '2025-03-18', '2025-05-22', 'Academico', FALSE, 1),
  (5, '150 horas [Lu, Mi, Vi@] (2)', NULL, '2025-05-26', '2025-07-25', 'Academico', FALSE, 1),
  (6, '150 horas [Ma, Ju, Vi@] (2)', NULL, '2025-05-23', '2025-07-24', 'Academico', FALSE, 1),
  (8, '300 horas [Ma, Ju, Vi@]', NULL, '2025-03-18', '2025-07-24', 'Academico', FALSE, 1),
  (7, '300 horas [Lu, Mi, Vi@]', NULL, '2025-03-17', '2025-07-25', 'Academico', FALSE, 1);

INSERT INTO public."grupos" (id, turno, descripcion, nombre_display, archivado, modulo_id, calendario_id, personal_id) VALUES
  (21, 'Tarde', NULL, 'Bisutería  [Tarde]  lu, mi, vi@  (Marco Palomino)', TRUE, 22, 9, 1),
  (22, 'Tarde', NULL, 'Cerámica al Frio  [Tarde]  lu, mi, vi@  (Manuel Quispe)', TRUE, 24, 9, 3),
  (19, 'Mañana', NULL, 'Bisutería  [Mañana]  Ma, Ju, Vi@  (Margarita Postillon)', FALSE, 22, 4, 4),
  (20, 'Noche', NULL, 'Cocina Nacional  [Noche]  Ma, Ju, Vi@  (Marco Palomino)', FALSE, 29, 8, 1);

INSERT INTO public."paquetes" (id, titulo, descripcion, archivado) VALUES
  (13, 'Bisutería / Cocina Nacional  [Mañana]  Ma, Ju, Vi@  (Margarita Postillon)', NULL, FALSE),
  (14, 'Bisutería / Cerámica al Frio  [Tarde]  lu, mi, vi@  (Marco Palomino)', NULL, TRUE);

INSERT INTO public."paquete_grupos" (id, paquete_id, grupo_id, grupo_ord) VALUES
  (51, 13, 19, 0),
  (52, 13, 20, 1),
  (53, 14, 21, 0),
  (54, 14, 22, 1);

INSERT INTO public."matriculas" (id, recibo, fecha, archivado) VALUES
  (2, '65453', '2025-06-19', FALSE);

INSERT INTO public."matricula_users" (id, matricula_id, user_id) VALUES
  (2, 2, 7);

INSERT INTO public."matricula_grupos" (id, matricula_id, grupo_id) VALUES
  (1, 2, 13);

INSERT INTO public."publicaciones" (id, titulo, slug, tipo, descripcion_corta, fecha_publicacion, fecha_evento_inicio, fecha_evento_fin, ubicacion, destacado, contenido_1, contenido_2) VALUES
  (3, 'Novenario a la Virgen del Carmen', 'novenario-virgen-carmen-2025', 'noticia', NULL, '2025-07-21', NULL, NULL, NULL, TRUE, NULL, NULL),
  (4, 'Novenario a la Virgen del Carmen', 'novenario-virgen-carmen-2025', 'noticia', NULL, '2025-07-21', NULL, NULL, NULL, TRUE, NULL, NULL),
  (1, 'Matricula 2025-2 (Agosto - Diciembre)', 'matricula-2025-', 'comunicado', 'Matricula Abierta para este segundo periodo académico 2025-2 de Agosto a fines de Diciembre, separa con tiempo tu matricula, las vacantes son limitadas...', '2025-07-21', '2025-07-21 00:00:00', '2025-09-10 00:00:00', 'CETPRO "SAN MARTIN DE PORRES"', TRUE, NULL, NULL),
  (15, 'Gran Inicio de Clasess Periodo Academico  2025-2', 'publicacion', 'evento', NULL, '2025-08-10', NULL, NULL, NULL, TRUE, NULL, '<h1>Contenido 2</h1>'),
  (14, 'Matricula 2025-2 (Agosto - Diciembre)', 'matricula-2025-', 'comunicado', 'Matricula Abierta para este segundo periodo académico 2025-2 de Agosto a fines de Diciembre, separa con tiempo tu matricula, las vacantes son limitadas...', '2025-07-21', '2025-07-21 00:00:00', '2025-09-10 00:00:00', 'CETPRO "SAN MARTIN DE PORRES"', TRUE, NULL, NULL),
  (9, 'Se busca personal de servicio', 'personal-servicio', 'comunicado', NULL, '2025-07-30', NULL, NULL, NULL, TRUE, NULL, NULL),
  (17, 'Se busca personal de servicio', 'personal-servicio', 'comunicado', NULL, '2025-07-30', NULL, NULL, NULL, TRUE, NULL, NULL),
  (21, 'Bienvenidos al CETPRO "San Martin de Porres"', 'presentacion', 'noticia', NULL, '2025-08-16', NULL, NULL, NULL, FALSE, '[{"type": "paragraph", "children": [{"text": "Queridos estudiantes, padres de familia y comunidad educativa:", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Es para mí un honor darles la más cordial bienvenida al CETPRO San Martín de Porres, institución dedicada a la formación de técnicos emprendedores que buscan superarse y aportar al desarrollo de nuestra sociedad.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Nuestro compromiso es brindarles una educación de calidad, práctica y actualizada, que les permita adquirir competencias profesionales y valores que fortalezcan su desarrollo personal y laboral. Aquí encontrarán docentes comprometidos, un ambiente de respeto y oportunidades para crecer en lo académico y humano.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Los invito a asumir con entusiasmo este nuevo camino de aprendizaje, confiando en que cada esfuerzo los acercará a sus metas. Cuenten siempre con nuestro acompañamiento y apoyo.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "¡Bienvenidos al CETPRO San Martín de Porres!", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Atentamente,", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Mg. Maria Elena Cordova Galindo", "type": "text"}]}]', NULL),
  (20, 'Bienvenidos al CETPRO "San Martin de Porres"', 'presentacion', 'noticia', NULL, '2025-08-16', NULL, NULL, NULL, FALSE, '[{"type": "paragraph", "children": [{"text": "Queridos estudiantes, padres de familia y comunidad educativa:", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Es para mí un honor darles la más cordial bienvenida al CETPRO San Martín de Porres, institución dedicada a la formación de técnicos emprendedores que buscan superarse y aportar al desarrollo de nuestra sociedad.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Nuestro compromiso es brindarles una educación de calidad, práctica y actualizada, que les permita adquirir competencias profesionales y valores que fortalezcan su desarrollo personal y laboral. Aquí encontrarán docentes comprometidos, un ambiente de respeto y oportunidades para crecer en lo académico y humano.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Los invito a asumir con entusiasmo este nuevo camino de aprendizaje, confiando en que cada esfuerzo los acercará a sus metas. Cuenten siempre con nuestro acompañamiento y apoyo.", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "¡Bienvenidos al CETPRO San Martín de Porres!", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Atentamente,", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "Mg. Maria Elena Cordova Galindo", "type": "text"}]}]', NULL),
  (7, 'MISION / VISION', 'mision-vision', 'noticia', 'Formar técnicos competentes y emprendedores, con valores y habilidades prácticas que impulsen su empleabilidad, autoempleo y compromiso con la comunidad.', '2025-01-01', NULL, NULL, NULL, FALSE, '[{"type": "heading", "level": 3, "children": [{"text": "MISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres tiene como misión formar técnicos competentes, emprendedores y con valores, capaces de responder a las necesidades del mundo laboral y social. Brindamos una educación técnico-productiva de calidad, orientada a la práctica, la innovación y el desarrollo de habilidades que permitan a nuestros estudiantes alcanzar autonomía económica y profesional. Promovemos la responsabilidad, la creatividad y el liderazgo, impulsando el espíritu emprendedor y el compromiso con la comunidad, para contribuir al progreso individual y al bienestar colectivo.", "type": "text"}]}, {"type": "heading", "level": 3, "children": [{"text": "VISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres se proyecta como una institución líder en la formación técnico-productiva, reconocida por la excelencia académica y la innovación en sus programas. Aspiramos a ser un referente en la formación de técnicos emprendedores, preparados para enfrentar los retos de un mundo globalizado y tecnológico. Nuestra visión es consolidarnos como un espacio de aprendizaje integral que fomente la empleabilidad, el autoempleo y el emprendimiento sostenible, contribuyendo al desarrollo económico y social de nuestro entorno y del país.", "type": "text"}]}]', '<p>Para otros usos de este término, véase Familia (desambiguación).</p><p>Escultura de Henry Moore con el título Familia. Barclay School, Stevenage, Hertfordshire, Gran Bretaña.<br>La familia es un grupo de personas formado por individuos unidos, y primordialment<img class="image_resized image-style-align-left" style="aspect-ratio:1120/643;width:38.92%;" src="http://localhost:1337/uploads/paseo_campo_ac24fc681a.png" alt="paseo-campo.png" srcset="http://localhost:1337/uploads/thumbnail_paseo_campo_ac24fc681a.png 245w,http://localhost:1337/uploads/small_paseo_campo_ac24fc681a.png 500w,http://localhost:1337/uploads/medium_paseo_campo_ac24fc681a.png 750w,http://localhost:1337/uploads/large_paseo_campo_ac24fc681a.png 1000w," sizes="100vw" width="1120" height="643">e vinculados por relaciones de filiación o de pareja.[1]​ El Diccionario de la lengua española la define, entre otras cosas, como un grupo de personas emparentadas entre sí que viven juntas, lo que lleva implícito los conceptos de parentesco y convivencia.[2]​ Según la Declaración Universal de los Derechos Humanos, es el elemento natural, universal y fundamental de la sociedad, tiene derecho a la protección de la sociedad y del Estado.[3]​</p><p>Los lazos principales que definen una familia son de dos tipos: vínculos de afinidad derivados del establecimiento de un vínculo reconocido socialmente, como el matrimonio[4]​ —que, en algunas sociedades, solo permite la unión entre dos personas mientras que en otras es posible la poligamia—, y vínculos de consanguinidad, como la filiación entre padres e hijos o los lazos que se establecen entre los hermanos que descienden de un mismo padre. También puede diferenciarse la familia según el grado de parentesco entre sus miembros.</p>'),
  (23, 'MISION / VISION', 'mision-vision', 'noticia', 'Formar técnicos competentes y emprendedores, con valores y habilidades prácticas que impulsen su empleabilidad, autoempleo y compromiso con la comunidad.', '2025-01-01', NULL, NULL, NULL, FALSE, '[{"type": "heading", "level": 3, "children": [{"text": "MISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres tiene como misión formar técnicos competentes, emprendedores y con valores, capaces de responder a las necesidades del mundo laboral y social. Brindamos una educación técnico-productiva de calidad, orientada a la práctica, la innovación y el desarrollo de habilidades que permitan a nuestros estudiantes alcanzar autonomía económica y profesional. Promovemos la responsabilidad, la creatividad y el liderazgo, impulsando el espíritu emprendedor y el compromiso con la comunidad, para contribuir al progreso individual y al bienestar colectivo.", "type": "text"}]}, {"type": "heading", "level": 3, "children": [{"text": "VISIÓN", "type": "text"}]}, {"type": "paragraph", "children": [{"text": "El CETPRO San Martín de Porres se proyecta como una institución líder en la formación técnico-productiva, reconocida por la excelencia académica y la innovación en sus programas. Aspiramos a ser un referente en la formación de técnicos emprendedores, preparados para enfrentar los retos de un mundo globalizado y tecnológico. Nuestra visión es consolidarnos como un espacio de aprendizaje integral que fomente la empleabilidad, el autoempleo y el emprendimiento sostenible, contribuyendo al desarrollo económico y social de nuestro entorno y del país.", "type": "text"}]}]', '<p>Para otros usos de este término, véase Familia (desambiguación).</p><p>Escultura de Henry Moore con el título Familia. Barclay School, Stevenage, Hertfordshire, Gran Bretaña.<br>La familia es un grupo de personas formado por individuos unidos, y primordialment<img class="image_resized image-style-align-left" style="aspect-ratio:1120/643;width:38.92%;" src="http://localhost:1337/uploads/paseo_campo_ac24fc681a.png" alt="paseo-campo.png" srcset="http://localhost:1337/uploads/thumbnail_paseo_campo_ac24fc681a.png 245w,http://localhost:1337/uploads/small_paseo_campo_ac24fc681a.png 500w,http://localhost:1337/uploads/medium_paseo_campo_ac24fc681a.png 750w,http://localhost:1337/uploads/large_paseo_campo_ac24fc681a.png 1000w," sizes="100vw" width="1120" height="643">e vinculados por relaciones de filiación o de pareja.[1]​ El Diccionario de la lengua española la define, entre otras cosas, como un grupo de personas emparentadas entre sí que viven juntas, lo que lleva implícito los conceptos de parentesco y convivencia.[2]​ Según la Declaración Universal de los Derechos Humanos, es el elemento natural, universal y fundamental de la sociedad, tiene derecho a la protección de la sociedad y del Estado.[3]​</p><p>Los lazos principales que definen una familia son de dos tipos: vínculos de afinidad derivados del establecimiento de un vínculo reconocido socialmente, como el matrimonio[4]​ —que, en algunas sociedades, solo permite la unión entre dos personas mientras que en otras es posible la poligamia—, y vínculos de consanguinidad, como la filiación entre padres e hijos o los lazos que se establecen entre los hermanos que descienden de un mismo padre. También puede diferenciarse la familia según el grado de parentesco entre sus miembros.</p>');

INSERT INTO public."videos_youtube" (id, url) VALUES
  (1, 'https://www.youtube.com/watch?v=_6oKX-ZCP_8'),
  (2, 'https://www.youtube.com/watch?v=IyKoAaLrTzw');

INSERT INTO public."dato_general" (id, nombre_institucion, direccion, telefono_1, telefono_2, correo, pagina_web, facebook, youtube, twitter, instagram, tiktok, ruc, rd) VALUES
  (1, 'CETPRO "San Martin de Porres"', 'Jirón Santa Clorinda 971 Urb. Palao SMP', '5341588', '5346663', 'cetprosanmartindeporres@cetprosmp.edu.pe', 'cetprosmp.edu.pe', 'https://www.facebook.com/cetprosanmartindeporres1/', 'https://www.youtube.com/@enriquerafaelpalominohorna3697', 'https://x.com/enkee032', 'https://www.instagram.com/cetpro.smp/', 'https://www.tiktok.com/@cetpro.sanmartindeporres', '20610635939', 'R.D. N° 1839 - 05 - DRELM');

SELECT setval(pg_get_serial_sequence('public."users"', 'id'), COALESCE((SELECT MAX(id) FROM public."users"), 1), true);
SELECT setval(pg_get_serial_sequence('public."sectores"', 'id'), COALESCE((SELECT MAX(id) FROM public."sectores"), 1), true);
SELECT setval(pg_get_serial_sequence('public."familias"', 'id'), COALESCE((SELECT MAX(id) FROM public."familias"), 1), true);
SELECT setval(pg_get_serial_sequence('public."act_economicas"', 'id'), COALESCE((SELECT MAX(id) FROM public."act_economicas"), 1), true);
SELECT setval(pg_get_serial_sequence('public."especialidades"', 'id'), COALESCE((SELECT MAX(id) FROM public."especialidades"), 1), true);
SELECT setval(pg_get_serial_sequence('public."carreras"', 'id'), COALESCE((SELECT MAX(id) FROM public."carreras"), 1), true);
SELECT setval(pg_get_serial_sequence('public."modulos"', 'id'), COALESCE((SELECT MAX(id) FROM public."modulos"), 1), true);
SELECT setval(pg_get_serial_sequence('public."personales"', 'id'), COALESCE((SELECT MAX(id) FROM public."personales"), 1), true);
SELECT setval(pg_get_serial_sequence('public."personal_especialidades"', 'id'), COALESCE((SELECT MAX(id) FROM public."personal_especialidades"), 1), true);
SELECT setval(pg_get_serial_sequence('public."semestres"', 'id'), COALESCE((SELECT MAX(id) FROM public."semestres"), 1), true);
SELECT setval(pg_get_serial_sequence('public."calendarios"', 'id'), COALESCE((SELECT MAX(id) FROM public."calendarios"), 1), true);
SELECT setval(pg_get_serial_sequence('public."grupos"', 'id'), COALESCE((SELECT MAX(id) FROM public."grupos"), 1), true);
SELECT setval(pg_get_serial_sequence('public."paquetes"', 'id'), COALESCE((SELECT MAX(id) FROM public."paquetes"), 1), true);
SELECT setval(pg_get_serial_sequence('public."paquete_grupos"', 'id'), COALESCE((SELECT MAX(id) FROM public."paquete_grupos"), 1), true);
SELECT setval(pg_get_serial_sequence('public."matriculas"', 'id'), COALESCE((SELECT MAX(id) FROM public."matriculas"), 1), true);
SELECT setval(pg_get_serial_sequence('public."matricula_users"', 'id'), COALESCE((SELECT MAX(id) FROM public."matricula_users"), 1), true);
SELECT setval(pg_get_serial_sequence('public."matricula_grupos"', 'id'), COALESCE((SELECT MAX(id) FROM public."matricula_grupos"), 1), true);
SELECT setval(pg_get_serial_sequence('public."matricula_paquetes"', 'id'), COALESCE((SELECT MAX(id) FROM public."matricula_paquetes"), 1), true);
SELECT setval(pg_get_serial_sequence('public."publicaciones"', 'id'), COALESCE((SELECT MAX(id) FROM public."publicaciones"), 1), true);
SELECT setval(pg_get_serial_sequence('public."videos_youtube"', 'id'), COALESCE((SELECT MAX(id) FROM public."videos_youtube"), 1), true);
SELECT setval(pg_get_serial_sequence('public."modulo_videos"', 'id'), COALESCE((SELECT MAX(id) FROM public."modulo_videos"), 1), true);
SELECT setval(pg_get_serial_sequence('public."publicacion_videos"', 'id'), COALESCE((SELECT MAX(id) FROM public."publicacion_videos"), 1), true);
SELECT setval(pg_get_serial_sequence('public."dato_general"', 'id'), COALESCE((SELECT MAX(id) FROM public."dato_general"), 1), true);

COMMIT;
