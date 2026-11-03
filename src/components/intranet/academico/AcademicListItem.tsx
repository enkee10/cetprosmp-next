'use client';

import type { ReactNode } from 'react';
import { Box, CircularProgress, ListItemButton, type ListItemButtonProps } from '@mui/material';

type AcademicListItemProps = Omit<ListItemButtonProps<'div'>, 'children' | 'component'> & {
  children: ReactNode;
  dragHandle: ReactNode;
  busy?: boolean;
  busyLabel?: string;
};

export default function AcademicListItem({ children, dragHandle, busy = false, busyLabel = 'Eliminando elemento', sx = [], ...props }: AcademicListItemProps) {
  return (
    <ListItemButton
      component="div"
      data-academic-card=""
      {...props}
      disabled={busy || props.disabled}
      aria-busy={busy || undefined}
      sx={[
        ...(Array.isArray(sx) ? sx : [sx]),
        { position: 'relative', alignItems: 'flex-start', padding: '7.5px', paddingLeft: '3px', gap: '3px',
          ...(busy ? { '&.Mui-disabled': { opacity: 1 } } : {}) },
      ]}
    >
      <Box inert={busy || undefined} sx={{ display: 'flex', alignItems: 'flex-start', gap: '3px', flex: 1, minWidth: 0, opacity: busy ? 0.35 : 1 }}>
        {dragHandle}
        <Box sx={{ flex: 1, minWidth: 0, alignSelf: 'flex-start' }}>{children}</Box>
      </Box>
      {busy && <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={24} aria-label={busyLabel} />
      </Box>}
    </ListItemButton>
  );
}
