# Reorganización remota de grupos — 14 de octubre de 2026

Proyecto: `cetprosmp-2026`. Semestre: `2026-2` (ID 4). Fechas académicas y horas locales: `America/Lima`.

## Resultado de datos

| Docente | Grupo | Grupo-módulo | Módulo existente | Resultado |
|---|---:|---:|---|---|
| Richard Ramos | 165 | 155 | 32 — Carpintería en Melamina | Conservado sin modificar horario, fechas ni matrículas. |
| Richard Ramos | 208 | 204 | 31 — Mantenimiento de Carpintería / Carpintería en Madera | Creado por separado, sufijo `(oct-dic)`, con los 23 estudiantes de Melamina. |
| Romelio Figueroa | 175 | 166 | 14 — Bordados Computarizados | Sufijo `(ago-oct)`, lunes a viernes, del 10 de agosto al 21 de octubre. |
| Romelio Figueroa | 207 | 203 | 14 — Bordados Computarizados | Creado por separado, sufijo `(oct-dic)`, lunes a viernes, del 22 de octubre al 23 de diciembre. |

Se utilizaron módulos del catálogo existente. No se crearon módulos académicos nuevos ni se agregaron etapas a los grupos anteriores.

La última indicación para Richard fue conservar el horario del grupo vacío de martes, jueves y viernes alternos. El grupo 208 conserva ese horario, el turno noche de 17:45 a 22:15 y sus fechas previas: 11 de agosto a 17 de diciembre en Lima. El sufijo `(oct-dic)` conserva la etiqueta solicitada, sin alterar esas fechas. No se aplicó el plan previo de etapas consecutivas de lunes a viernes para Richard.

El módulo 31 tiene unidades didácticas, pero no actividades de sílabo propias. Sus jornadas curriculares quedaron pendientes y se vincularon sus unidades sin inventar actividades ni copiar las correspondientes a Melamina.

La segunda etapa de Romelio usa el turno **Noche ampliada**, desde las 16:15. Son 42 días lectivos, excluyendo los días no lectivos del calendario: 36 jornadas de 7 horas académicas (hasta las 21:30) y 6 jornadas finales de 8 horas académicas (hasta las 22:15). Cada hora académica corresponde a 45 minutos. Total: 300 horas, distribuidas en 180 técnicas, 30 de empleabilidad y 90 de PPP. La primera etapa mantiene sus jornadas y partes existentes. No se matricularon automáticamente estudiantes en la segunda etapa de Romelio.

## Eliminación autorizada y respaldo

El usuario autorizó expresamente borrar el grupo vacío 167 y sus registros asociados. Se eliminó su grupo-módulo 157, sus jornadas, actividades programadas y enlaces de unidades, un Parte Diario firmado, un documento académico y un registro histórico de cambio de módulo. La matrícula vigente de ese último registro pertenecía a otro grupo y se conservó. También se eliminaron sus dos archivos de nómina y su grupo de Google Workspace, después de respaldarlos.

Respaldo Cloud SQL completo: **1792018768238**, estado `SUCCESSFUL`.

Respaldos locales privados, excluidos de Git: `backups/grupos-etapas-20261014/`. Incluyen las filas originales, la configuración y miembros del grupo de Workspace eliminado y los archivos PDF/XLSX de la nómina. Las comprobaciones de conservación se realizaron dentro de la misma transacción antes de confirmar los cambios.

Las **1.230 matrículas anteriores** y los **1.309 registros de módulos de estudiantes**, incluyendo notas, se conservaron exactamente. Se crearon 23 matrículas adicionales y sus enlaces correspondientes para Carpintería en Madera. Los dos grupos nuevos quedaron sincronizados con Google Workspace y los 23 estudiantes están vinculados al grupo de Carpintería.

## Visibilidad y matrícula

Quedan cuatro grupos activos: 165, 175, 207 y 208. Los otros 69 están `inactivo`, sin archivarlos. Solo se ocultan de los selectores de los formularios de matrícula de intranet y de los formularios independientes. Las matrículas existentes siguen accesibles y los grupos inactivos siguen admitiendo matrícula desde Registro Auxiliar, sujetos a las validaciones normales de período, duplicados y cruces de horario.

En el formulario de grupos, Estado permite elegir Activo o Inactivo. La consulta compartida de los formularios excluye los grupos inactivos; la resolución de un grupo para matricular no utiliza su visibilidad para rechazar una matrícula.

## Validación

- Compilación TypeScript de Functions y compilación de producción de Next.js correctas.
- Pruebas de matrícula: cruces, turnos nocturnos, viernes alternos, edición y prioridad de validaciones correctas.
- Prueba de grupos ocultos: siguen siendo matriculables; grupos inexistentes y períodos incorrectos siguen siendo rechazados.
- Consulta GraphQL real validada contra SQL Connect remoto: devuelve exactamente los cuatro grupos activos y sus cuatro grupos-módulo.
- Verificación remota: los mismos 23 estudiantes en Melamina y Carpintería; 300 horas y última jornada de Romelio el 23 de diciembre; ausencia del grupo y registros eliminados.
- Despliegue completado: las seis funciones de matrícula afectadas, el servidor Next.js y Firebase Hosting. Publicación: `https://cetprosmp-2026.web.app`.
- Comprobación de la publicación: `/intranet/grupos` y `/intranet/matriculas` responden HTTP 200. El JavaScript publicado contiene el nuevo selector de estado de grupos.

Script administrativo: `scripts/reorganizar-grupos-docentes.mjs`. Por defecto solo prepara y valida; la ejecución aplicada requirió `--apply --delete-legacy`. Rechaza repetir la operación si ya existen los grupos nuevos.
