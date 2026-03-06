'use client'
import React from 'react';
import Link from 'next/link';
import { List, ListItem, ListItemButton, ListItemText, Toolbar } from '@mui/material';

const collections = [
  'act_economicas',
  'calendarios',
  'carreras',
  'dato_general',
  'especialidades',
  'familias',
  'grupos',
  'matriculas',
  'modulos',
  'paquetes',
  'personales',
  'publicaciones',
  'sectores',
  'semestres',
  'users',
];

export default function IntranetSidebar() {
  return (
    <div>
        <Toolbar />
        <List>
        {collections.map((collection) => (
            <ListItem key={collection} disablePadding>
                <ListItemButton component={Link} href={`/intranet/${collection}`}>
                    <ListItemText primary={collection.charAt(0).toUpperCase() + collection.slice(1)} />
                </ListItemButton>
            </ListItem>
        ))}
        </List>
    </div>
  );
}
