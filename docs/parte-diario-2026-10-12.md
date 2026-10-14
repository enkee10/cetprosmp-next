# Parte Diario: ampliación del 12 de octubre de 2026

Página: `https://cetprosmp.edu.pe/parte-diario`.

## Cambios

- Encabezado con calendario para consultar días anteriores y X para volver a hoy. Se permite editar días hábiles pasados o actuales; los futuros son de consulta. La animación de actualización aparece dentro del botón Refrescar.
- Encabezado de 50 px, con sus controles centrados verticalmente. Refrescar está a 25 px de la fecha. El botón Vista previa se encuentra temporalmente oculto. La cuenta muestra solo el avatar; el menú muestra los datos de la cuenta actual, la otra coordinación y cierre de sesión. Se resuelven las cuentas autorizadas de los coordinadores configurados, excluyendo la cuenta docente `epalominoh@cetprosmp.edu.pe`, sin alterar usuarios, fichas de personal ni permisos.
- Tabla de 15 columnas. Uso medios en clase está antes de Sílabo. Las filas aún sin firmar se editan como borradores locales; después de guardar son de solo lectura y se editan únicamente desde el modal. Unidad y Actividad tienen 260 px de ancho. Los valores seleccionados se limitan a tres líneas, con elipsis si exceden; se conservan los anchos de las valoraciones.
- Firma en cuadro centrado de 11,5 × 6 cm con Limpiar, Cancelar y Aceptar. Aceptar guarda la fila completa. El modal también requiere firma. El servidor rechaza firmas vacías, transparentes o completamente blancas y recorta los trazos sin deformarlos.
- Nombre conserva el turno y elimina únicamente el sufijo que repite el docente. Los registros firmados muestran `(Guardado)` en rojo y negrita; sus valores se muestran en azul marino oscuro.
- Observaciones guardadas debajo del botón Agregar observación, en viñetas y con edición/eliminación a la derecha. Solo se muestra un editor de observaciones de fila a la vez y los borradores ocultos se conservan. Se retiraron todos los controles de voz del modal.
- Doble clic en la opción de Actividad para renombrarla dentro del desplegable; Aceptar confirma selección y nombre y Cancelar descarta los cambios y cierra. La actualización afecta al registro global de Actividades y valida que corresponda al módulo, permisos y nombre anterior. Actividades no tiene un campo de fecha de modificación en el esquema ni en PostgreSQL: se modifica únicamente `nombre`, conservando `fecha`, que pertenece a la sesión.
- Unidad, Actividad y Matriculados se cargan automáticamente; los demás campos comienzan vacíos. Asistentes (incluido cero), las seis valoraciones y la firma son obligatorios. Observaciones es opcional: puede guardarse como lista vacía tanto en Parte Diario como en reportes; las observaciones introducidas siguen validándose y los borradores escritos requieren confirmación antes de guardar. Las unidades muestran `UD1: NOMBRE`, `UD2: NOMBRE`, etc., también en el valor seleccionado y en filas guardadas, con un espacio después de los dos puntos; PPP/EFSRT conservan su nombre. Solo dentro del desplegable se resaltan en negrita las unidades de las actividades programadas para la fecha, independientemente de cambios manuales en la selección.
- Las etiquetas de los campos del modal permanecen arriba incluso con el valor vacío, evitando la superposición con «Seleccionar». El orden de unidades se calcula en la respuesta del servidor con la misma ordenación y deduplicación del desplegable; no se añadieron columnas ni se modificaron nombres de entidades.
- Vista previa en una ventana nueva (`/parte-diario/imprimir?fecha=YYYY-MM-DD`) usando el componente existente PrintDocumentViewer. Consulta los datos guardados de la fecha seleccionada con los mismos permisos; no imprime borradores sin guardar. A4 horizontal, márgenes de 0,7 cm, sin columna Avatar, ancho ajustado a una página y paginación vertical con encabezados repetidos.

## Esquema y conservación de datos

Único cambio SQL: dos columnas anulables de `parte_diario_registros`:

| Campo de entidad | Columna | Tipo | Valores |
| --- | --- | --- | --- |
| `usoMedios` | `uso_medios` | String / text | Texto de la valoración |
| `usoMediosValor` | `uso_medios_valor` | Int / integer | Puntaje calculado por el servidor |

