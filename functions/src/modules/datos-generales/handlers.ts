import { https } from "firebase-functions/v1";
import { buildDatoGeneralDataFromInput } from "../core/userMappers.js";
import { DataConnectDatoGeneralInput } from "../core/types.js";
import {
  DATO_GENERAL_SINGLETON_ID,
  getDatosGeneralesGlobales as fetchDatosGeneralesGlobales,
  saveDatosGeneralesGlobales,
} from "./service.js";

function requireLevel(context: https.CallableContext, action: string) {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", `You do not have permission to ${action}.`);
  }
}

export const getDatosGeneralesGlobales = https.onCall(async () => {
  try {
    const datoGeneral = await fetchDatosGeneralesGlobales();
    return { datoGeneral, datosGenerales: datoGeneral };
  } catch (error) {
    console.error("Error in getDatosGeneralesGlobales:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting global general data.");
  }
});

export const listDatosGenerales = https.onCall(async (_data, context) => {
  requireLevel(context, "list general data");

  try {
    const datoGeneral = await fetchDatosGeneralesGlobales();
    return { datosGenerales: [datoGeneral], datoGeneral };
  } catch (error) {
    console.error("Error in listDatosGenerales:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing general data.");
  }
});

export const getDatoGeneral = https.onCall(async (_data, context) => {
  requireLevel(context, "get general data");

  try {
    const datoGeneral = await fetchDatosGeneralesGlobales();
    return { datoGeneral };
  } catch (error) {
    console.error("Error in getDatoGeneral:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting general data.");
  }
});

export const createOrUpdateDatoGeneral = https.onCall(async (data, context) => {
  requireLevel(context, "mutate general data");

  const payload = buildDatoGeneralDataFromInput(data as Record<string, unknown>) as DataConnectDatoGeneralInput;
  if (!payload.nombreInstitucion) {
    throw new https.HttpsError("invalid-argument", "nombreInstitucion is required.");
  }

  try {
    const datoGeneral = await saveDatosGeneralesGlobales(payload);
    return { id: DATO_GENERAL_SINGLETON_ID, datoGeneral };
  } catch (error) {
    console.error("Error in createOrUpdateDatoGeneral:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving general data.");
  }
});

export const deleteDatoGeneral = https.onCall(async (_data, context) => {
  requireLevel(context, "delete general data");
  throw new https.HttpsError(
    "failed-precondition",
    "Datos Generales is a singleton and cannot be deleted.",
  );
});
