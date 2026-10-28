import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import { getModuloCompetenciaContext } from "../competencias/service.js";

type Entity = "competencia" | "competenciaUnidadDidactica" | "capacidadTerminal" | "indicadorCapacidad" | "aprendizaje" | "actividad";
type Row = { id: number; orden?: number | null; moduloId?: number | null; tipo?: string; [key: string]: unknown };
type Graph = <T>(source: string, variables: Record<string, unknown>) => Promise<T>;
const configurations = {
  competencia: { parent: "modulo", fk: "moduloId", list: "competencias", select: "id moduloId tipo orden" },
  competenciaUnidadDidactica: { parent: "competencia", fk: "competenciaId", list: "competenciaUnidadesDidacticas", select: "id competenciaId unidadDidacticaId orden competencia { id moduloId tipo }" },
  capacidadTerminal: { parent: "unidadDidactica", fk: "unidadDidacticaId", list: "capacidadesTerminales", select: "id unidadDidacticaId orden" },
  indicadorCapacidad: { parent: "capacidadTerminal", fk: "capacidadTerminalId", list: "indicadoresCapacidad", select: "id capacidadTerminalId orden capacidadTerminal { unidadDidacticaId }" },
  aprendizaje: { parent: "indicadorCapacidad", fk: "indicadorCapacidadId", list: "aprendizajes", select: "id orden indicadorCapacidadId indicadorCapacidad { capacidadTerminal { unidadDidacticaId } }" },
  actividad: { parent: "aprendizaje", fk: "aprendizajeId", list: "actividads", select: "id aprendizajeId moduloId orden aprendizaje { indicadorCapacidad { capacidadTerminal { unidadDidacticaId } } }" },
} as const;
const targetSelect = {
  competencia: "id",
  competenciaUnidadDidactica: "id moduloId tipo",
  capacidadTerminal: "id",
  indicadorCapacidad: "id unidadDidacticaId",
  aprendizaje: "id capacidadTerminal { unidadDidacticaId }",
  actividad: "id indicadorCapacidad { capacidadTerminal { unidadDidacticaId } }",
} as const;
const positiveId = (value: unknown) => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new https.HttpsError("invalid-argument", "Identificador academico invalido.");
  return value;
};
const unitAt = (value: Row): number | undefined => {
  if (typeof value.unidadDidacticaId === "number") return value.unidadDidacticaId;
  for (const field of ["capacidadTerminal", "indicadorCapacidad", "aprendizaje"]) {
    const child = value[field];
    if (child && typeof child === "object") { const id = unitAt(child as Row); if (id) return id; }
  }
  return undefined;
};
const defaultGraph: Graph = async <T>(source: string, variables: Record<string, unknown>) => (await dataConnect.executeGraphql<T, Record<string, unknown>>(source, { variables })).data;

