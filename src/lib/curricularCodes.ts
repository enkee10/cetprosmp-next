import type { AprendizajeDetalle, CompetenciaDetalle, ModuloDetalle } from './curricularReassignment';

type CurricularOrderedItem = { id: number; orden?: number | null; numeroSesion?: number | null };

const compareItems = (a: CurricularOrderedItem, b: CurricularOrderedItem) =>
  (a.orden ?? a.numeroSesion ?? a.id) - (b.orden ?? b.numeroSesion ?? b.id) || a.id - b.id;

export function orderedCurricularItems<T extends CurricularOrderedItem>(items: ReadonlyArray<T>) {
  return [...items].sort(compareItems);
}

type CurricularTree = Pick<ModuloDetalle, 'unidadesDidacticas'> & Partial<Pick<ModuloDetalle, 'competencias'>>;

/** Parent position takes precedence over a child's order in another parent. */
export function curricularUnitsInOrder(modulo: CurricularTree | null) {
  const competencias = new Map(modulo?.competencias?.map(item => [item.id, item]));
  return [...(modulo?.unidadesDidacticas ?? [])].sort((a, b) => {
    const parentA = competencias.get(a.competenciaId) ?? a.competencia ?? { id: a.competenciaId };
    const parentB = competencias.get(b.competenciaId) ?? b.competencia ?? { id: b.competenciaId };
    return Number((parentA as CompetenciaDetalle).tipo === 'EMPLEABILIDAD') - Number((parentB as CompetenciaDetalle).tipo === 'EMPLEABILIDAD')
      || Number(Boolean((parentB as CompetenciaDetalle).esContinuacion)) - Number(Boolean((parentA as CompetenciaDetalle).esContinuacion))
      || compareItems(parentA, parentB) || compareItems(a, b);
  });
}

export function curricularSessionsInOrder(aprendizajes: ReadonlyArray<AprendizajeDetalle>) {
  return orderedCurricularItems(aprendizajes).flatMap(aprendizaje =>
    orderedCurricularItems(aprendizaje.actividades).map(actividad => ({ ...actividad, aprendizajeId: aprendizaje.id })),
  );
}

/** Modules retain their stored plan order even when a teacher sees only some of them. */
export function curricularItemCode(
  prefix: 'M' | 'UC' | 'UD' | 'C' | 'I' | 'S',
  siblings: ReadonlyArray<CurricularOrderedItem>,
  id: number,
): string {
  if (prefix === 'M') {
    const order = siblings.find(item => item.id === id)?.orden;
    if (typeof order === 'number' && Number.isInteger(order) && order > 0) return `M${order}`;
  }
  // Legacy modules without an order and other items use their complete sibling list.
  const ordered = orderedCurricularItems(siblings);
  const index = ordered.findIndex(item => item.id === id);
  return index < 0 ? '' : `${prefix}${index + 1}`;
}

export type CurricularCodeModule = Pick<ModuloDetalle, 'id' | 'orden' | 'planId'> & {
  competencias: ReadonlyArray<Pick<CompetenciaDetalle, 'id' | 'tipo' | 'orden'> & Partial<Pick<CompetenciaDetalle, 'esContinuacion'>>>;
  planModulos?: ReadonlyArray<{ planId: number; orden?: number | null }>;
};

/** Each type follows plan order, or starts over in each independent terminal module. */
export function curricularCompetencyCodes(modulos: ReadonlyArray<CurricularCodeModule>, planId: number | null, restartPerModule = false) {
  const codes = new Map<number, string>();
  const counts = new Map<CompetenciaDetalle['tipo'], number>();
  const modules = modulos.flatMap(modulo => {
    const relation = modulo.planModulos?.find(item => item.planId === planId);
    return relation || modulo.planId === planId
      ? [{ ...modulo, orden: relation?.orden ?? modulo.orden }]
      : [];
  });
  for (const modulo of orderedCurricularItems(modules)) {
    if (restartPerModule) counts.clear();
    for (const competencia of orderedCurricularItems(modulo.competencias)) {
      if (competencia.esContinuacion || codes.has(competencia.id)) continue;
      const position = (counts.get(competencia.tipo) ?? 0) + 1;
      counts.set(competencia.tipo, position);
      codes.set(competencia.id, `${competencia.tipo === 'TECNICA' ? 'UC' : 'CE'}${position}`);
    }
  }
  return codes;
}

