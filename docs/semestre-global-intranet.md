# Semestre actual y menús docentes

La intranet obtiene `general.semestreActualId` de Settings una vez por sesión de usuario. `AppSettingsProvider` inicia la carga y `useAppSettings` comparte un almacén en memoria con todos los componentes. El layout espera esta carga inicial antes de montar las páginas, de modo que sus filtros ya tengan el semestre al iniciar sus consultas. No hay una consulta adicional de configuración al navegar.

Al guardar Settings se publica la respuesta del servidor directamente en el almacén. Las otras pestañas reciben una señal para recargar la configuración. Cerrar sesión limpia el estado y su caché; las respuestas pendientes de otra sesión no pueden restaurarlo. Una recarga del navegador restaura la configuración desde `sessionStorage` y la valida en segundo plano. La caché distingue usuario y día en Lima. También se valida al volver a la aplicación (con un intervalo mínimo de un minuto) y al cambiar el día. No se agregó una tarea programada ni un cálculo del semestre según fechas.

`useCurrentSemestreFilter` y `useCurrentSemestresFilter` seleccionan el semestre configurado como valor inicial. Se aplican en grupos, listas académicas, Registro Auxiliar, agenda y reportes. Matrícula puede comenzar a consultar con el ID sin esperar los catálogos de filtros, y completar el nombre del semestre no vuelve a solicitar las matrículas.

Los docentes consultan únicamente el semestre configurado, incluso si intentan abrir un enlace histórico. Los administradores conservan sus filtros históricos. Se retiró de Settings el interruptor para incluir el semestre anterior en vistas docentes.

El menú usa `listDocenteMenuModulos` en una sola llamada para Lista, Notas y Programación Curricular. La consulta filtra por UID del docente, semestre actual y grupos no archivados en Data Connect. La caché del navegador distingue usuario, permisos y semestre, y comparte las solicitudes simultáneas del menú de escritorio y móvil. `loadDocenteModulos` comparte los grupos originales y las solicitudes pendientes con la página de matrículas: abrir una lista desde el menú no repite la consulta de grupos.

Las etiquetas usan el nombre guardado del grupo-módulo, retirando turno y docente; conservan horario y sufijos. Ejemplo: `Lista Carpintería (oct-dic) Lun, Mie, @Vie 26-2` y `Notas Carpintería (oct-dic) Lun, Mie, @Vie 26-2`.

## Optimización adicional del 19/10/2026

- `getAppSettings` devuelve identificadores y nombres de semestres en la misma consulta SQL. El filtro de matrículas ya no solicita un catálogo separado y permanece habilitado mientras se cargan grupos.
- Los administradores consultan grupos directamente por `semestreId`, sin esperar el título del semestre. Se conserva el parámetro de título para clientes anteriores.
- La navegación de intranet se muestra durante la primera carga de Settings; las páginas esperan solo si aún no existe configuración. Las opciones autorizadas del menú superior aparecen mientras se completan los enlaces docentes.
- Los permisos en memoria se usan desde el primer render de cada consumidor. El servidor verifica los permisos solicitados por el menú con una consulta de rol y una de permisos, en lugar de repetir ambas por cada opción.
- Las listas docentes que reciben un grupo concreto comprueban semestre, propietario y archivo en SQL, evitando resolver usuario y personal por separado. Los vínculos de módulos y miniaturas se completan en paralelo.

Las pruebas verifican deduplicación entre menú y matrícula, restauración inmediata y validación de caché, cambio de semestre, aislamiento entre usuarios y dos consultas SQL para los permisos del menú. No se atribuyen mejoras en segundos sin una medición de sesión real en producción.

## Validación local

- `node scripts/test-semestre-global.cjs`: una carga compartida, cambios, caché del menú, nombres, cierre de sesión y respuestas pendientes.
- `npm --prefix functions run build` y `npx tsc --noEmit --pretty false`.
- `scripts/test-docente-semestre-integration.cjs`: ejecutado contra un emulador desechable de SQL Connect, proyecto `demo-cetpro-semestre-test` y puerto `9398`. Verifica selección actual, pertenencia al docente, permisos, enlaces históricos y cambio de Settings. El script rechaza otro proyecto o puerto.

La validación inicial se realizó localmente, sin modificaciones de datos de producción. Los cambios se publicaron después, el 19/10/2026, junto con la corrección de contraseña inicial de Workspace. Ver [registro del despliegue](despliegue-2026-10-19-semestre-workspace.md).

## Contraseña inicial de Workspace

El formulario pasa el número de documento normalizado como `createPassword` al sincronizar Workspace, incluso cuando Firebase Authentication ya existe por una matrícula creada desde Registro Auxiliar. Este valor se utiliza únicamente al crear una cuenta de Workspace faltante. Las actualizaciones de cuentas existentes conservan su contraseña.

La sincronización sigue ocurriendo antes de validar la matrícula duplicada: el estudiante puede completar su cuenta de Workspace y recibir después el aviso de que ya está matriculado en ese grupo. No se inserta otra matrícula. `node scripts/test-matricula-workspace-password.cjs` verifica ambos casos, incluidos documentos con ceros iniciales.
