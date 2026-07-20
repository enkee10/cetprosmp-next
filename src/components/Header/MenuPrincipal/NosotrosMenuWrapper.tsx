'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FlyoutMenuTree, type MenuTreeNode } from '@/components/MenuTree/MenuTree';

type NavItem = {
  id: number;
  titulo: string;
  path?: string;
  subitems?: NavItem[];
};

export default function NosotrosMenuWrapper() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [basePath, setBasePath] = useState('/nosotros');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/nosotros.json', { cache: 'no-store' });
        const data: NavItem[] = await res.json();
        const padre = Array.isArray(data)
          ? data.find((item) => Array.isArray(item.subitems) && item.subitems.length > 0)
          : undefined;

        setBasePath(padre?.path || '/nosotros');

        const entries = padre?.subitems
          ? padre.subitems
          : Array.isArray(data)
            ? data.filter((item) => item.path && item.path !== (padre?.path || '/nosotros'))
            : [];

        setItems(entries.sort((a, b) => (a.id ?? 0) - (b.id ?? 0)));
      } catch {
        setItems([]);
        setBasePath('/nosotros');
      }
    };

    void fetchData();
  }, []);

  const nodes = useMemo<MenuTreeNode[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.titulo,
        href: item.path || '#',
      })),
    [items],
  );

  return (
    <FlyoutMenuTree
      label="Nosotros"
      href={basePath}
      nodes={nodes}
      width="156px"
      rootMenuSx={{ ml: -5 }}
    />
  );
}
