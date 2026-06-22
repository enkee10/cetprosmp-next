'use client';

import { Box } from '@mui/material';
import {
  DataGrid,
  type DataGridProps,
  type GridValidRowModel,
} from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';

type IntranetDataGridProps<R extends GridValidRowModel = GridValidRowModel> = DataGridProps<R>;

const localeTextEs = esES.components.MuiDataGrid.defaultProps.localeText;

const defaultSx: DataGridProps['sx'] = {
  border: 0,
  width: '100%',
  minWidth: 0,
  '& .MuiDataGrid-columnHeaders': { borderTop: 0 },
  '& .MuiDataGrid-cell': { alignItems: 'center' },
  '& .MuiDataGrid-main': {
    overflowX: 'auto',
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    whiteSpace: 'nowrap',
  },
  '& .MuiDataGrid-cellContent': {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};

export default function IntranetDataGrid<R extends GridValidRowModel = GridValidRowModel>({
  autoHeight = true,
  disableColumnSelector = true,
  disableRowSelectionOnClick = true,
  localeText = localeTextEs,
  pageSizeOptions = [15, 30, 50, 100],
  sx,
  ...props
}: IntranetDataGridProps<R>) {
  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <DataGrid
        {...props}
        autoHeight={autoHeight}
        disableColumnSelector={disableColumnSelector}
        disableRowSelectionOnClick={disableRowSelectionOnClick}
        localeText={localeText}
        pageSizeOptions={pageSizeOptions}
        sx={[defaultSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      />
    </Box>
  );
}
