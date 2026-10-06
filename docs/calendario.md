# Calendario

Ruta: `/intranet/calendario`, en **Miscelánea → Calendario**.

La agenda ofrece vistas de año (doce meses resumidos), mes, semana y día, con navegación, mini calendario, selección de calendarios, detalles y edición de eventos. Las vistas semanales y diarias muestran las 24 horas y disponen los eventos simultáneos en columnas. Los eventos de todo el día se muestran en una franja separada. Todas las fechas y horas se interpretan en `America/Lima`.

Se pueden filtrar los eventos por calendario, tipo, grupo-módulo, texto y duración académica mínima/máxima. El resumen suma las horas reloj y académicas de los eventos filtrados, recortadas al periodo visible. Una ocurrencia se cuenta una sola vez; los feriados, eventos de todo el día, cancelados y eventos con `computaHoras = false` no suman. Las horas académicas se calculan por evento con su propia duración de hora. Los solapamientos se suman por sesión; no representan tiempo único de ocupación.

## Entidad nueva: ProgramacionHoraria

Tabla: `programaciones_horarias`.

| Campo | Tipo | Uso |
|---|---|---|
| `id` | Int, serial | Identificador. |
| `clave` | String, obligatorio y único | Identifica una solicitud; evita duplicar una programación al reintentar. |
| `titulo` | String, obligatorio | Título de los eventos generados. |
| `horasObjetivo` | Float, obligatorio | Cantidad de horas académicas nuevas que se programarán. |
| `minutosHoraAcademica` | Int, obligatorio | Duración de una hora académica; 60 equivale a hora reloj. |
| `minutosSesion` | Int, obligatorio | Duración habitual de cada sesión en minutos. |
| `fechaInicio` | Date, obligatorio | Primera fecha disponible. |
| `fechaFin` | Date, obligatorio | Última fecha disponible, inclusiva. |
| `diasSemana` | Lista de Int, obligatoria | Días disponibles: 0 domingo a 6 sábado. |
| `horaInicio` | String, obligatorio | Hora local de inicio, HH:mm. |
| `horaFin` | String, obligatorio | Límite de la franja local, HH:mm. |
| `excluirFeriados` | Boolean, obligatorio | Excluye feriados de todos los calendarios activos, aunque estén ocultos en la vista. |
| `evitarCruces` | Boolean, obligatorio | Evita coincidencias en el calendario y en el grupo, incluso entre sus diferentes módulos. |
| `fechaCreacion` | Timestamp, obligatorio | Fecha de registro. |
| `calendarioId` | Int, obligatorio | Relación con `Calendario`; eliminar el calendario elimina sus programaciones. |
| `grupoModuloId` | Int, opcional | Relación con `GrupoModulo`; vacío permite programar eventos generales. |

Las relaciones GraphQL son `calendario` y `grupoModulo`.

## Campos añadidos a Evento

| Campo | Tipo | Uso |
|---|---|---|
| `minutosHoraAcademica` | Int, predeterminado 60 | Permite calcular horas académicas. |
| `computaHoras` | Boolean, predeterminado true | Decide si el evento contribuye al cómputo. |
| `programacionHorariaId` | Int, opcional | Vincula un evento a su programación automática. |

La relación GraphQL es `programacionHoraria`. Los campos son opcionales para conservar compatibilidad con eventos existentes. El cálculo sigue excluyendo feriados, cancelados y eventos de todo el día aunque `computaHoras` sea true.

No se añadieron campos a `Calendario`, `GrupoModulo`, `EventoRecurrencia`, `EventoOcurrencia` ni `EventoRelacion`. Los eventos generados se vinculan a los grupos-módulos mediante la `EventoRelacion` existente. No se crean calendarios de grupos-módulos automáticamente.

## Programación por horas

1. Seleccionar un calendario existente y, opcionalmente, un grupo-módulo.
2. Indicar las horas nuevas a programar, minutos por hora académica, horas por sesión, fechas, días y franja horaria.
3. Previsualizar: se propone una sesión por día seleccionado, empezando en `horaInicio`. Los días con feriados o cruces se omiten. No se busca otra franja dentro de ese día.
4. La última sesión se acorta para cumplir exactamente el objetivo. Si faltan días, se muestran las horas pendientes y no se permite guardar.
5. Guardar: el servidor vuelve a calcular la propuesta, verifica su huella y comprueba cruces dentro de la transacción. La programación, eventos y relaciones se insertan juntos. La `clave` conserva la misma solicitud cuando se reintenta tras un fallo de conexión.

La franja no cruza medianoche. El periodo máximo es un año; las horas deben equivaler a minutos completos. No se asignan docentes, aulas ni descansos automáticamente. Elegir un grupo-módulo propone las horas del módulo como valor editable; no descuenta otras programaciones existentes. El formulario indica expresamente **Horas a programar**.

