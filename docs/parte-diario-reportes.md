# Reporte Parte diario

Ruta: `/intranet/reportes/parte-diario`, en el menú Reportes → Parte diario. La ampliación, sus permisos, el esquema y las funciones se publicaron el 9 de octubre de 2026. Ver [registro del despliegue](despliegue-avanza-parte-diario-2026-10-09.md).

## Permisos

| Área | Coordinador | Director | Administrativo y demás roles | Superusuario |
| --- | --- | --- | --- | --- |
| Página suelta Parte Diario | Ver, editar y eliminar | Sin acceso | Sin acceso | Acceso habitual |
| Reporte Parte diario | Ver y editar | Ver y editar | Sin acceso | Acceso habitual |

Se marcó esta matriz en los permisos de las dos entidades, conservando los permisos de las demás áreas. Guardar un parte nuevo usa el permiso de edición; guardar un informe nuevo también. Las casillas Crear permanecen desmarcadas para estas entidades. Los endpoints comprueban permisos en servidor, además del filtrado del menú.

## Valoraciones

El texto es visible en los desplegables. El número se guarda en el servidor y no aparece en las opciones del formulario. Predeterminado: primera opción, valor 4. Catálogo único en `functions/src/modules/parte-diario/valuations.ts`, compartido con el cliente.

| Valor | Sílabo | Materiales | Tareas |
| --- | --- | --- | --- |
| 4 | Firmado y publicado | Completo y publicado | Publicado y respondido |
| 3 | No firmado y publicado | En proceso y publicado | Publicado y respondido parcialmente |
| 2 | Firmado y no publicado | En proceso y no publicado | Publicado y no respondido |
| 1 | No firmado y no publicado | Completo y no publicado | No publicado |
| 0 | No tiene | No tiene | No tiene |

| Valor | Ficha de Actividad | Instrumento de Evaluación |
| --- | --- | --- |
| 4 | Está muy bien estructurada | Sí tiene, está muy bien estructurado y lo aplica |
| 3 | Está bien estructurada | Sí tiene, está bien estructurado y lo aplica |
| 2 | Está en proceso | Sí tiene, está en proceso y lo aplica |
| 1 | Está pero no la usa | Sí tiene pero no lo aplica |
| 0 | No tiene | No tiene |

Campos añadidos a `ParteDiarioRegistro`: `silaboValor`, `materialValor`, `tareasValor`, `fichaActividadValor`, `instrumentoEvaluacionValor`; `Int` nullable para mantener valores anteriores sin inferir calidad. Al guardar se calculan desde el texto permitido, aunque el cliente envíe otro número. Las valoraciones anteriores ambiguas quedan sin puntaje y se excluyen de promedios hasta evaluarlas.

## Estadísticas e informes

Filtros por fechas, semestre, familia y docente, para períodos históricos de hasta un año y con fecha final no posterior a hoy. La familia se obtiene de módulo → plan → carrera → actividad económica → familia. Los registros y sesiones históricas de grupos archivados siguen formando parte del reporte.

- **Cobertura:** jornadas de grupo-módulo con al menos un parte registrado, divididas entre las jornadas esperadas del período. Varias actividades del mismo grupo-módulo en una fecha cuentan como una jornada. Los días no laborables y eventos cancelados no forman parte de lo esperado.
- **Asistencia:** suma de asistentes / suma de matriculados de las jornadas con asistencia registrada. Cuenta una sola vez cada grupo-módulo y fecha; toma el registro más reciente con asistencia y advierte cantidades distintas entre sesiones. No son alumnos únicos. Los campos vacíos se excluyen y se muestran como pendientes, no como cero asistentes.
- **Avance registrado:** actividades curriculares distintas seleccionadas en los partes que coinciden con actividades programadas en el período / actividades distintas programadas. No certifica que una sesión fue completamente dictada; PPP/EFSRT manual se sigue mediante cobertura de jornadas, sin crear sesiones globales.
- **Valoraciones:** promedio 0–4 por cada campo, distribución de puntuaciones y media de los valores registrados. Ausencia de datos se muestra como «Sin datos», no como rendimiento cero.
- **Evaluación/materiales/tareas:** proporción de instrumentos declarados como aplicados, materiales publicados y tareas respondidas completamente/parcialmente. No existe un campo directo que mida la calidad de la retroalimentación o los aprendizajes individuales; se aclara esa limitación y no se inventan resultados.

Las tablas por familia y por docente permiten abrir una selección específica. El informe propone un análisis y recomendaciones a partir de los datos y estados registrados, sin umbrales institucionales inventados; ambos textos y el título son editables. Incluye CSV de estadísticas y versión de impresión/PDF. El listado de registros se pagina de 100 en 100 y permite editar registros anteriores desde un modal; al guardar se recalculan las estadísticas.

Entidad nueva `ParteDiarioInforme`, tabla `parte_diario_informes`:

| Campos | Uso |
| --- | --- |
| `id` | Identificador serial. |
| `fechaInicio`, `fechaFin` | Período del informe. |
| `semestreId`, `familiaId`, `docenteId` y relaciones | Alcance opcional: general, familia o docente. |
| `titulo`, `analisis`, `recomendaciones` | Texto editable y persistente. |
| `creadoPor`, `actualizadoPor` | UID de quien crea o modifica el informe. |
| `fechaCreacion`, `fechaActualizacion` | Auditoría y control de versión. |

El informe guarda el alcance y los textos. Las estadísticas se calculan de los registros vigentes al consultar o imprimir; editar registros después puede cambiar esas cifras. El período/filtros de un informe guardado se conservan al editarlo. La versión evita sobrescribir cambios de otra persona.

Funciones nuevas: `getParteReporte`, `getParteReporteRegistro`, `getParteReporteOpciones`, `saveParteReporteRegistro`, `saveParteInforme`, `deleteParteDiarioRegistro`. La edición histórica conserva fecha, docente, grupo-módulo, actividad de origen y el número de matriculados del registro original; valida unidad/actividad, práctica de la carrera, asistencia, estados y versión.

## Datos y comprobaciones

Preparación local mediante `scripts/prepare-parte-ratings-permissions.cjs --apply`; respaldo de permisos y valores anteriores en `tmp/parte-reportes/permissions-ratings-before-1791576717579.json`. En ese momento no había partes guardados que migrar. No se alteraron calendarios, sesiones, estudiantes, matrículas, materiales ni planes.

Pasaron TypeScript de cliente/Functions, ESLint y compilación SQL Connect de 17 operaciones. Se verificaron los 25 puntajes, permisos de coordinador/director/administrativo, asistencia sin duplicación, valores faltantes, edición de registros, edición de informes, control de versión y eliminación exclusiva. En navegador: voz de actividad, fechas/negrita, formato de texto, valores ocultos, guardado, reporte, CSV e impresión; sin errores de React. Los registros e informes de prueba se eliminaron.
