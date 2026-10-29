import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import { getConfiguredCurrentSemestreId } from "../core/docenteSemester.js";
import { requirePermission } from "../core/permissions.js";
import { readCurriculumGraph, CurriculumGraph } from "./curriculumGraph.js";
import { recalculateSelectionAverages } from "./selectionAverages.js";
import { plansAllowingPeriodSelection } from "./visibilityPolicy.js";

export const SELECTION_FIELDS = "id planId semestreId seleccion revision";
export interface PlanSelection {
  id: number; planId: number; semestreId: number; revision: number;
  competenciaIds: number[]; unidadIds: number[]; capacidadIds: number[]; indicadorIds: number[];
}
export interface SelectionSemester { id: number; titulo: string | null; inicio: string | null; archivado: boolean | null }
export const selectionColumns = { competencia: "competenciaIds", unidadDidactica: "unidadIds", capacidadTerminal: "capacidadIds", indicadorCapacidad: "indicadorIds" } as const;
export type SelectionEntity = keyof typeof selectionColumns;
type StoredSelection = Omit<PlanSelection, "competenciaIds" | "unidadIds" | "capacidadIds" | "indicadorIds"> & { seleccion: ReturnType<typeof graphSelection> };
const fromStored = ({ seleccion, ...row }: StoredSelection): PlanSelection => ({ ...row, ...seleccion });
const selectionLiteral = (selection: ReturnType<typeof graphSelection>) => `{${Object.values(selectionColumns).map(field => `${field}:${JSON.stringify(selection[field])}`).join(",")}}`;

export function graphSelection(graph: CurriculumGraph) {
  return { competenciaIds: graph.competencias.map(item => item.id), unidadIds: graph.unidades.map(item => item.id), capacidadIds: graph.capacidades.map(item => item.id), indicadorIds: graph.indicadores.map(item => item.id) };
}
export async function listSelectionSemesters() {
  return (await dataConnect.executeGraphql<{ semestres: SelectionSemester[] }, Record<string, never>>(
    "query SelectionSemesters { semestres(limit:1000,orderBy:[{inicio:DESC},{id:DESC}]) {id titulo inicio archivado} }",
  )).data.semestres.sort((a, b) => semesterOrder(b).localeCompare(semesterOrder(a)) || b.id - a.id);
}
/** Filter in the database by group existence instead of transferring all groups. */
export async function listCurricularSemesters(): Promise<SelectionSemester[]> {
  const result = await dataConnect.executeGraphql<{ semestres: SelectionSemester[] }, Record<string, never>>(
    "query CurricularSemestersWithGroups { semestres(where:{grupos_on_semestre:{exist:{}}},limit:1000,orderBy:[{inicio:DESC},{id:DESC}]) {id titulo inicio archivado} }",
  );
  return result.data.semestres.sort((a, b) => semesterOrder(b).localeCompare(semesterOrder(a)) || b.id - a.id);
}
export function semesterOrder(semester: SelectionSemester): string {
  const match = semester.titulo?.match(/\b((?:19|20|21)\d{2})\s*[-/]\s*(II|I|1|2)\b/i);
  if (match) return `${match[1]}-${/^(2|II)$/i.test(match[2]) ? "07" : "01"}-01`;
  return semester.inicio || semester.titulo || String(semester.id).padStart(10, "0");
}
const compareSemesters = (a: SelectionSemester, b: SelectionSemester) => semesterOrder(a).localeCompare(semesterOrder(b)) || a.id - b.id;

