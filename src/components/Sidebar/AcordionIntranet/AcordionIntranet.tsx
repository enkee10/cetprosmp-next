'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ArticleIcon from '@mui/icons-material/Article';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CategoryIcon from '@mui/icons-material/Category';
import BusinessIcon from '@mui/icons-material/Business';
import EventNoteIcon from '@mui/icons-material/EventNote';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FactoryIcon from '@mui/icons-material/Factory';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PeopleIcon from '@mui/icons-material/People';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SchoolIcon from '@mui/icons-material/School';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import TuneIcon from '@mui/icons-material/Tune';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { useAuth } from '@/context/AuthContext';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';
import { functions } from '@/lib/firebase';
import FullCustomAccordion, {
  CustomList,
} from '../FullCustomAccordion/FullCustomAccordion2';

export type IntranetMenuItem = {
  id: string;
  title: string;
  path: string;
  icon: React.ReactNode;
};

export type IntranetMenuSection = {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: IntranetMenuItem[];
};

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

type MatriculaDocenteGrupoModulo = {
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

interface Props {
  openAccordions: string[];
  handleAccordionChange: (id: string, ancestors: string[]) => void;
  showRoot?: boolean;
  sections?: IntranetMenuSection[];
  variant?: 'intranetPage' | 'mobileDrawer';
}

const rootId = 'intranet';
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
      icon: <FactCheckIcon />,
    };
  });

const buildDocenteMatriculaItems = (
  modulos: MatriculaDocenteGrupoModulo[],
  semestreTitulo?: string | null,
): IntranetMenuItem[] =>
  modulos.map((modulo) => {
    const periodo = formatPeriodoMenu(modulo.grupo?.semestre?.titulo || semestreTitulo);
    const moduloName = getGrupoModuloMenuName(modulo.nombre)
      || modulo.modulo?.titulo
      || modulo.modulo?.tituloComercial
      || `Modulo ${modulo.moduloId}`;
    return {
      id: `matriculas-${modulo.id}`,
      title: `Lista ${periodo} ${moduloName}`,
      path: `/intranet/matriculas?grupoModuloId=${modulo.id}`,
      icon: <AssignmentIcon />,
    };
  });

const buildDocenteEstructuraItem = (title: string | null | undefined): IntranetMenuItem => ({
  id: 'estructura-academica-docente',
  title: String(title || '').trim() || 'Estructura Academica',
  path: '/intranet/estructura-academica-docente',
  icon: <AccountTreeIcon />,
});

const isMenuItemActive = (itemPath: string, pathname: string, searchParams: URLSearchParams) => {
  const [itemPathname, itemQuery = ''] = itemPath.split('?');
  const isSamePath = pathname === itemPathname || pathname.startsWith(`${itemPathname}/`);
  if (!isSamePath) return false;
  if (!itemQuery) return true;

  const itemParams = new URLSearchParams(itemQuery);
  return Array.from(itemParams.entries()).every(([key, value]) => searchParams.get(key) === value);
};

const intranetPageIvory = '#fff8e8';
const intranetMenuTextColor = 'rgba(255, 248, 232, 0.82)';
const intranetMenuActiveBg = 'rgba(255, 248, 232, 0.12)';
const intranetMenuHoverBg = 'rgba(255, 248, 232, 0.08)';
const mobileDrawerMenuTextColor = '#000';
const mobileDrawerMenuActiveBg = 'rgba(49, 133, 21, 0.18)';
const mobileDrawerMenuHoverBg = 'rgba(49, 133, 21, 0.1)';

