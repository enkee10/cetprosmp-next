# Comparación de planes con plantillas AVANZA — 12 de octubre de 2026

**Resultado: los 14 planes revisados coinciden con los de la base de datos remota. No se encontraron diferencias de año ni semestre, planes ausentes ni celdas vacías. No se modificaron datos ni archivos en Storage.**

## Fuente y criterio

Se descargaron las 14 plantillas Excel actuales de `AVANZA/AVANZA-Plantillas-Registro-2026/`, en el bucket `cetprosmp-2026.firebasestorage.app`. Se identificó cada carrera por el nombre del archivo y se leyó exclusivamente el plan indicado en **DATA!K16**.

La comparación corresponde al campo **`Plan.planEstudio`** de la base de datos remota. Se ignoran únicamente mayúsculas y minúsculas al comparar los textos del plan; se conservan los caracteres, espacios y signos. En todos los archivos figura `PLAN` y en la base de datos `Plan`: esa es la única diferencia textual encontrada.

Cada una de las 14 carreras revisadas tiene **un único plan** en remoto. Por ello, ese plan es el considerado y no fue necesario seleccionar entre varios. En toda la lectura remota se encontraron 20 carreras y 20 planes, uno por carrera.

## Comparación por carrera

| Carrera | ID plan | DATA!K16 | Plan en remoto | Versión | Resultado | Archivo |
| --- | --- | --- | --- | --- | --- | --- |
| Bordados Computarizados y Manuales | 8 | PLAN 2026-1 | Plan 2026-1 | 2026-1 | Coincide (solo distinta capitalización) | PE-BORDADOS COMPUTARIZADOS Y MANUALES.xlsx |
| Confección de Artículos de Cuero y Marroquinería | 11 | PLAN 2025-1 | Plan 2025-1 | 2025-1 | Coincide (solo distinta capitalización) | PE-CONFECCION DE ARTICULOS DE CUERO Y MARROQUINERIA.xlsx |
| Corte Aparado y Armado de Calzado | 10 | PLAN 2025-1 | Plan 2025-1 | 2025-1 | Coincide (solo distinta capitalización) | PE-CORTE APARADO Y ARMADO DE CALZADO.xlsx |
| Corte y Ensamblaje | 6 | PLAN 2025-1 | Plan 2025-1 | 2025-1 | Coincide (solo distinta capitalización) | PE-CORTE Y ENSABLAJE.xlsx |
| Costura y Acabados | 7 | PLAN 2025-1 | Plan 2025-1 | 2025-1 | Coincide (solo distinta capitalización) | PE-COSTURA Y ACABADOS.xlsx |
| Equipos Electrónicos de Consumo | 2 | PLAN 2026-1 | Plan 2026-1 | 2026-1 | Coincide (solo distinta capitalización) | PE-EQUIPOS ELECTRICOS DE CONSUMO.xlsx |
| Hilandería | 3 | PLAN 2026-1 | Plan 2026-1 | 2026-1 | Coincide (solo distinta capitalización) | PE-HILANDERIA.xlsx |
| Mantenimiento Básico de Casas y Edificios | 15 | PLAN 2026-1 | Plan 2026-1 | 2026-1 | Coincide (solo distinta capitalización) | PE-MANTENIMIENTO BASICO DE CASAS Y EDIFICIOS.xlsx |
| Manualidades | 12 | PLAN 2026-1 | Plan 2026-1 | 2026-1 | Coincide (solo distinta capitalización) | PE-MANUALIDADES.xlsx |
| Operación de Computadoras | 5 | PLAN 2026-1 | Plan 2026-1 | 2026-1 | Coincide (solo distinta capitalización) | PE-OPERACION DE COMPUTADORAS.xlsx |
| Panadería y Pastelería | 13 | PLAN 2025-1 | Plan 2025-1 | 2025-1 | Coincide (solo distinta capitalización) | PE-PANADERIA Y PASTELERIA.xlsx |
| Peluquería y Barbería | 1 | PLAN 2025-1 | Plan 2025-1 | 2025-1 | Coincide (solo distinta capitalización) | PE-PELUQUERIA Y BARBERIA.xlsx |
| Servicios Básicos Gastronómicos | 16 | PLAN 2026-1 | Plan 2026-1 | 2026-1 | Coincide (solo distinta capitalización) | PE-SERVICIOS BASICOS GASTRONOMICOS.xlsx |
| Soporte Técnico y Operaciones de Centros de Computo | 4 | PLAN 2025-1 | Plan 2025-1 | 2025-1 | Coincide (solo distinta capitalización) | PE-SOPORTE TECNICO Y OPERACIONES DE CENTROS DE COMPUTO.xlsx |

## Aclaraciones sobre nombres de archivo

- `PE-CORTE Y ENSABLAJE.xlsx`: El archivo dice «CORTE Y ENSABLAJE»; identificado como «Corte y Ensamblaje».
- `PE-EQUIPOS ELECTRICOS DE CONSUMO.xlsx`: El archivo dice «EQUIPOS ELECTRICOS DE CONSUMO»; identificado como «Equipos Electrónicos de Consumo».

Estas correspondencias se revisaron explícitamente. No se renombraron las plantillas ni las carreras.

## Carreras sin plantilla en esta carpeta

Estas seis carreras existen en remoto, pero no tienen archivo correspondiente entre las 14 plantillas revisadas. Sus planes no pueden validarse contra estas fuentes.

| Carrera | ID plan | Plan en remoto |
| --- | --- | --- |
| Confección Textil | 9 | Plan 2023-1 |
| Asistencia en Cocina | 17 | Plan 2024-1 |
| Peluquería | 19 | Plan 2022-1 |
| Asistencia de Pastelería y Panadería | 14 | Plan 2022-1 |
| Cuero y Calzado | 18 | Plan 2023-1 |
| Operaciones Básicas en Confección Industrial (PFC) | 20 | Plan 2026-1 |

## Evidencia

Consulta remota realizada: `2026-10-12T23:45:23.806Z` (UTC). La revisión usó únicamente consultas de lectura de Firebase SQL Connect y descargas de Storage.

Los archivos `tmp/avanza-plan-review-20261012/storage-source.json`, `remote-read.json` y `comparison.json` conservan la lista de fuentes con generaciones y hashes, los planes leídos y la comparación por carrera. Los Excel se abrieron en modo de solo lectura y no se ejecutaron fórmulas ni macros.
