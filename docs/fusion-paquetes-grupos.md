# Fusión de Paquetes con Grupos

Implementada y migrada inicialmente **solo en local** el 13/10/2026. El estado del despliegue del 14/10/2026 se registra al final de este documento.

## Modelo y formulario

- Se eliminan las entidades operativas `Paquete`, `PaqueteModulo`, `PaqueteGrupo` y `MatriculaPaquete`, sus formularios, funciones y permiso de Paquetes.
- Se eliminan `Grupo.paqueteId` y `Matricula.paqueteId`.
- Se conservan los valores propios de Grupo: nombre, descripción, archivado, docente, semestre, turno, horario y datos Workspace. No se copia título, descripción ni archivado de Paquete.
- El formulario de Grupo permite agregar módulos directamente, indicar de una a seis instancias totales, su orden, obligatoriedad y fechas. La cantidad se obtiene de las filas Grupo-Módulo; no se guarda otro contador duplicado.
- `GrupoModulo.sufijo: String` permite distinguir módulos e instancias. El campo está siempre disponible, también para módulos diferentes. Es opcional cuando el módulo tiene una sola instancia; para instancias repetidas nuevas debe ser diferente y no vacío. El sufijo se añade al final del nombre del grupo-módulo.
- Las instancias históricas sin sufijo se conservan. Editar una configuración histórica sin alterar sus sufijos o cantidad no obliga a renombrarla.
- `Matricula.grupoId` es la referencia directa a Grupo; los módulos-estudiante siguen relacionados con sus grupos-módulo originales.
- Guardar un grupo actualiza su configuración en una transacción GraphQL. Los identificadores, nombres personalizados, calendarios, fechas y unidades propias de las instancias existentes se conservan. Un sufijo modificado sustituye al anterior sin acumularlo.
- No se permite retirar una instancia con matrículas, actividades programadas, jornadas, Parte Diario, prácticas, documentos, certificados o historial asociados.

## Matrículas y otros procesos

Los formularios de matrícula del sistema y sueltos consultan grupos por semestre. El Registro Auxiliar crea matrículas con `grupoId`; mantiene su validación propia de duplicados por grupo-módulo.

La comprobación de duplicados de los formularios identifica ahora estudiante + semestre + **grupo real**, en lugar de paquete compartido. Esto permite elegir otro grupo que antes compartía paquete si no hay cruce de horario. Se mantiene la prioridad del error de matrícula duplicada sobre el de recibo repetido y la prohibición de cualquier cruce de horario, incluyendo cruces entre instancias de un mismo grupo. Para instancias sucesivas deben configurarse fechas que no se superpongan.

Crear un módulo ya no genera un paquete. Cambiar el título del módulo conserva el nombre existente del grupo y sus datos Workspace. Solo se completa el nombre de un grupo-módulo si estaba vacío, como hacía el proceso anterior.

Nuevas funciones: `listGrupoConfiguracionOpciones`, `listMatriculaGruposBySemestre`, `listFormularioMatriculaGruposBySemestre` y `createMatriculaDesdeGrupo`.

## Migración y respaldo

Script: `dataconnect/migrations/20261013_fusion_paquetes_grupos.sql`.

Debe ejecutarse sobre el esquema anterior, antes de activar el esquema que elimina Paquetes. La transacción bloquea las tablas afectadas, respalda los datos y verifica que cada matrícula tenga un grupo inequívoco, del mismo semestre y consistente con sus módulos-estudiante. Ante una discrepancia que no pueda representarse, revierte toda la operación.

El respaldo SQL queda en `codex_backups.fusion_paquetes_grupos_20261013`, fuera del esquema público de la aplicación, para que el emulador no lo elimine al reconciliar sus tablas. El script es idempotente y no sobrescribe ese respaldo al repetirse.

La copia local tenía **73 grupos, 76 grupos-módulo y 1.173 matrículas**. Se mantuvieron todos sus identificadores. Los únicos cambios en registros existentes son la eliminación de los enlaces a Paquete, la incorporación de `sufijo` vacío y la asignación de `Matricula.grupoId` a partir de los módulos-estudiante.

Respaldo adicional local: `backups/fusion-paquetes-grupos-20261013/`. Incluye el archivo PostgreSQL previo y la comparación de las tablas afectadas. No contiene archivos de imágenes.

Para un despliegue futuro se debe repetir la auditoría sobre los datos remotos actuales, respaldarlos y coordinar la migración con la publicación del esquema, funciones y frontend. Los clientes anteriores que envían `paqueteId` necesitan recargar la aplicación; las funciones antiguas de Paquetes no forman parte de la versión nueva. No restaurar datos remotos desde el respaldo local.

## Validación

