import { https } from "firebase-functions/v1";
import {
  buildActividadDataFromInput,
  buildAprendizajeDataFromInput,
  buildCapacidadTerminalDataFromInput,
  buildIndicadorCapacidadDataFromInput,
  buildUnidadDidacticaDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import {
  DataConnectActividad,
  DataConnectActividadInput,
  DataConnectAprendizaje,
  DataConnectAprendizajeInput,
  DataConnectCapacidadTerminal,
  DataConnectCapacidadTerminalInput,
  DataConnectIndicadorCapacidad,
  DataConnectIndicadorCapacidadInput,
  DataConnectModulo,
  DataConnectModuloInput,
  DataConnectUnidadDidactica,
  DataConnectUnidadDidacticaInput,
  DataConnectUnidadDidacticaModulo,
  DataConnectUnidadDidacticaModuloInput,
} from "../core/types.js";
import {
  DELETE_ACTIVIDAD_MUTATION,
  DELETE_APRENDIZAJE_MUTATION,
  DELETE_CAPACIDAD_TERMINAL_MUTATION,
  DELETE_INDICADOR_CAPACIDAD_MUTATION,
  DELETE_UNIDAD_DIDACTICA_MUTATION,
  DELETE_UNIDAD_DIDACTICA_MODULOS_BY_UNIDAD_MUTATION,
  INSERT_ACTIVIDAD_MUTATION,
  INSERT_APRENDIZAJE_MUTATION,
  INSERT_CAPACIDAD_TERMINAL_MUTATION,
  INSERT_INDICADOR_CAPACIDAD_MUTATION,
  INSERT_UNIDAD_DIDACTICA_MODULO_MUTATION,
  INSERT_UNIDAD_DIDACTICA_MUTATION,
  UPDATE_ACTIVIDAD_MUTATION,
  UPDATE_APRENDIZAJE_MUTATION,
  UPDATE_CAPACIDAD_TERMINAL_MUTATION,
  UPDATE_INDICADOR_CAPACIDAD_MUTATION,
  UPDATE_MODULO_MUTATION,
  UPDATE_UNIDAD_DIDACTICA_MUTATION,
  UPDATE_UNIDAD_DIDACTICA_MODULO_MUTATION,
} from "../../dataconnectOperations.js";

const LIST_UNIDADES_DIDACTICAS_QUERY = `
  query ListUnidadesDidacticasManual {
    unidadesDidacticas(limit: 500) {
      id
      nombre
      duracion
      creditos
      sigla
    }
    unidadDidacticaModulos(limit: 2000) {
      id
      unidadDidacticaId
      moduloId
      orden
    }
  }
`;

const GET_UNIDAD_DIDACTICA_QUERY = `
  query GetUnidadDidacticaManual($id: Int!) {
    unidadDidactica(id: $id) {
      id
      nombre
      duracion
      creditos
      sigla
    }
    unidadDidacticaModulos(where: { unidadDidacticaId: { eq: $id } }, limit: 2000) {
      id
      unidadDidacticaId
      moduloId
      orden
    }
  }
`;

const LIST_CAPACIDADES_TERMINALES_QUERY = `
  query ListCapacidadesTerminalesManual {
    capacidadesTerminales(limit: 500) {
      id
      descripcion
      sigla
      unidadDidacticaId
    }
  }
`;

const GET_CAPACIDAD_TERMINAL_QUERY = `
  query GetCapacidadTerminalManual($id: Int!) {
    capacidadTerminal(id: $id) {
      id
      descripcion
      sigla
      unidadDidacticaId
    }
  }
`;

const LIST_INDICADORES_CAPACIDAD_QUERY = `
  query ListIndicadoresCapacidadManual {
    indicadoresCapacidad(limit: 500) {
      id
      descripcion
      sigla
      capacidadTerminalId
    }
  }
`;

const GET_INDICADOR_CAPACIDAD_QUERY = `
  query GetIndicadorCapacidadManual($id: Int!) {
    indicadorCapacidad(id: $id) {
      id
      descripcion
      sigla
      capacidadTerminalId
    }
  }
`;

const LIST_APRENDIZAJES_QUERY = `
  query ListAprendizajesManual {
    aprendizajes(limit: 500) {
      id
      descripcion
      sigla
      indicadorCapacidadId
    }
  }
`;

const GET_APRENDIZAJE_QUERY = `
  query GetAprendizajeManual($id: Int!) {
    aprendizaje(id: $id) {
      id
      descripcion
      sigla
      indicadorCapacidadId
    }
  }
`;

const LIST_ACTIVIDADES_QUERY = `
  query ListActividadesManual {
    actividads(limit: 500) {
      id
      nombre
      descripcion
      proposito
      ambiente
      duracion
      fecha
      bibliografia
      aprendizajeId
      ejeTransversalId
      valorInstitucionalId
    }
  }
`;

const GET_ACTIVIDAD_QUERY = `
  query GetActividadManual($id: Int!) {
    actividad(id: $id) {
      id
      nombre
      descripcion
      proposito
      ambiente
      duracion
      fecha
      bibliografia
      aprendizajeId
      ejeTransversalId
      valorInstitucionalId
    }
  }
`;

const LIST_ESTRUCTURA_ACADEMICA_QUERY = `
  query ListEstructuraAcademicaManual {
    modulos(limit: 1000, orderBy: [{ planId: ASC }, { orden: ASC }, { tituloComercial: ASC }]) {
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
      planId
      plan {
        id
        planEstudio
        tituloComercial
        carrera {
          id
          nombre
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
    unidadDidacticaModulos(limit: 50000, orderBy: [{ moduloId: ASC }, { orden: ASC }, { unidadDidacticaId: ASC }]) {
      id
      orden
      moduloId
      unidadDidacticaId
    }
    unidadesDidacticas(limit: 50000, orderBy: [{ id: ASC }]) {
      id
      nombre
      duracion
      creditos
      sigla
    }
    capacidadesTerminales(limit: 50000, orderBy: [{ unidadDidacticaId: ASC }, { id: ASC }]) {
      id
      descripcion
      sigla
      unidadDidacticaId
    }
    indicadoresCapacidad(limit: 100000, orderBy: [{ capacidadTerminalId: ASC }, { id: ASC }]) {
      id
      descripcion
      sigla
      capacidadTerminalId
    }
  }
`;

interface EstructuraAcademicaQueryResponse {
  modulos: EstructuraModulo[];
  unidadDidacticaModulos: DataConnectUnidadDidacticaModulo[];
  unidadesDidacticas: DataConnectUnidadDidactica[];
  capacidadesTerminales: DataConnectCapacidadTerminal[];
  indicadoresCapacidad: DataConnectIndicadorCapacidad[];
}

function groupByNumber<T>(items: T[], keySelector: (item: T) => number | null | undefined) {
  const grouped = new Map<number, T[]>();
  for (const item of items) {
    const key = keySelector(item);
    if (!Number.isInteger(key)) continue;
    const current = grouped.get(key as number) ?? [];
    current.push(item);
    grouped.set(key as number, current);
  }
  return grouped;
}

function sortById<T extends { id: number }>(items: T[]) {
  return items.slice().sort((a, b) => a.id - b.id);
}

function sortRelations(items: DataConnectUnidadDidacticaModulo[]) {
  return items
    .slice()
    .sort(
      (a, b) =>
        (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER) ||
        a.unidadDidacticaId - b.unidadDidacticaId ||
        a.id - b.id,
    );
}

function buildCapacidadesForUnidad(
  unidadId: number,
  capacidadesByUnidadId: Map<number, DataConnectCapacidadTerminal[]>,
  indicadoresByCapacidadId: Map<number, DataConnectIndicadorCapacidad[]>,
) {
  return sortById(capacidadesByUnidadId.get(unidadId) ?? [])
    .map((capacidad) => ({
      id: capacidad.id,
      descripcion: capacidad.descripcion ?? null,
      sigla: capacidad.sigla ?? null,
      unidadDidacticaId: capacidad.unidadDidacticaId ?? null,
      indicadoresCapacidad: sortById(indicadoresByCapacidadId.get(capacidad.id) ?? [])
        .map((indicador) => ({
          id: indicador.id,
          descripcion: indicador.descripcion ?? null,
          sigla: indicador.sigla ?? null,
          capacidadTerminalId: indicador.capacidadTerminalId ?? null,
        })),
    }));
}

function buildUnidadesForModulo(
  moduloId: number,
  relationsByModuloId: Map<number, DataConnectUnidadDidacticaModulo[]>,
  unidadesById: Map<number, DataConnectUnidadDidactica>,
  capacidadesByUnidadId: Map<number, DataConnectCapacidadTerminal[]>,
  indicadoresByCapacidadId: Map<number, DataConnectIndicadorCapacidad[]>,
) {
  return sortRelations(relationsByModuloId.get(moduloId) ?? [])
    .map((relation) => {
      const unidad = unidadesById.get(relation.unidadDidacticaId);
      if (!unidad) return null;

      return {
        id: unidad.id,
        relacionId: relation.id,
        orden: relation.orden ?? null,
        nombre: unidad.nombre ?? null,
        duracion: unidad.duracion ?? null,
        creditos: unidad.creditos ?? null,
        sigla: unidad.sigla ?? null,
        capacidadesTerminales: buildCapacidadesForUnidad(
          unidad.id,
          capacidadesByUnidadId,
          indicadoresByCapacidadId,
        ),
      }
    })
    .filter(Boolean);
}

function requireLevel(context: https.CallableContext, action: string) {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", `You do not have permission to ${action}.`);
  }
}

