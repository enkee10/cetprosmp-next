export type RegistroFillRange = { minRow: number; maxRow: number; minCol: number; maxCol: number };

/** Repeat the original block in either direction without modifying its source cells. */
export function repeatRegistroFill(source: Array<Array<number | null>>, original: RegistroFillRange, expanded: RegistroFillRange) {
  const cells: Array<{ row: number; col: number; value: number | null }> = [];
  const height = original.maxRow - original.minRow + 1;
  const width = original.maxCol - original.minCol + 1;
  for (let row = expanded.minRow; row <= expanded.maxRow; row++) {
    for (let col = expanded.minCol; col <= expanded.maxCol; col++) {
      if (row >= original.minRow && row <= original.maxRow && col >= original.minCol && col <= original.maxCol) continue;
      const sourceRow = ((row - original.minRow) % height + height) % height;
      const sourceCol = ((col - original.minCol) % width + width) % width;
      cells.push({ row, col, value: source[sourceRow][sourceCol] });
    }
  }
  return cells;
}
