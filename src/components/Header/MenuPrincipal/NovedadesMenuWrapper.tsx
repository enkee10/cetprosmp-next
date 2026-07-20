'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FlyoutMenuTree, type MenuTreeNode } from '@/components/MenuTree/MenuTree';

type NavItem = {
  id: number;
  titulo: string;
  path?: string;
  subitems?: NavItem[];
};

export default function NovedadesMenuWrapper() {
  const [items, setItems] = useState<NavItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/novedades.json', { cache: 'no-store' });
        const data: NavItem[] = await res.json();
        const padre = Array.isArray(data)
          ? data.find((item) => Array.isArray(item.subitems) && item.subitems.length > 0)
          : undefined;

        const entries = padre?.subitems
          ? padre.subitems
          : Array.isArray(data)
            ? data.filter((item) => item.path && item.path !== '/publicaciones')
            : [];

        const orden = [
          '/publicaciones/noticias',
          '/publicaciones/eventos',
          '/publicaciones/comunicados',
        ];

        setItems(
          entries
            .filter((item) => orden.includes(item.path || ''))
            .sort((a, b) => orden.indexOf(a.path || '') - orden.indexOf(b.path || '')),
        );
      } catch {
        setItems([]);
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
      label="Novedades"
      href="/publicaciones"
      nodes={nodes}
      width="156px"
      rootMenuSx={{ ml: -5 }}
    />
  );
}
