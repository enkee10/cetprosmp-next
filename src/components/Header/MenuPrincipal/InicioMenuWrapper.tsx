'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FlyoutMenuTree, type MenuTreeNode } from '@/components/MenuTree/MenuTree';

type SubItem = { id: number; titulo: string; slug: string };
type Item = { id: number; titulo: string; slug: string; subitems?: SubItem[] };

export default function InicioMenuWrapper() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/inicio.json');
      const data: Item[] = await res.json();

      const conSubitems = data
        .filter((item) => item.subitems && item.subitems.length > 0)
        .sort((a, b) => a.id - b.id);

      const sinSubitems = data
        .filter((item) => !item.subitems || item.subitems.length === 0)
        .sort((a, b) => a.id - b.id);

      setItems([...conSubitems, ...sinSubitems]);
    };

    void fetchData();
  }, []);

  const nodes = useMemo<MenuTreeNode[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.titulo,
        href: item.subitems?.length ? undefined : `/inicio/${item.slug}`,
        children: item.subitems
          ?.slice()
          .sort((a, b) => a.id - b.id)
          .map((sub) => ({
            id: sub.id,
            title: sub.titulo,
            href: `/inicio/${sub.slug}`,
          })),
      })),
    [items],
  );

  return (
    <FlyoutMenuTree
      label="Inicio"
      href="/"
      nodes={nodes}
      width="256px"
      rootMenuSx={{ ml: -12 }}
    />
  );
}
