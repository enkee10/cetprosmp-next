'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { FlyoutMenuTree, type MenuTreeNode } from '@/components/MenuTree/MenuTree';
import {
  menuSections,
  type IntranetMenuItem,
  type IntranetMenuSection,
} from '@/components/Sidebar/AcordionIntranet/AcordionIntranet';
import { useAuth } from '@/context/AuthContext';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';
import { functions } from '@/lib/firebase';

type RegistroAuxiliarDocenteModulo = {
  id: number;
  nombre?: string | null;
  moduloId: number;
  grupo?: {
    semestre?: { titulo?: string | null } | null;
  } | null;
  modulo?: {
    titulo?: string | null;
    tituloComercial?: string | null;
  } | null;
};

type EstructuraAcademicaDocenteMenu = {
  title?: string | null;
  hasModulos?: boolean | null;
};

const TEACHER_ROLE_ID = 4;

const formatPeriodoMenu = (value: string | null | undefined) => {
  const text = String(value ?? '').trim();
  return text.replace(/^20(\d{2})\s*-\s*/, '$1-') || 'Periodo';
};

const getGrupoModuloMenuName = (value: string | null | undefined) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.split('[')[0]?.trim() || text;
};

const getModuloMenuName = (modulo: RegistroAuxiliarDocenteModulo) =>
  getGrupoModuloMenuName(modulo.nombre) ||
  modulo.modulo?.titulo ||
  modulo.modulo?.tituloComercial ||
  `Modulo ${modulo.moduloId}`;

const buildDocenteRegistroItems = (
  modulos: RegistroAuxiliarDocenteModulo[],
  semestreTitulo?: string | null,
): IntranetMenuItem[] =>
  modulos.map((modulo) => {
    const periodo = formatPeriodoMenu(modulo.grupo?.semestre?.titulo || semestreTitulo);
    const moduloName = getModuloMenuName(modulo);
    return {
      id: `registro-auxiliar-${modulo.id}`,
      title: `Notas ${periodo} ${moduloName}`,
      path: `/intranet/registro-auxiliar?grupoModuloId=${modulo.id}`,
      icon: null,
    };
  });

const buildDocenteEstructuraItem = (title: string | null | undefined): IntranetMenuItem => ({
  id: 'estructura-academica-docente',
  title: String(title || '').trim() || 'Estructura Academica',
  path: '/intranet/estructura-academica-docente',
  icon: null,
});

const buildIntranetNodes = (sections: IntranetMenuSection[]): MenuTreeNode[] =>
  sections.map((section) => ({
    id: section.id,
    title: section.title,
    children: section.items.map((item) => ({
      id: item.id,
      title: item.title,
      href: item.path,
    })),
  }));

export default function IntranetMenuWrapper() {
  const { user } = useAuth();
  const { can, filterSections, loading: loadingPermissions } = useIntranetPermissions();
  const [docenteRegistroItems, setDocenteRegistroItems] = useState<IntranetMenuItem[]>([]);
  const [docenteRegistroLoaded, setDocenteRegistroLoaded] = useState(false);
  const [docenteEstructuraItem, setDocenteEstructuraItem] = useState<IntranetMenuItem | null>(null);
  const [docenteEstructuraLoaded, setDocenteEstructuraLoaded] = useState(false);

  const isDocente = Number(user?.role ?? 0) === TEACHER_ROLE_ID && Number(user?.level ?? 0) < 600;
  const canViewRegistroAuxiliar = can('registro-auxiliar', 'view');
  const canViewEstructuraAcademica = can('estructura-academica', 'view');

  useEffect(() => {
    let active = true;

    const loadDocenteRegistroItems = async () => {
      if (!isDocente || loadingPermissions || !canViewRegistroAuxiliar) {
        setDocenteRegistroItems([]);
        setDocenteRegistroLoaded(false);
        return;
      }

      setDocenteRegistroLoaded(false);
      try {
        const listRegistroAuxiliarDocenteModulos = httpsCallable<
          undefined,
          { modulos?: RegistroAuxiliarDocenteModulo[]; semestreTitulo?: string | null }
        >(functions, 'listRegistroAuxiliarDocenteModulos');
        const result = await listRegistroAuxiliarDocenteModulos();
        if (!active) return;
        setDocenteRegistroItems(buildDocenteRegistroItems(result.data.modulos || [], result.data.semestreTitulo));
      } catch (error) {
        console.error('Error loading docente registro auxiliar modules:', error);
        if (active) setDocenteRegistroItems([]);
      } finally {
        if (active) setDocenteRegistroLoaded(true);
      }
    };

    void loadDocenteRegistroItems();
    return () => {
      active = false;
    };
  }, [canViewRegistroAuxiliar, isDocente, loadingPermissions]);

  useEffect(() => {
    let active = true;

    const loadDocenteEstructuraItem = async () => {
      if (!isDocente || loadingPermissions || !canViewEstructuraAcademica) {
        setDocenteEstructuraItem(null);
        setDocenteEstructuraLoaded(false);
        return;
      }

      setDocenteEstructuraLoaded(false);
      try {
        const getEstructuraAcademicaDocenteMenu = httpsCallable<undefined, EstructuraAcademicaDocenteMenu>(
          functions,
          'getEstructuraAcademicaDocenteMenu',
        );
        const result = await getEstructuraAcademicaDocenteMenu();
        if (!active) return;
        setDocenteEstructuraItem(result.data.hasModulos === false ? null : buildDocenteEstructuraItem(result.data.title));
      } catch (error) {
        console.error('Error loading docente estructura academica menu:', error);
        if (active) setDocenteEstructuraItem(null);
      } finally {
        if (active) setDocenteEstructuraLoaded(true);
      }
    };

    void loadDocenteEstructuraItem();
    return () => {
      active = false;
    };
  }, [canViewEstructuraAcademica, isDocente, loadingPermissions]);

  const visibleSections = useMemo(() => {
    const filteredSections = filterSections(menuSections);
    const docenteSections = isDocente && !filteredSections.some((section) => section.id === 'registros')
      ? [
        ...filteredSections,
        {
          ...(menuSections.find((section) => section.id === 'registros') || {
            id: 'registros',
            title: 'Registros',
            icon: null,
            items: [],
          }),
          items: [],
        },
      ]
      : filteredSections;

    return docenteSections
      .map((section) => {
        if (!isDocente || section.id !== 'registros') return section;

        const items = section.items.flatMap((item) => {
          if (item.id !== 'registro-auxiliar') return [item];
          return docenteRegistroLoaded ? docenteRegistroItems : [item];
        });
        const withDocenteEstructura = docenteEstructuraLoaded && docenteEstructuraItem
          ? [docenteEstructuraItem, ...items.filter((item) => item.id !== 'estructura-academica')]
          : items;

        return { ...section, items: withDocenteEstructura };
      })
      .filter((section) => section.items.length > 0);
  }, [
    docenteEstructuraItem,
    docenteEstructuraLoaded,
    docenteRegistroItems,
    docenteRegistroLoaded,
    filterSections,
    isDocente,
  ]);

  const nodes = useMemo(() => buildIntranetNodes(visibleSections), [visibleSections]);

  return (
    <FlyoutMenuTree
      label="Intranet"
      href="/intranet"
      nodes={nodes}
      width="230px"
      rootMenuSx={{ ml: -8 }}
      sx={{ display: { xs: 'none', md: 'block' } }}
    />
  );
}
