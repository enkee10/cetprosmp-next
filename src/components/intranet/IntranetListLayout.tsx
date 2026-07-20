'use client';

import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import ColumnVisibilityControl, {
  type ColumnToggleItem,
} from '@/components/intranet/ColumnVisibilityControl';

interface IntranetListLayoutProps {
  message?: string | null;
  messageSeverity?: AlertColor;
  title: React.ReactNode;
  commands?: React.ReactNode;
  columnToggleItems?: ColumnToggleItem[];
  onToggleColumn?: (field: string, checked: boolean) => void;
  columnToggleLabel?: string;
  children: React.ReactNode;
}

const IntranetListLayout: React.FC<IntranetListLayoutProps> = ({
  message,
  messageSeverity = 'error',
  title,
  commands,
  columnToggleItems,
  onToggleColumn,
  columnToggleLabel = 'Campos',
  children,
}) => {
  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        bgcolor: 'background.paper',
      }}
    >
      <AutoDismissAlert
        message={message}
        severity={messageSeverity}
        containerSx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', minHeight: 56 }}
      />

      <Box sx={{ p: { xs: '6px' }, px: { md: 2 }, py: { md: 1.5 } }}>
        {typeof title === 'string' ? (
          <Typography variant="h4" component="h1" sx={{ lineHeight: 1.1 }}>
            {title}
          </Typography>
        ) : (
          title
        )}
      </Box>

      <Box sx={{ px: 2, py: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>{commands}</Box>

          {columnToggleItems ? (
            <ColumnVisibilityControl
              items={columnToggleItems}
              label={columnToggleLabel}
              onToggleColumn={onToggleColumn}
            />
          ) : null}
        </Box>
      </Box>

      <Box sx={{ width: '100%', minWidth: 0, overflowX: 'auto' }}>
        {children}
      </Box>
    </Box>
  );
};

export default IntranetListLayout;