/** Persists the FK and its sessions' module in one transaction; scheduled history stays intact. */
export async function reassignCurricularItem(data: Record<string, unknown>, graph: Graph = defaultGraph, moduleContext = getModuloCompetenciaContext) {
  const entity = String(data.entity) as Entity;
  if (!Object.prototype.hasOwnProperty.call(configurations, entity)) throw new https.HttpsError("invalid-argument", "Componente academico invalido.");
  const id = positiveId(data.id), parentId = positiveId(data.parentId), previousParentId = positiveId(data.previousParentId);
  if (parentId === previousParentId) throw new https.HttpsError("invalid-argument", "Elige otro elemento superior.");
  const config = configurations[entity];
  const rows = await graph<{ source: Row | null; target: Row | null }>(`query CurricularMoveContext($id:Int!,$parentId:Int!) {
    source:${entity}(id:$id) { ${config.select} }
    target:${config.parent}(id:$parentId) { ${targetSelect[entity]} }
  }`, { id, parentId });
  if (!rows.source || !rows.target) throw new https.HttpsError("not-found", "El componente o su destino ya no existe.");
  const { source, target } = rows;
  if (source[config.fk] !== previousParentId) throw new https.HttpsError("failed-precondition", "El componente cambio de ubicacion. Actualiza la vista antes de moverlo.");
  let sourceModuleId: number, targetModuleId: number;
  const sourceUnit = entity === "competenciaUnidadDidactica" ? Number(source.unidadDidacticaId) : unitAt(source);
  if (entity === "competencia") { sourceModuleId = Number(source.moduloId); targetModuleId = parentId; }
  else if (entity === "competenciaUnidadDidactica") {
    sourceModuleId = Number((source.competencia as Row).moduloId); targetModuleId = Number(target.moduloId);
    if ((source.competencia as Row).tipo !== target.tipo) throw new https.HttpsError("failed-precondition", "La unidad debe conservar su tipo de competencia: Tecnica o Empleabilidad.");
  } else {
    const targetUnit = entity === "capacidadTerminal" ? parentId : unitAt(target);
    if (!sourceUnit || !targetUnit) throw new https.HttpsError("failed-precondition", "El componente necesita una unidad didactica definida.");
    const owners = await graph<{ owners: Array<{ unidadDidacticaId: number; competencia: { moduloId: number } }> }>(`query CurricularMoveOwners($ids:[Int!]!) {
      owners:competenciaUnidadesDidacticas(where:{unidadDidacticaId:{in:$ids}},limit:3) { unidadDidacticaId competencia { moduloId } }
    }`, { ids: [...new Set([sourceUnit, targetUnit])] });
    sourceModuleId = Number(owners.owners.find(row => row.unidadDidacticaId === sourceUnit)?.competencia.moduloId);
    targetModuleId = Number(owners.owners.find(row => row.unidadDidacticaId === targetUnit)?.competencia.moduloId);
    if (!sourceModuleId || !targetModuleId) throw new https.HttpsError("failed-precondition", "La unidad de origen o destino no pertenece a un modulo curricular.");
  }
  const context = await moduleContext(targetModuleId);
  if (!context.programa && ((entity === "competencia" && source.tipo === "EMPLEABILIDAD") || (entity === "competenciaUnidadDidactica" && target.tipo === "EMPLEABILIDAD"))) {
    throw new https.HttpsError("failed-precondition", "El modulo de destino solo admite competencias Tecnicas.");
  }
  const siblings = await graph<{ siblings: Array<{ id: number; orden?: number | null }> }>(`query CurricularMoveSiblings($parentId:Int!) {
    siblings:${config.list}(where:{${config.fk}:{eq:$parentId}},limit:10001) { id orden }
  }`, { parentId });
  if (siblings.siblings.length > 10000) throw new https.HttpsError("resource-exhausted", "El destino tiene demasiados elementos.");
  const orden = Math.max(0, ...siblings.siblings.map(row => row.orden ?? row.id)) + 1;
  let activityFilter: string;
  if (entity === "competencia") activityFilter = `aprendizaje:{indicadorCapacidad:{capacidadTerminal:{unidadDidacticaId:{in:$unitIds}}}}`;
  else if (entity === "competenciaUnidadDidactica") activityFilter = `aprendizaje:{indicadorCapacidad:{capacidadTerminal:{unidadDidacticaId:{eq:${sourceUnit}}}}}`;
  else if (entity === "capacidadTerminal") activityFilter = `aprendizaje:{indicadorCapacidad:{capacidadTerminalId:{eq:${id}}}}`;
  else if (entity === "indicadorCapacidad") activityFilter = `aprendizaje:{indicadorCapacidadId:{eq:${id}}}`;
  else if (entity === "aprendizaje") activityFilter = `aprendizajeId:{eq:${id}}`;
  else activityFilter = `id:{eq:${id}}`;
  const unitIds = entity === "competencia" ? (await graph<{ units: Array<{ unidadDidacticaId: number }> }>(`query CurricularMoveUnits($id:Int!) {
    units:competenciaUnidadesDidacticas(where:{competenciaId:{eq:$id}},limit:10001) { unidadDidacticaId }
  }`, { id })).units.map(row => row.unidadDidacticaId) : [];
  if (unitIds.length > 10000) throw new https.HttpsError("resource-exhausted", "La competencia tiene demasiadas unidades.");
  const changesModule = sourceModuleId !== targetModuleId;
  const activities = changesModule ? await graph<{ activities: Array<{ id: number; moduloId: number | null }> }>(`query CurricularMoveActivities${entity === "competencia" ? "($unitIds:[Int!]!)" : ""} {
    activities:actividads(where:{${activityFilter}},limit:10001) { id moduloId }
  }`, entity === "competencia" ? { unitIds } : {}) : { activities: [] };
  if (activities.activities.length > 10000) throw new https.HttpsError("resource-exhausted", "El componente tiene demasiadas sesiones.");
  if (activities.activities.some(row => row.moduloId != null && row.moduloId !== sourceModuleId)) throw new https.HttpsError("failed-precondition", "Hay sesiones asociadas a otro modulo. Revisa sus asignaciones antes de mover el componente.");
  const variables: Record<string, unknown> = { id, parentId, previousParentId };
  const definitions = ["$id:Int!", "$parentId:Int!", "$previousParentId:Int!"];
  const snapshotCheck = (row: Row, prefix: string) => {
    const expressions = ["this != null"];
    const visit = (record: Record<string, unknown>, access: string) => {
      for (const [key, value] of Object.entries(record)) {
        const field = `${access}.${key}`;
        if (value && typeof value === "object") { expressions.push(`${field} != null`); visit(value as Record<string, unknown>, field); }
        else {
          const name = `${prefix}Field${expressions.length}`;
          definitions.push(`$${name}:${key === "tipo" ? "TipoCompetencia" : "Int"}`); variables[name] = value;
          expressions.push(`${field} == vars.${name}`);
        }
      }
    };
    visit(row, "this");
    return JSON.stringify(expressions.join(" && "));
  };
  const sourceCheck = snapshotCheck(source, "source"), targetCheck = snapshotCheck(target, "target");
  const checks = [
    `source:${entity}(id:$id) @check(expr:${sourceCheck},message:"El componente o sus superiores cambiaron.") { ${config.select} }`,
    `target:${config.parent}(id:$parentId) @check(expr:${targetCheck},message:"El destino o sus superiores cambiaron.") { ${targetSelect[entity]} }`,
    // The expected source FK remains explicit in the transactional guard.
    `location:${entity}(id:$id) @check(expr:"this != null && this.${config.fk} == vars.previousParentId",message:"El componente cambio de ubicacion.") { id ${config.fk} }`,
  ];
  if (entity !== "competencia" && entity !== "competenciaUnidadDidactica") {
    const targetUnit = entity === "capacidadTerminal" ? parentId : unitAt(target)!;
    const expectations = [...new Map([[sourceUnit!, sourceModuleId], [targetUnit, targetModuleId]]).entries()];
    definitions.push("$ownerUnitIds:[Int!]!"); variables.ownerUnitIds = expectations.map(([unit]) => unit);
    checks.push(`owners:competenciaUnidadesDidacticas(where:{unidadDidacticaId:{in:$ownerUnitIds}},limit:3)
      @check(expr:"this.size() == ${expectations.length} && ${expectations.map(([unit, module]) => `this.exists(o, o.unidadDidacticaId == ${unit} && o.competencia.moduloId == ${module})`).join(" && ")}",message:"La unidad cambio de modulo.") { unidadDidacticaId competencia { moduloId } }`);
  }
  if (changesModule) {
    if (entity === "competencia") { definitions.push("$unitIds:[Int!]!"); variables.unitIds = unitIds; }
    definitions.push("$activityIds:[Int!]!", "$sourceModuleId:Int!"); variables.activityIds = activities.activities.map(row => row.id); variables.sourceModuleId = sourceModuleId;
    checks.push(`sessions:actividads(where:{${activityFilter}},limit:10001) @check(expr:"this.size() == ${activities.activities.length} && this.all(s, s.id in vars.activityIds && (s.moduloId == null || s.moduloId == vars.sourceModuleId))",message:"Las sesiones del componente cambiaron.") { id moduloId }`);
    if (entity === "competencia") checks.push(`units:competenciaUnidadesDidacticas(where:{competenciaId:{eq:$id}},limit:10001) @check(expr:"this.size() == ${unitIds.length} && this.all(u, u.unidadDidacticaId in vars.unitIds)",message:"Las unidades de la competencia cambiaron.") { unidadDidacticaId }`);
  }
  const fields = [`saved:${entity}_update(id:$id,data:{${config.fk}:$parentId${orden == null ? "" : `,orden:${orden}`}${entity === "actividad" ? `,moduloId:${targetModuleId}` : ""}}) @check(expr:"this != null",message:"El componente ya no existe.")`];
  // Explicit response dependencies make the owner write precede the descendant writes.
  for (const activity of activities.activities) if (entity !== "actividad") fields.push(`session${activity.id}:actividad_update(id_expr:"response.saved != null ? ${activity.id} : 0",data:{moduloId:${targetModuleId}}) @check(expr:"this != null",message:"Una sesion ya no existe.")`);
  await graph(`mutation ReassignCurricularItem(${definitions.join(",")}) @transaction { query { ${checks.join("\n")} } ${fields.join("\n")} }`, variables);
  return { entity, id, parentId, previousParentId, orden, moduleId: targetModuleId, previousModuleId: sourceModuleId };
}

export const reassignEstructuraAcademicaItem = https.onCall(async (data, context) => {
  await requirePermission(context, "estructura-academica", "edit");
  try { return await reassignCurricularItem(data ?? {}); }
  catch (error) {
    if (error instanceof https.HttpsError) throw error;
    console.error("Error reassigning curricular item:", error);
    throw new https.HttpsError("internal", "No se pudo guardar la reasignacion. El componente conserva su ubicacion anterior.");
  }
});
