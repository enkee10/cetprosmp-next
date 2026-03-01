// src/app/(aplicacion)/modulos/page.tsx
import { getModulos } from '@/lib/getModulos';
import ListaModuloes from '@/components/Modulos/ListaModulos';
import { Container, Typography, Box } from '@mui/material';
import { metadata } from './metadata';
import type { Modulo } from '@/types/modulos';

export { metadata };

export default async function ModuloesPage() {
  const modulos: Modulo[] = await getModulos();

  // Ordenar por ID ascendente sin mutar el original
  const modulosOrdenadas = [...modulos].sort((a, b) => a.id - b.id);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Moduloes Técnicas en CETPRO San Martín de Porres',
    description:
      'Lista de modulos técnicas ofrecidas por el CETPRO SMP, incluyendo computación, electricidad, confección, y más.',
    url: 'https://www.tusitioweb.edu.pe/modulos',
    numberOfItems: modulosOrdenadas.length,
    itemListElement: modulosOrdenadas.map((modulo, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Course',
        name: modulo.tituloComercial || modulo.titulo,
        description:
          modulo.descripcion2?.[0]?.children?.[0]?.text ||
          'Modulo técnica en CETPRO SMP',
        url: `https://www.tusitioweb.edu.pe/modulos/${modulo.id}`,
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
          Nuestras Moduloes
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Estas son nuestras modulos técnicas. Explora cada una para conocer sus módulos, duración y oportunidades.
        </Typography>

        <Box >
          <ListaModuloes modulos={modulosOrdenadas} />
        </Box>
      </Container>
    </main>
  );
}
