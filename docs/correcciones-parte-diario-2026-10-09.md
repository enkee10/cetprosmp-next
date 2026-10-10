# Correcciones de Parte Diario — 9 de octubre de 2026

Publicadas en https://cetprosmp.edu.pe/parte-diario.

- Una fila por grupo-módulo y jornada; las actividades del día se conservan y se resaltan en las opciones del modal.
- Tabla de consulta, edición exclusivamente desde el modal.
- Romelio Figueroa: programación reconstruida con el perfil de lunes a viernes.
- Richard Ramos: grupo-módulo 157 vinculado al módulo 32, Confección de Muebles en Melamina, y grupo 167 al paquete 45 correspondiente.
- María Saavedra: sin viernes activos, 150 horas curriculares y 90 horas de EFSRT.
- Enrique Palomino: martes y jueves, 210 horas curriculares y 6 de PPP. La reducción fue expresamente solicitada por el usuario.

Se actualizaron solo las filas necesarias de grupos, grupo_modulos, grupo_modulo_actividades, grupo_modulo_unidades_didacticas, grupo_modulo_jornadas, eventos y evento_relaciones. No se agregaron tablas ni campos al esquema. Los tres partes existentes conservan todos sus campos; la jornada antigua de María del viernes se conserva para su parte histórico, con el evento cancelado. Las matrículas, los demás docentes y los datos globales del sílabo no se reemplazaron.

Respaldos y comprobaciones locales: tmp/parte-fixes-20261009. Se publicaron diez funciones y Hosting con una compilación aislada en tmp/parte-fixes-release-20261009, conservando los emuladores y el servidor local.

Validación: TypeScript de frontend y Functions, ESLint, consolidación de filas, cobertura por jornada sin inventar avance de actividades, presupuestos de horas y conservación de los datos existentes. Las funciones publicadas están activas y sus archivos coinciden con la compilación. Las páginas responden correctamente y los endpoints siguen exigiendo autenticación. Prueba de tablet con los archivos publicados: tabla sin controles de edición, modal editable y actividades de la jornada en negrita con sus fechas. La prueba usa autenticación y guardado simulados, con lecturas reales de remoto, sin escrituras de prueba.
