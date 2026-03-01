// src/app/nosotros/page.tsx
import { notFound } from 'next/navigation';
import { Box, Grid, Typography, Divider, Stack, Chip } from '@mui/material';
import RichText from '@/components/RichText';
import ListaPersonal from '@/components/Personal/ListaPersonal';
import { getPublicacionBySlug } from '@/lib/getPublicaciones';

// Opcional: revalidación para SSG incremental (1 hora)
export const revalidate = 3600;

const IMG_FALLBACK = process.env.NEXT_PUBLIC_DEFAULT_IMG_URL || '/imagenes/img-predeterminada.avif';

export async function generateMetadata() {
  // Intentamos traer títulos/descripciones para la metadata
  const [presentacion, misionVision] = await Promise.all([
    getPublicacionBySlug('presentacion'),
    getPublicacionBySlug('mision-vision'),
  ]);

  const title = 'Nosotros | CETPRO San Martín de Porres';
  const desc =
    presentacion?.descripcionCorta ||
    misionVision?.descripcionCorta ||
    'Conoce nuestra presentación institucional, misión y visión, y a nuestro equipo.';

  return {
    title,
    description: desc,
  };
}

function SectionHeader({ title, chip }: { title: string; chip?: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
      <Typography component="h2" variant="h4" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {chip && <Chip label={chip} size="small" />}
    </Stack>
  );
}

function PublicacionBlock({
  tituloSeccion,
  pub,
}: {
  tituloSeccion: string;
  pub: any | null;
}) {
  // Si no hay publicación, mostramos un mensaje suave (no rompemos la página)
  if (!pub) {
    return (
      <Box sx={{ width: '100%', py: 2 }}>
        <SectionHeader title={tituloSeccion} chip="No disponible" />
        <Typography variant="body2" color="text.secondary">
          Aún no hay contenido publicado para esta sección.
        </Typography>
      </Box>
    );
  }

  const mostrarImagen = !!(pub.imagenPrincipal && String(pub.imagenPrincipal).trim() !== '');
  const imagen = mostrarImagen ? (pub.imagenPrincipal as string) : IMG_FALLBACK;

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <SectionHeader title={tituloSeccion} />
      <Grid container spacing={2}>
        {/* Columna izquierda: imagen (máx 320px) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box
            sx={{
              width: '100%',
              maxWidth: 320,
            }}
          >
            <Box
              component="img"
              src={imagen}
              alt={pub.titulo || tituloSeccion}
              sx={{
                width: '100%',
                objectFit: 'cover',
                borderRadius: 2,
                display: 'block',
              }}
            />
            {/* Galería opcional */}
            {Array.isArray(pub.galeria) && pub.galeria.length > 0 && (
              <Box sx={{ mt: 2, display: 'grid', gap: 1 }}>
                {pub.galeria.map((url: string, i: number) => (
                  <Box
                    key={i}
                    component="img"
                    src={url}
                    alt={`Imagen ${i + 1}`}
                    sx={{
                      width: '100%',
                      objectFit: 'cover',
                      borderRadius: 2,
                      display: 'block',
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Grid>

        {/* Columna derecha: contenido */}
        <Grid size={{ xs: 12, md: 8 }}>
          {Array.isArray(pub.contenido) && pub.contenido.length > 0 ? (
            <RichText content={pub.contenido as any[]} />
          ) : pub.descripcionCorta ? (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {pub.descripcionCorta}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No hay contenido disponible.
            </Typography>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default async function NosotrosPage() {
  // Cargamos ambas publicaciones en paralelo
  const [presentacion, misionVision] = await Promise.all([
    getPublicacionBySlug('presentacion'),
    getPublicacionBySlug('mision-vision'),
  ]);

  // Si ambas faltan, no tiene sentido la página
  if (!presentacion && !misionVision) {
    return notFound();
  }

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <Grid container spacing={3}>
        {/* Encabezado general */}
        <Grid size={{ xs: 12 }}>
          <Typography component="h1" variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
            Nosotros
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Conoce nuestra presentación institucional, misión y visión, y a nuestro equipo.
          </Typography>
          <Divider sx={{ mt: 2 }} />
        </Grid>

        {/* Sección: Presentación */}
        <Grid size={{ xs: 12 }}>
          <PublicacionBlock tituloSeccion="Presentación" pub={presentacion} />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Divider sx={{ my: 2 }} />
        </Grid>

        {/* Sección: Misión / Visión */}
        <Grid size={{ xs: 12 }}>
          <PublicacionBlock tituloSeccion="Misión / Visión" pub={misionVision} />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Divider sx={{ my: 2 }} />
        </Grid>

        {/* Sección: Nosotros (ListaPersonal) */}
        <Grid size={{ xs: 12 }}>
          <SectionHeader title="Nosotros" />
          {/* 
            Asumimos que ListaPersonal no requiere props,
            o bien puedes pasar props si tu implementación lo necesita.
          */}
          <ListaPersonal />
        </Grid>
      </Grid>
    </Box>
  );
}
