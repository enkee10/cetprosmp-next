'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, CircularProgress } from '@mui/material';

interface FormLoadingOverlayProps {
  open: boolean;
  message?: string;
  variant?: 'contained' | 'fullscreen';
}

export default function FormLoadingOverlay({
  open,
  message = 'Procesando...',
  variant = 'contained',
}: FormLoadingOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open) return null;

  const isFullscreen = variant === 'fullscreen';

  const overlay = (
    <Box
      role="status"
      aria-label={message}
      aria-live="polite"
      sx={{
        position: isFullscreen ? 'fixed' : 'absolute',
        inset: 0,
        width: isFullscreen ? '100vw' : 'auto',
        height: isFullscreen ? '100dvh' : 'auto',
        zIndex: isFullscreen ? 1600 : 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: isFullscreen ? 'rgba(255, 255, 255, 0.42)' : 'rgba(255, 255, 255, 0.22)',
        cursor: 'wait',
        pointerEvents: 'auto',
      }}
    >
      <CircularProgress size={42} />
    </Box>
  );

  if (isFullscreen && mounted) {
    return createPortal(overlay, document.body);
  }

  return overlay;
}
