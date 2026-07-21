import { https } from "firebase-functions/v1";
import {
  buildGrupoModuloDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import {
  DataConnectCalendario,
  DataConnectGrupo,
  DataConnectGrupoModulo,
  DataConnectGrupoModuloInput,
  DataConnectModulo,
} from "../core/types.js";
import {
  buildGrupoModuloNombreRelacional,
  GrupoModuloNombreContext,
  GrupoModuloNombreModulo,
} from "../core/grupoModuloNombre.js";
import {
  DELETE_GRUPO_MODULO_MUTATION,
  INSERT_GRUPO_MODULO_MUTATION,
  UPDATE_GRUPO_MODULO_MUTATION,
} from "../../dataconnectOperations.js";

type GrupoModuloRow = DataConnectGrupoModulo & {
  grupo?: Pick<DataConnectGrupo, "id" | "nombreDisplay" | "semestreId"> & {
    semestre?: {
      id?: number | null;
      titulo?: string | null;
      inicio?: string | null;
      fin?: string | null;
      archivado?: boolean | null;
    } | null;
  } | null;
  modulo?: Pick<DataConnectModulo, "id" | "titulo" | "tituloComercial" | "orden"> | null;
  calendario?: Pick<DataConnectCalendario, "id" | "titulo"> | null;
};

const LIST_GRUPO_MODULOS_QUERY = `
  query ListGrupoModulosManual {
    grupoModulos(limit: 5000) {
      id
      nombre
      orden
      obligatorio
      inicio
      fin
      grupoId
      grupo {
        id
        nombreDisplay
        semestreId
        semestre {
          id
          titulo
          inicio
          fin
          archivado
        }
      }
      moduloId
      modulo {
        id
        titulo
        tituloComercial
        orden
      }
      calendarioId
      calendario {
        id
        titulo
      }
    }
  }
`;

const GET_GRUPO_MODULO_QUERY = `
  query GetGrupoModuloManual($id: Int!) {
    grupoModulo(id: $id) {
      id
      nombre
      orden
      obligatorio
      inicio
      fin
      grupoId
      moduloId
      calendarioId
    }
  }
`;

const GET_GRUPO_MODULO_NOMBRE_CONTEXT_QUERY = `
  query GetGrupoModuloNombreContext($grupoId: Int!, $moduloId: Int!) {
    grupo(id: $grupoId) {
      id
      turnoNombre
      semestre {
        titulo
      }
      turno {
        nombre
      }
      horario {
        nombre
      }
      personal {
        displayName
        user {
          username
          apellidoPaterno
        }
      }
    }
    modulo(id: $moduloId) {
      id
      titulo
      tituloComercial
    }
  }
`;

const LIST_GRUPO_MODULO_OPCIONES_QUERY = `
  query ListGrupoModuloOpcionesManual {
    grupos(limit: 5000) {
      id
      nombreDisplay
    }
    modulos(limit: 1000) {
      id
      titulo
      tituloComercial
      orden
    }
    calendarios(limit: 1000) {
      id
      titulo
    }
  }
`;

function moduloLabel(modulo?: Pick<DataConnectModulo, "id" | "titulo" | "tituloComercial" | "orden"> | null) {
  const title = String(modulo?.titulo || modulo?.tituloComercial || "").trim();
  return title || (modulo?.id ? `Modulo ${modulo.id}` : "");
}

function grupoLabel(grupo?: Pick<DataConnectGrupo, "id" | "nombreDisplay"> | null) {
  return String(grupo?.nombreDisplay || (grupo?.id ? `Grupo ${grupo.id}` : "")).trim();
}

function calendarioLabel(calendario?: Pick<DataConnectCalendario, "id" | "titulo"> | null) {
  return String(calendario?.titulo || (calendario?.id ? `Calendario ${calendario.id}` : "")).trim();
}

function decorateGrupoModulo(row: GrupoModuloRow) {
  return {
    ...row,
    grupoLabel: grupoLabel(row.grupo),
    moduloLabel: moduloLabel(row.modulo),
    calendarioLabel: calendarioLabel(row.calendario),
  };
}

async function buildNombreForCreate(grupoId: number, moduloId: number) {
  const response = await dataConnect.executeGraphql<{
    grupo: GrupoModuloNombreContext;
    modulo: GrupoModuloNombreModulo;
  }, { grupoId: number; moduloId: number }>(
    GET_GRUPO_MODULO_NOMBRE_CONTEXT_QUERY,
    { variables: { grupoId, moduloId } },
  );

  const nombre = buildGrupoModuloNombreRelacional(response.data.grupo, response.data.modulo);
  if (!nombre) {
    throw new https.HttpsError("failed-precondition", "No se pudo calcular el nombre del grupo-modulo.");
  }
  return nombre;
}

const sortGrupoModulos = (items: GrupoModuloRow[]) =>
  items
    .slice()
    .sort((a, b) =>
      grupoLabel(a.grupo).localeCompare(grupoLabel(b.grupo), "es", { numeric: true }) ||
      (a.orden ?? 0) - (b.orden ?? 0) ||
      moduloLabel(a.modulo).localeCompare(moduloLabel(b.modulo), "es", { numeric: true }) ||
      a.id - b.id,
    );

export const listGrupoModulos = https.onCall(async (_data, context) => {
  await requirePermission(context, "grupo-modulos", "view");

  try {
    const response = await dataConnect.executeGraphql<{ grupoModulos: GrupoModuloRow[] }, Record<string, never>>(
      LIST_GRUPO_MODULOS_QUERY,
    );
    return { grupoModulos: sortGrupoModulos(response.data.grupoModulos ?? []).map(decorateGrupoModulo) };
  } catch (error) {
    console.error("Error in listGrupoModulos:", error);
    throw new https.HttpsError("internal", "No se pudieron listar los grupo-modulos.");
  }
});

export const getGrupoModulo = https.onCall(async (data, context) => {
  await requirePermission(context, "grupo-modulos", "view");

  const grupoModuloId = toNumber(data?.id, -1);
  if (grupoModuloId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ grupoModulo: DataConnectGrupoModulo | null }, { id: number }>(
      GET_GRUPO_MODULO_QUERY,
      { variables: { id: grupoModuloId } },
    );
    return { grupoModulo: response.data.grupoModulo ?? null };
  } catch (error) {
    console.error("Error in getGrupoModulo:", error);
    throw new https.HttpsError("internal", "No se pudo cargar el grupo-modulo.");
  }
});

