import { dataConnect } from "../core/dataConnectCore.js";
import { createPeriodVisibilityReader } from "../planes/periodSelection.js";

export const CERTIFICATES_WITHOUT_EFSRT_KEY = "general.mostrarCertificadosSinEfsrt";

export type CertificateCandidate = {
  grupoModuloId: number; moduloId: number; semestreId: number; matriculaId: number; occupational: boolean;
};
type Indicator = { id: number; orden?: number | null };
type Capacity = { id: number; indicadoresCertificado: Indicator[] };
type Unit = { id: number; capacidadesCertificado: Capacity[] };

/** Match Registro Auxiliar: round each capacity, then each unit; missing grades never produce an average. */
export function hasApprovedCertificateUnits(units: Unit[], grades: Map<number, number | null | undefined>, occupational = false) {
  const average = (values: Array<number | null | undefined>): number | null =>
    values.length && values.every(value => typeof value === "number" && Number.isFinite(value))
      ? Math.round((values as number[]).reduce((sum, value) => sum + value, 0) / values.length) : null;
  return units.length > 0 && units.every(unit => {
    const value = average(unit.capacidadesCertificado.map(capacity => {
      const indicators = [...capacity.indicadoresCertificado].sort((a, b) => (a.orden ?? a.id) - (b.orden ?? b.id) || a.id - b.id);
      const values = indicators.map(indicator => grades.get(indicator.id));
      const complete = average(values);
      return occupational && complete !== null ? Math.round(values[values.length - 1]!) : complete;
    }));
    return value !== null && value >= 13;
  });
}

/** Bulk reads shared by all students; curriculum visibility is cached per module and semester. */
export async function approvedCertificateCandidates(candidates: CertificateCandidate[]) {
  const approved = new Set<string>();
  if (!candidates.length) return approved;
  const groupIds = [...new Set(candidates.map(row => row.grupoModuloId))];
  const moduleIds = [...new Set(candidates.map(row => row.moduloId))];
  const structure = await dataConnect.executeGraphql<{
    direct: Array<{ grupoModuloId: number; unidadDidacticaId: number }>;
    curricular: Array<{ competencia: { moduloId: number }; competenciaContinuacion?: { planModulo: { moduloId: number } } | null; unidadDidacticaId: number }>;
  }, { groups: number[]; modules: number[] }>(`query CertificateUnitStructure($groups:[Int!]!,$modules:[Int!]!) {
    direct:grupoModuloUnidadesDidacticas(where:{grupoModuloId:{in:$groups}},limit:50000) {
      grupoModuloId unidadDidacticaId
    }
    curricular:competenciaUnidadesDidacticas(where:{_or:[
      {competencia:{moduloId:{in:$modules}},competenciaContinuacionId:{isNull:true}},
      {competenciaContinuacion:{planModulo:{moduloId:{in:$modules}}}}
    ]},limit:50000) {
      competencia {moduloId} competenciaContinuacion {planModulo {moduloId}}
      unidadDidacticaId
    }
  }
  `, { variables: { groups: groupIds, modules: moduleIds } });
  if (structure.data.direct.length === 50000 || structure.data.curricular.length === 50000) throw new Error("La estructura supera el límite de consulta de certificados.");
  const unitIds = [...new Set([...structure.data.direct, ...structure.data.curricular].map(row => row.unidadDidacticaId))];
  if (!unitIds.length) return approved;
  const { data } = await dataConnect.executeGraphql<{
    units: Unit[];
    grades: Array<{ matriculaId: number; indicadorCapacidadId: number; promedio: number | null }>;
  }, { students: number[]; units: number[] }>(`query CertificateCompleteGrades($students:[Int!]!,$units:[Int!]!) {
    units:unidadesDidacticas(where:{id:{in:$units}},limit:50000) {
      id capacidadesCertificado:capacidadesTerminales_on_unidadDidactica(limit:1000) {
        id indicadoresCertificado:indicadoresCapacidad_on_capacidadTerminal(limit:1000) {id orden}
      }
    }
    grades:indicadoresCapacidadEstudiantes(where:{matriculaId:{in:$students},indicadorCapacidad:{capacidadTerminal:{unidadDidacticaId:{in:$units}}}},limit:200000) {
      matriculaId indicadorCapacidadId promedio
    }
  }`, { variables: { students: [...new Set(candidates.map(row => row.matriculaId))], units: unitIds } });
  if (data.grades.length === 200000 || data.units.length === 50000) throw new Error("Las notas superan el límite de consulta de certificados.");
  const unitsById = new Map(data.units.map(unit => [unit.id, unit]));
  const byModule = new Map<number, Set<number>>();
  const byGroup = new Map<number, Set<number>>();
  const add = (map: Map<number, Set<number>>, id: number, unit: number) => {
    const units = map.get(id) ?? new Set<number>(); units.add(unit); map.set(id, units);
  };
  for (const row of structure.data.curricular) add(byModule, row.competenciaContinuacion?.planModulo.moduloId ?? row.competencia.moduloId, row.unidadDidacticaId);
  for (const row of structure.data.direct) add(byGroup, row.grupoModuloId, row.unidadDidacticaId);
  const readVisibility = createPeriodVisibilityReader();
  const contexts = new Map<string, Unit[]>();
  const contextCandidates = [...new Map(candidates.map(candidate => [`${candidate.grupoModuloId}:${candidate.semestreId}`, candidate])).values()];
  for (let index = 0; index < contextCandidates.length; index += 4) {
    await Promise.all(contextCandidates.slice(index, index + 4).map(async candidate => {
    const contextKey = `${candidate.grupoModuloId}:${candidate.semestreId}`;
    const visibility = await readVisibility(candidate.moduloId, candidate.semestreId);
    const ids = [...(byModule.get(candidate.moduloId) ?? byGroup.get(candidate.grupoModuloId) ?? new Set<number>())];
    const units = ids.map(id => unitsById.get(id)!);
    if (units.some(unit => !unit)) throw new Error("No se encontró una unidad del módulo para certificar.");
    if (units.some(unit => unit.capacidadesCertificado.length === 1000 || unit.capacidadesCertificado.some(cap => cap.indicadoresCertificado.length === 1000))) throw new Error("La unidad supera el límite de consulta de certificados.");
    contexts.set(contextKey, units.filter(unit => !visibility || visibility.unidades.has(unit.id)).map(unit => ({
      ...unit, capacidadesCertificado: unit.capacidadesCertificado.filter(cap => !visibility || visibility.capacidades.has(cap.id)).map(cap => ({
        ...cap, indicadoresCertificado: cap.indicadoresCertificado.filter(ind => !visibility || visibility.indicadores.has(ind.id)),
      })),
    })));
    }));
  }
  const byStudent = new Map<number, Map<number, number | null>>();
  for (const row of data.grades) {
    const grades = byStudent.get(row.matriculaId) ?? new Map<number, number | null>();
    grades.set(row.indicadorCapacidadId, row.promedio); byStudent.set(row.matriculaId, grades);
  }
  for (const candidate of candidates) if (hasApprovedCertificateUnits(contexts.get(`${candidate.grupoModuloId}:${candidate.semestreId}`) ?? [], byStudent.get(candidate.matriculaId) ?? new Map(), candidate.occupational)) {
    approved.add(`${candidate.grupoModuloId}:${candidate.matriculaId}`);
  }
  return approved;
}
