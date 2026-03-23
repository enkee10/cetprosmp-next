'use client'
import React from 'react';
import Link from 'next/link';
import { Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar } from '@mui/material';

// Import Icons
import PeopleIcon from '@mui/icons-material/People';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SchoolIcon from '@mui/icons-material/School';
import InfoIcon from '@mui/icons-material/Info';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import GroupsIcon from '@mui/icons-material/Groups';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import BadgeIcon from '@mui/icons-material/Badge';
import ArticleIcon from '@mui/icons-material/Article';
import FactoryIcon from '@mui/icons-material/Factory';
import DateRangeIcon from '@mui/icons-material/DateRange';

const collections = [
  { name: 'Actividades Económicas', path: '/intranet/act_economicas', icon: <AccountBalanceIcon /> },
  { name: 'Calendarios', path: '/intranet/calendarios', icon: <CalendarMonthIcon /> },
  { name: 'Carreras', path: '/intranet/carreras', icon: <SchoolIcon /> },
  { name: 'Dato General', path: '/intranet/dato_general', icon: <InfoIcon /> },
  { name: 'Especialidades', path: '/intranet/especialidades', icon: <AutoStoriesIcon /> },
  { name: 'Familias', path: '/intranet/familias', icon: <FamilyRestroomIcon /> },
  { name: 'Grupos', path: '/intranet/grupos', icon: <GroupsIcon /> },
  { name: 'Matrículas', path: '/intranet/matriculas', icon: <HowToRegIcon /> },
  { name: 'Módulos', path: '/intranet/modulos', icon: <ViewModuleIcon /> },
  { name: 'Paquetes', path: '/intranet/paquetes', icon: <Inventory2Icon /> },
  { name: 'Personales', path: '/intranet/personales', icon: <BadgeIcon /> },
  { name: 'Publicaciones', path: '/intranet/publicaciones', icon: <ArticleIcon /> },
  { name: 'Sectores', path: '/intranet/sectores', icon: <FactoryIcon /> },
  { name: 'Semestres', path: '/intranet/semestres', icon: <DateRangeIcon /> },
  { name: 'Usuarios', path: '/intranet/users', icon: <PeopleIcon /> },
  { name: 'Permisos', path: '/intranet/permisos', icon: <LockPersonIcon /> },
];

export default function IntranetSidebar() {
  return (
    <div>
        <Toolbar />
        <Divider />
        <List>
        {collections.map((item) => (
            <ListItem key={item.name} disablePadding>
                <ListItemButton component={Link} href={item.path}>
                    <ListItemIcon>
                        {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.name} />
                </ListItemButton>
            </ListItem>
        ))}
        </List>
        <Divider />
    </div>
  );
}