type EditableAcademicEntity = "modulo" | "unidadDidactica" | "unidadDidacticaModulo" | "capacidadTerminal" | "indicadorCapacidad";
type EditableAcademicValueType = "text" | "number" | "boolean";

const editableAcademicFields: Record<EditableAcademicEntity, Record<string, EditableAcademicValueType>> = {
  modulo: {
    titulo: "text",
    tituloComercial: "text",
    orden: "number",
    descripcion: "text",
    horas: "number",
    creditos: "number",
    metas: "number",
    activo: "boolean",
    slug: "text",
  },
  unidadDidactica: {
    nombre: "text",
    duracion: "number",
    creditos: "number",
    sigla: "text",
  },
  unidadDidacticaModulo: {
    orden: "number",
  },
  capacidadTerminal: {
    descripcion: "text",
    sigla: "text",
  },
  indicadorCapacidad: {
    descripcion: "text",
    sigla: "text",
  },
};

const requiredAcademicTextFields = new Set([
  "modulo.titulo",
  "unidadDidactica.nombre",
  "capacidadTerminal.descripcion",
  "indicadorCapacidad.descripcion",
]);

function parseEditableAcademicEntity(value: unknown): EditableAcademicEntity {
  const entity = String(value ?? "");
  if (entity in editableAcademicFields) return entity as EditableAcademicEntity;
  throw new https.HttpsError("invalid-argument", "Invalid academic entity.");
}

