'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Link from 'next/link';
import type { Carrera } from '@/types/carreras';

const CarreraCard: React.FC<Carrera> = ({
  id,
  slug,
  titulo,
  tituloComercial,
  codigo,
  duracion,
  descripcion2 = [],
  imagen,
}) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('lg'));

  const textoPorDefecto =
    'Carrera técnica orientada a formar profesionales competentes, con sólidos conocimientos y habilidades para el mercado laboral actual.';

  // Extraer el primer párrafo del bloque (si existe)
  const parrafo = descripcion2.find(
    (b) => b.type === 'paragraph' && Array.isArray(b.children)
  );

  const textoOriginal =
    parrafo?.children?.[0]?.text?.trim() || textoPorDefecto;

  const palabrasVisibles = isMdUp ? 30 : 20;
  const palabras = textoOriginal.split(/\s+/);
  const hayMasTexto = palabras.length > palabrasVisibles;
  const resumen = palabras.slice(0, palabrasVisibles).join(' ');

  const imagenFinal =
    typeof imagen === 'string' && imagen.trim() !== ''
      ? imagen
      : process.env.NEXT_PUBLIC_DEFAULT_IMG_URL;

  return (
    <Card
      component="article"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        boxSizing: 'border-box',
        alignItems: 'stretch',
        width: 'auto',
        mb: 3,
        mx: { xs: 1, sm: 2 },
        boxShadow: 4,
        borderRadius: 3,
      }}
    >
      <Box
        sx={{
          width: { xs: '100%', sm: '50%' },
          maxWidth: { xs: '100%', sm: '300px' },
          overflow: 'hidden',
        }}
      >
        <CardMedia
          component="img"
          image={imagenFinal}
          alt={`Imagen de la carrera ${tituloComercial}`}
          sx={{
            width: '100%',
            height: '100%',
            aspectRatio: '16/9',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </Box>

      <CardContent
        component="section"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            variant="h2"
            component="h3"
            sx={{
              fontSize: '1.3rem',
              color: 'text.secondary',
              fontWeight: 'bold',
              mb: 1,
            }}
          >
            {tituloComercial}
          </Typography>

          <Typography
            component="p"
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            {resumen}
            {hayMasTexto && '...'}
          </Typography>
        </Box>

        <Box textAlign="right">
          <Link href={`/carreras/${slug}`}>
            <Button variant="outlined" size="small">
              Ver más
            </Button>
          </Link>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CarreraCard;
