/** Modules retain their stored plan order even when a teacher sees only some of them. */
export function curricularItemCode(
  prefix: 'M' | 'UC' | 'UD' | 'C' | 'I' | 'S',
  siblings: ReadonlyArray<{ id: number; orden?: number | null; numeroSesion?: number | null }>,
  id: number,
): string {
  if (prefix === 'M') {
    const order = siblings.find(item => item.id === id)?.orden;
    if (typeof order === 'number' && Number.isInteger(order) && order > 0) return `M${order}`;
  }
  // Legacy modules without an order and other items use their complete sibling list.
  const ordered = [...siblings].sort((a, b) => (a.orden ?? a.numeroSesion ?? a.id) - (b.orden ?? b.numeroSesion ?? b.id) || a.id - b.id);
  const index = ordered.findIndex(item => item.id === id);
  return index < 0 ? '' : `${prefix}${index + 1}`;
}
