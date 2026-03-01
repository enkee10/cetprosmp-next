// src/app/(aplicacion)/carreras/page.tsx
import { getCarreras } from '@/lib/getCarreras';
import ListaCarreraes from '@/components/Carreras/ListaCarreras';
import { Container, Typography, Box } from '@mui/material';
import { metadata } from './metadata';
import type { Carrera } from '@/types/carreras';

export { metadata };

export default async function CarreraesPage() {
  const carreras: Carrera[] = await getCarreras();

  // Ordenar por ID ascendente sin mutar el original
  const carrerasOrdenadas = [...carreras].sort((a, b) => a.id - b.id);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Carreraes Técnicas en CETPRO San Martín de Porres',
    description:
      'Lista de carreras técnicas ofrecidas por el CETPRO SMP, incluyendo computación, electricidad, confección, y más.',
    url: 'https://www.tusitioweb.edu.pe/carreras',
    numberOfItems: carrerasOrdenadas.length,
    itemListElement: carrerasOrdenadas.map((carrera, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Course',
        name: carrera.tituloComercial || carrera.titulo,
        description:
          carrera.descripcion2?.[0]?.children?.[0]?.text ||
          'Carrera técnica en CETPRO SMP',
        url: `https://www.tusitioweb.edu.pe/carreras/${carrera.id}`,
      },
    })),
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Container sx={{ mt: 4, mb: 6, }}>
        <Typography
          variant="h1"
          component="h1"
          gutterBottom
          sx={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 'bold',
            pt: 5,
            pb: 1,
            textAlign: 'center',
          }}
        >
          Nuestras Carreraes
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Estas son nuestras carreras técnicas. Explora cada una para conocer sus módulos, duración y oportunidades.
        </Typography>

        <Box >
          <ListaCarreraes carreras={carrerasOrdenadas} />
        </Box>
      </Container>
    </main>
  );
}
