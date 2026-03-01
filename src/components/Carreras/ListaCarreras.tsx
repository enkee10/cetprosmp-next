'use client';

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import CarreraCard from './CarreraCard';
import type { Carrera } from '@/types/carreras';

interface Props {
  carreras: Carrera[];
}

const ListaCarreras: React.FC<Props> = ({ carreras }) => {
  if (carreras.length === 0) {
    return (
      <Typography variant="body1">
        No hay carreras disponibles.
      </Typography>
    );
  }

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      {carreras.map((car) => (
        <Box key={car.id} sx={{ width: '100%' }}>
          <CarreraCard {...car} />
        </Box>
      ))}
    </Stack>
  );
};

export default ListaCarreras;
