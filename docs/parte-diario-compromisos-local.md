# Parte Diario: compromisos, historial y validación

Actualización: publicado en remoto el 16/10/2026. Ver `despliegue-parte-diario-2026-10-16.md`. Lo siguiente describe la preparación y las pruebas locales previas.

Implementado y probado en local el 16 de octubre de 2026. Sin despliegue ni modificaciones de datos remotos.

- Cada observación admite un compromiso opcional. El botón junto a editar y eliminar abre su campo; se conserva con el borrador y se muestra debajo de la observación, con sangría y flecha de 90°. Al eliminar una observación se elimina su compromiso y se conservan las asociaciones de las restantes.
- Historial abre un modal del mismo docente y grupo-módulo, a través de todas sus fechas. Solo consulta partes firmados. Abre con la unidad actual y permite cambiarla o elegir todas; la unidad aparece únicamente en el filtro, mientras cada entrada muestra fecha, actividad, observación y compromiso.
- Cumplido guarda inmediatamente fecha y autor en el servidor, sin exigir comentario ni una nueva firma. Tras cumplir se habilita un único comentario opcional, también con fecha y autor. El texto del compromiso cumplido y el comentario guardado se conservan; los reintentos no reemplazan su auditoría.
- Los cambios simultáneos se controlan con la versión del parte. Las fechas visibles se convierten a America/Lima. Los autores y fechas se asignan en el servidor, ignorando los datos de auditoría enviados por el navegador.
- Guardar en el formulario permanece disponible con campos pendientes: al intentarlo se marcan todos los obligatorios faltantes en rojo, se desplaza la vista y se enfoca el primero. La firma también se marca y recibe foco cuando corresponde. Los indicadores desaparecen al completar cada campo. Asistentes = 0 es válido; observación, compromiso y comentario siguen siendo opcionales.

Persistencia: campo JSONB nullable `ParteDiarioRegistro.compromisos`, junto a las observaciones existentes. Los registros anteriores sin compromisos siguen siendo válidos. Las funciones nuevas son `getParteObservacionesHistorial` y `saveParteCompromisoSeguimiento`, con permisos de Parte Diario o sus reportes y comprobación del docente, grupo-módulo, firma y versión. El guardado del parte valida y guarda observaciones y compromisos juntos. Los informes mantienen su cálculo sobre partes firmados; los borradores locales no aportan datos.

Validación realizada:

- TypeScript del frontend y compilación de Functions; ESLint de los componentes modificados; compilación del esquema con `dataconnect:compile`.
- `node scripts/test-parte-compromisos.cjs` y `node scripts/test-parte-drafts.cjs`.
- Chromium con componentes reales en puerto 3001 y servicios simulados, bloqueando solicitudes externas: doce controles pendientes en rojo, foco en unidad/actividad/asistentes/firma, cero asistentes válido, persistencia del compromiso tras recarga, historial filtrado, cumplimiento sin comentario y comentario único.
- Prueba de las funciones contra SQL Connect en `127.0.0.1:9399`: exclusión de no firmados, autenticación y ámbito, versiones obsoletas, cumplimiento, reintentos, comentario y guardado real de un formulario firmado. Se crearon dos registros temporales de prueba y se eliminaron al finalizar. Se comprobó la representación del timestamp devuelta por la base para permitir seguimientos consecutivos.

Los scripts temporales y capturas de integración están en `tmp/parte-compromisos-local/`. No se reiniciaron los emuladores existentes.
