import { initializeApp, getApps, App } from "firebase-admin/app";
import { getDataConnect } from "firebase-admin/data-connect";
import {
  connectorConfig,
  getRoleById as dcGetRoleById,
  getUserByDocumentId as dcGetUserByDocumentId,
} from "@dataconnect/admin-generated";
import {
  DELETE_USER_BY_DOCUMENT_ID_MUTATION,
  INSERT_USER_MUTATION,
  UPDATE_USER_MUTATION,
} from "../../dataconnectOperations.js";
import { DataConnectRole, DataConnectUserInput } from "./types.js";
import { getIdFromKeyOutput } from "./userMappers.js";

let app: App;
if (!getApps().length) {
  app = initializeApp();
} else {
  app = getApps()[0];
}

export const dataConnect = getDataConnect(connectorConfig, app);

export async function findDataConnectUserIdByDocumentId(documentId: string): Promise<number | null> {
  const response = await dcGetUserByDocumentId(dataConnect, { documentId });
  return response.data.users?.[0]?.id ?? null;
}

export async function waitForDataConnectUserIdByDocumentId(
  documentId: string,
  attempts = 20,
  delayMs = 150,
): Promise<number | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const userId = await findDataConnectUserIdByDocumentId(documentId);
    if (userId) return userId;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}

export async function getRoleById(roleId: number): Promise<DataConnectRole | null> {
  const response = await dcGetRoleById(dataConnect, { id: roleId });
  return response.data.role ?? null;
}

export async function upsertDataConnectUserByDocumentId(documentId: string, data: DataConnectUserInput): Promise<number> {
  const existingId = await findDataConnectUserIdByDocumentId(documentId);
  if (existingId) {
    const updated = await dataConnect.executeGraphql<{ user_update: unknown }, { id: number; data: DataConnectUserInput }>(
      UPDATE_USER_MUTATION,
      { variables: { id: existingId, data } },
    );
    if (!updated.data.user_update) {
      throw new Error(`No se pudo actualizar el usuario Data Connect con id ${existingId}.`);
    }
    return getIdFromKeyOutput(updated.data.user_update) ?? existingId;
  }

  const created = await dataConnect.executeGraphql<{ user_insert: unknown }, { data: DataConnectUserInput }>(
    INSERT_USER_MUTATION,
    { variables: { data: { ...data, documentId } } },
  );
  const createdId = getIdFromKeyOutput(created.data.user_insert);
  if (!createdId) throw new Error("No se pudo crear el usuario en Data Connect.");
  return createdId;
}

export async function insertDataConnectUserByDocumentId(documentId: string, data: DataConnectUserInput): Promise<number | null> {
  try {
    const created = await dataConnect.executeGraphql<{ user_insert: unknown }, { data: DataConnectUserInput }>(
      INSERT_USER_MUTATION,
      { variables: { data: { ...data, documentId } } },
    );
    const createdId = getIdFromKeyOutput(created.data.user_insert);
    if (!createdId) throw new Error("No se pudo crear el usuario en Data Connect.");
    return createdId;
  } catch (error: unknown) {
    const message = String((error as { message?: string } | null)?.message || "").toLowerCase();
    const isDuplicate =
      message.includes("unique")
      || message.includes("duplicate key")
      || message.includes("already exists");
    if (isDuplicate) return null;
    throw error;
  }
}

export async function deleteDataConnectUserByDocumentId(documentId: string): Promise<number> {
  const deleted = await dataConnect.executeGraphql<{ user_deleteMany: number }, { documentId: string }>(
    DELETE_USER_BY_DOCUMENT_ID_MUTATION,
    { variables: { documentId } },
  );
  return deleted.data.user_deleteMany ?? 0;
}
