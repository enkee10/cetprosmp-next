import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import { getIdFromKeyOutput } from "../core/userMappers.js";
import { expectedCompetenciaType, isProgramaEstudio, orderedUnidadRelations, TipoCompetencia, employabilityCodeForUnidad } from "./model.js";

export interface CompetenciaRow { id: number; nombre: string; tipo: TipoCompetencia; moduloId: number }
export interface CompetenciaUnidadRow {
  id: number; orden?: number | null; competenciaId: number; unidadDidacticaId: number;
  competencia: CompetenciaRow;
  unidadDidactica?: { id: number; nombre?: string | null };
}

export function parseAcademicIds(value: unknown): number[] {
  if (!Array.isArray(value) || value.some(id => !Number.isInteger(id) || Number(id) <= 0)) {
    throw new https.HttpsError("invalid-argument", "Seleccione identificadores validos.");
  }
  return [...new Set(value as number[])];
}

export async function getModuloCompetenciaContext(moduloId: number) {
  const response = await dataConnect.executeGraphql<{
    modulo: { id: number; titulo?: string; horas?: number | null; plan?: { carrera?: { tipoCarrera?: { nombre?: string } } } } | null;
    planModulos: Array<{ plan: { carrera?: { tipoCarrera?: { nombre?: string } } } }>;
    competencias: CompetenciaRow[];
    competenciaUnidadesDidacticas: CompetenciaUnidadRow[];
  }, { id: number }>(`query ModuloCompetenciaContext($id:Int!) {
    modulo(id:$id) { id titulo horas plan { carrera { tipoCarrera { nombre } } } }
    planModulos(where:{moduloId:{eq:$id}},limit:10000) { plan { carrera { tipoCarrera { nombre } } } }
    competencias(where:{moduloId:{eq:$id}},limit:10000) { id nombre tipo moduloId }
    competenciaUnidadesDidacticas(where:{competencia:{moduloId:{eq:$id}}},limit:10000) {
      id orden competenciaId unidadDidacticaId competencia { id nombre tipo moduloId } unidadDidactica { id nombre }
    }
  }`, { variables: { id: moduloId } });
  const modulo = response.data.modulo;
  if (!modulo) throw new https.HttpsError("not-found", "El modulo no existe.");
  const types = [modulo.plan, ...response.data.planModulos.map(r => r.plan)]
    .map(p => p?.carrera?.tipoCarrera?.nombre).filter((name): name is string => Boolean(name));
  if (!types.length || types.some(isProgramaEstudio) !== types.every(isProgramaEstudio)) {
    throw new https.HttpsError("failed-precondition", "El modulo necesita un tipo de carrera definido y consistente.");
  }
  const programa = types.every(isProgramaEstudio);
  const relations = orderedUnidadRelations(response.data.competenciaUnidadesDidacticas);
  if (relations.length && programa && (!modulo.horas || modulo.horas <= 0)) {
    throw new https.HttpsError("failed-precondition", "Complete las horas del modulo para clasificar sus unidades.");
  }
  return { modulo, programa, relations, competencias: response.data.competencias,
    unidadIds: relations.map(r => r.unidadDidacticaId) };
}

export async function validateUnidadCompetencias(unidadId: number, value: unknown) {
  const ids = parseAcademicIds(value);
  const response = await dataConnect.executeGraphql<{ competencias: CompetenciaRow[] }, { ids: number[] }>(
    `query SelectedUnidadCompetencias($ids:[Int!]!) { competencias(where:{id:{in:$ids}},limit:10000) { id nombre tipo moduloId } }`,
    { variables: { ids } },
  );
  if (response.data.competencias.length !== ids.length) throw new https.HttpsError("invalid-argument", "Una competencia no existe.");
  const modules = new Set<number>();
  for (const competencia of response.data.competencias) {
    if (modules.has(competencia.moduloId)) throw new https.HttpsError("invalid-argument", "La unidad debe tener una sola competencia por modulo.");
    modules.add(competencia.moduloId);
    const context = await getModuloCompetenciaContext(competencia.moduloId);
    const orderedIds = context.unidadIds.includes(unidadId) ? context.unidadIds : [...context.unidadIds, unidadId];
    if (expectedCompetenciaType(context.programa, context.modulo.horas, orderedIds, unidadId) !== competencia.tipo) {
      throw new https.HttpsError("invalid-argument", "La competencia no corresponde al orden de la unidad y a las horas del modulo.");
    }
  }
  return response.data.competencias;
}

async function chooseCompetencia(context: Awaited<ReturnType<typeof getModuloCompetenciaContext>>, tipo: TipoCompetencia, unidadNombre: string) {
  const available = context.competencias.filter(c => c.tipo === tipo);
  const code = tipo === "EMPLEABILIDAD" ? employabilityCodeForUnidad(unidadNombre) : null;
  const preferred = available.find(c => code && new RegExp(`^CE\\s*${code}\\b`, "i").test(c.nombre)) ?? available[0];
  if (preferred) return preferred;
  const response = await dataConnect.executeGraphql<{ competencia_insert: unknown }, { data: { moduloId: number; nombre: string; tipo: TipoCompetencia } }>(
    `mutation CreatePendingCompetencia($data:Competencia_Data! @allow(fields:"moduloId nombre tipo")) { competencia_insert(data:$data) }`,
    { variables: { data: { moduloId: context.modulo.id, nombre: "", tipo } } },
  );
  const id = getIdFromKeyOutput(response.data.competencia_insert);
  if (!id) throw new Error("No se pudo crear la competencia pendiente.");
  const created = { id, nombre: "", tipo, moduloId: context.modulo.id };
  context.competencias.push(created);
  return created;
}

