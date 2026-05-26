'use client';

import React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import type { AlertColor } from '@mui/material';

interface ColumnToggleItem {
  field: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
}

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
  const [columnsAnchorEl, setColumnsAnchorEl] = React.useState<HTMLElement | null>(null);
  const columnsMenuOpen = Boolean(columnsAnchorEl);

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        bgcolor: 'background.paper',
      }}
    >
      {message ? (
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', minHeight: 56 }}>
          <Alert severity={messageSeverity}>{message}</Alert>
        </Box>
      ) : null}

      <Box sx={{ px: 2, py: 1.5 }}>
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

          {columnToggleItems && columnToggleItems.length > 0 ? (
            <>
              <Button
                variant="outlined"
                startIcon={<ViewColumnOutlinedIcon />}
                onClick={(event) => setColumnsAnchorEl(event.currentTarget)}
              >
                {columnToggleLabel}
              </Button>
              <Menu
                anchorEl={columnsAnchorEl}
                open={columnsMenuOpen}
                disableScrollLock
                onClose={() => setColumnsAnchorEl(null)}
              >
                {columnToggleItems.map((item) => (
                  <MenuItem
                    key={item.field}
                    dense
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled && onToggleColumn) {
                        onToggleColumn(item.field, !item.checked);
                      }
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={item.checked}
                      disabled={item.disabled}
                    />
                    <ListItemText primary={item.label} />
                  </MenuItem>
                ))}
              </Menu>
            </>
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
