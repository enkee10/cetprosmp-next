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
import type { Modulo } from '@/types/modulos';

const ModuloCard: React.FC<Modulo> = ({
  id,
  slug,
  titulo,
  tituloComercial,
  orden,
  horas,
  creditos,
  metas,
  descripcion2 = [],
  imagen,
}) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('lg'));

  const textoPorDefecto =
    'Módulo formativo técnico orientado al desarrollo de competencias prácticas esenciales en su área de formación profesional.';

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
          alt={`Imagen del módulo ${tituloComercial}`}
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
          <Link href={`/modulos/${slug}`}>
            <Button variant="outlined" size="small">
              Ver más
            </Button>
          </Link>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ModuloCard;
