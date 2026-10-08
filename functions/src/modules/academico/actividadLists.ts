import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import { DataConnectActividadInput } from "../core/types.js";
import { getIdFromKeyOutput } from "../core/userMappers.js";

export function parseActividadList(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 200) {
    throw new https.HttpsError("invalid-argument", `${field} debe ser una lista de hasta 200 elementos.`);
  }
  return value.map(item => {
    if (typeof item !== "string" || !item.trim() || item.length > 10000) {
      throw new https.HttpsError("invalid-argument", `Cada elemento de ${field} debe contener texto.`);
    }
    return item.trim();
  });
}

export async function saveActividadLists(
  data: DataConnectActividadInput, id: number | null, contenidos?: string[], materiales?: string[],
): Promise<number> {
  const variables: Record<string, unknown> = { data };
  const definitions = ['$data:Actividad_Data! @allow(fields:"nombre descripcion proposito ambiente duracion fecha bibliografia aprendizajeId ejeTransversalId valorInstitucionalId moduloId numeroSesion orden")'];
  if (id) { definitions.push('$id:Int!'); variables.id = id; }
  const fields = [id
    ? 'saved:actividad_update(id:$id,data:$data) @check(expr:"this != null",message:"Actividad inexistente")'
    : 'saved:actividad_insert(data:$data)'];
  for (const [name, items, singular] of [
    ["contenidos", contenidos, "actividadContenido"],
    ["materiales", materiales, "actividadMaterial"],
  ] as const) {
    if (items === undefined) continue;
    if (id) fields.push(`clear_${name}:${singular}_deleteMany(where:{actividadId:{eq:$id}})`);
    items.forEach((texto, index) => {
      const variable = `${name}${index}`;
      definitions.push(`$${variable}:String!`);
      variables[variable] = texto;
      fields.push(`${variable}:${singular}_insert(data:{actividadId_expr:"response.saved.id",orden:${index + 1},texto:$${variable}})`);
    });
  }
  const response = await dataConnect.executeGraphql<{ saved: unknown }, Record<string, unknown>>(
    `mutation SaveActividadLists(${definitions.join(",")}) @transaction { ${fields.join("\n")} }`,
    { variables },
  );
  const result = getIdFromKeyOutput(response.data.saved);
  if (!result) throw new Error("No se pudo guardar la actividad.");
  return result;
}
