'use client';

import { Box } from '@mui/material';
import {
  DataGrid,
  type DataGridProps,
  type GridColDef,
  type GridValidRowModel,
  getGridNumericOperators,
} from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { useMemo } from 'react';

type IntranetDataGridProps<R extends GridValidRowModel = GridValidRowModel> = DataGridProps<R>;

const localeTextEs = esES.components.MuiDataGrid.defaultProps.localeText;

const numericFilterOperators = getGridNumericOperators().map((operator) => {
  if (operator.value === '>=') return { ...operator, label: 'mayor o igual' };
  if (operator.value === '<=') return { ...operator, label: 'menor o igual' };
  if (operator.value === '>') return { ...operator, label: 'mayor que' };
  if (operator.value === '<') return { ...operator, label: 'menor que' };
  return operator;
});

const defaultSx: DataGridProps['sx'] = {
  border: 0,
  width: '100%',
  minWidth: 0,
  '& .MuiDataGrid-columnHeaders': { borderTop: 0 },
  '& .MuiDataGrid-cell': {
    display: 'flex',
    alignItems: 'center',
    lineHeight: 1.35,
    whiteSpace: 'normal',
  },
  '& .MuiDataGrid-main': {
    overflowX: 'auto',
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    whiteSpace: 'nowrap',
  },
  '& .MuiDataGrid-cellContent': {
    display: '-webkit-box !important',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    lineHeight: 1.35,
    maxHeight: '2.7em',
    whiteSpace: 'normal !important',
    overflow: 'hidden !important',
    textOverflow: 'ellipsis !important',
    wordBreak: 'break-word',
  },
};

function isNumericColumn<R extends GridValidRowModel>(column: GridColDef<R>, rows?: readonly R[]) {
  if (column.type === 'number') return true;
  if (!rows?.length || column.valueGetter || column.renderCell) return false;

  const sampledValues = rows
    .map((row) => row[column.field])
    .filter((value) => value !== null && value !== undefined && value !== '')
    .slice(0, 20);

  if (sampledValues.length === 0) return false;

  return sampledValues.every((value) => typeof value === 'number' && Number.isFinite(value));
}

export default function IntranetDataGrid<R extends GridValidRowModel = GridValidRowModel>({
  autoHeight = true,
  columnHeaderHeight = 40,
  disableColumnSelector = true,
  disableRowSelectionOnClick = true,
  localeText = localeTextEs,
  pageSizeOptions = [15, 30, 50, 100],
  rowHeight = 45,
  sx,
  ...props
}: IntranetDataGridProps<R>) {
  const columns = useMemo(
    () =>
      props.columns?.map((column) =>
        isNumericColumn(column, props.rows)
          ? { ...column, type: 'number' as const, filterOperators: numericFilterOperators }
          : column,
      ),
    [props.columns, props.rows],
  );

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <DataGrid
        {...props}
        columns={columns}
        autoHeight={autoHeight}
        columnHeaderHeight={columnHeaderHeight}
        disableColumnSelector={disableColumnSelector}
        disableRowSelectionOnClick={disableRowSelectionOnClick}
        localeText={localeText}
        pageSizeOptions={pageSizeOptions}
        rowHeight={rowHeight}
        sx={[defaultSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      />
    </Box>
  );
}
