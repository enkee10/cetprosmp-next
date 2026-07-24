# Contexto general del proyecto

## comportamiento CODEX
 - nunca hacer nada que no se te pida explicitamente, sin embargo puedes sugerirlo.
 - Al hacer deploy cuando es function darle timeout de 180 para que no falle, cuando es hosting  darle timeout largo porque usa firebase hosting con next de framework

## Estado actual
- Estoy desarrollando el sistema CETPRO con Next.js, Firebase, MUI y GitHub y conectado a workspace de google.
- Como se usa los emuladores de firebase, cualquier consulta sobre estos emuladores y servicios firebase, revisar la documentacion especial para IA en: ./.agents
- Existe una carpeta de conversaciones pasadas en: ./docs/codex/conversaciones Lee la conversacion o conversaciones especificas solo si asi se te pide en la conversacion actual, para darte mayor contexto, si no se te pide no leerlas.
- cuando en la conversacion actual te diga "cerrar" quiero que actualices este archivo mencionando los avances que se lograron en la sección "Avances principales".

## Avances principales
- Ya se está trabajando con Firebase.
- Ya se está corrigiendo la interfaz de listas.
- Ya se está revisando la estructura SQL.
- Ya se esta usando los emuladores de firebase sin problemas.
- Se implementó sincronización de avatar entre la app y Google Workspace (crear/editar usuario).
- Se identificó requisito de permisos/scopes en Domain-Wide Delegation para grupos:
  - https://www.googleapis.com/auth/admin.directory.group.member
  - se crearon endpoints para las entidades/tablas carreras, planes, modulos, paquetes, grupos, turnos, horarios, calendarios, eventos, unidades dicaticas, capacidades terminales, indicador de Capacidad, aprendizajes, actividad, con lista y CRUD incluidos.
  - Se crearon endpoints para registro auxiliar, matricula, Estructura Academica
Se creo Sistema de Maticula con formulario
Se creo Sistema de permisos
Se creo Sistema de gestion Academica
Se creo Sistema de generacion de documentos de pdf con google run y open office
## Pendientes generales

