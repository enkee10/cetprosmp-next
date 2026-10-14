# Informe de revisión de nombres de carreras — 12 de octubre de 2026

Se compararon los 20 nombres proporcionados con la entidad `Carrera`, campo `nombre`, en local y remoto. Se ignoraron las diferencias de mayúsculas/minúsculas y se excluyó `(AUXILIAR)` de los nombres de referencia. Los espacios de relleno del formato de la tabla se interpretaron como un solo espacio; la comparación de los nombres registrados sí consideró los caracteres, las tildes y los espacios. «Computo» se conservó sin tilde, conforme al texto recibido.

## Resultado

- 18 carreras ya coincidían y no requirieron cambios.
- 1 carrera se corrigió en ambos entornos.
- 1 nombre solicitado no corresponde a una carrera existente: Tintorería y Estampado Industrial.
- Se conservaron los 20 registros existentes en cada entorno.

## Corrección aplicada

| ID | Nombre anterior | Nombre actualizado | Entornos |
| --- | --- | --- | --- |
| 8 | Bordaduría Manual y Computarizada | Bordados Computarizados y Manuales | Local y remoto |

Se mantuvo el estilo de mayúsculas/minúsculas: iniciales en mayúscula en las palabras principales y la conjunción «y» en minúscula. No se añadió `(AUXILIAR)`.

## Revisión completa

| Nombre de referencia | ID | Nombre registrado tras la revisión | Resultado |
| --- | --- | --- | --- |
| ASISTENCIA DE PASTELERÍA Y PANADERÍA | 22 | Asistencia de Pastelería y Panadería | Ya coincidía |
| ASISTENCIA EN COCINA | 20 | Asistencia en Cocina | Ya coincidía |
| BORDADOS COMPUTARIZADOS Y MANUALES | 8 | Bordados Computarizados y Manuales | Corregida |
| CONFECCIÓN DE ARTÍCULOS DE CUERO Y MARROQUINERÍA | 11 | Confección de Artículos de Cuero y Marroquinería | Ya coincidía |
| CONFECCIÓN TEXTIL | 9 | Confección Textil | Ya coincidía |
| CORTE APARADO Y ARMADO DE CALZADO | 10 | Corte Aparado y Armado de Calzado | Ya coincidía |
| CORTE Y ENSAMBLAJE | 6 | Corte y Ensamblaje | Ya coincidía |
| COSTURA Y ACABADOS | 7 | Costura y Acabados | Ya coincidía |
| CUERO Y CALZADO | 23 | Cuero y Calzado | Ya coincidía |
| EQUIPOS ELECTRÓNICOS DE CONSUMO | 18 | Equipos Electrónicos de Consumo | Ya coincidía |
| HILANDERÍA | 17 | Hilandería | Ya coincidía |
| MANTENIMIENTO BÁSICO DE CASAS Y EDIFICIOS | 15 | Mantenimiento Básico de Casas y Edificios | Ya coincidía |
| MANUALIDADES | 12 | Manualidades | Ya coincidía |
| OPERACIÓN DE COMPUTADORAS | 5 | Operación de Computadoras | Ya coincidía |
| PANADERÍA Y PASTELERÍA | 13 | Panadería y Pastelería | Ya coincidía |
| PELUQUERÍA | 21 | Peluquería | Ya coincidía |
| PELUQUERÍA Y BARBERÍA | 1 | Peluquería y Barbería | Ya coincidía |
| SERVICIOS BÁSICOS GASTRONÓMICOS | 16 | Servicios Básicos Gastronómicos | Ya coincidía |
| SOPORTE TÉCNICO Y OPERACIONES DE CENTROS DE COMPUTO | 4 | Soporte Técnico y Operaciones de Centros de Computo | Ya coincidía |
| TINTORERÍA Y ESTAMPADO INDUSTRIAL | — | — | No encontrada |

## Carrera adicional existente

La carrera ID 24, «Operaciones Básicas en Confección Industrial (PFC)», no aparece en los nombres recibidos y se conservó sin cambios. No se creó una carrera de Tintorería porque la solicitud fue revisar y corregir registros existentes.

## Verificación

Se modificó exclusivamente `Carrera.nombre` del registro ID 8, con control del nombre anterior dentro de una transacción. La consulta posterior confirmó el resultado en local y remoto y verificó que todos los demás campos y registros permanecieron iguales a los respaldos. No se modificaron IDs, relaciones, tipos de carrera, especialidades, planes, títulos comerciales, slugs ni fechas. No hubo cambios de código ni de esquema; la corrección remota está aplicada directamente a los datos.

Respaldos y comprobaciones: `tmp/carreras-nombres-20261012/local-before.json`, `remote-before.json`, `local-after.json` y `remote-after.json`.
