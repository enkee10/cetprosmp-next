import { displayMaterialLink, getMaterialRow, getOrCreateMaterial, preserveLegacyMaterial } from "../materiales/handlers.js";
import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import { getIdFromKeyOutput, toNumberOrNull } from "../core/userMappers.js";
import { expectedCompetenciaType } from "../competencias/model.js";
import { getModuloCompetenciaContext } from "../competencias/service.js";

type Item = { id: number; orden: number; texto: string; materialId?: number | null; material?: { nombre: string } | null };
type Competencia = { id: number; moduloId: number; nombre: string; tipo: "TECNICA" | "EMPLEABILIDAD"; orden?: number | null };
type Sesion = { id: number; orden?: number | null; numeroSesion?: number | null; moduloId?: number | null; aprendizaje: { indicadorCapacidadId: number } };
const nextOrder = (items: Array<{ id: number; orden?: number | null }>) => Math.max(0, ...items.map(item => item.orden ?? item.id)) + 1;
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
    id orden numeroSesion moduloId aprendizaje { indicadorCapacidadId }
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
  const singular = { actividad: "actividad", aprendizaje: "aprendizaje", actividadContenido: "actividadContenido" }[entity];
  if (!singular) throw new https.HttpsError("invalid-argument", "Elemento invalido.");
  const allowed = { actividad: "nombre", aprendizaje: "descripcion", actividadContenido: "texto" }[entity];
  if (entity === "actividad" && field === "duracion") {
    if (!Number.isInteger(value) || Number(value) <= 0) throw new https.HttpsError("invalid-argument", "Las horas deben ser un entero positivo.");
  } else if (field !== allowed) throw new https.HttpsError("invalid-argument", "Campo invalido.");
  await dataConnect.executeGraphql(`mutation CurricularEditText($id:Int!,$data:${singular[0].toUpperCase() + singular.slice(1)}_Data! @allow(fields:"${entity === "actividad" ? "nombre duracion" : allowed}")) @transaction {
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
    return { id: getIdFromKeyOutput(result.data.competencia_insert) };
  }
  const moduloId = positive(data.moduloId, "Modulo");
  const indicadorId = positive(data.indicadorCapacidadId, "Indicador");
  const current = await dataConnect.executeGraphql<{ actividads: Sesion[] }, { indicadorId: number }>(SESIONES_QUERY, { variables: { indicadorId } });
  const orden = nextOrder(current.data.actividads.filter(item => item.moduloId == null || item.moduloId === moduloId));
  const result = await dataConnect.executeGraphql<{ sesion: unknown }, Record<string, unknown>>(`mutation CurricularCreateSesion($moduloId:Int!,$indicadorId:Int!,$orden:Int!) @transaction {
    aprendizaje:aprendizaje_insert(data:{descripcion:"Nuevo aprendizaje",indicadorCapacidadId:$indicadorId})
    sesion:actividad_insert(data:{nombre:"Nueva sesion",aprendizajeId_expr:"response.aprendizaje.id",moduloId:$moduloId,orden:$orden})
  }`, { variables: { moduloId, indicadorId, orden } });
  return { id: getIdFromKeyOutput(result.data.sesion) };
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
    let empleabilidad = false;
    for (const row of ordered) {
      if (row!.tipo === "EMPLEABILIDAD") empleabilidad = true;
      else if (empleabilidad) throw new https.HttpsError("failed-precondition", "Las competencias tecnicas deben ir primero.");
    }
    for (const item of items) fields.push(`c${item.id}:competencia_update(id:${item.id},data:{orden:${item.orden}})`);
  } else {
    const moduloId = positive(data.moduloId, "Modulo");
    const indicadorId = positive(data.indicadorCapacidadId, "Indicador");
    const current = await dataConnect.executeGraphql<{ actividads: Sesion[] }, { indicadorId: number }>(SESIONES_QUERY, { variables: { indicadorId } });
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
  const singular = data?.kind === "contenido" ? "actividadContenido" : data?.kind === "material" ? "actividadMaterial" : null;
  if (!singular) throw new https.HttpsError("invalid-argument", "Tipo de elemento invalido.");
  const list = data?.kind === "contenido" ? "actividadContenidos" : "actividadMateriales";
  const selection = data.kind === "material" ? "id orden texto materialId material { nombre }" : "id orden texto";
  const current = await dataConnect.executeGraphql<{ actividad: { id: number } | null; items: Item[] }, { actividadId: number }>(`query CurricularSessionItems($actividadId:Int!) {
    actividad(id:$actividadId) { id }
    items:${list}(where:{actividadId:{eq:$actividadId}},orderBy:{orden:ASC},limit:1000) { ${selection} }
  }`, { variables: { actividadId } });
  if (!current.data.actividad) throw new https.HttpsError("not-found", "La sesion ya no existe.");
  if (data?.action === "remove") {
    const id = positive(data?.itemId, "Elemento");
    if (!current.data.items.some(item => item.id === id)) throw new https.HttpsError("failed-precondition", "El elemento no pertenece a esta sesion.");
    if (data.kind === "material") await preserveLegacyMaterial(current.data.items.find(item => item.id === id)!);
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
    let texto = String(data?.texto ?? "").trim();
    if (data?.sourceId != null) {
      const id = positive(data.sourceId, "Elemento existente");
      const source = await dataConnect.executeGraphql<{ item: { texto: string } | null }, { id: number }>(`query CurricularExistingSessionItem($id:Int!) { item:${singular}(id:$id) { texto } }`, { variables: { id } });
      if (!source.data.item) throw new https.HttpsError("not-found", "El elemento existente ya no existe.");
      texto = source.data.item.texto;
    }
    if (data.kind === "material") {
      let material;
      if (data.materialId != null) material = await getMaterialRow(positive(data.materialId, "Material"));
      else if (data.sourceId != null) {
        const source = await dataConnect.executeGraphql<{ item: Item | null }, { id: number }>(
          'query LegacySourceMaterial($id:Int!) { item:actividadMaterial(id:$id) { id orden texto materialId } }', { variables: { id: positive(data.sourceId, "Material") } },
        );
        if (!source.data.item) throw new https.HttpsError("not-found", "El material ya no existe.");
        material = await preserveLegacyMaterial(source.data.item);
      } else material = await getOrCreateMaterial(texto);
      await dataConnect.executeGraphql('mutation AttachSessionMaterial($actividadId:Int!,$materialId:Int!,$texto:String!,$orden:Int!) { actividadMaterial_insert(data:{actividadId:$actividadId,materialId:$materialId,texto:$texto,orden:$orden}) }',
        { variables: { actividadId, materialId: material.id, texto: material.nombre, orden: Math.max(0, ...current.data.items.map(item => item.orden)) + 1 } });
    } else {
      if (!texto || texto.length > 10000) throw new https.HttpsError("invalid-argument", "Escribe un texto de hasta 10000 caracteres.");
      await dataConnect.executeGraphql('mutation AddSessionContent($actividadId:Int!,$texto:String!,$orden:Int!) { actividadContenido_insert(data:{actividadId:$actividadId,texto:$texto,orden:$orden}) }',
        { variables: { actividadId, texto, orden: Math.max(0, ...current.data.items.map(item => item.orden)) + 1 } });
    }
  } else throw new https.HttpsError("invalid-argument", "Accion invalida.");
  const saved = await dataConnect.executeGraphql<{ items: Item[] }, { actividadId: number }>(`query CurricularSavedSessionItems($actividadId:Int!) { items:${list}(where:{actividadId:{eq:$actividadId}},orderBy:{orden:ASC},limit:1000) { ${selection} } }`, { variables: { actividadId } });
  return { actividadId, kind: data.kind, items: data.kind === "material" ? saved.data.items.map(displayMaterialLink) : saved.data.items };
});
