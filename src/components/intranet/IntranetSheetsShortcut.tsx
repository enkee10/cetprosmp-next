'use client';

import { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const SHEET_FILE_NAME = 'Matriculas 2026-2 (Respuestas)';

type SheetInfoResponse = {
  name?: string;
  spreadsheetUrl?: string;
};

export default function IntranetSheetsShortcut() {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const callable = httpsCallable<undefined, SheetInfoResponse>(functions, 'getMatriculasGoogleSheetInfo');
        const response = await callable();
        if (active) setUrl(response.data.spreadsheetUrl || '');
      } catch (error) {
        console.warn('No se pudo cargar el enlace de la hoja de matriculas:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Box
      component={url ? 'a' : 'div'}
      href={url || undefined}
      target={url ? '_blank' : undefined}
      rel={url ? 'noopener noreferrer' : undefined}
      sx={{
        width: 156,
        minHeight: 150,
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 1,
        p: 1,
        color: 'text.primary',
        textDecoration: 'none',
        borderRadius: 1,
        cursor: url ? 'pointer' : 'default',
        opacity: loading || url ? 1 : 0.55,
        '&:hover': url
          ? {
            bgcolor: 'action.hover',
          }
          : undefined,
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {loading ? (
          <CircularProgress size={34} />
        ) : (
          <Box
            component="img"
            src="/icons/sheets.png"
            alt=""
            sx={{
              width: 72,
              height: 72,
              objectFit: 'contain',
            }}
          />
        )}
      </Box>
      <Typography
        variant="body2"
        align="center"
        sx={{
          maxWidth: '100%',
          lineHeight: 1.2,
          overflowWrap: 'anywhere',
          color: 'text.primary',
        }}
      >
        {SHEET_FILE_NAME}
      </Typography>
    </Box>
  );
}
