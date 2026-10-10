# Reprogramación local de 2026

La aplicación inicial del 9 de octubre de 2026 se realizó en el emulador local. Posteriormente se publicó la programación de los 75 grupos-módulo existentes en remoto, quedando pendiente decidir sobre el grupo de Bordados presente solo en local; ver [registro del despliegue](despliegue-avanza-parte-diario-2026-10-09.md). La importación anterior de marcas PDF y el primer despliegue general siguen documentados por separado.

Se usan los 20 bloques de los cinco PDF de `Calendarizacion 26-2.zip`, incluidos ambos semestres. Las fechas y hashes están en `scripts/data/calendarizacion-2026-jornadas.json`; `scripts/plan-calendarizacion-2026.cjs` prepara un plan desde una exportación sin conectarse a servicios ni escribir en bases de datos.

Decisiones confirmadas por el usuario:

- Redistribuir horas, manteniendo todos los contenidos y las sesiones de empleabilidad divididas de 3 horas.
- Trasladar PPP marcadas en fines de semana a días hábiles dentro del período de prácticas.
- Incorporar los viernes alternos a los grupos que figuraban solo martes/jueves, siguiendo la referencia PDF.
- Crear jornadas con «Pendiente de sílabo» donde no existen actividades.
- Adaptar la referencia de 300 horas a Manejo de Máquinas Industriales, conservando las 240 horas y sus 90 horas de EFSRT. Se crearon calendarios propios de 240 horas para 2026-1 y 2026-2 (IDs 30 y 31).
- Corregir a lunes a viernes los dos grupos de Cocina de 528 horas de 2026-1, de Marcelina Torres y Rosa Moscol.

Las horas son académicas de 45 minutos. Los turnos conservan sus horas reales: mañana 08:30–13:00, tarde 13:15–17:45 y noche 17:45–22:15. Se reservan las fechas de empleabilidad del PDF y se reubican 16 bloques técnicos que se superponían entre grupos del mismo docente. Las jornadas PPP/EFSRT mantienen sus períodos de referencia y pueden coincidir con las de otros grupos según los PDF; la comprobación de cruces corresponde a clases curriculares.

Resultado: 76 grupos-módulo, 4.968 jornadas, 2.743 segmentos de actividades y 98 ajustes de duración en horas enteras. Las sesiones que ya tenían 3 horas conservaron esa duración. Hay 21 grupos-módulo sin actividades de sílabo, representados como pendientes; no se inventaron contenidos. Todas las actividades existentes de los módulos programados quedaron incluidas y se verificaron las horas exactas de cada módulo. Las prácticas y jornadas pendientes también se vinculan a su grupo-módulo en el calendario; las clases de empleabilidad tienen su tipo y color propios.

Tablas con datos modificados: `actividades`, `calendarios`, `eventos`, `evento_relaciones`, `grupo_modulo_actividades`, `grupo_modulo_jornadas`, `grupo_modulo_unidades_didacticas`, `grupo_modulos` y `grupos`. Se verificó que las demás tablas conservaran sus datos, incluidos estudiantes, matrículas, contenidos, materiales y planes.

Respaldo completo previo a aplicar: `tmp/parte-diario-reprogramacion/before-apply-1791574998753.json`. El plan, resultados, exportación posterior y comprobaciones están en esa misma carpeta, fuera del despliegue y del control de versiones. La aplicación se realizó en una transacción local, reutilizando los identificadores de segmentos existentes.

Comprobado en el Parte Diario del 9 de octubre: aparecen Ana Ramírez, Fanny Acuña, Richard Ramos y Romelio Figueroa. Ana y Fanny tienen 16 matriculados cada una. Carpintería de Richard y el grupo de martes/jueves/viernes de Romelio tienen cero matrículas vinculadas en la base local; se conservó ese dato. Richard aparece pendiente de sílabo.
