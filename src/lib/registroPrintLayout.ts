export const PRINT_PX_TO_MM = 25.4 / 96;
export const REGISTRO_PRINT_SIZES = {
  numberMm: 8,
  studentMm: 68,
  efsrtMm: 9,
  scoreMm: 10,
  averageMm: 9,
  minimumIndicatorMm: 7.5,
  unitHeightPx: 20,
  capacityHeightPx: 93,
  indicatorHeightPx: 135,
  heightIncrease: 1.1,
} as const;

export type RegistroPrintColumn = {
  key: string;
  widthMm: number;
  type: 'indicador' | 'unidad' | 'efsrt' | 'puntaje' | 'promedio';
  unidad: { id: number } | null;
  capacidad: { id: number } | null;
};

export type RegistroPrintMeasurements = {
  indicators: { base: Record<string, number>; extended: Record<string, number> };
  capacities: { base: Record<number, number>; extended: Record<number, number> };
};

export type RegistroPrintPage<T extends RegistroPrintColumn> = {
  columns: T[];
  widthMm: number;
  capacityHeightPx: number;
  indicatorHeightPx: number;
  headerHeightPx: number;
  overflow: { capacity: boolean; indicator: boolean; score: number };
  adjustments: Array<'capacity' | 'indicator'>;
};

function fitPage<T extends RegistroPrintColumn>(
  columns: T[], contentWidthMm: number, measurements: RegistroPrintMeasurements,
  capacityExtended: boolean, indicatorExtended: boolean,
): RegistroPrintPage<T> {
  const sizes = REGISTRO_PRINT_SIZES;
  const indicatorMinimums = measurements.indicators[indicatorExtended ? 'extended' : 'base'];
  const capacityMinimums = measurements.capacities[capacityExtended ? 'extended' : 'base'];
  const indicators = columns.filter(column => column.type === 'indicador');
  const capacityIds = [...new Set(columns.flatMap(column => column.capacidad ? [column.capacidad.id] : []))];
  const desired = new Map(indicators.map(column => [column.key, Math.max(sizes.minimumIndicatorMm, indicatorMinimums[column.key] ?? column.widthMm)]));
  for (const id of capacityIds) {
    const group = columns.filter(column => column.capacidad?.id === id);
    const children = group.filter(column => column.type === 'indicador');
    const width = group.reduce((sum, column) => sum + (desired.get(column.key) ?? column.widthMm), 0);
    const deficit = Math.max(0, (capacityMinimums[id] ?? 0) - width);
    for (const child of children) desired.set(child.key, desired.get(child.key)! + deficit / children.length);
  }
  const fixed = sizes.numberMm + sizes.studentMm + columns.filter(column => column.type !== 'indicador').reduce((sum, column) => sum + column.widthMm, 0);
  // Reserve the outer border and subpixel rounding inside the printable area.
  const budget = Math.max(0, contentWidthMm - PRINT_PX_TO_MM - fixed);
  const desiredTotal = indicators.reduce((sum, column) => sum + desired.get(column.key)!, 0);
  const minimumIndicator = Math.min(sizes.minimumIndicatorMm, budget / Math.max(1, indicators.length));
  const minimumTotal = indicators.length * minimumIndicator;
  const extra = Math.max(0, budget - desiredTotal) / Math.max(1, indicators.length);
  const ratio = Math.max(0, Math.min(1, (budget - minimumTotal) / Math.max(0.001, desiredTotal - minimumTotal)));
  const adjusted = columns.map(column => column.type !== 'indicador' ? column : {
    ...column,
    widthMm: desiredTotal <= budget
      ? desired.get(column.key)! + extra
      : minimumIndicator + (desired.get(column.key)! - minimumIndicator) * ratio,
  });
  const indicatorDeficit = adjusted.filter(column => column.type === 'indicador').reduce((sum, column) => sum + Math.max(0, (indicatorMinimums[column.key] ?? sizes.minimumIndicatorMm) - column.widthMm), 0);
  const capacityDeficit = capacityIds.reduce((sum, id) => sum + Math.max(0,
    (capacityMinimums[id] ?? 0) - adjusted.filter(column => column.capacidad?.id === id).reduce((width, column) => width + column.widthMm, 0),
  ), 0);
  const widthMm = sizes.numberMm + sizes.studentMm + adjusted.reduce((sum, column) => sum + column.widthMm, 0);
  const capacityHeightPx = sizes.capacityHeightPx * (capacityExtended ? sizes.heightIncrease : 1);
  const indicatorHeightPx = sizes.indicatorHeightPx * (indicatorExtended ? sizes.heightIncrease : 1);
  return {
    columns: adjusted, widthMm, capacityHeightPx, indicatorHeightPx,
    headerHeightPx: sizes.unitHeightPx + capacityHeightPx + indicatorHeightPx,
    overflow: { capacity: capacityDeficit > 0.05, indicator: indicatorDeficit > 0.05, score: capacityDeficit + indicatorDeficit + Math.max(0, widthMm - contentWidthMm) },
    adjustments: [],
  };
}

