'use client';

import { Box, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import BotonInscripcion from '@/components/Generales/BotonInscripcion';
import PortadaImagen from './PortadaImagen';

export default function CarruselBienvenidaSlide() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const fondoDefault = process.env.NEXT_PUBLIC_DEFAULT_BACKGROUND_URL;
  const portadaDefault = process.env.NEXT_PUBLIC_DEFAULT_IMG_URL!;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: isMobile ? 'calc(100vh - 48px)' : 500,
        aspectRatio: isMobile ? 'auto' : '2.4',
        backgroundImage: `url(${fondoDefault})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        // < md: columna como estaba; md+: grid 2 columnas 50/50
        display: { xs: 'flex', md: 'grid' },
        flexDirection: { xs: 'column', md: 'unset' },
        gridTemplateColumns: { md: '1fr 1fr' },
        alignItems: { xs: 'center', md: 'stretch' },
        justifyContent: { xs: 'space-between', md: 'unset' },
        p: { xs: 2, md: 4 },
        gap: { md: 2 },
      }}
    >
      {/* Columna izquierda (md+): texto y botón CENTRADOS */}
      <Box
        sx={{
          height: '100%',
          color: 'black',
          textShadow: '0 0 8px rgba(255,255,255,0.95), 0 0 16px rgba(255,255,255,0.85)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: { xs: 'center', md: 'center' }, // 👈 centrado
          textAlign: 'center',                           // 👈 centrado
          gap: 2,
          maxHeight: { xs: '60%', md: 'none' },
        }}
      >
        <Typography
          component="h2"
          fontWeight="bold"
          sx={{
            fontSize: 'clamp(1.8rem, 4vw + 0.2rem, 2.3rem)',
            lineHeight: 1.1,
          }}
        >
          Bienvenido al CETPRO de<br />"SAN MARTIN DE PORRES"
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: '1rem', md: '1.125rem' },
            fontWeight: 500,
          }}
        >
          Formando Técnicos Emprendedores
        </Typography>

        <BotonInscripcion />
      </Box>

      {/* Columna derecha (md+): IMAGEN CENTRADA H/V */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',   // 👈 centrado vertical
          justifyContent: 'center', // 👈 centrado horizontal
          mt: { xs: 2, md: 0 },
        }}
      >
        <PortadaImagen
          portada={portadaDefault}
          // sx={{
          //   width: { xs: '80%', md: '100%' },
          //   maxWidth: { xs: 400, md: '50%' },
          //   //maxHeight: { xs: '57vh', md: '85%' },
          // }}
        />
      </Box>
    </Box>
  );
}
