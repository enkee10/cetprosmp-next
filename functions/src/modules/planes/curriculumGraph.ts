import { dataConnect } from "../core/dataConnectCore.js";

export type CurriculumRow = { id: number; [field: string]: unknown };
export const PLAN_FIELDS = "duracion creditos tituloComercial slug descripcion2 imagenPortadaUrl planEstudio periodoCaducidad resolucionTipo nro anio genera carreraId periodoVigenciaId versionId";
export const MODULE_FIELDS = "titulo tituloComercial orden descripcion descripcion2 horas creditos duracionEfsrt creditosEfsrt metas activo slug comun carreraId";
export const UNIT_FIELDS = "nombre duracion creditos horasTeoricas horasPracticas creditosTeoricos creditosPracticos sigla";
export const ACTIVITY_FIELDS = "nombre numeroSesion orden descripcion proposito ambiente duracion fecha bibliografia ejeTransversalId valorInstitucionalId";
export interface CurriculumGraph {
  modulos: CurriculumRow[];
  planModulos: CurriculumRow[];
  competencias: CurriculumRow[];
  relaciones: CurriculumRow[];
  unidades: CurriculumRow[];
  capacidades: CurriculumRow[];
  indicadores: CurriculumRow[];
  aprendizajes: CurriculumRow[];
  actividades: CurriculumRow[];
  contenidos: CurriculumRow[];
  materiales: CurriculumRow[];
}

// Query by parent IDs, and fail rather than silently cloning a truncated catalog.
async function rows(table: string, fields: string, filter: string): Promise<CurriculumRow[]> {
  const response = await dataConnect.executeGraphql<{ rows: CurriculumRow[] }, Record<string, never>>(
    `query CurriculumRows { rows:${table}(where:${filter},limit:50000) { id ${fields} } }`,
  );
  if (response.data.rows.length === 50000) throw new Error("El contenido curricular supera el limite de lectura.");
  return response.data.rows;
}
const ids = (items: CurriculumRow[]) => items.map(item => item.id);
const by = (field: string, values: number[]) => `{${field}:{in:${JSON.stringify(values)}}}`;

export async function readCurriculumGraph(planId: number, includeSessions = false): Promise<CurriculumGraph> {
  const [legacy, planModulos] = await Promise.all([
    rows("modulos", "", `{planId:{eq:${planId}}}`),
    rows("planModulos", "moduloId orden", `{planId:{eq:${planId}}}`),
  ]);
  const moduleIds = [...new Set([...ids(legacy), ...planModulos.map(item => Number(item.moduloId))])];
  const empty: CurriculumGraph = { modulos: [], planModulos, competencias: [], relaciones: [], unidades: [], capacidades: [], indicadores: [], aprendizajes: [], actividades: [], contenidos: [], materiales: [] };
  if (!moduleIds.length) return empty;
  const [modulos, competencias] = await Promise.all([
    rows("modulos", MODULE_FIELDS, by("id", moduleIds)),
    rows("competencias", "nombre tipo orden moduloId", by("moduloId", moduleIds)),
  ]);
  const relaciones = competencias.length ? await rows("competenciaUnidadesDidacticas", "competenciaId unidadDidacticaId orden", by("competenciaId", ids(competencias))) : [];
  const unitIds = [...new Set(relaciones.map(item => Number(item.unidadDidacticaId)))];
  const [unidades, capacidades] = unitIds.length ? await Promise.all([
    rows("unidadesDidacticas", UNIT_FIELDS, by("id", unitIds)),
    rows("capacidadesTerminales", "descripcion sigla orden unidadDidacticaId", by("unidadDidacticaId", unitIds)),
  ]) : [[], []];
  const indicadores = capacidades.length ? await rows("indicadoresCapacidad", "descripcion sigla orden capacidadTerminalId", by("capacidadTerminalId", ids(capacidades))) : [];
  const graph = { ...empty, modulos, competencias, relaciones, unidades, capacidades, indicadores };
  if (!includeSessions || !indicadores.length) return graph;
  graph.aprendizajes = await rows("aprendizajes", "orden descripcion sigla indicadorCapacidadId", by("indicadorCapacidadId", ids(indicadores)));
  if (!graph.aprendizajes.length) return graph;
  graph.actividades = (await rows("actividads", `${ACTIVITY_FIELDS} moduloId aprendizajeId`, by("aprendizajeId", ids(graph.aprendizajes))))
    .filter(item => item.moduloId == null || moduleIds.includes(Number(item.moduloId)));
  if (graph.actividades.length) {
    [graph.contenidos, graph.materiales] = await Promise.all([
      rows("actividadContenidos", "texto orden actividadId", by("actividadId", ids(graph.actividades))),
      rows("actividadMateriales", "texto orden actividadId materialId", by("actividadId", ids(graph.actividades))),
    ]);
  }
  return graph;
}