function modulesForPlan<T extends CurricularCodeModule>(modulos: ReadonlyArray<T>, planId?: number | null) {
  return modulos.flatMap(modulo => {
    const relation = modulo.planModulos?.find(item => item.planId === planId);
    return planId == null || relation || modulo.planId === planId
      ? [{ ...modulo, orden: relation?.orden ?? modulo.orden }]
      : [];
  });
}

/** A competency keeps its first-appearance code in every continuation of the selected plan. */
export function curricularPlanCompetencyCodes(modulos: ReadonlyArray<CurricularCodeModule>, planId?: number | null, restartPerModule = false) {
  if (planId != null) return curricularCompetencyCodes(modulos, planId, restartPerModule);
  return curricularCompetencyCodes(modulesForPlan(modulos).map(modulo => ({ ...modulo, planId: null, planModulos: [] })), null, restartPerModule);
}

/** Units span the module; capacities span their UC. Hidden branches keep their positions. */
export function curricularDescendantCodes(modulo: CurricularTree | null) {
  const unidades = new Map<number, string>();
  const capacidades = new Map<number, string>();
  const indicadores = new Map<number, string>();
  const sesiones = new Map<number, string>();
  const capacityCounts = new Map<number, number>();

  for (const [unitIndex, unidad] of curricularUnitsInOrder(modulo).entries()) {
    unidades.set(unidad.id, `UD${unitIndex + 1}`);
    let capacityCount = capacityCounts.get(unidad.competenciaId) ?? 0;
    for (const capacidad of orderedCurricularItems(unidad.capacidadesTerminales)) {
      capacidades.set(capacidad.id, `C${++capacityCount}`);
      orderedCurricularItems(capacidad.indicadoresCapacidad).forEach((indicador, index) => {
        indicadores.set(indicador.id, `I${index + 1}`);
        const activities = new Map(curricularSessionsInOrder(indicador.aprendizajes ?? []).map(actividad => [actividad.id, actividad]));
        [...activities.values()].forEach((actividad, index) => sesiones.set(actividad.id, `S${index + 1}`));
      });
    }
    capacityCounts.set(unidad.competenciaId, capacityCount);
  }
  return { unidades, capacidades, indicadores, sesiones };
}

/** Plan sequences continue across modules unless the modules are independent and terminal. */
export function curricularPlanDescendantCodes(modulos: ReadonlyArray<ModuloDetalle>, planId?: number | null, restartPerModule = false) {
  const unidades = new Map<number, string>();
  const capacidades = new Map<number, string>();
  const indicadores = new Map<number, string>();
  const sesiones = new Map<number, string>();
  const capacityCounts = new Map<number, number>();
  let unitCount = 0;
  const orderedModules = orderedCurricularItems(modulesForPlan(modulos, planId));
  for (const modulo of orderedModules) {
    if (restartPerModule) {
      unitCount = 0;
      capacityCounts.clear();
    }
    for (const unidad of curricularUnitsInOrder(modulo)) {
      unidades.set(unidad.id, `UD${++unitCount}`);
      let capacityCount = capacityCounts.get(unidad.competenciaId) ?? 0;
      for (const capacidad of orderedCurricularItems(unidad.capacidadesTerminales)) {
        capacidades.set(capacidad.id, `C${++capacityCount}`);
        orderedCurricularItems(capacidad.indicadoresCapacidad).forEach((indicador, index) => {
          indicadores.set(indicador.id, `I${index + 1}`);
          curricularSessionsInOrder(indicador.aprendizajes ?? []).forEach((actividad, sessionIndex) => sesiones.set(actividad.id, `S${sessionIndex + 1}`));
        });
      }
      capacityCounts.set(unidad.competenciaId, capacityCount);
    }
  }
  return { unidades, capacidades, indicadores, sesiones };
}
