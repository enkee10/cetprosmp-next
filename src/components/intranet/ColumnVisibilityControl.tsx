'use client';

import React from 'react';
import {
  Button,
  Checkbox,
  ListItemText,
  Menu,
  MenuItem,
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

const ColumnVisibilityControl: React.FC<ColumnVisibilityControlProps> = ({
  items,
  label = 'Campos',
  onToggleColumn,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<ViewColumnOutlinedIcon />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        {label}
      </Button>
      <Menu
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
