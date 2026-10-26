'use client';

import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import IntranetDocumentTitle from '@/components/intranet/IntranetDocumentTitle';
import {
  ColumnVisibilityContext,
  type ColumnToggleItem,
} from '@/components/intranet/ColumnVisibilityControl';

interface IntranetListLayoutProps {
  message?: string | null;
  messageSeverity?: AlertColor;
  title: React.ReactNode;
  commands?: React.ReactNode;
  showToolbar?: boolean;
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
  showToolbar = true,
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
      {typeof title === 'string' && <IntranetDocumentTitle title={title} />}
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

      {showToolbar && <Box sx={{ px: 2, py: 1 }}>
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

        </Box>
      </Box>}

      <Box sx={{ width: '100%', minWidth: 0, overflowX: 'auto' }}>
        <ColumnVisibilityContext.Provider value={columnToggleItems ? {
          items: columnToggleItems,
          label: columnToggleLabel,
          onToggleColumn,
        } : null}>
          {children}
        </ColumnVisibilityContext.Provider>
      </Box>
    </Box>
  );
};

export default IntranetListLayout;
