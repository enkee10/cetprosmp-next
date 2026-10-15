# Actualización de horas y créditos de programas de estudio

Fecha: 13/10/2026, Perú. Estado: **actualizado y verificado en remoto**, proyecto cetprosmp-2026.

Se analizaron los ocho archivos del ZIP y sus 16 hojas M1/M2. Se actualizaron **78 unidades didácticas** y las EFSRT de **7 módulos**. El detalle fila por fila y las fuentes están en el Excel adjunto.

## Campos agregados

En la tabla existente `unidades_didacticas` se agregaron cuatro campos opcionales enteros: `horasTeoricas`, `horasPracticas`, `creditosTeoricos` y `creditosPracticos`. Se conservaron `duracion` para total de horas y `creditos` para total de créditos. Se cargaron los 312 valores del nuevo desglose.

Los documentos ubican créditos teóricos/prácticos/totales en F/G/H y horas teóricas/prácticas/totales en I/J/K. En EFSRT, K contiene los créditos y L las horas prácticas; se usaron los campos existentes `creditosEfsrt` y `duracionEfsrt` de Módulos.

Las opciones ocupacionales conservan solo horas totales. En el Excel las columnas no aplicables indican **No aplica**, no datos faltantes.

## Horas totales corregidas

| ID unidad | Unidad | Antes | Ahora |
|---|---|---:|---:|
| 2 | TÉCNICAS Y CONTROL DE CALIDAD EN EL TENDIDO | 64 | 48 |
| 3 | TALLER DE CORTE Y NORMAS DE SEGURIDAD | 64 | 48 |
| 147 | PROCESOS DE CONTROL FINAL DE LAS PRENDAS DE VESTIR | 78 | 80 |
| 150 | PLAN DE NEGOCIOS | Sin registro | 48 |
| 75 | CAPACITACIÓN EN EL USO DEL SISTEMA INFORMÁTICO | 80 | 64 |

## Créditos de unidades

Se completaron **28 créditos totales que estaban vacíos**. Además, la unidad 148, «TÉCNICAS DE PLANCHADO Y EMBOLSADO DE PRENDAS DE VESTIR», se corrigió de 4 a 3 créditos según el documento.

## EFSRT corregidas

| Carrera | Módulo | Horas: antes → ahora | Créditos: antes → ahora | Fuente |
|---|---|---|---|---|
| Corte y Ensamblaje | Técnicas de Confección de Prendas de Vestir | 384 → 192 | 12 → 6 | M2, fila 359 |
| Costura y Acabados | Técnicas de Procesos de Acabados en Prendas de Vestir | Sin registro → 192 | Sin registro → 6 | M2, fila 359 |
| Confección de Artículos de Cuero y Marroquinería | Diseño y Corte de Artículos de Cuero | 192 → 192 | Sin registro → 6 | M1, fila 362 |
| Corte Aparado y Armado de Calzado | Diseño de Corte de Calzado | Sin registro → 192 | Sin registro → 6 | M1, fila 359 |
| Panadería y Pastelería | Decoración y Presentación de los Productos de Panadería y Pastelería | 192 → 192 | Sin registro → 6 | M2, fila 358 |
| Servicios Básicos Gastronómicos | Operaciones Básicas de Cocina y Manejo de Insumos | 336 → 192 | 14 → 6 | M1, fila 359 |
| Soporte Técnico y Operaciones de Centros de Computo | Monitoreo y Administración de Sistemas de Cómputo | 192 → 192 | Sin registro → 6 | M2, fila 361 |

Los nueve módulos restantes de los documentos conservaron sus valores EFSRT. En Peluquería y Barbería, M2 tiene las celdas EFSRT vacías; se mantuvieron sus 192 horas y 6 créditos, que coinciden con Itinerario, fila 85.

## Diferencias de denominación o vinculación

Se encontraron referencias documentales que no coinciden con el nombre de la unidad vinculada al módulo en el sistema. Se completaron los valores de las unidades existentes utilizando referencias de la misma unidad o equivalencias revisadas, sin renombrar unidades ni cambiar sus vínculos curriculares. Las unidades compartidas se actualizaron una sola vez después de comprobar que las fuentes coincidían numéricamente.

| Carrera | ID módulo | Unidad en el documento | Celda |
|---|---:|---|---|
| Corte y Ensamblaje | 10 | APLICACIONES DE HERRAMIENTAS INFORMÁTICAS . | M1!D232 |
| Costura y Acabados | 11 | COMUNICACIÓN PARA EL DESARROLLO PERSONAL Y PROFESIONAL | M1!D222 |
| Costura y Acabados | 13 | APLICACIONES DE HERRAMIENTAS INFORMÁTICAS | M2!D222 |
| Panadería y Pastelería | 25 | Comunicación para el desarrollo personal y profesional | M1!D223 |
| Panadería y Pastelería | 25 | Aplicaciones de herramientas informáticas | M1!D227 |
| Peluquería y Barbería | 1 | HABILIDADES COMUNICATIVAS | M1!D225 |
| Peluquería y Barbería | 1 | HERRAMIENTAS DE OFICINA Y APLICACIONES DE INTERNET | M1!D235 |
| Servicios Básicos Gastronómicos | 33 | Comunicación para el desarrollo personal y profesional | M1!D222 |
| Servicios Básicos Gastronómicos | 33 | Herramientas informáticas | M1!D232 |
| Soporte Técnico y Operaciones de Centros de Computo | 5 | Habilidades Comunicativas | M1!D225 |
| Soporte Técnico y Operaciones de Centros de Computo | 5 | Herramientas de oficina y aplicaciones de internet | M1!D235 |

## Actualización posterior: módulo 35

El ZIP original no incluía «Operaciones Básicas en Confección Industrial (PFC)». El 14/10/2026 se completó el módulo 35, «MANEJO DE MAQUINAS INDUSTRIALES DE CONFECCION», con la hoja **ANEXO 3** del archivo `PFC 2026-2 MANEJO DE MAQUINAS INDUSTRIALES DE CONFECCION3 (1).xlsx`, y se verificó en remoto.

| Unidad | Horas teóricas | Horas prácticas | Créditos teóricos | Créditos prácticos |
|---|---:|---:|---:|---:|
| Operación de Máquinas Industriales de Confección | 16 | 64 | 1 | 2 |
| Confección Industrial de Prendas de Vestir | 32 | 32 | 2 | 1 |
| Comunicación Efectiva | 32 | 0 | 2 | 0 |
| EFSRT | 0 | 64 | 0 | 2 |

Las tres unidades y la EFSRT suman **240 horas y 10 créditos**. Se corrigieron los totales anteriores de las unidades 90 y 91 y de la EFSRT para que coincidan con sus desgloses y con el total del módulo. La hoja fuente se titula «programa de formación continua»; no se modificó la clasificación de la carrera.

## Comprobación

La actualización se ejecutó en una sola transacción con bloqueo de los registros y comparación previa contra el respaldo. Se comprobó antes de confirmar que solo cambiaron los campos previstos en las dos tablas. Después se volvieron a consultar los datos mediante Firebase SQL Connect y se verificó que horas teóricas + prácticas = total de horas y créditos teóricos + prácticos = total de créditos para las 78 unidades.

El esquema publicado contiene únicamente los cuatro campos nuevos; los conectores permanecieron iguales. Los archivos fuente se leyeron sin guardarlos ni alterarlos. No se recalcularon sesiones, calendarios ni horas programadas.
