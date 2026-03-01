'use client';

import { Box, Typography } from '@mui/material';

export default function InscripcionPage() {
  return (
    <Box
      sx={{
        height: '100vh',
        bgcolor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
      }}
    >
      <Typography variant="h3">Página de Inscripción</Typography>
    </Box>
  );
}
