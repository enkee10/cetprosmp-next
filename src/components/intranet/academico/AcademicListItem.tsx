'use client';

import type { ReactNode } from 'react';
import { Box, ListItemButton, type ListItemButtonProps } from '@mui/material';

type AcademicListItemProps = Omit<ListItemButtonProps<'div'>, 'children' | 'component'> & {
  children: ReactNode;
  dragHandle: ReactNode;
};

export default function AcademicListItem({ children, dragHandle, sx = [], ...props }: AcademicListItemProps) {
  return (
    <ListItemButton
      component="div"
      data-academic-card=""
      {...props}
      sx={[
        ...(Array.isArray(sx) ? sx : [sx]),
        { alignItems: 'flex-start', padding: '7.5px', paddingLeft: '3px', gap: '3px' },
      ]}
    >
      {dragHandle}
      <Box sx={{ flex: 1, minWidth: 0, alignSelf: 'flex-start' }}>{children}</Box>
    </ListItemButton>
  );
}
