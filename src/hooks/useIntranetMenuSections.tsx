'use client';

import { useEffect, useMemo, useState } from 'react';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { httpsCallable } from 'firebase/functions';
import {
  menuSections,
  type IntranetMenuItem,
  type IntranetMenuSection,
} from '@/components/Sidebar/AcordionIntranet/AcordionIntranet';
import { useAuth } from '@/context/AuthContext';
import { functions } from '@/lib/firebase';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';

type RegistroAuxiliarDocenteModulo = {
  id: number;
  nombre?: string | null;
  moduloId: number;
  grupo?: {
    semestreId?: number | null;
    semestre?: { id?: number | null; titulo?: string | null } | null;
  } | null;
  modulo?: {
    titulo?: string | null;
    tituloComercial?: string | null;
  } | null;
};

type MatriculaDocenteGrupoModulo = {
  id: number;
  nombre?: string | null;
  moduloId: number;
  grupo?: {
    semestreId?: number | null;
    semestre?: { id?: number | null; titulo?: string | null } | null;
  } | null;
  modulo?: {
    titulo?: string | null;
    tituloComercial?: string | null;
  } | null;
};

type EstructuraAcademicaDocenteMenu = {
  title?: string | null;
  semestreTitulo?: string | null;
  hasModulos?: boolean | null;
};

type DocenteMenuItemKind = 'estructura' | 'lista' | 'notas';

type DocenteMenuItem = IntranetMenuItem & {
  docenteMenuKind?: DocenteMenuItemKind;
  grupoModuloId?: number;
  moduloName?: string;
  semestreKey?: string;
  semestreTitle?: string;
  semestrePeriodo?: string;
};

type DocenteMenuData = {
  registroItems: DocenteMenuItem[];
  matriculaItems: DocenteMenuItem[];
  estructuraItem: DocenteMenuItem | null;
  currentSemestreKey: string;
};

const TEACHER_ROLE_ID = 4;
const docenteMenuCache = new Map<string, DocenteMenuData>();
const docenteMenuRequests = new Map<string, Promise<DocenteMenuData>>();

const formatPeriodoMenu = (value: string | null | undefined) => {
  const text = String(value ?? '').trim();
  return text.replace(/^20(\d{2})\s*-\s*/, '$1-') || 'Periodo';
};

const normalizeMenuText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const getSemestreTitle = (semestre?: { titulo?: string | null } | null, fallback?: string | null) =>
  String(semestre?.titulo || fallback || '').trim();

const getSemestreKey = (
  semestre?: { id?: number | null; titulo?: string | null } | null,
  fallback?: string | null,
) => {
  const title = getSemestreTitle(semestre, fallback);
  const periodo = formatPeriodoMenu(title);
  if (periodo !== 'Periodo') return `periodo:${normalizeMenuText(periodo)}`;

  const id = Number(semestre?.id ?? 0);
  if (Number.isFinite(id) && id > 0) return `id:${id}`;
  return `titulo:${normalizeMenuText(title)}`;
};

const getDocenteMenuPairKey = (item: DocenteMenuItem) =>
  item.grupoModuloId
    ? `grupoModulo:${item.grupoModuloId}`
    : `${item.semestreKey || ''}|${normalizeMenuText(item.moduloName || item.title)}`;

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

const buildDocenteMatriculaPath = (
  grupoModuloId: number,
  moduloName: string,
  semestrePeriodo: string,
) => {
  const params = new URLSearchParams({ grupoModuloId: String(grupoModuloId) });
  const cleanModuloName = String(moduloName || '').trim();
  const cleanPeriodo = String(semestrePeriodo || '').trim();
  if (cleanModuloName) params.set('moduloNombre', cleanModuloName);
  if (cleanPeriodo && cleanPeriodo !== 'Periodo') params.set('periodo', cleanPeriodo);
  return `/intranet/matriculas?${params.toString()}`;
};

