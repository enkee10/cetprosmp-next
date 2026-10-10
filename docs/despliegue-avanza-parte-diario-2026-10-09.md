# Plantillas AVANZA y despliegue de Parte Diario — 9 de octubre de 2026

El usuario autorizó subir el ZIP descomprimido y publicar todos los cambios locales pendientes. Confirmó Firebase Storage como destino. No se publican respaldos, exportaciones de emuladores ni archivos privados del directorio `tmp`.

## Plantillas

Se descomprimieron las 14 plantillas Excel de `AVANZA-Plantillas-Registro-2026.zip`, conservando sus nombres y estructura. Están en el bucket `cetprosmp-2026.firebasestorage.app`, bajo `AVANZA/AVANZA-Plantillas-Registro-2026/`. Total descomprimido: 328.670 bytes. Se verificaron las 14 mediante descarga y comparación exacta con el archivo original. Conservan las reglas existentes de Storage.

El archivo de Google Drive inicialmente no pudo leerse por falta de espacio en el disco de caché. Se reubicaron tres cachés antiguos de npm en `tmp/relocated-npm-cache`, conservando sus rutas mediante junctions, sin borrar su contenido. Después se copió y verificó el ZIP en el disco D.

## Esquema y permisos

Se crearon `GrupoModuloJornada` y `ParteDiarioInforme`, con sus relaciones, índices y permisos de los roles de servicio existentes de SQL Connect. Se ampliaron los campos de `ParteDiarioRegistro` para PPP/EFSRT manual y las cinco valoraciones. La migración conserva los registros existentes, permite referencias nulas y cambia los valores predeterminados de los catálogos. El esquema y el conector ya están publicados.

Se aplicaron 18 registros de permisos de las entidades Parte Diario y su reporte. Parte Diario: coordinadores; reporte: coordinadores y director. Se mantiene el acceso habitual del superusuario. Los permisos de otras entidades se conservaron.

Remoto contenía un Parte Diario guardado. Se conservaron sus datos, firma, observaciones y matriculados; solo se completó `silaboValor = 4`, cuyo estado era inequívoco. Los estados anteriores ambiguos no recibieron una valoración de calidad inventada.

## Programación

Se comparó el último origen local desplegado, el local actual y un respaldo nuevo de remoto. Se sincronizaron los cambios correspondientes a 75 grupos-módulo: 16.558 escrituras en una transacción, sin eliminaciones. Se verificaron todas las tablas contra el resultado esperado y se conservaron los demás registros y campos. El alcance comprende actividades, calendarios, eventos y relaciones, programación de actividades y unidades, jornadas, grupos y grupos-módulo. Materiales, planes y matrículas no recibieron escrituras nuevas en esta operación.

**Pendiente de decisión:** el grupo 176 y el grupo-módulo 167 de Bordados de Romelio figuran en local y están ausentes en remoto; también estaban ausentes en el respaldo del despliegue anterior. No se restauraron automáticamente. Se publicaron los demás grupos, dejando fuera las escrituras específicas de ese grupo hasta que el usuario indique si debe restaurarse.

Las consultas reales a SQL Connect verificaron 30 filas para el Parte Diario del día, fechas de actividades, permisos de coordinador/director y la conservación del parte guardado. Los criterios y excepciones de la reprogramación se detallan en [reprogramación local](calendarizacion-2026-reprogramacion-local.md).

## Código y verificaciones

La compilación de cliente y Functions terminó correctamente en `tmp/avanza-release-20261009`, sin detener los servidores locales. El despliegue de Functions completó inicialmente 194 funciones; otras ocho recibieron un error interno de Google. Dos reintentos terminaron las restantes. Las 202 funciones están activas y actualizadas, y los archivos publicados comprobados coinciden con la compilación.

Firebase Hosting quedó publicado y el servidor SSR está saludable en la revisión `ssrcetprosmp2026-00272-fet`. `/parte-diario` y `/intranet/reportes/parte-diario` responden HTTP 200. Las funciones nuevas comprobadas rechazan llamadas sin autenticación.

En navegador se verificaron los archivos reales de la web pública y lecturas reales de la base remota, con autenticación simulada y sin escrituras de prueba en producción: 14 columnas, fechas/negrita de actividades, cinco opciones sin puntajes visibles, reporte para coordinador/director y denegación del Parte Diario al director. No hubo errores de React. El estado del esquema publicado coincide con el local.

Los registros de diagnóstico generados durante el despliegue se sanitizaron para quitar las claves privadas que Firebase incluyó. No se cambiaron las credenciales utilizadas por la aplicación.

## Respaldos y resultados privados

`tmp/avanza-deploy-20261009` contiene el respaldo completo anterior, origen local, plan original, plan de cambios no afectados, migración SQL, respaldo y resultado de permisos, verificación de la transacción de datos, consultas remotas y manifiesto de archivos Storage con hashes. Los respaldos conservan datos privados y permanecen fuera de Git y del despliegue.
