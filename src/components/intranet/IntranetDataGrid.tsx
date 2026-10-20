'use client';

import { Box } from '@mui/material';
import {
  DataGrid,
  type DataGridProps,
  type GridColDef,
  type GridValidRowModel,
  getGridNumericOperators,
  useGridApiContext,
  useGridSelector,
  gridColumnDefinitionsSelector,
  gridColumnVisibilityModelSelector,
} from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { useContext, useMemo } from 'react';
import ColumnVisibilityControl, { ColumnVisibilityContext } from './ColumnVisibilityControl';

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

function ColumnVisibilityHeader({ field }: { field: string }) {
  const apiRef = useGridApiContext();
  const columns = useGridSelector(apiRef, gridColumnDefinitionsSelector);
  const visibility = useGridSelector(apiRef, gridColumnVisibilityModelSelector);
  const config = useContext(ColumnVisibilityContext);
  const configuredItems = new Map(config?.items.map((item) => [item.field, item]));
  const items = columns.filter((column) => column.field !== field && !column.field.startsWith('__'))
    .map((column) => ({
      field: column.field,
      label: configuredItems.get(column.field)?.label || column.headerName || column.field,
      checked: visibility[column.field] !== false,
      disabled: column.hideable === false || configuredItems.get(column.field)?.disabled,
    }));

  return <ColumnVisibilityControl
    items={items}
    label={config?.label}
    onToggleColumn={(columnField, checked) => {
      if (config?.onToggleColumn && configuredItems.has(columnField)) config.onToggleColumn(columnField, checked);
      else apiRef.current.setColumnVisibility(columnField, checked);
    }}
  />;
}

export default function IntranetDataGrid<R extends GridValidRowModel = GridValidRowModel>({
  autoHeight = true,
  columnHeaderHeight = 40,
  disableColumnSelector = true,
  disableRowSelectionOnClick = true,
  initialState,
  localeText = localeTextEs,
  pageSizeOptions = [15, 30, 50, 100],
  rowHeight = 45,
  slotProps,
  sx,
  ...props
}: IntranetDataGridProps<R>) {
  const columnControlField = props.columns.find((column) => column.field === 'actions')?.field ?? '__columnVisibility__';
  const columns = useMemo(
    () => {
      const result = props.columns.map((column) =>
        isNumericColumn(column, props.rows)
          ? { ...column, type: 'number' as const, filterOperators: numericFilterOperators }
          : column,
      );
      const existing = result.find((column) => column.field === columnControlField);
      const control: GridColDef<R> = {
        ...(existing ?? { field: columnControlField, width: 56, minWidth: 56, renderCell: () => null }),
        headerName: 'Campos',
        headerAlign: 'center',
        sortable: false,
        filterable: false,
        hideable: false,
        disableColumnMenu: true,
        disableExport: true,
        renderHeader: () => <ColumnVisibilityHeader field={columnControlField} />,
      };
      return [...result.filter((column) => column.field !== columnControlField), control];
    },
    [props.columns, props.rows, columnControlField],
  );
  const columnVisibilityModel = useMemo(() => props.columnVisibilityModel
    ? { ...props.columnVisibilityModel, [columnControlField]: true }
    : undefined, [props.columnVisibilityModel, columnControlField]);
  const basePaginationSlotProps = (slotProps?.basePagination ?? {}) as Record<string, any>;
  const basePaginationNestedSlotProps = (basePaginationSlotProps.slotProps ?? {}) as Record<string, any>;
  const basePaginationSelectSlotProps = (basePaginationNestedSlotProps.select ?? {}) as Record<string, any>;

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <DataGrid
        {...props}
        columns={columns}
        columnVisibilityModel={columnVisibilityModel}
        autoHeight={autoHeight}
        columnHeaderHeight={columnHeaderHeight}
        disableColumnSelector={disableColumnSelector}
        disableRowSelectionOnClick={disableRowSelectionOnClick}
        initialState={{
          ...initialState,
          columns: {
            ...initialState?.columns,
            columnVisibilityModel: { ...initialState?.columns?.columnVisibilityModel, [columnControlField]: true },
          },
          pagination: {
            ...initialState?.pagination,
            paginationModel: {
              pageSize: 30,
              page: 0,
              ...initialState?.pagination?.paginationModel,
            },
          },
        }}
        localeText={localeText}
        pageSizeOptions={pageSizeOptions}
        rowHeight={rowHeight}
        slotProps={{
          ...slotProps,
          basePagination: {
            ...basePaginationSlotProps,
            slotProps: {
              ...basePaginationNestedSlotProps,
              select: {
                ...basePaginationSelectSlotProps,
                MenuProps: {
                  ...(basePaginationSelectSlotProps.MenuProps ?? {}),
                  disableScrollLock: true,
                },
              },
            },
          } as any,
        }}
        sx={[defaultSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      />
    </Box>
  );
}
