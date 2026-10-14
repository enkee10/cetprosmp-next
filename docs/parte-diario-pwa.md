# PWA de Parte Diario

## Configuración

Proyecto comprobado: Next.js 15.5.18, React 19 y App Router. Antes de este cambio no existían manifiestos PWA ni registros de service workers.

La página está en `src/app/(sueltos)/parte-diario/page.tsx` y mantiene los proveedores generales de autenticación y las funciones del formulario. Añade únicamente los metadatos de instalación y un aviso de actualización. La interfaz habitual, los permisos y la lógica de guardado no cambian.

Manifiesto exclusivo: `/parte-diario/manifest.webmanifest`.

- Nombre: Parte Diario - CETPRO SMP; nombre corto: Parte Diario.
- `id` y `start_url`: `/parte-diario`. El identificador permanece estable entre publicaciones.
- `scope`: `/parte-diario`. Incluye la página, su vista previa de impresión (`/parte-diario/imprimir`) y sus recursos propios, y excluye `/intranet`, los reportes y los otros módulos. El scope del manifiesto delimita la ventana instalada; no es una regla de autorización ni restringe las llamadas a Firebase. La vista previa se abre en una ventana nueva y conserva la sesión; el contexto de autenticación no la redirige a Intranet.
- `display`: `standalone`. Dentro de ese alcance, una instalación real abre su propia ventana sin la barra de direcciones. Las páginas externas, incluida la autenticación de Google, pueden abrirse en otra ventana del navegador.
- Iconos PNG de 192 × 192 y 512 × 512, con fondo opaco y el escudo institucional centrado, aptos para `any` y `maskable`. El script `node scripts/generate-parte-pwa-icons.cjs` los regenera a partir de `public/logo-smp.svg`, mediante la dependencia Sharp existente de Functions.

El enlace del manifiesto está solo en los metadatos de Parte Diario; la portada y los demás módulos no se anuncian como esta PWA. No se añade un manifiesto global ni una configuración PWA de terceros.

## Datos, sesiones y actualizaciones

No se registra ningún service worker ni se utiliza Cache Storage, sincronización en segundo plano o almacenamiento offline de partes. Las consultas y guardados siguen usando los endpoints existentes y requieren conexión. La persistencia de autenticación de Firebase permanece igual: no se borran las sesiones ni se duplican tokens.

