# Fusión de Paquetes con Grupos

Implementada y migrada **solo en local** el 13/10/2026. No se desplegó ni modificó la base remota.

## Modelo y formulario

- Se eliminan las entidades operativas `Paquete`, `PaqueteModulo`, `PaqueteGrupo` y `MatriculaPaquete`, sus formularios, funciones y permiso de Paquetes.
- Se eliminan `Grupo.paqueteId` y `Matricula.paqueteId`.
- Se conservan los valores propios de Grupo: nombre, descripción, archivado, docente, semestre, turno, horario y datos Workspace. No se copia título, descripción ni archivado de Paquete.
- El formulario de Grupo permite agregar módulos directamente, indicar de una a seis instancias totales, su orden, obligatoriedad y fechas. La cantidad se obtiene de las filas Grupo-Módulo; no se guarda otro contador duplicado.
- `GrupoModulo.sufijo: String` es el nuevo campo para distinguir instancias del mismo módulo. Solo se muestra cuando ese módulo tiene más de una instancia. Cada instancia nueva debe tener un sufijo diferente y no vacío. El sufijo se añade al final del nombre del grupo-módulo.
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
