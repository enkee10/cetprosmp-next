'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Box, Button, Typography, Chip, Avatar } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import UserForm from '@/components/intranet/UserForm';
import { useAuth } from '@/context/AuthContext';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

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

interface UserFormData extends Record<string, unknown> {
  permisoId?: string | number | null;
  password?: string;
}

const getCallableErrorMessage = (error: unknown, fallback: string) => {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message;

  if (code === 'functions/permission-denied') {
    return 'No tienes permisos suficientes para administrar usuarios. Si te acaban de asignar el rol, cierra sesión e ingresa otra vez.';
  }

  if (code === 'functions/internal') {
    return 'Data Connect no pudo completar la operación. Revisa que las operaciones del connector estén desplegadas y que la función tenga acceso al servicio.';
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

  const listUsers = useMemo(
    () => httpsCallable<undefined, { users?: Record<string, unknown>[] }>(functions, 'listUsers', { timeout: 15000 }),
    [],
  );

  const fetchUsers = useCallback(async (attempt = 0) => {
    if (!user) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await listUsers();
      const normalizedUsers: User[] = (result.data.users || []).map((user) => {
        const permisoRaw = user.permisoId;
        const permisoParsed = typeof permisoRaw === 'string' ? Number(permisoRaw) : Number(permisoRaw ?? NaN);
        return {
          ...(user as unknown as User),
          blocked: Boolean(user.blocked),
          bloqueado: Boolean(user.bloqueado ?? user.blocked),
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
        setErrorMessage('No tienes permisos para listar usuarios (se requiere claim level >= 600). Cierra sesión e inicia nuevamente para refrescar claims.');
      } else {
        setErrorMessage('No se pudo cargar la lista de usuarios desde Data Connect.');
      }
    } finally {
      setLoading(false);
    }
  }, [listUsers, user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    fetchUsers();
  }, [authLoading, fetchUsers]);

  const handleAddUser = () => {
    setSelectedUser(null);
    setFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormOpen(true);
  };

  const handleDeleteUser = async (documentId: string) => {
    if (!documentId) {
      setErrorMessage('No se puede eliminar: el usuario no tiene documentId.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user? This action is irreversible.')) {
      try {
        const deleteUser = httpsCallable(functions, 'deleteUser');
        await deleteUser({ uid: documentId });
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user: ', error);
        setErrorMessage(getCallableErrorMessage(error, 'No se pudo eliminar el usuario.'));
      }
    }
  };

  const handleFormSubmit = async (data: UserFormData) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (selectedUser) {
        const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
        const dataToUpdate = { ...data };
        delete dataToUpdate.password;

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

      fetchUsers();
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
      width: 80,
      renderCell: (params) => {
        const { avatar, nombre, apellidoPaterno } = params.row;
        return (
          <Avatar src={avatar || undefined}>
            {!avatar && nombre && apellidoPaterno ? `${nombre[0]}${apellidoPaterno[0]}`.toUpperCase() : null}
          </Avatar>
        );
      },
    },
    { field: 'username', headerName: 'Username', width: 180 },
    { field: 'email', headerName: 'Correo', width: 220 },
    { field: 'celular', headerName: 'Celular', width: 120 },
    {
      field: 'permisoId',
      headerName: 'Permiso',
      width: 180,
      renderCell: (params) => {
        const row = params.row as User;
        return typeof row.permisoId === 'number' ? String(row.permisoId) : 'Sin Permiso';
      },
    },
    {
      field: 'bloqueado',
      headerName: 'Estado',
      width: 120,
      renderCell: (params) => (
        params.value ? <Chip label="Bloqueado" color="error" size="small" /> : <Chip label="Activo" color="success" size="small" />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Acciones',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ row }) => {
        return [
          <GridActionsCellItem
            key={`edit-${(row as User).id}`}
            icon={<EditIcon />}
            label="Edit"
            onClick={() => handleEditUser(row as User)}
          />,
          <GridActionsCellItem
            key={`delete-${(row as User).id}`}
            icon={<DeleteIcon />}
            label="Delete"
            onClick={() => handleDeleteUser((row as User).documentId)}
          />,
        ];
      },
    },
  ];

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Administración de Usuarios
      </Typography>
      <Button variant="contained" color="primary" onClick={handleAddUser} sx={{ mb: 2 }}>
        Agregar Usuario
      </Button>
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}
      <DataGrid
        rows={users}
        columns={columns}
        loading={loading}
        pageSizeOptions={[10, 25, 50]}
        getRowId={(row) => row.id}
      />
      {formOpen && (
        <UserForm
          key={selectedUser ? selectedUser.id : 'new-user'}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={selectedUser}
        />
      )}
    </Box>
  );
};

export default UsersPage;


