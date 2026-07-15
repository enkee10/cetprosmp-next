import { https } from "firebase-functions/v1";
import { listRoles as dcListRoles } from "@dataconnect/admin-generated";
import {
  DELETE_ROLE_PERMISSIONS_BY_ROLE_MUTATION,
  INSERT_ROLE_PERMISSION_MUTATION,
} from "../../dataconnectOperations.js";
import { dataConnect, getRoleById } from "../core/dataConnectCore.js";
import { DataConnectRolePermission, DataConnectRolePermissionInput } from "../core/types.js";
import {
  getRequesterRoleId,
  isSuperUserContext,
  PERMISSION_ENTITIES,
  requireAuthenticated,
  requireSuperUser,
} from "../core/permissions.js";
import { getIdFromKeyOutput, toNumber } from "../core/userMappers.js";
import { isBlockedIntranetRole } from "../core/authCore.js";

const LIST_ROLE_PERMISSIONS_QUERY = `
  query ListRolePermissionsManual {
    rolePermissions(limit: 5000) {
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

const LIST_ROLE_PERMISSIONS_BY_ROLE_QUERY = `
  query ListRolePermissionsByRoleManual($roleId: Int!) {
    rolePermissions(where: { roleId: { eq: $roleId } }, limit: 5000) {
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

const entityIds = new Set(PERMISSION_ENTITIES.map((entity) => entity.id));

function normalizePermission(item: unknown, roleId: number): DataConnectRolePermissionInput | null {
  const raw = item as Record<string, unknown> | null;
  const entity = String(raw?.entity ?? "").trim();
  if (!entityIds.has(entity)) return null;

  return {
    roleId,
    entity,
    canView: Boolean(raw?.canView),
    canCreate: Boolean(raw?.canCreate),
    canEdit: Boolean(raw?.canEdit),
    canDelete: Boolean(raw?.canDelete),
  };
}

function isEditableRole(role: { id?: number | string | null; titulo?: string | null; scala?: number | null }) {
  const title = String(role.titulo ?? "").trim().toLowerCase();
  return Number(role.scala ?? 0) < 600
    && title !== "superusuario"
    && title !== "superadmin"
    && !isBlockedIntranetRole(role.id, role.titulo);
}

export const listPermisos = https.onCall(async (_data, context) => {
  requireSuperUser(context, "ver permisos");

  try {
    const [rolesResponse, permissionsResponse] = await Promise.all([
      dcListRoles(dataConnect),
      dataConnect.executeGraphql<{ rolePermissions: DataConnectRolePermission[] }, Record<string, never>>(
        LIST_ROLE_PERMISSIONS_QUERY,
      ),
    ]);

    const roles = (rolesResponse.data.roles ?? [])
      .filter(isEditableRole)
      .slice()
      .sort((a, b) => (a.scala ?? 0) - (b.scala ?? 0) || String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es"));

    return {
      entities: PERMISSION_ENTITIES,
      roles,
      permissions: permissionsResponse.data.rolePermissions ?? [],
    };
  } catch (error) {
    console.error("Error in listPermisos:", error);
    throw new https.HttpsError("internal", "No se pudieron listar los permisos.");
  }
});

export const listMisPermisos = https.onCall(async (_data, context) => {
  requireAuthenticated(context);

  if (isSuperUserContext(context)) {
    return {
      entities: PERMISSION_ENTITIES,
      permissions: PERMISSION_ENTITIES.map((entity) => ({
        roleId: 600,
        entity: entity.id,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      })),
    };
  }

  const roleId = getRequesterRoleId(context);
  if (roleId <= 0) {
    return { entities: PERMISSION_ENTITIES, permissions: [] };
  }

  try {
    const role = await getRoleById(roleId);
    if (!role || isBlockedIntranetRole(roleId, role.titulo)) {
      return { entities: PERMISSION_ENTITIES, permissions: [] };
    }

    const response = await dataConnect.executeGraphql<
      { rolePermissions: DataConnectRolePermission[] },
      { roleId: number }
    >(
      LIST_ROLE_PERMISSIONS_BY_ROLE_QUERY,
      { variables: { roleId } },
    );

    return {
      entities: PERMISSION_ENTITIES,
      permissions: response.data.rolePermissions ?? [],
    };
  } catch (error) {
    console.error("Error in listMisPermisos:", error);
    throw new https.HttpsError("internal", "No se pudieron listar tus permisos.");
  }
});

export const savePermisosRol = https.onCall(async (data, context) => {
  requireSuperUser(context, "guardar permisos");

  const roleId = toNumber(data?.roleId, -1);
  if (roleId <= 0) {
    throw new https.HttpsError("invalid-argument", "roleId is required.");
  }

  const role = await getRoleById(roleId);
  if (!role || !isEditableRole(role)) {
    throw new https.HttpsError("failed-precondition", "No se pueden editar permisos para este rol.");
  }

  const rawPermissions: unknown[] = Array.isArray(data?.permissions) ? data.permissions : [];
  const permissions = rawPermissions
      .map((item: unknown) => normalizePermission(item, roleId))
      .filter((item): item is DataConnectRolePermissionInput => Boolean(item))
    ;

  try {
    await dataConnect.executeGraphql<{ rolePermission_deleteMany: number }, { roleId: number }>(
      DELETE_ROLE_PERMISSIONS_BY_ROLE_MUTATION,
      { variables: { roleId } },
    );

    const inserted = await Promise.all(
      permissions.map((permission) =>
        dataConnect.executeGraphql<
          { rolePermission_insert: unknown },
          { data: DataConnectRolePermissionInput }
        >(
          INSERT_ROLE_PERMISSION_MUTATION,
          { variables: { data: permission } },
        ),
      ),
    );

    return {
      roleId,
      count: inserted.length,
      ids: inserted.map((result) => getIdFromKeyOutput(result.data.rolePermission_insert)).filter(Boolean),
    };
  } catch (error) {
    console.error("Error in savePermisosRol:", error);
    throw new https.HttpsError("internal", "No se pudieron guardar los permisos.");
  }
});
