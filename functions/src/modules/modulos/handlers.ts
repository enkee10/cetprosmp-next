import { https } from "firebase-functions/v1";
import {
  buildModuloDataFromInput,
  buildPaqueteDataFromInput,
  buildPaqueteModuloDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import {
  DataConnectModulo,
  DataConnectModuloInput,
  DataConnectPaqueteInput,
  DataConnectPaqueteModulo,
  DataConnectPaqueteModuloInput,
} from "../core/types.js";
import {
  DELETE_MODULO_MUTATION,
  DELETE_PAQUETE_MUTATION,
  INSERT_PAQUETE_MODULO_MUTATION,
  INSERT_PAQUETE_MUTATION,
  INSERT_MODULO_MUTATION,
  UPDATE_MODULO_MUTATION,
  UPDATE_PAQUETE_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_MODULOS_QUERY = `
  query ListModulosManual {
    modulos(limit: 500) {
      id
      titulo
      tituloComercial
      orden
      descripcion
      horas
      creditos
      metas
      activo
      slug
      plan {
        planEstudio
      }
      planId
    }
  }
`;

const GET_MODULO_QUERY = `
  query GetModuloManual($id: Int!) {
    modulo(id: $id) {
      id
      titulo
      tituloComercial
      orden
      descripcion
      horas
      creditos
      metas
      activo
      slug
      plan {
        planEstudio
      }
      planId
    }
  }
`;

const GET_SINGLE_MODULE_PAQUETE_QUERY = `
  query GetSingleModulePaqueteForModulo($moduloId: Int!) {
    paqueteModulos(where: { moduloId: { eq: $moduloId } }, limit: 20) {
      id
      orden
      obligatorio
      paqueteId
      moduloId
    }
  }
`;

const GET_PAQUETES_BY_MODULO_QUERY = `
  query GetPaquetesByModulo($moduloId: Int!) {
    paqueteModulos(where: { moduloId: { eq: $moduloId } }, limit: 50) {
      paqueteId
    }
  }
`;

const GET_PAQUETE_MODULOS_WITH_MODULOS_QUERY = `
  query GetPaqueteModulosWithModulos($paqueteId: Int!) {
    paqueteModulos(where: { paqueteId: { eq: $paqueteId } }, limit: 10) {
      id
      orden
      obligatorio
      paqueteId
      moduloId
      modulo {
        titulo
        tituloComercial
      }
    }
  }
`;

const getModuloLabel = (moduloId: number, modulo?: { titulo?: string | null; tituloComercial?: string | null } | null) =>
  modulo?.tituloComercial || modulo?.titulo || `Modulo ${moduloId}`;

const buildPaqueteTituloFromModulos = (items: DataConnectPaqueteModulo[]) =>
  items
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId)
    .map((item) => getModuloLabel(item.moduloId, item.modulo))
    .join(" / ");

async function syncPaquetesTituloForModulo(moduloId: number) {
  const affected = await dataConnect.executeGraphql<
    { paqueteModulos: Pick<DataConnectPaqueteModulo, "paqueteId">[] },
    { moduloId: number }
  >(GET_PAQUETES_BY_MODULO_QUERY, { variables: { moduloId } });

  const paqueteIds = Array.from(new Set((affected.data.paqueteModulos ?? []).map((item) => item.paqueteId)));

  await Promise.all(
    paqueteIds.map(async (paqueteId) => {
      const paqueteModulosResponse = await dataConnect.executeGraphql<
        { paqueteModulos: DataConnectPaqueteModulo[] },
        { paqueteId: number }
      >(GET_PAQUETE_MODULOS_WITH_MODULOS_QUERY, { variables: { paqueteId } });

      const paqueteModulos = paqueteModulosResponse.data.paqueteModulos ?? [];
      if (paqueteModulos.length === 0) return;

      const titulo = buildPaqueteTituloFromModulos(paqueteModulos);
      const paquetePayload = buildPaqueteDataFromInput({ titulo });

      await dataConnect.executeGraphql<
        { paquete_update: unknown },
        { id: number; data: DataConnectPaqueteInput }
      >(UPDATE_PAQUETE_MUTATION, { variables: { id: paqueteId, data: paquetePayload } });
    }),
  );
}

async function ensureSingleModulePaquete(moduloId: number, modulo: DataConnectModuloInput) {
  const existing = await dataConnect.executeGraphql<
    { paqueteModulos: DataConnectPaqueteModulo[] },
    { moduloId: number }
  >(GET_SINGLE_MODULE_PAQUETE_QUERY, { variables: { moduloId } });

  const existingSingleModulePaquete = await Promise.all(
    (existing.data.paqueteModulos ?? []).map(async (item) => {
      const response = await dataConnect.executeGraphql<
        { paqueteModulos: DataConnectPaqueteModulo[] },
        { paqueteId: number }
      >(
        `
          query CountPaqueteModulosForModuloPaquete($paqueteId: Int!) {
            paqueteModulos(where: { paqueteId: { eq: $paqueteId } }, limit: 4) {
              id
              orden
              obligatorio
              paqueteId
              moduloId
            }
          }
        `,
        { variables: { paqueteId: item.paqueteId } },
      );
      return response.data.paqueteModulos?.length === 1 ? item : null;
    }),
  );

  const alreadyLinked = existingSingleModulePaquete.find(
    (item): item is DataConnectPaqueteModulo => Boolean(item),
  );
  if (alreadyLinked) {
    return alreadyLinked.paqueteId;
  }

  const titulo = modulo.tituloComercial || modulo.titulo || `Modulo ${moduloId}`;
  const paquetePayload = buildPaqueteDataFromInput({
    titulo,
    descripcion: `Paquete individual generado para el modulo ${modulo.titulo || titulo}`,
    archivado: false,
  });

  const createdPaquete = await dataConnect.executeGraphql<
    { paquete_insert: unknown },
    { data: DataConnectPaqueteInput }
  >(INSERT_PAQUETE_MUTATION, { variables: { data: paquetePayload } });
  const paqueteId = getIdFromKeyOutput(createdPaquete.data.paquete_insert);

  if (!paqueteId) {
    throw new Error("No se pudo obtener el id del paquete individual.");
  }

  const paqueteModuloPayload = buildPaqueteModuloDataFromInput({
    paqueteId,
    moduloId,
    orden: 1,
    obligatorio: true,
  });

  try {
    await dataConnect.executeGraphql<
      { paqueteModulo_insert: unknown },
      { data: DataConnectPaqueteModuloInput }
    >(INSERT_PAQUETE_MODULO_MUTATION, { variables: { data: paqueteModuloPayload } });
  } catch (error) {
    await dataConnect.executeGraphql<{ paquete_delete: unknown }, { id: number }>(
      DELETE_PAQUETE_MUTATION,
      { variables: { id: paqueteId } },
    );
    throw error;
  }

  return paqueteId;
}

export const listModulos = https.onCall(async (_data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to list modules.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ modulos: DataConnectModulo[] }, Record<string, never>>(
      LIST_MODULOS_QUERY,
    );
    const modulos = (response.data.modulos ?? [])
      .slice()
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es"));

    return { modulos };
  } catch (error) {
    console.error("Error in listModulos:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing modules.");
  }
});

