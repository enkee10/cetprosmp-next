# Listas de inscripción AVANZA

En la lista de **Matrículas**, el botón con el logo AVANZA aparece inmediatamente después de **Descargar**, con 36 px de alto y fondo transparente. Conserva el PNG original con su canal alfa. Abre un menú con **Registro** (icono de inscripción) y **Notas** (icono de calificaciones). Registro descarga el ZIP; Notas por ahora solo cierra el menú, sin llamadas ni descargas.

Registro descarga un ZIP para el semestre actual configurado, respetando los grupos-módulos seleccionados. **Todos** incluye los grupos visibles para la cuenta; los docentes conservan la restricción a sus propios grupos. Registro se desactiva para otros semestres o cuando no hay matrículas cargadas.

Se genera una plantilla por carrera, tanto para programas de estudio como para opciones ocupacionales. Incluye una fila por matrícula y grupo-módulo seleccionado. Una persona inscrita en varios grupos-módulos conserva sus filas, incluso cuando comparten el mismo módulo académico. Solo se eliminan vínculos repetidos de la misma matrícula con el mismo grupo-módulo. Los grupos y las matrículas archivados no se exportan.

La lista de Matrículas y su descarga de Google Sheets usan la misma lógica. La columna **Grupo-Módulo** identifica cada inscripción. Eliminar una fila desde Matrículas o retirar al estudiante en Registro Auxiliar elimina únicamente esa inscripción; las demás inscripciones y sus notas se conservan. Al retirar el último módulo se limpia la matrícula vacía, conservando al usuario. Guardar el formulario sin cambiar de grupo conserva los módulos restantes y sus identificadores, sin restaurar los retirados. Cambiar de grupo reemplaza los módulos restantes por los del grupo nuevo. Google Sheets incluye la columna al final y conserva las fórmulas de edad y los enlaces existentes.

Las matrículas de **Manejo de Máquinas Industriales** se incorporan al módulo vigente de **Costura y Acabados** del semestre actual. La descarga comprueba que haya un único módulo de destino. En 2026-2 corresponde a **Técnicas de Procesos de Acabados en Prendas de Vestir**; no se cambian las matrículas ni las relaciones de la base de datos.

## Plantillas y formatos

Los originales se descargan directamente de Firebase Storage, en `AVANZA/AVANZA-Plantillas-Registro-2026/`. Se identifican por el nombre del archivo y se verifica su período, código modular, carrera, plan y opciones de módulos antes de llenarlos.

El generador conserva los componentes comprimidos originales del Excel y modifica únicamente el XML de las celdas de **PLANTILLA** y la tabla de textos. Mantiene las hojas auxiliares, los encabezados, los estilos, la protección y las validaciones estándar y extendidas de Excel. No utiliza una biblioteca que reconstruya o vuelva a guardar el libro.

Las 17 columnas existentes se llenan con numeración, semestre actual, código modular de Datos Generales, documento, apellidos, nombres, nacimiento, sexo, perfil, correo institucional, celular, carrera, plan, módulo oficial y número final del período. La plantilla no tiene una columna adicional independiente llamada MÓDULO: su columna **MÓDULO / UNIDAD DIDÁCTICA** recibe el título oficial.

Se convierten los textos a mayúsculas, se agrega ` (AUXILIAR)` a la carrera, se transforma CE en PTP, se usa F/M y se muestra el nacimiento como `dd/mm/yyyy`. La fecha de nacimiento se conserva como fecha de calendario, evitando desplazarla al día anterior por la zona horaria. Documento y código modular se escriben como texto para conservar ceros iniciales.

Si una carrera supera las 300 filas disponibles, se divide en archivos numerados sin ampliar ni alterar las listas de las plantillas. La numeración de las inscripciones continúa dentro de la carrera.

## Registros pendientes

### Descarga por fecha y hora

**AVANZA → Registro** abre un modal con las opciones **Todas las matriculas filtradas por (Grupo-Modulo)** y **Desde una fecha y hora de matrícula**, y los botones Cancelar y Descargar. Todas conserva la descarga completa del semestre y de los grupos-módulos seleccionados. Se propone Desde con la última descarga total sin errores de Gestión de Matrículas; cuando no existe, la referencia inicial es **12/10/2026, 10:00 PM**, equivalente a `2026-10-13T03:00:00.000Z`. Una descarga anterior válida tiene prioridad sobre esa referencia y no se borra.

