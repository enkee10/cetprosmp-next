# Manualidades y exclusión de coordinadores — 16 de octubre de 2026

Se corrigieron los seis grupos-módulo de Manualidades de 2026-2 en producción. La secuencia se ancla al inicio del semestre, 10 de agosto: primer viernes para martes/jueves, siguiente para lunes/miércoles. No se reinicia al cambiar de módulo. El 16 de octubre corresponde a lunes/miércoles.

Se retiraron de la programación activa las jornadas en días ajenos al horario, incluidos cierres y PPP. Se conservaron los días válidos del calendario original; no se agregaron clases en fechas no previstas, como el día de gestión del 23 de octubre. Las jornadas retiradas y sus eventos se conservan cancelados para auditoría. Los ocho partes existentes mantienen sus campos y firmas.

La recuperación conserva cada actividad, su duración total, las horas curriculares y de PPP y la fecha límite de cada módulo. Las clases pendientes mantienen su orden cronológico y se segmentan cuando es necesario. Las unidades y eventos reflejan las fechas resultantes. Los días mixtos tienen primero currículo y después PPP, sin superposición.

## Recuperación y salidas (America/Lima)

Las horas adicionales de esta tabla son horas de reloj. Las horas de los módulos son académicas de 45 minutos.

| Grupos-módulo | Total por módulo | Recuperación curricular | Recuperación PPP | Fecha límite |
| --- | --- | --- | --- | --- |
| 163 y 171 — Decoración de Eventos Especiales | 300 h | 24 min 32–33 s en cada una de 11 jornadas desde el 16/10 | 3 h en cada una de 9 jornadas válidas | 16/12/2026 |
| 164 y 174 — Decoraciones Navideñas (ago-oct) | 150 h | Sin cambios | 1 h 30 min en cada una de 6 jornadas válidas | 16/10/2026 |
| 165 — Pintura Decorativa; 175 — Decoraciones Navideñas (oct-dic) | 150 h | 54 min en cada una de 15 jornadas | 4 h 30 min en cada una de 4 jornadas válidas | 17/12/2026 |

Las PPP de los grupos 163 y 171 terminan a las 16:00 y 20:45. En los grupos 164 y 174 terminan a las 14:30 y 19:15; su última jornada válida es el 15 de octubre. Esta redistribución ajusta la programación histórica y no certifica asistencia ni horas efectivamente realizadas.

Las PPP de los grupos 165 y 175 terminan normalmente a las 17:30 y 22:15. El 17 de diciembre, por ser una jornada mixta con recuperación curricular y PPP, terminan a las **18:24 y 23:09**, respectivamente. Ninguna jornada cruza la medianoche ni la fecha límite.

## Coordinadores

El servidor excluye de las filas del Parte Diario a los coordinadores registrados en los semestres y a quienes tienen rol Coordinador. La exclusi?n tambi?n se aplica al consultar semestres antiguos sin coordinadores asignados. Esto también excluye a Enrique Palomino aunque su ficha de personal use una cuenta docente. La exclusión cubre clases, PPP, pendientes y registros históricos recuperados en la lista. Los reportes excluyen sus registros, sus horas programadas y sus opciones de docente, para mantener coherentes los indicadores. Los registros originales permanecen en la base.

Se conserva el acceso de las dos cuentas de coordinación para gestionar el Parte Diario. No se modificaron usuarios, roles ni permisos.

## Implementación y comprobaciones

- `scripts/alternating-calendar.cjs`: secuencia semestral y recuperación uniforme, con diferencias de hasta un segundo por redondeo.
- `scripts/plan-calendarizacion-2026.cjs`: aplica la secuencia también a PPP, cierres y fechas reubicadas; conserva precisión de segundos al segmentar actividades.
- `scripts/repair-manualidades-schedule.cjs`: previsualización por defecto, destino explícito, respaldo, control de cambios concurrentes y aplicación en una sola transacción. La segunda ejecución no realiza cambios.
- `functions/src/modules/parte-diario/eligibility.ts`: exclusión común para lista y reportes.

La operación de 443 campos se probó en el emulador con una réplica de las filas afectadas y una reversión intencional de toda la transacción. Se comprobó que los datos locales permanecieran iguales. Posteriormente se aplicó a remoto: seis módulos con horas exactas, cero cruces y ocho partes conservados. Respaldo de la aplicación: `backups/manualidades-20261016/remote-1792162496953-before.json`; planificación y estado posterior en la misma carpeta, fuera de Git y del despliegue.

Pasaron la compilación de Functions, TypeScript del proyecto, la compilación SQL Connect y `node scripts/test-alternating-calendar.cjs`. Las consultas reales verificaron hoy únicamente los grupos 163 y 171 para Manualidades y la ausencia de los coordinadores 13 y 37, conservando las dos cuentas de acceso.

Se publicaron Hosting, su backend Next.js y las doce funciones de Parte Diario. Tras el ajuste adicional de consultas históricas se volvieron a publicar las doce funciones. Se comprobaron sus nuevas versiones ACTIVE, la coincidencia exacta de los tres archivos compilados relevantes con el código descargado de producción y el rechazo de llamadas sin autenticación. `/parte-diario` responde HTTP 200 en ambos dominios con `Cache-Control: no-store`. El emulador iniciado para la prueba se detuvo sin exportar cambios.
