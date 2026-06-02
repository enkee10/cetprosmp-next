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
      >
        {items.map((item) => (
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
  );
};

export default ColumnVisibilityControl;
