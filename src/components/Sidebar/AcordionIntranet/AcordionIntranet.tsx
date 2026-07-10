'use client';

import React from 'react';
import Link from 'next/link';
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
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
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

interface Props {
  openAccordions: string[];
  handleAccordionChange: (id: string, ancestors: string[]) => void;
  showRoot?: boolean;
  sections?: IntranetMenuSection[];
}

const rootId = 'intranet';

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
      { id: 'documentos-reportes', title: 'Actas y N\u00f3minas', path: '/intranet/reportes/documentos', icon: <ArticleIcon /> },
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

function IntranetMenuItems({ items }: { items: IntranetMenuItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <CustomList>
      {items.map((item) => (
        <ListItem key={item.id} disablePadding>
          <ListItemButton
            component={Link}
            href={item.path}
            sx={{ minHeight: 40, px: 1, py: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 34, color: 'text.secondary' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.title}
              primaryTypographyProps={{ fontSize: 13 }}
            />
          </ListItemButton>
        </ListItem>
      ))}
    </CustomList>
  );
}

export default function AcordionIntranet({
  openAccordions,
  handleAccordionChange,
  showRoot = true,
  sections: intranetSections = menuSections,
}: Props) {
  const rootAncestors = showRoot ? [rootId] : [];

  const sections = (
    <>
      {intranetSections.map((section) => {
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
            <IntranetMenuItems items={section.items} />
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
