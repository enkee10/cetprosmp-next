# Calendarización 2026

La importación usa los cinco PDF de `Calendarizacion 26-2.zip`, proporcionados por el usuario. Aunque el ZIP dice 26-2, los documentos contienen ambos semestres; el usuario indicó importar todo 2026 y vincular los grupos-módulo que coincidan por horas y días.

Los datos revisados están en `scripts/data/calendarizacion-2026.json`. Hay 14 perfiles: siete combinaciones de horas y horario por cada semestre.

| Horas | Horarios |
| --- | --- |
| 150 | Lunes, miércoles y viernes alterno; martes, jueves y viernes alterno |
| 300 | Los dos horarios anteriores y lunes a viernes |
| 512 | Lunes a viernes |
| 528 | Lunes a viernes |

Los PDF contienen 646 marcas de fechas, deduplicadas por perfil, fecha y tipo. Se conservaron los colores y los tipos de su leyenda: empleabilidad, EFSRT/PPP, gestión, vacaciones/gestión, feriado, inicio y término de clases y día del logro. Las casillas sin color y el sombreado ordinario de sábados/domingo no generan eventos. Las marcas EFSRT de los perfiles de Opción Ocupacional (150 y 300 horas) se denominan PPP.

Las marcas son eventos de todo el día, de medianoche a medianoche en `America/Lima`, con `computaHoras: false`. No se infieren horas a partir de los días coloreados. Los PDF no siempre señalan ambos extremos de cada ciclo; solo se importan las marcas presentes.

La correspondencia usa semestre, horas del módulo y horario del grupo. Las dos programaciones de 150 horas, y las dos de 300 horas de lunes a viernes, se conservan dentro del calendario del semestre correspondiente. No se alteran los horarios ni las fechas de clases existentes. Se trasladan las asociaciones de calendario de los grupos-módulo, sus eventos, y del grupo cuando todos sus módulos corresponden al mismo calendario. Los antiguos eventos de periodo con nombres como `512 horas (S2)` se trasladan al calendario correspondiente sin cambiar sus fechas.

Los grupos con combinaciones ausentes en los PDF conservan sus asociaciones. No se aproxima martes/jueves a martes/jueves/viernes ni se cambia una duración de 240 horas a 300 horas.

## Ejecución local

```powershell
node scripts/import-calendarizacion-2026.cjs
node scripts/import-calendarizacion-2026.cjs --apply
```

El script fuerza el emulador SQL Connect en `127.0.0.1:9399`; no tiene modo remoto. Antes de aplicar crea un respaldo en `tmp/calendarizacion-import/before-*.json`. Cada calendario se importa con sus marcas y asociaciones en una transacción. Una repetición reconoce los eventos existentes para evitar duplicados. El resultado se guarda en `tmp/calendarizacion-import/result.json`.

No se agregan entidades ni campos. Se usan `Calendario`, `Evento`, `EventoRelacion`, `GrupoModulo` y las asociaciones existentes.

Los cambios de calendario se publicaron en remoto el 9 de octubre de 2026 mediante una sincronización de registros y campos respecto de la copia base descargada el 8 de octubre. Se conservaron los registros remotos ajenos a estos cambios. La comprobación de la agenda remota encontró las 646 marcas importadas. El script de importación anterior sigue siendo exclusivamente local.
