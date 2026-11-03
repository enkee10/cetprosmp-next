import { displayMaterialLink, getMaterialRow, getOrCreateMaterial, preserveLegacyMaterial } from "../materiales/handlers.js";
import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import { getIdFromKeyOutput, toNumberOrNull } from "../core/userMappers.js";
import { expectedCompetenciaType } from "../competencias/model.js";
import { getModuloCompetenciaContext } from "../competencias/service.js";
import { nextCurricularChildOrder, nextCurricularOrder, readCurricularCreatedItem } from "./curricularCreation.js";
import { indicatorContentsAreSimilar, splitIndicatorContents } from "./contentSimilarity.js";
import { contentSubtreeIds, moveContentBranch, type IndicatorContentItem } from "./contentTree.js";

type Item = IndicatorContentItem & { materialId?: number | null; material?: { nombre: string } | null };
type Competencia = { id: number; moduloId: number; nombre: string; tipo: "TECNICA" | "EMPLEABILIDAD"; orden?: number | null };
type Sesion = { id: number; orden?: number | null; numeroSesion?: number | null; moduloId?: number | null; aprendizaje: { id: number; indicadorCapacidadId: number } };
const nextOrder = nextCurricularOrder;
const positive = (value: unknown, label: string) => {
  const id = toNumberOrNull(value);
  if (!id || !Number.isInteger(id) || id <= 0) throw new https.HttpsError("invalid-argument", `${label} es obligatorio.`);
  return id;
};

const COMPETENCIA_QUERY = `query CurricularCompetencia($id:Int!) {
  competencia(id:$id) { id nombre tipo moduloId orden }
  competenciaUnidadesDidacticas(where:{competenciaId:{eq:$id}},limit:10000) { unidadDidacticaId }
}`;
const SESIONES_QUERY = `query CurricularSesiones($indicadorId:Int!) {
  actividads(where:{aprendizaje:{indicadorCapacidadId:{eq:$indicadorId}}},limit:5000) {
    id orden numeroSesion moduloId aprendizaje { id indicadorCapacidadId }
  }
}`;
const REORDER_MODULOS_QUERY = `query CurricularModuleOrder($ids:[Int!]!,$planId:Int!) {
  modulos(where:{id:{in:$ids}},limit:10000) { id planId }
  planModulos(where:{planId:{eq:$planId}},limit:10000) { id moduloId orden }
}`;

export async function updateCurricularExtraCell(entity: string, id: number, field: string, value: unknown) {
  if (entity === "competencia") {
    const current = await dataConnect.executeGraphql<{ competencia: Competencia | null; competenciaUnidadesDidacticas: Array<{ unidadDidacticaId: number }> }, { id: number }>(COMPETENCIA_QUERY, { variables: { id } });
    if (!current.data.competencia) throw new https.HttpsError("not-found", "La competencia ya no existe.");
    if (field === "tipo") {
      if (value !== "TECNICA" && value !== "EMPLEABILIDAD") throw new https.HttpsError("invalid-argument", "Tipo de competencia invalido.");
      const context = await getModuloCompetenciaContext(current.data.competencia.moduloId);
      if ((!context.programa && value !== "TECNICA") || current.data.competenciaUnidadesDidacticas.some(item =>
        expectedCompetenciaType(context.programa, context.modulo.horas, context.unidadIds, item.unidadDidacticaId) !== value,
      )) throw new https.HttpsError("failed-precondition", "El tipo no corresponde a las unidades de esta competencia.");
    }
    await dataConnect.executeGraphql(`mutation CurricularEditCompetencia($id:Int!,$data:Competencia_Data! @allow(fields:"nombre tipo")) { competencia_update(id:$id,data:$data) }`, { variables: { id, data: { [field]: value } } });
    return { id };
  }
  const singular = { actividad: "actividad", aprendizaje: "aprendizaje", indicadorContenido: "indicadorContenido" }[entity];
  if (!singular) throw new https.HttpsError("invalid-argument", "Elemento invalido.");
  const allowed = { actividad: "nombre", aprendizaje: "descripcion", indicadorContenido: "texto" }[entity];
  if (entity === "actividad" && field === "duracion") {
    if (!Number.isInteger(value) || Number(value) <= 0) throw new https.HttpsError("invalid-argument", "Las horas deben ser un entero positivo.");
  } else if (field !== allowed && !(entity === "actividad" && field === "proposito")) throw new https.HttpsError("invalid-argument", "Campo invalido.");
  await dataConnect.executeGraphql(`mutation CurricularEditText($id:Int!,$data:${singular[0].toUpperCase() + singular.slice(1)}_Data! @allow(fields:"${entity === "actividad" ? "nombre proposito duracion" : allowed}")) @transaction {
    ${singular}_update(id:$id,data:$data) @check(expr:"this != null",message:"El elemento ya no existe.")
  }`, { variables: { id, data: { [field]: value } } });
  return { id };
}

