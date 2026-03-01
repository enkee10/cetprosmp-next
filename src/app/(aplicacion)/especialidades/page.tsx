// src/app/(aplicacion)/especialidades/page.tsx
import { getEspecialidades } from '@/lib/getEspecialidades';
import ListaEspecialidades from '@/components/Especialidad/ListaEspecialidades';
import { Container, Typography, Box } from '@mui/material';
import { metadata } from './metadata';
import type { Especialidad } from '@/types/especialidades';

export { metadata };

export default async function EspecialidadesPage() {
  const especialidades: Especialidad[] = await getEspecialidades();

  // Ordenar por ID ascendente sin mutar el original
  const especialidadesOrdenadas = [...especialidades].sort((a, b) => a.id - b.id);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Especialidades Técnicas en CETPRO San Martín de Porres',
    description:
      'Lista de especialidades técnicas ofrecidas por el CETPRO SMP, incluyendo computación, electricidad, confección, y más.',
    url: 'https://www.tusitioweb.edu.pe/especialidades',
    numberOfItems: especialidadesOrdenadas.length,
    itemListElement: especialidadesOrdenadas.map((especialidad, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Course',
        name: especialidad.tituloComercial || especialidad.titulo,
        description:
          especialidad.descripcion2?.[0]?.children?.[0]?.text ||
          'Especialidad técnica en CETPRO SMP',
        url: `https://www.tusitioweb.edu.pe/especialidades/${especialidad.id}`,
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
          Nuestras Carreras
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Estas son nuestras Carreras técnicas. Explora cada una para conocer sus módulos, duración y oportunidades.
        </Typography>

        <Box >
          <ListaEspecialidades especialidades={especialidadesOrdenadas} />
        </Box>
      </Container>
    </main>
  );
}
