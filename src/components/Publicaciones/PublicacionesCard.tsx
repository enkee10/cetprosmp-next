'use client';

import React from 'react';
import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Button,
} from '@mui/material';
import Link from 'next/link';

export type Publicacion = {
  id: number;
  titulo: string;
  slug: string;
  tipo: 'noticia' | 'evento' | 'comunicado' | string;
  descripcionCorta?: string;
  contenido?: string; // fallback si no hay descripcionCorta
  fechaPublicacion?: string;
  destacado?: boolean;
  imagenPrincipal?: string | null;
};

type Props = { publicacion: Publicacion };

const clipWords = (str: string, max: number) => {
  const words = str.trim().split(/\s+/);
  const clipped = words.slice(0, max).join(' ');
  return words.length > max ? `${clipped}...` : clipped;
};

const LOREM_15 =
  'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore.';

const PublicacionesCard: React.FC<Props> = ({ publicacion }) => {
  const {
    titulo,
    slug,
    descripcionCorta = '',
    contenido = '',
    imagenPrincipal,
  } = publicacion;

  const imgFallback =
    process.env.NEXT_PUBLIC_DEFAULT_IMG_URL || '/imagenes/img-predeterminada.avif';
  const imagen =
    imagenPrincipal && imagenPrincipal.trim() !== '' ? imagenPrincipal : imgFallback;

  // Descripción: descripcionCorta (máx 15) → contenido (máx 15) → lorem (15)
  const baseDesc = descripcionCorta.trim() || contenido.trim() || LOREM_15;
  const resumen = clipWords(baseDesc, 15);

  return (
    <Card
      component="article"
      elevation={4}
      sx={{
        // sin ancho fijo; que se adapte a la columna del grid
        height: '100%',
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <CardActionArea component={Link} href={`/publicaciones/${slug}`} sx={{ display: 'block' }}>
        <CardMedia
          component="img"
          image={imagen}
          alt={titulo}
          loading="lazy"
          sx={{
            width: '100%',
            aspectRatio: '16 / 9', // imagen responsive, misma relación en todas las columnas
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </CardActionArea>

      <CardContent
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: 1.5,
          gap: 0.75,
        }}
      >
        <Typography
          component="h3"
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            lineHeight: 1.2,          // 👈 interlineado compacto para varias líneas
            wordBreak: 'break-word',
            whiteSpace: 'normal',
          }}
          title={titulo}
        >
          {titulo}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {resumen}
        </Typography>

        <Box sx={{ mt: 'auto', textAlign: 'right' }}>
          <Button component={Link} href={`/publicaciones/${slug}`} size="small" variant="outlined">
            Ver más
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PublicacionesCard;
