// src/app/loquesea/page.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Página en construcción',
  description: 'Esta página aún está en desarrollo.',
};

export default function PaginaVacia() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
        p: 2,
      }}
    >
      <Typography variant="h4" align="center">
        Página en construcción
      </Typography>
      <Image
        src="/imagenes/comunes/en-construccion.png"
        alt="En construcción"
        width={200}
        height={200}
        style={{ objectFit: 'contain' }}
      />
      
    </Box>
  );
}
