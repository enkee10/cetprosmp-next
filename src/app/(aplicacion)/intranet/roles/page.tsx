'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
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
import Modal1 from '@/components/Modal1';
import { RoleForm } from '@/components/intranet/roles/RoleForm';

interface Role {
  id: number;
  titulo: string | null;
  scala: number | null;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openRoleModal, setOpenRoleModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleFormResetKey, setRoleFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuRoleId, setMenuRoleId] = useState<string | null>(null);
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

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listRoles = httpsCallable<undefined, { roles?: Role[] }>(
        functions,
        'listRoles',
      );
      const result = await listRoles();
      setRoles(result.data.roles || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching roles: ', err);
      setError(
        'No se pudieron cargar los roles. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.',
      );
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  const handleDismissRoleModal = useCallback(() => {
    setOpenRoleModal(false);
  }, []);

  const handleRoleSaved = useCallback(() => {
    setOpenRoleModal(false);
    setEditingRoleId(null);
    setRoleFormResetKey((prev) => prev + 1);
    void fetchRoles();
    setTimeout(() => {
      void fetchRoles();
    }, 400);
  }, [fetchRoles]);

  const handleCreateRole = useCallback(() => {
    setEditingRoleId(null);
    setOpenRoleModal(true);
  }, []);

  const handleEditRole = useCallback((id: string) => {
    setEditingRoleId(id);
    setOpenRoleModal(true);
    setMenuAnchorEl(null);
    setMenuRoleId(null);
  }, []);

  const columns: GridColDef[] = [
    {
      field: 'titulo',
      headerName: 'Titulo',
      flex: 1.2,
      minWidth: 170,
      valueGetter: (_value, row: Role) => row.titulo || '',
    },
    {
      field: 'scala',
      headerName: 'Nivel (Scala)',
      flex: 0.8,
      minWidth: 120,
      valueGetter: (_value, row: Role) => (row.scala != null ? row.scala : ''),
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
            setMenuRoleId(String((params.row as Role).id));
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
      title="Gestion de Roles"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleCreateRole}>
            Crear Rol
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
          rows={roles}
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
          setMenuRoleId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuRoleId) handleEditRole(menuRoleId);
          }}
        >
          Editar
        </MenuItem>
      </Menu>

      <Modal1
        open={openRoleModal}
        onClose={handleDismissRoleModal}
        title={editingRoleId ? 'Editar Rol' : 'Crear Rol'}
      >
        <RoleForm
          key={`${editingRoleId ?? 'new-role'}-${roleFormResetKey}`}
          asModal
          roleId={editingRoleId ?? undefined}
          onCancel={handleDismissRoleModal}
          onSaved={handleRoleSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