La opción Desde muestra directamente dos columnas: a la izquierda, un único campo manual de fecha **dd/mm/yyyy** y debajo el calendario; a la derecha, un único campo **hh:mm**, el selector **AM/PM** y debajo el reloj de agujas. Los campos y los pickers se sincronizan en ambos sentidos. El reloj permite elegir horas y minutos; se distingue correctamente 12:00 AM (medianoche) de 12:00 PM (mediodía). El valor general de hora es 12:00 PM, reemplazado por la referencia inicial o la descarga guardada cuando existen. En pantallas estrechas las columnas se apilan. Se retiraron las líneas «Hasta…» y «Se conserva…» del modal. Se usan MUI X DateCalendar y TimeClock (edición comunitaria) con Day.js, sin modificar las plantillas ni la base de datos.

El filtro utiliza **Matricula.fecha**, no la fecha del usuario ni la fecha de modificación. Incluye matrículas posteriores al inicio indicado y hasta el momento en que el servidor recibió la solicitud, inclusive: `(desde, hasta]`. El final permanece fijo mientras se genera el ZIP para no saltar matrículas registradas durante la generación. La consulta remota aplica este intervalo con variables GraphQL, además de conservar los permisos y los filtros existentes.

La fecha del formulario se muestra y se interpreta en **America/Lima**, incluso cuando el dispositivo tiene otra zona horaria. Aunque el campo de hora muestra solo horas y minutos, la sugerencia conserva los segundos y milisegundos del final anterior cuando el usuario no cambia el valor, evitando repetir el límite entre descargas consecutivas. Se rechazan las fechas inválidas y futuras; si no hay matrículas en el intervalo, se muestra el mensaje y no se cambia la sugerencia.

La última descarga completa se recuerda en **localStorage de ese navegador**, separada por cuenta y semestre. Todos los filtros de grupos-módulos consultan la misma referencia general. Se conserva el historial general existente; los historiales anteriores de selecciones parciales dejan de utilizarse. No se comparte entre dispositivos ni se crean tablas o campos. La referencia solo se actualiza al elegir **Todas las matrículas** desde **Gestión de Matrículas**, sin seleccionar grupos-módulos, después de generar el ZIP e iniciar su descarga sin errores ni inscripciones pendientes o incompletas. Las descargas por fecha, de grupos-módulos seleccionados o desde vistas docentes conservan la referencia anterior. La descarga no certifica que AVANZA haya procesado el archivo.

Los nuevos nombres y la condición de actualización del historial quedaron publicados el 17/10/2026, junto con las funciones afectadas de matrícula, retiro por módulo y exportación. Se comprobaron ambos textos de AVANZA y la coincidencia de los archivos publicados con la compilación validada en `https://cetprosmp.edu.pe` y `https://cetprosmp-2026.web.app`, además de las páginas de Matrículas y Registro Auxiliar. No se modificaron las relaciones de calendario.

El generador ya crea Excel únicamente para carreras con al menos un estudiante exportado. Se comprobó que un grupo seleccionado produce solo su libro, y que una plantilla con todas las inscripciones excluidas produce cero Excel y conserva el reporte de pendientes. No se modificó el servicio de descarga para este ajuste de interfaz. Las pruebas adicionales del calendario y reloj (incluido un dispositivo con zona horaria de Tokio) y la captura en tamaño de tablet están en `tmp/avanza-picker-20261013/`, excluida de publicación.

El reloj se comprobó también mediante eventos táctiles de selección de horas y minutos. Se declaró `esbuild` como dependencia de desarrollo para conservar el empaquetador que Firebase Hosting utiliza con `next.config.ts`; se verificó la configuración compilada antes de publicar. No se añadieron campos ni tablas.

