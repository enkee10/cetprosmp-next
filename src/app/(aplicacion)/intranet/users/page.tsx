'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
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
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import UserForm from '@/components/intranet/users/UserForm';
import { useAuth } from '@/context/AuthContext';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';

interface User {
  id: number;
  documentId: string;
  username: string;
  email: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  celular: string;
  permisoId?: number | null;
  blocked?: boolean;
  bloqueado?: boolean;
  avatar?: string;
  tipoDocumento?: string;
  dni?: string;
  instruccion?: string;
  estadoCivil?: string;
  direccion?: string;
  distrito?: string;
  fechaNacimiento?: string;
  telefono?: string;
  sexo?: string;
}

type UserFormSubmitData = Parameters<React.ComponentProps<typeof UserForm>['onSubmit']>[0];

const getCallableErrorMessage = (error: unknown, fallback: string) => {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message;

  if (code === 'functions/permission-denied') {
    return 'No tienes permisos suficientes para administrar usuarios. Si te acaban de asignar el rol, cierra sesion e ingresa otra vez.';
  }

  if (code === 'functions/internal') {
    return 'Data Connect no pudo completar la operacion. Revisa que las operaciones del connector esten desplegadas y que la funcion tenga acceso al servicio.';
  }

  return message || fallback;
};

const isPermissionDeniedDataConnectError = (error: unknown) => {
  const message = String((error as { message?: string } | null)?.message || '');
  const code = String((error as { code?: string } | null)?.code || '');
  return (
    message.includes('PERMISSION_DENIED') ||
    message.includes('@auth rejected the request') ||
    code.includes('permission-denied')
  );
};

const isDeadlineExceededError = (error: unknown) => {
  const message = String((error as { message?: string } | null)?.message || '').toLowerCase();
  const code = String((error as { code?: string } | null)?.code || '').toLowerCase();
  return code.includes('deadline-exceeded') || message.includes('deadline-exceeded');
};

const UsersPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuUser, setMenuUser] = useState<User | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      avatar: true,
      username: true,
      email: true,
      celular: true,
      permisoId: true,
      bloqueado: true,
      actions: true,
    });

  const listUsers = useMemo(
    () =>
      httpsCallable<undefined, { users?: Record<string, unknown>[] }>(functions, 'listUsers', {
        timeout: 15000,
      }),
    [],
  );

  const fetchUsers = useCallback(
    async (attempt = 0) => {
      if (!user) {
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      try {
        const result = await listUsers();
        const normalizedUsers: User[] = (result.data.users || []).map((row) => {
          const permisoRaw = row.permisoId;
          const permisoParsed =
            typeof permisoRaw === 'string' ? Number(permisoRaw) : Number(permisoRaw ?? NaN);
          return {
            ...(row as unknown as User),
            blocked: Boolean(row.blocked),
            bloqueado: Boolean(row.bloqueado ?? row.blocked),
            permisoId: Number.isFinite(permisoParsed) ? permisoParsed : null,
          };
        });
        setUsers(normalizedUsers);
      } catch (error) {
        if (isDeadlineExceededError(error) && attempt < 1) {
          await new Promise((resolve) => setTimeout(resolve, 900));
          await fetchUsers(attempt + 1);
          return;
        }

        console.error('Error fetching users: ', error);
        if (isPermissionDeniedDataConnectError(error)) {
          setErrorMessage(
            'No tienes permisos para listar usuarios (se requiere claim level >= 600). Cierra sesion e inicia nuevamente para refrescar claims.',
          );
        } else {
          setErrorMessage('No se pudo cargar la lista de usuarios desde Data Connect.');
        }
      } finally {
        setLoading(false);
      }
    },
    [listUsers, user],
  );

  useEffect(() => {
    if (authLoading) return;
    fetchUsers();
  }, [authLoading, fetchUsers]);

  const handleAddUser = () => {
    setSelectedUser(null);
    setFormOpen(true);
  };

  const handleEditUser = (row: User) => {
    setSelectedUser(row);
    setFormOpen(true);
    setMenuAnchorEl(null);
    setMenuUser(null);
  };

  const handleDeleteUser = async (documentId: string) => {
    if (!documentId) {
      setErrorMessage('No se puede eliminar: el usuario no tiene documentId.');
      return;
    }

    if (
      window.confirm('Estas seguro de eliminar este usuario? Esta accion es irreversible.')
    ) {
      try {
        const deleteUser = httpsCallable(functions, 'deleteUser');
        await deleteUser({ uid: documentId });
        setMenuAnchorEl(null);
        setMenuUser(null);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user: ', error);
        setErrorMessage(getCallableErrorMessage(error, 'No se pudo eliminar el usuario.'));
      }
    }
  };

  const handleFormSubmit = async (data: UserFormSubmitData) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (selectedUser) {
        const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
        const dataToUpdate = { ...data };
        delete (dataToUpdate as { password?: unknown }).password;

        await updateUserProfile({
          documentId: selectedUser.documentId,
          ...dataToUpdate,
        });

        const currentPermiso = selectedUser.permisoId ? String(selectedUser.permisoId) : '';
        const nextPermiso = dataToUpdate.permisoId ? String(dataToUpdate.permisoId) : '';
        if (nextPermiso && nextPermiso !== currentPermiso) {
          const setUserRole = httpsCallable(functions, 'setUserRole');
          await setUserRole({
            uid: selectedUser.documentId,
            roleId: dataToUpdate.permisoId,
          });
        }
      } else {
        const createNewUser = httpsCallable(functions, 'createNewUser');
        await createNewUser({
          ...data,
          level: 0,
        });
      }

      await fetchUsers();
      setFormOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error saving user: ', error);
      setErrorMessage(getCallableErrorMessage(error, 'No se pudo guardar el usuario.'));
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'avatar',
      headerName: 'Foto',
      width: 70,
      //minWidth: 70,
      //maxWidth: 70,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const { avatar, nombre, apellidoPaterno } = params.row as User;
        return (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <Avatar src={avatar || undefined}>
              {!avatar && nombre && apellidoPaterno
                ? `${nombre[0]}${apellidoPaterno[0]}`.toUpperCase()
                : null}
            </Avatar>
          </Box>
        );
      },
    },
    { field: 'username', headerName: 'Username', flex: 1, minWidth: 110 },
    { field: 'email', headerName: 'Correo', flex: 1.2, minWidth: 150 },
    { field: 'celular', headerName: 'Celular', flex: 0.7, minWidth: 90 },
    {
      field: 'permisoId',
      headerName: 'Permiso',
      flex: 0.6,
      minWidth: 80,
      renderCell: (params) => {
        const row = params.row as User;
        return typeof row.permisoId === 'number' ? String(row.permisoId) : 'Sin permiso';
      },
    },
    {
      field: 'bloqueado',
      headerName: 'Estado',
      flex: 0.7,
      minWidth: 90,
      renderCell: (params) =>
        params.value ? (
          <Chip label="Bloqueado" color="error" size="small" />
        ) : (
          <Chip label="Activo" color="success" size="small" />
        ),
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
            setMenuUser(params.row as User);
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
      message={errorMessage}
      messageSeverity="error"
      title="Administracion de Usuarios"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleAddUser}>
            Agregar
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
          rows={users}
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
          setMenuUser(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuUser) handleEditUser(menuUser);
          }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuUser) handleDeleteUser(menuUser.documentId);
          }}
        >
          Eliminar
        </MenuItem>
      </Menu>

      {formOpen && (
        <UserForm
          key={selectedUser ? selectedUser.id : 'new-user'}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={
            selectedUser ? (selectedUser as unknown as Record<string, unknown>) : undefined
          }
        />
      )}
    </IntranetListLayout>
  );
};

export default UsersPage;
