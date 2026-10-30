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
    return compareItems(parentA, parentB) || compareItems(a, b);
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

/** Each competency type has its own sequence across the module, including hidden items. */
export function curricularCompetencyCodes(competencias: ReadonlyArray<CompetenciaDetalle>) {
  const codes = new Map<number, string>();
  const counts = new Map<CompetenciaDetalle['tipo'], number>();
  for (const competencia of orderedCurricularItems(competencias)) {
    const position = (counts.get(competencia.tipo) ?? 0) + 1;
    counts.set(competencia.tipo, position);
    codes.set(competencia.id, `${competencia.tipo === 'TECNICA' ? 'UC' : 'CE'}${position}`);
  }
  return codes;
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
