import { https } from "firebase-functions/v1";
import {
  buildPaqueteDataFromInput,
  buildPaqueteModuloDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import {
  DataConnectPaquete,
  DataConnectPaqueteInput,
  DataConnectPaqueteModulo,
  DataConnectPaqueteModuloInput,
  DataConnectUnidadDidacticaModulo,
} from "../core/types.js";
import {
  DELETE_PAQUETE_MODULOS_BY_PAQUETE_MUTATION,
  DELETE_PAQUETE_MUTATION,
  INSERT_PAQUETE_MODULO_MUTATION,
  INSERT_PAQUETE_MUTATION,
  UPDATE_PAQUETE_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_PAQUETES_QUERY = `
  query ListPaquetesManual {
    paquetes(limit: 500) {
      id
      titulo
      descripcion
      archivado
    }
    paqueteModulos(limit: 1500) {
      id
      orden
      obligatorio
      multiplicador
      sufijos
      paqueteId
      moduloId
      modulo {
        titulo
        tituloComercial
        orden
        plan {
          carrera {
            especialidad {
              orden
            }
          }
        }
      }
    }
    unidadDidacticaModulos(limit: 3000) {
      id
      orden
      unidadDidacticaId
      moduloId
      unidadDidactica {
        id
        nombre
        duracion
        creditos
        sigla
      }
    }
  }
`;

const GET_PAQUETE_QUERY = `
  query GetPaqueteManual($id: Int!) {
    paquete(id: $id) {
      id
      titulo
      descripcion
      archivado
    }
    paqueteModulos(where: { paqueteId: { eq: $id } }, limit: 10) {
      id
      orden
      obligatorio
      multiplicador
      sufijos
      paqueteId
      moduloId
      modulo {
        titulo
        tituloComercial
        orden
        plan {
          carrera {
            especialidad {
              orden
            }
          }
        }
      }
    }
    unidadDidacticaModulos(limit: 3000) {
      id
      orden
      unidadDidacticaId
      moduloId
      unidadDidactica {
        id
        nombre
        duracion
        creditos
        sigla
      }
    }
  }
`;

const normalizeModuloIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  const ids = value
    .map((item) => toNumber(item, -1))
    .filter((item) => item > 0);
  return Array.from(new Set(ids));
};

type PaqueteModuloItemInput = {
  moduloId: number;
  multiplicador: number;
  sufijos: string[];
};

const MAX_PAQUETE_MODULO_INSTANCES = 6;

const normalizeSufijos = (value: unknown, multiplicador: number): string[] => {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n|,/)
      : [];
  const normalized = source
    .slice(0, multiplicador)
    .map((item) => String(item ?? "").trim());
  while (normalized.length < multiplicador) normalized.push("");
  return normalized;
};

const serializeSufijos = (value: string[]) => JSON.stringify(value.map((item) => item.trim()));

const parseSufijos = (value: unknown): string[] => {
  const text = String(value ?? "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item ?? "").trim());
  } catch {
    // Legacy text values can still be split below.
  }
  return text.split(/\r?\n|,/).map((item) => item.trim());
};

const normalizeModuloItems = (data: unknown): PaqueteModuloItemInput[] => {
  const input = data as Record<string, unknown> | null;
  if (Array.isArray(input?.moduloItems)) {
    const byModuloId = new Map<number, PaqueteModuloItemInput>();
    for (const item of input.moduloItems) {
      if (typeof item !== "object" || item === null) continue;
      const record = item as Record<string, unknown>;
      const moduloId = toNumber(record.moduloId, -1);
      if (moduloId <= 0) continue;
      const multiplicador = Math.max(1, Math.min(MAX_PAQUETE_MODULO_INSTANCES, toNumber(record.multiplicador, 1)));
      byModuloId.set(moduloId, {
        moduloId,
        multiplicador,
        sufijos: normalizeSufijos(record.sufijos, multiplicador),
      });
    }
    return Array.from(byModuloId.values());
  }

  return normalizeModuloIds(input?.moduloIds).map((moduloId) => ({
    moduloId,
    multiplicador: 1,
    sufijos: [""],
  }));
};

const sortPaqueteModulos = (items: DataConnectPaqueteModulo[]) =>
  items
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId);

const attachUnidadDidacticasToPaqueteModulos = (
  paqueteModulos: DataConnectPaqueteModulo[],
  unidadDidacticaModulos: DataConnectUnidadDidacticaModulo[],
) => {
  const unidadesByModuloId = new Map<number, DataConnectUnidadDidacticaModulo[]>();
  for (const item of unidadDidacticaModulos) {
    const current = unidadesByModuloId.get(item.moduloId) ?? [];
    current.push(item);
    unidadesByModuloId.set(item.moduloId, current);
  }

  return paqueteModulos.map((paqueteModulo) => ({
    ...paqueteModulo,
    unidadDidacticas: (unidadesByModuloId.get(paqueteModulo.moduloId) ?? [])
      .slice()
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.unidadDidacticaId - b.unidadDidacticaId)
      .map((item) => item.unidadDidactica)
      .filter(Boolean),
  }));
};