export async function createCurricularExtra(entity: string, data: Record<string, unknown>) {
  if (entity === "competencia") {
    const moduloId = positive(data.moduloId, "Modulo");
    const context = await getModuloCompetenciaContext(moduloId);
    const tipo = data.tipo ?? "TECNICA";
    if (tipo !== "TECNICA" && tipo !== "EMPLEABILIDAD") throw new https.HttpsError("invalid-argument", "Tipo invalido.");
    if (!context.programa && tipo === "EMPLEABILIDAD") throw new https.HttpsError("failed-precondition", "Este modulo solo admite competencias tecnicas.");
    const result = await dataConnect.executeGraphql<{ competencia_insert: unknown }, Record<string, unknown>>(`mutation CurricularCreateCompetencia($data:Competencia_Data! @allow(fields:"nombre tipo moduloId orden")) { competencia_insert(data:$data) }`,
      { variables: { data: { nombre: "Nueva competencia", tipo, moduloId, orden: nextOrder(context.competencias) } } });
    return readCurricularCreatedItem(entity, getIdFromKeyOutput(result.data.competencia_insert));
  }
  if (entity === "aprendizaje") {
    const indicadorId = positive(data.indicadorCapacidadId, "Indicador");
    const orden = await nextCurricularChildOrder("aprendizaje", indicadorId);
    const result = await dataConnect.executeGraphql<{ aprendizaje_insert: unknown }, { indicadorId: number; orden: number }>(`mutation CurricularCreateAprendizaje($indicadorId:Int!,$orden:Int!) {
      aprendizaje_insert(data:{descripcion:"Nuevo aprendizaje",indicadorCapacidadId:$indicadorId,orden:$orden})
    }`, { variables: { indicadorId, orden } });
    return readCurricularCreatedItem(entity, getIdFromKeyOutput(result.data.aprendizaje_insert));
  }
  const moduloId = positive(data.moduloId, "Modulo");
  const indicadorId = positive(data.indicadorCapacidadId, "Indicador");
  const current = await dataConnect.executeGraphql<{ actividads: Sesion[] }, { indicadorId: number }>(SESIONES_QUERY, { variables: { indicadorId } });
  const orden = nextOrder(current.data.actividads.filter(item => item.moduloId == null || item.moduloId === moduloId));
  if (data.aprendizajeId != null) {
    const aprendizajeId = positive(data.aprendizajeId, "Aprendizaje");
    const siblings = current.data.actividads.filter(item => item.aprendizaje.id === aprendizajeId && (item.moduloId == null || item.moduloId === moduloId));
    const result = await dataConnect.executeGraphql<{ sesion: unknown }, Record<string, unknown>>(`mutation CurricularCreateSesionInLearning($moduloId:Int!,$indicadorId:Int!,$aprendizajeId:Int!,$orden:Int!) @transaction {
      query { aprendizaje(id:$aprendizajeId) @check(expr:"this != null && this.indicadorCapacidadId == vars.indicadorId",message:"El aprendizaje no pertenece a este indicador.") { id indicadorCapacidadId } }
      sesion:actividad_insert(data:{nombre:"Nueva sesion",aprendizajeId:$aprendizajeId,moduloId:$moduloId,orden:$orden})
    }`, { variables: { moduloId, indicadorId, aprendizajeId, orden: nextOrder(siblings) } });
    return readCurricularCreatedItem(entity, getIdFromKeyOutput(result.data.sesion));
  }
  const learningOrder = await nextCurricularChildOrder("aprendizaje", indicadorId);
  const result = await dataConnect.executeGraphql<{ sesion: unknown }, Record<string, unknown>>(`mutation CurricularCreateSesion($moduloId:Int!,$indicadorId:Int!,$orden:Int!,$learningOrder:Int!) @transaction {
    aprendizaje:aprendizaje_insert(data:{descripcion:"Nuevo aprendizaje",indicadorCapacidadId:$indicadorId,orden:$learningOrder})
    sesion:actividad_insert(data:{nombre:"Nueva sesion",aprendizajeId_expr:"response.aprendizaje.id",moduloId:$moduloId,orden:$orden})
  }`, { variables: { moduloId, indicadorId, orden, learningOrder } });
  return readCurricularCreatedItem(entity, getIdFromKeyOutput(result.data.sesion));
}

