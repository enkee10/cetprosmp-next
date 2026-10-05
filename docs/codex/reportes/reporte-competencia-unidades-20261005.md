# Reporte de Reorganizacion Academica

Verificacion de datos: 5/10/2026, 12:54:30 p. m. (America/Lima).

## Estructura

Modulo -> Competencia -> Unidad didactica -> Capacidad terminal -> Indicador.

Se migraron 160 relaciones conservando su ID, unidad, modulo y orden. Las unidades compartidas mantienen el mismo ID en todos los modulos. No se crearon planes ni modulos.

Programa de estudio: con mas de 400 horas del modulo, las dos ultimas unidades son para empleabilidad; con 400 horas o menos, solo la ultima. Opcion ocupacional: todas las unidades son tecnicas.

Se conservaron las 49 competencias originales y se agregaron 10 definiciones necesarias de empleabilidad, tomadas del Excel. Ningun texto de competencia original fue reemplazado.

## Datos Conservados

| Entidad | Registros |
| --- | ---: |
| capacidadesTerminales | 158 |
| indicadoresCapacidad | 400 |
| grupoModuloUnidadesDidacticas | 379 |
| planModulos | 36 |
| unidadesDidacticas | 139 |
| indicadoresCapacidadEstudiantes | 11832 |
| unidadesDidacticasEstudiantes | 3739 |
| modulos | 36 |
| capacidadesTerminalesEstudiantes | 4694 |

La comparacion verifica los campos academicos y los promedios, no solo los conteos.

## Modulos

| ID | Modulo | Horas del modulo | Unidades tecnicas | Unidades de empleabilidad |
| ---: | --- | ---: | ---: | --- |
| 1 | Corte de Cabello, Barba y Peinado | 528 | 3 | Plan de Negocios; Comportamiento Ético |
| 2 | Tratamiento Capilar, Coloración, Ondulación y Laceado | 528 | 3 | PLAN DE NEGOCIO; COMPORTAMIENTO ÉTICO |
| 3 | Mantenimiento de Teléfonos Celulares | 300 | 5 | No corresponde |
| 4 | Mantenimiento de Instalaciones Eléctricas Domiciliarias | 300 | 5 | No corresponde |
| 5 | SOPORTE Y MANTENIMIENTO DE SISTEMAS INFORMÁTICOS | 528 | 4 | Plan de Negocios; Comportamiento Ético |
| 6 | Monitoreo y Acciones de Mantenimiento de Centros de Cómputo | 1056 | 3 | Cultura del Emprendimiento; Comportamiento Ético |
| 7 | Ofimática | 300 | 5 | No corresponde |
| 8 | Diseño Publicitario | 300 | 5 | No corresponde |
| 9 | Diseño Web | 300 | 5 | No corresponde |
| 10 | Técnicas de Tizado, Tendido y Corte de Prendas de Vestir | 528 | 4 | Comportamiento Ético; COMUNICACIÓN PARA EL DESARROLLO PERSONAL Y PROFESIONAL |
| 11 | Técnicas de Confección de Prendas de Vestir | 528 | 4 | Plan de Negocios; Comportamiento Ético |
| 13 | Técnicas de Procesos de Acabados en Prendas de Vestir | 528 | 0 | Sin unidades previas |
| 14 | Bordados a Maquina | 300 | 5 | No corresponde |
| 15 | Tejido a Maquina | 300 | 5 | No corresponde |
| 16 | Tejido a Mano | 300 | 5 | No corresponde |
| 17 | Diseño y Corte de Artículos de Cuero y Marroquinería | 1056 | 3 | Comunicación para el desarrollo personal y profesional; Aplicaciones de herramientas informáticas |
| 18 | Ensamblado y Acabado de Artículos de Cuero | 528 | 3 | PLAN DE NEGOCIO; COMPORTAMIENTO ÉTICO |
| 19 | Diseño y Corte de Calzado | 528 | 3 | COMUNICÁNDONOS ASERTIVAMENTE; APLICANDO LAS TIC'S |
| 20 | Aparado, Armado y Acabado de Calzado | 1056 | 3 | Plan de Negocios; Comportamiento Ético |
| 21 | Decoración de Eventos Especiales | 300 | 5 | No corresponde |
| 22 | Bisuterías | 150 | 5 | No corresponde |
| 23 | Pintura Decorativa | 150 | 5 | No corresponde |
| 24 | Cerámica al Frio | 150 | 5 | No corresponde |
| 25 | Acondicionamiento y Elaboración de Productos de Panadería y Pastelería | 528 | 5 | Plan de Negocios; Comportamiento Ético |
| 26 | Decoración y Presentación de los Productos de Panadería y Pastelería | 1056 | 5 | Plan de Negocios; Comportamiento Etico |
| 27 | Técnicas de Decoración de Tortas | 300 | 0 | Sin unidades previas |
| 28 | Buffet | 300 | 0 | Sin unidades previas |
| 29 | Cocina Nacional | 300 | 0 | Sin unidades previas |
| 30 | Técnicas Culinarias | 300 | 0 | Sin unidades previas |
| 31 | Mantenimiento de Carpintería | 300 | 6 | No corresponde |
| 32 | Confección de Muebles en Melamina | 300 | 6 | No corresponde |
| 33 | Operaciones Básicas de Cocina y Manejo de Insumos | 336 | 6 | Comportamiento Ético |
| 35 | MANEJO DE MAQUINAS INDUSTRIALES DE CONFECCION | 240 | 2 | COMUNICACIÓN EFECTIVA |
| 36 | Decoraciones Navideñas | 150 | 5 | No corresponde |
| 37 | Técnicas Básicas de Elaboraciones Culinarias | 1056 | 4 | Plan de Negocios; Comportamiento Ético |
| 38 | Técnicas de Confección de Prendas de Vestir | 528 | 0 | Sin unidades previas |

