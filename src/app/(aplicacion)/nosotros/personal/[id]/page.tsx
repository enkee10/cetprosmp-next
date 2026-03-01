// src/app/nosotros/personal/[id]/page.tsx

import { notFound } from 'next/navigation';
import { Box, Typography, Container, Chip, Stack } from '@mui/material';
import Image from 'next/image';
import type { Personal } from '@/types/personal';
import personalData from '@/../public/data/personal.json';

interface Props {
  params: { id: string };
}

export default function PersonalDetallePage({ params }: Props) {
  const id = Number(params.id);
  const persona = (personalData as Personal[]).find((p) => p.id === id);

  if (!persona) return notFound();

  const imagen = persona.user?.foto?.trim()
    ? persona.user.foto
    : process.env.NEXT_PUBLIC_DEFAULT_IMG_URL!;

  const memoHtml = persona.memo || '<p>Sin reseña disponible.</p>';

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
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
        {persona.displayName}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 4,
          alignItems: 'flex-start',
        }}
      >
        <Box sx={{ width: { xs: '100%', md: '40%' }, maxWidth: 300 }}>
          <Image
            src={imagen}
            alt={`Foto de ${persona.displayName}`}
            width={300}
            height={225}
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'cover',
              aspectRatio: '4/3',
              borderRadius: '8px',
            }}
          />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography
            variant="body1"
            component="section"
            sx={{
              mb: 2,
              '& p': { mb: 1 },
            }}
            dangerouslySetInnerHTML={{ __html: memoHtml }}
          />

          {persona.especialidades?.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {persona.especialidades.map((esp) => (
                <Chip
                  key={esp.id}
                  label={esp.tituloComercial}
                  size="small"
                  color="primary"
                />
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    </Container>
  );
}