export async function deleteCurricularExtra(entity: string, data: Record<string, unknown>) {
  if (entity === "competencia") {
    const id = positive(data.competenciaId, "Competencia");
    const current = await dataConnect.executeGraphql<{ competencia: Competencia | null; competenciaUnidadesDidacticas: Array<{ unidadDidacticaId: number }> }, { id: number }>(COMPETENCIA_QUERY, { variables: { id } });
    if (current.data.competenciaUnidadesDidacticas.length) throw new https.HttpsError("failed-precondition", "Primero quita las unidades de esta competencia.");
    await dataConnect.executeGraphql(`mutation CurricularDeleteCompetencia($id:Int!) @transaction {
      query { competenciaUnidadesDidacticas(where:{competenciaId:{eq:$id}},limit:1) @check(expr:"this.size() == 0",message:"La competencia tiene unidades asociadas.") { id } }
      competencia_delete(id:$id)
    }`, { variables: { id } });
    return { id };
  }
  const id = positive(data.actividadId, "Sesion");
  await dataConnect.executeGraphql(`mutation CurricularDeleteSesion($id:Int!) { actividad_delete(id:$id) }`, { variables: { id } });
  return { id };
}

export async function reorderCurricularExtra(entity: string, items: Array<{ id: number; orden: number }>, data: Record<string, unknown>) {
  if (new Set(items.map(item => item.id)).size !== items.length) throw new https.HttpsError("invalid-argument", "No se permiten elementos repetidos.");
  if (items.some(item => !Number.isInteger(item.orden) || !Number.isInteger(item.id))) throw new https.HttpsError("invalid-argument", "Orden invalido.");
  const variables: Record<string, unknown> = {};
  const definitions: string[] = [];
  const fields: string[] = [];
  if (entity === "modulo") {
    const planId = positive(data.planId, "Plan");
    const current = await dataConnect.executeGraphql<{ modulos: Array<{ id: number; planId?: number | null }>; planModulos: Array<{ id: number; moduloId: number }> }, { ids: number[]; planId: number }>(REORDER_MODULOS_QUERY, { variables: { ids: items.map(item => item.id), planId } });
    for (const [index, item] of items.entries()) {
      const modulo = current.data.modulos.find(row => row.id === item.id);
      const relation = current.data.planModulos.find(row => row.moduloId === item.id);
      if (!modulo || (!relation && modulo.planId !== planId)) throw new https.HttpsError("failed-precondition", "Los modulos deben pertenecer al mismo plan.");
      definitions.push(`$m${index}:PlanModulo_Data! @allow(fields:"planId moduloId orden")`);
      variables[`m${index}`] = { planId, moduloId: item.id, orden: item.orden };
      if (relation) { definitions.push(`$r${index}:Int!`); variables[`r${index}`] = relation.id; }
      fields.push(`r${index}:planModulo_${relation ? `update(id:$r${index},` : "insert("}data:$m${index})`);
      if (modulo.planId === planId) fields.push(`m${index}:modulo_update(id:${item.id},data:{orden:${item.orden}})`);
    }
  } else if (entity === "competencia") {
    const moduloId = positive(data.moduloId, "Modulo");
    const current = await dataConnect.executeGraphql<{ competencias: Competencia[] }, { moduloId: number }>(`query CurricularCompetenciaOrder($moduloId:Int!) { competencias(where:{moduloId:{eq:$moduloId}},limit:10000) { id tipo moduloId orden nombre } }`, { variables: { moduloId } });
    const ordered = items.slice().sort((a, b) => a.orden - b.orden).map(item => current.data.competencias.find(row => row.id === item.id));
    if (ordered.some(item => !item)) throw new https.HttpsError("failed-precondition", "La competencia no pertenece a este modulo.");
    for (const item of items) fields.push(`c${item.id}:competencia_update(id:${item.id},data:{orden:${item.orden}})`);
  } else if (entity === "aprendizaje") {
    const indicadorId = positive(data.indicadorCapacidadId, "Indicador");
    const current = await dataConnect.executeGraphql<{ aprendizajes: Array<{ id: number }> }, { indicadorId: number }>(`query CurricularLearningOrder($indicadorId:Int!) {
      aprendizajes(where:{indicadorCapacidadId:{eq:$indicadorId}},limit:10000) { id }
    }`, { variables: { indicadorId } });
    if (items.some(item => !current.data.aprendizajes.some(row => row.id === item.id))) throw new https.HttpsError("failed-precondition", "El aprendizaje no pertenece al indicador.");
    for (const item of items) fields.push(`a${item.id}:aprendizaje_update(id:${item.id},data:{orden:${item.orden}})`);
  } else {
    const moduloId = positive(data.moduloId, "Modulo");
    const indicadorId = positive(data.indicadorCapacidadId, "Indicador");
    const current = await dataConnect.executeGraphql<{ actividads: Sesion[] }, { indicadorId: number }>(SESIONES_QUERY, { variables: { indicadorId } });
    const parents = new Set(items.map(item => current.data.actividads.find(row => row.id === item.id)?.aprendizaje.id));
    if (parents.size > 1) throw new https.HttpsError("failed-precondition", "Reordena sesiones del mismo aprendizaje; para cambiar de padre utiliza la reasignacion.");
    for (const item of items) {
      if (!current.data.actividads.some(row => row.id === item.id && (row.moduloId == null || row.moduloId === moduloId))) throw new https.HttpsError("failed-precondition", "La sesion no pertenece a este indicador y modulo.");
      fields.push(`s${item.id}:actividad_update(id:${item.id},data:{orden:${item.orden}})`);
    }
  }
  await dataConnect.executeGraphql(`mutation CurricularSaveOrder${definitions.length ? `(${definitions.join(",")})` : ""} @transaction { ${fields.join("\n")} }`, { variables });
  return { updated: items.length };
}

export const saveEstructuraAcademicaSesionItem = https.onCall(async (data, context) => {
  await requirePermission(context, "estructura-academica", "edit");
  const actividadId = positive(data?.actividadId, "Sesion");
  if (data?.kind !== "material") throw new https.HttpsError("invalid-argument", "Solo se administran recursos en una sesion.");
  const singular = "actividadMaterial";
  const list = "actividadMateriales";
  const selection = "id orden texto materialId material { nombre }";
  const current = await dataConnect.executeGraphql<{ actividad: { id: number } | null; items: Item[] }, { actividadId: number }>(`query CurricularSessionItems($actividadId:Int!) {
    actividad(id:$actividadId) { id }
    items:${list}(where:{actividadId:{eq:$actividadId}},orderBy:{orden:ASC},limit:1000) { ${selection} }
  }`, { variables: { actividadId } });
  if (!current.data.actividad) throw new https.HttpsError("not-found", "La sesion ya no existe.");
  if (data?.action === "remove") {
    const id = positive(data?.itemId, "Elemento");
    if (!current.data.items.some(item => item.id === id)) throw new https.HttpsError("failed-precondition", "El elemento no pertenece a esta sesion.");
    await preserveLegacyMaterial(current.data.items.find(item => item.id === id)!);
    await dataConnect.executeGraphql(`mutation CurricularRemoveSessionItem($id:Int!) { ${singular}_delete(id:$id) }`, { variables: { id } });
  } else if (data?.action === "reorder") {
    if (!Array.isArray(data.items) || !data.items.length) {
      throw new https.HttpsError("invalid-argument", "Orden de elementos invalido.");
    }
    const items: Array<{ id: number; orden: number }> = data.items.map((item: { id?: unknown; orden?: unknown }, index: number) => {
      const id = positive(item?.id, "Elemento");
      if (item?.orden !== index + 1) throw new https.HttpsError("invalid-argument", "Orden de elementos invalido.");
      return { id, orden: index + 1 };
    });
    const ids = new Set(items.map(item => item.id));
    if (ids.size !== items.length || items.length !== current.data.items.length || current.data.items.some(item => !ids.has(item.id))) {
      throw new https.HttpsError("failed-precondition", "La lista de elementos cambio. Actualiza e intenta nuevamente.");
    }
    // Free the final positions without changing IDs or violating the unique session/order pair.
    const occupied = new Set([...current.data.items.map(item => item.orden), ...items.map(item => item.orden)]);
    let candidate = 1;
    // Response dependencies ensure all staging writes finish before applying final positions.
    const temporary = items.map((item, index) => {
      while (occupied.has(candidate)) candidate += 1;
      const orden = candidate;
      occupied.add(orden);
      const selector = index === 0 ? `id:${item.id}` : `id_expr:"response.hold${items[index - 1].id} != null ? ${item.id} : 0"`;
      return `hold${item.id}:${singular}_update(${selector},data:{orden:${orden}}) @check(expr:"this != null",message:"El elemento ya no existe.")`;
    });
    const finalPositions = items.map((item, index) => {
      const previous = index === 0 ? `hold${items[items.length - 1].id}` : `c${items[index - 1].id}`;
      return `c${item.id}:${singular}_update(id_expr:"response.${previous} != null ? ${item.id} : 0",data:{orden:${item.orden}}) @check(expr:"this != null",message:"El elemento ya no existe.")`;
    });
    await dataConnect.executeGraphql(`mutation CurricularReorderSessionItems($actividadId:Int!,$ids:[Int!]!) @transaction {
      query {
        current:${list}(where:{actividadId:{eq:$actividadId}},limit:1000)
          @check(expr:"this.size() == ${items.length}",message:"La lista de elementos cambio.") { id }
        selected:${list}(where:{actividadId:{eq:$actividadId},id:{in:$ids}},limit:1000)
          @check(expr:"this.size() == ${items.length}",message:"La lista de elementos cambio.") { id }
      }
      ${temporary.join("\n")}
      ${finalPositions.join("\n")}
    }`, { variables: { actividadId, ids: [...ids] } });
  } else if (data?.action === "add") {
    if (current.data.items.length >= 200) throw new https.HttpsError("failed-precondition", "Se permiten hasta 200 elementos por lista.");
    const materials: Array<{ id: number; nombre: string }> = [];
    if (data.materialId != null) materials.push(await getMaterialRow(positive(data.materialId, "Recurso")));
    else if (data.sourceId != null) {
      const source = await dataConnect.executeGraphql<{ item: Item | null }, { id: number }>(
        'query LegacySourceMaterial($id:Int!) { item:actividadMaterial(id:$id) { id orden texto materialId } }', { variables: { id: positive(data.sourceId, "Recurso") } },
      );
      if (!source.data.item) throw new https.HttpsError("not-found", "El recurso ya no existe.");
      materials.push(await preserveLegacyMaterial(source.data.item));
    } else {
      const text = String(data?.texto ?? "");
      const names = text.split(/[\r\n,;]+/).map(name => name.trim()).filter(Boolean);
      if (!names.length || text.length > 50000 || names.length > 200 || names.some(name => name.length > 10000)) {
        throw new https.HttpsError("invalid-argument", "Escribe hasta 200 recursos de 10000 caracteres, separados por líneas, comas o punto y coma.");
      }
      if (current.data.items.length + names.length > 200) throw new https.HttpsError("failed-precondition", "Se permiten hasta 200 elementos por lista.");
      for (let start = 0; start < names.length; start += 10) {
        materials.push(...await Promise.all(names.slice(start, start + 10).map(getOrCreateMaterial)));
      }
    }
    if (current.data.items.length + materials.length > 200) throw new https.HttpsError("failed-precondition", "Se permiten hasta 200 elementos por lista.");
    const variables: Record<string, unknown> = { actividadId };
    const definitions = ['$actividadId:Int!'];
    const start = Math.max(0, ...current.data.items.map(item => item.orden));
    const fields = materials.map((material, index) => {
      definitions.push(`$materialId${index}:Int!`, `$texto${index}:String!`);
      variables[`materialId${index}`] = material.id; variables[`texto${index}`] = material.nombre;
      return `m${index}:actividadMaterial_insert(data:{actividadId:$actividadId,materialId:$materialId${index},texto:$texto${index},orden:${start + index + 1}})`;
    });
    await dataConnect.executeGraphql(`mutation AttachSessionMaterials(${definitions.join(",")}) @transaction {
      query { items:actividadMateriales(where:{actividadId:{eq:$actividadId}},limit:1000) @check(expr:"this.size() == ${current.data.items.length}",message:"La lista de recursos cambió. Intenta nuevamente.") { id } }
      ${fields.join("\n")}
    }`, { variables });
  } else throw new https.HttpsError("invalid-argument", "Accion invalida.");
  const saved = await dataConnect.executeGraphql<{ items: Item[] }, { actividadId: number }>(`query CurricularSavedSessionItems($actividadId:Int!) { items:${list}(where:{actividadId:{eq:$actividadId}},orderBy:{orden:ASC},limit:1000) { ${selection} } }`, { variables: { actividadId } });
  return { actividadId, kind: data.kind, items: data.kind === "material" ? saved.data.items.map(displayMaterialLink) : saved.data.items };
});

export const saveEstructuraAcademicaIndicadorContenido = https.onCall(async (data, context) => {
  await requirePermission(context, "estructura-academica", "edit");
  const indicadorCapacidadId = positive(data?.indicadorCapacidadId, "Indicador");
  const read = () => dataConnect.executeGraphql<{ indicador: { id: number; orden: number | null } | null; items: Item[] }, { indicadorCapacidadId: number }>(`query CurricularIndicatorContents($indicadorCapacidadId:Int!) {
    indicador:indicadorCapacidad(id:$indicadorCapacidadId) { id orden }
    items:indicadorContenidos(where:{indicadorCapacidadId:{eq:$indicadorCapacidadId}},orderBy:{orden:ASC},limit:1000) { id orden texto contenidoPadreId }
  }`, { variables: { indicadorCapacidadId } });
  const current = await read();
  if (!current.data.indicador) throw new https.HttpsError("not-found", "El indicador ya no existe.");
  if (current.data.items.length === 1000) throw new https.HttpsError("resource-exhausted", "Demasiados contenidos para administrar la jerarquía.");
  const mutate = (name: string, fields: string, definitions: string[] = [], variables: Record<string, unknown> = {}) => {
    const originalOrder = current.data.indicador!.orden ?? null;
    const ids = current.data.items.map(item => item.id);
    const orderMap = `{${current.data.items.map(item => `${item.id}:${item.orden}`).join(",")}}`;
    const parentMap = `{${current.data.items.map(item => `${item.id}:${item.contenidoPadreId ?? "null"}`).join(",")}}`;
    const snapshot = `this.size() == ${ids.length}` + (ids.length
      ? ` && this.all(row, row.id in [${ids.join(",")}] && row.orden == ${orderMap}[row.id] && row.contenidoPadreId == ${parentMap}[row.id])` : "");
    // Serialize tree changes on their indicator. Compare its order to avoid undoing a concurrent reorder.
    return dataConnect.executeGraphql(`mutation ${name}($indicadorCapacidadId:Int!${definitions.length ? "," + definitions.join(",") : ""}) @transaction {
      lock:indicadorCapacidad_update(first:{where:{id:{eq:$indicadorCapacidadId},orden:{${originalOrder == null ? "isNull:true" : `eq:${originalOrder}`}}}},data:{orden:${originalOrder ?? "null"}}) @check(expr:"this != null",message:"El indicador cambió. Actualiza la vista.")
      query { items:indicadorContenidos(where:{indicadorCapacidadId:{eq_expr:"response.lock.id"}},limit:1000) @check(expr:${JSON.stringify(snapshot)},message:"Los contenidos cambiaron. Intenta nuevamente.") { id orden contenidoPadreId } }
      ${fields}
    }`, { variables: { indicadorCapacidadId, ...variables } });
  };
  if (data?.action === "remove") {
    const id = positive(data?.itemId, "Contenido");
    if (!current.data.items.some(item => item.id === id)) throw new https.HttpsError("failed-precondition", "El contenido no pertenece a este indicador.");
    const ids = contentSubtreeIds(current.data.items, id);
    if (ids.length > 1 && data?.includeDescendants !== true) {
      throw new https.HttpsError("failed-precondition", `Este contenido tiene ${ids.length - 1} subcontenidos. Confirma su eliminación.`, { descendants: ids.length - 1 });
    }
    await mutate('RemoveIndicatorContent', `indicadorContenido_deleteMany(where:{indicadorCapacidadId:{eq_expr:"response.lock.id"},id:{in:$ids}}) @check(expr:"this == ${ids.length}",message:"La lista de contenidos cambió.")`, ['$ids:[Int!]!'], { ids });
  } else if (data?.action === "reorder" || data?.action === "move") {
    let items: Array<{ id: number; orden: number; contenidoPadreId?: number | null }>;
    let movedId: number | undefined;
    if (data.action === "move") {
      movedId = positive(data.itemId, "Contenido");
      const targetId = data.targetId === null ? null : positive(data.targetId, "Destino");
      if (!["before", "after", "inside"].includes(data.position) || (targetId == null && data.position !== "inside")) {
        throw new https.HttpsError("invalid-argument", "Posición de destino inválida.");
      }
      if (!current.data.items.some(item => item.id === movedId) || (targetId != null && !current.data.items.some(item => item.id === targetId))) {
        throw new https.HttpsError("failed-precondition", "El contenido y el destino deben pertenecer a este indicador.");
      }
      if (targetId != null && contentSubtreeIds(current.data.items, movedId).includes(targetId)) {
        throw new https.HttpsError("failed-precondition", "No puedes mover un contenido dentro de sí mismo ni de sus descendientes.");
      }
      items = moveContentBranch(current.data.items, { itemId: movedId, targetId, position: data.position });
      if (!items.length) return { indicadorCapacidadId, items: current.data.items };
    } else {
      if (!Array.isArray(data.items) || data.items.length !== current.data.items.length) throw new https.HttpsError("invalid-argument", "Orden de contenidos invalido.");
      items = data.items.map((item: { id?: unknown; orden?: unknown }, index: number) => ({ id: positive(item.id, "Contenido"), orden: index + 1 }));
    }
    const ids = new Set(items.map(item => item.id));
    if (ids.size !== items.length || current.data.items.some(item => !ids.has(item.id))) throw new https.HttpsError("failed-precondition", "La lista de contenidos cambio. Actualiza e intenta nuevamente.");
    const occupied = new Set([...current.data.items.map(item => item.orden), ...items.map(item => item.orden)]);
    let candidate = 1;
    const temporary = items.map((item, index: number) => {
      while (occupied.has(candidate)) candidate += 1;
      const order = candidate; occupied.add(order);
      const selector = index === 0 ? `id:${item.id}` : `id_expr:"response.hold${items[index - 1].id} != null ? ${item.id} : 0"`;
      return `hold${item.id}:indicadorContenido_update(${selector},data:{orden:${order}}) @check(expr:"this != null",message:"El contenido ya no existe.")`;
    });
    const finalPositions = items.map((item, index: number) => {
      const previous = index === 0 ? `hold${items[items.length - 1].id}` : `c${items[index - 1].id}`;
      return `c${item.id}:indicadorContenido_update(id_expr:"response.${previous} != null ? ${item.id} : 0",data:{orden:${item.orden}${item.id === movedId ? `,contenidoPadreId:${item.contenidoPadreId ?? "null"}` : ""}})`;
    });
    if (items.length) await mutate(data.action === "move" ? 'MoveIndicatorContent' : 'ReorderIndicatorContents', `${temporary.join("\n")} ${finalPositions.join("\n")}`);
  } else if (data?.action === "add") {
    const contenidoPadreId = data?.contenidoPadreId == null ? null : positive(data.contenidoPadreId, "Contenido padre");
    if (contenidoPadreId != null && !current.data.items.some(item => item.id === contenidoPadreId)) {
      throw new https.HttpsError("failed-precondition", "El contenido padre no pertenece a este indicador.");
    }
    const despuesDeId = data.despuesDeId == null ? null : positive(data.despuesDeId, "Contenido anterior");
    const previous = current.data.items.find(item => item.id === despuesDeId);
    if (despuesDeId != null && (!previous || (previous.contenidoPadreId ?? null) !== contenidoPadreId)) {
      throw new https.HttpsError("failed-precondition", "El contenido anterior debe pertenecer al mismo nivel e indicador.");
    }
    const lines = splitIndicatorContents(data?.texto);
    if (!lines.length) throw new https.HttpsError("invalid-argument", "Escribe al menos un contenido.");
    if (lines.length > 200 || lines.some(line => line.length > 10000)) throw new https.HttpsError("invalid-argument", "Se permiten hasta 200 contenidos de 10000 caracteres.");
    const accepted: string[] = [];
    const siblingTexts = current.data.items.filter(item => (item.contenidoPadreId ?? null) === contenidoPadreId).map(item => item.texto);
    for (const line of lines) {
      if (![...siblingTexts, ...accepted].some(saved => indicatorContentsAreSimilar(saved, line))) accepted.push(line);
    }
    if (current.data.items.length + accepted.length > 200) throw new https.HttpsError("failed-precondition", "Se permiten hasta 200 contenidos por indicador.");
    if (accepted.length) {
      const variables: Record<string, unknown> = { contenidoPadreId };
      const definitions = ['$contenidoPadreId:Int'];
      const start = previous?.orden ?? Math.max(0, ...current.data.items.map(item => item.orden));
      const shifted = current.data.items.filter(item => item.orden > start).sort((a, b) => b.orden - a.orden);
      const shifts = shifted.map((item, index) => {
        const ready = index === 0 ? 'response.lock.id == vars.indicadorCapacidadId' : `response.shift${shifted[index - 1].id} != null`;
        return `shift${item.id}:indicadorContenido_update(id_expr:"${ready} ? ${item.id} : 0",data:{orden:${item.orden + accepted.length}}) @check(expr:"this != null",message:"El contenido ya no existe.")`;
      });
      const indicator = shifted.length ? `response.shift${shifted[shifted.length - 1].id} != null ? response.lock.id : 0` : 'response.lock.id';
      const fields = accepted.map((texto, index) => {
        definitions.push(`$texto${index}:String!`); variables[`texto${index}`] = texto;
        return `c${index}:indicadorContenido_insert(data:{indicadorCapacidadId_expr:"${indicator}",contenidoPadreId:$contenidoPadreId,orden:${start + index + 1},texto:$texto${index}})`;
      });
      await mutate('AddIndicatorContents', [...shifts, ...fields].join("\n"), definitions, variables);
    }
  } else throw new https.HttpsError("invalid-argument", "Accion invalida.");
  const saved = await read();
  return { indicadorCapacidadId, items: saved.data.items };
});
