import { https } from "firebase-functions/v1";
import {
  buildModuloDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { reconcileModuloUnits, getModuloCompetenciaContext } from "../competencias/service.js";
import { requirePermission } from "../core/permissions.js";
import {
  DataConnectModulo,
  DataConnectModuloInput,
  DataConnectPlanModulo,
  DataConnectPlanModuloInput,
  DataConnectGrupoModuloInput,
} from "../core/types.js";
import {
  buildGrupoModuloNombreRelacional,
  GrupoModuloNombreContext,
  GrupoModuloNombreModulo,
} from "../core/grupoModuloNombre.js";
import {
  DELETE_PLAN_MODULOS_BY_MODULO_MUTATION,
  DELETE_MODULO_MUTATION,
  INSERT_PLAN_MODULO_MUTATION,
  INSERT_MODULO_MUTATION,
  UPDATE_GRUPO_MODULO_MUTATION,
  UPDATE_MODULO_MUTATION,
  UPDATE_MODULO_ORDEN_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_MODULOS_QUERY = `
  query ListModulosManual {
    modulos(limit: 500) {
      id
      titulo
      tituloComercial
      orden
      descripcion
      competencias: competencias_on_modulo { id nombre tipo moduloId }
      horas
      creditos
      duracionEfsrt
      creditosEfsrt
      metas
      activo
      slug
      comun
      plan {
        id
        planEstudio
        tituloComercial
        carrera {
          id
          nombre
          titulo
          tituloComercial
          especialidad {
            id
            titulo
            tituloComercial
            orden
          }
        }
      }
      planId
    }
    planModulos(limit: 5000) {
      id
      orden
      planId
      moduloId
      plan {
        id
        planEstudio
        tituloComercial
        carreraId
        carrera {
          id
          nombre
          titulo
          tituloComercial
          especialidad {
            id
            titulo
            tituloComercial
            orden
          }
        }
      }
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
      competencias: competencias_on_modulo { id nombre tipo moduloId }
      horas
      creditos
      duracionEfsrt
      creditosEfsrt
      metas
      activo
      slug
      comun
      plan {
        id
        planEstudio
        tituloComercial
        carrera {
          id
          nombre
          titulo
          tituloComercial
          especialidad {
            id
            titulo
            tituloComercial
            orden
          }
        }
      }
      planId
    }
    planModulos(where: { moduloId: { eq: $id } }, limit: 100) {
      id
      orden
      planId
      moduloId
      plan {
        id
        planEstudio
        tituloComercial
        carreraId
        carrera {
          id
          nombre
          titulo
          tituloComercial
          especialidad {
            id
            titulo
            tituloComercial
            orden
          }
        }
      }
    }
  }
`;

const LIST_GRUPO_MODULOS_FOR_MODULO_RENAME_QUERY = `
  query ListGrupoModulosForModuloRename($moduloId: Int!) {
    grupoModulos(where: { moduloId: { eq: $moduloId } }, limit: 5000) {
      id
      nombre
      modulo {
        id
        titulo
        tituloComercial
      }
      grupo {
        id
        turnoNombre
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
    }
  }
`;

interface ModulosQueryResponse {
  modulos: DataConnectModulo[];
  planModulos: DataConnectPlanModulo[];
}

const getModuloEspecialidadLabel = (modulo: DataConnectModulo) =>
  modulo.plan?.carrera?.especialidad?.tituloComercial
  || modulo.plan?.carrera?.especialidad?.titulo
  || "";

const getModuloEspecialidadOrden = (modulo: DataConnectModulo) =>
  modulo.plan?.carrera?.especialidad?.orden ?? Number.MAX_SAFE_INTEGER;

const sortModulos = (items: DataConnectModulo[]) =>
  items
    .slice()
    .sort((a, b) =>
      getModuloEspecialidadOrden(a) - getModuloEspecialidadOrden(b)
      || getModuloEspecialidadLabel(a).localeCompare(getModuloEspecialidadLabel(b), "es", { numeric: true })
      || (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER)
      || String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es", { numeric: true })
      || a.id - b.id,
    );

function parsePlanIdsFromInput(input: Record<string, unknown>): number[] | undefined {
  const raw = input.planIds !== undefined ? input.planIds : input.planId;
  if (raw === undefined) return undefined;
  const rawItems = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : raw == null || raw === ""
        ? []
        : [raw];

  return [...new Set(
    rawItems
      .map((item) => Number(String(item).trim()))
      .filter((item) => Number.isInteger(item) && item > 0),
  )];
}

function sortPlanModuloRelations(items: DataConnectPlanModulo[]) {
  return items
    .slice()
    .sort(
      (a, b) =>
        (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER) ||
        a.planId - b.planId ||
        a.id - b.id,
    );
}

function attachPlanRelationsToModulos(
  modulos: DataConnectModulo[],
  planModulos: DataConnectPlanModulo[],
) {
  const relationsByModuloId = new Map<number, DataConnectPlanModulo[]>();
  for (const relation of planModulos) {
    const current = relationsByModuloId.get(relation.moduloId) ?? [];
    current.push(relation);
    relationsByModuloId.set(relation.moduloId, current);
  }

  return modulos.map((modulo) => {
    const relations = sortPlanModuloRelations(relationsByModuloId.get(modulo.id) ?? []);
    const primary = relations[0] ?? null;
    const legacyPlanId = modulo.planId != null ? [modulo.planId] : [];
    const planIds = relations.length > 0
      ? relations.map((relation) => relation.planId)
      : legacyPlanId;

    return {
      ...modulo,
      comun: false,
      planId: primary?.planId ?? modulo.planId ?? null,
      plan: primary?.plan ?? modulo.plan ?? null,
      planIds,
      planModulos: relations,
    };
  });
}

async function syncPlanModulos(moduloId: number, planIds: number[], orden?: number | null) {
  await dataConnect.executeGraphql<
    { planModulo_deleteMany: number },
    { moduloId: number }
  >(DELETE_PLAN_MODULOS_BY_MODULO_MUTATION, { variables: { moduloId } });

  await Promise.all(
    planIds.map((planId) => {
      const data: DataConnectPlanModuloInput = {
        planId,
        moduloId,
        orden: orden ?? null,
      };

      return dataConnect.executeGraphql<
        { planModulo_insert: unknown },
        { data: DataConnectPlanModuloInput }
      >(INSERT_PLAN_MODULO_MUTATION, { variables: { data } });
    }),
  );
}

async function syncGrupoModulosNombreForModulo(moduloId: number) {
  const response = await dataConnect.executeGraphql<{
    grupoModulos: Array<{
      id: number;
      nombre?: string | null;
      modulo?: GrupoModuloNombreModulo;
      grupo?: GrupoModuloNombreContext;
    }>;
  }, { moduloId: number }>(
    LIST_GRUPO_MODULOS_FOR_MODULO_RENAME_QUERY,
    { variables: { moduloId } },
  );

  await Promise.all(
    (response.data.grupoModulos ?? []).map((grupoModulo) => {
      if (grupoModulo.nombre?.trim()) return Promise.resolve();
      const nombre = buildGrupoModuloNombreRelacional(grupoModulo.grupo ?? null, grupoModulo.modulo);
      if (!nombre) return Promise.resolve();

      const payload = { nombre } as DataConnectGrupoModuloInput;
      return dataConnect.executeGraphql<
        { grupoModulo_update: unknown },
        { id: number; data: DataConnectGrupoModuloInput }
      >(UPDATE_GRUPO_MODULO_MUTATION, { variables: { id: grupoModulo.id, data: payload } });
    }),
  );
}

export const listModulos = https.onCall(async (_data, context) => {
  await requirePermission(context, "modulos", "view");

  try {
    const response = await dataConnect.executeGraphql<ModulosQueryResponse, Record<string, never>>(
      LIST_MODULOS_QUERY,
    );
    const modulos = sortModulos(attachPlanRelationsToModulos(
      response.data.modulos ?? [],
      response.data.planModulos ?? [],
    ));

    return { modulos };
  } catch (error) {
    console.error("Error in listModulos:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing modules.");
  }
});

export const getModulo = https.onCall(async (data, context) => {
  await requirePermission(context, "modulos", "view");

  const moduloId = toNumber(data?.id, -1);
  if (moduloId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<
      { modulo: DataConnectModulo | null; planModulos: DataConnectPlanModulo[] },
      { id: number }
    >(
      GET_MODULO_QUERY,
      { variables: { id: moduloId } },
    );

    const modulo = response.data.modulo
      ? attachPlanRelationsToModulos([response.data.modulo], response.data.planModulos ?? [])[0]
      : null;

    return { modulo };
  } catch (error) {
    console.error("Error in getModulo:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting module.");
  }
});

export const createOrUpdateModulo = https.onCall(async (data, context) => {
  const input = data as Record<string, unknown>;
  const payload = buildModuloDataFromInput(input);
  const planIds = parsePlanIdsFromInput(input);
  if (planIds !== undefined) {
    payload.planId = planIds[0] ?? null;
    payload.comun = planIds.length > 1;
  }
  if (!payload.titulo) {
    throw new https.HttpsError("invalid-argument", "titulo is required.");
  }

  const moduloId = toNumberOrNull(data?.id);
  await requirePermission(context, "modulos", moduloId ? "edit" : "create");
  if (moduloId && input.horas !== undefined) {
    const current = await getModuloCompetenciaContext(moduloId);
    if (current.programa && current.relations.length && (!payload.horas || payload.horas <= 0)) throw new https.HttpsError("invalid-argument", "Complete las horas del modulo.");
  }

  try {
    if (moduloId) {
      const updated = await dataConnect.executeGraphql<
        { modulo_update: unknown },
        { id: number; data: DataConnectModuloInput }
      >(
        UPDATE_MODULO_MUTATION,
        { variables: { id: moduloId, data: payload } },
      );
      if (planIds !== undefined) {
        await syncPlanModulos(moduloId, planIds, payload.orden);
      }
      await syncGrupoModulosNombreForModulo(moduloId);
      if (input.horas !== undefined || planIds !== undefined) await reconcileModuloUnits(moduloId);

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

    try {
      if (planIds !== undefined) {
        await syncPlanModulos(createdModuloId, planIds, payload.orden);
      }
      await syncGrupoModulosNombreForModulo(createdModuloId);
    } catch (error) {
      if (planIds !== undefined) {
        await dataConnect.executeGraphql<{ planModulo_deleteMany: number }, { moduloId: number }>(
          DELETE_PLAN_MODULOS_BY_MODULO_MUTATION,
          { variables: { moduloId: createdModuloId } },
        );
      }
      await dataConnect.executeGraphql<{ modulo_delete: unknown }, { id: number }>(
        DELETE_MODULO_MUTATION,
        { variables: { id: createdModuloId } },
      );
      throw error;
    }

    return { id: createdModuloId };
  } catch (error) {
    console.error("Error in createOrUpdateModulo:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving module.");
  }
});

export const updateModuloOrden = https.onCall(async (data, context) => {
  await requirePermission(context, "modulos", "edit");

  const moduloId = toNumber(data?.id, -1);
  if (moduloId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  const orden = toNumberOrNull(data?.orden);
  const payload = buildModuloDataFromInput({ orden });

  try {
    const updated = await dataConnect.executeGraphql<
      { modulo_update: unknown },
      { id: number; data: DataConnectModuloInput }
    >(
      UPDATE_MODULO_ORDEN_MUTATION,
      { variables: { id: moduloId, data: payload } },
    );

    return { id: getIdFromKeyOutput(updated.data.modulo_update) ?? moduloId };
  } catch (error) {
    console.error("Error in updateModuloOrden:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving module order.");
  }
});

export const deleteModulo = https.onCall(async (data, context) => {
  await requirePermission(context, "modulos", "delete");

  const moduloId = toNumber(data?.id, -1);
  if (moduloId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    await dataConnect.executeGraphql<{ planModulo_deleteMany: number }, { moduloId: number }>(
      DELETE_PLAN_MODULOS_BY_MODULO_MUTATION,
      { variables: { moduloId } },
    );

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