const buildDocenteRegistroItems = (
  modulos: RegistroAuxiliarDocenteModulo[],
  semestreTitulo?: string | null,
): DocenteMenuItem[] =>
  modulos.map((modulo) => {
    const semestreTitle = getSemestreTitle(modulo.grupo?.semestre, semestreTitulo);
    const periodo = formatPeriodoMenu(semestreTitle);
    const moduloName = getModuloMenuName(modulo);
    return {
      id: `registro-auxiliar-${modulo.id}`,
      title: `Notas ${moduloName} ${periodo}`,
      path: `/intranet/registro-auxiliar?grupoModuloId=${modulo.id}`,
      icon: <FactCheckIcon />,
      docenteMenuKind: 'notas',
      grupoModuloId: modulo.id,
      moduloName,
      semestreKey: getSemestreKey(modulo.grupo?.semestre, semestreTitulo),
      semestreTitle,
      semestrePeriodo: periodo,
    };
  });

const buildDocenteMatriculaItems = (
  modulos: MatriculaDocenteGrupoModulo[],
  semestreTitulo?: string | null,
): DocenteMenuItem[] =>
  modulos.map((modulo) => {
    const semestreTitle = getSemestreTitle(modulo.grupo?.semestre, semestreTitulo);
    const periodo = formatPeriodoMenu(semestreTitle);
    const moduloName = getGrupoModuloMenuName(modulo.nombre)
      || modulo.modulo?.titulo
      || modulo.modulo?.tituloComercial
      || `Modulo ${modulo.moduloId}`;
    return {
      id: `matriculas-${modulo.id}`,
      title: `Lista ${moduloName} ${periodo}`,
      path: buildDocenteMatriculaPath(modulo.id, moduloName, periodo),
      icon: <AssignmentIcon />,
      docenteMenuKind: 'lista',
      grupoModuloId: modulo.id,
      moduloName,
      semestreKey: getSemestreKey(modulo.grupo?.semestre, semestreTitulo),
      semestreTitle,
      semestrePeriodo: periodo,
    };
  });

const buildDocenteEstructuraItem = (
  title: string | null | undefined,
  semestreTitulo?: string | null,
): DocenteMenuItem => ({
  id: 'estructura-academica-docente',
  title: (String(title || '').trim() || 'Estructura Académica').replace('Estructura Academica', 'Estructura Académica'),
  path: '/intranet/estructura-academica-docente',
  icon: <AccountTreeIcon />,
  docenteMenuKind: 'estructura',
  semestreKey: getSemestreKey(null, semestreTitulo),
  semestreTitle: getSemestreTitle(null, semestreTitulo),
  semestrePeriodo: formatPeriodoMenu(semestreTitulo),
});

async function loadDocenteMenuData(params: {
  key: string;
  canViewRegistroAuxiliar: boolean;
  canViewMatriculas: boolean;
  canViewEstructuraAcademica: boolean;
}) {
  const cached = docenteMenuCache.get(params.key);
  if (cached) return cached;

  const currentRequest = docenteMenuRequests.get(params.key);
  if (currentRequest) return currentRequest;

  const request = (async (): Promise<DocenteMenuData> => {
    const [registroItems, matriculaItems, estructuraItem] = await Promise.all([
      params.canViewRegistroAuxiliar
        ? (async () => {
          const listRegistroAuxiliarDocenteModulos = httpsCallable<
            undefined,
            { modulos?: RegistroAuxiliarDocenteModulo[]; semestreTitulo?: string | null }
          >(functions, 'listRegistroAuxiliarDocenteModulos');
          const result = await listRegistroAuxiliarDocenteModulos();
          return buildDocenteRegistroItems(result.data.modulos || [], result.data.semestreTitulo);
        })()
        : Promise.resolve([]),
      params.canViewMatriculas
        ? (async () => {
          const listMatriculaDocenteGrupos = httpsCallable<
            undefined,
            { grupoModulos?: MatriculaDocenteGrupoModulo[]; semestreTitulo?: string | null }
          >(functions, 'listMatriculaDocenteGrupos');
          const result = await listMatriculaDocenteGrupos();
          return buildDocenteMatriculaItems(result.data.grupoModulos || [], result.data.semestreTitulo);
        })()
        : Promise.resolve([]),
      params.canViewEstructuraAcademica
        ? (async () => {
          const getEstructuraAcademicaDocenteMenu = httpsCallable<undefined, EstructuraAcademicaDocenteMenu>(
            functions,
            'getEstructuraAcademicaDocenteMenu',
          );
          const result = await getEstructuraAcademicaDocenteMenu();
          return result.data.hasModulos === false
            ? null
            : buildDocenteEstructuraItem(result.data.title, result.data.semestreTitulo);
        })()
        : Promise.resolve(null),
    ]);

    const currentSemestreKey =
      estructuraItem?.semestreKey ||
      matriculaItems[0]?.semestreKey ||
      registroItems[0]?.semestreKey ||
      '';
    const data = { registroItems, matriculaItems, estructuraItem, currentSemestreKey };
    docenteMenuCache.set(params.key, data);
    return data;
  })();

  docenteMenuRequests.set(params.key, request);
  try {
    return await request;
  } finally {
    docenteMenuRequests.delete(params.key);
  }
}