export const getModulo = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to get modules.");
  }

  const moduloId = toNumber(data?.id, -1);
  if (moduloId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ modulo: DataConnectModulo | null }, { id: number }>(
      GET_MODULO_QUERY,
      { variables: { id: moduloId } },
    );

    return { modulo: response.data.modulo ?? null };
  } catch (error) {
    console.error("Error in getModulo:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting module.");
  }
});

export const createOrUpdateModulo = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to mutate modules.");
  }

  const payload = buildModuloDataFromInput(data as Record<string, unknown>);
  if (!payload.titulo) {
    throw new https.HttpsError("invalid-argument", "titulo is required.");
  }

  const moduloId = toNumberOrNull(data?.id);

  try {
    if (moduloId) {
      const updated = await dataConnect.executeGraphql<
        { modulo_update: unknown },
        { id: number; data: DataConnectModuloInput }
      >(
        UPDATE_MODULO_MUTATION,
        { variables: { id: moduloId, data: payload } },
      );
      await syncPaquetesTituloForModulo(moduloId);

      return { id: getIdFromKeyOutput(updated.data.modulo_update) ?? moduloId };
    }

    const created = await dataConnect.executeGraphql<
      { modulo_insert: unknown },
      { data: DataConnectModuloInput }
    >(
      INSERT_MODULO_MUTATION,
      { variables: { data: payload } },
    );

    const createdModuloId = getIdFromKeyOutput(created.data.modulo_insert);
    if (!createdModuloId) {
      throw new Error("No se pudo obtener el id del modulo creado.");
    }

    let paqueteId: number;
    try {
      paqueteId = await ensureSingleModulePaquete(createdModuloId, payload);
      await syncPaquetesTituloForModulo(createdModuloId);
    } catch (error) {
      await dataConnect.executeGraphql<{ modulo_delete: unknown }, { id: number }>(
        DELETE_MODULO_MUTATION,
        { variables: { id: createdModuloId } },
      );
      throw error;
    }

    return { id: createdModuloId, paqueteId };
  } catch (error) {
    console.error("Error in createOrUpdateModulo:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving module.");
  }
});

export const deleteModulo = https.onCall(async (data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to delete modules.");
  }

  const moduloId = toNumber(data?.id, -1);
  if (moduloId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ modulo_delete: unknown }, { id: number }>(
      DELETE_MODULO_MUTATION,
      { variables: { id: moduloId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.modulo_delete) ?? moduloId };
  } catch (error) {
    console.error("Error in deleteModulo:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting module.");
  }
});
