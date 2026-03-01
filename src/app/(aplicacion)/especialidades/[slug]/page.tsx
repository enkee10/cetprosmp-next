import { generarJsonLd } from '@/lib/generarJsonLd';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Box, Container, Typography } from '@mui/material';
import { getEspecialidades } from '@/lib/getEspecialidades';
import type { Especialidad } from '@/types/especialidades';
import Image from 'next/image';
import RichText from '@/components/RichText';
import ListaCarreras from '@/components/Carreras/ListaCarreras';
import ListaModulos from '@/components/Modulos/ListaModulos';

// Fallback: 4 párrafos de 100 palabras
const generarLorem = () => {
  const lorem =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vitae sem nec ligula malesuada tincidunt. Vivamus in nisi eu lorem luctus finibus. Donec bibendum, magna vel imperdiet pharetra, leo libero sagittis justo, at aliquam arcu erat nec erat. ';
  return [...Array(4)].map((_, i) => (
    <Typography component="p" key={i} paragraph>
      {lorem.repeat(3).trim()}
    </Typography>
  ));
};

export async function generateStaticParams() {
  const especialidades: Especialidad[] = await getEspecialidades();
  return especialidades.map((esp) => ({
    slug: esp.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const especialidades: Especialidad[] = await getEspecialidades();
  const especialidad = especialidades.find((e) => e.slug === slug);

  if (!especialidad) return {};

  return {
    title: `${especialidad.tituloComercial} | CETPRO SMP`,
    description: `Conoce la especialidad de ${especialidad.tituloComercial} en el CETPRO San Martín de Porres.`,
  };
}

export default async function EspecialidadDetallePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const especialidades: Especialidad[] = await getEspecialidades();
  const especialidad = especialidades.find((e) => e.slug === slug);

  if (!especialidad) notFound();

  const { tituloComercial, descripcion2, imagenes } = especialidad;

  const tieneDescripcion = descripcion2?.some((b: any) => b.type === 'paragraph');

  // ✅ Mejora: filtra valores nulos y genera URLs válidas
  const imagenesFinales: string[] =
    imagenes?.filter(Boolean).map((img: any) =>
      typeof img === 'string'
        ? img.trim() || process.env.NEXT_PUBLIC_DEFAULT_IMG_URL
        : img?.url?.trim() || process.env.NEXT_PUBLIC_DEFAULT_IMG_URL
    ) ?? [];

  if (imagenesFinales.length === 0) {
    imagenesFinales.push(
      process.env.NEXT_PUBLIC_DEFAULT_IMG_URL!,
      process.env.NEXT_PUBLIC_DEFAULT_IMG_URL!
    );
  }

//prueba
console.log({
  NEXT_PUBLIC_IMG_PREDETERMINADA: process.env.NEXT_PUBLIC_DEFAULT_IMG_URL,
  rutaCompleta: `${process.env.NEXT_PUBLIC_DEFAULT_IMG_URL}`,
});
//fin


  const carrerasConCodigo = (especialidad.carreras ?? []).filter((c) => c.codigo?.trim());
  const modulosSinCodigo = (especialidad.carreras ?? [])
    .filter((c) => !c.codigo?.trim())
    .flatMap((c) => c.modulos ?? []);

  return (
    <main>
      <Container sx={{ pt: 5, mb: 6 }}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 'bold', textAlign: 'center', fontSize: 'clamp(2rem, 5vw, 3rem)' }}
        >
          {tituloComercial}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 4,
            alignItems: 'flex-start',
            mt: 4,
          }}
        >
          <Box
            sx={{
              order: { xs: 2, md: 1 },
              flexBasis: { md: '40%' },
              maxWidth: { xs: 450, md: 400 },
              width: '100%',
              mx: 'auto',
            }}
          >
            {imagenesFinales.map((url, i) => (
              <Box
                key={i}
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: { xs: '16 / 9', md: '4 / 3' },
                  mb: 2,
                }}
              >
                <Image
                  src={url}
                  alt={`Imagen ${i + 1} de ${tituloComercial}`}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="100vw"
                  priority={i === 0}
                />
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              order: { xs: 1, md: 2 },
              flex: 1,
              '& p': {
                textAlign: 'justify',
              },
              '& p:first-of-type::first-letter': {
                float: 'left',
                fontSize: '2.9rem',
                lineHeight: 1,
                fontWeight: 'bold',
                marginRight: '0.5rem',
                height: '2em',
              },
            }}
          >
            {tieneDescripcion ? <RichText content={descripcion2} /> : generarLorem()}
          </Box>
        </Box>

        {/* Sección Carreras */}
        {carrerasConCodigo?.length > 0 && (
          <Box mt={8}>
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 'bold',
                fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              Carreras
            </Typography>
            <ListaCarreras carreras={carrerasConCodigo} />
          </Box>
        )}

        {/* Sección Módulos */}
        {modulosSinCodigo?.length > 0 && (
          <Box mt={8}>
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 'bold',
                fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              Módulos
            </Typography>
            <ListaModulos modulos={modulosSinCodigo} />
          </Box>
        )}
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generarJsonLd(especialidad)),
        }}
      />
    </main>
  );
}