export const listGrupoModuloOpciones = https.onCall(async (_data, context) => {
  await requirePermission(context, "grupo-modulos", "view");

  try {
    const response = await dataConnect.executeGraphql<{
      grupos: Array<Pick<DataConnectGrupo, "id" | "nombreDisplay">>;
      modulos: Array<Pick<DataConnectModulo, "id" | "titulo" | "tituloComercial" | "orden">>;
      calendarios: Array<Pick<DataConnectCalendario, "id" | "titulo">>;
    }, Record<string, never>>(LIST_GRUPO_MODULO_OPCIONES_QUERY);

    return {
      grupos: (response.data.grupos ?? [])
        .map((grupo) => ({ ...grupo, label: grupoLabel(grupo) }))
        .sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true })),
      modulos: (response.data.modulos ?? [])
        .map((modulo) => ({ ...modulo, label: moduloLabel(modulo) }))
        .sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true })),
      calendarios: (response.data.calendarios ?? [])
        .map((calendario) => ({ ...calendario, label: calendarioLabel(calendario) }))
        .sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true })),
    };
  } catch (error) {
    console.error("Error in listGrupoModuloOpciones:", error);
    throw new https.HttpsError("internal", "No se pudieron cargar las opciones de grupo-modulo.");
  }
});

export const createOrUpdateGrupoModulo = https.onCall(async (data, context) => {
  const grupoModuloId = toNumberOrNull(data?.id);
  await requirePermission(context, "grupo-modulos", grupoModuloId ? "edit" : "create");

  const payload = buildGrupoModuloDataFromInput(data as Record<string, unknown>) as DataConnectGrupoModuloInput;
  if (!payload.grupoId) {
    throw new https.HttpsError("invalid-argument", "Selecciona un grupo.");
  }
  if (!payload.moduloId) {
    throw new https.HttpsError("invalid-argument", "Selecciona un modulo.");
  }

  try {
    if (grupoModuloId) {
      const updated = await dataConnect.executeGraphql<
        { grupoModulo_update: unknown },
        { id: number; data: DataConnectGrupoModuloInput }
      >(UPDATE_GRUPO_MODULO_MUTATION, { variables: { id: grupoModuloId, data: payload } });

      return { id: getIdFromKeyOutput(updated.data.grupoModulo_update) ?? grupoModuloId };
    }

    const createPayload: DataConnectGrupoModuloInput = {
      ...payload,
      nombre: await buildNombreForCreate(payload.grupoId, payload.moduloId),
    };

    const created = await dataConnect.executeGraphql<
      { grupoModulo_insert: unknown },
      { data: DataConnectGrupoModuloInput }
    >(INSERT_GRUPO_MODULO_MUTATION, { variables: { data: createPayload } });

    return { id: getIdFromKeyOutput(created.data.grupoModulo_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateGrupoModulo:", error);
    throw new https.HttpsError("internal", "No se pudo guardar el grupo-modulo.");
  }
});

export const deleteGrupoModulo = https.onCall(async (data, context) => {
  await requirePermission(context, "grupo-modulos", "delete");

  const grupoModuloId = toNumber(data?.id, -1);
  if (grupoModuloId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ grupoModulo_delete: unknown }, { id: number }>(
      DELETE_GRUPO_MODULO_MUTATION,
      { variables: { id: grupoModuloId } },
    );
    return { id: getIdFromKeyOutput(deleted.data.grupoModulo_delete) ?? grupoModuloId };
  } catch (error) {
    console.error("Error in deleteGrupoModulo:", error);
    throw new https.HttpsError("internal", "No se pudo eliminar el grupo-modulo.");
  }
});
