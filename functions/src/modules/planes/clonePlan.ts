import { dataConnect } from "../core/dataConnectCore.js";
import { DataConnectPlanInput } from "../core/types.js";
import { ACTIVITY_FIELDS, CurriculumRow, MODULE_FIELDS, PLAN_FIELDS, readCurriculumGraph, UNIT_FIELDS } from "./curriculumGraph.js";
import { ensurePlanSelection, graphSelection, listSelectionSemesters, semesterOrder, PlanSelection } from "./periodSelection.js";
import { plansAllowingPeriodSelection } from "./visibilityPolicy.js";

const pick = (row: object, fields: string) => Object.fromEntries(fields.split(" ").filter(field => Object.prototype.hasOwnProperty.call(row, field)).map(field => [field, (row as Record<string, unknown>)[field]]));
const literal = (row: object) => Object.entries(row).filter(([, value]) => value !== undefined).map(([key, value]) => {
  if (key === "tipo" && value != null) {
    if (value !== "TECNICA" && value !== "EMPLEABILIDAD") throw new Error("Tipo de competencia desconocido.");
    return `${key}:${value}`;
  }
  return `${key}:${JSON.stringify(value)}`;
}).join(",");

/** The new plan and all its content become visible together, or nothing is created. */
export async function createPlanWithPreviousCurriculum(input: DataConnectPlanInput) {
  const semesters = await listSelectionSemesters();
  const firstSemesterId = input.versionId ?? input.periodoVigenciaId;
  const target = semesters.find(s => s.id === firstSemesterId);
  const candidates = (await dataConnect.executeGraphql<{ planes: Array<CurriculumRow & { anio?: number | null }> }, Record<string, never>>(
    `query PreviousCareerPlans {planes(where:{carreraId:{eq:${input.carreraId ?? -1}}},limit:5000){id ${PLAN_FIELDS}}}`,
  )).data.planes.filter(plan => {
    const start = semesters.find(s => s.id === (plan.versionId ?? plan.periodoVigenciaId));
    return (!input.anio || !plan.anio || plan.anio <= input.anio) && (!target || !start || semesterOrder(start) <= semesterOrder(target));
  }).sort((a, b) => {
    const startA = semesters.find(s => s.id === (a.versionId ?? a.periodoVigenciaId)), startB = semesters.find(s => s.id === (b.versionId ?? b.periodoVigenciaId));
    return (startB ? semesterOrder(startB) : String(b.anio ?? 0)).localeCompare(startA ? semesterOrder(startA) : String(a.anio ?? 0)) || b.id - a.id;
  });
  const previous = candidates[0];
  const graph = previous ? await readCurriculumGraph(previous.id, true) : null;
  // Empty fields describing the curriculum inherit from the previous plan. The new
  // plan's identity, resolution and effective period remain the entered values.
  const inherited = previous ? pick(previous, "duracion creditos tituloComercial slug descripcion2 imagenPortadaUrl genera") : {};
  const planData = { ...inherited, ...input } as Record<string, unknown>;
  for (const [field, value] of Object.entries(inherited)) if (planData[field] == null || planData[field] === "") planData[field] = value;
  if (previous) planData.planAnteriorId = previous.id;
  const statements = [`created:plan_insert(data:{${literal(planData)}})`];
  const aliases = new Map<string, Map<number, string>>();
  const expr = (kind: string, id: unknown) => {
    const alias = aliases.get(kind)?.get(Number(id));
    if (!alias) throw new Error(`No se pudo resolver ${kind} ${id} durante la clonacion.`);
    return `response.${alias}.id`;
  };
  const addRows = (kind: string, table: string, rows: CurriculumRow[], fields: string, relations: (row: CurriculumRow) => Record<string, unknown>) => {
    const map = new Map<number, string>();
    aliases.set(kind, map);
    rows.forEach((row, index) => {
      const alias = `${kind}${index}`;
      statements.push(`${alias}:${table}_insert(data:{${literal({ ...pick(row, fields), ...relations(row) })}})`);
      map.set(row.id, alias);
    });
  };
  if (graph) {
    addRows("m", "modulo", graph.modulos, MODULE_FIELDS, () => ({ planId_expr: "response.created.id", carreraId: input.carreraId ?? previous.carreraId }));
    graph.modulos.forEach((row, index) => statements.push(`pm${index}:planModulo_insert(data:{planId_expr:"response.created.id",moduloId_expr:${JSON.stringify(expr("m", row.id))},orden:${graph.planModulos.find(item => item.moduloId === row.id)?.orden ?? row.orden ?? index + 1}})`));
    addRows("c", "competencia", graph.competencias, "nombre tipo orden", row => ({ moduloId_expr: expr("m", row.moduloId) }));
    addRows("u", "unidadDidactica", graph.unidades, UNIT_FIELDS, () => ({}));
    addRows("r", "competenciaUnidadDidactica", graph.relaciones, "orden", row => ({ competenciaId_expr: expr("c", row.competenciaId), unidadDidacticaId_expr: expr("u", row.unidadDidacticaId) }));
    addRows("cap", "capacidadTerminal", graph.capacidades, "descripcion sigla orden", row => ({ unidadDidacticaId_expr: expr("u", row.unidadDidacticaId) }));
    addRows("i", "indicadorCapacidad", graph.indicadores, "descripcion sigla orden", row => ({ capacidadTerminalId_expr: expr("cap", row.capacidadTerminalId) }));
    addRows("ct", "indicadorContenido", graph.contenidos, "texto orden", row => ({ indicadorCapacidadId_expr: expr("i", row.indicadorCapacidadId) }));
    addRows("a", "aprendizaje", graph.aprendizajes, "descripcion sigla orden", row => ({ indicadorCapacidadId_expr: expr("i", row.indicadorCapacidadId) }));
    addRows("s", "actividad", graph.actividades, ACTIVITY_FIELDS, row => ({ aprendizajeId_expr: expr("a", row.aprendizajeId), ...(row.moduloId == null ? {} : { moduloId_expr: expr("m", row.moduloId) }) }));
    addRows("mt", "actividadMaterial", graph.materiales, "texto orden materialId", row => ({ actividadId_expr: expr("s", row.actividadId) }));
    if (firstSemesterId && (await plansAllowingPeriodSelection([previous.id])).has(previous.id)) {
      const source: Pick<PlanSelection, "competenciaIds" | "unidadIds" | "capacidadIds" | "indicadorIds"> = await ensurePlanSelection(previous.id, firstSemesterId);
      const all = graphSelection(graph);
      const kinds = { competenciaIds: "c", unidadIds: "u", capacidadIds: "cap", indicadorIds: "i" };
      const fields = (Object.keys(kinds) as Array<keyof typeof kinds>).map(field => {
        const values = source[field].filter(id => all[field].includes(id)).map(id => expr(kinds[field], id));
        return `${JSON.stringify(field)}:[${values.join(",")}]`;
      });
      statements.push(`selection:planSemestre_insert(data:{planId_expr:"response.created.id",semestreId:${firstSemesterId},seleccion_expr:${JSON.stringify(`{${fields.join(",")}}`)}})`);
    }
  }
  const response = await dataConnect.executeGraphql<{ created: { id: number } }, Record<string, never>>(
    `mutation CloneCareerCurriculum @transaction { ${statements.join("\n")} }`,
  );
  return { id: response.data.created.id, clonedFromPlanId: previous?.id ?? null, clonedModules: graph?.modulos.length ?? 0 };
}
