import { https } from "firebase-functions/v1";
import {
  buildSectorDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { DataConnectSector, DataConnectSectorInput } from "../core/types.js";
import {
  DELETE_SECTOR_MUTATION,
  INSERT_SECTOR_MUTATION,
  UPDATE_SECTOR_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_SECTORS_QUERY = `
  query ListSectorsManual {
    sectors(limit: 500) {
      id
      titulo
      descripcion
    }
  }
`;

const GET_SECTOR_QUERY = `
  query GetSectorManual($id: Int!) {
    sector(id: $id) {
      id
      titulo
      descripcion
    }
  }
`;

export const listSectors = https.onCall(async (_data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to list sectors.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ sectors: DataConnectSector[] }, Record<string, never>>(
      LIST_SECTORS_QUERY,
    );
    const sectors = (response.data.sectors ?? [])
      .slice()
      .sort((a, b) => String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es"));

    return { sectors };
  } catch (error) {
    console.error("Error in listSectors:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing sectors.");
  }
});

export const getSector = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to get sectors.");
  }

  const sectorId = toNumber(data?.id, -1);
  if (sectorId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ sector: DataConnectSector | null }, { id: number }>(
      GET_SECTOR_QUERY,
      { variables: { id: sectorId } },
    );

    return { sector: response.data.sector ?? null };
  } catch (error) {
    console.error("Error in getSector:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting sector.");
  }
});

export const createOrUpdateSector = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to mutate sectors.");
  }

  const payload = buildSectorDataFromInput(data as Record<string, unknown>);
  if (!payload.titulo) {
    throw new https.HttpsError("invalid-argument", "titulo is required.");
  }

  const sectorId = toNumberOrNull(data?.id);

  try {
    if (sectorId) {
      const updated = await dataConnect.executeGraphql<
        { sector_update: unknown },
        { id: number; data: DataConnectSectorInput }
      >(
        UPDATE_SECTOR_MUTATION,
        { variables: { id: sectorId, data: payload } },
      );

      return { id: getIdFromKeyOutput(updated.data.sector_update) ?? sectorId };
    }

    const created = await dataConnect.executeGraphql<
      { sector_insert: unknown },
      { data: DataConnectSectorInput }
    >(
      INSERT_SECTOR_MUTATION,
      { variables: { data: payload } },
    );

    return { id: getIdFromKeyOutput(created.data.sector_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateSector:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving sector.");
  }
});

export const deleteSector = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to delete sectors.");
  }

  const sectorId = toNumber(data?.id, -1);
  if (sectorId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ sector_delete: unknown }, { id: number }>(
      DELETE_SECTOR_MUTATION,
      { variables: { id: sectorId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.sector_delete) ?? sectorId };
  } catch (error) {
    console.error("Error in deleteSector:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting sector.");
  }
});
