export type RegistroCapacityColumns = {
  id: number;
  indicatorIds: number[];
};

export type RegistroHeaderMeasurements = {
  indicators: Record<number, number>;
  capacities: Record<number, number>;
};

const MIN_INDICATOR_WIDTH = 44;
const MIN_AVERAGE_WIDTH = 40;
const MAX_AVERAGE_WIDTH = 70;

/** Fit every label first, then share the remaining space between indicators. */
export function calculateRegistroColumnWidths(
  capacities: RegistroCapacityColumns[],
  measurements: RegistroHeaderMeasurements,
  viewportWidth: number,
  fixedWidth: number,
  averageColumnCount = capacities.length,
) {
  const indicatorIds = capacities.flatMap(capacity => capacity.indicatorIds);
  const fitCapacities = () => {
    const widths: Record<number, number> = {};
    for (const capacity of capacities) {
      for (const id of capacity.indicatorIds) widths[id] = Math.max(MIN_INDICATOR_WIDTH, measurements.indicators[id] ?? MIN_INDICATOR_WIDTH);
      const currentWidth = capacity.indicatorIds.reduce((sum, id) => sum + widths[id], 0);
      const deficit = Math.max(0, (measurements.capacities[capacity.id] ?? 0) - currentWidth);
      if (capacity.indicatorIds.length && deficit) {
        for (const id of capacity.indicatorIds) widths[id] += deficit / capacity.indicatorIds.length;
      }
    }
    return widths;
  };
  const minimumIndicators = fitCapacities();
  const minimumWidth = fixedWidth + averageColumnCount * MIN_AVERAGE_WIDTH
    + indicatorIds.reduce((sum, id) => sum + minimumIndicators[id], 0);
  const availableWidth = Math.max(viewportWidth, minimumWidth);
  const spareWidth = Math.max(0, availableWidth - minimumWidth);
  const narrowestIndicator = indicatorIds.reduce((minimum, id) => Math.min(minimum, minimumIndicators[id]), Infinity);
  const averageLimit = indicatorIds.length
    ? (indicatorIds.length * (narrowestIndicator - 4) + spareWidth + averageColumnCount * MIN_AVERAGE_WIDTH) / (indicatorIds.length + averageColumnCount)
    : MAX_AVERAGE_WIDTH;
  const averageWidth = averageColumnCount ? Math.max(MIN_AVERAGE_WIDTH, Math.min(
    MAX_AVERAGE_WIDTH,
    averageLimit,
    (availableWidth - fixedWidth) * 0.75 / (indicatorIds.length + averageColumnCount * 0.75),
    MIN_AVERAGE_WIDTH + spareWidth / averageColumnCount,
  )) : MIN_AVERAGE_WIDTH;
  const indicatorWidths = { ...minimumIndicators };
  const contentWidth = fixedWidth + averageColumnCount * averageWidth
    + indicatorIds.reduce((sum, id) => sum + indicatorWidths[id], 0);
  // With no indicators there is no flexible column to absorb spare space.
  const tableWidth = Math.ceil(indicatorIds.length ? Math.max(viewportWidth, contentWidth) : contentWidth);
  const extraPerIndicator = indicatorIds.length ? Math.max(0, tableWidth - contentWidth) / indicatorIds.length : 0;
  for (const id of indicatorIds) indicatorWidths[id] += extraPerIndicator;
  return { indicatorWidths, averageWidth, tableWidth };
}
