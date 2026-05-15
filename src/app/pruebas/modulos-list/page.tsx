import { Box, Container, Typography } from '@mui/material';
import ModulosListClient from './ModulosListClient';

export const metadata = {
  title: 'Lista de módulos | Pruebas',
};

export default function ModulosListPage() {
  return (
    <Container sx={{ py: 5 }}>
      <Box sx={{ mb: 3 }}>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
          Títulos de módulos
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Datos cargados desde Firebase Data Connect.
        </Typography>
      </Box>

      <ModulosListClient />
    </Container>
  );
}
