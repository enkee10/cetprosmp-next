# Optimización de perfil y matrículas — validación local

Estado: implementado y probado en local. Estos cambios todavía no se desplegaron a producción.

## Cambios

- `getMyProfile({includeAvatar:false})` obtiene la identidad y el rol sin consultar avatares. `getMyAvatar` completa después la fotografía, buscando únicamente los documentos del usuario autenticado. Se conserva la respuesta anterior para clientes que no envían la opción.
- Authentication reutiliza el token válido y renueva los claims solo cuando faltan o difieren del rol/nivel del perfil SQL. El bloqueo de cuentas y los permisos en el servidor siguen vigentes. Las respuestas tardías no restauran otra sesión.
- `listMatriculasPage` pagina filas por grupo-módulo, con búsqueda y orden en el servidor. Un índice ligero de pertenencia y fechas permite contar y expandir correctamente los vínculos antiguos; después se cargan los detalles de hasta 50 filas inicialmente (máximo 100). El índice lee el semestre correspondiente; no se afirma que toda consulta SQL se limite a 50 identificadores.
- `getMatriculasPageAvatars` completa fotografías únicamente de matrículas autorizadas de la página. Las filas se muestran antes de esperar imágenes. Las consultas de fotografías proyectan los campos necesarios.
- Caché en memoria de 30 segundos, por usuario, rol/nivel, semestre, grupos, página, filtros y orden; comparte solicitudes en curso. Se invalida al matricular, editar, retirar, cambiar el semestre o cerrar sesión, con señal entre pestañas. Las respuestas anteriores a una invalidación no restauran datos viejos.
- Impresión y exportación general solicitan la lista completa al usarse; no quedan limitadas a las 50 filas visibles. Se conserva el endpoint anterior.

## Medición comparativa

Se ejecutó la versión anterior y la actual con los mismos datos sintéticos: 125 estudiantes, 200 filas por módulo del docente y más de 1.100 trabajos de avatar. SQL Connect y Firestore corrieron en un proyecto demo desechable, puertos 9398 y 8088. La medición final se hizo sin otra compilación concurrente.

Mediana de cinco ejecuciones de cada operación:

| Operación | Antes | Después |
|---|---:|---:|
| Perfil listo para usar | 280,07 ms | 6,17 ms |
| Carga de la primera página de matrículas | 110,93 ms | 68,91 ms |
| Datos de la respuesta inicial de matrículas | 143.043 bytes | 59.693 bytes |

El perfil dejó de esperar la lectura global de hasta 1.000 documentos de avatar. En este escenario, la fotografía posterior consultó un documento del usuario. La primera página usó aproximadamente 58 % menos datos. Reabrir una página almacenada en caché evitó repetir su petición.

Son medidas locales de los handlers con servicios emulados, no tiempos completos de una sesión de producción. No incluyen red pública, verificación HTTP de Firebase ni arranques en frío de Cloud Functions. Las fotografías se miden fuera de la ruta crítica; su trabajo no desaparece, se acota y se difiere.

## Comprobaciones

- TypeScript de frontend y Functions; compilación de producción Next.js con 161 páginas; compilación del esquema SQL Connect.
- `test-intranet-performance.cjs`: cuatro páginas sin filas duplicadas ni perdidas, instancias antiguas, filtros, orden, semestres, pertenencia al docente, fotografías autorizadas y permisos revocados.
- `test-intranet-session-cache.cjs`: caché, caducidad, aislamiento, deduplicación, invalidación, respuestas tardías, tokens reutilizados, cambios de rol, cuentas bloqueadas y cuentas sin claims iniciales.
- Chromium en `127.0.0.1:3001`, componentes reales con servicios simulados: menú y filas disponibles mientras las fotos siguen pendientes; 50 filas, cambio de página, regreso con caché, invalidación externa e impresión completa de 151 filas.
- Regresiones de semestre global, 93 filas/73 matrículas, cruces de horarios y contraseña inicial de Workspace con DNI.

La comparación usa una instantánea previa en `tmp/performance-local/before-sources.json`; los resultados detallados y registros están en esa carpeta temporal. Los scripts de integración rechazan proyectos o puertos ajenos a los emuladores de prueba. No se importaron datos ni se modificaron cuentas de producción.

El lint sigue detectando tres variables sin uso preexistentes en `MatriculasClient.tsx` y el tipo `any` preexistente de `AuthContext.tsx`; no se añadieron errores de lint en el código nuevo.

## Para una publicación posterior

Las nuevas funciones son `getMyAvatar`, `listMatriculasPage` y `getMatriculasPageAvatars`. También cambian los handlers de usuarios y matrículas y el frontend. Se deben publicar las funciones antes de Hosting. No se cambiaron el esquema SQL ni los índices o reglas de Firestore. La mejora real de producción queda pendiente de medir después de ese despliegue.
