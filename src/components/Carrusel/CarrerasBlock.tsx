'use client';

import Link from 'next/link';
import { Box, Typography } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import type { Especialidad } from './CarruselPortada';

export default function CarrerasBlock({ carreras }: { carreras: Especialidad['carreras'] }) {
  if (!carreras || carreras.length === 0) return null;

  return (
    <Box sx={{ textAlign: 'left', width: '100%', maxWidth: 600 }}>
      {carreras.map((car) => (
        <Box key={car.id} sx={{ mb: 1.2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.7 }}>
            <FiberManualRecordIcon sx={{ fontSize: 10, mt: '6px' }} />
            {car.slug ? (
              <Link href={`/carreras/${car.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Typography variant="body1" fontWeight={600} sx={{ textShadow: '0 0 8px rgba(255,255,255,0.95), 0 0 16px rgba(255,255,255,0.85)' }}>
                  {car.tituloComercial}
                </Typography>
              </Link>
            ) : (
              <Typography variant="body1" fontWeight={600} sx={{ textShadow: '0 0 8px rgba(255,255,255,0.95), 0 0 16px rgba(255,255,255,0.85)'}}>
                {car.tituloComercial}
              </Typography>
            )}
          </Box>

          {/* Módulos de la carrera */}
          {Array.isArray(car.modulos) && car.modulos.length > 0 && (
            <Box sx={{ pl: 2, mt: 0.5 }}>
              {car.modulos.map((mod) => (
                <Box key={mod.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.7, mb: 0.5 }}>
                  <FiberManualRecordIcon sx={{ fontSize: 8, mt: '6px' }} />
                  {mod.slug ? (
                    <Link href={`/modulos/${mod.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <Typography variant="body2" sx={{ textShadow: '0 0 8px rgba(255,255,255,0.95), 0 0 16px rgba(255,255,255,0.85)' }}>
                        {mod.tituloComercial}
                      </Typography>
                    </Link>
                  ) : (
                    <Typography variant="body2" sx={{ textShadow: '0 0 8px rgba(255,255,255,0.95), 0 0 16px rgba(255,255,255,0.85)' }}>
                      {mod.tituloComercial}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}
