# Transitabilidad — 17 de noviembre de 2026

## Implementación

- Se añadió `GrupoModulo.transitabilidad`, con valor predeterminado `false`. La marca corresponde a la oferta del módulo; el catálogo conserva sus títulos originales.
- Los formularios de grupos y grupos-módulo permiten activar Transitabilidad únicamente para módulos de programas de estudio. El backend valida la misma condición.
- El formato compartido añade exactamente `(Trans.)` al nombre del módulo. Se utiliza en los nombres de grupos, listas, matrícula, registro auxiliar e impresión, nóminas, actas y certificados, incluyendo los títulos en mayúsculas.
- La propiedad se conserva cuando una actualización omite el campo. Un cambio de modalidad se rechaza dentro de la transacción si existen documentos académicos, documentos de certificados/títulos o certificados registrados.
- La evaluación y el cálculo de notas mantienen su comportamiento regular.

## Registros creados en la base remota

Semestre actual: **2026-2** (`4`). Turno: **Mañana** (`1`). Horario: **Lun - Vie** (`5`, días `1,2,3,4,5`). Grupos activos y sin archivar.

| Grupo-módulo | Grupo | Docente | Módulo |
|---|---|---|---|
| 205 | 209 | Dora Gonzalo Bravo (`11`) | Acondicionamiento y Elaboración de Productos de Panaderia y Pasteleria (`25`) |
| 206 | 210 | Mary Gloria Lazo Quispe (`21`) | Acondicionamiento y Elaboración de Productos de Panaderia y Pasteleria (`25`) |
| 207 | 210 | Mary Gloria Lazo Quispe (`21`) | Decoración y Presentación de los Productos de Panadería y Pastelería (`26`) |
| 208 | 211 | Liliana Rocio Millan Mercado (`17`) | Técnicas de Tizado, Tendido y Corte de Prendas de Vestir (`10`) |

Se vinculó el currículo existente: 7 unidades para cada módulo de Panadería y Pastelería y 6 unidades para Corte y Ensamblaje. No se asignaron fechas de módulo ni calendario adicionales. No se inscribieron estudiantes ni se emitieron documentos.

La creación se realizó con `functions/scripts/crear-grupos-transitabilidad.mjs --apply`, que reutiliza el guardado transaccional de grupos y detecta registros existentes para evitar duplicarlos. Los respaldos del catálogo y los resultados están en `backups/transitabilidad-20261117/`.

## Migración y validaciones

- La base está administrada externamente a SQL Connect; se aplicó directamente la migración `20261117_add_grupo_modulo_transitabilidad.sql`. El esquema de SQL Connect quedó desplegado y compatible.
- Compilación TypeScript del backend correcta y validación TypeScript de `src` correcta. El comando general del repositorio agotó el heap al incluir otros directorios; se verificó la aplicación con una configuración temporal limitada a sus fuentes.
- Se compilaron 22 operaciones GraphQL afectadas, incluida la protección transaccional de documentos, en un servicio temporal local de validación. Se conserva la advertencia preexistente de clave compuesta de `ActividadMaterial`.
- Pruebas correctas de nombres regulares/transitabilidad, sufijos de instancias, persistencia al editar, rechazo de opciones ocupacionales y campos de nóminas, actas y certificados.
- Comprobación de solo lectura con la base remota: los cuatro registros aparecen en las listas, formularios, registro auxiliar y datos de reportes con su marca y currículo correspondientes.

## Publicación

El esquema remoto, el sitio y las **22 funciones afectadas** se publicaron correctamente. Los registros del despliegue están en `tmp/transitabilidad-hosting-deploy.log` y `tmp/transitabilidad-functions-deploy.log`.

- Hosting: versión `20270dc4e56bfba8`.
- Build de Next.js: `qGj7o4iaTFxdlyJ9dIf0F`.
- Las rutas de Grupos, Grupo-Módulo, Registro Auxiliar, Actas/Nóminas y Certificados respondieron HTTP 200. El manifiesto del build publicado también respondió HTTP 200.
- La función publicada `listGrupoModulos` respondió HTTP 401 / `UNAUTHENTICATED` a una llamada sin sesión, conservando la autenticación.

## Ampliación: quinta lista y numeración automática

- Se añadió `GrupoModulo.numeroTransitabilidad`, que se asigna al repetir una instancia de transitabilidad y se conserva en las siguientes ediciones. Una sola instancia nueva mantiene `(Trans.)`; al duplicarse, se generan `(Trans. 1)` y `(Trans. 2)` sin exigir sufijos manuales. Eliminar una instancia no renumera las restantes.
- Los formularios de Grupo y Grupo-Módulo reutilizan el mismo guardado transaccional. Al aumentar el número de instancias en el formulario de Grupo, la nueva instancia hereda la marca de transitabilidad.
- La numeración llega a listas, matrícula, registro auxiliar, nóminas, actas y certificados mediante el formato compartido y las consultas actualizadas. Las instancias regulares conservan las reglas previas de sufijos.
- La protección de documentos emitidos también se aplica cuando una instancia pasa de `(Trans.)` a `(Trans. 1)`. Antes de la ampliación se comprobó que la lista de Liliana no tenía documentos emitidos.
- Se conserva el grupo `211`, docente Liliana Rocio Millan Mercado (`17`), semestre `2026-2`, turno Mañana (`1`) y horario Lun - Vie (`5`). El grupo-módulo `208` pasa a **Técnicas de Tizado, Tendido y Corte de Prendas de Vestir (Trans. 1)**. Se creó el grupo-módulo `209`, instancia `2`, con **(Trans. 2)**. Hay ahora **cinco grupos-módulo de transitabilidad**.
- Ambas instancias de Liliana tienen seis unidades didácticas. Se comprobó que las relaciones, orden y fechas de las unidades de la primera instancia permanecen iguales.
- La creación se realizó con `functions/scripts/agregar-transitabilidad-liliana.mjs --apply`, que evita duplicar la segunda instancia si se ejecuta otra vez. Los respaldos están en `backups/transitabilidad-20261117/liliana-antes-*.json` y `liliana-despues-*.json`.
- Se aplicó `20261117_add_numero_transitabilidad.sql` y se publicó el esquema compatible de SQL Connect. Compilaciones TypeScript de aplicación/backend y validación de las 22 operaciones GraphQL correctas. Pruebas correctas de numeración, persistencia, eliminación de una instancia, sufijos regulares y nombres numerados en nóminas, actas y certificados.

Los registros de esta publicación están en `tmp/transitabilidad-numeracion-hosting-deploy.log` y `tmp/transitabilidad-numeracion-functions-deploy.log`.

Publicación completada: **22 funciones** actualizadas; Hosting versión `b9c4fe8166a76e47`, build `vNeuVqrpZyai5wh_edmbU`. Las cinco rutas de intranet afectadas y el manifiesto del nuevo build respondieron HTTP 200. La función publicada conserva la respuesta `UNAUTHENTICATED` para llamadas sin sesión. La comprobación de solo lectura sobre la base remota confirmó cinco listas, ambas numeraciones de Liliana y los nombres correctos para sus documentos.