export const menuSections: IntranetMenuSection[] = [
  {
    id: 'entidades',
    title: 'Entidades',
    icon: <AccountTreeIcon />,
    items: [
      { id: 'sectores', title: 'Sectores', path: '/intranet/sectores', icon: <FactoryIcon /> },
      { id: 'datos-generales', title: 'Datos Generales', path: '/intranet/datos-generales', icon: <BusinessIcon /> },
      { id: 'familias', title: 'Familias', path: '/intranet/familias', icon: <FamilyRestroomIcon /> },
      { id: 'act-economicas', title: 'Actividades Econ\u00f3micas', path: '/intranet/act-economicas', icon: <AccountBalanceIcon /> },
      { id: 'especialidades', title: 'Especialidades', path: '/intranet/especialidades', icon: <AutoStoriesIcon /> },
      { id: 'carreras', title: 'Carreras', path: '/intranet/carreras', icon: <SchoolIcon /> },
      { id: 'planes', title: 'Planes', path: '/intranet/planes', icon: <AssignmentIcon /> },
      { id: 'modulos', title: 'M\u00f3dulos', path: '/intranet/modulos', icon: <ViewModuleIcon /> },
      { id: 'paquetes', title: 'Paquetes', path: '/intranet/paquetes', icon: <Inventory2Icon /> },
      { id: 'grupos', title: 'Grupos', path: '/intranet/grupos', icon: <PeopleIcon /> },
      { id: 'grupo-modulos', title: 'Grupo-Modulo', path: '/intranet/grupo-modulos', icon: <AccountTreeIcon /> },
      { id: 'personal', title: 'Personal', path: '/intranet/personal', icon: <PeopleIcon /> },
      { id: 'turnos', title: 'Turnos', path: '/intranet/turnos', icon: <ScheduleIcon /> },
      { id: 'horarios', title: 'Horarios', path: '/intranet/horarios', icon: <ScheduleIcon /> },
      { id: 'calendarios', title: 'Calendarios', path: '/intranet/calendarios', icon: <EventNoteIcon /> },
      { id: 'eventos', title: 'Eventos', path: '/intranet/eventos', icon: <EventNoteIcon /> },
      { id: 'unidades-didacticas', title: 'Unidades Did\u00e1cticas', path: '/intranet/unidades-didacticas', icon: <MenuBookIcon /> },
      { id: 'capacidades-terminales', title: 'Capacidades Terminales', path: '/intranet/capacidades-terminales', icon: <TrackChangesIcon /> },
      { id: 'indicadores-capacidad', title: 'Indicador de Capacidad', path: '/intranet/indicadores-capacidad', icon: <FactCheckIcon /> },
      { id: 'aprendizajes', title: 'Aprendizajes', path: '/intranet/aprendizajes', icon: <PsychologyIcon /> },
      { id: 'actividades', title: 'Actividad', path: '/intranet/actividades', icon: <EventNoteIcon /> },
    ],
  },
  {
    id: 'miselanea',
    title: 'Miscel\u00e1nea',
    icon: <CategoryIcon />,
    items: [
      { id: 'anios', title: 'A\u00f1os', path: '/intranet/anios', icon: <CalendarMonthIcon /> },
      { id: 'semestres', title: 'Semestres', path: '/intranet/semestres', icon: <ScheduleIcon /> },
      { id: 'tipos-carrera', title: 'Tipos de Carrera', path: '/intranet/tipos-carrera', icon: <CategoryIcon /> },
    ],
  },
  {
    id: 'registros',
    title: 'Registros',
    icon: <AssignmentIcon />,
    items: [
      { id: 'estructura-academica', title: 'Estructura Acad\u00e9mica', path: '/intranet/estructura-academica', icon: <AccountTreeIcon /> },
      { id: 'matriculas', title: 'Matr\u00edculas', path: '/intranet/matriculas', icon: <AssignmentIcon /> },
      { id: 'registro-auxiliar', title: 'Registro Auxiliar', path: '/intranet/registro-auxiliar', icon: <FactCheckIcon /> },
      { id: 'users', title: 'Users', path: '/intranet/users', icon: <PeopleIcon /> },
      { id: 'roles', title: 'Roles', path: '/intranet/roles', icon: <LockPersonIcon /> },
    ],
  },
  {
    id: 'reportes',
    title: 'Reportes',
    icon: <AssessmentIcon />,
    items: [
      { id: 'documentos-reportes', title: 'Nominas y Actas', path: '/intranet/reportes/documentos', icon: <ArticleIcon /> },
      { id: 'certificados-titulos', title: 'Certificados y Titulos', path: '/intranet/reportes/certificados-titulos', icon: <SchoolIcon /> },
    ],
  },
  {
    id: 'mantenimiento',
    title: 'Mantenimiento',
    icon: <SettingsApplicationsIcon />,
    items: [
      { id: 'permisos', title: 'Permisos', path: '/intranet/mantenimiento/permisos', icon: <LockPersonIcon /> },
      { id: 'settings', title: 'Settings', path: '/intranet/mantenimiento/settings', icon: <TuneIcon /> },
    ],
  },
];

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Box
      component="span"
      sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, pl: 0.75, fontWeight: 700 }}
    >
      <Box
        component="span"
        sx={{
          display: 'flex',
          color: 'inherit',
          '& svg': { fontSize: 21.5, fontWeight: 700, stroke: 'currentColor', strokeWidth: 0.3 },
        }}
      >
        {icon}
      </Box>
      <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }}>
        {title}
      </Box>
    </Box>
  );
}

