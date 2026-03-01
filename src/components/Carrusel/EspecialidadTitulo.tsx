'use client';

import Link from 'next/link';
import { Typography } from '@mui/material';

type Props = {
  titulo: string;
  slug?: string | null;
};

export default function EspecialidadTitulo({ titulo, slug }: Props) {
  const styles = {
    fontWeight: 'bold',
    textAlign: { xs: 'center', md: 'left' },
    fontSize: 'clamp(2rem, 5vw, 3rem)',
    mb: 1,
    // 👇 sombra blanca permanente, el color lo pones en tu tema/hoja; aquí no lo fuerzo
    textShadow: '0 0 8px rgba(255,255,255,0.95), 0 0 16px rgba(255,255,255,0.85)',
  } as const;

  const Title = (
    <Typography component="h2" sx={styles}>
      {titulo}
    </Typography>
  );

  return slug ? (
    <Link href={`/especialidades/${slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      {Title}
    </Link>
  ) : (
    Title
  );
}
