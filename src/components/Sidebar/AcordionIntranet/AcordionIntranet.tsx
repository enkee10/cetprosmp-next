'use client';

import React from 'react';
import Link from 'next/link';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CategoryIcon from '@mui/icons-material/Category';
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
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import FullCustomAccordion, {
  CustomList,
} from '../FullCustomAccordion/FullCustomAccordion2';

type IntranetMenuItem = {
  id: string;
  title: string;
  path: string;
  icon: React.ReactNode;
};

type IntranetMenuSection = {
  id: string;
  title: string;
  items: IntranetMenuItem[];
};

interface Props {
  openAccordions: string[];
  handleAccordionChange: (id: string, ancestors: string[]) => void;
  showRoot?: boolean;
}

const rootId = 'intranet';

const menuSections: IntranetMenuSection[] = [
  {
    id: 'entidades',
    title: 'Entidades',
    items: [
      { id: 'sectores', title: 'Sectores', path: '/intranet/sectores', icon: <FactoryIcon /> },
      { id: 'familias', title: 'Familias', path: '/intranet/familias', icon: <FamilyRestroomIcon /> },
      { id: 'act-economicas', title: 'Actividades Económicas', path: '/intranet/act-economicas', icon: <AccountBalanceIcon /> },
      { id: 'especialidades', title: 'Especialidades', path: '/intranet/especialidades', icon: <AutoStoriesIcon /> },
      { id: 'carreras', title: 'Carreras', path: '/intranet/carreras', icon: <SchoolIcon /> },
      { id: 'planes', title: 'Planes', path: '/intranet/planes', icon: <AssignmentIcon /> },
      { id: 'modulos', title: 'Módulos', path: '/intranet/modulos', icon: <ViewModuleIcon /> },
      { id: 'paquetes', title: 'Paquetes', path: '/intranet/paquetes', icon: <Inventory2Icon /> },
      { id: 'unidades-didacticas', title: 'Unidades Didácticas', path: '/intranet/unidades-didacticas', icon: <MenuBookIcon /> },
      { id: 'capacidades-terminales', title: 'Capacidades Terminales', path: '/intranet/capacidades-terminales', icon: <TrackChangesIcon /> },
      { id: 'indicadores-capacidad', title: 'Indicador de Capacidad', path: '/intranet/indicadores-capacidad', icon: <FactCheckIcon /> },
      { id: 'aprendizajes', title: 'Aprendizajes', path: '/intranet/aprendizajes', icon: <PsychologyIcon /> },
      { id: 'actividades', title: 'Actividad', path: '/intranet/actividades', icon: <EventNoteIcon /> },
    ],
  },
  {
    id: 'miselanea',
    title: 'Miselanea',
    items: [
      { id: 'tipos-carrera', title: 'Tipos de Carrera', path: '/intranet/tipos-carrera', icon: <CategoryIcon /> },
    ],
  },
  {
    id: 'registros',
    title: 'Registros',
    items: [
      { id: 'users', title: 'Users', path: '/intranet/users', icon: <PeopleIcon /> },
      { id: 'roles', title: 'Roles', path: '/intranet/roles', icon: <LockPersonIcon /> },
    ],
  },
  {
    id: 'reportes',
    title: 'Reportes',
    items: [],
  },
];

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
}: Props) {
  const rootAncestors = showRoot ? [rootId] : [];

  const sections = (
    <>
      {menuSections.map((section) => {
        const sectionId = `${rootId}-${section.id}`;

        return (
          <FullCustomAccordion
            key={sectionId}
            id={sectionId}
            title={section.title}
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