function IntranetMenuItems({
  items,
  variant = 'intranetPage',
}: {
  items: IntranetMenuItem[];
  variant?: Props['variant'];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobileDrawer = variant === 'mobileDrawer';
  const textColor = isMobileDrawer ? mobileDrawerMenuTextColor : intranetMenuTextColor;
  const activeTextColor = isMobileDrawer ? mobileDrawerMenuTextColor : intranetPageIvory;
  const activeBg = isMobileDrawer ? mobileDrawerMenuActiveBg : intranetMenuActiveBg;
  const hoverBg = isMobileDrawer ? mobileDrawerMenuHoverBg : intranetMenuHoverBg;

  if (items.length === 0) {
    return null;
  }

  return (
    <CustomList>
      {items.map((item) => {
        const active = isMenuItemActive(item.path, pathname, searchParams);

        return (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              component={Link}
              href={item.path}
              selected={active}
              sx={{
                minHeight: 40,
                alignItems: 'flex-start',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: active ? activeBg : 'transparent',
                '&:hover': {
                  bgcolor: active ? activeBg : hoverBg,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: active ? activeTextColor : textColor }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.title}
                primaryTypographyProps={{
                  fontSize: 13,
                  fontWeight: active ? 900 : 400,
                  color: active ? activeTextColor : textColor,
                  sx: {
                    whiteSpace: 'normal',
                    overflow: 'visible',
                    textOverflow: 'clip',
                    lineHeight: 1.25,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </CustomList>
  );
}

export default function AcordionIntranet({
  openAccordions,
  handleAccordionChange,
  showRoot = true,
  sections: intranetSections = menuSections,
  variant = 'intranetPage',
}: Props) {
  const rootAncestors = showRoot ? [rootId] : [];
  const { user } = useAuth();
  const { can, filterSections, loading: loadingPermissions } = useIntranetPermissions();
  const [docenteRegistroItems, setDocenteRegistroItems] = React.useState<IntranetMenuItem[]>([]);
  const [docenteRegistroLoaded, setDocenteRegistroLoaded] = React.useState(false);
  const [docenteMatriculaItems, setDocenteMatriculaItems] = React.useState<IntranetMenuItem[]>([]);
  const [docenteMatriculaLoaded, setDocenteMatriculaLoaded] = React.useState(false);
  const [docenteEstructuraItem, setDocenteEstructuraItem] = React.useState<IntranetMenuItem | null>(null);
  const [docenteEstructuraLoaded, setDocenteEstructuraLoaded] = React.useState(false);
  const isDocente = Number(user?.role ?? 0) === TEACHER_ROLE_ID && Number(user?.level ?? 0) < 600;
  const canViewRegistroAuxiliar = can('registro-auxiliar', 'view');
  const canViewEstructuraAcademica = can('estructura-academica', 'view');
  const canViewMatriculas = can('matriculas', 'view');

  React.useEffect(() => {
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

  React.useEffect(() => {
    let active = true;

    const loadDocenteMatriculaItems = async () => {
      if (!isDocente || loadingPermissions || !canViewMatriculas) {
        setDocenteMatriculaItems([]);
        setDocenteMatriculaLoaded(false);
        return;
      }

      setDocenteMatriculaLoaded(false);
      try {
        const listMatriculaDocenteGrupos = httpsCallable<
          undefined,
          { grupoModulos?: MatriculaDocenteGrupoModulo[]; semestreTitulo?: string | null }
        >(functions, 'listMatriculaDocenteGrupos');
        const result = await listMatriculaDocenteGrupos();
        if (!active) return;
        setDocenteMatriculaItems(buildDocenteMatriculaItems(result.data.grupoModulos || [], result.data.semestreTitulo));
      } catch (error) {
        console.error('Error loading docente matricula groups:', error);
        if (active) setDocenteMatriculaItems([]);
      } finally {
        if (active) setDocenteMatriculaLoaded(true);
      }
    };

    void loadDocenteMatriculaItems();
    return () => {
      active = false;
    };
  }, [canViewMatriculas, isDocente, loadingPermissions]);

  React.useEffect(() => {
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

  const visibleSections = React.useMemo(() => {
    const filteredSections = filterSections(intranetSections);
    const docenteSections = isDocente && !filteredSections.some((section) => section.id === 'registros')
      ? [
        ...filteredSections,
        {
          ...(intranetSections.find((section) => section.id === 'registros') || {
            id: 'registros',
            title: 'Registros',
            icon: <AssignmentIcon />,
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
          if (item.id === 'matriculas') return docenteMatriculaLoaded ? docenteMatriculaItems : [item];
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
    docenteMatriculaItems,
    docenteMatriculaLoaded,
    docenteRegistroItems,
    docenteRegistroLoaded,
    filterSections,
    intranetSections,
    isDocente,
  ]);

  const sections = (
    <>
      {visibleSections.map((section) => {
        const sectionId = `${rootId}-${section.id}`;

        return (
          <FullCustomAccordion
            key={sectionId}
            id={sectionId}
            title={<SectionTitle icon={section.icon} title={section.title} />}
            ancestors={rootAncestors}
            expanded={openAccordions.includes(sectionId)}
            onChange={() => handleAccordionChange(sectionId, rootAncestors)}
          >
            <IntranetMenuItems items={section.items} variant={variant} />
          </FullCustomAccordion>
        );
      })}
    </>
  );

  if (!showRoot) {
    return sections;
  }

  return (
    <FullCustomAccordion
      id={rootId}
      title="Intranet"
      ancestors={[]}
      expanded={openAccordions.includes(rootId)}
      onChange={() => handleAccordionChange(rootId, [])}
    >
      {sections}
    </FullCustomAccordion>
  );
}
