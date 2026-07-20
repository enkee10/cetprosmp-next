import React, { useEffect, useMemo, useState } from 'react';
import { AccordionMenuTree, type MenuTreeNode } from '@/components/MenuTree/MenuTree';

interface Subitem {
  id: number;
  titulo: string;
}

interface Item {
  id: number;
  titulo: string;
  subitems?: Subitem[];
}

interface Props {
  openAccordions: string[];
  handleAccordionChange: (id: string, ancestors: string[]) => void;
}

export default function AcordionInicio({
  openAccordions,
  handleAccordionChange,
}: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const rootId = 'principal-inicio';

  useEffect(() => {
    fetch('/inicio.json')
      .then((res) => res.json())
      .then((data: Item[]) => {
        const validItems = data.filter(
          (item) =>
            (typeof item.titulo === 'string' && item.titulo.trim() !== '') ||
            (Array.isArray(item.subitems) && item.subitems.length > 0),
        );
        setItems(validItems);
      });
  }, []);

  const nodes = useMemo<MenuTreeNode[]>(
    () =>
      items.map((item) => {
        const itemId = `${rootId}-${item.id}`;
        return {
          id: itemId,
          title: item.titulo,
          children: item.subitems?.map((sub) => ({
            id: `${itemId}-${sub.id}`,
            title: sub.titulo,
          })),
        };
      }),
    [items],
  );

  return (
    <AccordionMenuTree
      id={rootId}
      title="Inicio"
      ancestors={['principal']}
      expandedIds={openAccordions}
      onToggle={handleAccordionChange}
      nodes={nodes}
    />
  );
}
