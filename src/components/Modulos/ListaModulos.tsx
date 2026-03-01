'use client';

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import ModuloCard from './ModuloCard';
import type { Modulo } from '@/types/modulos';

interface Props {
  modulos: Modulo[];
}

const ListaModulos: React.FC<Props> = ({ modulos }) => {
  if (modulos.length === 0) {
    return (
      <Typography variant="body1">
        No hay módulos disponibles.
      </Typography>
    );
  }

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      {modulos.map((mod) => (
        <Box key={mod.id} sx={{ width: '100%' }}>
          <ModuloCard {...mod} />
        </Box>
      ))}
    </Stack>
  );
};

export default ListaModulos;
