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
import { requirePermission } from "../core/permissions.js";
import {
  DataConnectModulo,
  DataConnectModuloInput,
  DataConnectPaqueteInput,
  DataConnectPaqueteModulo,
  DataConnectPaqueteModuloInput,
  DataConnectPlanModulo,
  DataConnectPlanModuloInput,
} from "../core/types.js";
import {
  DELETE_PLAN_MODULOS_BY_MODULO_MUTATION,
  DELETE_MODULO_MUTATION,
  DELETE_PAQUETE_MUTATION,
  INSERT_PLAN_MODULO_MUTATION,
  INSERT_PAQUETE_MODULO_MUTATION,
  INSERT_PAQUETE_MUTATION,
  INSERT_MODULO_MUTATION,
  UPDATE_MODULO_MUTATION,
  UPDATE_MODULO_ORDEN_MUTATION,
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

interface ModulosQueryResponse {
  modulos: DataConnectModulo[];
  planModulos: DataConnectPlanModulo[];
}

const getModuloLabel = (moduloId: number, modulo?: { titulo?: string | null; tituloComercial?: string | null } | null) =>
  modulo?.tituloComercial || modulo?.titulo || `Modulo ${moduloId}`;

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
      comun: modulo.comun ?? planIds.length > 1,
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
      if (planIds !== undefined) {
        await syncPlanModulos(createdModuloId, planIds, payload.orden);
      }
      paqueteId = await ensureSingleModulePaquete(createdModuloId, payload);
      await syncPaquetesTituloForModulo(createdModuloId);
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

    return { id: createdModuloId, paqueteId };
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
