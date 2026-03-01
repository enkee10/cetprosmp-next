'use client';

import { Button, ButtonProps } from '@mui/material';

export default function BotonInscripcion(props: ButtonProps) {
  return (
    <Button
      variant="contained"
      color="primary"
      component="a"
      href="/inscripcion"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
      sx={{
        borderRadius: '999px',
        padding: '8px 16px',
        display: 'inline-block',
        textTransform: 'none',
        fontWeight: 'bold',
        ...props.sx,
      }}
    >
      Inscríbete
    </Button>
  );
}
