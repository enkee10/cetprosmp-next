import type { ModuloDetalle } from './curricularReassignment';

export interface CurricularGradeUsage { modules: number[]; units: number[]; capacities: number[]; indicators: number[] }

/** Keep direct usage separate: moving children must update both their old and new parents. */
export function markCurricularGradeUsage(modules: ModuloDetalle[], usage?: CurricularGradeUsage) {
  const sets = { modules: new Set(usage?.modules), units: new Set(usage?.units), capacities: new Set(usage?.capacities), indicators: new Set(usage?.indicators) };
  return modules.map(module => ({ ...module, hasOwnSavedGrades: sets.modules.has(module.id), unidadesDidacticas: module.unidadesDidacticas.map(unit => ({
    ...unit, hasOwnSavedGrades: sets.units.has(unit.id), capacidadesTerminales: unit.capacidadesTerminales.map(capacity => ({
      ...capacity, hasOwnSavedGrades: sets.capacities.has(capacity.id), indicadoresCapacidad: capacity.indicadoresCapacidad.map(indicator => ({ ...indicator, hasOwnSavedGrades: sets.indicators.has(indicator.id) })),
    })),
  })) }));
}

export function withCurricularGradeProtection(modules: ModuloDetalle[]) {
  const competencyUsage = new Set<number>();
  const next = modules.map(module => {
    const unidadesDidacticas = module.unidadesDidacticas.map(unit => {
      const capacidadesTerminales = unit.capacidadesTerminales.map(capacity => {
        const indicadoresCapacidad = capacity.indicadoresCapacidad.map(indicator => ({ ...indicator, hasSavedGrades: indicator.hasOwnSavedGrades === true }));
        return { ...capacity, indicadoresCapacidad, hasSavedGrades: capacity.hasOwnSavedGrades === true || indicadoresCapacidad.some(row => row.hasSavedGrades) };
      });
      const hasSavedGrades = unit.hasOwnSavedGrades === true || capacidadesTerminales.some(row => row.hasSavedGrades);
      if (hasSavedGrades) competencyUsage.add(unit.competenciaId);
      return { ...unit, capacidadesTerminales, hasSavedGrades };
    });
    return { ...module, unidadesDidacticas, hasSavedGrades: module.hasOwnSavedGrades === true || unidadesDidacticas.some(row => row.hasSavedGrades) };
  });
  return next.map(module => ({ ...module, competencias: module.competencias.map(competency => ({ ...competency,
    hasSavedGradesInAnyModule: competencyUsage.has(competency.id),
    hasSavedGrades: competency.esContinuacion
      ? module.unidadesDidacticas.some(unit => unit.competenciaContinuacionId === competency.continuacionId && unit.hasSavedGrades)
      : competencyUsage.has(competency.id),
  })) }));
}

export function curricularRemovalIsProtected(modules: ModuloDetalle[], payload: Record<string, unknown>) {
  return withCurricularGradeProtection(modules).some(module => {
    if (payload.entity === 'modulo') return module.id === payload.moduloId && module.hasSavedGrades;
    if (payload.entity === 'competencia') return module.competencias.some(item => item.id === payload.competenciaId && item.hasSavedGrades);
    return module.unidadesDidacticas.some(unit => {
      if (payload.entity === 'unidadDidactica') return unit.relacionId === payload.relacionId && unit.hasSavedGrades;
      return unit.capacidadesTerminales.some(capacity => payload.entity === 'capacidadTerminal'
        ? capacity.id === payload.capacidadTerminalId && capacity.hasSavedGrades
        : capacity.indicadoresCapacidad.some(indicator => payload.entity === 'indicadorCapacidad' && indicator.id === payload.indicadorCapacidadId && indicator.hasSavedGrades));
    });
  });
}
