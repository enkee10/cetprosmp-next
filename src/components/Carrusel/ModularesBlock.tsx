'use client';

import Link from 'next/link';
import { Box, Typography } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import type { Modulo } from './CarruselPortada';

type Props = { modulares: Modulo[] };

export default function ModularesBlock({ modulares }: Props) {
  if (!modulares || modulares.length === 0) return null;

  return (
    <Box sx={{ textAlign: 'left', width: '100%', maxWidth: 600 }}>
      <Box sx={{ pl: 0 }}>
        {modulares.map((modulo) => (
          <Box key={modulo.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.7, mb: 0.5 }}>
            <FiberManualRecordIcon sx={{ fontSize: 8, mt: '6px' }} />
            {modulo.slug ? (
              <Link href={`/modulos/${modulo.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Typography variant="body2" sx={{ textShadow: '0 0 8px rgba(255,255,255,0.95), 0 0 16px rgba(255,255,255,0.85)' }}>
                  {modulo.tituloComercial}
                </Typography>
              </Link>
            ) : (
              <Typography variant="body2" sx={{ textShadow: '0 0 8px rgba(255,255,255,0.95), 0 0 16px rgba(255,255,255,0.85)' }}>
                {modulo.tituloComercial}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
