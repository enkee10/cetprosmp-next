# Informe de nombres de módulos — 12 de octubre de 2026

Se revisaron los **14 archivos Excel** de `AVANZA/AVANZA-Plantillas-Registro-2026/` en Firebase Storage, tomando exclusivamente la columna **NOMBRE** de la hoja **MODULO_UNIDAD**.

**Resultado:** 29 módulos identificados, 17 coincidencias y 12 nombres corregidos tanto en local como en remoto. No quedaron módulos de las plantillas sin identificar ni coincidencias dudosas.

La comparación final distingue caracteres, tildes, espacios y puntuación; únicamente ignora mayúsculas y minúsculas. La carrera y el contenido se usaron para identificar cada registro, conservando el estilo de mayúsculas del nombre existente.

En la entidad `Modulo`, el nombre oficial se almacena en `titulo`. Solo se actualizó ese campo: no cambiaron `tituloComercial`, identificadores, horas, créditos, carreras, planes, grupos ni relaciones. Los Excel y sus nombres de archivo permanecieron intactos.

Se respetó literalmente el texto de las plantillas, incluso **ATRÍCULOS** (módulo 18) y los nombres que omiten tildes. Estos cambios reflejan la referencia solicitada; no son correcciones ortográficas independientes.

## Diferencias corregidas

| ID | Carrera | Nombre anterior | Nombre actualizado | Excel | Celda |
| --- | --- | --- | --- | --- | --- |
| 14 | Bordados Computarizados y Manuales | Bordados a Maquina | Bordados Computarizados | PE-BORDADOS COMPUTARIZADOS Y MANUALES.xlsx | B2 |
| 17 | Confección de Artículos de Cuero y Marroquinería | Diseño y Corte de Artículos de Cuero y Marroquinería | Diseño y Corte de Artículos de Cuero | PE-CONFECCION DE ARTICULOS DE CUERO Y MARROQUINERIA.xlsx | B2 |
| 18 | Confección de Artículos de Cuero y Marroquinería | Ensamblado y Acabado de Artículos de Cuero | Ensamblado y Acabado de Atrículos de Cuero | PE-CONFECCION DE ARTICULOS DE CUERO Y MARROQUINERIA.xlsx | B3 |
| 19 | Corte Aparado y Armado de Calzado | Diseño y Corte de Calzado | Diseño de Corte de Calzado | PE-CORTE APARADO Y ARMADO DE CALZADO.xlsx | B2 |
| 32 | Mantenimiento Básico de Casas y Edificios | Confección de Muebles en Melamina | Confecciones de Muebles en Melamine | PE-MANTENIMIENTO BASICO DE CASAS Y EDIFICIOS.xlsx | B2 |
| 4 | Mantenimiento Básico de Casas y Edificios | Mantenimiento de Instalaciones Eléctricas Domiciliarias | Mantenimiento de Instalaciones Eléctricas | PE-MANTENIMIENTO BASICO DE CASAS Y EDIFICIOS.xlsx | B3 |
| 22 | Manualidades | Bisuterías | Bisuteria | PE-MANUALIDADES.xlsx | B2 |
| 21 | Manualidades | Decoración de Eventos Especiales | Decoracion de Eventos Especiales | PE-MANUALIDADES.xlsx | B3 |
| 25 | Panadería y Pastelería | Acondicionamiento y Elaboración de Productos de Panadería y Pastelería | Acondicionamiento y Elaboración de Productos de Panaderia y Pasteleria | PE-PANADERIA Y PASTELERIA.xlsx | B2 |
| 1 | Peluquería y Barbería | Corte de Cabello, Barba y Peinado | Corte de Cabello, Diseño de Barba y Peinado | PE-PELUQUERIA Y BARBERIA.xlsx | B2 |
| 2 | Peluquería y Barbería | Tratamiento Capilar, Coloración, Ondulación y Laceado | Tratamiento Capilar, Coloracion, Ondulacion y Laceado | PE-PELUQUERIA Y BARBERIA.xlsx | B3 |
| 6 | Soporte Técnico y Operaciones de Centros de Computo | Monitoreo y Acciones de Mantenimiento de Centros de Cómputo | Monitoreo y Administración de Sistemas de Cómputo | PE-SOPORTE TECNICO Y OPERACIONES DE CENTROS DE COMPUTO.xlsx | B3 |

Todas las celdas indicadas pertenecen a la hoja `MODULO_UNIDAD`.

