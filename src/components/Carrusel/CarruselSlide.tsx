'use client';

import { Box, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { Especialidad } from './CarruselPortada';
import CarrerasBlock from './CarrerasBlock';
import ModularesBlock from './ModularesBlock';
import PortadaImagen from './PortadaImagen';
import EspecialidadTitulo from './EspecialidadTitulo';

const fondoDefault = process.env.NEXT_PUBLIC_DEFAULT_BACKGROUND_URL;

export default function CarruselSlide({ especialidad }: { especialidad: Especialidad }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Cálculo original para modulares sueltos (lo conservo)
  const carrerasConCodigo = especialidad.carreras.filter((c) => !!c.codigo);
  const todosLosModulos = especialidad.carreras.flatMap((c) => c.modulos || []);
  const modulosDeCarrerasConCodigo = carrerasConCodigo.flatMap((c) => c.modulos || []);
  const modularesSueltos = todosLosModulos.filter(
    (m) => !modulosDeCarrerasConCodigo.some((c) => c.id === m.id)
  );

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: isMobile ? 'calc(100vh - 48px)' : 500,
        aspectRatio: isMobile ? 'auto' : '2.4',
        backgroundImage: `url(${especialidad.fondo || fondoDefault || ''})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        p: { xs: 2, md: 4 },

        // Estructura base para alojar la imagen de portada debajo del overlay
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
        alignItems: 'center',
        gap: 2,
      }}
    >
      {/* OVERLAY de texto: siempre encima de la imagen */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'auto',
          display: 'flex',
          // < md: pegado arriba; md+: centrado vertical
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'flex-start',
          p: { xs: 2, md: 4 },
        }}
      >
        <Box
          sx={{
            width: { xs: '100%', md: '50%' },
            maxWidth: 600,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          {/* Título con enlace y sombra blanca (el componente ya la trae) */}
          <EspecialidadTitulo
            titulo={especialidad.tituloComercial}
            slug={especialidad.slug}
          />

          {/* Carreras + Modulares (con enlaces) */}
          <CarrerasBlock carreras={especialidad.carreras} />
          {modularesSueltos.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              <ModularesBlock modulares={modularesSueltos} />
            </Box>
          )}
        </Box>
      </Box>

      {/* Imagen de portada: queda debajo del overlay */}
      <PortadaImagen portada={especialidad.portada} />
    </Box>
  );
}
