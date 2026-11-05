import { dataConnect } from "../core/dataConnectCore.js";

/** Use in filtered writes as well as checks: cascade deletes must never bypass protection. */
export function curricularHasGradesFilter(entity: string): string {
  const saved = "{promedio:{isNull:false}}";
  const indicator = `{indicadoresCapacidadEstudiantes_on_indicadorCapacidad:{exist:${saved}}}`;
  const capacity = `{_or:[{capacidadesTerminalesEstudiantes_on_capacidadTerminal:{exist:${saved}}},{indicadoresCapacidad_on_capacidadTerminal:{exist:${indicator}}}]}`;
  const unit = `{_or:[{unidadesDidacticasEstudiantes_on_unidadDidactica:{exist:${saved}}},{capacidadesTerminales_on_unidadDidactica:{exist:${capacity}}}]}`;
  const relation = `{unidadDidactica:${unit}}`;
  const continuation = `{competenciaUnidadesDidacticas_on_competenciaContinuacion:{exist:${relation}}}`;
  if (entity === "indicadorCapacidad") return indicator;
  if (entity === "capacidadTerminal") return capacity;
  if (entity === "unidadDidactica") return unit;
  if (entity === "unidadRelation") return relation;
  if (entity === "continuacion") return continuation;
  if (entity === "competencia") return `{competenciaUnidadesDidacticas_on_competencia:{exist:${relation}}}`;
  // Module detachment keeps units and their grades. Child checks use the captured
  // unit IDs, so deleting a plan relation cannot make those checks lose the path.
  if (entity === "modulo") return `{modulosEstudiantes_on_modulo:{exist:{_or:[{promedio:{isNull:false}},{puntaje:{isNull:false}}]}}}`;
  throw new Error("Elemento curricular no compatible con la protección de notas.");
}

/** Return only IDs of elements with saved values, including a grade of zero. */
export async function readCurricularGradeUsage() {
  const { data } = await dataConnect.executeGraphql<{
    modules: Array<{ id: number }>; units: Array<{ id: number }>;
    capacities: Array<{ id: number }>; indicators: Array<{ id: number }>;
  }, Record<string, never>>(`query CurricularGradeUsage {
    modules:modulos(where:{modulosEstudiantes_on_modulo:{exist:{_or:[{promedio:{isNull:false}},{puntaje:{isNull:false}}]}}},limit:50000){id}
    units:unidadesDidacticas(where:{unidadesDidacticasEstudiantes_on_unidadDidactica:{exist:{promedio:{isNull:false}}}},limit:50000){id}
    capacities:capacidadesTerminales(where:{capacidadesTerminalesEstudiantes_on_capacidadTerminal:{exist:{promedio:{isNull:false}}}},limit:50000){id}
    indicators:indicadoresCapacidad(where:{indicadoresCapacidadEstudiantes_on_indicadorCapacidad:{exist:{promedio:{isNull:false}}}},limit:50000){id}
  }`);
  for (const rows of Object.values(data)) if (rows.length === 50000) throw new Error("Demasiados elementos para comprobar las notas guardadas.");
  return Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, rows.map(row => row.id)]));
}

/** Embed inside the actual mutation, so stale tabs cannot remove saved grades. No counts. */
export function curricularGradeChecks(entity: string, id: number | string, moduleUnitIds?: number[]) {
  const value = typeof id === "number" ? String(id) : id;
  const message = JSON.stringify("No se puede eliminar un elemento que tiene notas o promedios guardados.");
  if (entity !== "modulo") {
    const tables: Record<string, string> = { indicadorCapacidad: "indicadoresCapacidad", capacidadTerminal: "capacidadesTerminales", unidadDidactica: "unidadesDidacticas", unidadRelation: "competenciaUnidadesDidacticas", competencia: "competencias", continuacion: "competenciaContinuaciones" };
    if (!tables[entity]) throw new Error("Elemento curricular no compatible con la protección de notas.");
    return `savedCurricularGrades:${tables[entity]}(where:{_and:[{id:{eq:${value}}},${curricularHasGradesFilter(entity)}]},limit:1) @check(expr:"this.size() == 0",message:${message}){id}`;
  }
  if (!moduleUnitIds) throw new Error("Faltan las unidades del módulo para comprobar sus notas.");
  const unitFilter = `id:{in:${JSON.stringify(moduleUnitIds)}}`;
  const field = (alias: string, table: string, filter: string) => `${alias}:${table}(where:{${filter},promedio:{isNull:false}},limit:1) @check(expr:"this.size() == 0",message:${message}){id}`;
  return [
    field("savedIndicatorGrade", "indicadoresCapacidadEstudiantes", `indicadorCapacidad:{capacidadTerminal:{unidadDidactica:{${unitFilter}}}}`),
    field("savedCapacityGrade", "capacidadesTerminalesEstudiantes", `capacidadTerminal:{unidadDidactica:{${unitFilter}}}`),
    field("savedUnitGrade", "unidadesDidacticasEstudiantes", `unidadDidactica:{${unitFilter}}`),
    `savedModuleGrade:modulosEstudiantes(where:{_and:[{moduloId:{eq:${value}}},{_or:[{promedio:{isNull:false}},{puntaje:{isNull:false}}]}]},limit:1) @check(expr:"this.size() == 0",message:${message}){id}`,
  ].join("\n");
}
