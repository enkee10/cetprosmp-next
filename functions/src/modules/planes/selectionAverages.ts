type Row = Record<string, unknown>;
const average = (values: unknown[]) => {
  const numbers = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return numbers.length ? Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length) : null;
};

/** Recompute affected aggregates at read time, leaving original grades intact. */
export function recalculateSelectionAverages(data: Record<string, Row[]>, originalCaps: Row[], originalIndicators: Row[], occupational: boolean) {
  const caps = data.capacidadesTerminales ?? [], indicators = data.indicadoresCapacidad ?? [];
  const capField = data.capacidadTerminalEstudiantes ? "capacidadTerminalEstudiantes" : "capacidadesTerminalesEstudiantes";
  const oldCaps = data[capField], oldUnits = data.unidadesDidacticasEstudiantes;
  if (!oldCaps || !oldUnits || !data.indicadorCapacidadEstudiantes) return;
  const units = data.unidadesDidacticas ?? [];
  const unitIds = new Set(units.map(u => u.id)), capIds = new Set(caps.map(c => c.id));
  const scopedCaps = new Set(originalCaps.filter(c => unitIds.has(c.unidadDidacticaId)).map(c => c.id));
  const scopedIndicators = new Set(originalIndicators.filter(i => scopedCaps.has(i.capacidadTerminalId)).map(i => i.id));
  const capRows = oldCaps.filter(r => capIds.has(r.capacidadTerminalId)), unitRows = oldUnits.filter(r => unitIds.has(r.unidadDidacticaId));
  const indicatorRows = data.indicadorCapacidadEstudiantes.filter(r => scopedIndicators.has(r.indicadorCapacidadId));
  const changedCaps = new Set(caps.filter(cap => originalIndicators.filter(i => i.capacidadTerminalId === cap.id).length !== indicators.filter(i => i.capacidadTerminalId === cap.id).length).map(cap => cap.id));
  const changedUnits = new Set(units.filter(unit => originalCaps.filter(c => c.unidadDidacticaId === unit.id).length !== caps.filter(c => c.unidadDidacticaId === unit.id).length
    || caps.some(c => c.unidadDidacticaId === unit.id && changedCaps.has(c.id))).map(unit => unit.id));
  const matriculas = new Set([...capRows, ...unitRows, ...indicatorRows].map(row => row.matriculaId));
  const grades = new Map(indicatorRows.map(row => [`${row.matriculaId}:${row.indicadorCapacidadId}`, row.promedio]));
  const capGrades = new Map(capRows.map(row => [`${row.matriculaId}:${row.capacidadTerminalId}`, row.promedio]));
  const unitGrades = new Map(unitRows.map(row => [`${row.matriculaId}:${row.unidadDidacticaId}`, row.promedio]));
  data[capField] = [];
  data.unidadesDidacticasEstudiantes = [];
  for (const matriculaId of matriculas) {
    const recalculated = new Set<unknown>();
    for (const cap of caps) {
      const key = `${matriculaId}:${cap.id}`;
      if (changedCaps.has(cap.id) || originalIndicators.some(i => i.capacidadTerminalId === cap.id && grades.has(`${matriculaId}:${i.id}`))) {
        const children = indicators.filter(i => i.capacidadTerminalId === cap.id).sort((a, b) => Number(a.orden ?? a.id) - Number(b.orden ?? b.id) || Number(a.id) - Number(b.id));
        const values = children.map(i => grades.get(`${matriculaId}:${i.id}`));
        const value = occupational ? values[values.length - 1] : average(values);
        capGrades.set(key, typeof value === "number" ? Math.round(value) : null);
        recalculated.add(cap.id);
      }
      data[capField].push({ matriculaId, capacidadTerminalId: cap.id, promedio: capGrades.get(key) ?? null });
    }
    for (const unit of units) {
      const key = `${matriculaId}:${unit.id}`;
      if (changedUnits.has(unit.id) || caps.some(c => c.unidadDidacticaId === unit.id && recalculated.has(c.id))) unitGrades.set(key, average(caps.filter(c => c.unidadDidacticaId === unit.id).map(c => capGrades.get(`${matriculaId}:${c.id}`))));
      data.unidadesDidacticasEstudiantes.push({ matriculaId, unidadDidacticaId: unit.id, promedio: unitGrades.get(key) ?? null });
    }
  }
}