export const listPaquetes = https.onCall(async (_data, context) => {
  await requirePermission(context, "paquetes", "view");

  try {
    const response = await dataConnect.executeGraphql<{
      paquetes: DataConnectPaquete[];
      paqueteModulos: DataConnectPaqueteModulo[];
      unidadDidacticaModulos: DataConnectUnidadDidacticaModulo[];
    }, Record<string, never>>(LIST_PAQUETES_QUERY);

    const moduloIdsByPaqueteId = new Map<number, DataConnectPaqueteModulo[]>();
    for (const item of response.data.paqueteModulos ?? []) {
      const current = moduloIdsByPaqueteId.get(item.paqueteId) ?? [];
      current.push(item);
      moduloIdsByPaqueteId.set(item.paqueteId, current);
    }

    const paquetes = (response.data.paquetes ?? [])
      .slice()
      .sort((a, b) => String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es"))
      .map((paquete) => {
        const paqueteModulos = attachUnidadDidacticasToPaqueteModulos(
          sortPaqueteModulos(moduloIdsByPaqueteId.get(paquete.id) ?? []),
          response.data.unidadDidacticaModulos ?? [],
        );
        return {
          ...paquete,
          paqueteModulos,
          moduloIds: paqueteModulos.map((item) => item.moduloId),
          moduloItems: paqueteModulos.map((item) => ({
            moduloId: item.moduloId,
            multiplicador: item.multiplicador ?? 1,
            sufijos: parseSufijos(item.sufijos),
          })),
        };
      });

    return { paquetes };
  } catch (error) {
    console.error("Error in listPaquetes:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing packages.");
  }
});

export const getPaquete = https.onCall(async (data, context) => {
  await requirePermission(context, "paquetes", "view");

  const paqueteId = toNumber(data?.id, -1);
  if (paqueteId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{
      paquete: DataConnectPaquete | null;
      paqueteModulos: DataConnectPaqueteModulo[];
      unidadDidacticaModulos: DataConnectUnidadDidacticaModulo[];
    }, { id: number }>(GET_PAQUETE_QUERY, { variables: { id: paqueteId } });

    const paquete = response.data.paquete;
    if (!paquete) return { paquete: null };

    const paqueteModulos = attachUnidadDidacticasToPaqueteModulos(
      sortPaqueteModulos(response.data.paqueteModulos ?? []),
      response.data.unidadDidacticaModulos ?? [],
    );
    return {
      paquete: {
        ...paquete,
        paqueteModulos,
        moduloIds: paqueteModulos.map((item) => item.moduloId),
        moduloItems: paqueteModulos.map((item) => ({
          moduloId: item.moduloId,
          multiplicador: item.multiplicador ?? 1,
          sufijos: parseSufijos(item.sufijos),
        })),
      },
    };
  } catch (error) {
    console.error("Error in getPaquete:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting package.");
  }
});

export const createOrUpdatePaquete = https.onCall(async (data, context) => {
  const payload = buildPaqueteDataFromInput(data as Record<string, unknown>);
  if (!payload.titulo) {
    throw new https.HttpsError("invalid-argument", "titulo is required.");
  }

  const moduloItems = normalizeModuloItems(data);
  const totalInstances = moduloItems.reduce((sum, item) => sum + item.multiplicador, 0);
  if (moduloItems.length < 1 || totalInstances > MAX_PAQUETE_MODULO_INSTANCES) {
    throw new https.HttpsError("invalid-argument", `El paquete debe tener entre 1 y ${MAX_PAQUETE_MODULO_INSTANCES} instancias de modulos.`);
  }

  const paqueteId = toNumberOrNull(data?.id);
  await requirePermission(context, "paquetes", paqueteId ? "edit" : "create");

  try {
    let savedPaqueteId = paqueteId;
    if (paqueteId) {
      const updated = await dataConnect.executeGraphql<
        { paquete_update: unknown },
        { id: number; data: DataConnectPaqueteInput }
      >(UPDATE_PAQUETE_MUTATION, { variables: { id: paqueteId, data: payload } });
      savedPaqueteId = getIdFromKeyOutput(updated.data.paquete_update) ?? paqueteId;
    } else {
      const created = await dataConnect.executeGraphql<
        { paquete_insert: unknown },
        { data: DataConnectPaqueteInput }
      >(INSERT_PAQUETE_MUTATION, { variables: { data: payload } });
      savedPaqueteId = getIdFromKeyOutput(created.data.paquete_insert);
    }

    if (!savedPaqueteId) {
      throw new Error("No se pudo obtener el id del paquete guardado.");
    }

    await dataConnect.executeGraphql<
      { paqueteModulo_deleteMany: number },
      { paqueteId: number }
    >(DELETE_PAQUETE_MODULOS_BY_PAQUETE_MUTATION, { variables: { paqueteId: savedPaqueteId } });

    await Promise.all(
      moduloItems.map((item, index) => {
        const paqueteModulo = buildPaqueteModuloDataFromInput({
          paqueteId: savedPaqueteId,
          moduloId: item.moduloId,
          orden: index + 1,
          obligatorio: true,
          multiplicador: item.multiplicador,
          sufijos: serializeSufijos(item.sufijos),
        });
        return dataConnect.executeGraphql<
          { paqueteModulo_insert: unknown },
          { data: DataConnectPaqueteModuloInput }
        >(INSERT_PAQUETE_MODULO_MUTATION, { variables: { data: paqueteModulo } });
      }),
    );

    return { id: savedPaqueteId };
  } catch (error) {
    console.error("Error in createOrUpdatePaquete:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving package.");
  }
});

export const deletePaquete = https.onCall(async (data, context) => {
  await requirePermission(context, "paquetes", "delete");

  const paqueteId = toNumber(data?.id, -1);
  if (paqueteId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    await dataConnect.executeGraphql<
      { paqueteModulo_deleteMany: number },
      { paqueteId: number }
    >(DELETE_PAQUETE_MODULOS_BY_PAQUETE_MUTATION, { variables: { paqueteId } });

    const deleted = await dataConnect.executeGraphql<{ paquete_delete: unknown }, { id: number }>(
      DELETE_PAQUETE_MUTATION,
      { variables: { id: paqueteId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.paquete_delete) ?? paqueteId };
  } catch (error) {
    console.error("Error in deletePaquete:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting package.");
  }
});
