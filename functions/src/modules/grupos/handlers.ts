import { https } from "firebase-functions/v1";
import {
  buildGrupoDataFromInput,
  buildGrupoModuloDataFromInput,
  getIdFromKeyOutput,
  toBoolean,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import {
  DataConnectGrupo,
  DataConnectGrupoInput,
  DataConnectGrupoModulo,
  DataConnectGrupoModuloInput,
  DataConnectPaqueteModulo,
} from "../core/types.js";
import {
  DELETE_GRUPO_MUTATION,
  DELETE_GRUPO_MODULOS_BY_GRUPO_MUTATION,
  INSERT_GRUPO_MODULO_MUTATION,
  INSERT_GRUPO_MUTATION,
  UPDATE_GRUPO_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_GRUPOS_QUERY = `
  query ListGruposManual {
    grupos(limit: 1000) {
      id
      turnoNombre
      descripcion
      nombreDisplay
      estado
      archivado
      fechaCreacion
      fechaActualizacion
      semestreId
      semestre {
        titulo
      }
      personalId
      personal {
        id
        displayName
        userId
        user {
          username
          nombre
          apellidoPaterno
        }
      }
      paqueteId
      paquete {
        titulo
      }
      turnoId
      turno {
        nombre
        horaInicio
        horaFin
      }
      horarioId
      horario {
        nombre
        regla
        diasSemana
        viernesAlternoInicio
      }
      grupoOrd
    }
    grupoModulos(limit: 3000) {
      id
      orden
      obligatorio
      grupoId
      moduloId
      modulo {
        titulo
        tituloComercial
      }
      calendarioId
      calendario {
        titulo
        fin
        duracion
        horarioId
        horario {
          nombre
        }
        semestre {
          titulo
          fin
        }
      }
    }
  }
`;

const GET_GRUPO_QUERY = `
  query GetGrupoManual($id: Int!) {
    grupo(id: $id) {
      id
      turnoNombre
      descripcion
      nombreDisplay
      estado
      archivado
      fechaCreacion
      fechaActualizacion
      semestreId
      semestre {
        titulo
      }
      personalId
      personal {
        id
        displayName
        userId
        user {
          username
          nombre
          apellidoPaterno
        }
      }
      paqueteId
      paquete {
        titulo
      }
      turnoId
      turno {
        nombre
        horaInicio
        horaFin
      }
      horarioId
      horario {
        nombre
        regla
        diasSemana
        viernesAlternoInicio
      }
      grupoOrd
    }
    grupoModulos(where: { grupoId: { eq: $id } }, limit: 10) {
      id
      orden
      obligatorio
      grupoId
      moduloId
      modulo {
        titulo
        tituloComercial
      }
      calendarioId
      calendario {
        titulo
        fin
        duracion
        horarioId
        horario {
          nombre
        }
        semestre {
          titulo
          fin
        }
      }
    }
  }
`;

const GET_PAQUETE_MODULOS_FOR_GRUPO_QUERY = `
  query GetPaqueteModulosForGrupo($paqueteId: Int!) {
    paquete(id: $paqueteId) {
      id
      titulo
    }
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

const GET_GRUPO_MODULOS_CALENDARIOS_QUERY = `
  query GetGrupoModulosCalendarios($grupoId: Int!) {
    grupoModulos(where: { grupoId: { eq: $grupoId } }, limit: 50) {
      moduloId
      calendarioId
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

const sortGrupos = (items: DataConnectGrupo[]) =>
  items
    .slice()
    .sort((a, b) =>
      String(a.nombreDisplay ?? "").localeCompare(String(b.nombreDisplay ?? ""), "es", { numeric: true }) ||
      (a.grupoOrd ?? 0) - (b.grupoOrd ?? 0) ||
      a.id - b.id,
    );

const sortGrupoModulos = (items: DataConnectGrupoModulo[]) =>
  items
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId);

interface GrupoModuloDetalleInput {
  moduloId: number;
  orden?: number | null;
  obligatorio?: boolean;
  calendarioId?: number | null;
  hasCalendarioId: boolean;
}

const normalizeGrupoModuloDetalles = (value: unknown) => {
  const detalles = new Map<number, GrupoModuloDetalleInput>();
  if (!Array.isArray(value)) return detalles;

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const moduloId = toNumber(raw.moduloId, -1);
    if (moduloId <= 0) continue;
    detalles.set(moduloId, {
      moduloId,
      orden: toNumberOrNull(raw.orden),
      obligatorio: toBoolean(raw.obligatorio),
      calendarioId: toNumberOrNull(raw.calendarioId),
      hasCalendarioId: Object.prototype.hasOwnProperty.call(raw, "calendarioId"),
    });
  }

  return detalles;
};

async function getPaqueteModulosOrThrow(paqueteId: number) {
  const paqueteResponse = await dataConnect.executeGraphql<{
    paquete: { id: number; titulo?: string | null } | null;
    paqueteModulos: DataConnectPaqueteModulo[];
  }, { paqueteId: number }>(GET_PAQUETE_MODULOS_FOR_GRUPO_QUERY, { variables: { paqueteId } });

  const paqueteModulos = sortPaqueteModulos(paqueteResponse.data.paqueteModulos ?? []);
  if (paqueteModulos.length < 1 || paqueteModulos.length > 3) {
    throw new https.HttpsError(
      "failed-precondition",
      "El paquete debe tener entre 1 y 3 modulos para crear grupos.",
    );
  }

  return paqueteModulos;
}

async function syncGrupoModulos(
  grupoId: number,
  paqueteId: number,
  detalleInput: Map<number, GrupoModuloDetalleInput> = new Map(),
) {
  const paqueteModulos = await getPaqueteModulosOrThrow(paqueteId);
  const existingResponse = await dataConnect.executeGraphql<{
    grupoModulos: Array<Pick<DataConnectGrupoModulo, "moduloId" | "calendarioId">>;
  }, { grupoId: number }>(
    GET_GRUPO_MODULOS_CALENDARIOS_QUERY,
    { variables: { grupoId } },
  );
  const calendarioByModuloId = new Map<number, number>();
  for (const item of existingResponse.data.grupoModulos ?? []) {
    if (item.calendarioId != null) {
      calendarioByModuloId.set(item.moduloId, item.calendarioId);
    }
  }

  await dataConnect.executeGraphql<
    { grupoModulo_deleteMany: number },
    { grupoId: number }
  >(DELETE_GRUPO_MODULOS_BY_GRUPO_MUTATION, { variables: { grupoId } });

  await Promise.all(
    paqueteModulos.map((paqueteModulo, index) => {
      const detalle = detalleInput.get(paqueteModulo.moduloId);
      const grupoModulo = buildGrupoModuloDataFromInput({
        grupoId,
        moduloId: paqueteModulo.moduloId,
        orden: detalle?.orden ?? paqueteModulo.orden ?? index + 1,
        obligatorio: detalle?.obligatorio ?? paqueteModulo.obligatorio ?? true,
        calendarioId: detalle?.hasCalendarioId
          ? detalle.calendarioId ?? null
          : calendarioByModuloId.get(paqueteModulo.moduloId) ?? null,
      }) as DataConnectGrupoModuloInput;

      return dataConnect.executeGraphql<
        { grupoModulo_insert: unknown },
        { data: DataConnectGrupoModuloInput }
      >(INSERT_GRUPO_MODULO_MUTATION, { variables: { data: grupoModulo } });
    }),
  );
}

function attachGrupoModulos(grupos: DataConnectGrupo[], grupoModulos: DataConnectGrupoModulo[]) {
  const modulosByGrupoId = new Map<number, DataConnectGrupoModulo[]>();
  for (const item of grupoModulos) {
    const current = modulosByGrupoId.get(item.grupoId) ?? [];
    current.push(item);
    modulosByGrupoId.set(item.grupoId, current);
  }

  return sortGrupos(grupos).map((grupo) => {
    const items = sortGrupoModulos(modulosByGrupoId.get(grupo.id) ?? []);
    return {
      ...grupo,
      grupoModulos: items,
      moduloIds: items.map((item) => item.moduloId),
    };
  });
}

export const listGrupos = https.onCall(async (_data, context) => {
  requireLevel(context, "list groups");

  try {
    const response = await dataConnect.executeGraphql<{
      grupos: DataConnectGrupo[];
      grupoModulos: DataConnectGrupoModulo[];
    }, Record<string, never>>(
      LIST_GRUPOS_QUERY,
    );
    return { grupos: attachGrupoModulos(response.data.grupos ?? [], response.data.grupoModulos ?? []) };
  } catch (error) {
    console.error("Error in listGrupos:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing groups.");
  }
});

export const getGrupo = https.onCall(async (data, context) => {
  requireLevel(context, "get groups");

  const grupoId = toNumber(data?.id, -1);
  if (grupoId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{
      grupo: DataConnectGrupo | null;
      grupoModulos: DataConnectGrupoModulo[];
    }, { id: number }>(
      GET_GRUPO_QUERY,
      { variables: { id: grupoId } },
    );
    const grupo = response.data.grupo;
    if (!grupo) return { grupo: null };
    const grupoModulos = sortGrupoModulos(response.data.grupoModulos ?? []);
    return {
      grupo: {
        ...grupo,
        grupoModulos,
        moduloIds: grupoModulos.map((item) => item.moduloId),
      },
    };
  } catch (error) {
    console.error("Error in getGrupo:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting group.");
  }
});

export const createOrUpdateGrupo = https.onCall(async (data, context) => {
  requireLevel(context, "mutate groups");

  const now = new Date().toISOString();
  const payload = buildGrupoDataFromInput({
    ...(data as Record<string, unknown>),
    estado: (data as Record<string, unknown> | null)?.estado || "activo",
    archivado: (data as Record<string, unknown> | null)?.archivado ?? false,
    fechaActualizacion: now,
  }) as DataConnectGrupoInput;

  const grupoId = toNumberOrNull(data?.id);
  const paqueteId = toNumberOrNull(data?.paqueteId);
  const grupoModuloDetalles = normalizeGrupoModuloDetalles(data?.grupoModulos);

  if (!paqueteId) {
    throw new https.HttpsError("invalid-argument", "Selecciona un paquete.");
  }

  try {
    if (grupoId) {
      const updated = await dataConnect.executeGraphql<
        { grupo_update: unknown },
        { id: number; data: DataConnectGrupoInput }
      >(UPDATE_GRUPO_MUTATION, { variables: { id: grupoId, data: payload } });

      await syncGrupoModulos(grupoId, paqueteId, grupoModuloDetalles);

      return { id: getIdFromKeyOutput(updated.data.grupo_update) ?? grupoId, ids: [grupoId] };
    }

    const created = await dataConnect.executeGraphql<
      { grupo_insert: unknown },
      { data: DataConnectGrupoInput }
    >(INSERT_GRUPO_MUTATION, {
      variables: {
        data: {
          ...payload,
          paqueteId,
          fechaCreacion: now,
          fechaActualizacion: now,
        },
      },
    });

    const createdId = getIdFromKeyOutput(created.data.grupo_insert);
    if (createdId) {
      try {
        await syncGrupoModulos(createdId, paqueteId, grupoModuloDetalles);
      } catch (error) {
        await dataConnect.executeGraphql<{ grupo_delete: unknown }, { id: number }>(
          DELETE_GRUPO_MUTATION,
          { variables: { id: createdId } },
        );
        throw error;
      }
    }
    return { id: createdId, ids: createdId ? [createdId] : [] };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in createOrUpdateGrupo:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving group.");
  }
});

export const deleteGrupo = https.onCall(async (data, context) => {
  requireLevel(context, "delete groups");

  const grupoId = toNumber(data?.id, -1);
  if (grupoId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    await dataConnect.executeGraphql<
      { grupoModulo_deleteMany: number },
      { grupoId: number }
    >(DELETE_GRUPO_MODULOS_BY_GRUPO_MUTATION, { variables: { grupoId } });

    const deleted = await dataConnect.executeGraphql<{ grupo_delete: unknown }, { id: number }>(
      DELETE_GRUPO_MUTATION,
      { variables: { id: grupoId } },
    );
    return { id: getIdFromKeyOutput(deleted.data.grupo_delete) ?? grupoId };
  } catch (error) {
    console.error("Error in deleteGrupo:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting group.");
  }
});
