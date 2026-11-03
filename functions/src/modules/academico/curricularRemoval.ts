import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";

type Count = Array<{ _count: number }>;

/** Count saved grades and averages without loading student records or applying list limits. */
export async function countCurricularRemovalNotes(entity: string, input: Record<string, unknown>) {
  const fields: Record<string, string> = {
    unidadDidactica: "relacionId",
    capacidadTerminal: "capacidadTerminalId",
    indicadorCapacidad: "indicadorCapacidadId",
  };
  const field = fields[entity];
  const id = Number(input[field]);
  if (!field || !Number.isSafeInteger(id) || id <= 0) {
    throw new https.HttpsError("invalid-argument", "El elemento a eliminar no es válido.");
  }

  let targetId = id;
  if (entity === "unidadDidactica") {
    const result = await dataConnect.executeGraphql<{
      competenciaUnidadDidactica: { unidadDidacticaId: number } | null;
    }, { id: number }>(`query CurricularRemovalUnit($id: Int!) {
      competenciaUnidadDidactica(id: $id) { unidadDidacticaId }
    }`, { variables: { id } });
    if (!result.data.competenciaUnidadDidactica) {
      throw new https.HttpsError("not-found", "La unidad ya no pertenece a esta programación.");
    }
    targetId = result.data.competenciaUnidadDidactica.unidadDidacticaId;
  }

  const indicatorFilter = entity === "unidadDidactica"
    ? "indicadorCapacidad: { capacidadTerminal: { unidadDidacticaId: { eq: $id } } }"
    : entity === "capacidadTerminal"
      ? "indicadorCapacidad: { capacidadTerminalId: { eq: $id } }"
      : "indicadorCapacidadId: { eq: $id }";
  const capacityFilter = entity === "unidadDidactica"
    ? "capacidadTerminal: { unidadDidacticaId: { eq: $id } }"
    : "capacidadTerminalId: { eq: $id }";
  const result = await dataConnect.executeGraphql<{
    target: { id: number } | null;
    indicators: Count;
    capacities?: Count;
    units?: Count;
  }, { id: number }>(`query CurricularRemovalNotes($id: Int!) {
    target: ${entity}(id: $id) { id }
    indicators: indicadoresCapacidadEstudiantes(where: {
      ${indicatorFilter}, promedio: { isNull: false }
    }) { _count }
    ${entity !== "indicadorCapacidad" ? `capacities: capacidadesTerminalesEstudiantes(where: {
      ${capacityFilter}, promedio: { isNull: false }
    }) { _count }` : ""}
    ${entity === "unidadDidactica" ? `units: unidadesDidacticasEstudiantes(where: {
      unidadDidacticaId: { eq: $id }, promedio: { isNull: false }
    }) { _count }` : ""}
  }`, { variables: { id: targetId } });
  if (!result.data.target) {
    throw new https.HttpsError("not-found", "El elemento ya no existe.");
  }
  return { notasAsociadas: [result.data.indicators, result.data.capacities, result.data.units]
    .reduce((total, rows) => total + (rows?.[0]?._count ?? 0), 0) };
}
