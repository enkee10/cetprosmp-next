import { Box, Grid, Typography } from '@mui/material';
import PublicacionesCard from '@/components/Publicaciones/PublicacionesCard';
import { getPublicaciones } from '@/lib/getPublicaciones';

export const metadata = {
  title: 'Comunicados | CETPRO San Martín de Porres',
  description: 'Comunicados del CETPRO San Martín de Porres.',
};

export default async function ComunicadosPage() {
  const publicaciones = (await getPublicaciones()).filter(p => p.tipo?.toLowerCase() === 'comunicado');

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Typography component="h1" variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
            Comunicados
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Información para la comunidad educativa.
          </Typography>
        </Grid>

        {publicaciones.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Typography>No hay comunicados disponibles.</Typography>
          </Grid>
        )}

        {publicaciones.map((pub) => (
          <Grid key={pub.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <PublicacionesCard publicacion={pub} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