const buildDocenteSemestreItems = (
  semestreKey: string,
  matriculaItems: DocenteMenuItem[],
  registroItems: DocenteMenuItem[],
) => {
  const listas = matriculaItems.filter((item) => item.semestreKey === semestreKey);
  const notas = registroItems.filter((item) => item.semestreKey === semestreKey);
  const notasByPairKey = new Map(notas.map((item) => [getDocenteMenuPairKey(item), item]));
  const orderedPairKeys = Array.from(new Set([
    ...listas.map(getDocenteMenuPairKey),
    ...notas.map(getDocenteMenuPairKey),
  ]));

  return orderedPairKeys.flatMap((pairKey) => {
    const pairItems: DocenteMenuItem[] = [];
    const lista = listas.find((item) => getDocenteMenuPairKey(item) === pairKey);
    const nota = notasByPairKey.get(pairKey);
    if (lista) pairItems.push(lista);
    if (nota) pairItems.push(nota);
    return pairItems;
  });
};

const buildDocenteMenuDivider = (): IntranetMenuItem => ({
  id: 'docente-menu-semestre-divider',
  title: '',
  path: '#',
  icon: null,
  divider: true,
});

function buildDocenteRegistrosItems(data: DocenteMenuData): IntranetMenuItem[] {
  const semestreKeys = Array.from(new Set([
    data.estructuraItem?.semestreKey,
    ...data.matriculaItems.map((item) => item.semestreKey),
    ...data.registroItems.map((item) => item.semestreKey),
  ].filter((key): key is string => Boolean(key))));

  const currentSemestreKey = data.currentSemestreKey || semestreKeys[0] || '';
  const previousSemestreKeys = semestreKeys.filter((key) => key !== currentSemestreKey);
  const currentItems = [
    ...(data.estructuraItem && data.estructuraItem.semestreKey === currentSemestreKey ? [data.estructuraItem] : []),
    ...buildDocenteSemestreItems(currentSemestreKey, data.matriculaItems, data.registroItems),
  ];
  const previousItems = previousSemestreKeys.flatMap((semestreKey) =>
    buildDocenteSemestreItems(semestreKey, data.matriculaItems, data.registroItems),
  );

  if (currentItems.length > 0 && previousItems.length > 0) {
    return [...currentItems, buildDocenteMenuDivider(), ...previousItems];
  }
  return [...currentItems, ...previousItems];
}

function applyDocenteRegistrosMenu(params: {
  sections: IntranetMenuSection[];
  sourceSections: IntranetMenuSection[];
  data: DocenteMenuData;
  canViewRegistroAuxiliar: boolean;
  canViewMatriculas: boolean;
  canViewEstructuraAcademica: boolean;
}) {
  const shouldEnsureRegistros =
    params.canViewRegistroAuxiliar ||
    params.canViewMatriculas ||
    params.canViewEstructuraAcademica;
  const baseSections = shouldEnsureRegistros && !params.sections.some((section) => section.id === 'registros')
    ? [
      ...params.sections,
      {
        ...(params.sourceSections.find((section) => section.id === 'registros') || {
          id: 'registros',
          title: 'Registros',
          icon: <AssignmentIcon />,
          items: [],
        }),
        items: [],
      },
    ]
    : params.sections;

  return baseSections
    .map((section) => {
      if (section.id !== 'registros') return section;

      const docenteItems = buildDocenteRegistrosItems(params.data);
      let docenteItemsInserted = false;
      const docenteMenuPlaceholderIds = new Set(['estructura-academica', 'matriculas', 'registro-auxiliar']);
      const items = section.items.flatMap((item) => {
        if (docenteMenuPlaceholderIds.has(item.id)) {
          if (docenteItemsInserted) return [];
          docenteItemsInserted = true;
          return docenteItems;
        }
        return [item];
      });

      return { ...section, items: docenteItemsInserted ? items : [...docenteItems, ...items] };
    })
    .filter((section) => section.items.length > 0);
}