export async function ensurePlanSelection(planId: number, semestreId: number, attempt = 0): Promise<PlanSelection> {
  const raw = await dataConnect.executeGraphql<{ planSemestres: StoredSelection[] }, Record<string, never>>(
    `query PlanSelections {planSemestres(where:{planId:{eq:${planId}}},limit:1000){${SELECTION_FIELDS}}}`,
  );
  const snapshots = raw.data.planSemestres.map(fromStored);
  const existing = snapshots.find(item => item.semestreId === semestreId);
  if (existing) return existing;
  const semesters = await listSelectionSemesters();
  const target = semesters.find(item => item.id === semestreId);
  if (!target) throw new https.HttpsError("not-found", "El semestre seleccionado no existe.");
  const plan = (await dataConnect.executeGraphql<{ plan: { periodoVigenciaId: number | null } | null }, Record<string, never>>(`query SelectionPlan {plan(id:${planId}){periodoVigenciaId}}`)).data.plan;
  if (!plan) throw new https.HttpsError("not-found", "El plan no existe.");
  // Freeze earlier periods together before permitting changes to the target.
  // Future periods stay uninitialized so their first use copies the latest selection.
  const start = semesters.find(item => item.id === plan.periodoVigenciaId);
  const history = semesters.filter(item => compareSemesters(item, target) <= 0
    && (item.id === semestreId || !start || compareSemesters(item, start) >= 0 || snapshots.some(s => s.semestreId === item.id)))
    .sort(compareSemesters);
  let previous: ReturnType<typeof graphSelection> | undefined;
  let selected: ReturnType<typeof graphSelection> | undefined;
  const statements: string[] = [];
  for (const semester of history) {
    const snapshot = snapshots.find(item => item.semestreId === semester.id);
    if (snapshot) { previous = snapshot; continue; }
    previous ??= graphSelection(await readCurriculumGraph(planId));
    statements.push(`s${semester.id}:planSemestre_insert(data:{planId:${planId},semestreId:${semester.id},seleccion:${selectionLiteral(previous)}})`);
    if (semester.id === semestreId) selected = previous;
  }
  try {
    const result = await dataConnect.executeGraphql<Record<string, { id: number }>, Record<string, never>>(
      `mutation InitializePlanSemesters @transaction {${statements.join("\n")}}`,
    );
    return { id: result.data[`s${semestreId}`].id, planId, semestreId, revision: 0, ...selected! };
  } catch (error) {
    // Two viewers may open a new semester together; the unique key picks one snapshot.
    const retry = await dataConnect.executeGraphql<{ planSemestres: StoredSelection[] }, Record<string, never>>(
      `query ExistingPlanSemester {planSemestres(where:{planId:{eq:${planId}},semestreId:{eq:${semestreId}}},limit:1){${SELECTION_FIELDS}}}`,
    );
    if (retry.data.planSemestres[0]) return fromStored(retry.data.planSemestres[0]);
    if (attempt < 2) return ensurePlanSelection(planId, semestreId, attempt + 1);
    throw error;
  }
}

export async function academicPeriodData(plans: Array<{ id: number }>, requested: unknown) {
  const semestres = await listSelectionSemesters();
  const semestreId = Number(requested) || await getConfiguredCurrentSemestreId() || semestres[0]?.id;
  if (!semestres.some(item => item.id === semestreId)) throw new https.HttpsError("failed-precondition", "Selecciona un semestre valido.");
  const selecciones: PlanSelection[] = [];
  const allowedPlans = await plansAllowingPeriodSelection(plans.map(plan => plan.id));
  const selectablePlans = plans.filter(plan => allowedPlans.has(plan.id));
  // Keep database concurrency bounded when the catalog includes many careers.
  for (let index = 0; index < selectablePlans.length; index += 4) {
    selecciones.push(...await Promise.all(selectablePlans.slice(index, index + 4).map(plan => ensurePlanSelection(plan.id, semestreId!))));
  }
  return { semestreId, semestres, selecciones };
}

