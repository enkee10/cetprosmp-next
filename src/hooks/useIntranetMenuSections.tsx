'use client';

import { useEffect, useMemo, useState } from 'react';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import {
  menuSections,
  type IntranetMenuItem,
  type IntranetMenuSection,
} from '@/components/Sidebar/AcordionIntranet/AcordionIntranet';
import { useAuth } from '@/context/AuthContext';
import { loadDocenteModulos } from '@/lib/docenteModulos';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';
import { curricularTitle } from '@/lib/curricularFilters';
import { useAppSettings } from '@/hooks/useAppSettings';
import { docenteMenuModuloName, docenteMenuPeriodo, type DocenteMenuModulo } from '@/lib/docenteMenuLabels';

type RegistroAuxiliarDocenteModulo = DocenteMenuModulo;
type MatriculaDocenteGrupoModulo = DocenteMenuModulo;

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
  cacheKey: string;
  registroItems: DocenteMenuItem[];
  matriculaItems: DocenteMenuItem[];
  estructuraItem: DocenteMenuItem | null;
  currentSemestreKey: string;
};

const TEACHER_ROLE_ID = 4;
const docenteMenuCache = new Map<string, DocenteMenuData>();
const docenteMenuRequests = new Map<string, Promise<DocenteMenuData>>();

const formatPeriodoMenu = docenteMenuPeriodo;

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
  if (periodo) return `periodo:${normalizeMenuText(periodo)}`;

  const id = Number(semestre?.id ?? 0);
  if (Number.isFinite(id) && id > 0) return `id:${id}`;
  return `titulo:${normalizeMenuText(title)}`;
};

const getDocenteMenuPairKey = (item: DocenteMenuItem) =>
  item.grupoModuloId
    ? `grupoModulo:${item.grupoModuloId}`
    : `${item.semestreKey || ''}|${normalizeMenuText(item.moduloName || item.title)}`;

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
    const moduloName = docenteMenuModuloName(modulo);
    return {
      id: `registro-auxiliar-${modulo.id}`,
      title: `Notas ${moduloName} ${periodo}`.trim(),
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
    const moduloName = docenteMenuModuloName(modulo);
    return {
      id: `matriculas-${modulo.id}`,
      title: `Lista ${moduloName} ${periodo}`.trim(),
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
  title: curricularTitle(title),
  path: '/intranet/estructura-academica-docente',
  icon: <AccountTreeIcon />,
  docenteMenuKind: 'estructura',
  semestreKey: getSemestreKey(null, semestreTitulo),
  semestreTitle: getSemestreTitle(null, semestreTitulo),
  semestrePeriodo: formatPeriodoMenu(semestreTitulo),
});

async function loadDocenteMenuData(params: {
  key: string;
  uid: string;
  semestreId: number;
  canViewRegistroAuxiliar: boolean;
  canViewMatriculas: boolean;
  canViewEstructuraAcademica: boolean;
}) {
  const cached = docenteMenuCache.get(params.key);
  if (cached) return cached;

  const currentRequest = docenteMenuRequests.get(params.key);
  if (currentRequest) return currentRequest;

  if (!params.canViewRegistroAuxiliar && !params.canViewMatriculas && !params.canViewEstructuraAcademica) {
    const data: DocenteMenuData = {
      cacheKey: params.key, registroItems: [], matriculaItems: [], estructuraItem: null, currentSemestreKey: '',
    };
    docenteMenuCache.set(params.key, data);
    return data;
  }

  const request = (async (): Promise<DocenteMenuData> => {
    const result = await loadDocenteModulos({
      uid: params.uid,
      semestreId: params.semestreId,
      matriculas: params.canViewMatriculas,
      notas: params.canViewRegistroAuxiliar,
      estructura: params.canViewEstructuraAcademica,
    });
    const modulos = result.modulos || [];
    const semestreTitulo = result.semestreTitulo;
    const registroItems = params.canViewRegistroAuxiliar ? buildDocenteRegistroItems(modulos, semestreTitulo) : [];
    const matriculaItems = params.canViewMatriculas ? buildDocenteMatriculaItems(modulos, semestreTitulo) : [];
    const estructuraItem = params.canViewEstructuraAcademica && modulos.length
      ? buildDocenteEstructuraItem(`Programación Curricular ${formatPeriodoMenu(semestreTitulo)}`.trim(), semestreTitulo)
      : null;
    const currentSemestreKey = getSemestreKey(null, semestreTitulo);
    const data = { cacheKey: params.key, registroItems, matriculaItems, estructuraItem, currentSemestreKey };
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
  const listasByPairKey = new Map(listas.map((item) => [getDocenteMenuPairKey(item), item]));
  const notasByPairKey = new Map(notas.map((item) => [getDocenteMenuPairKey(item), item]));
  const orderedPairKeys = Array.from(new Set([
    ...listas.map(getDocenteMenuPairKey),
    ...notas.map(getDocenteMenuPairKey),
  ]));

  return orderedPairKeys.flatMap((pairKey) => {
    const pairItems: DocenteMenuItem[] = [];
    const lista = listasByPairKey.get(pairKey);
    const nota = notasByPairKey.get(pairKey);
    if (lista) pairItems.push(lista);
    if (nota) pairItems.push(nota);
    return pairItems;
  });
};

function buildDocenteRegistrosItems(data: DocenteMenuData): IntranetMenuItem[] {
  return [
    ...(data.estructuraItem ? [data.estructuraItem] : []),
    ...buildDocenteSemestreItems(data.currentSemestreKey, data.matriculaItems, data.registroItems),
  ];
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
  const { settings, loading: loadingSettings } = useAppSettings();
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
  const docenteMenuKey = isDocente && !loadingPermissions && !loadingSettings
    ? [
      user?.uid ?? '',
      String(settings.general.semestreActualId ?? ''),
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
          uid: user?.uid ?? '',
          semestreId: Number(settings.general.semestreActualId),
          canViewRegistroAuxiliar,
          canViewMatriculas,
          canViewEstructuraAcademica,
        });
        if (active) setDocenteMenuData(data);
      } catch (error) {
        console.error('Error loading docente intranet menu:', error);
        if (active) {
          setDocenteMenuData({ cacheKey: docenteMenuKey, registroItems: [], matriculaItems: [], estructuraItem: null, currentSemestreKey: '' });
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
    user?.uid,
    settings.general.semestreActualId,
  ]);

  const sections = useMemo(() => {
    if (loadingPermissions) return [];

    const filteredSections = filterSections(sourceSections);
    if (!isDocente) return filteredSections;
    if (loadingDocenteMenu || !docenteMenuData || docenteMenuData.cacheKey !== docenteMenuKey) {
      return filteredSections.map((section) => ({ ...section,
        items: section.items.filter((item) => !['estructura-academica', 'matriculas', 'registro-auxiliar'].includes(item.id)),
      })).filter((section) => section.items.length > 0);
    }

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
    docenteMenuKey,
    filterSections,
    isDocente,
    loadingDocenteMenu,
    loadingPermissions,
    sourceSections,
  ]);

  return {
    sections,
    loading: loadingPermissions || (isDocente && (loadingSettings || loadingDocenteMenu || !docenteMenuData || docenteMenuData.cacheKey !== docenteMenuKey)),
  };
}