## Nombres que ya coincidían

| ID | Carrera | Nombre conservado | Excel | Celda |
| --- | --- | --- | --- | --- |
| 20 | Corte Aparado y Armado de Calzado | Aparado, Armado y Acabado de Calzado | PE-CORTE APARADO Y ARMADO DE CALZADO.xlsx | B3 |
| 10 | Corte y Ensamblaje | Técnicas de Tizado, Tendido y Corte de Prendas de Vestir | PE-CORTE Y ENSABLAJE.xlsx | B2 |
| 38 | Corte y Ensamblaje | Técnicas de Confección de Prendas de Vestir | PE-CORTE Y ENSABLAJE.xlsx | B3 |
| 11 | Costura y Acabados | Técnicas de Confección de Prendas de Vestir | PE-COSTURA Y ACABADOS.xlsx | B2 |
| 13 | Costura y Acabados | Técnicas de Procesos de Acabados en Prendas de Vestir | PE-COSTURA Y ACABADOS.xlsx | B3 |
| 3 | Equipos Electrónicos de Consumo | Mantenimiento de Teléfonos Celulares | PE-EQUIPOS ELECTRICOS DE CONSUMO.xlsx | B2 |
| 15 | Hilandería | Tejido a Maquina | PE-HILANDERIA.xlsx | B2 |
| 16 | Hilandería | Tejido a Mano | PE-HILANDERIA.xlsx | B3 |
| 31 | Mantenimiento Básico de Casas y Edificios | Mantenimiento de Carpintería | PE-MANTENIMIENTO BASICO DE CASAS Y EDIFICIOS.xlsx | B4 |
| 23 | Manualidades | Pintura Decorativa | PE-MANUALIDADES.xlsx | B4 |
| 24 | Manualidades | Cerámica al Frio | PE-MANUALIDADES.xlsx | B5 |
| 7 | Operación de Computadoras | Ofimática | PE-OPERACION DE COMPUTADORAS.xlsx | B2 |
| 8 | Operación de Computadoras | Diseño Publicitario | PE-OPERACION DE COMPUTADORAS.xlsx | B3 |
| 9 | Operación de Computadoras | Diseño Web | PE-OPERACION DE COMPUTADORAS.xlsx | B4 |
| 26 | Panadería y Pastelería | Decoración y Presentación de los Productos de Panadería y Pastelería | PE-PANADERIA Y PASTELERIA.xlsx | B3 |
| 33 | Servicios Básicos Gastronómicos | Operaciones Básicas de Cocina y Manejo de Insumos | PE-SERVICIOS BASICOS GASTRONOMICOS.xlsx | B2 |
| 5 | Soporte Técnico y Operaciones de Centros de Computo | SOPORTE Y MANTENIMIENTO DE SISTEMAS INFORMÁTICOS | PE-SOPORTE TECNICO Y OPERACIONES DE CENTROS DE COMPUTO.xlsx | B2 |

## Módulos sin referencia en estas plantillas

Los siguientes ocho módulos remotos no figuran en los Excel revisados y se conservaron sin cambios.

| ID | Nombre oficial |
| --- | --- |
| 27 | Técnicas de Decoración de Tortas |
| 28 | Buffet |
| 29 | Cocina Nacional |
| 30 | Técnicas Culinarias |
| 35 | MANEJO DE MAQUINAS INDUSTRIALES DE CONFECCION |
| 36 | Decoraciones Navideñas |
| 37 | Técnicas Básicas de Elaboraciones Culinarias |
| 53 | ll |

## Verificación y respaldo

Las actualizaciones se ejecutaron en una transacción por entorno, condicionadas al identificador y al nombre previamente revisado. Antes de modificar remoto se comprobó que las generaciones de los 14 Excel no habían cambiado.

La lectura posterior confirmó que los 29 nombres coinciden con los Excel ignorando únicamente mayúsculas y minúsculas, y que las únicas diferencias de datos son los 12 campos `titulo` previstos. Se conservaron los 36 módulos locales y los 37 remotos, incluidas las diferencias preexistentes entre ambos entornos.

Los respaldos y la evidencia están en `tmp/avanza-module-names-20261012/`: `storage-source.json` (generaciones y hashes de las fuentes), `approved-plan.json` (mapeo revisado), `local-preapply.json`, `local-after.json`, `remote-preapply.json` y `remote-after.json`.

Los cambios de datos ya están aplicados en remoto; no requirieron modificar el esquema ni desplegar código.