export const setPlanSemesterVisibility = https.onCall(async (data, context) => {
  await requirePermission(context, "estructura-academica", "edit");
  const planId = Number(data?.planId), semestreId = Number(data?.semestreId), id = Number(data?.id);
  const entity = String(data?.entity) as SelectionEntity;
  if (![planId, semestreId, id].every(value => Number.isSafeInteger(value) && value > 0) || !Object.prototype.hasOwnProperty.call(selectionColumns, entity) || typeof data?.active !== "boolean") {
    throw new https.HttpsError("invalid-argument", "Seleccion curricular invalida.");
  }
  const semester = (await listSelectionSemesters()).find(item => item.id === semestreId);
  if (!semester || semester.archivado) throw new https.HttpsError("failed-precondition", "El semestre no existe o esta archivado.");
  if (!(await plansAllowingPeriodSelection([planId])).has(planId)) throw new https.HttpsError("failed-precondition", "La opción para ocultar elementos en Opciones Ocupacionales está desactivada en Settings.");
  const graph = await readCurriculumGraph(planId);
  const allowed = graphSelection(graph)[selectionColumns[entity]];
  if (!allowed.includes(id)) throw new https.HttpsError("permission-denied", "El elemento no pertenece a este plan.");
  const current = await ensurePlanSelection(planId, semestreId);
  if (data.revision !== current.revision) throw new https.HttpsError("aborted", "La seleccion cambio. Actualiza la vista e intenta otra vez.");
  const field = selectionColumns[entity];
  const values = [...new Set([...current[field].filter(value => value !== id), ...(data.active ? [id] : [])])];
  try {
    await dataConnect.executeGraphql(`mutation SetPlanVisibility @transaction {
      query { planSemestre(id:${current.id}) @check(expr:"this != null && this.revision == ${current.revision}",message:"La seleccion cambio; actualiza la vista.") {revision} }
      planSemestre_update(id:${current.id},data:{seleccion:${selectionLiteral({ ...current, [field]: values })},revision:${current.revision + 1},actualizadoEn_expr:"request.time"})
    }`);
  } catch (error) {
    if ((await ensurePlanSelection(planId, semestreId)).revision !== current.revision) throw new https.HttpsError("aborted", "La selección cambió en otra ventana. Actualiza la vista e intenta otra vez.");
    throw error;
  }
  return { selection: { ...current, [field]: values, revision: current.revision + 1 } };
});

/** Effective IDs for consumers that read sessions or units without the full tree. */
export async function getPeriodVisibility(moduloId: number, semestreId?: number | null) {
  return createPeriodVisibilityReader()(moduloId, semestreId);
}

/** A cache scoped to one request, so all teachers' rows share the same snapshot. */
export function createPeriodVisibilityReader() {
  const modules = new Map<number, Promise<{ planId: number | null } | null>>();
  const graphs = new Map<number, Promise<CurriculumGraph>>();
  const selections = new Map<string, Promise<PlanSelection>>();
  const policies = new Map<number, Promise<boolean>>();
  return async (moduloId: number, semestreId?: number | null) => {
  if (!semestreId) throw new https.HttpsError("failed-precondition", "El registro no tiene semestre.");
  if (!modules.has(moduloId)) modules.set(moduloId, dataConnect.executeGraphql<{ modulo: { planId: number | null } | null }, Record<string, never>>(`query VisibilityModule {modulo(id:${moduloId}){planId}}`).then(r => r.data.modulo));
  const module = await modules.get(moduloId)!;
  if (!module?.planId) return null;
  if (!policies.has(module.planId)) policies.set(module.planId, plansAllowingPeriodSelection([module.planId]).then(ids => ids.has(module.planId!)));
  if (!await policies.get(module.planId)!) return null;
  const key = `${module.planId}:${semestreId}`;
  if (!selections.has(key)) selections.set(key, ensurePlanSelection(module.planId, semestreId));
  if (!graphs.has(module.planId)) graphs.set(module.planId, readCurriculumGraph(module.planId));
  const [selection, graph] = await Promise.all([selections.get(key)!, graphs.get(module.planId)!]);
  const competencias = new Set(graph.competencias.filter(c => c.moduloId === moduloId && selection.competenciaIds.includes(c.id)).map(c => c.id));
  const unidades = new Set(graph.relaciones.filter(r => competencias.has(Number(r.competenciaId)) && selection.unidadIds.includes(Number(r.unidadDidacticaId))).map(r => Number(r.unidadDidacticaId)));
  const capacidades = new Set(graph.capacidades.filter(c => unidades.has(Number(c.unidadDidacticaId)) && selection.capacidadIds.includes(c.id)).map(c => c.id));
  const indicadores = new Set(graph.indicadores.filter(i => capacidades.has(Number(i.capacidadTerminalId)) && selection.indicadorIds.includes(i.id)).map(i => i.id));
  return { competencias, unidades, capacidades, indicadores };
  };
}

