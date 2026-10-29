import { dataConnect } from "../core/dataConnectCore.js";

export const HIDE_OCCUPATIONAL_CURRICULUM_KEY = "general.poderOcultarProgramacionOpcionesOcupacionales";
export const isOccupationalCareer = (name?: string | null) => /\bopcion(?:es)? ocupacional(?:es)?\b/.test((name ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " "));

export async function plansAllowingPeriodSelection(planIds: number[]): Promise<Set<number>> {
  if (!planIds.length) return new Set();
  const { data } = await dataConnect.executeGraphql<{
    planes: Array<{ id: number; carrera: { tipoCarrera: { nombre: string | null } | null } | null }>;
    appSettings: Array<{ boolValue: boolean | null }>;
  }, { planIds: number[]; settingKey: string }>(`query PlanSelectionPolicy($planIds:[Int!]!,$settingKey:String!) {
    planes(where:{id:{in:$planIds}},limit:5000){id carrera{tipoCarrera{nombre}}}
    appSettings(where:{settingKey:{eq:$settingKey}},limit:1){boolValue}
  }`, { variables: { planIds, settingKey: HIDE_OCCUPATIONAL_CURRICULUM_KEY } });
  const occupationalEnabled = data.appSettings[0]?.boolValue === true;
  return new Set(data.planes.filter(plan => occupationalEnabled || !isOccupationalCareer(plan.carrera?.tipoCarrera?.nombre)).map(plan => plan.id));
}
