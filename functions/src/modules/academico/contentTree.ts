export interface IndicatorContentItem {
  id: number;
  orden: number;
  texto: string;
  contenidoPadreId?: number | null;
}

export type ContentDropPosition = 'before' | 'after' | 'inside';
export interface IndicatorContentMove {
  itemId: number;
  targetId: number | null;
  position: ContentDropPosition;
}

export function contentChildren<T extends IndicatorContentItem>(items: ReadonlyArray<T>) {
  const children = new Map<number | null, T[]>();
  for (const item of items) {
    const parent = item.contenidoPadreId ?? null;
    const siblings = children.get(parent) ?? [];
    siblings.push(item);
    children.set(parent, siblings);
  }
  for (const siblings of children.values()) siblings.sort((a, b) => a.orden - b.orden || a.id - b.id);
  return children;
}

export function contentSubtreeIds(items: ReadonlyArray<IndicatorContentItem>, id: number) {
  const children = contentChildren(items);
  const ids = new Set<number>();
  const pending = [id];
  while (pending.length) {
    const current = pending.pop()!;
    if (ids.has(current)) continue;
    ids.add(current);
    for (const child of children.get(current) ?? []) pending.push(child.id);
  }
  return [...ids];
}

/** Move one complete branch, preserving its descendants and preventing cycles. */
export function moveContentBranch(items: ReadonlyArray<IndicatorContentItem>, { itemId, targetId, position }: IndicatorContentMove) {
  const source = items.find(item => item.id === itemId);
  const target = items.find(item => item.id === targetId);
  if (!source || (targetId != null && !target) || (targetId == null && position !== 'inside')) return [];
  if (targetId != null && contentSubtreeIds(items, itemId).includes(targetId)) return [];
  const parent = position === 'inside' ? targetId : target!.contenidoPadreId ?? null;
  const children = contentChildren(items);
  const originalParent = source.contenidoPadreId ?? null;
  const original = children.get(originalParent)!;
  children.set(originalParent, original.filter(item => item.id !== itemId));
  const siblings = [...(children.get(parent) ?? [])];
  const index = position === 'inside' ? siblings.length : siblings.findIndex(item => item.id === targetId) + Number(position === 'after');
  siblings.splice(index, 0, { ...source, contenidoPadreId: parent });
  if (parent === originalParent && siblings.every((item, index) => item.id === original[index].id)) return [];
  children.set(parent, siblings);
  const ordered: Array<{ id: number; orden: number; contenidoPadreId: number | null }> = [];
  const visited = new Set<number>();
  const visit = (parentId: number | null) => {
    for (const item of children.get(parentId) ?? []) {
      if (visited.has(item.id)) throw new Error('La jerarquía de contenidos contiene un ciclo.');
      visited.add(item.id);
      ordered.push({ id: item.id, orden: ordered.length + 1, contenidoPadreId: item.contenidoPadreId ?? null });
      visit(item.id);
    }
  };
  visit(null);
  if (ordered.length !== items.length) throw new Error('La jerarquía de contenidos está incompleta.');
  return ordered;
}

/** Legacy sibling sorting keeps every parent unchanged. */
export function reorderContentSiblings(items: ReadonlyArray<IndicatorContentItem>, sourceId: number, targetId: number, after: boolean) {
  const source = items.find(item => item.id === sourceId);
  const target = items.find(item => item.id === targetId);
  if (!source || !target || (source.contenidoPadreId ?? null) !== (target.contenidoPadreId ?? null)) return [];
  return moveContentBranch(items, { itemId: sourceId, targetId, position: after ? 'after' : 'before' }).map(({ id, orden }) => ({ id, orden }));
}