- Compilación del esquema SQL Connect y comprobación de tipos del frontend y Functions.
- Pruebas de sufijos, instancias consecutivas, límite de seis y compatibilidad con configuraciones históricas.
- Pruebas reales sobre el emulador: creación con sufijos, modificación sin cambiar IDs, reversión por error de clave foránea, eliminación de una instancia vacía y bloqueo de una utilizada.
- Matrícula real de prueba con `grupoId`, bloqueo de cruce horario y consultas de grupos por semestre.
- Edición sin cambios comparada con el registro original, incluyendo unidades propias y sus fechas.
- Prueba en navegador con autenticación y respuestas simuladas: creación y edición del modal, visibilidad condicional de sufijos, datos Workspace y nombre manual intactos, y ninguna llamada a Paquetes. No escribe datos remotos.
- Comparación de las tablas locales antes y después, con eliminación de los registros temporales de prueba.

Las pruebas de configuración se ejecutan con `node --test functions/lib/modules/grupos/configuracion.test.js`, después de compilar Functions.

## Limpieza y formulario del 14/10/2026

- Se retiraron los scripts de importación 2026-1 y migraciones individuales de Bisutería/Carpintería que dependían del modelo anterior, además del recálculo de títulos de Paquetes. Su historial permanece en Git; las migraciones SQL y los informes históricos se conservan.
- Las pruebas de matrículas y nombres usan el modelo de Grupo; el verificador de consumidores ya no consulta el módulo de Paquetes.
- El script de nombres de grupos usa los módulos actuales y solo completa nombres vacíos, conservando los nombres personalizados y los sufijos.
- Se regeneró `docs/schema-diagram.md` y se retiraron los archivos compilados residuales de Paquetes.
- El formulario de Grupo permite selección múltiple con Aceptar/Cancelar al pie del control. Aceptar incorpora los módulos seleccionados; Cancelar descarta la selección pendiente. No hay botón Agregar externo, no se ofrecen módulos ya incluidos y se respeta el límite de seis instancias totales.
- Reducir un módulo a una sola instancia conserva el sufijo de la instancia restante. Diferentes módulos pueden compartir un sufijo.
- El error local de `AdapterDayjs` correspondía a dependencias declaradas sin instalar. `npm install` instaló MUI X Date Pickers y Day.js; no se modificaron los imports válidos.
- Verificación: comprobación de tipos, pruebas de configuración, horarios/duplicados y preservación de nombres; prueba de navegador con respuestas simuladas y prueba de guardado real en el emulador, con eliminación de los registros temporales.

### Migración remota

La auditoría de la base remota del 14/10/2026 encontró 72 grupos, 75 grupos-módulo, 1.230 matrículas y 1.309 módulos-estudiante. Cada matrícula tiene un grupo inequívoco del mismo semestre. No se restauran datos locales sobre los remotos.

`scripts/fusion-paquetes-grupos.mjs` audita por defecto; con `--apply` bloquea las tablas afectadas, respalda y verifica íntegramente sus registros antes de confirmar la transacción. Conserva los IDs y todos los campos ajenos a la fusión. Los respaldos locales de los datos remotos se guardan en `backups/fusion-paquetes-grupos-remoto-20261014/`. La cuenta IAM remota puede administrar las tablas públicas pero no crear otro esquema: en ese caso el script exige un respaldo administrado de Cloud SQL completado correctamente, en lugar del respaldo SQL en `codex_backups` empleado en local. El primer intento se revirtió íntegramente por esta diferencia de permisos.

La migración remota se confirmó tras verificar los registros completos: se conservaron los 72 grupos, 75 grupos-módulo, 1.230 matrículas y 1.309 módulos-estudiante. Se retiraron las cuatro tablas de Paquetes y sus cuatro permisos. Respaldo administrado de Cloud SQL: `1792008788057`, completado correctamente. SQL Connect ya está publicado.

Estado de publicación: SQL Connect, Functions y Firebase Hosting publicados correctamente el 14/10/2026. Se eliminaron `createMatriculaDesdePaquete`, `createOrUpdatePaquete`, `deletePaquete`, `getPaquete`, `listPaquetes`, `listMatriculaPaquetesBySemestre` y `listFormularioMatriculaPaquetesBySemestre`.

URL publicada: https://cetprosmp-2026.web.app. Las consultas nuevas de configuración y matrícula de grupos responden correctamente y mantienen su requisito de autenticación. El servidor local quedó disponible en http://localhost:3001 con los emuladores existentes.

Verificación final remota: Grupos y Matrículas responden HTTP 200; `/intranet/paquetes`, `listPaquetes` y `createMatriculaDesdePaquete` responden HTTP 404. El archivo JavaScript publicado de Grupos contiene el selector múltiple y el campo de sufijo actualizado.
