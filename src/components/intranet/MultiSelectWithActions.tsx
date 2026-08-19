'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
} from '@mui/material';
import type { FormControlProps, SelectChangeEvent, SelectProps, SxProps, Theme } from '@mui/material';

export type MultiSelectPrimitive = string | number;

export type MultiSelectActionOption<T extends MultiSelectPrimitive = string> = {
  value: T;
  label: ReactNode;
  secondary?: ReactNode;
  disabled?: boolean;
};

type AllOptionConfig<T extends MultiSelectPrimitive> = {
  value: T;
  label: ReactNode;
  isSelected: (value: T[]) => boolean;
  getValue: (currentValue: T[]) => T[];
};

type MultiSelectWithActionsProps<T extends MultiSelectPrimitive = string> = {
  label: string;
  value: T[];
  options: MultiSelectActionOption<T>[];
  onChange: (value: T[]) => void;
  allOption?: AllOptionConfig<T>;
  disabled?: boolean;
  displayEmpty?: boolean;
  error?: boolean;
  fullWidth?: boolean;
  getOptionDisabled?: (option: MultiSelectActionOption<T>, pendingValue: T[]) => boolean;
  id?: string;
  labelId?: string;
  margin?: FormControlProps['margin'];
  menuMaxHeight?: number | string;
  required?: boolean;
  renderValue?: (value: T[]) => ReactNode;
  size?: FormControlProps['size'];
  sx?: SxProps<Theme>;
  MenuProps?: SelectProps['MenuProps'];
};

const normalizeSelectValue = <T extends MultiSelectPrimitive>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') return value.split(',').filter(Boolean) as T[];
  return [];
};

export default function MultiSelectWithActions<T extends MultiSelectPrimitive = string>({
  label,
  value,
  options,
  onChange,
  allOption,
  disabled = false,
  displayEmpty = false,
  error = false,
  fullWidth = true,
  getOptionDisabled,
  id,
  labelId,
  margin,
  menuMaxHeight = 420,
  required = false,
  renderValue,
  size = 'small',
  sx,
  MenuProps,
}: MultiSelectWithActionsProps<T>) {
  const generatedId = useId();
  const resolvedLabelId = labelId || `${generatedId}-label`;
  const resolvedId = id || `${generatedId}-select`;
  const [open, setOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<T[]>(value);

  useEffect(() => {
    if (!open) setPendingValue(value);
  }, [open, value]);

  const optionLabelByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options],
  );

  const handleSelectChange = (event: SelectChangeEvent<T[]>) => {
    const nextValue = normalizeSelectValue<T>(event.target.value);
    if (allOption && nextValue.includes(allOption.value)) {
      setPendingValue(allOption.getValue(pendingValue));
      return;
    }
    setPendingValue(nextValue.filter((item) => !allOption || item !== allOption.value));
  };

  const handleOpen = () => {
    setPendingValue(value);
    setOpen(true);
  };

  const handleCancel = () => {
    setPendingValue(value);
    setOpen(false);
  };

  const handleAccept = () => {
    onChange(pendingValue);
    setOpen(false);
  };

  const defaultRenderValue = (selected: T[]) => {
    if (selected.length === 0) return 'Seleccionar';
    return selected.map((item) => optionLabelByValue.get(item) || String(item)).join(' / ');
  };

  const mergedMenuProps = {
    disableScrollLock: true,
    ...MenuProps,
    PaperProps: {
      ...MenuProps?.PaperProps,
      sx: {
        maxHeight: { xs: '70vh', sm: menuMaxHeight },
        maxWidth: 'calc(100vw - 24px)',
      },
    },
    MenuListProps: {
      ...MenuProps?.MenuListProps,
      sx: { pb: 0 },
    },
  };

  return (
    <FormControl fullWidth={fullWidth} size={size} margin={margin} required={required} disabled={disabled} error={error} sx={sx}>
      <InputLabel id={resolvedLabelId} shrink={displayEmpty || undefined}>
        {label}
      </InputLabel>
      <Select<T[]>
        id={resolvedId}
        labelId={resolvedLabelId}
        multiple
        displayEmpty={displayEmpty}
        open={open}
        value={pendingValue}
        label={label}
        onOpen={handleOpen}
        onClose={handleCancel}
        onChange={handleSelectChange}
        input={<OutlinedInput label={label} notched={displayEmpty || undefined} />}
        renderValue={(selected) => {
          const selectedValue = normalizeSelectValue<T>(selected);
          return renderValue ? renderValue(selectedValue) : defaultRenderValue(selectedValue);
        }}
        MenuProps={mergedMenuProps}
      >
        {allOption ? (
          <MenuItem value={allOption.value}>
            <Checkbox checked={allOption.isSelected(pendingValue)} />
            <ListItemText primary={allOption.label} />
          </MenuItem>
        ) : null}
        {options.map((option) => {
          const checked = pendingValue.includes(option.value);
          const optionDisabled = option.disabled || getOptionDisabled?.(option, pendingValue) || false;
          return (
            <MenuItem key={String(option.value)} value={option.value} disabled={optionDisabled}>
              <Checkbox checked={checked} />
              <ListItemText primary={option.label} secondary={option.secondary} />
            </MenuItem>
          );
        })}
        <Box
          component="li"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          sx={{
            position: 'sticky',
            bottom: 0,
            zIndex: 1,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            px: 1,
            py: 1,
            listStyle: 'none',
          }}
        >
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button size="small" variant="contained" onClick={handleAccept}>
              Aceptar
            </Button>
          </Stack>
        </Box>
      </Select>
    </FormControl>
  );
}
