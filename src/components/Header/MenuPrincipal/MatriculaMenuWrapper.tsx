'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FlyoutMenuTree, type MenuTreeNode } from '@/components/MenuTree/MenuTree';

type SubItem = { id: number; titulo: string; slug: string };
type Item = {
  id: number;
  titulo: string;
  slug: string;
  subitems?: SubItem[];
};

export default function MatriculaMenuWrapper() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/matricula.json');
        const data: Item[] = await res.json();

        const conContenido = data
          .filter((item) => item.subitems && item.subitems.length > 0)
          .sort((a, b) => a.id - b.id);

        const sinContenido = data
          .filter((item) => !item.subitems || item.subitems.length === 0)
          .sort((a, b) => a.id - b.id);

        setItems([...conContenido, ...sinContenido]);
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    };

    void fetchData();
  }, []);

  const nodes = useMemo<MenuTreeNode[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.titulo,
        href: item.subitems?.length ? undefined : `/matricula/${item.slug}`,
        children: item.subitems
          ?.slice()
          .sort((a, b) => a.id - b.id)
          .map((sub) => ({
            id: sub.id,
            title: sub.titulo,
            href: `/matricula/${sub.slug}`,
          })),
      })),
    [items],
  );

  return (
    <FlyoutMenuTree
      label="Matrícula"
      nodes={nodes}
      width="156px"
      rootMenuSx={{ ml: -5 }}
    />
  );
}