export async function reconcileModuloUnits(moduloId: number) {
  const context = await getModuloCompetenciaContext(moduloId);
  const fields: string[] = [];
  for (const relation of context.relations) {
    const tipo = expectedCompetenciaType(context.programa, context.modulo.horas, context.unidadIds, relation.unidadDidacticaId);
    if (relation.competencia.tipo === tipo) continue;
    const competencia = await chooseCompetencia(context, tipo, relation.unidadDidactica?.nombre ?? "");
    fields.push(`r${relation.id}:competenciaUnidadDidactica_update(id:${relation.id},data:{competenciaId:${competencia.id}})`);
  }
  if (fields.length) await dataConnect.executeGraphql(`mutation ReclassifyModuloUnits @transaction { ${fields.join("\n")} }`);
}

export async function reconcileRelationModules(ids: number[]) {
  const response = await dataConnect.executeGraphql<{ competenciaUnidadesDidacticas: Array<{ competencia: { moduloId: number } }> }, { ids: number[] }>(
    `query AffectedUnidadModules($ids:[Int!]!) { competenciaUnidadesDidacticas(where:{id:{in:$ids}},limit:10000) { competencia { moduloId } } }`,
    { variables: { ids } },
  );
  for (const id of new Set(response.data.competenciaUnidadesDidacticas.map(r => r.competencia.moduloId))) await reconcileModuloUnits(id);
}

export async function attachUnidadToModulo(moduloId: number, unidadId: number, orden: number, selectedId?: number) {
  const context = await getModuloCompetenciaContext(moduloId);
  if (context.unidadIds.includes(unidadId)) throw new https.HttpsError("already-exists", "La unidad ya pertenece al modulo.");
  const unidad = await dataConnect.executeGraphql<{ unidadDidactica: { nombre?: string } | null }, { id: number }>(
    `query UnidadToAttach($id:Int!) { unidadDidactica(id:$id) { nombre } }`, { variables: { id: unidadId } },
  );
  if (!unidad.data.unidadDidactica) throw new https.HttpsError("not-found", "La unidad no existe.");
  const candidate = { id: Number.MAX_SAFE_INTEGER, unidadDidacticaId: unidadId, orden };
  const orderedIds = orderedUnidadRelations([...context.relations, candidate]).map(r => r.unidadDidacticaId);
  const tipo = expectedCompetenciaType(context.programa, context.modulo.horas, orderedIds, unidadId);
  const competencia = selectedId ? context.competencias.find(c => c.id === selectedId && c.tipo === tipo)
    : await chooseCompetencia(context, tipo, unidad.data.unidadDidactica.nombre ?? "");
  if (!competencia) throw new https.HttpsError("invalid-argument", "Seleccione una competencia compatible del modulo.");
  const fields = [`saved:competenciaUnidadDidactica_insert(data:{competenciaId:${competencia.id},unidadDidacticaId:${unidadId},orden:${orden}})`];
  for (const relation of context.relations) {
    const target = expectedCompetenciaType(context.programa, context.modulo.horas, orderedIds, relation.unidadDidacticaId);
    if (relation.competencia.tipo === target) continue;
    const changed = await chooseCompetencia(context, target, relation.unidadDidactica?.nombre ?? "");
    fields.push(`r${relation.id}:competenciaUnidadDidactica_update(id:${relation.id},data:{competenciaId:${changed.id}})`);
  }
  await dataConnect.executeGraphql(`mutation AttachUnidadCompetencia @transaction { ${fields.join("\n")} }`);
}

export async function syncUnidadCompetencias(unidadId: number, ids: number[]) {
  const selected = await validateUnidadCompetencias(unidadId, ids);
  const existing = await dataConnect.executeGraphql<{ competenciaUnidadesDidacticas: CompetenciaUnidadRow[] }, { id: number }>(
    `query ExistingUnidadCompetencias($id:Int!) { competenciaUnidadesDidacticas(where:{unidadDidacticaId:{eq:$id}},limit:10000) { id orden competenciaId unidadDidacticaId competencia { id nombre tipo moduloId } } }`,
    { variables: { id: unidadId } },
  );
  const fields: string[] = [];
  const affected = new Set<number>();
  for (const relation of existing.data.competenciaUnidadesDidacticas) {
    affected.add(relation.competencia.moduloId);
    const target = selected.find(c => c.moduloId === relation.competencia.moduloId);
    if (!target) fields.push(`d${relation.id}:competenciaUnidadDidactica_delete(id:${relation.id})`);
    else if (target.id !== relation.competenciaId) fields.push(`r${relation.id}:competenciaUnidadDidactica_update(id:${relation.id},data:{competenciaId:${target.id}})`);
  }
  for (const target of selected) {
    affected.add(target.moduloId);
    if (existing.data.competenciaUnidadesDidacticas.some(r => r.competencia.moduloId === target.moduloId)) continue;
    const context = await getModuloCompetenciaContext(target.moduloId);
    const orden = Math.max(0, ...context.relations.map(r => r.orden ?? r.id)) + 1;
    fields.push(`i${target.id}:competenciaUnidadDidactica_insert(data:{competenciaId:${target.id},unidadDidacticaId:${unidadId},orden:${orden}})`);
  }
  if (fields.length) await dataConnect.executeGraphql(`mutation SaveUnidadCompetencias @transaction { ${fields.join("\n")} }`);
  for (const id of affected) await reconcileModuloUnits(id);
}