## Pendientes Preexistentes

- Modulo 27: Técnicas de Decoración de Tortas. No tenia unidades; no se invento contenido.
- Modulo 28: Buffet. No tenia unidades; no se invento contenido.
- Modulo 29: Cocina Nacional. No tenia unidades; no se invento contenido.
- Modulo 30: Técnicas Culinarias. No tenia unidades; no se invento contenido.
- Modulo 13: Técnicas de Procesos de Acabados en Prendas de Vestir. No tenia unidades; no se invento contenido.
- Modulo 38: Técnicas de Confección de Prendas de Vestir. No tenia unidades; no se invento contenido.
- Modulo 35: MANEJO DE MAQUINAS INDUSTRIALES DE CONFECCION, competencia 45 sin nombre. Se conservo el contenido vacio original.
- Capacidad 98, unidad 92, sin modulo asociado desde antes de esta migracion. Se conservo.
- Competencia 25, modulo 17, sin unidades tras la nueva clasificacion. Se conservo sin eliminarla: CE2 Tecnologías de la información.- Manejar herramientas informáticas de las TIC para buscar y analizar información, comunicarse y realizar procedimientos o tareas vinculadas al área profesional, de acuerdo a los requerimientos de su entorno laboral.(UD)

## Verificacion

- Compilacion TypeScript y produccion Next.js completadas.
- Pruebas de horas 399, 400 y 401; opcion ocupacional y unidades compartidas.
- Trece consultas verificadas de estructura, unidades, capacidades, grupos, paquetes, matricula, registro auxiliar y reportes.
- Certificado Excel verificado: agrupacion por competencia, capacidades y nota.
- Registro auxiliar verificado para los cinco modulos solicitados: Monitoreo y Acciones (5 unidades), Diseno y Corte de Articulos (5), Aparado/Armado/Acabado de Calzado (5), Decoracion y Presentacion (7), Tecnicas Basicas de Elaboraciones Culinarias (6). Se conservaron sus capacidades e indicadores.
- Guardado sin cambios de competencia, capacidad y unidad compartida conserva datos y relaciones.
- Respaldos: tmp/competencia-unidades-backup-20261005.json y tmp/competencia-unidades-report-20261005.json.

## Despliegue Remoto

- Data Connect: esquema definitivo publicado y tablas de relaciones antiguas retiradas, sin CASCADE y con comprobacion transaccional de equivalencia.
- Firebase Functions: 52 funciones actualizadas correctamente.
- Firebase Hosting: servidor Next.js actualizado y version publicada.
- URL: https://cetprosmp-2026.web.app
