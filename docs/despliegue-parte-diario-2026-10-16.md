# Despliegue de Parte Diario — 16 de octubre de 2026

Despliegue completo al proyecto `cetprosmp-2026`: esquema y conector de SQL Connect, funciones, Hosting y configuración de Firestore y Storage. Las 205 funciones quedaron ACTIVE y se conservaron todas las funciones existentes. Las dos funciones nuevas de historial y seguimiento tienen timeout de 180 segundos.

La base existente protege las migraciones automáticas. Se aplicó exclusivamente `dataconnect/migrations/20261016_add_parte_compromisos.sql` mediante `scripts/apply-parte-compromisos-schema.mjs`: columna `compromisos` JSONB nullable. Los 79 registros presentes al aplicar la migración se conservaron. Después se publicó el esquema y se comprobó el acceso al campo mediante una consulta GraphQL de solo lectura.

Firebase incluía la caché de compilación de Next.js en el servidor generado; la primera subida falló por conexión. El hook `scripts/prepare-hosting-deploy.cjs` excluye únicamente las cachés de compiladores de la copia generada, conservando la caché local de trabajo y la caché de imágenes. El paquete pasó de 104,87 MB a 10,31 MB y el reintento terminó correctamente.

Verificación posterior:

- Versión pública `cb00502e-2115-4c87-a460-935f200efbb7`, coincidente con la compilación local publicada, en `cetprosmp.edu.pe` y `cetprosmp-2026.web.app`.
- `/parte-diario` respondió HTTP 200; sus archivos JavaScript incluyen los cambios de historial, seguimiento, borradores de comentarios y validación de campos.
- Las dos funciones nuevas devolvieron el rechazo JSON esperado para llamadas sin autenticación y encabezados CORS válidos.
- Inventario remoto de 205 funciones ACTIVE, con las funciones anteriores conservadas y los timeouts nuevos comprobados.

Las pruebas funcionales en navegador y emuladores descritas en los documentos de cambios locales se realizaron antes de publicar. No se crearon registros de prueba en producción para esta verificación.
