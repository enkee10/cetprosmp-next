// src/components/FullCustomMenu/FullCustomMenu.tsx

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

export const MenuContainer = ({ children, ancho = 256, sx = {} }: {
  children: React.ReactNode;
  ancho?: number | string;
  sx?: object;
}) => (
  <Paper sx={{ width: ancho, mt: 1.4, ml: -1, ...sx }}>
    {children}
  </Paper>
);

export const MenuItemBox = ({
  children,
  iconRight,
  onMouseEnter,
}: {
  children: React.ReactNode;
  iconRight?: React.ReactNode;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) => (
  <Box
    onMouseEnter={onMouseEnter}
    sx={{
      px: 2,
      py: 1,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      '&:hover': { backgroundColor: '#eee' },
    }}
  >
    <Box sx={{ flex: 1, alignItems: "flex-start" }}>{children}</Box>
    {iconRight && <Box sx={{ ml: 1, alignSelf: 'flex-start', mt: 0.5 }}>{iconRight}</Box>}
  </Box>
);

export const ModuleItemBox = ({ children }: { children: React.ReactNode }) => (
  <Box
    sx={{
      px: 2,
      py: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      cursor: 'default',
      '&:hover': { backgroundColor: '#f5f5f5' },
    }}
  >
    <FiberManualRecordIcon sx={{ alignSelf: 'flex-start', mt: 1, fontSize: 8 }} />
    {children}
  </Box>
);

export const MenuText = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
    {children}
  </Typography>
);
