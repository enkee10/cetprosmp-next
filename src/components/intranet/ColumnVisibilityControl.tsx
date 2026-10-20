'use client';

import React from 'react';
import {
  IconButton,
  Checkbox,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';

export interface ColumnToggleItem {
  field: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
}

interface ColumnVisibilityControlProps {
  items: ColumnToggleItem[];
  label?: string;
  onToggleColumn?: (field: string, checked: boolean) => void;
}

export const ColumnVisibilityContext = React.createContext<ColumnVisibilityControlProps | null>(null);

const ColumnVisibilityControl: React.FC<ColumnVisibilityControlProps> = ({
  items,
  label = 'Campos',
  onToggleColumn,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const menuId = React.useId();

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <Tooltip title={label}>
        <IconButton
          size="small"
          color="primary"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={(event) => {
            event.stopPropagation();
            setAnchorEl(event.currentTarget);
          }}
          onKeyDown={(event) => event.stopPropagation()}
          sx={{
            width: 32,
            height: 32,
            border: '1px solid',
            borderColor: 'primary.main',
            borderRadius: 1,
            bgcolor: open ? '#90caf9' : 'transparent',
            '&:hover': { bgcolor: open ? '#90caf9' : '#e3f2fd' },
            '&:active': { bgcolor: '#90caf9' },
          }}
        >
          <ViewColumnOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={open}
        disableScrollLock
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: { mt: 0.75 },
          },
        }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.field}
            dense
            disabled={item.disabled}
            sx={{ minHeight: 30, py: 0.25, pr: 1.5 }}
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
              sx={{ p: 0.5, mr: 0.75 }}
            />
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ variant: 'body2' }}
              sx={{ my: 0 }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ColumnVisibilityControl;
