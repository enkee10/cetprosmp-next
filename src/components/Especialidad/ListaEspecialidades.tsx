'use client';

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import EspecialidadCard from './EspecialidadCard';
import type { Especialidad } from '@/types/especialidades'; // asegúrate del nombre del archivo

interface Props {
  especialidades: Especialidad[];
}

const ListaEspecialidades: React.FC<Props> = ({ especialidades }) => {
  if (especialidades.length === 0) {
    return (
      <Typography variant="body1">
        No hay especialidades disponibles.
      </Typography>
    );
  }

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      {especialidades.map((esp) => (
        <Box key={esp.id} sx={{ width: '100%' }}>
          <EspecialidadCard {...esp} />
        </Box>
      ))}
    </Stack>
  );
};

export default ListaEspecialidades;
