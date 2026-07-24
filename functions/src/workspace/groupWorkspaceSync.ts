import { google, admin_directory_v1, groupssettings_v1 } from "googleapis";

const WORKSPACE_SYNC_ENABLED = String(process.env.WORKSPACE_SYNC_ENABLED || "").trim().toLowerCase() === "true";
const WORKSPACE_SUBJECT_EMAIL = String(process.env.WORKSPACE_SUBJECT_EMAIL || "").trim();
const WORKSPACE_PRIMARY_DOMAIN = String(process.env.WORKSPACE_PRIMARY_DOMAIN || "").trim();

type WorkspaceGroupClients = {
  directory: admin_directory_v1.Admin;
  groupsSettings: groupssettings_v1.Groupssettings;
};

type WorkspaceErrorMeta = {
  status: number;
  reason: string;
  message: string;
};

export class WorkspaceSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceSyncError";
  }
}

export type GrupoWorkspaceSyncInput = {
  email: string;
  previousEmail?: string | null;
  name: string;
  description: string;
  ownerEmail: string;
  managerEmails: string[];
};

export function isWorkspaceGroupSyncEnabled() {
  return WORKSPACE_SYNC_ENABLED;
}

function normalizeEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function getWorkspaceErrorMeta(error: unknown): WorkspaceErrorMeta {
  const err = error as {
    code?: number | string;
    status?: number | string;
    message?: string;
    errors?: unknown;
    response?: { status?: number | string; data?: unknown };
  } | null;

  const status =
    Number(err?.code)
    || Number(err?.status)
    || Number(err?.response?.status)
    || 0;

  const message = String(err?.message || "");
  const reason = JSON.stringify({
    message,
    errors: err?.errors || "",
    responseData: err?.response?.data || "",
  }).toLowerCase();

  return { status, reason, message };
}

function isNotFound(error: unknown) {
  const { status, reason } = getWorkspaceErrorMeta(error);
  return status === 404 || reason.includes("not found") || reason.includes("notfound");
}

function isAlreadyExists(error: unknown) {
  const { status, reason } = getWorkspaceErrorMeta(error);
  return (
    status === 409
    || reason.includes("already exists")
    || reason.includes("duplicate")
    || reason.includes("member already exists")
  );
}

const sleep = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

function getWorkspaceGroupClients(): WorkspaceGroupClients {
  if (!WORKSPACE_SUBJECT_EMAIL || !WORKSPACE_PRIMARY_DOMAIN) {
    throw new Error("Faltan variables WORKSPACE_SUBJECT_EMAIL o WORKSPACE_PRIMARY_DOMAIN para sincronizar grupos Workspace.");
  }

  const clientEmail = String(process.env.GOOGLE_CLIENT_EMAIL || "").trim();
  const privateKey = String(process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new Error("Faltan credenciales para Workspace: GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY.");
  }

  const jwtClient = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/admin.directory.group",
      "https://www.googleapis.com/auth/admin.directory.group.member",
      "https://www.googleapis.com/auth/apps.groups.settings",
    ],
    subject: WORKSPACE_SUBJECT_EMAIL,
  });

  return {
    directory: google.admin({ version: "directory_v1", auth: jwtClient }),
    groupsSettings: google.groupssettings({ version: "v1", auth: jwtClient }),
  };
}

function toWorkspaceSyncError(error: unknown) {
  const { status, reason, message } = getWorkspaceErrorMeta(error);

  if (reason.includes("groups settings api") || reason.includes("groupssettings.googleapis.com")) {
    return new WorkspaceSyncError(
      "No se pudo sincronizar Workspace: la Groups Settings API está desactivada en el proyecto de Google Cloud. Actívala y vuelve a intentar.",
    );
  }

  if (reason.includes("admin.directory") && reason.includes("disabled")) {
    return new WorkspaceSyncError(
      "No se pudo sincronizar Workspace: la Admin SDK API está desactivada en el proyecto de Google Cloud. Actívala y vuelve a intentar.",
    );
  }

  if (status === 403) {
    return new WorkspaceSyncError(
      "No se pudo sincronizar Workspace: Google rechazó la operación por permisos. Revisa la delegación de dominio, los scopes y el usuario administrador configurado.",
    );
  }

  if (message) {
    return new WorkspaceSyncError(`No se pudo sincronizar Workspace: ${message}`);
  }

  return new WorkspaceSyncError("No se pudo sincronizar Workspace por un error desconocido de Google.");
}

