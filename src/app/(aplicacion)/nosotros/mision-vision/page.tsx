// src/app/(aplicacion)/nosotros/mision-vision/page.tsx
import { Box, Grid, Typography, Divider, Stack, Chip } from '@mui/material';
import Link from 'next/link';
import RichText from '@/components/RichText';
import { getPublicacionBySlug } from '@/lib/getPublicaciones';

// Evita 404 cacheado si aún no existe contenido (render dinámico)
export const dynamic = 'force-dynamic'; // alternativa: export const revalidate = 0;

const IMG_FALLBACK =
  process.env.NEXT_PUBLIC_DEFAULT_IMG_URL || '/imagenes/img-predeterminada.avif';

export async function generateMetadata() {
  const pub = await getPublicacionBySlug('mision-vision');
  const title = pub?.titulo ? `${pub.titulo} | Nosotros` : 'Misión / Visión | Nosotros';
  const description =
    pub?.descripcionCorta ||
    'Nuestra misión y visión institucional en el CETPRO San Martín de Porres.';
  return { title, description };
}

function SectionHeader({ title, chip }: { title: string; chip?: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
      <Typography component="h1" variant="h3" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      {chip && <Chip label={chip} size="small" />}
    </Stack>
  );
}

export default async function MisionVisionPage() {
  const pub = await getPublicacionBySlug('mision-vision');

  const mostrarImagen = !!(pub?.imagenPrincipal && String(pub.imagenPrincipal).trim() !== '');
  const imagen = mostrarImagen ? (pub!.imagenPrincipal as string) : IMG_FALLBACK;

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <Grid container spacing={3}>
        {/* Encabezado + intro */}
        <Grid size={{ xs: 12 }}>
          <SectionHeader title="Misión / Visión" chip={!pub ? 'No disponible' : undefined} />
          <Typography variant="body1" color="text.secondary">
            Conoce nuestra misión y visión institucional.
          </Typography>
          <Divider sx={{ mt: 2 }} />
        </Grid>

        {/* Cuerpo en dos columnas */}
        <Grid size={{ xs: 12 }}>
          <Grid container spacing={2}>
            {/* Columna izquierda: imagen (máx 320px) */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ width: '100%', maxWidth: 320 }}>
                <Box
                  component="img"
                  src={imagen}
                  alt={pub?.titulo || 'Misión / Visión'}
                  sx={{ width: '100%', objectFit: 'cover', borderRadius: 2, display: 'block' }}
                />
                {/* Galería opcional */}
                {Array.isArray(pub?.galeria) && pub!.galeria.length > 0 && (
                  <Box sx={{ mt: 2, display: 'grid', gap: 1 }}>
                    {pub!.galeria.map((url: string, i: number) => (
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

            {/* Columna derecha: contenido o mensaje de vacío */}
            <Grid size={{ xs: 12, md: 8 }}>
              {pub ? (
                Array.isArray(pub.contenido) && pub.contenido.length > 0 ? (
                  <RichText content={pub.contenido as any[]} />
                ) : pub.descripcionCorta ? (
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                    {pub.descripcionCorta}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No hay contenido disponible.
                  </Typography>
                )
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aún no hay contenido publicado para esta sección.
                </Typography>
              )}
            </Grid>
          </Grid>
        </Grid>

        {/* Volver a Nosotros */}
        <Grid size={{ xs: 12 }}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2">
            <Link href="/nosotros">← Volver a Nosotros</Link>
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}
