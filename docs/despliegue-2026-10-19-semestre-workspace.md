# Despliegue del 19/10/2026: semestre, menús y contraseña de Workspace

Se publicaron todos los cambios de aplicación pendientes de esta conversación en `cetprosmp-2026`: semestre compartido, filtros iniciales, vistas docentes del semestre actual, menú unificado y contraseña inicial de Workspace basada en el documento del estudiante.

Al guardar el formulario, una cuenta faltante de Workspace se crea con el DNI, aunque Firebase Authentication ya existiera por Registro Auxiliar. La sincronización ocurre antes de rechazar una matrícula duplicada. Las actualizaciones de cuentas existentes conservan su contraseña; no se ejecutó ninguna reparación masiva de cuentas.

## Funciones publicadas

Se publicaron las 19 funciones afectadas, sin redesplegar funciones ajenas al cambio:

- Configuración: `getAppSettings`, `saveAppSettings`.
- Menú: `listDocenteMenuModulos` (nueva).
- Listas: `listMatriculas`, `listMatriculaDocenteGrupos`, `exportMatriculasAvanza`.
- Formularios: `crearMatriculaFormulario`, `crearMatriculaFormularioSuelto`, `updateMatriculaFormulario`.
- Registro Auxiliar: `listRegistroAuxiliarDocenteModulos`, `listRegistroAuxiliarOpciones`, `getRegistroAuxiliar`, `updateRegistroAuxiliarGrupoModuloFechas`, `createRegistroAuxiliarMatricula`, `retireRegistroAuxiliarMatricula`, `updateRegistroAuxiliarEstudianteNombre`, `saveRegistroAuxiliar`.
- Programación Curricular: `listEstructuraAcademicaDocente`, `getEstructuraAcademicaDocenteMenu`.

Firebase confirmó las 19 operaciones. El inventario remoto posterior mostró las 19 funciones `ACTIVE`, con hash distinto al anterior o como función nueva.

## Hosting y comprobación remota

Se publicó Firebase Hosting con su backend Next.js `ssrcetprosmp2026`, también verificado `ACTIVE` y actualizado. La construcción generó 161 páginas. Build ID publicado: `Dcl09kKOQ_c8j5KwGtzWj`.

Se comprobó HTTP 200 en `https://cetprosmp.edu.pe/intranet`, en sus 33 archivos JavaScript referenciados y en el manifiesto del nuevo build. Los archivos publicados contienen el endpoint `listDocenteMenuModulos` y el almacén compartido de configuración. El nuevo endpoint devuelve 401 sin autenticación y permite el preflight CORS desde `https://cetprosmp.edu.pe`.

## Validación del código

- Compilación de Functions y TypeScript del frontend correctas.
- `test-matricula-workspace-password.cjs`: Workspace simulado, creación con DNI tras Registro Auxiliar, conservación de ceros iniciales y contraseñas existentes, y rechazo de matrícula duplicada sin insertar otra.
- `test-semestre-global.cjs`: carga compartida, caché, cambios de semestre y nombres del menú.
- `test-matricula-schedule.cjs` y `test-matricula-modulo-rows.cjs`: regresiones de matrícula correctas.

No se realizaron migraciones ni importaciones de datos de producción. Los errores de lint preexistentes en Matrícula y el visor de impresión siguen documentados en la revisión anterior.

## Segunda publicación: velocidad de menú y matrículas

Se publicaron las optimizaciones adicionales de [semestre global](semestre-global-intranet.md): configuración con nombres de semestres, restauración de sesión con validación en segundo plano, grupos compartidos entre menú y matrículas, consultas de grupos por ID de semestre, permisos agrupados y carga paralela de vínculos y miniaturas. El período ahora aparece al final de Lista y Notas.

Las 19 funciones afectadas quedaron `ACTIVE` con un hash nuevo. Firebase confirmó el despliegue de Hosting y la actualización del backend Next.js, también `ACTIVE`. Build ID: `_IiGICDc_OqmMhinp9xua`.

Se verificaron HTTP 200 en `/intranet`, `/intranet/matriculas` y `/intranet/registro-auxiliar`, sus 45 archivos JavaScript y el manifiesto de la versión publicada. Los archivos incluyen `cetprosmp.appSettings.v2.` y el endpoint compartido de grupos. `getAppSettings` y `listDocenteMenuModulos` responden 401 sin sesión.

Pasaron TypeScript del frontend y Functions, compilación de producción, compilación SQL Connect, pruebas de configuración/caché/menú, regresiones de matrículas y contraseña inicial de Workspace, y la integración con el emulador SQL desechable. Esta última confirmó nombres de semestres en Settings, dos consultas para verificar los permisos del menú y aislamiento por docente y semestre. El lint de los archivos nuevos y hooks modificados pasó; permanecen los tres errores de variables sin uso ya existentes en `MatriculasClient.tsx`. No se midieron tiempos de una sesión autenticada real en producción.
