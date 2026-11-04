import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";

export const nextCurricularOrder = (items: Array<{ id: number; orden?: number | null }>) => Math.max(0, ...items.map(item => item.orden ?? item.id)) + 1;

export async function nextCurricularChildOrder(entity: "capacidadTerminal" | "indicadorCapacidad" | "aprendizaje", parentId: number) {
  const [list, fk] = {
    capacidadTerminal: ["capacidadesTerminales", "unidadDidacticaId"],
    indicadorCapacidad: ["indicadoresCapacidad", "capacidadTerminalId"],
    aprendizaje: ["aprendizajes", "indicadorCapacidadId"],
  }[entity];
  const response = await dataConnect.executeGraphql<{ items: Array<{ id: number; orden: number | null }> }, { parentId: number }>(
    `query CurricularNextChildOrder($parentId:Int!) { items:${list}(where:{${fk}:{eq:$parentId}},limit:10001) { id orden } }`, { variables: { parentId } });
  if (response.data.items.length > 10000) throw new https.HttpsError("resource-exhausted", "La lista tiene demasiados elementos.");
  return nextCurricularOrder(response.data.items);
}

export async function readCurricularUnitAssignments(moduloId: number) {
  type Assignment = { id: number; orden: number | null; unidadDidacticaId: number; competenciaId: number; competenciaContinuacionId?: number | null; competencia: { id: number; nombre: string; tipo: string; moduloId: number; orden: number | null }; competenciaContinuacion?: { planModulo: { moduloId: number } } | null };
  const response = await dataConnect.executeGraphql<{ originals: Assignment[]; continuations: Assignment[] }, { moduloId: number }>(`query CurricularUnitAssignments($moduloId:Int!) {
    originals:competenciaUnidadesDidacticas(where:{competencia:{moduloId:{eq:$moduloId}},competenciaContinuacionId:{isNull:true}},limit:10000) {
      id orden unidadDidacticaId competenciaId competenciaContinuacionId competencia { id nombre tipo moduloId orden }
    }
    continuations:competenciaUnidadesDidacticas(where:{competenciaContinuacion:{planModulo:{moduloId:{eq:$moduloId}}}},limit:10000) {
      id orden unidadDidacticaId competenciaId competenciaContinuacionId competencia { id nombre tipo moduloId orden }
      competenciaContinuacion { planModulo { moduloId } }
    }
  }`, { variables: { moduloId } });
  return [...response.data.originals, ...response.data.continuations].map(item => ({ ...item,
    competencia: { ...item.competencia, moduloId: item.competenciaContinuacion?.planModulo.moduloId ?? item.competencia.moduloId },
  }));
}

/** Returns only the newly created item, with the real IDs needed for immediate dragging. */
export async function readCurricularCreatedItem(entity: string, id: number | null) {
  if (!id) throw new https.HttpsError("internal", "No se obtuvo el identificador del elemento creado.");
  const selections: Record<string, string> = {
    modulo: `id titulo tituloComercial orden descripcion horas creditos metas activo slug comun planId
      plan { id planEstudio tituloComercial anio version { titulo } periodoVigencia { titulo }
        carrera { id nombre tituloComercial especialidad { id titulo tituloComercial orden } actEconomica { familia { id titulo } } } }
      planModulos:planModulos_on_modulo { id planId orden }`,
    competencia: "id nombre tipo orden moduloId",
    unidadDidactica: "id nombre duracion creditos sigla",
    capacidadTerminal: "id descripcion sigla orden unidadDidacticaId",
    indicadorCapacidad: "id descripcion sigla orden capacidadTerminalId",
    aprendizaje: "id descripcion sigla orden indicadorCapacidadId",
    actividad: "id nombre numeroSesion duracion fecha orden moduloId aprendizajeId aprendizaje { id descripcion sigla orden indicadorCapacidadId }",
  };
  const response = await dataConnect.executeGraphql<{ item: Record<string, unknown> | null }, { id: number }>(
    `query CurricularCreatedItem($id:Int!) { item:${entity}(id:$id) { ${selections[entity]} } }`, { variables: { id } });
  if (!response.data.item) throw new https.HttpsError("not-found", "El elemento creado ya no existe.");
  return { id, entity, item: response.data.item };
}