async function upsertWorkspaceGroup(
  directory: admin_directory_v1.Admin,
  input: Pick<GrupoWorkspaceSyncInput, "email" | "previousEmail" | "name" | "description">,
) {
  const email = normalizeEmail(input.email);
  const previousEmail = normalizeEmail(input.previousEmail);
  const groupKey = previousEmail || email;
  const requestBody: admin_directory_v1.Schema$Group = {
    email,
    name: input.name,
    description: input.description,
  };

  if (previousEmail) {
    try {
      await directory.groups.patch({ groupKey, requestBody });
      return;
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }

  try {
    await directory.groups.insert({ requestBody });
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    await directory.groups.patch({ groupKey: email, requestBody });
  }
}

async function upsertWorkspaceMemberRole(
  directory: admin_directory_v1.Admin,
  groupEmail: string,
  memberEmail: string,
  role: "OWNER" | "MANAGER" | "MEMBER",
) {
  const normalizedGroupEmail = normalizeEmail(groupEmail);
  const normalizedMemberEmail = normalizeEmail(memberEmail);
  if (!normalizedGroupEmail || !normalizedMemberEmail) return;

  try {
    await directory.members.insert({
      groupKey: normalizedGroupEmail,
      requestBody: {
        email: normalizedMemberEmail,
        role,
      },
    });
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    await directory.members.update({
      groupKey: normalizedGroupEmail,
      memberKey: normalizedMemberEmail,
      requestBody: {
        email: normalizedMemberEmail,
        role,
      },
    });
  }
}

async function applyWorkspaceGroupSettings(groupsSettings: groupssettings_v1.Groupssettings, groupEmail: string) {
  const groupUniqueId = normalizeEmail(groupEmail);
  const requestBody = {
    whoCanContactOwner: "ALL_MEMBERS_CAN_CONTACT",
    whoCanViewGroup: "ALL_MEMBERS_CAN_VIEW",
    whoCanPostMessage: "ALL_MEMBERS_CAN_POST",
    whoCanViewMembership: "ALL_MEMBERS_CAN_VIEW",
    whoCanModifyMembers: "OWNERS_AND_MANAGERS",
    whoCanModerateMembers: "OWNERS_AND_MANAGERS",
    whoCanJoin: "INVITED_CAN_JOIN",
  };
  let lastError: unknown = null;

  for (const delay of [0, 1200, 2400]) {
    if (delay > 0) await sleep(delay);
    try {
      await groupsSettings.groups.patch({ groupUniqueId, requestBody });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function syncGrupoToWorkspace(input: GrupoWorkspaceSyncInput) {
  if (!WORKSPACE_SYNC_ENABLED) return { skipped: true, synced: false };

  const email = normalizeEmail(input.email);
  const ownerEmail = normalizeEmail(input.ownerEmail);
  const managerEmails = Array.from(new Set(input.managerEmails.map(normalizeEmail).filter(Boolean)))
    .filter((emailItem) => emailItem !== ownerEmail);

  if (!email) throw new Error("Falta el correo Workspace del grupo.");
  if (!input.name?.trim()) throw new Error("Falta el nombre Workspace del grupo.");
  if (!ownerEmail) throw new Error("Falta el correo institucional del propietario del grupo Workspace.");
  if (managerEmails.length === 0) {
    throw new Error("Falta el correo institucional de al menos un coordinador para administrar el grupo Workspace.");
  }

  try {
    const { directory, groupsSettings } = getWorkspaceGroupClients();

    await upsertWorkspaceGroup(directory, {
      email,
      previousEmail: input.previousEmail,
      name: input.name,
      description: input.description,
    });
    await applyWorkspaceGroupSettings(groupsSettings, email);
    await upsertWorkspaceMemberRole(directory, email, ownerEmail, "OWNER");
    await Promise.all(
      managerEmails.map((managerEmail) => upsertWorkspaceMemberRole(directory, email, managerEmail, "MANAGER")),
    );
  } catch (error) {
    if (error instanceof WorkspaceSyncError) throw error;
    throw toWorkspaceSyncError(error);
  }

  return { skipped: false, synced: true };
}

export async function addWorkspaceGroupMember(groupEmail: string | null | undefined, memberEmail: string | null | undefined) {
  if (!WORKSPACE_SYNC_ENABLED) return { skipped: true, synced: false };

  const normalizedGroupEmail = normalizeEmail(groupEmail);
  const normalizedMemberEmail = normalizeEmail(memberEmail);
  if (!normalizedGroupEmail) {
    throw new WorkspaceSyncError("No se pudo agregar el estudiante al grupo Workspace: falta el correo Workspace del grupo.");
  }
  if (!normalizedMemberEmail) {
    throw new WorkspaceSyncError("No se pudo agregar el estudiante al grupo Workspace: falta el correo Workspace del estudiante.");
  }

  try {
    const { directory } = getWorkspaceGroupClients();
    await upsertWorkspaceMemberRole(directory, normalizedGroupEmail, normalizedMemberEmail, "MEMBER");
  } catch (error) {
    if (error instanceof WorkspaceSyncError) throw error;
    throw toWorkspaceSyncError(error);
  }

  return { skipped: false, synced: true };
}

export async function removeWorkspaceGroupMember(
  groupEmail: string | null | undefined,
  memberEmail: string | null | undefined,
) {
  if (!WORKSPACE_SYNC_ENABLED) return { skipped: true, synced: false };

  const normalizedGroupEmail = normalizeEmail(groupEmail);
  const normalizedMemberEmail = normalizeEmail(memberEmail);
  if (!normalizedGroupEmail || !normalizedMemberEmail) {
    return { skipped: true, synced: false };
  }

  try {
    const { directory } = getWorkspaceGroupClients();
    await directory.members.delete({
      groupKey: normalizedGroupEmail,
      memberKey: normalizedMemberEmail,
    });
  } catch (error) {
    if (isNotFound(error)) return { skipped: false, synced: true };
    throw toWorkspaceSyncError(error);
  }

  return { skipped: false, synced: true };
}

export async function deleteWorkspaceGroup(groupEmail: string | null | undefined) {
  if (!WORKSPACE_SYNC_ENABLED) return { skipped: true, synced: false };

  const normalizedGroupEmail = normalizeEmail(groupEmail);
  if (!normalizedGroupEmail) return { skipped: true, synced: false };

  try {
    const { directory } = getWorkspaceGroupClients();
    await directory.groups.delete({ groupKey: normalizedGroupEmail });
  } catch (error) {
    if (isNotFound(error)) return { skipped: false, synced: true };
    throw toWorkspaceSyncError(error);
  }

  return { skipped: false, synced: true };
}