function parseEditableAcademicField(entity: EditableAcademicEntity, value: unknown) {
  const field = String(value ?? "");
  const valueType = editableAcademicFields[entity][field];
  if (!valueType) throw new https.HttpsError("invalid-argument", "Invalid academic field.");
  return { field, valueType };
}

function parseEditableAcademicValue(entity: EditableAcademicEntity, field: string, valueType: EditableAcademicValueType, value: unknown) {
  if (valueType === "number") {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    const parsed = Number(String(value).trim());
    if (!Number.isFinite(parsed)) throw new https.HttpsError("invalid-argument", "Value must be numeric.");
    return parsed;
  }

  if (valueType === "boolean") {
    if (typeof value === "boolean") return value;
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["true", "1", "si", "sí", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
    throw new https.HttpsError("invalid-argument", "Value must be true or false.");
  }

  const text = String(value ?? "").trim();
  if (!text && requiredAcademicTextFields.has(`${entity}.${field}`)) {
    throw new https.HttpsError("invalid-argument", "Value is required.");
  }
  return text || null;
}

export const updateEstructuraAcademicaCell = https.onCall(async (data, context) => {
  requireLevel(context, "update academic structure cells");

  const entity = parseEditableAcademicEntity(data?.entity);
  const { field, valueType } = parseEditableAcademicField(entity, data?.field);
  const id = toNumber(data?.id, -1);
  if (id <= 0) throw new https.HttpsError("invalid-argument", "id is required.");

  const value = parseEditableAcademicValue(entity, field, valueType, data?.value);
  const payload = { [field]: value };

  try {
    if (entity === "modulo") {
      const updated = await dataConnect.executeGraphql<
        { modulo_update: unknown },
        { id: number; data: DataConnectModuloInput }
      >(UPDATE_MODULO_MUTATION, { variables: { id, data: payload } });
      return { id: getIdFromKeyOutput(updated.data.modulo_update) ?? id };
    }

    if (entity === "unidadDidactica") {
      const updated = await dataConnect.executeGraphql<
        { unidadDidactica_update: unknown },
        { id: number; data: DataConnectUnidadDidacticaInput }
      >(UPDATE_UNIDAD_DIDACTICA_MUTATION, { variables: { id, data: payload } });
      return { id: getIdFromKeyOutput(updated.data.unidadDidactica_update) ?? id };
    }

    if (entity === "unidadDidacticaModulo") {
      const updated = await dataConnect.executeGraphql<
        { unidadDidacticaModulo_update: unknown },
        { id: number; data: DataConnectUnidadDidacticaModuloInput }
      >(UPDATE_UNIDAD_DIDACTICA_MODULO_MUTATION, {
        variables: { id, data: payload as unknown as DataConnectUnidadDidacticaModuloInput },
      });
      return { id: getIdFromKeyOutput(updated.data.unidadDidacticaModulo_update) ?? id };
    }

    if (entity === "capacidadTerminal") {
      const updated = await dataConnect.executeGraphql<
        { capacidadTerminal_update: unknown },
        { id: number; data: DataConnectCapacidadTerminalInput }
      >(UPDATE_CAPACIDAD_TERMINAL_MUTATION, { variables: { id, data: payload } });
      return { id: getIdFromKeyOutput(updated.data.capacidadTerminal_update) ?? id };
    }

    const updated = await dataConnect.executeGraphql<
      { indicadorCapacidad_update: unknown },
      { id: number; data: DataConnectIndicadorCapacidadInput }
    >(UPDATE_INDICADOR_CAPACIDAD_MUTATION, { variables: { id, data: payload } });
    return { id: getIdFromKeyOutput(updated.data.indicadorCapacidad_update) ?? id };
  } catch (error) {
    console.error("Error in updateEstructuraAcademicaCell:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while updating academic structure.");
  }
});

interface EstructuraModulo extends DataConnectModulo {}

function buildEstructuraAcademica(response: EstructuraAcademicaQueryResponse) {
  const unidadesById = new Map((response.unidadesDidacticas ?? []).map((unidad) => [unidad.id, unidad]));
  const relationsByModuloId = groupByNumber(response.unidadDidacticaModulos ?? [], (relation) => relation.moduloId);
  const capacidadesByUnidadId = groupByNumber(
    response.capacidadesTerminales ?? [],
    (capacidad) => capacidad.unidadDidacticaId,
  );
  const indicadoresByCapacidadId = groupByNumber(
    response.indicadoresCapacidad ?? [],
    (indicador) => indicador.capacidadTerminalId,
  );

  return (response.modulos ?? []).map((modulo) => ({
    id: modulo.id,
    titulo: modulo.titulo ?? null,
    tituloComercial: modulo.tituloComercial ?? null,
    orden: modulo.orden ?? null,
    descripcion: modulo.descripcion ?? null,
    horas: modulo.horas ?? null,
    creditos: modulo.creditos ?? null,
    metas: modulo.metas ?? null,
    activo: modulo.activo ?? null,
    slug: modulo.slug ?? null,
    planId: modulo.planId ?? null,
    plan: modulo.plan ?? null,
    unidadesDidacticas: buildUnidadesForModulo(
      modulo.id,
      relationsByModuloId,
      unidadesById,
      capacidadesByUnidadId,
      indicadoresByCapacidadId,
    ),
  }));
}

export const listEstructuraAcademica = https.onCall(async (_data, context) => {
  requireLevel(context, "list academic structure");

  try {
    const response = await dataConnect.executeGraphql<
      EstructuraAcademicaQueryResponse,
      Record<string, never>
    >(LIST_ESTRUCTURA_ACADEMICA_QUERY);

    return { modulos: buildEstructuraAcademica(response.data) };
  } catch (error) {
    console.error("Error in listEstructuraAcademica:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing academic structure.");
  }
});

function parseModuloIds(input: unknown): number[] {
  const rawItems = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(",")
      : input == null
        ? []
        : [input];

  return [...new Set(
    rawItems
      .map((item) => Number(String(item).trim()))
      .filter((item) => Number.isInteger(item) && item > 0),
  )];
}

function attachUnidadDidacticaModuloIds(
  unidadesDidacticas: DataConnectUnidadDidactica[],
  unidadDidacticaModulos: DataConnectUnidadDidacticaModulo[],
) {
  const moduloIdsByUnidadId = new Map<number, number[]>();
  for (const item of unidadDidacticaModulos) {
    const current = moduloIdsByUnidadId.get(item.unidadDidacticaId) ?? [];
    current.push(item.moduloId);
    moduloIdsByUnidadId.set(item.unidadDidacticaId, current);
  }

  return unidadesDidacticas.map((unidadDidactica) => ({
    ...unidadDidactica,
    moduloIds: (moduloIdsByUnidadId.get(unidadDidactica.id) ?? [])
      .slice()
      .sort((a, b) => a - b),
  }));
}

async function syncUnidadDidacticaModulos(unidadDidacticaId: number, moduloIds: number[]) {
  await dataConnect.executeGraphql<
    { unidadDidacticaModulo_deleteMany: number },
    { unidadDidacticaId: number }
  >(DELETE_UNIDAD_DIDACTICA_MODULOS_BY_UNIDAD_MUTATION, { variables: { unidadDidacticaId } });

  await Promise.all(
    moduloIds.map((moduloId, index) => {
      const data: DataConnectUnidadDidacticaModuloInput = {
        unidadDidacticaId,
        moduloId,
        orden: index + 1,
      };

      return dataConnect.executeGraphql<
        { unidadDidacticaModulo_insert: unknown },
        { data: DataConnectUnidadDidacticaModuloInput }
      >(INSERT_UNIDAD_DIDACTICA_MODULO_MUTATION, { variables: { data } });
    }),
  );
}

export const listUnidadesDidacticas = https.onCall(async (_data, context) => {
  requireLevel(context, "list didactic units");

  try {
    const response = await dataConnect.executeGraphql<
      {
        unidadesDidacticas: DataConnectUnidadDidactica[];
        unidadDidacticaModulos: DataConnectUnidadDidacticaModulo[];
      },
      Record<string, never>
    >(LIST_UNIDADES_DIDACTICAS_QUERY);
    const unidadesDidacticas = attachUnidadDidacticaModuloIds(
      response.data.unidadesDidacticas ?? [],
      response.data.unidadDidacticaModulos ?? [],
    )
      .slice()
      .sort((a, b) => String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""), "es"));

    return { unidadesDidacticas };
  } catch (error) {
    console.error("Error in listUnidadesDidacticas:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing didactic units.");
  }
});

