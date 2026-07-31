import { https } from "firebase-functions/v1";
import { dataConnect, getRoleById } from "./dataConnectCore.js";
import { isBlockedIntranetRole, isSuperAdminEmail } from "./authCore.js";
import { DataConnectRole } from "./types.js";

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
  { id: "certificados-titulos", title: "Certificados y Titulos", section: "Reportes" },
  { id: "post", title: "Publicaciones", section: "Mantenimiento" },
  { id: "settings", title: "Settings", section: "Mantenimiento" },
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

const GET_REQUESTER_ROLE_QUERY = `
  query GetRequesterRoleForPermissionManual($documentId: String!) {
    users(where: { documentId: { eq: $documentId } }, limit: 1) {
      rolId
      rol {
        titulo
        scala
      }
    }
  }
`;

export function isSuperUserContext(context: https.CallableContext) {
  const token = context.auth?.token;
  const level = Number(token?.level ?? 0);
  const roleId = Number(token?.roleId ?? token?.role ?? 0);
  const email = typeof token?.email === "string" ? token.email : null;
  return level >= SUPERUSER_LEVEL || roleId >= SUPERUSER_LEVEL || isSuperAdminEmail(email);
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

  let roleId = getRequesterRoleId(context);
  let role: DataConnectRole | { titulo?: string | null; scala?: number | null } | null = null;
  const uid = context.auth?.uid;
  if (uid) {
    try {
      const requesterResponse = await dataConnect.executeGraphql<
        { users: Array<{ rolId?: number | null; rol?: { titulo?: string | null; scala?: number | null } | null }> },
        { documentId: string }
      >(
        GET_REQUESTER_ROLE_QUERY,
        { variables: { documentId: uid } },
      );
      const requester = requesterResponse.data.users?.[0] ?? null;
      if (requester?.rolId) roleId = requester.rolId;
      role = requester?.rol ?? null;
      if (Number(role?.scala ?? 0) >= SUPERUSER_LEVEL) return true;
    } catch (error) {
      console.warn("No se pudo resolver el rol real para permisos; se usaran claims.", error);
    }
  }

  if (roleId <= 0) return false;

  role = role ?? await getRoleById(roleId);
  if (!role || isBlockedIntranetRole(roleId, role.titulo)) return false;

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