Estos ajustes quedaron publicados con la revisión `ssrcetprosmp2026-00281-hil`, comprobada ACTIVE. Las pruebas táctiles se repitieron en `https://cetprosmp.edu.pe`, usando los assets reales publicados y respuestas API controladas: referencia inicial, restauración del historial, sincronización de calendario y reloj, conservación de la precisión del corte, separación de grupos y protección del historial ante errores, pendientes y datos incompletos. No se escribieron matrículas durante esas pruebas.

Para incluir correcciones de matrículas antiguas se debe elegir **Todas las matrículas** o indicar una fecha anterior. El filtro no incluye automáticamente cambios posteriores de Usuarios. **Notas** conserva su comportamiento sin acción.

La verificación de esta mejora incluyó consultas reales de solo lectura (14 matrículas completas y 6 en un intervalo de prueba), límites exactos y matrículas sin fecha, compilación de las dos variantes de consulta, y pruebas del navegador con respuestas controladas: cancelación, restauración tras recargar, conversión horaria con dispositivo en Tokio, errores, separación de filtros y conservación de la referencia ante descargas parciales. Evidencia local: `tmp/avanza-date-20261013/`, excluida de la publicación.

Con las plantillas reemplazadas de Manualidades y Servicios Básicos Gastronómicos, la comprobación completa del 13 de octubre produjo **14 Excel con 577 inscripciones, cero inscripciones pendientes y cero filas incompletas**. Se generaron 62 celulares de exportación. Estos conteos son una lectura de ese momento, no valores fijos del sistema. La versión 4 de la callable se comprobó ACTIVE en remoto, con el código publicado idéntico al revisado y respuesta 401 sin autenticación.

Hosting completó la publicación de esta mejora con la revisión `ssrcetprosmp2026-00280-mol`, comprobada ACTIVE. La prueba del modal se repitió sobre los assets publicados en `https://cetprosmp.edu.pe`, con autenticación y respuestas API controladas y sin escrituras de matrículas.

Cuando un módulo no existe en la lista original de su plantilla, no se sustituye por otro ni se cambia la lista. Los Excel incluyen los registros compatibles y el ZIP adjunta **INSCRIPCIONES-PENDIENTES.txt**, que identifica los registros excluidos. La pantalla muestra la cantidad pendiente.

Cuando falta el celular o contiene el valor de relleno **999999999**, se genera un número aleatorio de nueve dígitos que comienza por 9, exclusivamente para el Excel. Se reconoce también ese valor con separadores o prefijo +51. Antes de generar se leen los celulares y teléfonos de todos los Usuarios, con paginación, y se reservan también los números escritos con prefijo +51, espacios o separadores. Cada número generado se reserva para evitar duplicados en el mismo ZIP y se excluye siempre 999999999. Usuarios conserva los datos originales.

El ZIP incluye **CELULARES-GENERADOS.txt**, con la carrera, fila y número generado; identifica estos valores como números de exportación y no como contactos verificados. La lectura remota de prueba completó 60 celulares faltantes o con 999999999 y comprobó que no coincidían con los existentes ni entre sí.

Cuando faltan otros datos personales en el sistema, se conserva la celda vacía y se incluye **DATOS-PENDIENTES.txt**, con el archivo/carrera, número de inscripción y campos faltantes. La pantalla muestra también esta cantidad.

La comprobación con los datos remotos de 2026-2 produjo **13 Excel con 509 inscripciones**, **68 inscripciones pendientes** de módulos no disponibles y **60 celulares generados**, sin otros campos vacíos en las inscripciones exportadas. Los módulos pendientes son **Decoraciones Navideñas** y **Técnicas Básicas de Elaboraciones Culinarias**. Estos conteos corresponden al momento de la prueba y pueden cambiar con nuevas matrículas o correcciones de datos.

## Permisos y publicación

La callable **exportMatriculasAvanza** exige autenticación y los permisos de visualización de **AVANZA** y **Matrículas**, valida el semestre actual y vuelve a comprobar los grupos autorizados en el servidor. El botón, el menú y el modal de AVANZA se muestran únicamente cuando se tienen ambos permisos. El navegador no decide qué datos personales puede exportar. Los archivos se generan en memoria y se descargan directamente; no se publican ni se guardan en Storage.

