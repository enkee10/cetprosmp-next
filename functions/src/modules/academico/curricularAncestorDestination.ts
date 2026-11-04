import { https } from "firebase-functions/v1";
import { effectiveModuloId } from "../competencias/model.js";

type Row = { id: number; orden?: number | null; [key: string]: unknown };
type Graph = <T>(source: string, variables: Record<string, unknown>) => Promise<T>;
const levels = ["modulo", "competencia", "competenciaUnidadDidactica", "capacidadTerminal", "indicadorCapacidad", "aprendizaje", "actividad"] as const;
export const ancestorSelect: Record<string, string> = {
  modulo: "id orden",
  competencia: "id moduloId tipo orden",
  competenciaUnidadDidactica: "id competenciaId unidadDidacticaId orden competencia { id moduloId tipo } competenciaContinuacion { planModulo { moduloId } }",
  capacidadTerminal: "id unidadDidacticaId orden",
  indicadorCapacidad: "id capacidadTerminalId orden capacidadTerminal { unidadDidacticaId }",
  aprendizaje: "id indicadorCapacidadId orden indicadorCapacidad { capacidadTerminal { unidadDidacticaId } }",
};
const children: Record<string, { list: string; fk: string }> = {
  competencia: { list: "competencias", fk: "moduloId" },
  competenciaUnidadDidactica: { list: "competenciaUnidadesDidacticas", fk: "competenciaId" },
  capacidadTerminal: { list: "capacidadesTerminales", fk: "unidadDidacticaId" },
  indicadorCapacidad: { list: "indicadoresCapacidad", fk: "capacidadTerminalId" },
  aprendizaje: { list: "aprendizajes", fk: "indicadorCapacidadId" },
};
const unitAt = (row: Row): number | undefined => {
  if (typeof row.unidadDidacticaId === "number") return row.unidadDidacticaId;
  for (const key of ["capacidadTerminal", "indicadorCapacidad"]) {
    if (row[key]) { const unit = unitAt(row[key] as Row); if (unit) return unit; }
  }
  return undefined;
};
type Ref = { id: number } | { alias: string };
const refId = (ref: Ref, saved: Record<string, { id: number }>) => "id" in ref ? ref.id : saved[ref.alias]?.id;
const assign = (field: string, ref: Ref) => "id" in ref ? `${field}:${ref.id}` : `${field}_expr:"response.${ref.alias}.id"`;

