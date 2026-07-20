'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FlyoutMenuTree, type MenuTreeNode } from '@/components/MenuTree/MenuTree';

type Modulo = { id: number; tituloComercial: string; slug: string };
type Carrera = {
  id: number;
  tituloComercial: string;
  slug: string;
  codigo: string | null;
  duracion: number;
  modulos: Modulo[];
};
type Especialidad = {
  id: number;
  tituloComercial: string;
  slug: string;
  carreras: Carrera[];
};

export default function CarrerasMenuWrapper() {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/data/carrusel.json');
      const data: Especialidad[] = await res.json();

      const sortedData = data
        .sort((a, b) => a.id - b.id)
        .map((esp) => ({
          ...esp,
          carreras: esp.carreras
            .sort((a, b) => a.id - b.id)
            .map((car) => ({
              ...car,
              modulos: car.modulos.sort((a, b) => a.id - b.id),
            })),
        }));

      setEspecialidades(sortedData);
    };

    void fetchData();
  }, []);

  const nodes = useMemo<MenuTreeNode[]>(
    () =>
      especialidades.map((esp) => {
        const carrerasConCodigo = esp.carreras.filter((car) => car.codigo !== null);
        const modulosSueltos = esp.carreras
          .filter((car) => car.codigo === null)
          .flatMap((car) => car.modulos)
          .sort((a, b) => a.id - b.id);

        return {
          id: esp.id,
          title: esp.tituloComercial,
          href: `/especialidades/${esp.slug}`,
          children: [
            ...carrerasConCodigo.map((car) => ({
              id: `car-${car.id}`,
              title: car.tituloComercial,
              href: `/carreras/${car.slug}`,
              children: car.modulos.map((mod) => ({
                id: `car-${car.id}-mod-${mod.id}`,
                title: mod.tituloComercial,
                href: `/carreras/${car.slug}/${mod.slug}`,
                kind: 'module' as const,
              })),
            })),
            ...modulosSueltos.map((mod) => ({
              id: `mod-${mod.id}`,
              title: mod.tituloComercial,
              href: `/modulos/${mod.slug}`,
              kind: 'module' as const,
            })),
          ],
        };
      }),
    [especialidades],
  );

  return (
    <FlyoutMenuTree
      label="Carreras"
      href="/especialidades"
      nodes={nodes}
      width="256px"
      rootMenuSx={{ ml: -20 }}
    />
  );
}
