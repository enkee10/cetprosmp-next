import React, { useRef } from "react";
import { Box } from '@mui/material';
import NextLink from 'next/link';

type LogoNombreProps = {
  forceCompact?: boolean;
};

export default function LogoNombre({ forceCompact = false }: LogoNombreProps) {
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'auto',
        whiteSpace: 'nowrap',
        px: 1,
      }}
      href="/"
      component={NextLink}
      ref={anchorRef}
    >
      <Box
        component="img"
        src="/logo-smp.svg"
        alt="logo"
        sx={{
          height: forceCompact ? '44px' : { xs: '44px', md: '58px' },
          mr: 1,
          my: forceCompact ? '2px' : { xs: '2px', md: '3px' },
          transition: 'height 0.3s ease',
        }}
      />
      <Box
        component="img"
        src="/nombre-smp.svg"
        alt="nombre"
        sx={{
          display: forceCompact ? 'none' : { xs: 'none', md: 'inline' },
          height: '40px',
          transition: 'all 0.3s ease',
        }}
      />
      <Box
        component="img"
        src="/nombre-smp2.svg"
        alt="nombre"
        sx={{
          display: forceCompact ? 'inline' : { xs: 'inline', md: 'none' },
          height: '16px',
          transition: 'all 0.3s ease',
        }}
      />
    </Box>
  );
}