El permiso independiente **AVANZA** está en **Mantenimiento → Permisos**, sección **Registros**. Su casilla **Ver** permite mostrar el botón y descargar Registro; Crear, Editar y Eliminar no intervienen en esta descarga. El superusuario conserva su acceso. El ajuste del 13/10/2026 se hizo **solo en local**: se agregaron registros en la tabla existente `role_permissions`, con AVANZA desactivado para Docente y Ex-docente; Administrativo, Coordinador y Director conservaron su acceso. No se modificó el esquema ni se publicó este ajuste en remoto. Para comprobarlo, recargar la página después de guardar los permisos, porque se conservan en memoria durante la sesión del navegador.

Los cambios no agregan tablas, campos ni operaciones persistentes en SQL Connect. Tampoco actualizan datos ni plantillas remotas. La publicación incluye la nueva función de descarga, el frontend y el logo proporcionado por el usuario.

Parte Diario incluye además numeración consecutiva en el desplegable de actividades, con formato `1. Texto`. El número y el texto comparten el mismo elemento para conservar un único espacio entre ambos. No se agrega numeración al nombre almacenado ni al valor seleccionado.

## Verificación

- Compilación de Functions, producción de Next.js y comprobación de tipos del frontend afectado.
- Descargas usando consultas reales de solo lectura a la base de datos remota: Cuero, MFC, Costura con MFC y todos los grupos.
- Verificación independiente del ZIP y XML de los 13 libros, valores permitidos, secuencias y mayúsculas. La identidad de cada inscripción es matrícula y grupo-módulo.
- Regresión del 17/10/2026 con datos simulados: 73 matrículas producen 93 filas en lista, Google Sheets y AVANZA; se comprueban grupos distintos del mismo módulo, filtros, permisos docentes, corte de fecha, fórmulas y descargas de más de 1000 matrículas (`scripts/test-matricula-modulo-rows.cjs` y `scripts/test-matricula-module-exports.cjs`).
- Eliminación independiente: pruebas de ambos endpoints y de la edición después de un retiro (`scripts/test-matricula-module-deletion.cjs`), y prueba con SQL Connect aislado en el proyecto local `demo-cetpro-module-test`, puerto 9398, de conservación de notas del otro módulo, limpieza de la última inscripción y cambio de grupo sin errores de claves foráneas (`scripts/test-matricula-module-deletion-integration.cjs`).
- Conservación de estilos, protección, validaciones y hojas auxiliares; los registros binarios comprimidos no modificados se comprobaron también en la prueba inicial aprobada.
- Pruebas de permisos: sesión ausente, grupos ajenos/no disponibles, filtro inválido y semestre distinto del actual.
- Navegador con assets de producción: logo, tamaño del botón, descarga, filtro enviado y bloqueo de otros semestres; desplegable de actividades numerado, sin escrituras de Parte Diario.

La evidencia y los archivos de prueba con datos personales permanecen en la carpeta local ignorada por Git `tmp/avanza-export-20261013/`, excluida de la publicación.

La función quedó **ACTIVE** en remoto, con Node.js 22, y se confirmó que devuelve 401 sin sesión. El código fuente publicado coincide con los cinco archivos compilados de generación y el handler revisados. Hosting completó la publicación con la revisión `ssrcetprosmp2026-00279-qef`.

Las comprobaciones posteriores en `https://cetprosmp.edu.pe` confirmaron el logo original, el botón de 36 px, la descarga y el envío del filtro, el aviso de inscripciones pendientes y la numeración de ocho actividades consecutivas. Las pruebas del navegador usaron autenticación y respuestas de las llamadas controladas, sin guardar registros; los ZIP se habían generado previamente con lecturas reales de la base remota y las plantillas de Storage.


La mejora del menú AVANZA y de celulares quedó publicada: Registro conserva la descarga y Notas no ejecuta ninguna exportación. La función publicada es la versión 3, incluyendo el reemplazo de 999999999. La prueba de solo lectura comprobó 721 números existentes, 60 celulares generados sin repetición, ausencia de 999999999 en las 509 filas y conservación de los datos originales de Usuarios. Se probaron también colisiones forzadas, valores con +51 y separadores, y rechazo del propio 999999999 como número aleatorio. Evidencia adicional local: `tmp/avanza-menu-20261013/`, excluida de publicación.
