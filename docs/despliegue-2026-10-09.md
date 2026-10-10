# Despliegue general del 9 de octubre de 2026

Autorizado por el usuario para publicar todos los cambios de código pendientes y transferir únicamente los datos modificados durante la conversación, incluidos los cambios manuales de Materiales y Planes.

## Datos

Se compararon tres estados: la copia remota descargada el 8 de octubre, los datos locales actuales y un respaldo nuevo de remoto. La comparación no encontró conflictos. Se incluyeron además una modificación de CompetenciaUnidadDidactica y tres cambios de orden de IndicadorCapacidad detectados en local. Planes coincide con la copia base y remoto: no necesitó escrituras.

Se aplicaron 8.717 cambios de registros en una transacción, conservando las claves y actualizando únicamente los campos cambiados. Los cambios incluyen 1.053 materiales, la división de las 16 sesiones identificadas, el traslado de Tejido a Máquina y Tejido a Mano, los calendarios de 2026 y sus relaciones, los cambios manuales locales de módulos y los permisos de Parte Diario. Las 79 eliminaciones corresponden exclusivamente a vínculos de ActividadMaterial que ya se habían eliminado en local.

Antes de confirmar la transacción se verificaron todas las tablas y sus registros contra el resultado esperado, incluyendo la conservación de los registros y campos ajenos al cambio. Se ajustaron las secuencias de las tablas que recibieron registros nuevos para permitir futuras altas sin colisiones.

## Esquema y código

Se crearon Material y ParteDiarioRegistro, se agregó Competencia.orden y ActividadMaterial.materialId con su relación e índices. La eliminación anterior de los sufijos ya estaba aplicada en remoto. Al tratarse de una base existente protegida por SQL Connect, la migración aditiva se ejecutó directamente en PostgreSQL; las dos tablas nuevas recibieron los mismos roles de servicio usados por las tablas existentes. Después se publicó el esquema y el conector con Firebase CLI.

Se publicaron las 196 funciones del código principal y la web en Firebase Hosting con Next.js. La compilación se realizó en una carpeta aislada para conservar el servidor local. El servidor SSR quedó en una revisión saludable de Cloud Run. No se transfirieron exportaciones locales de Firestore, imágenes o archivos de usuarios.

Se verificó que el esquema publicado coincide con el local, que las 196 funciones están activas y actualizadas y que los archivos principales del código publicado coinciden con la compilación local. Las funciones nuevas son accesibles y exigen autenticación. Las consultas reales a la base remota verificaron los 1.053 materiales con sus nombres y claves, las 646 marcas de calendario y las 22 sesiones de Parte Diario del día, todas con matriculados.

En la dirección pública se verificaron la navegación y el filtro de semestres del Calendario, y las 15 columnas, colores, selectores, modal, observaciones y proporción de la firma de Parte Diario en tablet. Estas pruebas de interfaz usaron datos reales leídos de remoto, una sesión de navegador simulada y respuestas simuladas de guardado y transcripción, para no generar registros de prueba en producción. Las páginas `/parte-diario`, `/intranet/calendario` y `/intranet/materiales` respondieron con HTTP 200.

## Respaldos e informes locales

La carpeta `tmp/general-deploy-20261009` contiene los artefactos privados de esta operación, excluidos del despliegue y de Git:

- `remote-before.json`: respaldo de datos y metadatos de remoto antes de migrar.
- `local-source.json`: datos locales utilizados como origen.
- `plan.json`: cambios calculados, alcance y comprobación de conflictos.
- `schema-migration.sql`: migración aditiva revisada.
- `remote-before-data-transaction.json`: respaldo inmediatamente anterior a las escrituras.
- `remote-after-data.json`: estado verificado después de sincronizar.
- `data-result.json`: recuento de inserciones, actualizaciones y eliminaciones por tabla.
- `backend-verified.json`: comprobación del esquema y las funciones publicados.

Los respaldos conservan datos privados del sistema y deben permanecer fuera de directorios públicos.
