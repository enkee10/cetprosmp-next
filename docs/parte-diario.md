# Parte Diario

Página suelta `/parte-diario`, preparada para tablet, sin la navegación de la intranet. La versión inicial y los ajustes de edición directa, PPP/EFSRT y reportes se publicaron el 9 de octubre de 2026 en `https://cetprosmp.edu.pe/parte-diario`. La corrección posterior deja la tabla de consulta y concentra la edición en el modal. La programación está publicada para los 75 grupos-módulo existentes en remoto; el grupo incompleto de Bordados presente solo en local se archivó conservando sus datos. Ver [registro del despliegue inicial](despliegue-avanza-parte-diario-2026-10-09.md) y [correcciones posteriores](correcciones-parte-diario-2026-10-09.md). Ocultar la barra de direcciones queda pendiente, como indicó el usuario.

Usa la fecha actual de `America/Lima`. Los sábados, domingos y fechas con eventos de tipo `feriado` en calendarios activos muestran únicamente «Hoy no es día laborable». Los días hábiles consulta las sesiones programadas en `GrupoModuloActividad` y las prácticas/jornadas pendientes en `GrupoModuloJornada`, excluyendo grupos archivados, eventos cancelados y semestres fuera de los configurados. La corrección local reúne las actividades de cada grupo-módulo en una sola fila por jornada. Las sesiones de 3 + 3 horas conservan sus identidades y fechas, y se muestran juntas dentro de la fila. Si ya existe un parte, se conserva su identidad y contenido; los otros registros históricos no se eliminan. Las jornadas curriculares solo generan una fila adicional cuando faltan actividades del sílabo; cancelar una clase no crea otra fila pendiente. Ordena por turno (mañana, tarde, noche) y apellido paterno, sin ordenar por familia.

Los matriculados se cuentan por estudiantes distintos a la fecha, incluyendo la relación actual `grupoModuloId` y las matrículas anteriores asociadas por grupo y módulo. Las matrículas archivadas y las registradas después de ese día se excluyen.

## Registro y formulario

Al tocar el nombre o el avatar se abre un modal con el mismo nombre y grupo-módulo de la tabla: apellido paterno, apellido materno, nombres. Quita el turno y el sufijo final entre paréntesis del docente, conservando los períodos internos, como `(ago-oct)`. Cambiar unidad o actividad afecta únicamente al Parte Diario; no modifica la programación curricular ni los horarios.

Unidad agrega la opción PPP para Opción Ocupacional o EFSRT para Programa de Estudio. Son opciones del parte, sin crear unidades globales ficticias. Al seleccionarlas, Actividad admite texto manual de hasta 500 caracteres guardado en ese registro. Donde no hay sílabo, permite guardar asistencia y documentos dejando unidad/actividad pendientes.

La tabla tiene 14 columnas: N°, Avatar, Nombre, Unidad, Actividad, Matr., Asist., Sílabo, Fich. Act., Inst. Eva., Material, Tareas, Firma y Observación. En la corrección local, todas las celdas son de consulta; solo nombre y avatar abren el modal para editar y guardar. El doble tap en observaciones ya no activa la edición.

Contenedor sin padding exterior, N° de 32 px, Nombre de 270 px, Matr. de 90 px y Asist. de 70 px; encabezados centrados de 52 px. Fecha `SMP, viernes 09 de oct del 2026`, refrescar a 50 px después de la fecha y separación inferior de 6 px. Encabezado y primeras tres columnas permanecen fijos: sus sombras aparecen al desplazar y desaparecen en el origen.

Los asistentes quedan vacíos hasta registrarlos; acepta enteros entre cero y el número de matriculados. Los estados usan cinco opciones por campo y puntajes ocultos del 0 al 4, calculados en el servidor. Se mantiene como predeterminado el primer valor (4). Las observaciones admiten varios apartados con viñetas, grabación, transcripción, edición por teclado y eliminación. Actividad de PPP/EFSRT también admite dictado, en el modal; agrega la transcripción al texto existente, sin viñetas, hasta 500 caracteres. Enviar convierte el audio en texto; cancelar descarta la grabación. Si la transcripción falla, se conserva temporalmente el audio para volver a enviarlo. El audio no se guarda en la base de datos.

Las unidades se presentan en mayúsculas y las actividades en formato de oración, sin modificar los nombres de las tablas curriculares. Al desplegar Actividad, resalta en negrita todas las actividades programadas para esa jornada y muestra a la derecha todas sus fechas del grupo-módulo, incluidas las sesiones con varios segmentos/días. Estas fechas no aparecen en el campo cerrado. Las opciones se almacenan temporalmente por grupo-módulo, no por módulo, para respetar calendarios diferentes.

