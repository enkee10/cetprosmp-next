import { https } from "firebase-functions/v1";
import {
  buildActividadDataFromInput,
  buildAprendizajeDataFromInput,
  buildCapacidadTerminalDataFromInput,
  buildGrupoModuloUnidadDidacticaDataFromInput,
  buildIndicadorCapacidadDataFromInput,
  buildModuloDataFromInput,
  buildUnidadDidacticaDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { getRequesterRoleId, requireAuthenticated, requirePermission } from "../core/permissions.js";
import {
  DataConnectActividad,
  DataConnectActividadInput,
  DataConnectAprendizaje,
  DataConnectAprendizajeInput,
  DataConnectCapacidadTerminal,
  DataConnectCapacidadTerminalInput,
  DataConnectGrupoModulo,
  DataConnectGrupoModuloUnidadDidactica,
  DataConnectGrupoModuloUnidadDidacticaInput,
  DataConnectIndicadorCapacidad,
  DataConnectIndicadorCapacidadInput,
  DataConnectModulo,
  DataConnectModuloInput,
  DataConnectPlanModulo,
  DataConnectPlanModuloInput,
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
  DELETE_INDICADORES_CAPACIDAD_BY_CAPACIDAD_MUTATION,
  DELETE_PLAN_MODULO_MUTATION,
  DELETE_PLAN_MODULO_RELATION_MUTATION,
  DELETE_UNIDAD_DIDACTICA_MUTATION,
  DELETE_UNIDAD_DIDACTICA_MODULO_RELATION_MUTATION,
  DELETE_UNIDAD_DIDACTICA_MODULOS_BY_UNIDAD_MUTATION,
  INSERT_ACTIVIDAD_MUTATION,
  INSERT_APRENDIZAJE_MUTATION,
  INSERT_CAPACIDAD_TERMINAL_MUTATION,
  INSERT_GRUPO_MODULO_UNIDAD_DIDACTICA_MUTATION,
  INSERT_INDICADOR_CAPACIDAD_MUTATION,
  INSERT_MODULO_MUTATION,
  INSERT_PLAN_MODULO_MUTATION,
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
      comun
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
      comun
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
      comun
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
    planModulos(limit: 5000, orderBy: [{ moduloId: ASC }, { orden: ASC }, { planId: ASC }]) {
      id
      orden
      planId
      moduloId
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
      comun
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

const LIST_ESTRUCTURA_ACADEMICA_DOCENTE_QUERY = `
  query ListEstructuraAcademicaDocente($uid: String!) {
    users(where: { documentId: { eq: $uid } }, limit: 1) {
      id
    }
    personals(limit: 10000) {
      id
      userId
    }
    semestres(limit: 500) {
      id
      titulo
      inicio
      fin
    }
    grupoModulos(limit: 5000, orderBy: [{ orden: ASC }, { id: ASC }]) {
      id
      moduloId
      orden
      grupo {
        id
        personalId
        semestre {
          id
          titulo
          inicio
          fin
        }
      }
      modulo {
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
        comun
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
    }
    planModulos(limit: 5000, orderBy: [{ moduloId: ASC }, { orden: ASC }, { planId: ASC }]) {
      id
      orden
      planId
      moduloId
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
      comun
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

const GET_ESTRUCTURA_ACADEMICA_DOCENTE_MENU_QUERY = `
  query GetEstructuraAcademicaDocenteMenu($uid: String!) {
    users(where: { documentId: { eq: $uid } }, limit: 1) {
      id
    }
    personals(limit: 10000) {
      id
      userId
    }
    semestres(limit: 500) {
      id
      titulo
      inicio
      fin
    }
    grupoModulos(limit: 5000) {
      id
      grupo {
        personalId
        semestre {
          titulo
          inicio
          fin
        }
      }
    }
  }
`;

const LIST_PLAN_MODULO_RELATIONS_BY_PLAN_QUERY = `
  query ListPlanModuloRelationsByPlan($planId: Int!) {
    planModulos(where: { planId: { eq: $planId } }, limit: 1000) {
      id
      orden
      planId
      moduloId
    }
  }
`;

const LIST_UNIDAD_RELATIONS_BY_MODULO_QUERY = `
  query ListUnidadRelationsByModulo($moduloId: Int!) {
    unidadDidacticaModulos(where: { moduloId: { eq: $moduloId } }, limit: 1000) {
      id
      orden
      moduloId
      unidadDidacticaId
    }
  }
`;

const LIST_GRUPO_MODULO_UNIDAD_SYNC_QUERY = `
  query ListGrupoModuloUnidadSync($moduloId: Int!, $unidadDidacticaId: Int!) {
    grupoModulos(where: { moduloId: { eq: $moduloId } }, limit: 5000) {
      id
      moduloId
    }
    grupoModuloUnidadesDidacticas(where: { unidadDidacticaId: { eq: $unidadDidacticaId } }, limit: 5000) {
      grupoModuloId
      unidadDidacticaId
    }
  }
`;

interface EstructuraAcademicaQueryResponse {
  modulos: EstructuraModulo[];
  planModulos: DataConnectPlanModulo[];
  unidadDidacticaModulos: DataConnectUnidadDidacticaModulo[];
  unidadesDidacticas: DataConnectUnidadDidactica[];
  capacidadesTerminales: DataConnectCapacidadTerminal[];
  indicadoresCapacidad: DataConnectIndicadorCapacidad[];
}

type EstructuraAcademicaSemestreOption = {
  id: number;
  titulo?: string | null;
  inicio?: string | null;
  fin?: string | null;
};

type EstructuraAcademicaDocenteGrupoModulo = {
  id: number;
  moduloId: number;
  orden?: number | null;
  grupo?: {
    id?: number | null;
    personalId?: number | null;
    semestre?: EstructuraAcademicaSemestreOption | null;
  } | null;
  modulo?: EstructuraModulo | null;
};

type EstructuraAcademicaActionEntity = "modulo" | "unidadDidactica" | "capacidadTerminal" | "indicadorCapacidad";
const TEACHER_ROLE_ID = 4;

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

function normalizeAcademicText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function matchesSemestreTitulo(value: string | null | undefined, expected: string) {
  return normalizeAcademicText(value) === normalizeAcademicText(expected);
}

function toTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function resolveSemestreTituloVigente(
  semestres: EstructuraAcademicaSemestreOption[],
  requestedTitulo?: string | null,
) {
  const explicitTitulo = String(requestedTitulo ?? "").trim();
  if (explicitTitulo) return explicitTitulo;

  const now = Date.now();
  const datedSemestres = semestres
    .map((semestre) => ({
      semestre,
      inicio: toTimestamp(semestre.inicio),
      fin: toTimestamp(semestre.fin),
    }))
    .filter((item) => item.semestre.titulo);

  const active = datedSemestres
    .filter((item) =>
      (item.inicio != null || item.fin != null) &&
      (item.inicio == null || item.inicio <= now) &&
      (item.fin == null || item.fin >= now),
    )
    .sort((a, b) => (b.inicio ?? 0) - (a.inicio ?? 0))[0]?.semestre.titulo;
  if (active) return active;

  const lastStarted = datedSemestres
    .filter((item) => item.inicio != null && item.inicio <= now)
    .sort((a, b) => (b.inicio ?? 0) - (a.inicio ?? 0))[0]?.semestre.titulo;
  if (lastStarted) return lastStarted;

  return semestres
    .slice()
    .sort((a, b) =>
      String(b.titulo ?? "").localeCompare(String(a.titulo ?? ""), "es", { numeric: true }) ||
      b.id - a.id,
    )[0]?.titulo ?? "";
}

function getSemestreCodigo(titulo: string | null | undefined) {
  const text = String(titulo ?? "").trim();
  return text.length <= 4 ? text : text.slice(-4);
}

function buildEstructuraAcademicaDocenteTitle(semestreTitulo: string | null | undefined) {
  return ["Estructura Academica", getSemestreCodigo(semestreTitulo)].filter(Boolean).join(" ");
}

function getPersonalIdsForUserId(
  userId: number | null | undefined,
  personals: Array<{ id: number; userId?: number | null }>,
) {
  if (!userId) return new Set<number>();
  return new Set(
    personals
      .filter((personal) => personal.userId === userId)
      .map((personal) => personal.id),
  );
}

function requireDocenteEstructuraAcademica(context: https.CallableContext) {
  requireAuthenticated(context);
  if (getRequesterRoleId(context) !== TEACHER_ROLE_ID) {
    throw new https.HttpsError("permission-denied", "Esta vista es solo para docentes.");
  }
}

function attachPlanRelationsToModulo(
  modulo: EstructuraModulo,
  relationsByModuloId: Map<number, DataConnectPlanModulo[]>,
) {
  const relations = sortPlanModuloRelations(relationsByModuloId.get(modulo.id) ?? []);
  const primary = relations[0] ?? null;
  const legacyPlanIds = modulo.planId != null ? [modulo.planId] : [];
  const planIds = relations.length > 0
    ? relations.map((relation) => relation.planId)
    : legacyPlanIds;

  return {
    ...modulo,
    comun: modulo.comun ?? planIds.length > 1,
    planId: primary?.planId ?? modulo.planId ?? null,
    plan: primary?.plan ?? modulo.plan ?? null,
    planIds,
    planModulos: relations,
  };
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
        comun: unidad.comun ?? false,
        capacidadesTerminales: buildCapacidadesForUnidad(
          unidad.id,
          capacidadesByUnidadId,
          indicadoresByCapacidadId,
        ),
      }
    })
    .filter(Boolean);
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
    comun: "boolean",
  },
  unidadDidactica: {
    nombre: "text",
    duracion: "number",
    creditos: "number",
    sigla: "text",
    comun: "boolean",
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
  await requirePermission(context, "estructura-academica", "edit");

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
  const planRelationsByModuloId = groupByNumber(response.planModulos ?? [], (relation) => relation.moduloId);
  const relationsByModuloId = groupByNumber(response.unidadDidacticaModulos ?? [], (relation) => relation.moduloId);
  const capacidadesByUnidadId = groupByNumber(
    response.capacidadesTerminales ?? [],
    (capacidad) => capacidad.unidadDidacticaId,
  );
  const indicadoresByCapacidadId = groupByNumber(
    response.indicadoresCapacidad ?? [],
    (indicador) => indicador.capacidadTerminalId,
  );

  return (response.modulos ?? []).map((modulo) => {
    const moduloWithPlan = attachPlanRelationsToModulo(modulo, planRelationsByModuloId);
    return {
      id: moduloWithPlan.id,
      titulo: moduloWithPlan.titulo ?? null,
      tituloComercial: moduloWithPlan.tituloComercial ?? null,
      orden: moduloWithPlan.orden ?? null,
      descripcion: moduloWithPlan.descripcion ?? null,
      horas: moduloWithPlan.horas ?? null,
      creditos: moduloWithPlan.creditos ?? null,
      metas: moduloWithPlan.metas ?? null,
      activo: moduloWithPlan.activo ?? null,
      slug: moduloWithPlan.slug ?? null,
      comun: moduloWithPlan.comun ?? false,
      planModuloId: moduloWithPlan.planModulos[0]?.id ?? null,
      planId: moduloWithPlan.planId ?? null,
      plan: moduloWithPlan.plan ?? null,
      planIds: moduloWithPlan.planIds,
      planModulos: moduloWithPlan.planModulos,
      unidadesDidacticas: buildUnidadesForModulo(
        moduloWithPlan.id,
        relationsByModuloId,
        unidadesById,
        capacidadesByUnidadId,
        indicadoresByCapacidadId,
      ),
    };
  });
}

function buildEstructuraAcademicaOpciones(response: EstructuraAcademicaQueryResponse) {
  const planRelationsByModuloId = groupByNumber(response.planModulos ?? [], (relation) => relation.moduloId);
  const unidadRelationsByUnidadId = groupByNumber(response.unidadDidacticaModulos ?? [], (relation) => relation.unidadDidacticaId);

  const modulosComunes = (response.modulos ?? [])
    .map((modulo) => attachPlanRelationsToModulo(modulo, planRelationsByModuloId))
    .filter((modulo) => Boolean(modulo.comun))
    .map((modulo) => ({
      id: modulo.id,
      titulo: modulo.titulo ?? null,
      tituloComercial: modulo.tituloComercial ?? null,
      planIds: modulo.planIds ?? [],
    }))
    .sort((a, b) => String(a.tituloComercial || a.titulo || "").localeCompare(String(b.tituloComercial || b.titulo || ""), "es"));

  const unidadesComunes = (response.unidadesDidacticas ?? [])
    .filter((unidad) => Boolean(unidad.comun))
    .map((unidad) => ({
      id: unidad.id,
      nombre: unidad.nombre ?? null,
      sigla: unidad.sigla ?? null,
      moduloIds: (unidadRelationsByUnidadId.get(unidad.id) ?? []).map((relation) => relation.moduloId),
    }))
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));

  return { modulosComunes, unidadesComunes };
}

function nextOrder(values: Array<number | null | undefined>) {
  const max = values.reduce<number>((current, value) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return current;
    return Math.max(current, value);
  }, 0);
  return max + 1;
}

export const listEstructuraAcademica = https.onCall(async (_data, context) => {
  await requirePermission(context, "estructura-academica", "view");

  try {
    const response = await dataConnect.executeGraphql<
      EstructuraAcademicaQueryResponse,
      Record<string, never>
    >(LIST_ESTRUCTURA_ACADEMICA_QUERY);

    return {
      modulos: buildEstructuraAcademica(response.data),
      opciones: buildEstructuraAcademicaOpciones(response.data),
    };
  } catch (error) {
    console.error("Error in listEstructuraAcademica:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing academic structure.");
  }
});

export const listEstructuraAcademicaDocente = https.onCall(async (data, context) => {
  requireDocenteEstructuraAcademica(context);

  const uid = context.auth?.uid;
  const requestedSemestreTitulo = String(data?.semestreTitulo ?? "").trim();
  if (!uid) {
    throw new https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  try {
    const response = await dataConnect.executeGraphql<{
      users: Array<{ id: number }>;
      personals: Array<{ id: number; userId?: number | null }>;
      semestres: EstructuraAcademicaSemestreOption[];
      grupoModulos: EstructuraAcademicaDocenteGrupoModulo[];
      planModulos: DataConnectPlanModulo[];
      unidadDidacticaModulos: DataConnectUnidadDidacticaModulo[];
      unidadesDidacticas: DataConnectUnidadDidactica[];
      capacidadesTerminales: DataConnectCapacidadTerminal[];
      indicadoresCapacidad: DataConnectIndicadorCapacidad[];
    }, { uid: string }>(
      LIST_ESTRUCTURA_ACADEMICA_DOCENTE_QUERY,
      { variables: { uid } },
    );

    const semestreTitulo = resolveSemestreTituloVigente(response.data.semestres ?? [], requestedSemestreTitulo);
    const personalIds = getPersonalIdsForUserId(response.data.users?.[0]?.id, response.data.personals ?? []);
    const docenteGrupoModulos = (response.data.grupoModulos ?? [])
      .filter((item) =>
        Boolean(item.grupo?.personalId && personalIds.has(item.grupo.personalId)) &&
        matchesSemestreTitulo(item.grupo?.semestre?.titulo, semestreTitulo),
      )
      .sort((a, b) =>
        (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER) ||
        a.moduloId - b.moduloId ||
        a.id - b.id,
      );

    const moduloById = new Map<number, EstructuraModulo>();
    for (const item of docenteGrupoModulos) {
      if (!item.modulo) continue;
      if (!moduloById.has(item.moduloId)) {
        moduloById.set(item.moduloId, item.modulo);
      }
    }
    const moduloIds = new Set(moduloById.keys());
    const estructuraResponse: EstructuraAcademicaQueryResponse = {
      modulos: Array.from(moduloById.values()),
      planModulos: (response.data.planModulos ?? []).filter((relation) => moduloIds.has(relation.moduloId)),
      unidadDidacticaModulos: (response.data.unidadDidacticaModulos ?? [])
        .filter((relation) => moduloIds.has(relation.moduloId)),
      unidadesDidacticas: response.data.unidadesDidacticas ?? [],
      capacidadesTerminales: response.data.capacidadesTerminales ?? [],
      indicadoresCapacidad: response.data.indicadoresCapacidad ?? [],
    };
    const title = buildEstructuraAcademicaDocenteTitle(semestreTitulo);

    return {
      modulos: buildEstructuraAcademica(estructuraResponse),
      opciones: { modulosComunes: [], unidadesComunes: [] },
      semestreTitulo,
      title,
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in listEstructuraAcademicaDocente:", error);
    throw new https.HttpsError("internal", "No se pudo cargar la estructura academica del docente.");
  }
});

export const getEstructuraAcademicaDocenteMenu = https.onCall(async (_data, context) => {
  requireDocenteEstructuraAcademica(context);

  const uid = context.auth?.uid;
  if (!uid) {
    throw new https.HttpsError("unauthenticated", "Debes iniciar sesion.");
  }

  try {
    const response = await dataConnect.executeGraphql<{
      users: Array<{ id: number }>;
      personals: Array<{ id: number; userId?: number | null }>;
      semestres: EstructuraAcademicaSemestreOption[];
      grupoModulos: Array<{
        id: number;
        grupo?: {
          personalId?: number | null;
          semestre?: EstructuraAcademicaSemestreOption | null;
        } | null;
      }>;
    }, { uid: string }>(
      GET_ESTRUCTURA_ACADEMICA_DOCENTE_MENU_QUERY,
      { variables: { uid } },
    );

    const semestreTitulo = resolveSemestreTituloVigente(response.data.semestres ?? []);
    const personalIds = getPersonalIdsForUserId(response.data.users?.[0]?.id, response.data.personals ?? []);
    const hasModulos = (response.data.grupoModulos ?? []).some((item) =>
      Boolean(item.grupo?.personalId && personalIds.has(item.grupo.personalId)) &&
      matchesSemestreTitulo(item.grupo?.semestre?.titulo, semestreTitulo),
    );

    return {
      title: buildEstructuraAcademicaDocenteTitle(semestreTitulo),
      semestreTitulo,
      hasModulos,
    };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in getEstructuraAcademicaDocenteMenu:", error);
    throw new https.HttpsError("internal", "No se pudo cargar el menu de estructura academica del docente.");
  }
});

function parseEstructuraActionEntity(value: unknown): EstructuraAcademicaActionEntity {
  const entity = String(value ?? "");
  if (["modulo", "unidadDidactica", "capacidadTerminal", "indicadorCapacidad"].includes(entity)) {
    return entity as EstructuraAcademicaActionEntity;
  }
  throw new https.HttpsError("invalid-argument", "Entidad no soportada.");
}

async function nextPlanModuloOrder(planId: number) {
  const response = await dataConnect.executeGraphql<
    { planModulos: DataConnectPlanModulo[] },
    { planId: number }
  >(LIST_PLAN_MODULO_RELATIONS_BY_PLAN_QUERY, { variables: { planId } });
  return nextOrder((response.data.planModulos ?? []).map((relation) => relation.orden));
}

async function nextUnidadModuloOrder(moduloId: number) {
  const response = await dataConnect.executeGraphql<
    { unidadDidacticaModulos: DataConnectUnidadDidacticaModulo[] },
    { moduloId: number }
  >(LIST_UNIDAD_RELATIONS_BY_MODULO_QUERY, { variables: { moduloId } });
  return nextOrder((response.data.unidadDidacticaModulos ?? []).map((relation) => relation.orden));
}

async function syncUnidadDidacticaToExistingGrupoModulos(
  moduloId: number,
  unidadDidacticaId: number,
  orden: number | null | undefined,
) {
  const response = await dataConnect.executeGraphql<
    {
      grupoModulos: Pick<DataConnectGrupoModulo, "id" | "moduloId">[];
      grupoModuloUnidadesDidacticas: Array<Pick<
        DataConnectGrupoModuloUnidadDidactica,
        "grupoModuloId" | "unidadDidacticaId"
      >>;
    },
    { moduloId: number; unidadDidacticaId: number }
  >(LIST_GRUPO_MODULO_UNIDAD_SYNC_QUERY, { variables: { moduloId, unidadDidacticaId } });

  const grupoModuloIds = (response.data.grupoModulos ?? [])
    .filter((grupoModulo) => grupoModulo.moduloId === moduloId)
    .map((grupoModulo) => grupoModulo.id);
  const existing = new Set(
    (response.data.grupoModuloUnidadesDidacticas ?? [])
      .filter((item) => item.unidadDidacticaId === unidadDidacticaId)
      .map((item) => item.grupoModuloId),
  );
  const missingGrupoModuloIds = grupoModuloIds.filter((grupoModuloId) => !existing.has(grupoModuloId));

  await Promise.all(
    missingGrupoModuloIds.map((grupoModuloId) => {
      const data = buildGrupoModuloUnidadDidacticaDataFromInput({
        grupoModuloId,
        unidadDidacticaId,
        orden,
      });
      return dataConnect.executeGraphql<
        { grupoModuloUnidadDidactica_insert: unknown },
        { data: DataConnectGrupoModuloUnidadDidacticaInput }
      >(INSERT_GRUPO_MODULO_UNIDAD_DIDACTICA_MUTATION, { variables: { data } });
    }),
  );
}

export const createEstructuraAcademicaItem = https.onCall(async (data, context) => {
  await requirePermission(context, "estructura-academica", "create");

  const entity = parseEstructuraActionEntity(data?.entity);

  try {
    if (entity === "modulo") {
      const planId = toNumber(data?.planId, -1);
      if (planId <= 0) throw new https.HttpsError("invalid-argument", "planId is required.");
      const orden = await nextPlanModuloOrder(planId);
      const payload = buildModuloDataFromInput({
        titulo: data?.titulo ?? "Nuevo modulo",
        tituloComercial: data?.tituloComercial ?? data?.titulo ?? "Nuevo modulo",
        orden,
        activo: true,
        comun: false,
        planId,
      });
      const created = await dataConnect.executeGraphql<
        { modulo_insert: unknown },
        { data: DataConnectModuloInput }
      >(INSERT_MODULO_MUTATION, { variables: { data: payload } });
      const moduloId = getIdFromKeyOutput(created.data.modulo_insert);
      if (!moduloId) throw new Error("No se pudo obtener el id del modulo creado.");
      await dataConnect.executeGraphql<
        { planModulo_insert: unknown },
        { data: DataConnectPlanModuloInput }
      >(INSERT_PLAN_MODULO_MUTATION, { variables: { data: { planId, moduloId, orden } } });
      return { id: moduloId };
    }

    if (entity === "unidadDidactica") {
      const moduloId = toNumber(data?.moduloId, -1);
      if (moduloId <= 0) throw new https.HttpsError("invalid-argument", "moduloId is required.");
      const orden = await nextUnidadModuloOrder(moduloId);
      const payload = buildUnidadDidacticaDataFromInput({
        nombre: data?.nombre ?? "Nueva unidad didactica",
        comun: false,
      });
      const created = await dataConnect.executeGraphql<
        { unidadDidactica_insert: unknown },
        { data: DataConnectUnidadDidacticaInput }
      >(INSERT_UNIDAD_DIDACTICA_MUTATION, { variables: { data: payload } });
      const unidadDidacticaId = getIdFromKeyOutput(created.data.unidadDidactica_insert);
      if (!unidadDidacticaId) throw new Error("No se pudo obtener el id de la unidad didactica creada.");
      await dataConnect.executeGraphql<
        { unidadDidacticaModulo_insert: unknown },
        { data: DataConnectUnidadDidacticaModuloInput }
      >(INSERT_UNIDAD_DIDACTICA_MODULO_MUTATION, { variables: { data: { unidadDidacticaId, moduloId, orden } } });
      await syncUnidadDidacticaToExistingGrupoModulos(moduloId, unidadDidacticaId, orden);
      return { id: unidadDidacticaId };
    }

    if (entity === "capacidadTerminal") {
      const unidadDidacticaId = toNumber(data?.unidadDidacticaId, -1);
      if (unidadDidacticaId <= 0) throw new https.HttpsError("invalid-argument", "unidadDidacticaId is required.");
      const payload = buildCapacidadTerminalDataFromInput({
        descripcion: data?.descripcion ?? "Nueva capacidad terminal",
        unidadDidacticaId,
      });
      const created = await dataConnect.executeGraphql<
        { capacidadTerminal_insert: unknown },
        { data: DataConnectCapacidadTerminalInput }
      >(INSERT_CAPACIDAD_TERMINAL_MUTATION, { variables: { data: payload } });
      return { id: getIdFromKeyOutput(created.data.capacidadTerminal_insert) };
    }

    const capacidadTerminalId = toNumber(data?.capacidadTerminalId, -1);
    if (capacidadTerminalId <= 0) throw new https.HttpsError("invalid-argument", "capacidadTerminalId is required.");
    const payload = buildIndicadorCapacidadDataFromInput({
      descripcion: data?.descripcion ?? "Nuevo indicador",
      capacidadTerminalId,
    });
    const created = await dataConnect.executeGraphql<
      { indicadorCapacidad_insert: unknown },
      { data: DataConnectIndicadorCapacidadInput }
    >(INSERT_INDICADOR_CAPACIDAD_MUTATION, { variables: { data: payload } });
    return { id: getIdFromKeyOutput(created.data.indicadorCapacidad_insert) };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in createEstructuraAcademicaItem:", error);
    throw new https.HttpsError("internal", "No se pudo crear el elemento academico.");
  }
});

export const reuseEstructuraAcademicaItem = https.onCall(async (data, context) => {
  await requirePermission(context, "estructura-academica", "edit");

  const entity = parseEstructuraActionEntity(data?.entity);

  try {
    if (entity === "modulo") {
      const planId = toNumber(data?.planId, -1);
      const moduloId = toNumber(data?.moduloId, -1);
      if (planId <= 0 || moduloId <= 0) throw new https.HttpsError("invalid-argument", "planId and moduloId are required.");
      const orden = await nextPlanModuloOrder(planId);
      await dataConnect.executeGraphql<
        { planModulo_insert: unknown },
        { data: DataConnectPlanModuloInput }
      >(INSERT_PLAN_MODULO_MUTATION, { variables: { data: { planId, moduloId, orden } } });
      await dataConnect.executeGraphql<
        { modulo_update: unknown },
        { id: number; data: DataConnectModuloInput }
      >(UPDATE_MODULO_MUTATION, { variables: { id: moduloId, data: { comun: true } } });
      return { id: moduloId };
    }

    if (entity === "unidadDidactica") {
      const moduloId = toNumber(data?.moduloId, -1);
      const unidadDidacticaId = toNumber(data?.unidadDidacticaId, -1);
      if (moduloId <= 0 || unidadDidacticaId <= 0) {
        throw new https.HttpsError("invalid-argument", "moduloId and unidadDidacticaId are required.");
      }
      const orden = await nextUnidadModuloOrder(moduloId);
      await dataConnect.executeGraphql<
        { unidadDidacticaModulo_insert: unknown },
        { data: DataConnectUnidadDidacticaModuloInput }
      >(INSERT_UNIDAD_DIDACTICA_MODULO_MUTATION, { variables: { data: { unidadDidacticaId, moduloId, orden } } });
      await syncUnidadDidacticaToExistingGrupoModulos(moduloId, unidadDidacticaId, orden);
      await dataConnect.executeGraphql<
        { unidadDidactica_update: unknown },
        { id: number; data: DataConnectUnidadDidacticaInput }
      >(UPDATE_UNIDAD_DIDACTICA_MUTATION, { variables: { id: unidadDidacticaId, data: { comun: true } } });
      return { id: unidadDidacticaId };
    }

    throw new https.HttpsError("invalid-argument", "Solo modulo y unidad didactica se pueden reutilizar.");
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in reuseEstructuraAcademicaItem:", error);
    throw new https.HttpsError("internal", "No se pudo reutilizar el elemento academico.");
  }
});

export const detachEstructuraAcademicaItem = https.onCall(async (data, context) => {
  await requirePermission(context, "estructura-academica", "delete");

  const entity = parseEstructuraActionEntity(data?.entity);

  try {
    if (entity === "modulo") {
      const relacionId = toNumber(data?.relacionId, -1);
      const planId = toNumber(data?.planId, -1);
      const moduloId = toNumber(data?.moduloId, -1);
      if (relacionId > 0) {
        await dataConnect.executeGraphql<
          { planModulo_delete: unknown },
          { id: number }
        >(DELETE_PLAN_MODULO_MUTATION, { variables: { id: relacionId } });
        return { id: relacionId };
      }
      if (planId <= 0 || moduloId <= 0) throw new https.HttpsError("invalid-argument", "relacionId or planId and moduloId are required.");
      await dataConnect.executeGraphql<
        { planModulo_deleteMany: number },
        { planId: number; moduloId: number }
      >(DELETE_PLAN_MODULO_RELATION_MUTATION, { variables: { planId, moduloId } });
      return { id: moduloId };
    }

    if (entity === "unidadDidactica") {
      const relacionId = toNumber(data?.relacionId, -1);
      if (relacionId <= 0) throw new https.HttpsError("invalid-argument", "relacionId is required.");
      await dataConnect.executeGraphql<
        { unidadDidacticaModulo_delete: unknown },
        { id: number }
      >(DELETE_UNIDAD_DIDACTICA_MODULO_RELATION_MUTATION, { variables: { id: relacionId } });
      return { id: relacionId };
    }

    if (entity === "capacidadTerminal") {
      const capacidadTerminalId = toNumber(data?.capacidadTerminalId, -1);
      if (capacidadTerminalId <= 0) throw new https.HttpsError("invalid-argument", "capacidadTerminalId is required.");
      await dataConnect.executeGraphql<
        { indicadorCapacidad_deleteMany: number },
        { capacidadTerminalId: number }
      >(DELETE_INDICADORES_CAPACIDAD_BY_CAPACIDAD_MUTATION, { variables: { capacidadTerminalId } });
      await dataConnect.executeGraphql<
        { capacidadTerminal_delete: unknown },
        { id: number }
      >(DELETE_CAPACIDAD_TERMINAL_MUTATION, { variables: { id: capacidadTerminalId } });
      return { id: capacidadTerminalId };
    }

    const indicadorCapacidadId = toNumber(data?.indicadorCapacidadId, -1);
    if (indicadorCapacidadId <= 0) throw new https.HttpsError("invalid-argument", "indicadorCapacidadId is required.");
    await dataConnect.executeGraphql<
      { indicadorCapacidad_delete: unknown },
      { id: number }
    >(DELETE_INDICADOR_CAPACIDAD_MUTATION, { variables: { id: indicadorCapacidadId } });
    return { id: indicadorCapacidadId };
  } catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error in detachEstructuraAcademicaItem:", error);
    throw new https.HttpsError("internal", "No se pudo quitar el elemento academico.");
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
  await requirePermission(context, "unidades-didacticas", "view");

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
  await requirePermission(context, "unidades-didacticas", "view");

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
  const payload = buildUnidadDidacticaDataFromInput(data as Record<string, unknown>);
  const moduloIds = parseModuloIds((data as Record<string, unknown>).moduloIds ?? data?.moduloId);
  if (!payload.nombre) {
    throw new https.HttpsError("invalid-argument", "nombre is required.");
  }
  if (moduloIds.length === 0) {
    throw new https.HttpsError("invalid-argument", "At least one moduloId is required.");
  }

  const unidadDidacticaId = toNumberOrNull(data?.id);
  await requirePermission(context, "unidades-didacticas", unidadDidacticaId ? "edit" : "create");

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
  await requirePermission(context, "unidades-didacticas", "delete");

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
  await requirePermission(context, "capacidades-terminales", "view");

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
  await requirePermission(context, "capacidades-terminales", "view");

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
  const payload = buildCapacidadTerminalDataFromInput(data as Record<string, unknown>);
  if (!payload.descripcion) {
    throw new https.HttpsError("invalid-argument", "descripcion is required.");
  }
  if (!payload.unidadDidacticaId) {
    throw new https.HttpsError("invalid-argument", "unidadDidacticaId is required.");
  }

  const capacidadTerminalId = toNumberOrNull(data?.id);
  await requirePermission(context, "capacidades-terminales", capacidadTerminalId ? "edit" : "create");

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
  await requirePermission(context, "capacidades-terminales", "delete");

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
  await requirePermission(context, "indicadores-capacidad", "view");

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
  await requirePermission(context, "indicadores-capacidad", "view");

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
  const payload = buildIndicadorCapacidadDataFromInput(data as Record<string, unknown>);
  if (!payload.descripcion) {
    throw new https.HttpsError("invalid-argument", "descripcion is required.");
  }
  if (!payload.capacidadTerminalId) {
    throw new https.HttpsError("invalid-argument", "capacidadTerminalId is required.");
  }

  const indicadorCapacidadId = toNumberOrNull(data?.id);
  await requirePermission(context, "indicadores-capacidad", indicadorCapacidadId ? "edit" : "create");

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
  await requirePermission(context, "indicadores-capacidad", "delete");

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
  await requirePermission(context, "aprendizajes", "view");

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
  await requirePermission(context, "aprendizajes", "view");

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
  const payload = buildAprendizajeDataFromInput(data as Record<string, unknown>);
  if (!payload.descripcion) {
    throw new https.HttpsError("invalid-argument", "descripcion is required.");
  }
  if (!payload.indicadorCapacidadId) {
    throw new https.HttpsError("invalid-argument", "indicadorCapacidadId is required.");
  }

  const aprendizajeId = toNumberOrNull(data?.id);
  await requirePermission(context, "aprendizajes", aprendizajeId ? "edit" : "create");

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
  await requirePermission(context, "aprendizajes", "delete");

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
  await requirePermission(context, "actividades", "view");

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
  await requirePermission(context, "actividades", "view");

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
  const payload = buildActividadDataFromInput(data as Record<string, unknown>);
  if (!payload.nombre) {
    throw new https.HttpsError("invalid-argument", "nombre is required.");
  }
  if (!payload.aprendizajeId) {
    throw new https.HttpsError("invalid-argument", "aprendizajeId is required.");
  }

  const actividadId = toNumberOrNull(data?.id);
  await requirePermission(context, "actividades", actividadId ? "edit" : "create");

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
  await requirePermission(context, "actividades", "delete");

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
