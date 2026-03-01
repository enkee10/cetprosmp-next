import { notFound } from 'next/navigation';
import { Box, Grid, Typography, Chip, Stack, Divider } from '@mui/material';
import Link from 'next/link';
import { getPublicacionBySlug, getPublicaciones, formatFecha } from '@/lib/getPublicaciones';
import RichText from '@/components/RichText';
import PublicacionesCard from '@/components/Publicaciones/PublicacionesCard';

type Params = { params: { slug: string } };

export async function generateStaticParams() {
  const all = await getPublicaciones();
  return all.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params) {
  const pub = await getPublicacionBySlug(params.slug);
  if (!pub) return { title: 'Publicación no encontrada' };
  const desc = pub.descripcionCorta || '';
  return {
    title: `${pub.titulo} | Publicaciones`,
    description: desc,
  };
}

function formatFechaHora(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(d);
}

export default async function PublicacionDetallePage({ params }: Params) {
  const pub = await getPublicacionBySlug(params.slug);
  if (!pub) return notFound();

  const tipo = (pub.tipo || '').toLowerCase();
  const esNoticia = tipo === 'noticia';
  const esEvento = tipo === 'evento';
  const esComunicado = tipo === 'comunicado';

  const mostrarImagen = !!(pub.imagenPrincipal && pub.imagenPrincipal.trim() !== '');
  const imgFallback = process.env.NEXT_PUBLIC_DEFAULT_IMG_URL || '/imagenes/img-predeterminada.avif';
  const imagen = mostrarImagen ? (pub.imagenPrincipal as string) : imgFallback;

  // Relacionadas (vea también): destacadas del mismo tipo, excluyendo la actual
  const todas = await getPublicaciones();
  const relacionadas = todas
    .filter(p => p.tipo?.toLowerCase() === tipo && p.slug !== pub.slug && p.destacado)
    .slice(0, 3);

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <Grid container spacing={2}>
        {/* Encabezado */}
        <Grid size={{ xs: 12 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
            <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
              {pub.titulo}
            </Typography>
            {pub.destacado && <Chip label="Destacado" color="primary" size="small" />}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ color: 'text.secondary', mb: 1, flexWrap: 'wrap' }}>
            <Chip variant="outlined" label={pub.tipo?.toUpperCase() || 'PUBLICACIÓN'} size="small" />
            {esNoticia && pub.fechaPublicacion && (
              <Typography variant="body2">Publicado: {formatFecha(pub.fechaPublicacion)}</Typography>
            )}
            {esComunicado && pub.fechaPublicacion && (
              <Typography variant="body2">Publicado: {formatFecha(pub.fechaPublicacion)}</Typography>
            )}
            {esEvento && (
              <>
                {pub.fechaEventoInicio && (
                  <Typography variant="body2">Inicio: {formatFechaHora(pub.fechaEventoInicio)}</Typography>
                )}
                {pub.fechaEventoFin && (
                  <Typography variant="body2">Fin: {formatFechaHora(pub.fechaEventoFin)}</Typography>
                )}
                {pub.ubicacion && <Typography variant="body2">• {pub.ubicacion}</Typography>}
              </>
            )}
          </Stack>

          <Divider sx={{ mb: 2 }} />
        </Grid>

        {/* Cuerpo en dos columnas */}
        <Grid size={{ xs: 12 }}>
          <Grid container spacing={2}>
            {/* Columna izquierda: imágenes (máx 300px) */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 300,
                }}
              >
                {/* Imagen principal */}
                <Box
                  component="img"
                  src={imagen}
                  alt={pub.titulo}
                  sx={{
                    width: '100%',
                    objectFit: 'cover',
                    borderRadius: 2,
                    display: 'block',
                  }}
                />

                {/* Galería (si hay) */}
                {pub.galeria && pub.galeria.length > 0 && (
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

            {/* Columna derecha: contenido + campos según tipo */}
            <Grid size={{ xs: 12, md: 8 }}>
              {/* contenido1 (blocks) con RichText */}
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

              {/* Campos extra según tipo (además de lo ya mostrado en el header, por si quieres repetir o ampliar) */}
              {esEvento && (
                <Box sx={{ mt: 2 }}>
                  {pub.fechaEventoInicio && (
                    <Typography variant="body2">
                      <strong>Fecha y hora de inicio:</strong> {formatFechaHora(pub.fechaEventoInicio)}
                    </Typography>
                  )}
                  {pub.fechaEventoFin && (
                    <Typography variant="body2">
                      <strong>Fecha y hora de fin:</strong> {formatFechaHora(pub.fechaEventoFin)}
                    </Typography>
                  )}
                  {pub.ubicacion && (
                    <Typography variant="body2">
                      <strong>Ubicación:</strong> {pub.ubicacion}
                    </Typography>
                  )}
                </Box>
              )}
            </Grid>
          </Grid>
        </Grid>

        {/* Vea también */}
        {(relacionadas?.length ?? 0) > 0 && (
          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Vea también
            </Typography>

            {/* Grilla de 3 columnas, min 250px, gap 10px */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(auto-fit, minmax(250px, 1fr))',
                  md: 'repeat(3, 1fr)',
                },
                gap: '10px',
              }}
            >
              {relacionadas.map((p) => (
                <Box key={p.id} sx={{ minWidth: 250 }}>
                  <PublicacionesCard publicacion={p} />
                </Box>
              ))}
            </Box>
          </Grid>
        )}

        {/* Volver */}
        <Grid size={{ xs: 12 }}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2">
            <Link href="/publicaciones">← Volver a publicaciones</Link>
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}