La firma admite lápiz, dedo y ratón en un recuadro de aproximadamente 11,5 × 6 cm con botón Limpiar y trazo de 3,2 px en el lienzo. Guarda un PNG transparente recortado al límite de los trazos, ocupa todo el ancho de su columna y conserva su proporción, recortando visualmente el excedente vertical. Los apartados de observaciones del modal tienen 5 px de separación y botones a la derecha. Guardar persiste todo el formulario; Cancelar descarta el borrador.

## Entidad nueva: ParteDiarioRegistro

Tabla `parte_diario_registros`. Claves únicas: fecha/grupo-módulo/actividad originalmente programada para clases y fecha/grupo-módulo/jornada para prácticas o días pendientes.

| Campos | Uso |
| --- | --- |
| `id`, `fecha` | Identificador y fecha del registro. |
| `grupoModuloId`, `docenteId` | Relaciones con GrupoModulo y Personal. |
| `actividadProgramadaId` | Actividad que originó la fila; conserva la identidad al cambiar el formulario. |
| `jornadaId` | Jornada que originó una fila de práctica o sin sílabo; permite nulo para clases. |
| `tipoUnidad`, `actividadManual` | `curricular`, `ppp` o `efsrt`; texto de la actividad manual de práctica. |
| `unidadDidacticaId`, `actividadId` | Unidad y actividad elegidas para el parte; permiten nulo para prácticas y filas pendientes. |
| `matriculados`, `asistentes` | Cantidad al guardar y asistencia; asistentes permite nulo. |
| `silabo` | Cinco estados de firma y publicación, según el catálogo de valoraciones. |
| `fichaActividad`, `instrumentoEvaluacion` | Cinco estados de estructura y uso/aplicación, según el catálogo de valoraciones. |
| `material`, `tareas` | Cinco estados de elaboración/publicación o respuesta, según el catálogo de valoraciones. |
| `silaboValor`, `fichaActividadValor`, `instrumentoEvaluacionValor`, `materialValor`, `tareasValor` | Puntajes enteros 0–4 derivados de la opción elegida; nulos para valores anteriores cuya calidad no se puede determinar. |
| `firma` | PNG transparente recortado, como data URL; permite nulo. |
| `observaciones` | Lista de textos independientes. |
| `creadoPor`, `actualizadoPor` | UID del usuario que realiza la acción. |
| `fechaCreacion`, `fechaActualizacion` | Auditoría y control de modificaciones simultáneas. |

## Entidad local nueva: GrupoModuloJornada

Tabla `grupo_modulo_jornadas`, única por grupo-módulo/fecha. Campos: `id`, `fecha`, `tipo` (`curricular`, `ppp`, `efsrt`), `inicio`, `fin`, `horas`, `horasCurriculares`, `pendiente`, `grupoModuloId`, `eventoId` y sus relaciones. Permite registrar prácticas y jornadas de módulos sin actividades, sin inventar aprendizajes ni sesiones globales. `eventoId` permite respetar cancelaciones. `horasCurriculares` conserva el presupuesto curricular del día, aunque falte el sílabo; `horas` representa el tiempo de la práctica cuando el día es PPP/EFSRT.

## Acceso y transcripción

Requiere sesión y permisos `parte-diario`. En local y remoto, visualizar, editar y eliminar se habilitan exclusivamente para Coordinador; el superusuario conserva su acceso habitual, confirmado por el usuario. Administrativo, Director y los demás roles no tienen estos permisos. El botón Eliminar registro aparece en el modal de registros ya guardados; elimina el parte, no la programación ni la jornada.

El apartado Reportes → Parte diario (`reportes-parte-diario`) permite visualizar y editar exclusivamente a Coordinador y Director, con el acceso habitual del superusuario. Incluye edición de partes anteriores desde el reporte, sin dar al director acceso a la página suelta. La transcripción acepta permiso de edición en cualquiera de las dos áreas. Detalles de indicadores, valoraciones e informes: [Reporte Parte diario](parte-diario-reportes.md).

El siguiente script fuerza el emulador local, respalda los permisos y valores existentes y aplica la matriz solicitada. Conserva las demás entidades de permisos. Solo convierte valores antiguos con correspondencia inequívoca, sin inventar una calidad a partir de «sí tiene»:

```powershell
node scripts/prepare-parte-ratings-permissions.cjs
node scripts/prepare-parte-ratings-permissions.cjs --apply
```

El script anterior `prepare-parte-diario.cjs` corresponde a la preparación inicial; no debe usarse para restablecer los permisos de administrativo/director:

```powershell
node scripts/prepare-parte-diario.cjs
node scripts/prepare-parte-diario.cjs --apply
```

