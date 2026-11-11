# Despliegue y revisión de pendientes — 11 de noviembre de 2026

Proyecto: `cetprosmp-2026`. Horas expresadas en America/Lima.

## Revisión del estado remoto

- Se descargaron las fuentes publicadas de Functions y se compararon con las locales. Las diferencias del backend corresponden al ajuste de certificados de esta conversación; los cambios anteriores de Registro Auxiliar ya estaban publicados en el backend.
- Se comparó el paquete SSR publicado con la compilación actual. Había diferencias en los paquetes de las páginas de Registro Auxiliar y Usuarios; también se incluyó el cambio local de numeración de Programación Curricular.
- El esquema y las consultas/mutaciones de Data Connect coinciden con los archivos locales. La comprobación SQL confirmó compatibilidad de la base de datos.
- Las reglas publicadas de Firestore y Storage coinciden con las locales. No había índices compuestos pendientes.
- Se descargaron las fuentes de las compilaciones de Cloud Run de `reportes-office-converter` y `dni-opencv-processor`: su código coincide con el local.
- La plantilla remota era diferente del archivo proporcionado por el usuario.

## Cambios publicados

- El bloque de datos del certificado conserva 400 px (300 puntos). Se miden todas sus celdas con ajuste de línea, incluidos los textos de competencias que abarcan varias filas.
- Las alturas mínimas se calculan según las métricas tipográficas y el ancho de las celdas. Se conserva la línea vacía entre capacidades y se distribuye el espacio restante entre las filas.
- Si el contenido no cabe, se reduce un punto la fuente de toda la tabla y se vuelven a medir todas las celdas desde sus tamaños originales. Se repite hasta que el contenido quepa; si ni siquiera cabe con fuente de un punto, se informa el error en lugar de producir texto truncado.
- La medición usa Sharp/Pango con Carlito, compatible con las métricas de Calibri. Las fuentes y su licencia se incluyen en el paquete de Functions. El cálculo reserva un margen de seguridad para diferencias entre Excel y LibreOffice.
- Competencias y capacidades usan los códigos de la programación completa del plan: UC/CE y C. Las capacidades muestran el prefijo combinado, por ejemplo `UC1 C1`, sin viñetas.
- Se publicó la numeración independiente de competencias y unidades por módulo para las opciones ocupacionales.
- Se publicaron el sitio completo y las 215 funciones de aplicación, más la función SSR.

## Evidencia del despliegue

- Firebase CLI finalizó sin errores; los reintentos por límites temporales de cuota terminaron correctamente.
- Hosting: `sites/cetprosmp-2026/versions/749e328f0183e85c`, publicado a las 12:04:19.
- Next.js build: `6eO-uTvKYfkW8VMdlSN-o`.
- Hash publicado de las 215 funciones de aplicación: `907e413c22551ff412cd3fb0c0abe8e426b24471`.
- `generateCertificadosTitulos`: versión 93, timeout de 180 segundos y 1024 MB. Se descargó su paquete publicado y se verificó que contiene el nuevo módulo de cálculo y los archivos de fuentes correctos.
- Las rutas de Registro Auxiliar, Usuarios, Certificados y Programación Curricular respondieron HTTP 200 con el nuevo build.
- La función de certificados respondió HTTP 401 / `UNAUTHENTICATED` a una llamada sin sesión, comprobando que carga y mantiene su autenticación.

## Plantilla remota

- Archivo: `gs://cetprosmp-2026.firebasestorage.app/documentos/certificados-plan-estudios.xlsx`.
- Origen: el archivo de Google Drive indicado por el usuario.
- Tamaño: 97 995 bytes.
- Reemplazado a las 12:05:07; generación `1794416707343273`.
- SHA-256 verificado después de descargar la copia remota: `b41c661ef5cd75c2b431c5772fb3b6411412e92e1a025ad28fa711a6be960ae6`.
- La versión anterior se respaldó localmente en `tmp/release-20261111/certificados-plan-estudios.remote-before.xlsx`.

## Validaciones

- Compilación TypeScript de Functions y compilación de producción de Next.js correctas.
- ESLint de los archivos nuevos/modificados de cálculo e interfaz correcto.
- Pruebas de ajuste: textos cortos y extensos, reducción por puntos, competencias combinadas, altura total exacta, separadores vacíos y estilos externos conservados.
- Pruebas de numeración curricular y de códigos de competencias/capacidades en certificados correctas.
- Pruebas de historial y relleno de notas de Registro Auxiliar correctas.
- Se generó un ejemplo con la plantilla real y se comprobó que conserva los dibujos e imágenes originales, el texto y las líneas vacías.

No se emitieron certificados reales de estudiantes durante la validación. Para revisar visualmente el resultado publicado hay que generar nuevamente un certificado: los documentos emitidos anteriormente conservan su archivo original.

## Actualización posterior — 13:23, America/Lima

- Por indicación del usuario, el alto del bloque de datos pasa a **310 puntos**.
- La separación vacía entre capacidades usa la mitad del tamaño final de la fuente, con un mínimo de un punto. Se conserva el texto y se vuelve a calcular este espacio en cada intento de ajuste.
- La numeración se conserva tal como estaba publicada: por ejemplo, `UC1 C1`.
- Se desplegó únicamente `generateCertificadosTitulos`, versión **94**, a las 13:23:10. Hash: `77823d40e700236270ef35e6505ee071f26ca92a`.
- Se comprobó que el paquete remoto contiene el mismo código local validado y que la función mantiene su autenticación.
- Hosting conserva exactamente la misma versión y el mismo lanzamiento del despliegue anterior.
- Se reemplazó nuevamente la plantilla a las 13:23:43: 97 995 bytes, generación `1794421423277456`, SHA-256 `744b5d510d3adabcbdcfd1cbb5ecc3f7e81ca9c7643ff3b3531c636b20e01ffe`.
- Compilación, ESLint, pruebas de separadores/alturas/numeración y comprobación con la plantilla real correctas. La prueba con la plantilla real también comprueba los tamaños fraccionarios de los separadores en el XML y la conservación de imágenes.