Valoraciones: 4 Usa pizarra y classroom; 3 Usa solo classroom; 2 Usa solo pizarra; 1 Usa otros medios; 0 No usa nada. Los campos de valoración de los registros nuevos comienzan vacíos. Los antiguos conservan sus valores y no se asigna una valoración ficticia. Los ajustes de interfaz posteriores no añaden columnas ni modifican datos remotos.

Los tres partes remotos anteriores carecían de firma. Se conservaron sin cambios ni eliminación, pero se excluyen de métricas y del estado de registro llenado. Una jornada cancelada no se reintroduce por un parte antiguo sin firma. Los partes históricos firmados conservan docente y matrícula registrados aunque cambie la programación actual.

Se respaldó el esquema y los datos antes del cambio en `tmp/parte-v2-20261012/remote-before.json`, y los partes antes de añadir columnas en `parts-before-columns.json`. El esquema SQL Connect se compiló y publicó. La migración conservó los calendarios, actividades, jornadas, grupos, matrículas y permisos existentes.

## Publicación y validación

Functions: `getParteDiario`, `getParteDiarioOpciones`, `getParteDiarioCuentas`, `renameParteActividad`, `saveParteDiario`, `transcribeParteDiario`, `getParteReporte`, `getParteReporteRegistro`, `getParteReporteOpciones`, `saveParteReporteRegistro`, `deleteParteDiarioRegistro`, `saveParteInforme`. La página usa Firebase Hosting con el backend SSR existente. El build se prepara en una copia aislada, manteniendo el servidor y el emulador locales.

Validación local: compilación de Functions, TypeScript y ESLint del cliente, compilación SQL Connect, guardados y conflictos de versión en la base local, rechazo de firmas vacías/blancas, puntajes autoritativos y conservación de la fecha de sesión al renombrar. Los registros de prueba se eliminaron y el nombre original se restauró.

Las pruebas de navegador utilizan datos remotos de solo lectura y autenticación/escrituras simuladas para no alterar registros institucionales. El cambio interactivo de cuenta requiere completar la ventana real de Google. Las evidencias de los ajustes de interfaz y la impresión se conservan en `tmp/parte-ui-20261012`.

Los ajustes de interfaz se publicaron el 12 de octubre de 2026. Se verificaron las 12 funciones activas y su código publicado, el esquema sin cambios adicionales, los endpoints protegidos y las páginas públicas disponibles. La revisión SSR activa es `ssrcetprosmp2026-00276-kuf`. La prueba con los archivos publicados confirmó el avatar y las dos cuentas correctas, los valores iniciales vacíos, la validación de campos obligatorios y firma, la edición del registro guardado únicamente en el modal, la ausencia de voz y la impresión en tres páginas A4 horizontales para los datos de prueba, dentro de márgenes de 7 mm y sin avatares ni desbordamiento horizontal.

Chrome 154 verificó el manifiesto publicado sin errores de instalación, el alcance exclusivo de Parte Diario, los iconos 192/512, la ausencia de service workers y Cache Storage y el aviso de actualización que no recarga sin aceptar. No se realizó una prueba física en la tablet Android. Compilaciones de Functions y Next.js, TypeScript del cliente y ESLint de los componentes modificados completadas; AuthContext conserva un aviso previo de ESLint por su índice de tipo `any`.

La publicación posterior con los prefijos en la unidad seleccionada, el resaltado de la unidad programada, Observaciones opcional, etiquetas flotantes y el botón Vista previa oculto quedó activa en la revisión `ssrcetprosmp2026-00277-lax`. Se verificaron las 12 funciones y su código publicado, el esquema sin migración y el manifiesto PWA intacto. La prueba con archivos de producción y datos remotos de solo lectura confirmó el prefijo al cargar, seleccionar y guardar, el resaltado que no sigue cambios manuales de selección, las etiquetas separadas de «Seleccionar» y el guardado con firma y sin observaciones. Las escrituras y la autenticación del navegador se simularon; las pruebas de persistencia del servidor se ejecutaron en local y sus datos de prueba se retiraron. Evidencias: `tmp/parte-selected-20261012`.
