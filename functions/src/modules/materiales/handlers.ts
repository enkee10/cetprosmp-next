import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import { getIdFromKeyOutput } from "../core/userMappers.js";

export interface MaterialRow { id: number; nombre: string; clave: string }
export interface MaterialLink { id: number; orden: number; texto: string; materialId?: number | null; material?: { nombre: string } | null }
export const materialKey = (name: string) => name.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("es");
export const displayMaterialLink = (item: MaterialLink) => ({ ...item, texto: item.material?.nombre ?? item.texto });
const idFrom = (value: unknown) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new https.HttpsError("invalid-argument", "Material invalido.");
  return id;
};
const nameFrom = (value: unknown) => {
  const name = String(value ?? "").trim();
  if (!name || name.length > 10000) throw new https.HttpsError("invalid-argument", "Escribe un material de hasta 10000 caracteres.");
  return name;
};
export async function getMaterialRow(id: number) {
  const result = await dataConnect.executeGraphql<{ material: MaterialRow | null }, { id: number }>(
    `query CatalogMaterial($id:Int!) { material(id:$id) { id nombre clave } }`, { variables: { id } },
  );
  if (!result.data.material) throw new https.HttpsError("not-found", "El material ya no existe.");
  return result.data.material;
}
export async function listMaterialCatalog() {
  const result = await dataConnect.executeGraphql<{ materiales: MaterialRow[] }, Record<string, never>>(
    `query CatalogMaterials { materiales(orderBy:{nombre:ASC},limit:10000) { id nombre clave } }`,
  );
  return result.data.materiales;
}
export async function getOrCreateMaterial(value: unknown): Promise<MaterialRow> {
  const nombre = nameFrom(value), clave = materialKey(nombre);
  const find = async () => (await dataConnect.executeGraphql<{ materiales: MaterialRow[] }, { clave: string }>(
    `query FindCatalogMaterial($clave:String!) { materiales(where:{clave:{eq:$clave}},limit:1) { id nombre clave } }`, { variables: { clave } },
  )).data.materiales[0];
  const existing = await find();
  if (existing) return existing;
  try {
    const created = await dataConnect.executeGraphql<{ material_insert: unknown }, { nombre: string; clave: string }>(
      `mutation CreateCatalogMaterial($nombre:String!,$clave:String!) { material_insert(data:{nombre:$nombre,clave:$clave}) }`, { variables: { nombre, clave } },
    );
    return { id: getIdFromKeyOutput(created.data.material_insert)!, nombre, clave };
  } catch (error) {
    const concurrent = await find();
    if (concurrent) return concurrent;
    throw error;
  }
}
export async function preserveLegacyMaterial(item: MaterialLink) {
  if (item.materialId) return getMaterialRow(item.materialId);
  const material = await getOrCreateMaterial(item.texto);
  await dataConnect.executeGraphql(`mutation LinkLegacyMaterial($id:Int!,$materialId:Int!) { actividadMaterial_update(id:$id,data:{materialId:$materialId}) }`,
    { variables: { id: item.id, materialId: material.id } });
  return material;
}
export const listMateriales = https.onCall(async (_data, context) => {
  await requirePermission(context, "materiales", "view");
  return { materiales: await listMaterialCatalog() };
});
export const getMaterial = https.onCall(async (data, context) => {
  await requirePermission(context, "materiales", "view");
  return { material: await getMaterialRow(idFrom(data?.id)) };
});
export const createOrUpdateMaterial = https.onCall(async (data, context) => {
  await requirePermission(context, "materiales", data?.id ? "edit" : "create");
  const nombre = nameFrom(data?.nombre);
  if (!data?.id) return { id: (await getOrCreateMaterial(nombre)).id };
  const id = idFrom(data.id), clave = materialKey(nombre);
  await getMaterialRow(id);
  const existing = (await listMaterialCatalog()).find(item => item.clave === clave && item.id !== id);
  if (existing) throw new https.HttpsError("already-exists", "Ya existe un material con ese nombre.");
  await dataConnect.executeGraphql(`mutation RenameCatalogMaterial($id:Int!,$nombre:String!,$clave:String!) @transaction {
    material_update(id:$id,data:{nombre:$nombre,clave:$clave}) @check(expr:"this != null",message:"El material ya no existe.")
    actividadMaterial_updateMany(where:{materialId:{eq:$id}},data:{texto:$nombre})
  }`, { variables: { id, nombre, clave } });
  return { id };
});
export const deleteMaterial = https.onCall(async (data, context) => {
  await requirePermission(context, "materiales", "delete");
  const id = idFrom(data?.id);
  await dataConnect.executeGraphql(`mutation DeleteCatalogMaterial($id:Int!) @transaction {
    links:actividadMaterial_deleteMany(where:{materialId:{eq:$id}})
    material_delete(id:$id)
  }`, { variables: { id } });
  return { id };
});