export const getUnidadDidactica = https.onCall(async (data, context) => {
  requireLevel(context, "get didactic units");

  const unidadDidacticaId = toNumber(data?.id, -1);
  if (unidadDidacticaId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<
      {
        unidadDidactica: DataConnectUnidadDidactica | null;
        unidadDidacticaModulos: DataConnectUnidadDidacticaModulo[];
      },
      { id: number }
    >(GET_UNIDAD_DIDACTICA_QUERY, { variables: { id: unidadDidacticaId } });

    const unidadDidactica = response.data.unidadDidactica
      ? attachUnidadDidacticaModuloIds(
        [response.data.unidadDidactica],
        response.data.unidadDidacticaModulos ?? [],
      )[0]
      : null;

    return { unidadDidactica };
  } catch (error) {
    console.error("Error in getUnidadDidactica:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting didactic unit.");
  }
});

export const createOrUpdateUnidadDidactica = https.onCall(async (data, context) => {
  requireLevel(context, "mutate didactic units");

  const payload = buildUnidadDidacticaDataFromInput(data as Record<string, unknown>);
  const moduloIds = parseModuloIds((data as Record<string, unknown>).moduloIds ?? data?.moduloId);
  if (!payload.nombre) {
    throw new https.HttpsError("invalid-argument", "nombre is required.");
  }
  if (moduloIds.length === 0) {
    throw new https.HttpsError("invalid-argument", "At least one moduloId is required.");
  }

  const unidadDidacticaId = toNumberOrNull(data?.id);

  try {
    let savedUnidadDidacticaId = unidadDidacticaId;
    if (unidadDidacticaId) {
      const updated = await dataConnect.executeGraphql<
        { unidadDidactica_update: unknown },
        { id: number; data: DataConnectUnidadDidacticaInput }
      >(UPDATE_UNIDAD_DIDACTICA_MUTATION, { variables: { id: unidadDidacticaId, data: payload } });

      savedUnidadDidacticaId = getIdFromKeyOutput(updated.data.unidadDidactica_update) ?? unidadDidacticaId;
    } else {
      const created = await dataConnect.executeGraphql<
        { unidadDidactica_insert: unknown },
        { data: DataConnectUnidadDidacticaInput }
      >(INSERT_UNIDAD_DIDACTICA_MUTATION, { variables: { data: payload } });

      savedUnidadDidacticaId = getIdFromKeyOutput(created.data.unidadDidactica_insert);
    }

    if (!savedUnidadDidacticaId) {
      throw new Error("No se pudo obtener el id de la unidad didactica guardada.");
    }

    await syncUnidadDidacticaModulos(savedUnidadDidacticaId, moduloIds);

    return { id: savedUnidadDidacticaId };
  } catch (error) {
    console.error("Error in createOrUpdateUnidadDidactica:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving didactic unit.");
  }
});

