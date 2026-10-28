# Unidades didácticas independientes — verificación local

Fecha: 26/10/2026, America/Lima. Solo se modificaron código y emuladores locales. No se desplegó ni migró producción.

## Resultado

- Se retiró `UnidadDidactica.comun` del esquema, consultas, tipos, formularios e importadores.
- Se eliminaron la reutilización de unidades y los bloqueos de edición, ordenamiento y creación de capacidades, indicadores y sesiones asociados al antiguo indicador.
- Cada unidad admite una competencia de un solo módulo. El servidor rechaza asociaciones con otros módulos y el esquema declara unicidad sobre `CompetenciaUnidadDidactica.unidadDidacticaId`. Las consultas inversas de capacidades se adaptaron a la relación única.
- Los módulos comunes entre planes son un concepto distinto y se mantienen.

## Migración aplicada

Las cinco unidades antiguamente comunes se convirtieron en 33 unidades independientes: se conservó una unidad original por cada primer módulo propietario y se crearon 28 copias para los demás usos. Se preservaron los campos de horas, créditos, siglas, orden, fechas y contenidos.

| Entidad | Antes | Después |
| --- | ---: | ---: |
| Unidades didácticas | 151 | 179 |
| Relaciones competencia–unidad | 171 | 171 |
| Capacidades terminales | 172 | 216 |
| Indicadores | 469 | 571 |
| Aprendizajes | 282 | 444 |
| Sesiones | 873 | 873 |
| Contenidos de sesiones | 3085 | 3085 |
| Materiales de sesiones | 3301 | 3301 |
| Unidades de grupos | 410 | 410 |
| Sesiones programadas | 1502 | 1502 |
| Promedios de unidades | 3739 | 3754 |
| Promedios de capacidades | 4694 | 4709 |
| Promedios de indicadores | 11832 | 11862 |

Las notas adicionales conservan el mismo valor de las notas originales: antes una fila era utilizada por varios módulos de la misma matrícula y ahora cada módulo tiene su propia fila. Se conservaron todos los registros originales, modificando sus referencias cuando correspondía.

Cuatro copias corresponden a usos históricos en grupos que no forman parte del programa curricular vigente: unidad original 94 en módulo 31; 95 y 96 en módulo 19; 98 en módulo 18. Mantienen sus vínculos con grupos y notas sin agregar unidades al programa vigente. Las cuatro unidades previamente sin relación curricular (92, 103, 105 y 106) se conservaron; ninguna pertenece al conjunto migrado.

## Respaldo y persistencia

- Respaldo de datos anterior al arranque: `backups/data-before-emulators-20261026-100650/`.
- Datos y correspondencias de la migración aplicada: `backups/independent-units-local/2026-10-26T15-18-16-108Z/{before,report}.json`.
- Exportación posterior: `backups/independent-units-local-after-20261026/` y `data/`.
- Se verificó el arranque desde la exportación migrada: 179 unidades y ausencia física de la columna `comun`.
- El emulador activo importa desde el respaldo posterior y exporta a `data/`, usando directorios distintos. Las exportaciones de Storage generan nuevos nombres internos UUID; se verificaron los contenidos por objeto y se preservó la exportación original de Storage para evitar cambios ajenos a esta migración.

## Validación

- Compilación de Data Connect, TypeScript del frontend y build de Functions.
- Comparación completa de campos y relaciones en la misma transacción, sin borrados en cascada.
- Prueba de migración transaccional con sesiones genéricas y propias, contenidos, materiales, fases, evaluaciones, notas, cronogramas y partes diarios; todos los datos temporales se descartan.
- Unicidad de unidades, independencia de edición e idempotencia de la migración.
- Registros auxiliares de 55 grupos afectados: unidades, capacidades, indicadores y textos conservados.
- Diez consultas de consumidores de estructura, matrícula, registro auxiliar y reportes.
- Pruebas de certificados Excel, filtros curriculares, estructura de sílabos e importación de unidades propias por módulo.
- Navegador autenticado contra emuladores: listado, formulario de unidad y programación curricular sin el concepto retirado y sin errores de JavaScript.

Para revisar: `http://localhost:3001/intranet/unidades-didacticas` y `http://localhost:3001/intranet/estructura-academica`.

## Herramientas para repetir la revisión local

```powershell
node scripts/migrate-independent-units-local.mjs
node scripts/migrate-independent-units-local.mjs --rehearse
node scripts/test-independent-units-migration.mjs
node scripts/test-independent-units-import.mjs
node scripts/verify-independent-units-local.mjs
```

El ejecutor de migración solo abre `127.0.0.1:5432`; `--apply` confirma los cambios únicamente en ese emulador. El núcleo `scripts/independent-units-migration.mjs` no abre conexiones: permite revisar y reutilizar la transformación cuando se autorice la fase remota. El SQL final está en `dataconnect/migrations/20261026_make_units_independent.sql`; no sustituye la copia y reasignación previa de los datos. Una nueva auditoría y un respaldo remotos son necesarios para esa fase; no debe importarse el volcado local sobre producción.