function adjustPage<T extends RegistroPrintColumn>(columns: T[], width: number, measurements: RegistroPrintMeasurements) {
  let capacityExtended = false, indicatorExtended = false;
  let page = fitPage(columns, width, measurements, false, false);
  const adjustments: RegistroPrintPage<T>['adjustments'] = [];
  for (let pass = 0; pass < 2; pass++) {
    const candidates: Array<{ kind: 'capacity' | 'indicator'; page: RegistroPrintPage<T> }> = [];
    if (page.overflow.capacity && !capacityExtended) candidates.push({ kind: 'capacity', page: fitPage(columns, width, measurements, true, indicatorExtended) });
    if (page.overflow.indicator && !indicatorExtended) candidates.push({ kind: 'indicator', page: fitPage(columns, width, measurements, capacityExtended, true) });
    if (!candidates.length) break;
    candidates.sort((a, b) => a.page.overflow.score - b.page.overflow.score);
    const next = candidates[0];
    if (next.kind === 'capacity') capacityExtended = true;
    else indicatorExtended = true;
    adjustments.push(next.kind);
    page = next.page;
  }
  return { ...page, adjustments };
}

/** Exhaust single-page adjustments before splitting between complete units. */
export function buildRegistroPrintPages<T extends RegistroPrintColumn>(columns: T[], width: number, measurements: RegistroPrintMeasurements, maxHorizontalPages: 1 | 2 = 2): RegistroPrintPage<T>[] {
  const single = adjustPage(columns, width, measurements);
  if (single.overflow.score <= 0.05 || maxHorizontalPages === 1) return [single];
  const units: T[][] = [];
  for (const column of columns.filter(column => column.unidad)) {
    const last = units[units.length - 1];
    if (last?.[0].unidad?.id === column.unidad!.id) last.push(column);
    else units.push([column]);
  }
  if (units.length < 2) return [single];
  const summaries = columns.filter(column => !column.unidad);
  const midpoint = Math.ceil(units.length / 2);
  const cuts = Array.from({ length: units.length - 1 }, (_, index) => index + 1)
    .sort((a, b) => Math.abs(a - midpoint) - Math.abs(b - midpoint));
  let best: RegistroPrintPage<T>[] | null = null;
  for (const cut of cuts) {
    const pages = [adjustPage(units.slice(0, cut).flat(), width, measurements), adjustPage([...units.slice(cut).flat(), ...summaries], width, measurements)];
    if (pages.every(page => page.overflow.score <= 0.05)) return pages;
    const worst = Math.max(...pages.map(page => page.overflow.score));
    const bestWorst = best ? Math.max(...best.map(page => page.overflow.score)) : Infinity;
    if (!best || worst < bestWorst - 0.05 || (Math.abs(worst - bestWorst) <= 0.05 && pages.reduce((sum, page) => sum + page.overflow.score, 0) < best.reduce((sum, page) => sum + page.overflow.score, 0))) best = pages;
  }
  return best!;
}
