import { Box, Typography, Grid } from '@mui/material';
import ListaPublicaciones from '@/components/Publicaciones/ListaPublicaciones';

export const metadata = {
  title: 'Novedades | CETPRO San Martín de Porres',
  description: 'Noticias, eventos, comunicados y avisos del CETPRO San Martín de Porres.',
};

export default function PublicacionesPage() {
  return (
    <Box sx={{ width: '100%', py: 2, px: { xs: 2, sm: 3, md: 4 }}}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Typography component="h1" variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
            Novedades
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Explora todas las publicaciones y filtra por tipo o destacados.
          </Typography>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <ListaPublicaciones />
        </Grid>
      </Grid>
    </Box>
  );
}