export function useIntranetMenuSections(sourceSections: IntranetMenuSection[] = menuSections) {
  const { user } = useAuth();
  const { can, filterSections, loading: loadingPermissions, permissions } = useIntranetPermissions();
  const isDocente = Number(user?.role ?? 0) === TEACHER_ROLE_ID && Number(user?.level ?? 0) < 600;
  const canViewRegistroAuxiliar = can('registro-auxiliar', 'view');
  const canViewMatriculas = can('matriculas', 'view');
  const canViewEstructuraAcademica = can('estructura-academica', 'view');
  const permissionSignature = useMemo(
    () => permissions
      .map((permission) => [
        permission.entity,
        permission.canView ? 'v' : '',
        permission.canCreate ? 'c' : '',
        permission.canEdit ? 'e' : '',
        permission.canDelete ? 'd' : '',
      ].join(':'))
      .sort()
      .join('|'),
    [permissions],
  );
  const docenteMenuKey = isDocente && !loadingPermissions
    ? [
      user?.uid ?? '',
      permissionSignature,
      canViewRegistroAuxiliar ? 'registro' : '',
      canViewMatriculas ? 'matriculas' : '',
      canViewEstructuraAcademica ? 'estructura' : '',
    ].join('|')
    : '';
  const [docenteMenuData, setDocenteMenuData] = useState<DocenteMenuData | null>(
    () => (docenteMenuKey ? docenteMenuCache.get(docenteMenuKey) ?? null : null),
  );
  const [loadingDocenteMenu, setLoadingDocenteMenu] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!isDocente || loadingPermissions || !docenteMenuKey) {
        setDocenteMenuData(null);
        setLoadingDocenteMenu(false);
        return;
      }

      const cached = docenteMenuCache.get(docenteMenuKey);
      if (cached) {
        setDocenteMenuData(cached);
        setLoadingDocenteMenu(false);
        return;
      }

      setDocenteMenuData(null);
      setLoadingDocenteMenu(true);
      try {
        const data = await loadDocenteMenuData({
          key: docenteMenuKey,
          canViewRegistroAuxiliar,
          canViewMatriculas,
          canViewEstructuraAcademica,
        });
        if (active) setDocenteMenuData(data);
      } catch (error) {
        console.error('Error loading docente intranet menu:', error);
        if (active) {
          setDocenteMenuData({ registroItems: [], matriculaItems: [], estructuraItem: null, currentSemestreKey: '' });
        }
      } finally {
        if (active) setLoadingDocenteMenu(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [
    canViewEstructuraAcademica,
    canViewMatriculas,
    canViewRegistroAuxiliar,
    docenteMenuKey,
    isDocente,
    loadingPermissions,
  ]);

  const sections = useMemo(() => {
    if (loadingPermissions) return [];

    const filteredSections = filterSections(sourceSections);
    if (!isDocente) return filteredSections;
    if (loadingDocenteMenu || !docenteMenuData) return [];

    return applyDocenteRegistrosMenu({
      sections: filteredSections,
      sourceSections,
      data: docenteMenuData,
      canViewRegistroAuxiliar,
      canViewMatriculas,
      canViewEstructuraAcademica,
    });
  }, [
    canViewEstructuraAcademica,
    canViewMatriculas,
    canViewRegistroAuxiliar,
    docenteMenuData,
    filterSections,
    isDocente,
    loadingDocenteMenu,
    loadingPermissions,
    sourceSections,
  ]);

  return {
    sections,
    loading: loadingPermissions || (isDocente && (loadingDocenteMenu || !docenteMenuData)),
  };
}
