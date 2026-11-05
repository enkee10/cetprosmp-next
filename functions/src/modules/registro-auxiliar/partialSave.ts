import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";

type Grade = number | null | undefined;
type StoredGrade = { id: number; matriculaId: number; promedio: number | null; indicadorCapacidadId?: number; capacidadTerminalId?: number; unidadDidacticaId?: number };
type MathRules = {
  average(values: Grade[]): number | null;
  roundPromedio(value: Grade): number | null;
  sum(values: Grade[]): number | null;
  weightedAverage(values: Array<{ value: number | null; weight: number | null | undefined }>): number | null;
};

/** Save only changed cells, keeping all other grades and updating affected averages atomically. */
export async function savePartialRegistroGrades(input: {
  grupoModuloId: number; usesOcupacionalRules: boolean; moduloCreditoEfsrt: number | null;
  unidadIds: number[]; unidadCreditoById: Map<number, number | null>;
  capacidades: Array<{ id: number; unidadDidacticaId?: number | null }>;
  indicadores: Array<{ id: number; capacidadTerminalId?: number | null }>;
  moduloEstudiantes: Array<{ id: number; matriculaId: number }>;
  notas: Array<{ matriculaId: number; indicadorCapacidadId: number; nota: number | null }>;
  efsrtPppPromedios: Array<{ moduloEstudianteId: number; promedioFinal: number | null }>;
}, math: MathRules) {
  const students = new Map(input.moduloEstudiantes.map(row => [row.matriculaId, row]));
  const byModuleStudent = new Map(input.moduloEstudiantes.map(row => [row.id, row]));
  const indicators = new Map(input.indicadores.map(row => [row.id, row]));
  if (input.notas.length + input.efsrtPppPromedios.length > 500) throw new https.HttpsError("invalid-argument", "Demasiadas celdas en un solo guardado.");
  if (input.notas.some(row => !students.has(row.matriculaId) || !indicators.has(row.indicadorCapacidadId))
    || input.efsrtPppPromedios.some(row => !byModuleStudent.has(row.moduloEstudianteId) || input.usesOcupacionalRules)) {
    throw new https.HttpsError("failed-precondition", "Una matrícula o indicador ya no pertenece a este registro. Las notas pendientes se conservaron en el navegador.");
  }
  const matriculaIds = [...new Set([...input.notas.map(row => row.matriculaId), ...input.efsrtPppPromedios.map(row => byModuleStudent.get(row.moduloEstudianteId)!.matriculaId)])];
  if (!matriculaIds.length) return { saved: 0, efsrtPppSaved: 0 };
  const moduleStudentIds = matriculaIds.map(id => students.get(id)!.id);
  const { data } = await dataConnect.executeGraphql<{
    notes: StoredGrade[]; capacities: StoredGrade[]; units: StoredGrade[];
    efsrt: Array<{ id: number; moduloEstudianteId: number; promedioFinal: number | null }>;
  }, { students: number[]; indicators: number[]; capacities: number[]; units: number[]; moduleStudents: number[]; group: number }>(`query PartialRegistroGradeSnapshot($students:[Int!]!,$indicators:[Int!]!,$capacities:[Int!]!,$units:[Int!]!,$moduleStudents:[Int!]!,$group:Int!) {
    notes:indicadoresCapacidadEstudiantes(where:{matriculaId:{in:$students},indicadorCapacidadId:{in:$indicators}},limit:100000){id matriculaId indicadorCapacidadId promedio}
    capacities:capacidadesTerminalesEstudiantes(where:{matriculaId:{in:$students},capacidadTerminalId:{in:$capacities}},limit:100000){id matriculaId capacidadTerminalId promedio}
    units:unidadesDidacticasEstudiantes(where:{matriculaId:{in:$students},unidadDidacticaId:{in:$units}},limit:100000){id matriculaId unidadDidacticaId promedio}
    efsrt:efsrtPppEstudiantes(where:{grupoModuloId:{eq:$group},moduloEstudianteId:{in:$moduleStudents}},limit:1000){id moduloEstudianteId promedioFinal}
  }`, { variables: { students: matriculaIds, indicators: [...indicators.keys()], capacities: input.capacidades.map(row => row.id), units: input.unidadIds, moduleStudents: moduleStudentIds, group: input.grupoModuloId } });
  if ([data.notes, data.capacities, data.units].some(rows => rows.length === 100000) || data.efsrt.length === 1000) throw new https.HttpsError("failed-precondition", "El registro supera el límite de celdas por guardado.");
  const key = (student: number, element: number) => `${student}:${element}`;
  const notes = new Map(data.notes.map(row => [key(row.matriculaId, row.indicadorCapacidadId!), row]));
  const capacityRows = new Map(data.capacities.map(row => [key(row.matriculaId, row.capacidadTerminalId!), row.id]));
  const unitRows = new Map(data.units.map(row => [key(row.matriculaId, row.unidadDidacticaId!), row.id]));
  const efsrtRows = new Map(data.efsrt.map(row => [row.moduloEstudianteId, row]));
  const mutations: string[] = [];
  const write = (table: string, id: number | undefined, fields: Record<string, unknown>) => {
    const literal = Object.entries(fields).map(([name, value]) => `${name}:${JSON.stringify(value)}`).join(",");
    mutations.push(`w${mutations.length}:${table}_${id ? "update" : "insert"}(${id ? `id:${id},` : ""}data:{${literal}}) @check(expr:"this != null",message:"El registro cambió durante el guardado. Inténtalo otra vez.")`);
  };
  const affectedCapacities = new Map<number, Set<number>>();
  for (const row of input.notas) {
    const existing = notes.get(key(row.matriculaId, row.indicadorCapacidadId));
    if (existing || row.nota !== null) write("indicadorCapacidadEstudiante", existing?.id, existing ? { promedio: row.nota } : { matriculaId: row.matriculaId, indicadorCapacidadId: row.indicadorCapacidadId, promedio: row.nota });
    notes.set(key(row.matriculaId, row.indicadorCapacidadId), { id: existing?.id ?? 0, matriculaId: row.matriculaId, indicadorCapacidadId: row.indicadorCapacidadId, promedio: row.nota });
    const affected = affectedCapacities.get(row.matriculaId) ?? new Set<number>();
    affected.add(indicators.get(row.indicadorCapacidadId)!.capacidadTerminalId!);
    affectedCapacities.set(row.matriculaId, affected);
  }
  for (const row of input.efsrtPppPromedios) {
    const existing = efsrtRows.get(row.moduloEstudianteId);
    const fields = { promedioFinal: row.promedioFinal, modoCalculo: "manual", fechaActualizacion: new Date().toISOString() };
    write("efsrtPppEstudiante", existing?.id, existing ? fields : { ...fields, grupoModuloId: input.grupoModuloId, moduloEstudianteId: row.moduloEstudianteId, fechaRegistro: new Date().toISOString() });
    efsrtRows.set(row.moduloEstudianteId, { id: existing?.id ?? 0, ...row });
  }
  for (const matriculaId of matriculaIds) {
    const capacityValues = new Map<number, number | null>();
    const affectedUnits = new Set<number>();
    for (const capacity of input.capacidades) {
      const ids = input.indicadores.filter(row => row.capacidadTerminalId === capacity.id).map(row => row.id);
      const values = ids.map(id => notes.get(key(matriculaId, id))?.promedio);
      const value = input.usesOcupacionalRules ? math.roundPromedio(values[values.length - 1]) : math.average(values);
      capacityValues.set(capacity.id, value);
      if (affectedCapacities.get(matriculaId)?.has(capacity.id)) {
        const id = capacityRows.get(key(matriculaId, capacity.id));
        write("capacidadTerminalEstudiante", id, id ? { promedio: value } : { matriculaId, capacidadTerminalId: capacity.id, promedio: value });
        affectedUnits.add(capacity.unidadDidacticaId!);
      }
    }
    const unitValues = input.unidadIds.map(unitId => {
      const value = math.average(input.capacidades.filter(row => row.unidadDidacticaId === unitId).map(row => capacityValues.get(row.id)));
      if (affectedUnits.has(unitId)) {
        const id = unitRows.get(key(matriculaId, unitId));
        write("unidadDidacticaEstudiante", id, id ? { promedio: value } : { matriculaId, unidadDidacticaId: unitId, promedio: value });
      }
      return value;
    });
    const student = students.get(matriculaId)!;
    const efsrt = efsrtRows.get(student.id)?.promedioFinal ?? null;
    write("moduloEstudiante", student.id, {
      promedio: input.usesOcupacionalRules ? math.average(unitValues) : math.weightedAverage([
        ...unitValues.map((value, index) => ({ value, weight: input.unidadCreditoById.get(input.unidadIds[index]) })),
        { value: efsrt, weight: input.moduloCreditoEfsrt },
      ]),
      puntaje: math.sum(input.usesOcupacionalRules ? unitValues : [...unitValues, efsrt]),
      grupoModuloId: input.grupoModuloId,
    });
  }
  await dataConnect.executeGraphql(`mutation SavePartialRegistroGrades @transaction {${mutations.join("\n")}}`);
  return { saved: input.notas.length, efsrtPppSaved: input.efsrtPppPromedios.length };
}