Chrome Android admite la instalación desde el menú sin exigir un service worker con fetch desde Chrome 108; véase [criterios de instalación de Chrome](https://developer.chrome.com/blog/update-install-criteria) y [criterios de promoción de instalación](https://web.dev/articles/install-criteria). No se fuerza un banner de instalación en la interfaz.

`/parte-diario/version.json` es una ruta estática generada por cada compilación. Devuelve únicamente un identificador de versión público, sin usuarios, sesiones ni registros. El componente de actualización la consulta sin caché y sin credenciales al cargar, cada cinco minutos mientras la página esté visible, al volver a la app y al recuperar conexión. La cabecera HTTP impide almacenar este identificador y el HTML del Parte Diario en caché. El manifiesto se revalida y los iconos públicos permiten caché normal.

Cuando detecta una versión distinta, muestra «Hay una nueva versión. Guarda tus cambios antes de actualizar.». Después o X posponen la actualización; Actualizar recarga la página. Nunca recarga automáticamente, para conservar los borradores que aún no se hayan firmado y guardado. Un nuevo despliegue no requiere reinstalar la PWA.

## Instalación en la tablet Blackview

1. Con conexión a Internet, abrir Chrome actualizado en modo normal, fuera de incógnito.
2. Visitar `https://cetprosmp.edu.pe/parte-diario` e iniciar sesión con una cuenta autorizada.
3. Abrir el menú ⋮ y elegir Instalar aplicación. Según la versión de Chrome, puede aparecer dentro de Añadir a pantalla de inicio; elegir Instalar cuando ofrezca esa opción.
4. Confirmar la instalación de Parte Diario - CETPRO SMP y abrir su icono en Android.
5. Comprobar que inicia en Parte Diario y que no aparece la barra de direcciones. Verificar la cuenta activa y probar el refresco y la selección de fecha. Un registro solo se guarda al aceptar su firma, como antes.

Si Android solo creó un acceso directo que abre una pestaña, comprobar que se eligió Instalar y que Chrome está actualizado. Las políticas de administración de la tablet pueden restringir la instalación. La barra de estado o navegación de Android puede seguir visible: `standalone` no equivale a modo kiosco.

## Comprobación técnica

- En Chrome DevTools → Application → Manifest, comprobar nombre, inicio, scope, modo e iconos sin errores de instalación. El manifiesto debe detectarse desde el encabezado de la página.
- La vista Service Workers no debe mostrar un worker de esta PWA; Cache Storage no recibe partes ni respuestas autenticadas.
- Consultar `version.json` dos veces: la versión debe ser igual dentro de una misma publicación, con `Cache-Control: no-store`. La siguiente compilación cambia ese identificador.
- Para comprobar una actualización, dejar la app abierta durante el siguiente despliegue y volver a ella; el aviso permite guardar antes de recargar.
- La emulación de tablet no sustituye la instalación física. La prueba en Chrome de escritorio valida el manifiesto y los criterios del navegador; completar los pasos anteriores confirma el comportamiento de la Blackview.

En desarrollo con Turbopack, Next.js puede insertar los metadatos en el body y Chrome no reconocer el manifiesto para instalar. La compilación de producción coloca el enlace en el head. Las pruebas de instalación usan la compilación de producción y la dirección HTTPS publicada, sin cambiar el comportamiento de metadatos de otros módulos.

## Archivos

- `src/app/(sueltos)/parte-diario/page.tsx`: metadatos específicos y componente de aviso.
- `src/app/(sueltos)/parte-diario/version.json/route.ts`: identificador público por compilación.
- `src/components/parte-diario/ParteDiarioPwaUpdate.tsx`: comprobación de versiones y aviso opcional.
- `public/parte-diario/manifest.webmanifest`: manifiesto exclusivo.
- `public/parte-diario/icons/icon-192.png` y `icon-512.png`: iconos instalables.
- `firebase.json`: cabeceras HTTP limitadas a la página y recursos de Parte Diario.
- `scripts/generate-parte-pwa-icons.cjs`: generación reproducible de iconos.

No cambia el esquema ni los datos de la base de datos. La publicación de esta ampliación usa únicamente Firebase Hosting y su servidor SSR; no vuelve a desplegar las funciones de negocio.

## Publicación comprobada

Publicado el 12 de octubre de 2026 en `https://cetprosmp.edu.pe/parte-diario`, mediante Firebase Hosting y la revisión SSR `ssrcetprosmp2026-00275-kev`. Se confirmó que las 12 funciones de negocio de Parte Diario conservaron sus fechas y versiones.

Chrome 154.0.8037.98, con perfil normal, detectó el manifiesto sin errores y devolvió cero errores de instalación tanto en la compilación local de producción como en la dirección HTTPS publicada. Se comprobaron los tamaños y bytes de ambos iconos, el enlace en el head, ausencia de manifiesto en portada/inscripción, ausencia de service workers/Cache Storage y el aviso de actualización sin recarga hasta aceptarla. La versión permanece estable entre consultas y coincide con el archivo generado por la compilación desplegada; el HTML y el identificador se sirven con `no-store`.

No se conectó una tablet Blackview física. La instalación y el acceso con la cuenta real de Google deben completarse en el equipo institucional con los pasos de esta guía. Las pruebas de formulario usan datos curriculares reales de solo lectura, con autenticación y escrituras simuladas, y no sobrescriben los partes reales.

La prueba funcional sobre los archivos publicados también pasó: conserva las 15 columnas, las dos cuentas y su separación, el refresco en el botón, el selector de fecha, borradores sin persistencia, edición de actividades, cancelación de firma sin guardado, guardado del borrador completo al aceptar la firma, la marca de registro guardado, dictado solo en el modal, ubicación de observaciones y diseño adaptable a tablet. Un parte firmado real se conservó; para probar un registro nuevo se usó una fila simulada.
