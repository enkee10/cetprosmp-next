# Importacion de Silabos

La importacion conserva las unidades didacticas, capacidades e indicadores
existentes. Las sesiones pertenecen al modulo del plan, mediante `Actividad` y
su relacion `IndicadorCapacidad -> Aprendizaje -> Actividad`.

- `Actividad.duracion` guarda horas pedagogicas de 45 minutos.
- `Actividad.moduloId`, `numeroSesion` y `orden` identifican la sesion del plan.
- `ActividadContenido` y `ActividadMaterial` guardan un elemento por registro,
  con `orden` y `texto`. El documento puede elegir numeracion o vinetas.
- `GrupoModuloActividad` guarda `inicio`, `fin` y el evento de cada grupo.
  `segmento` permite repartir una sesion en varias franjas sin cambiar su duracion.
- El campo antiguo `Actividad.fecha` se conserva por compatibilidad; esta
  importacion lo deja vacio. Las fechas nuevas se guardan en la programacion.

## Ejecucion

El importador usa `exceljs`, ya instalado en `functions`, y el Admin SDK de
Data Connect. Por defecto apunta al emulador de `127.0.0.1:9399`.

```powershell
node scripts/import-silabus.mjs --production --snapshot
node scripts/import-silabus.mjs --production --offline
node scripts/import-silabus.mjs --production --apply --allow-pending
node scripts/complete-silabus.mjs --production
node scripts/complete-silabus.mjs --production --apply
```

`--excel` permite indicar otro archivo. La vista previa, respaldo e informe
quedan en `tmp/silabus`. Los respaldos iniciales no se sobreescriben.
`--allow-pending` permite cargar las sesiones con una asociacion disponible,
dejando detalladas las filas sin estructura para relacionarlas.

## Asociaciones y Fechas

Se busca por coincidencia de texto dentro del modulo y luego por posicion de
capacidad e indicador, conforme al criterio acordado. Cuando las cantidades
de indicadores difieren, se usa su posicion relativa; los codigos de indicador
ayudan cuando corresponden a una posicion disponible. No se crean unidades,
capacidades ni indicadores automaticamente en la carga inicial.

La ampliacion autorizada se ejecuta con `complete-silabus.mjs`. Completa solo
los modulos 38 y 13, conservando el texto del Excel para unidades, capacidades
e indicadores. Los creditos y horas de unidad se copian cuando estan presentes;
si faltan, permanecen vacios. Se crean competencias pendientes con nombre
vacio, como hace el servicio existente, porque el silabo no tiene esa columna.
El tipo y orden de las relaciones siguen las reglas academicas del sistema.
Primero se simula la estructura y programacion completas; la insercion de cada
modulo es atomica. La repeticion reutiliza los registros ya creados.

Solo los nombres de sesiones nuevas se limpian de codigos, numeracion y etiquetas iniciales.
Los contenidos y materiales conservan su texto, separando las marcas de lista.
Las filas academicamente identicas con distintas fechas se guardan una sola
vez; fechas y grupos no forman parte de la identidad de la sesion del plan.

Se interpretan fechas Excel, ISO, formatos de dia/mes/anio y meses escritos en
espanol. Se corrigen separadores y errores que el contexto permite resolver.
Las fechas de otras ediciones se interpolan dentro del periodo del grupo.
Las etapas `ago-oct` y `oct-dic` se respetan cuando aparecen en el grupo.

Se toman las horas de reloj de `Turno` y los dias de `Horario`. En 2026-2,
el primer viernes del semestre pertenece a martes/jueves, y el siguiente a
lunes/miercoles. La alternancia no se reinicia al cambiar de modulo.
Se excluyen feriados y se evitan cruces entre los modulos de un mismo grupo.

Cada sesion importada tiene una clave que permite repetir la carga sin
duplicarla. Las inserciones de sesion/listas y evento/relaciones son atomicas.
Al terminar se verifica que las unidades, capacidades e indicadores sigan
exactamente como estaban y que las listas y fechas coincidan con el informe.
La ampliacion conserva ademas todas las sesiones y programaciones anteriores,
respaldadas en `before-completion-remote.json`. No actualiza grupos ya cargados.

## Verificacion y Despliegue

```powershell
node scripts/test-silabus.mjs
node scripts/test-silabus-structure.mjs
npm --prefix functions run build
node scripts/verify-silabus-local.mjs
npx tsc --noEmit --incremental false
npx -y firebase-tools@latest dataconnect:compile --project cetprosmp-2026
```

La base remota utiliza migraciones administradas por el proyecto. La migracion
aditiva esta en `dataconnect/migrations/20261007_add_silabus_sessions.sql`.
`scripts/apply-silabus-schema.mjs --cli-root <firebase-tools> --apply` la aplica
mediante el conector Cloud SQL y autenticacion IAM, siguiendo el patron del repo.
Despues se publica Data Connect, las funciones modificadas y Hosting.
