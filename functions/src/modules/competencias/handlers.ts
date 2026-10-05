import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import { toNumberOrNull, getIdFromKeyOutput } from "../core/userMappers.js";
import { expectedCompetenciaType, isProgramaEstudio, orderedUnidadRelations, TipoCompetencia } from "./model.js";
import { CompetenciaRow, CompetenciaUnidadRow, getModuloCompetenciaContext, parseAcademicIds, reconcileModuloUnits } from "./service.js";

const fields = `id nombre tipo moduloId`;
const listQuery = `query ListCompetencias {
  competencias(limit:10000,orderBy:[{moduloId:ASC},{id:ASC}]) { ${fields} modulo { titulo tituloComercial } }
  competenciaUnidadesDidacticas(limit:50000) { id competenciaId unidadDidacticaId orden }
}`;

export const listCompetencias = https.onCall(async (_data, context) => {
  await requirePermission(context, "competencias", "view");
  const response = await dataConnect.executeGraphql<{
    competencias: Array<CompetenciaRow & { modulo: { titulo?: string; tituloComercial?: string } }>;
    competenciaUnidadesDidacticas: Array<{ competenciaId: number; unidadDidacticaId: number }>;
  }, Record<string, never>>(listQuery);
  return { competencias: response.data.competencias.map(c => ({ ...c,
    moduloNombre: c.modulo.titulo || c.modulo.tituloComercial,
    tipoNombre: c.tipo === "TECNICA" ? "Tecnica" : "Para la empleabilidad",
    unidadIds: response.data.competenciaUnidadesDidacticas.filter(r => r.competenciaId === c.id).map(r => r.unidadDidacticaId),
  })) };
});

export const getCompetencia = https.onCall(async (data, context) => {
  await requirePermission(context, "competencias", "view");
  const id = toNumberOrNull(data?.id);
  if (!id) throw new https.HttpsError("invalid-argument", "id requerido.");
  const response = await dataConnect.executeGraphql<{
    competencia: CompetenciaRow | null;
    competenciaUnidadesDidacticas: Array<{ unidadDidacticaId: number }>;
  }, { id: number }>(`query GetCompetencia($id:Int!) {
    competencia(id:$id) { ${fields} }
    competenciaUnidadesDidacticas(where:{competenciaId:{eq:$id}},limit:50000) { unidadDidacticaId }
  }`, { variables: { id } });
  return { competencia: response.data.competencia && { ...response.data.competencia,
    unidadIds: response.data.competenciaUnidadesDidacticas.map(r => r.unidadDidacticaId),
  } };
});

export const createOrUpdateCompetencia = https.onCall(async (data, context) => {
  const id = toNumberOrNull(data?.id);
  await requirePermission(context, "competencias", id ? "edit" : "create");
  const nombre = String(data?.nombre ?? "").trim();
  const tipo = data?.tipo as TipoCompetencia;
  const moduloId = toNumberOrNull(data?.moduloId);
  if (!nombre || !moduloId || !["TECNICA", "EMPLEABILIDAD"].includes(tipo)) throw new https.HttpsError("invalid-argument", "Nombre, modulo y tipo requeridos.");
  if (data?.capacidadIds !== undefined) throw new https.HttpsError("invalid-argument", "Las capacidades pertenecen a las unidades didacticas; actualice el formulario.");
  const moduleContext = await getModuloCompetenciaContext(moduloId);
  if (!moduleContext.programa && tipo !== "TECNICA") throw new https.HttpsError("invalid-argument", "Opcion ocupacional solo admite competencias tecnicas.");
  const old = id ? await dataConnect.executeGraphql<{
    competenciaUnidadesDidacticas: CompetenciaUnidadRow[];
  }, { id: number }>(`query ExistingCompetenciaUnits($id:Int!) {
    competenciaUnidadesDidacticas(where:{competenciaId:{eq:$id}},limit:10000) {
      id competenciaId unidadDidacticaId orden competencia { id nombre tipo moduloId }
    }
  }`, { variables: { id } }) : null;
  const oldRelations = old?.data.competenciaUnidadesDidacticas ?? [];
  const unidades = parseAcademicIds(data?.unidadIds ?? oldRelations.map(r => r.unidadDidacticaId));
  for (const unidadId of unidades) {
    if (!moduleContext.unidadIds.includes(unidadId) || expectedCompetenciaType(moduleContext.programa, moduleContext.modulo.horas, moduleContext.unidadIds, unidadId) !== tipo) {
      throw new https.HttpsError("invalid-argument", "La unidad seleccionada no corresponde al modulo o al tipo de competencia.");
    }
  }
  const changes = [
    ...(id ? [`query { competencia(id:$id) @check(expr:"this != null", message:"Competencia no encontrada") { id } }`] : []),
    `saved:competencia_${id ? "update(id:$id," : "insert("}data:$data)`,
    ...oldRelations.filter(r => !unidades.includes(r.unidadDidacticaId)).map(r => `d${r.id}:competenciaUnidadDidactica_delete(id:${r.id})`),
    ...unidades.map(unidadId => {
      const relation = moduleContext.relations.find(r => r.unidadDidacticaId === unidadId)!;
      return `u${relation.id}:competenciaUnidadDidactica_update(id:${relation.id},data:{competenciaId_expr:"response.saved.id"})`;
    }),
  ];
  const response = await dataConnect.executeGraphql<{ saved: unknown }, Record<string, unknown>>(
    `mutation SaveCompetencia(${id ? "$id:Int!," : ""}$data:Competencia_Data! @allow(fields:"nombre tipo moduloId")) @transaction { ${changes.join("\n")} }`,
    { variables: { ...(id ? { id } : {}), data: { nombre, tipo, moduloId } } },
  );
  for (const affected of new Set([moduloId, ...oldRelations.map(r => r.competencia.moduloId)])) await reconcileModuloUnits(affected);
  return { id: getIdFromKeyOutput(response.data.saved) };
});