## Calendario general de feriados 2026

Nombre: **Calendario general — Feriados Perú 2026**. Contiene los 16 feriados nacionales, con inicio a las 00:00 de Lima y fin exclusivo a las 00:00 del día siguiente. No incluye días no laborables compensables ni feriados regionales.

Datos: `scripts/data/feriados-peru-2026.json`.

Fuentes: [Plataforma del Estado Peruano](https://www.gob.pe/feriados), [Diario Oficial El Peruano: feriados de 2026](https://elperuano.pe/noticia/291141-semana-santa-2026-en-peru-cuando-sera-el-proximo-fin-de-semana-largo), [El Peruano: Año Nuevo 2026 y diferencia con el 2 de enero no laborable](https://elperuano.pe/noticia/286039-fin-de-semana-largo-el-2-de-enero-del-2026-sera-dia-no-laborable).

El script de carga es idempotente, añade únicamente el calendario general y los feriados faltantes y no cambia registros existentes:

```powershell
npm --prefix functions run build
node scripts/seed-calendario-feriados.mjs --apply
```

Sin `--apply` solo comprueba el estado. El parámetro `--remote` selecciona la base remota en lugar del emulador.

## Permisos y validación

Se añadió el permiso **calendario**, en Miscelánea. La agenda exige `calendario/view`; programar exige `calendario/create` y `eventos/create`, además de `grupo-modulos/view` cuando se selecciona un grupo-módulo. La edición/eliminación conserva los permisos de eventos. Las funciones usan un tiempo máximo de 180 segundos.

Pruebas:

```powershell
npx -y firebase-tools@latest dataconnect:compile
npm --prefix functions run build
node scripts/test-calendario.cjs
node scripts/verify-calendario.mjs
```

La verificación de integración requiere el emulador de Data Connect con los feriados cargados. Crea datos temporales en un calendario general de prueba y los elimina al finalizar.

La migración aditiva está en `dataconnect/migrations/20261005_add_programaciones_horarias.sql`. Para usar la funcionalidad en producción hay que aplicar el esquema y publicar las funciones y el frontend; la carga de feriados usa exclusivamente los campos existentes y puede ejecutarse antes de publicar el código.

## Resultado de la implementación

Se creó el calendario general **ID 11**, con sus 16 feriados, en la base remota y en el emulador. Una segunda comprobación de carga encuentra cero feriados faltantes. No se crearon calendarios de grupos-módulos.

Se verificaron el esquema, la compilación de funciones, los tipos del módulo de calendario y lint. Las pruebas comprueban distribución exacta, duración académica configurable, exclusión de feriados, cruces entre calendarios del mismo grupo, previsualización desactualizada, reintentos sin duplicados, periodos insuficientes, edición y recurrencias sin duplicar el evento base.

Se revisaron en navegador local las cuatro vistas, detalles, filtros de texto y horas, previsualización con el backend del emulador y presentación móvil. La sesión del navegador fue simulada exclusivamente para la prueba; no se crearon usuarios ni se guardaron eventos de muestra en producción.

Se corrigió la declaración de tipos del selector de competencias en `src/components/intranet/academico/EstructuraAcademicaMasterDetail.tsx`; la comprobación global de TypeScript y la compilación de producción pasan.

Los datos locales con feriados se exportaron separadamente a `tmp/calendario-emulator-export`; la importación original de `data` se conservó. Tras iniciar los emuladores habituales con sus datos originales, el script idempotente permite añadir los feriados locales si aún no están presentes.

## Publicación remota

Se publicaron el esquema de Data Connect, las tres funciones de Calendario, las funciones de eventos/permisos que utiliza la pantalla y la aplicación Next.js en Firebase Hosting. La migración aditiva conserva los 24 eventos existentes. Para la base importada se utilizó `scripts/apply-calendario-schema.mjs`, siguiendo el procedimiento de las migraciones anteriores del proyecto y asignando a la tabla nueva los roles de lectura/escritura de Data Connect.

La vista está disponible en [cetprosmp.edu.pe/intranet/calendario](https://cetprosmp.edu.pe/intranet/calendario) y [cetprosmp-2026.web.app/intranet/calendario](https://cetprosmp-2026.web.app/intranet/calendario), en **Miscelánea → Calendario**.

Se verificaron ambas rutas, el acceso de las funciones con autenticación obligatoria, los 16 feriados y una previsualización remota de cinco horas que excluye el 8 de octubre. También se revisaron en el dominio publicado las cuatro vistas, detalles, filtros, previsualización y presentación móvil, usando una sesión simulada exclusivamente en el navegador de prueba. La verificación no guardó eventos ni creó calendarios de grupos-módulos.

```powershell
node scripts/verify-calendario-remote.mjs --http --hosting
```
