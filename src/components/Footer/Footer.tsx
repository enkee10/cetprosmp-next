'use client';

import { Box, Container, Grid, Typography, Link as MuiLink } from '@mui/material';
import Image from 'next/image';
import { useUser } from '@/context/UserContext';
import datoGeneral from '@/../public/data/dato-general.json';
import MapaInteractivo from '@/components/Footer/MapaInteractivo';
import WhatsappFlotante from '@/components/Footer/WhatsappFlotante'; // ✅ Importado

const redesSociales = [
  { nombre: 'tiktok', url: datoGeneral.tiktok, icono: '/imagenes/redes_sociales/tiktok.png' },
  { nombre: 'facebook', url: datoGeneral.facebook, icono: '/imagenes/redes_sociales/facebook.png' },
  { nombre: 'x', url: datoGeneral.twitter, icono: '/imagenes/redes_sociales/x.png' },
  { nombre: 'instagram', url: datoGeneral.instagram, icono: '/imagenes/redes_sociales/instagram.png' },
  { nombre: 'youtube', url: datoGeneral.youtube, icono: '/imagenes/redes_sociales/youtube.png' },
];

const Footer = () => {
  const { user } = useUser();

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: '#1976d2',
        color: 'white',
        py: 4,
        mt: 8,
        minHeight: 425,
        width: '100%',
        position: 'relative', // ✅ Necesario para posicionar contenido flotante
      }}
    >
      <Container sx={{ maxWidth: '1000px' }}>
        <Grid
          container
          spacing={4}
          justifyContent="center"
          sx={{
            textAlign: {
              xs: 'center',
              md: 'left',
            },
            alignItems: {
              xs: 'center',
              md: 'flex-start',
            },
          }}
        >
          {/* Columna izquierda */}
          <Grid
            size={{
              xs: 12,
              md: 6,
              lg: 5,
            }}
          >
            <Typography sx={{ fontWeight: 'bold' }}>DIRECCIÓN:</Typography>
            <Typography>{datoGeneral.direccion}</Typography>

            <Box mt={2}>
              <Typography sx={{ fontWeight: 'bold' }}>Teléfono 1:</Typography>
              <Box display="flex" justifyContent={{ xs: 'center', md: 'flex-start' }} alignItems="center">
                <Typography>{datoGeneral.telefono1}</Typography>
                <Image
                  src="/imagenes/redes_sociales/whatsapp.png"
                  alt="WhatsApp"
                  width={30}
                  height={30}
                  style={{ marginLeft: 8 }}
                />
              </Box>
            </Box>

            <Box mt={2}>
              <Typography sx={{ fontWeight: 'bold' }}>Teléfono 2:</Typography>
              <Box display="flex" justifyContent={{ xs: 'center', md: 'flex-start' }} alignItems="center">
                <Typography>{datoGeneral.telefono2}</Typography>
                <Image
                  src="/imagenes/redes_sociales/whatsapp.png"
                  alt="WhatsApp"
                  width={30}
                  height={30}
                  style={{ marginLeft: 8 }}
                />
              </Box>
            </Box>

            <Box mt={2}>
              <Typography sx={{ fontWeight: 'bold' }}>Correo:</Typography>
              <Typography>{datoGeneral.correo}</Typography>
            </Box>

            {!!user && (
              <Box mt={3} display="flex" justifyContent="center">
                <Image
                  src="/imagenes/institucionales/libro_de_reclamaciones.jpg"
                  alt="Libro de Reclamaciones"
                  width={300}
                  height={150}
                  style={{ objectFit: 'contain' }}
                />
              </Box>
            )}
          </Grid>

          {/* Columna derecha: Mapa y redes */}
          <Grid
            size={{
              xs: 12,
              md: 6,
              lg: 7,
            }}
          >
            <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Mapa:</Typography>
            <Box
              sx={{
                width: '100%',
                height: 300,
                borderRadius: 2,
                overflow: 'hidden',
                border: '2px solid white',
              }}
            >
              <MapaInteractivo lat={-12.0196455} lng={-77.0603823} />
            </Box>

            <Box mt={3}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Visítanos en:
              </Typography>
              <Box display="flex" justifyContent={{ xs: 'center', md: 'flex-start' }} gap={2} flexWrap="wrap">
                {redesSociales.map((red) => (
                  <MuiLink
                    key={red.nombre}
                    href={red.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      src={red.icono}
                      alt={red.nombre}
                      width={40}
                      height={40}
                      style={{ borderRadius: 8 }}
                    />
                  </MuiLink>
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Pie legal centrado */}
        <Box mt={4}>
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            © 2025 {datoGeneral.nombreInstitucion}
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            TODOS LOS DERECHOS RESERVADOS.
          </Typography>
        </Box>
      </Container>

      {/* ✅ Botón flotante de WhatsApp en la esquina inferior derecha del footer */}
      <Box sx={{ position: 'absolute', bottom: 20, right: 20 }}>
        <WhatsappFlotante />
      </Box>
    </Box>
  );
};

export default Footer;
