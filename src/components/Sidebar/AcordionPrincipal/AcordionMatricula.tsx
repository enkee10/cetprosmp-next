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

export default function AcordionMatricula({
  openAccordions,
  handleAccordionChange,
}: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const rootId = 'principal-matricula';

  useEffect(() => {
    fetch('/matricula.json')
      .then((res) => res.json())
      .then((data: Item[]) => {
        const validItems = data.filter(
          (item) =>
            item.titulo.trim() !== '' ||
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
      title="Matrícula"
      ancestors={['principal']}
      expandedIds={openAccordions}
      onToggle={handleAccordionChange}
      nodes={nodes}
    />
  );
}
