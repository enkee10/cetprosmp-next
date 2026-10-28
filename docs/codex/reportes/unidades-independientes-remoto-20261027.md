# Unidades didácticas independientes — migración remota

Fecha: 27/10/2026, finalizada aproximadamente a las 18:15, America/Lima.
Proyecto: `cetprosmp-2026`; servicio `cetprosmp-2026-service`, región `us-central1`.

## Resultado

Se retiró el concepto de unidades didácticas comunes de la aplicación remota: formularios, estructura académica, importadores, reglas del servidor, API y columna SQL `unidades_didacticas.comun`. Se eliminó la función remota `reuseEstructuraAcademicaItem`; su dirección devuelve HTTP 404. La relación competencia–unidad tiene un índice único válido que impide compartir una unidad entre competencias.

La transformación utilizó exclusivamente datos leídos de producción mediante una conexión a su instancia Cloud SQL. No se importaron ni sincronizaron datos, exportaciones o archivos de los emuladores locales. No se desplegaron ni modificaron Auth, Firestore o Storage.

Los módulos comunes entre planes son un concepto distinto y se mantienen.

## Datos conservados

Las cinco unidades antes comunes (94–98) se convirtieron en 33 unidades independientes: se conservaron las cinco originales y se crearon 28 copias con su estructura correspondiente. La migración verificó todos los campos de las 26 tablas involucradas dentro de la misma transacción antes de confirmar los cambios, incluyendo notas, fechas, contenidos y referencias. No se eliminaron registros originales.

| Entidad remota | Antes | Después |
| --- | ---: | ---: |
| Unidades didácticas | 151 | 179 |
| Competencias | 64 | 64 |
| Relaciones competencia–unidad | 171 | 171 |
| Capacidades terminales | 172 | 216 |
| Indicadores | 444 | 546 |
| Aprendizajes | 282 | 444 |
| Sesiones | 889 | 889 |
| Contenidos de sesiones | 3085 | 3085 |
| Materiales de sesiones | 3254 | 3254 |
| Notas de unidades | 3941 | 3956 |
| Notas de capacidades | 4892 | 4907 |
| Notas de indicadores | 12520 | 12550 |
| Grupos de módulos | 76 | 76 |
| Unidades de grupos | 410 | 410 |
| Sesiones programadas | 2847 | 2847 |
| Registros de partes diarios | 213 | 213 |
| Matrículas | 1263 | 1263 |
| Módulos de estudiantes | 1342 | 1342 |

Las notas adicionales copian los valores existentes cuando una misma nota representaba varios módulos de la misma matrícula. Se reasignaron las referencias de 79 sesiones, 59 unidades de grupos y seis partes diarios a sus unidades independientes. Las sesiones y los partes diarios conservaron sus identificadores.

Se preservaron cuatro usos históricos sin incorporarlos al programa curricular vigente: unidad original 94/módulo 31 → unidad 162; 95/módulo 19 → 165; 96/módulo 19 → 167; 98/módulo 18 → 176. Las unidades previamente sin asociación curricular también se conservaron.

Estos conteos corresponden a producción y difieren de los del emulador local.

## Respaldo y ejecución

- Respaldo completo administrado de Cloud SQL: `1793142090768`, instancia `cetprosmp-2026-instance`, estado `SUCCESSFUL`, anterior a la transformación.
- Evidencias y copias de datos remotos: `backups/independent-units-remote-20261027/`. Contienen información de producción y están excluidas del despliegue.
- El archivo señalado por `data-migration-committed.json` conserva el estado previo y el informe con las correspondencias de cada copia.
- Primero se copiaron y reasignaron los datos, manteniendo temporalmente la columna antigua para la aplicación anterior. Después se desplegaron las funciones y la web, se publicó el esquema compatible y se retiró exclusivamente la columna antigua.
- El primer comando de despliegue del esquema se detuvo al detectar esa columna sobrante, tras publicar el esquema compatible. Se verificó la API activa, se ejecutó la retirada controlada y el segundo despliegue de Data Connect terminó correctamente.
- La retirada final comparó nuevamente todas las filas y sus campos: el único campo eliminado fue `comun`. Los conteos finales coinciden con el resultado de la transformación.

## Despliegue y comprobaciones

- 38 funciones de aplicación actualizadas y una función SSR de Next.js actualizada; Hosting publicado correctamente.
- Esquema Data Connect y conector `default` desplegados correctamente.
- Lecturas de estructura académica y registros auxiliares contra Data Connect remoto con los manejadores compilados: 55 grupos afectados verificados antes y después de retirar la columna. No se escribieron datos durante estas comprobaciones.
- 179 unidades, 216 capacidades, 546 indicadores, 444 aprendizajes y 36 módulos leídos correctamente por la aplicación.
- API: consultar `UnidadDidactica.comun` produce un error de validación, y la relación inversa única está disponible.
- SQL: columna antigua ausente, índice único válido y cero unidades curriculares asociadas a varias competencias. La planificación también comprobó la independencia de los usos históricos.
- Once comprobaciones HTTP correctas entre los dos dominios y el servidor SSR: inicio, unidades, estructura académica, parte diario, versión y ruta dinámica. Las páginas de intranet se comprobaron por disponibilidad HTTP; la revisión de los datos se hizo mediante los manejadores contra el servicio remoto.
- Versión web verificada en ambos dominios: `b770a58f-d795-484e-9802-38a81e9bbcc0`.
- Build de Functions, TypeScript y compilación de producción Next.js correctos. Pruebas transaccionales locales de la migración completa y por etapas correctas, con descarte de los datos temporales.

Sitio publicado: https://cetprosmp.edu.pe/intranet/unidades-didacticas

Evidencias finales: `migration-finalized.json`, `application-verification-final.json`, `sql-verification-final.json`, `http-verification.json` y `schema-deployment-completed.json`, dentro de la carpeta de respaldos indicada.
