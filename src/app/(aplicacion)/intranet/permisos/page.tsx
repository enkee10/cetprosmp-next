'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridPaginationModel,
} from '@mui/x-data-grid';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import { PermisoForm } from '@/components/intranet/permisos/PermisoForm';

interface Permiso {
  id: number;
  titulo: string | null;
  scala: number | null;
}

export default function PermisosPage() {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openPermisoModal, setOpenPermisoModal] = useState(false);
  const [editingPermisoId, setEditingPermisoId] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuPermisoId, setMenuPermisoId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      titulo: true,
      scala: true,
      actions: true,
    });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchPermisos = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listPermisos = httpsCallable<undefined, { permisos?: Permiso[] }>(
        functions,
        'listPermisos',
      );
      const result = await listPermisos();
      setPermisos(result.data.permisos || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching permisos: ', err);
      setError(
        'No se pudieron cargar los permisos. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.',
      );
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchPermisos();
  }, [fetchPermisos]);

  const handleClosePermisoModal = useCallback(() => {
    setOpenPermisoModal(false);
    setEditingPermisoId(null);
    void fetchPermisos();
    setTimeout(() => {
      void fetchPermisos();
    }, 400);
  }, [fetchPermisos]);

  const handleCreatePermiso = useCallback(() => {
    setEditingPermisoId(null);
    setOpenPermisoModal(true);
  }, []);

  const handleEditPermiso = useCallback((id: string) => {
    setEditingPermisoId(id);
    setOpenPermisoModal(true);
    setMenuAnchorEl(null);
    setMenuPermisoId(null);
  }, []);

  const columns: GridColDef[] = [
    {
      field: 'titulo',
      headerName: 'Titulo',
      flex: 1.2,
      minWidth: 170,
      valueGetter: (_value, row: Permiso) => row.titulo || '',
    },
    {
      field: 'scala',
      headerName: 'Nivel (Scala)',
      flex: 0.8,
      minWidth: 120,
      valueGetter: (_value, row: Permiso) => (row.scala != null ? row.scala : ''),
    },
    {
      field: 'actions',
      headerName: '...',
      align: 'center',
      headerAlign: 'center',
      width: 56,
      minWidth: 56,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <IconButton
          size="small"
          aria-label="Opciones"
          onClick={(event) => {
            setMenuAnchorEl(event.currentTarget);
            setMenuPermisoId(String((params.row as Permiso).id));
          }}
        >
          <MoreHorizIcon />
        </IconButton>
      ),
    },
  ];

  const columnToggleItems = useMemo(
    () =>
      columns.map((column) => ({
        field: column.field,
        label:
          typeof column.headerName === 'string' && column.headerName.trim().length > 0
            ? column.headerName
            : column.field,
        checked: columnVisibilityModel[column.field] !== false,
        disabled: column.field === 'actions',
      })),
    [columnVisibilityModel, columns],
  );

  return (
    <IntranetListLayout
      message={error}
      messageSeverity="error"
      title="Gestion de Permisos"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleCreatePermiso}>
            Crear Permiso
          </Button>
          <Button variant="outlined" disabled>
            Otros...
          </Button>
        </Stack>
      }
      columnToggleItems={columnToggleItems}
      onToggleColumn={(field, checked) =>
        setColumnVisibilityModel((prev) => ({ ...prev, [field]: checked }))
      }
      columnToggleLabel="Campos"
    >
      <Box sx={{ width: '100%', minWidth: 0 }}>
        <DataGrid
          rows={permisos}
          columns={columns}
          disableColumnSelector
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={setColumnVisibilityModel}
          loading={loading}
          getRowId={(row) => row.id}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[15, 30, 50, 100]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sx={{
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
          }}
        />
      </Box>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        disableScrollLock
        onClose={() => {
          setMenuAnchorEl(null);
          setMenuPermisoId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuPermisoId) handleEditPermiso(menuPermisoId);
          }}
        >
          Editar
        </MenuItem>
      </Menu>

      <Dialog open={openPermisoModal} onClose={handleClosePermisoModal} fullWidth maxWidth="sm">
        <DialogTitle>{editingPermisoId ? 'Editar Permiso' : 'Crear Permiso'}</DialogTitle>
        <DialogContent>
          <PermisoForm
            asModal
            permisoId={editingPermisoId ?? undefined}
            onCancel={handleClosePermisoModal}
            onSaved={handleClosePermisoModal}
          />
        </DialogContent>
      </Dialog>
    </IntranetListLayout>
  );
}