export const deleteCompetencia = https.onCall(async (data, context) => {
  await requirePermission(context, "competencias", "delete");
  const id = toNumberOrNull(data?.id);
  if (!id) throw new https.HttpsError("invalid-argument", "id requerido.");
  try {
    const response = await dataConnect.executeGraphql(`mutation DeleteCompetencia($id:Int!) @transaction {
      query { competenciaUnidadesDidacticas(where:{competenciaId:{eq:$id}},limit:1)
        @check(expr:"this.size() == 0", message:"La competencia tiene unidades asociadas.") { id } }
      deleted:competencia_delete(id:$id)
    }`, { variables: { id } });
    return response.data;
  } catch (error) {
    if (String((error as Error).message).includes("La competencia tiene unidades asociadas")) {
      throw new https.HttpsError("failed-precondition", "La competencia tiene unidades didacticas asociadas.");
    }
    throw error;
  }
});

export const listCompetenciaOpciones = https.onCall(async (_data, context) => {
  await requirePermission(context, "unidades-didacticas", "view");
  const response = await dataConnect.executeGraphql<{ competencias: Array<CompetenciaRow & { modulo: { titulo?: string } }> }, Record<string, never>>(
    `query CompetenciaOptions { competencias(limit:10000) { ${fields} modulo { titulo } } }`,
  );
  return { competencias: response.data.competencias.map(c => ({ ...c, etiqueta: `${c.modulo.titulo} / ${c.tipo === "TECNICA" ? "Tecnica" : "Empleabilidad"} / ${c.nombre || "Sin nombre"}` })) };
});

export const listCompetenciaFormularioOpciones = https.onCall(async (_data, context) => {
  await requirePermission(context, "competencias", "view");
  const response = await dataConnect.executeGraphql<{
    modulos: Array<{ id: number; titulo?: string; horas?: number | null; plan?: { carrera?: { tipoCarrera?: { nombre?: string } } } }>;
    planModulos: Array<{ moduloId: number; plan: { carrera?: { tipoCarrera?: { nombre?: string } } } }>;
    competenciaUnidadesDidacticas: CompetenciaUnidadRow[];
    unidadesDidacticas: Array<{ id: number; nombre?: string }>;
  }, Record<string, never>>(`query CompetenciaFormOptions {
    modulos(limit:10000) { id titulo horas plan { carrera { tipoCarrera { nombre } } } }
    planModulos(limit:50000) { moduloId plan { carrera { tipoCarrera { nombre } } } }
    competenciaUnidadesDidacticas(limit:50000) { id orden competenciaId unidadDidacticaId competencia { id nombre tipo moduloId } }
    unidadesDidacticas(limit:50000) { id nombre }
  }`);
  const { modulos, planModulos, competenciaUnidadesDidacticas, unidadesDidacticas } = response.data;
  const tipos: Array<{ valor: string; etiqueta: string; moduloId: number }> = [];
  const unidades: Array<{ id: number; etiqueta: string; moduloId: number; tipo: TipoCompetencia }> = [];
  for (const modulo of modulos) {
    const carreraTypes = [modulo.plan, ...planModulos.filter(r => r.moduloId === modulo.id).map(r => r.plan)]
      .map(p => p?.carrera?.tipoCarrera?.nombre).filter((name): name is string => Boolean(name));
    const programa = carreraTypes.length > 0 && carreraTypes.every(isProgramaEstudio);
    tipos.push({ valor: "TECNICA", etiqueta: "Técnica", moduloId: modulo.id });
    if (programa) tipos.push({ valor: "EMPLEABILIDAD", etiqueta: "Para la empleabilidad", moduloId: modulo.id });
    const orderedIds = orderedUnidadRelations(competenciaUnidadesDidacticas.filter(r => r.competencia.moduloId === modulo.id)).map(r => r.unidadDidacticaId);
    for (const id of orderedIds) {
      if (programa && (!modulo.horas || modulo.horas <= 0)) continue;
      unidades.push({ id, etiqueta: unidadesDidacticas.find(u => u.id === id)?.nombre || `Unidad ${id}`, moduloId: modulo.id,
        tipo: expectedCompetenciaType(programa, modulo.horas, orderedIds, id) });
    }
  }
  return { modulos: modulos.map(m => ({ id: m.id, etiqueta: m.titulo || `Modulo ${m.id}` })), tipos, unidades };
});