export const deleteUnidadDidactica = https.onCall(async (data, context) => {
  requireLevel(context, "delete didactic units");

  const unidadDidacticaId = toNumber(data?.id, -1);
  if (unidadDidacticaId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    await dataConnect.executeGraphql<
      { unidadDidacticaModulo_deleteMany: number },
      { unidadDidacticaId: number }
    >(DELETE_UNIDAD_DIDACTICA_MODULOS_BY_UNIDAD_MUTATION, { variables: { unidadDidacticaId } });

    const deleted = await dataConnect.executeGraphql<{ unidadDidactica_delete: unknown }, { id: number }>(
      DELETE_UNIDAD_DIDACTICA_MUTATION,
      { variables: { id: unidadDidacticaId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.unidadDidactica_delete) ?? unidadDidacticaId };
  } catch (error) {
    console.error("Error in deleteUnidadDidactica:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting didactic unit.");
  }
});

export const listCapacidadesTerminales = https.onCall(async (_data, context) => {
  requireLevel(context, "list terminal capacities");

  try {
    const response = await dataConnect.executeGraphql<
      { capacidadesTerminales: DataConnectCapacidadTerminal[] },
      Record<string, never>
    >(LIST_CAPACIDADES_TERMINALES_QUERY);
    const capacidadesTerminales = (response.data.capacidadesTerminales ?? [])
      .slice()
      .sort((a, b) => String(a.descripcion ?? "").localeCompare(String(b.descripcion ?? ""), "es"));

    return { capacidadesTerminales };
  } catch (error) {
    console.error("Error in listCapacidadesTerminales:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing terminal capacities.");
  }
});

export const getCapacidadTerminal = https.onCall(async (data, context) => {
  requireLevel(context, "get terminal capacities");

  const capacidadTerminalId = toNumber(data?.id, -1);
  if (capacidadTerminalId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<
      { capacidadTerminal: DataConnectCapacidadTerminal | null },
      { id: number }
    >(GET_CAPACIDAD_TERMINAL_QUERY, { variables: { id: capacidadTerminalId } });

    return { capacidadTerminal: response.data.capacidadTerminal ?? null };
  } catch (error) {
    console.error("Error in getCapacidadTerminal:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting terminal capacity.");
  }
});

export const createOrUpdateCapacidadTerminal = https.onCall(async (data, context) => {
  requireLevel(context, "mutate terminal capacities");

  const payload = buildCapacidadTerminalDataFromInput(data as Record<string, unknown>);
  if (!payload.descripcion) {
    throw new https.HttpsError("invalid-argument", "descripcion is required.");
  }
  if (!payload.unidadDidacticaId) {
    throw new https.HttpsError("invalid-argument", "unidadDidacticaId is required.");
  }

  const capacidadTerminalId = toNumberOrNull(data?.id);

  try {
    if (capacidadTerminalId) {
      const updated = await dataConnect.executeGraphql<
        { capacidadTerminal_update: unknown },
        { id: number; data: DataConnectCapacidadTerminalInput }
      >(UPDATE_CAPACIDAD_TERMINAL_MUTATION, { variables: { id: capacidadTerminalId, data: payload } });

      return { id: getIdFromKeyOutput(updated.data.capacidadTerminal_update) ?? capacidadTerminalId };
    }

    const created = await dataConnect.executeGraphql<
      { capacidadTerminal_insert: unknown },
      { data: DataConnectCapacidadTerminalInput }
    >(INSERT_CAPACIDAD_TERMINAL_MUTATION, { variables: { data: payload } });

    return { id: getIdFromKeyOutput(created.data.capacidadTerminal_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateCapacidadTerminal:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving terminal capacity.");
  }
});

export const deleteCapacidadTerminal = https.onCall(async (data, context) => {
  requireLevel(context, "delete terminal capacities");

  const capacidadTerminalId = toNumber(data?.id, -1);
  if (capacidadTerminalId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ capacidadTerminal_delete: unknown }, { id: number }>(
      DELETE_CAPACIDAD_TERMINAL_MUTATION,
      { variables: { id: capacidadTerminalId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.capacidadTerminal_delete) ?? capacidadTerminalId };
  } catch (error) {
    console.error("Error in deleteCapacidadTerminal:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting terminal capacity.");
  }
});

export const listIndicadoresCapacidad = https.onCall(async (_data, context) => {
  requireLevel(context, "list capacity indicators");

  try {
    const response = await dataConnect.executeGraphql<
      { indicadoresCapacidad: DataConnectIndicadorCapacidad[] },
      Record<string, never>
    >(LIST_INDICADORES_CAPACIDAD_QUERY);
    const indicadoresCapacidad = (response.data.indicadoresCapacidad ?? [])
      .slice()
      .sort((a, b) => String(a.descripcion ?? "").localeCompare(String(b.descripcion ?? ""), "es"));

    return { indicadoresCapacidad };
  } catch (error) {
    console.error("Error in listIndicadoresCapacidad:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing capacity indicators.");
  }
});

export const getIndicadorCapacidad = https.onCall(async (data, context) => {
  requireLevel(context, "get capacity indicators");

  const indicadorCapacidadId = toNumber(data?.id, -1);
  if (indicadorCapacidadId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<
      { indicadorCapacidad: DataConnectIndicadorCapacidad | null },
      { id: number }
    >(GET_INDICADOR_CAPACIDAD_QUERY, { variables: { id: indicadorCapacidadId } });

    return { indicadorCapacidad: response.data.indicadorCapacidad ?? null };
  } catch (error) {
    console.error("Error in getIndicadorCapacidad:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting capacity indicator.");
  }
});

export const createOrUpdateIndicadorCapacidad = https.onCall(async (data, context) => {
  requireLevel(context, "mutate capacity indicators");

  const payload = buildIndicadorCapacidadDataFromInput(data as Record<string, unknown>);
  if (!payload.descripcion) {
    throw new https.HttpsError("invalid-argument", "descripcion is required.");
  }
  if (!payload.capacidadTerminalId) {
    throw new https.HttpsError("invalid-argument", "capacidadTerminalId is required.");
  }

  const indicadorCapacidadId = toNumberOrNull(data?.id);

  try {
    if (indicadorCapacidadId) {
      const updated = await dataConnect.executeGraphql<
        { indicadorCapacidad_update: unknown },
        { id: number; data: DataConnectIndicadorCapacidadInput }
      >(UPDATE_INDICADOR_CAPACIDAD_MUTATION, { variables: { id: indicadorCapacidadId, data: payload } });

      return { id: getIdFromKeyOutput(updated.data.indicadorCapacidad_update) ?? indicadorCapacidadId };
    }

    const created = await dataConnect.executeGraphql<
      { indicadorCapacidad_insert: unknown },
      { data: DataConnectIndicadorCapacidadInput }
    >(INSERT_INDICADOR_CAPACIDAD_MUTATION, { variables: { data: payload } });

    return { id: getIdFromKeyOutput(created.data.indicadorCapacidad_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateIndicadorCapacidad:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving capacity indicator.");
  }
});

export const deleteIndicadorCapacidad = https.onCall(async (data, context) => {
  requireLevel(context, "delete capacity indicators");

  const indicadorCapacidadId = toNumber(data?.id, -1);
  if (indicadorCapacidadId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ indicadorCapacidad_delete: unknown }, { id: number }>(
      DELETE_INDICADOR_CAPACIDAD_MUTATION,
      { variables: { id: indicadorCapacidadId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.indicadorCapacidad_delete) ?? indicadorCapacidadId };
  } catch (error) {
    console.error("Error in deleteIndicadorCapacidad:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting capacity indicator.");
  }
});

export const listAprendizajes = https.onCall(async (_data, context) => {
  requireLevel(context, "list learning records");

  try {
    const response = await dataConnect.executeGraphql<
      { aprendizajes: DataConnectAprendizaje[] },
      Record<string, never>
    >(LIST_APRENDIZAJES_QUERY);
    const aprendizajes = (response.data.aprendizajes ?? [])
      .slice()
      .sort((a, b) => String(a.descripcion ?? "").localeCompare(String(b.descripcion ?? ""), "es"));

    return { aprendizajes };
  } catch (error) {
    console.error("Error in listAprendizajes:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing learning records.");
  }
});

export const getAprendizaje = https.onCall(async (data, context) => {
  requireLevel(context, "get learning records");

  const aprendizajeId = toNumber(data?.id, -1);
  if (aprendizajeId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<
      { aprendizaje: DataConnectAprendizaje | null },
      { id: number }
    >(GET_APRENDIZAJE_QUERY, { variables: { id: aprendizajeId } });

    return { aprendizaje: response.data.aprendizaje ?? null };
  } catch (error) {
    console.error("Error in getAprendizaje:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting learning record.");
  }
});

export const createOrUpdateAprendizaje = https.onCall(async (data, context) => {
  requireLevel(context, "mutate learning records");

  const payload = buildAprendizajeDataFromInput(data as Record<string, unknown>);
  if (!payload.descripcion) {
    throw new https.HttpsError("invalid-argument", "descripcion is required.");
  }
  if (!payload.indicadorCapacidadId) {
    throw new https.HttpsError("invalid-argument", "indicadorCapacidadId is required.");
  }

  const aprendizajeId = toNumberOrNull(data?.id);

  try {
    if (aprendizajeId) {
      const updated = await dataConnect.executeGraphql<
        { aprendizaje_update: unknown },
        { id: number; data: DataConnectAprendizajeInput }
      >(UPDATE_APRENDIZAJE_MUTATION, { variables: { id: aprendizajeId, data: payload } });

      return { id: getIdFromKeyOutput(updated.data.aprendizaje_update) ?? aprendizajeId };
    }

    const created = await dataConnect.executeGraphql<
      { aprendizaje_insert: unknown },
      { data: DataConnectAprendizajeInput }
    >(INSERT_APRENDIZAJE_MUTATION, { variables: { data: payload } });

    return { id: getIdFromKeyOutput(created.data.aprendizaje_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateAprendizaje:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving learning record.");
  }
});

export const deleteAprendizaje = https.onCall(async (data, context) => {
  requireLevel(context, "delete learning records");

  const aprendizajeId = toNumber(data?.id, -1);
  if (aprendizajeId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ aprendizaje_delete: unknown }, { id: number }>(
      DELETE_APRENDIZAJE_MUTATION,
      { variables: { id: aprendizajeId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.aprendizaje_delete) ?? aprendizajeId };
  } catch (error) {
    console.error("Error in deleteAprendizaje:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting learning record.");
  }
});

export const listActividades = https.onCall(async (_data, context) => {
  requireLevel(context, "list activities");

  try {
    const response = await dataConnect.executeGraphql<
      { actividads: DataConnectActividad[] },
      Record<string, never>
    >(LIST_ACTIVIDADES_QUERY);
    const actividades = (response.data.actividads ?? [])
      .slice()
      .sort((a, b) => String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""), "es"));

    return { actividades };
  } catch (error) {
    console.error("Error in listActividades:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing activities.");
  }
});

export const getActividad = https.onCall(async (data, context) => {
  requireLevel(context, "get activities");

  const actividadId = toNumber(data?.id, -1);
  if (actividadId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<
      { actividad: DataConnectActividad | null },
      { id: number }
    >(GET_ACTIVIDAD_QUERY, { variables: { id: actividadId } });

    return { actividad: response.data.actividad ?? null };
  } catch (error) {
    console.error("Error in getActividad:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting activity.");
  }
});

export const createOrUpdateActividad = https.onCall(async (data, context) => {
  requireLevel(context, "mutate activities");

  const payload = buildActividadDataFromInput(data as Record<string, unknown>);
  if (!payload.nombre) {
    throw new https.HttpsError("invalid-argument", "nombre is required.");
  }
  if (!payload.aprendizajeId) {
    throw new https.HttpsError("invalid-argument", "aprendizajeId is required.");
  }

  const actividadId = toNumberOrNull(data?.id);

  try {
    if (actividadId) {
      const updated = await dataConnect.executeGraphql<
        { actividad_update: unknown },
        { id: number; data: DataConnectActividadInput }
      >(UPDATE_ACTIVIDAD_MUTATION, { variables: { id: actividadId, data: payload } });

      return { id: getIdFromKeyOutput(updated.data.actividad_update) ?? actividadId };
    }

    const created = await dataConnect.executeGraphql<
      { actividad_insert: unknown },
      { data: DataConnectActividadInput }
    >(INSERT_ACTIVIDAD_MUTATION, { variables: { data: payload } });

    return { id: getIdFromKeyOutput(created.data.actividad_insert) };
  } catch (error) {
    console.error("Error in createOrUpdateActividad:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving activity.");
  }
});

export const deleteActividad = https.onCall(async (data, context) => {
  requireLevel(context, "delete activities");

  const actividadId = toNumber(data?.id, -1);
  if (actividadId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const deleted = await dataConnect.executeGraphql<{ actividad_delete: unknown }, { id: number }>(
      DELETE_ACTIVIDAD_MUTATION,
      { variables: { id: actividadId } },
    );

    return { id: getIdFromKeyOutput(deleted.data.actividad_delete) ?? actividadId };
  } catch (error) {
    console.error("Error in deleteActividad:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting activity.");
  }
});
