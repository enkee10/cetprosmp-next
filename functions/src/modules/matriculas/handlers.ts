import { https } from "firebase-functions/v1";
import {
  buildMatriculaDataFromInput,
  buildModuloEstudianteDataFromInput,
  getIdFromKeyOutput,
  toNumber,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import {
  DataConnectMatriculaInput,
  DataConnectModuloEstudianteInput,
  DataConnectPaquete,
  DataConnectPaqueteModulo,
} from "../core/types.js";
import {
  DELETE_MATRICULA_MUTATION,
  DELETE_MODULO_ESTUDIANTES_BY_MATRICULA_MUTATION,
  INSERT_MATRICULA_MUTATION,
  INSERT_MODULO_ESTUDIANTE_MUTATION,
} from "../../dataconnectOperations.js";

const GET_PAQUETE_MODULOS_FOR_MATRICULA_QUERY = `
  query GetPaqueteModulosForMatricula($paqueteId: Int!) {
    paquete(id: $paqueteId) {
      id
      archivado
    }
    paqueteModulos(where: { paqueteId: { eq: $paqueteId } }, limit: 10) {
      id
      orden
      obligatorio
      paqueteId
      moduloId
    }
  }
`;

function requireLevel(context: https.CallableContext, action: string) {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", `You do not have permission to ${action}.`);
  }
}

const sortPaqueteModulos = (items: DataConnectPaqueteModulo[]) =>
  items
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId);

async function cleanupMatricula(matriculaId: number) {
  try {
    await dataConnect.executeGraphql<
      { moduloEstudiante_deleteMany: number },
      { matriculaId: number }
    >(DELETE_MODULO_ESTUDIANTES_BY_MATRICULA_MUTATION, { variables: { matriculaId } });
    await dataConnect.executeGraphql<{ matricula_delete: unknown }, { id: number }>(
      DELETE_MATRICULA_MUTATION,
      { variables: { id: matriculaId } },
    );
  } catch (error) {
    console.error("Error cleaning up failed matricula:", error);
  }
}

export const createMatriculaDesdePaquete = https.onCall(async (data, context) => {
  requireLevel(context, "create matriculas");

  const userId = toNumber(data?.userId, -1);
  const paqueteId = toNumber(data?.paqueteId, -1);
  if (userId <= 0) {
    throw new https.HttpsError("invalid-argument", "userId is required.");
  }
  if (paqueteId <= 0) {
    throw new https.HttpsError("invalid-argument", "paqueteId is required.");
  }

  let matriculaId: number | null = null;

  try {
    const paqueteResponse = await dataConnect.executeGraphql<{
      paquete: DataConnectPaquete | null;
      paqueteModulos: DataConnectPaqueteModulo[];
    }, { paqueteId: number }>(GET_PAQUETE_MODULOS_FOR_MATRICULA_QUERY, { variables: { paqueteId } });

    if (!paqueteResponse.data.paquete) {
      throw new https.HttpsError("not-found", "El paquete seleccionado no existe.");
    }
    if (paqueteResponse.data.paquete.archivado) {
      throw new https.HttpsError("failed-precondition", "El paquete seleccionado esta archivado.");
    }

    const paqueteModulos = sortPaqueteModulos(paqueteResponse.data.paqueteModulos ?? []);
    if (paqueteModulos.length < 1 || paqueteModulos.length > 3) {
      throw new https.HttpsError(
        "failed-precondition",
        "El paquete debe tener entre 1 y 3 modulos antes de matricular.",
      );
    }

    const matriculaPayload = buildMatriculaDataFromInput({
      ...(data as Record<string, unknown>),
      userId,
      paqueteId,
      fecha: data?.fecha ?? new Date().toISOString(),
      archivado: data?.archivado ?? false,
    });

    const created = await dataConnect.executeGraphql<
      { matricula_insert: unknown },
      { data: DataConnectMatriculaInput }
    >(INSERT_MATRICULA_MUTATION, { variables: { data: matriculaPayload } });

    matriculaId = getIdFromKeyOutput(created.data.matricula_insert);
    if (!matriculaId) {
      throw new Error("No se pudo obtener el id de la matricula guardada.");
    }

    await Promise.all(
      paqueteModulos.map((paqueteModulo) => {
        const moduloEstudiante = buildModuloEstudianteDataFromInput({
          matriculaId,
          moduloId: paqueteModulo.moduloId,
          promedio: null,
        });
        return dataConnect.executeGraphql<
          { moduloEstudiante_insert: unknown },
          { data: DataConnectModuloEstudianteInput }
        >(INSERT_MODULO_ESTUDIANTE_MUTATION, { variables: { data: moduloEstudiante } });
      }),
    );

    return {
      id: matriculaId,
      paqueteId,
      userId,
      moduloIds: paqueteModulos.map((item) => item.moduloId),
    };
  } catch (error) {
    if (matriculaId) {
      await cleanupMatricula(matriculaId);
    }
    if (error instanceof https.HttpsError) {
      throw error;
    }
    console.error("Error in createMatriculaDesdePaquete:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while creating matricula.");
  }
});