// All pedagogical consumers use this before building columns or calculating averages.
export async function applyPeriodSelection(data: object, moduloId: number, semestreId?: number | null, occupational = false) {
  if (!semestreId) throw new https.HttpsError("failed-precondition", "El documento no tiene semestre.");
  const module = (await dataConnect.executeGraphql<{ modulo: { planId: number | null } | null }, Record<string, never>>(
    `query PeriodModule {modulo(id:${moduloId}) {planId}}`,
  )).data.modulo;
  if (!module?.planId) return;
  const record = data as Record<string, Array<Record<string, unknown>>>;
  const originalCaps = record.capacidadesTerminales ?? [], originalIndicators = record.indicadoresCapacidad ?? [];
  if (!(await plansAllowingPeriodSelection([module.planId])).has(module.planId)) {
    // Disabling hiding restores the full curriculum and its averages, including
    // grades saved while a reduced selection was enabled. No snapshot is changed.
    const links = record.competenciaUnidadesDidacticas?.length ? record.competenciaUnidadesDidacticas : record.grupoModuloUnidadesDidacticas ?? [];
    const units = new Set(links.map(row => row.unidadDidacticaId));
    const caps = originalCaps.filter(row => units.has(row.unidadDidacticaId));
    const capIds = new Set(caps.map(row => row.id));
    const indicators = originalIndicators.filter(row => capIds.has(row.capacidadTerminalId));
    const scoped: typeof record = { ...record, unidadesDidacticas: (record.unidadesDidacticas ?? []).filter(row => units.has(row.id)), capacidadesTerminales: caps, indicadoresCapacidad: indicators };
    recalculateSelectionAverages(scoped, caps, indicators, occupational);
    for (const field of ["capacidadTerminalEstudiantes", "capacidadesTerminalesEstudiantes", "unidadesDidacticasEstudiantes"]) if (scoped[field]) record[field] = scoped[field];
    return;
  }
  const selection = await ensurePlanSelection(module.planId, semestreId);
  const comp = new Set(selection.competenciaIds), units = new Set(selection.unidadIds), caps = new Set(selection.capacidadIds), indicators = new Set(selection.indicadorIds);
  const context = data as { grupoModulo?: { modulo?: { competencias?: Array<{ id: number }> } } };
  if (context.grupoModulo?.modulo?.competencias) context.grupoModulo.modulo.competencias = context.grupoModulo.modulo.competencias.filter(item => comp.has(item.id));
  if (record.competenciaUnidadesDidacticas) {
    record.competenciaUnidadesDidacticas = record.competenciaUnidadesDidacticas.filter(item => comp.has(Number(item.competenciaId)) && units.has(Number(item.unidadDidacticaId)));
    const available = new Set(record.competenciaUnidadesDidacticas.map(item => Number(item.unidadDidacticaId)));
    for (const id of units) if (!available.has(id)) units.delete(id);
  }
  if (record.grupoModuloUnidadesDidacticas) record.grupoModuloUnidadesDidacticas = record.grupoModuloUnidadesDidacticas.filter(item => units.has(Number(item.unidadDidacticaId)));
  if (record.unidadesDidacticas) record.unidadesDidacticas = record.unidadesDidacticas.filter(item => units.has(Number(item.id)));
  if (record.capacidadesTerminales) {
    record.capacidadesTerminales = record.capacidadesTerminales.filter(item => caps.has(Number(item.id)) && units.has(Number(item.unidadDidacticaId)));
    const available = new Set(record.capacidadesTerminales.map(item => Number(item.id)));
    for (const id of caps) if (!available.has(id)) caps.delete(id);
  }
  if (record.indicadoresCapacidad) {
    record.indicadoresCapacidad = record.indicadoresCapacidad.filter(item => indicators.has(Number(item.id)) && caps.has(Number(item.capacidadTerminalId)));
    const available = new Set(record.indicadoresCapacidad.map(item => Number(item.id)));
    if (record.sesionesCurriculares) record.sesionesCurriculares = record.sesionesCurriculares.filter(item => {
      const session = item as { actividad?: { aprendizaje?: { indicadorCapacidad?: { id?: number } } } };
      return available.has(Number(session.actividad?.aprendizaje?.indicadorCapacidad?.id));
    });
  }
  recalculateSelectionAverages(record, originalCaps, originalIndicators, occupational);
}
