# Fechas y horas de la aplicación

La zona de la aplicación es `America/Lima` (UTC−05:00). No depende de la zona del navegador, del equipo o del servidor. La implementación compartida está en `functions/src/shared/appDateTime.ts`; el frontend la importa mediante `src/lib/dateOnly.ts`.

- **Instantes** (eventos, publicaciones, matrículas, auditoría): los formularios interpretan entradas sin zona como hora peruana y envían ISO con zona explícita. Se almacenan en UTC y se muestran en Lima. Para mostrar solo el día de un instante se usa `formatInstantDateInAppTimeZone`.
- **Fechas de calendario** (nacimiento, inicio y fin de períodos): se conserva el día seleccionado. Los campos SQL `Date` siguen siendo `YYYY-MM-DD`. Cuando el esquema existente usa `Timestamp`, una fecha nueva sin hora se representa como la medianoche de Lima (`05:00Z`). Las fechas antiguas a medianoche UTC se reconocen como fechas sin hora, incluso con seis decimales de SQL Connect; no se desplazan al día anterior.
- **Horas de turno**: las horas antiguas con referencia `1970-01-01THH:mmZ` representaban una hora de reloj, no un instante. Se leen con esa convención. Al guardar se usa la referencia `2000-01-01` en Lima, convertida a UTC. `toTimeOnlyInputValue` interpreta ambas representaciones; no extraer la hora directamente del ISO. El calendario, la detección de cruces y los importadores usan el mismo conversor.
- **Períodos académicos**: la fecha final incluye el día completo en Lima. El cierre se calcula como la medianoche del día siguiente, con límite exclusivo.

El Registro Auxiliar permite consultar al docente sus grupos del semestre configurado como actual. Al terminar la fecha final de ese semestre, todas las escrituras del registro quedan bloqueadas para docentes, también en Functions; la consulta continúa. La pantalla muestra `(Modulo Finalizado)` y actualiza su estado al cruzar medianoche. Los administradores mantienen sus permisos normales. El cambio del semestre actual sigue siendo manual.

El menú usa las entradas convencionales, filtradas por permisos, sin consultar módulos para construirlo. Las opciones de módulos se cargan dentro de las pantallas y se restringen en el servidor por docente y semestre actual.

No se ejecuta una corrección masiva de datos históricos: la compatibilidad se aplica al leerlos. Un instante antiguo sin evidencia suficiente de la hora originalmente deseada no debe desplazarse automáticamente.

Validación: `npm --prefix functions run build`, `node scripts/test-peru-dates.cjs` (cuatro zonas horarias), `node scripts/test-registro-semester-close.cjs`, `node scripts/test-calendario.cjs`, `node scripts/test-matricula-schedule.cjs`, `node scripts/test-semestre-global.cjs` y las pruebas de navegador de Registro Auxiliar y Matrículas.
