// src/app/page.tsx
import { Box, Stack, Typography, Divider } from '@mui/material';
import Link from 'next/link';

import CarruselPortada from '@/components/Carrusel/CarruselPortada';
import ListaPublicaciones from '@/components/Publicaciones/ListaPublicaciones';
import metadata from './metadata';

export { metadata };

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Box component="section" sx={{ px: { xs: 2, md: 0 }, py: 3 }}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography component="h2" variant="h5" fontWeight={700}>
          {title}
        </Typography>
        <Typography component={Link} href={href} color="primary" sx={{ textDecoration: 'none' }}>
          Ver todas →
        </Typography>
      </Stack>
      <Divider sx={{ mb: 2 }} />
      {children}
    </Box>
  );
}

export default function HomePage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'CETPRO San Martín de Porres',
    alternateName: 'CETPRO SMP',
    description:
      'Centro de Educación Técnico Productiva que forma técnicos emprendedores en computación, electricidad, confección, manualidades y más.',
    url: 'https://www.tusitioweb.edu.pe',
    logo: 'https://www.tusitioweb.edu.pe/logo.png',
    sameAs: ['https://www.facebook.com/cetprosmp'],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Av. Ejemplo 123',
      addressLocality: 'Los Olivos',
      addressRegion: 'Lima',
      postalCode: '15301',
      addressCountry: 'PE',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+51 1 2345678',
      contactType: 'administración',
      areaServed: 'PE',
      availableLanguage: ['Spanish'],
    },
  };

  return (
    <Box component="main" sx={{ pt: { md: '10px', xs: '0px' } }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Carrusel */}
      <Box component="section">
        <CarruselPortada />
      </Box>

      {/* Noticias: 3 más relevantes (destacados primero, luego fecha) */}
      <Section title="Noticias" href="/publicaciones/noticias">
        <ListaPublicaciones
          showFilters={false}
          tipo="noticia"
          limit={3}
          destacadosPrimero
          columnsMd={3} // 3 por fila en md
        />
      </Section>

      {/* Eventos: 4 más relevantes */}
      <Section title="Eventos" href="/publicaciones/eventos">
        <ListaPublicaciones
          showFilters={false}
          tipo="evento"
          limit={3}
          destacadosPrimero
          columnsMd={3} // 4 por fila en md
        />
      </Section>

      {/* Comunicados: 4 más relevantes */}
      <Section title="Comunicados" href="/publicaciones/comunicados">
        <ListaPublicaciones
          showFilters={false}
          tipo="comunicado"
          limit={3}
          destacadosPrimero
          columnsMd={3} // 4 por fila en md
        />
      </Section>
    </Box>
  );
}