El script fuerza el emulador SQL Connect de `127.0.0.1:9399`; no tiene modo remoto. El esquema se aplica por el emulador al observar `dataconnect/schema/schema.gql`.

Las funciones de la página suelta son `getParteDiario`, `getParteDiarioOpciones`, `saveParteDiario`, `deleteParteDiarioRegistro` y `transcribeParteDiario`. Todas verifican permisos en el servidor. Guardar valida fecha actual hábil, sesión programada, actividad de la unidad y módulo elegidos, asistencia, estados y observaciones. Ignora los puntajes enviados por el cliente y calcula los valores permitidos. El control de versión y la clave única evitan reemplazar silenciosamente cambios de otro usuario.

La transcripción usa Vertex AI con las credenciales del entorno, el proyecto actual y `gemini-2.5-flash`. Permite configurar `PARTE_DIARIO_GEMINI_PROJECT_ID` y `PARTE_DIARIO_GEMINI_MODEL`. El micrófono requiere un navegador compatible y HTTPS o localhost. El texto resultante se puede revisar y corregir antes de guardar.

## Verificación local

Compilación de Functions y TypeScript, ESLint de los componentes nuevos y compilación SQL Connect de consultas y mutaciones. Con los datos del 9 de octubre de 2026 se verificaron 22 filas (8 mañana, 6 tarde y 8 noche), sus matriculados y las opciones de unidades/actividades. Se probaron creación, actualización, rechazo de versiones antiguas y asistencia inválida, y conservación de los horarios originales; los registros de prueba se eliminaron.

En navegador se comprobaron las 14 columnas actuales, edición y guardado directo, PPP manual, observaciones con teclado, sombras al desplazar, modal y firma a todo el ancho sin deformación, en tablet horizontal y vertical. Se probaron guardados consecutivos y rechazo de versiones antiguas en la base local. Las pruebas de voz de la versión inicial siguen vigentes, incluyendo una transcripción real de una locución sintética en español. Se verificó el mensaje único para feriado y fin de semana.

Tras reprogramar 76 grupos-módulo, el 9 de octubre muestra 31 filas e incluye Ana Ramírez, Fanny Acuña (PPP), Richard Ramos (Carpintería, pendiente de sílabo) y Romelio Figueroa. Los dos últimos grupos tienen cero matrículas vinculadas en los datos locales; no se asignaron alumnos de otros grupos. Véase [la reprogramación local](calendarizacion-2026-reprogramacion-local.md).

Verificación de la ampliación: 25 valores y sus puntajes autoritativos, rechazos de permisos, fechas de actividades, guardados consecutivos y conflictos de versión; navegador con voz en actividad (enviar/cancelar), formato de oración, opción programada en negrita, puntajes ocultos, edición desde reportes, informes editables, CSV e impresión. La grabación y transcripción del navegador se simularon para comprobar el flujo sin enviar audio adicional a servicios externos. Los registros e informes de prueba se eliminaron.

## Correcciones publicadas el 9 de octubre de 2026

Romelio Figueroa: se respeta su horario actual de lunes a viernes y se reconstruye la programación con el PDF correspondiente de 300 horas. El grupo incompleto presente solo en local se archiva, conservando sus datos; no tiene alumnos ni partes registrados.

Richard Ramos: el grupo-módulo 157 pasa a Confección de Muebles en Melamina (módulo 32), con sus 40 actividades y sus unidades. El grupo 167 usa también el paquete 45 de Melamina, para que una edición posterior no restablezca el módulo anterior. Se conservan los cursos históricos y los campos de Workspace.

María Saavedra: el grupo-módulo 184 se programa de lunes a jueves, conservando 150 horas curriculares y 90 de EFSRT. No tiene jornadas activas los viernes.

Enrique Palomino: por indicación del usuario, el grupo-módulo 200 conserva 210 horas curriculares y reduce la PPP a las 6 horas disponibles. Se programa únicamente los martes y jueves dentro del período del calendario, sin viernes. Se ajusta la programación de este grupo; no se cambia la definición global del módulo de 300 horas.

Se verificaron en local y remoto 26 filas el 9 de octubre, sin repetir Miriam Ferreñán, Maribel Evans ni Nieves Solgorre dentro de su jornada, con Romelio presente. Compilación de Functions, TypeScript y ESLint correctos. Prueba de tablet: tabla sin controles de edición, modal editable, ambas actividades del día resaltadas y fechadas, y guardado únicamente desde el modal. Los tres partes reales de remoto mantienen su identidad al probar la consolidación mediante consultas de lectura. Las diez funciones de Parte Diario y la interfaz se publicaron en remoto. Se verificaron los archivos del código publicado y la interfaz para tablet con consultas reales de lectura; el guardado del navegador se simuló para no crear partes de prueba en producción.
