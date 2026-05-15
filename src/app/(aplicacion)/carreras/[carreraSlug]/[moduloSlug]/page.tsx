import { generarJsonLd } from '@/lib/generarJsonLd';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Box, Container, Typography } from '@mui/material';
import { getCarreras } from '@/lib/getCarreras';
import type { Carrera } from '@/types/carreras';
import type { Modulo, RichTextBlock } from '@/types/modulos';
import Image from 'next/image';
import RichText from '@/components/RichText';
import VideoGallery from '@/components/VideoGallery';
import { getStrapiMedia } from '@/lib/getStrapiMedia';

interface PageProps {
  params: Promise<{ carreraSlug: string; moduloSlug: string }>;
}

const generarLorem = () => {
  const lorem =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vitae sem nec ligula malesuada tincidunt. Vivamus in nisi eu lorem luctus finibus. Donec bibendum, magna vel imperdiet pharetra, leo libero sagittis justo, at aliquam arcu erat nec erat. ';

  return [...Array(4)].map((_, i) => (
    <Typography component="p" key={i} paragraph>
      {lorem.repeat(3).trim()}
    </Typography>
  ));
};

const buscarModuloEnCarrera = (carreras: Carrera[], carreraSlug: string, moduloSlug: string) => {
  const carrera = carreras.find((car) => car.slug === carreraSlug);
  const modulo = carrera?.modulos?.find((mod) => mod.slug === moduloSlug);

  return { carrera, modulo };
};

export async function generateStaticParams() {
  const carreras: Carrera[] = await getCarreras();

  return carreras.flatMap((car) =>
    (car.modulos ?? []).map((mod) => ({
      carreraSlug: car.slug,
      moduloSlug: mod.slug,
    }))
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { carreraSlug, moduloSlug } = await params;
  const carreras: Carrera[] = await getCarreras();
  const { carrera, modulo } = buscarModuloEnCarrera(carreras, carreraSlug, moduloSlug);

  if (!carrera || !modulo) return {};

  return {
    title: `${modulo.tituloComercial} | ${carrera.tituloComercial} | CETPRO SMP`,
    description: `Conoce el modulo ${modulo.tituloComercial} de la carrera ${carrera.tituloComercial} en el CETPRO San Martin de Porres.`,
  };
}

export default async function ModuloCarreraDetallePage({ params }: PageProps) {
  const { carreraSlug, moduloSlug } = await params;
  const carreras: Carrera[] = await getCarreras();
  const { modulo } = buscarModuloEnCarrera(carreras, carreraSlug, moduloSlug);

  if (!modulo) notFound();

  const { tituloComercial, descripcion2, imagenes, videosYoutube } = modulo as Modulo;
  const tieneDescripcion = Array.isArray(descripcion2) && descripcion2.length > 0;

  const imagenesFinales: string[] =
    Array.isArray(imagenes) && imagenes.length > 0
      ? imagenes.map((img) => getStrapiMedia(img.url))
      : [getStrapiMedia(null)];

  const defaultVideoUrl = process.env.NEXT_PUBLIC_DEFAULT_VIDEO_URL || '';
  const videosFinales: string[] =
    Array.isArray(videosYoutube) && videosYoutube.length > 0
      ? videosYoutube.map((v) => (v.url?.includes('youtube.com') ? v.url : defaultVideoUrl)).filter(Boolean)
      : [];

  return (
    <main>
      <Container sx={{ pt: 5, mb: 6 }}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 'bold',
            textAlign: 'center',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
          }}
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
                key={`img-${i}`}
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

            {videosFinales.length > 0 && <VideoGallery videos={videosFinales} />}
          </Box>

          <Box
            sx={{
              order: { xs: 1, md: 2 },
              flex: 1,
              '& p': { textAlign: 'justify' },
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
            {tieneDescripcion ? <RichText content={descripcion2 as RichTextBlock[]} /> : generarLorem()}
          </Box>
        </Box>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generarJsonLd(modulo)),
          }}
        />
      </Container>
    </main>
  );
}
