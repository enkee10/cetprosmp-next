import { https } from "firebase-functions/v1";
import { dataConnect } from "./dataConnectCore.js";

export type PermissionAction = "view" | "create" | "edit" | "delete";

export interface PermissionEntity {
  id: string;
  title: string;
  section: string;
}

export const SUPERUSER_LEVEL = 600;

export const PERMISSION_ENTITIES: PermissionEntity[] = [
  { id: "sectores", title: "Sectores", section: "Entidades" },
  { id: "datos-generales", title: "Datos Generales", section: "Entidades" },
  { id: "familias", title: "Familias", section: "Entidades" },
  { id: "act-economicas", title: "Actividades Economicas", section: "Entidades" },
  { id: "especialidades", title: "Especialidades", section: "Entidades" },
  { id: "carreras", title: "Carreras", section: "Entidades" },
  { id: "planes", title: "Planes", section: "Entidades" },
  { id: "modulos", title: "Modulos", section: "Entidades" },
  { id: "paquetes", title: "Paquetes", section: "Entidades" },
  { id: "grupos", title: "Grupos", section: "Entidades" },
  { id: "grupo-modulos", title: "Grupo-Modulo", section: "Entidades" },
  { id: "personal", title: "Personal", section: "Entidades" },
  { id: "turnos", title: "Turnos", section: "Entidades" },
  { id: "horarios", title: "Horarios", section: "Entidades" },
  { id: "calendarios", title: "Calendarios", section: "Entidades" },
  { id: "eventos", title: "Eventos", section: "Entidades" },
  { id: "unidades-didacticas", title: "Unidades Didacticas", section: "Entidades" },
  { id: "capacidades-terminales", title: "Capacidades Terminales", section: "Entidades" },
  { id: "indicadores-capacidad", title: "Indicador de Capacidad", section: "Entidades" },
  { id: "aprendizajes", title: "Aprendizajes", section: "Entidades" },
  { id: "actividades", title: "Actividad", section: "Entidades" },
  { id: "anios", title: "Anos", section: "Miscelanea" },
  { id: "semestres", title: "Semestres", section: "Miscelanea" },
  { id: "tipos-carrera", title: "Tipos de Carrera", section: "Miscelanea" },
  { id: "estructura-academica", title: "Estructura Academica", section: "Registros" },
  { id: "matriculas", title: "Matriculas", section: "Registros" },
  { id: "registro-auxiliar", title: "Registro Auxiliar", section: "Registros" },
  { id: "users", title: "Users", section: "Registros" },
  { id: "roles", title: "Roles", section: "Registros" },
  { id: "documentos-reportes", title: "Actas y Nominas", section: "Reportes" },
  { id: "post", title: "Publicaciones", section: "Mantenimiento" },
];

const entityIds = new Set(PERMISSION_ENTITIES.map((entity) => entity.id));

const GET_ROLE_PERMISSION_QUERY = `
  query GetRolePermissionManual($roleId: Int!, $entity: String!) {
    rolePermissions(where: { roleId: { eq: $roleId }, entity: { eq: $entity } }, limit: 1) {
      id
      roleId
      entity
      canView
      canCreate
      canEdit
      canDelete
    }
  }
`;

export function isSuperUserContext(context: https.CallableContext) {
  return Number(context.auth?.token?.level ?? 0) >= SUPERUSER_LEVEL;
}

export function requireAuthenticated(context: https.CallableContext) {
  if (!context.auth?.uid) {
    throw new https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }
}

export function requireSuperUser(context: https.CallableContext, action = "administrar el sistema") {
  requireAuthenticated(context);
  if (!isSuperUserContext(context)) {
    throw new https.HttpsError("permission-denied", `Solo el superusuario puede ${action}.`);
  }
}

export function getRequesterRoleId(context: https.CallableContext) {
  const rawRole = context.auth?.token?.roleId ?? context.auth?.token?.role ?? null;
  const roleId = Number(rawRole);
  return Number.isFinite(roleId) ? roleId : 0;
}

function permissionFieldForAction(action: PermissionAction) {
  return {
    view: "canView",
    create: "canCreate",
    edit: "canEdit",
    delete: "canDelete",
  }[action] as "canView" | "canCreate" | "canEdit" | "canDelete";
}

export async function hasPermission(context: https.CallableContext, entity: string, action: PermissionAction) {
  requireAuthenticated(context);
  if (isSuperUserContext(context)) return true;
  if (!entityIds.has(entity)) return false;

  const roleId = getRequesterRoleId(context);
  if (roleId <= 0) return false;

  const response = await dataConnect.executeGraphql<{
    rolePermissions: Array<Record<string, unknown>>;
  }, { roleId: number; entity: string }>(
    GET_ROLE_PERMISSION_QUERY,
    { variables: { roleId, entity } },
  );

  const permission = response.data.rolePermissions?.[0] ?? null;
  return Boolean(permission?.[permissionFieldForAction(action)]);
}

export async function requirePermission(
  context: https.CallableContext,
  entity: string,
  action: PermissionAction,
) {
  if (await hasPermission(context, entity, action)) return;
  throw new https.HttpsError("permission-denied", `No tienes permiso para ${action} en ${entity}.`);
}
