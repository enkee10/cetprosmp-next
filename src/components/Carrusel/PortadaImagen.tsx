'use client';

import { Box, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { BoxProps } from '@mui/system';
import Image from 'next/image';

const portadaDefault = process.env.NEXT_PUBLIC_DEFAULT_IMG_URL!;

interface PortadaImagenProps extends BoxProps {
  portada: string | null;
}

export default function PortadaImagen({ portada, sx, ...rest }: PortadaImagenProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      {...rest}
      sx={{
        position: 'absolute',
        zIndex: 1,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        bottom: 0, // siempre pegado al borde inferior
        aspectRatio: {
          xs: '1',
          md: '16/9',
        },
        ...(isMobile
          ? {
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              height: 'auto',
              maxHeight: '50%',
            }
          : {
              right: 0,
              width: 'auto',
              height: '100%',
              maxWidth: '50%',
            }),
        ...sx, // ✅ combinación segura del `sx` externo
      }}
    >
      <Image
        src={portada || portadaDefault}
        alt="Portada"
        fill
        style={{
          objectFit: 'contain',
          objectPosition: 'bottom center',
        }}
      />
    </Box>
  );
}