/** Read the first branch; missing levels are inserted by the caller's move transaction. */
export async function prepareAncestorDestination(entity: string, source: Row, targetEntity: string, target: Row, graph: Graph) {
  const from = levels.indexOf(entity as typeof levels[number]), start = levels.indexOf(targetEntity as typeof levels[number]);
  if (start < 0 || from < 1 || start >= from - 1) throw new https.HttpsError("invalid-argument", "El destino debe ser un nivel superior al padre inmediato.");
  let unitId = unitAt(target);
  let moduleId = targetEntity === "modulo" ? target.id : targetEntity === "competencia" ? Number(target.moduloId)
    : targetEntity === "competenciaUnidadDidactica" ? effectiveModuloId(target as Row & Parameters<typeof effectiveModuloId>[0]) : undefined;
  if (!moduleId && unitId) {
    const owners = await graph<{ owners: Array<{ competencia: { moduloId: number }; competenciaContinuacion?: { planModulo?: { moduloId: number } | null } | null }> }>(`query CurricularAncestorOwner($id:Int!) {
      owners:competenciaUnidadesDidacticas(where:{unidadDidacticaId:{eq:$id}},limit:2) { competencia { moduloId } competenciaContinuacion { planModulo { moduloId } } }
    }`, { id: unitId });
    if (owners.owners.length === 1) moduleId = effectiveModuloId(owners.owners[0]);
  }
  if (!moduleId) throw new https.HttpsError("failed-precondition", "El destino no pertenece a un modulo curricular.");
  const moduleResult = await graph<{ module: Row | null }>('query CurricularAncestorModule($id:Int!) { module:modulo(id:$id) {id orden} }', { id: moduleId });
  if (!moduleResult.module) throw new https.HttpsError("not-found", "El modulo de destino ya no existe.");
  const moduleOrder = moduleResult.module.orden ?? null;
  const lock = `routeLock:modulo_update(first:{where:{id:{eq:${moduleId}},orden:{${moduleOrder == null ? "isNull:true" : `eq:${moduleOrder}`}}}},data:{orden:${moduleOrder}}) @check(expr:"this != null",message:"El modulo de destino cambio.")`;
  const checks: string[] = [], fields: string[] = [];
  const created: Array<{ entity: string; alias: string; parent: Ref; unitAlias?: string; competency?: Row; competencyRef?: Ref }> = [];
  let parent: Ref = { id: targetEntity === "competenciaUnidadDidactica" ? Number(target.unidadDidacticaId) : target.id };
  let competency: Row | undefined = targetEntity === "competencia" ? target : targetEntity === "competenciaUnidadDidactica" ? target.competencia as Row : undefined;
  let competencyRef: Ref | undefined = competency ? { id: competency.id } : undefined;
  for (let index = start + 1; index < from; index++) {
    const level = levels[index], config = children[level];
    let first: Row | undefined;
    if ("id" in parent) {
      const selection = ancestorSelect[level] + (level === "competencia" ? " nombre" : "");
      const query: string = `items:${config.list}(where:{${config.fk}:{eq:${parent.id}}},orderBy:{id:ASC},limit:10001)`;
      const rows: { items: Row[] } = await graph<{ items: Row[] }>(`query CurricularAncestorChildren { ${query} { ${selection} } }`, {});
      if (rows.items.length > 10000) throw new https.HttpsError("resource-exhausted", "El destino tiene demasiados elementos.");
      const ids = rows.items.map(row => row.id);
      const orders = `{${rows.items.map(row => `${row.id}:${row.orden ?? "null"}`).join(",")}}`;
      const units = `{${rows.items.map(row => `${row.id}:${row.unidadDidacticaId ?? "null"}`).join(",")}}`;
      const types = `{${rows.items.map(row => `${row.id}:${JSON.stringify(row.tipo ?? null)}`).join(",")}}`;
      const expression = `this.size() == ${ids.length}` + (ids.length ? ` && this.all(r, r.id in [${ids.join(",")}] && r.orden == ${orders}[r.id]${level === "competenciaUnidadDidactica" ? ` && r.unidadDidacticaId == ${units}[r.id]` : ""}${level === "competencia" ? ` && r.tipo == ${types}[r.id]` : ""})` : "");
      checks.push(`route${index}:${config.list}(where:{${config.fk}:{eq_expr:"response.routeLock.id == ${moduleId} ? ${parent.id} : 0"}},orderBy:{id:ASC},limit:10001) @check(expr:${JSON.stringify(expression)},message:"La ruta de destino cambio. Actualiza la vista.") { id orden${level === "competenciaUnidadDidactica" ? " unidadDidacticaId" : ""}${level === "competencia" ? " tipo" : ""} }`);
      const orderId = (row: Row) => level === "competenciaUnidadDidactica" ? Number(row.unidadDidacticaId) : row.id;
      first = rows.items.sort((a, b) => (a.orden ?? orderId(a)) - (b.orden ?? orderId(b)) || orderId(a) - orderId(b))[0];
    }
    if (first) {
      parent = { id: level === "competenciaUnidadDidactica" ? Number(first.unidadDidacticaId) : first.id };
      if (level === "competencia") { competency = first; competencyRef = { id: first.id }; }
      if (level === "competenciaUnidadDidactica") unitId = Number(first.unidadDidacticaId);
      continue;
    }
    const alias = `routeCreated${index}`;
    if (level === "competencia") {
      const tipo = entity === "competenciaUnidadDidactica" ? (source.competencia as Row).tipo : "TECNICA";
      fields.push(`${alias}:competencia_insert(data:{nombre:"",tipo:${tipo},${assign(config.fk, parent)},orden:1})`);
      competency = { id: 0, nombre: "", tipo, moduloId: moduleId, orden: 1 };
      competencyRef = { alias };
    } else if (level === "competenciaUnidadDidactica") {
      if (competency && !Object.prototype.hasOwnProperty.call(competency, "nombre")) {
        const row = await graph<{ competency: Row | null }>('query CurricularAncestorCompetency($id:Int!) { competency:competencia(id:$id) {id nombre tipo moduloId orden} }', { id: competency.id });
        if (!row.competency) throw new https.HttpsError("not-found", "La competencia de destino ya no existe.");
        competency = row.competency;
      }
      fields.push(`${alias}Unit:unidadDidactica_insert(data:{nombre:""})`);
      fields.push(`${alias}:competenciaUnidadDidactica_insert(data:{${assign(config.fk, parent)},unidadDidacticaId_expr:"response.${alias}Unit.id",orden:1})`);
      created.push({ entity: "unidadDidactica", alias, unitAlias: `${alias}Unit`, parent, competency, competencyRef });
      parent = { alias: `${alias}Unit` }; unitId = undefined;
      continue;
    } else fields.push(`${alias}:${level}_insert(data:{descripcion:"",${assign(config.fk, parent)},orden:1})`);
    created.push({ entity: level, alias, parent });
    parent = { alias };
  }
  const creations = (saved: Record<string, { id: number }>) => created.map(row => {
    const id = refId({ alias: row.unitAlias ?? row.alias }, saved);
    const parentId = refId(row.parent, saved);
    if (!id || !parentId) throw new https.HttpsError("internal", "No se obtuvieron los niveles creados.");
    if (row.entity === "unidadDidactica") {
      const compId = refId(row.competencyRef!, saved);
      return { id, entity: row.entity, item: { id, nombre: "", duracion: null, creditos: null, sigla: null },
        unitAssignments: [{ id: saved[row.alias].id, unidadDidacticaId: id, orden: 1, competenciaId: compId, competencia: { ...row.competency, id: compId } }] };
    }
    const item = row.entity === "competencia" ? { id, nombre: "", tipo: competency!.tipo, moduloId: moduleId, orden: 1 }
      : { id, descripcion: "", sigla: null, orden: 1, [children[row.entity].fk]: parentId };
    return { id, entity: row.entity, item };
  });
  return { moduleId, unitId, parentId: "id" in parent ? parent.id : undefined, parentAssignment: (fk: string) => assign(fk, parent),
    actualParentId: (saved: Record<string, { id: number }>) => refId(parent, saved), competencyType: competency?.tipo,
    checks, fields, lock, creations };
}
