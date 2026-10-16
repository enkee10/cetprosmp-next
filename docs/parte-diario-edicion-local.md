# Edición de textos y firma en Parte Diario

Actualización: publicado en remoto el 16/10/2026. Ver `despliegue-parte-diario-2026-10-16.md`. Lo siguiente describe la preparación y las pruebas locales previas.

Cambios locales del 16 de octubre de 2026, sin despliegue.

Observaciones, compromisos y comentarios utilizan un campo que mantiene su texto mientras se escribe, sin serializar el formulario ni actualizar su estado global por cada pulsación. Confirma el borrador al perder foco, ocultarse el editor, desmontarse el modal o salir de la página. Los botones Agregar observación, Aceptar edición y Listo conservan su confirmación explícita. Esto aplica tanto al formulario como a la lista de docentes.

El comentario de un compromiso cumplido tiene un borrador local independiente, identificado por registro y compromiso. Cambiar de control, ocultar el editor o cerrar Historial conserva lo pendiente. Agregar comentario lo recupera; Guardar comentario publica el único comentario permitido y elimina su borrador. Escribir no modifica el parte firmado ni el historial publicado.

La firma deja de repintar su propia imagen recortada cada vez que el formulario devuelve el valor recién dibujado. Los trazos permanecen en sus coordenadas originales durante la firma. El recorte se mantiene para guardar la imagen; abrir una firma previamente guardada conserva la presentación anterior. También se impide que una carga de imagen pendiente repinte encima de un trazo nuevo.

Validación: TypeScript, ESLint y Chromium con los componentes reales en el puerto 3001, servicios simulados y solicitudes externas bloqueadas. Se contaron las escrituras de almacenamiento para comprobar que no ocurren por tecla; se probaron pérdida de foco, cierre por Escape, borradores de observación y compromiso en la tabla, recuperación de comentarios y publicación explícita. Se comparó la imagen completa del lienzo antes y después de soltar dos trazos, sin desplazamiento. Se mantuvieron las comprobaciones de campos obligatorios y exclusión de partes no firmados. Script de integración: `tmp/parte-edicion-local/browser.cjs`.
