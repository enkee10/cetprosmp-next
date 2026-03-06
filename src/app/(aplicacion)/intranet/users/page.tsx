'use client'
import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton, Chip, Avatar } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '@/lib/firebase';
import UserForm from '@/components/intranet/UserForm';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface User {
  id: string;
  username: string;
  email: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  celular: string;
  permisoId?: string;
  bloqueado?: boolean;
  foto?: string;
}

interface Permiso {
    id: string;
    titulo: string;
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [permisos, setPermisos] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const functions = getFunctions(app);

  const fetchUsersAndPermisos = async () => {
    setLoading(true);
    try {
        // Fetch Permisos and create a lookup map
        const permisosCollection = collection(db, 'permisos');
        const permisosSnapshot = await getDocs(permisosCollection);
        const permisosMap = new Map<string, string>();
        permisosSnapshot.docs.forEach(doc => {
            const data = doc.data() as Omit<Permiso, 'id'>;
            permisosMap.set(doc.id, data.titulo);
        });
        setPermisos(permisosMap);

        // Fetch Users
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(usersList);

    } catch (error) {
        console.error("Error fetching data: ", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndPermisos();
  }, []);

  const handleAddUser = () => {
    setSelectedUser(null);
    setFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action is irreversible.')) {
        try {
            await deleteDoc(doc(db, 'users', id));
            fetchUsersAndPermisos(); // Refetch data after delete
        } catch (error) {
            console.error("Error deleting user: ", error);
        }
    }
  };

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
        if (selectedUser) {
            const userDoc = doc(db, 'users', selectedUser.id);
            const { password, ...dataToUpdate } = data;
            await updateDoc(userDoc, dataToUpdate);

            if (dataToUpdate.permisoId) {
                const setUserRole = httpsCallable(functions, 'setUserRole');
                await setUserRole({ uid: selectedUser.id, roleId: dataToUpdate.permisoId });
            }
        } else {
            const createNewUser = httpsCallable(functions, 'createNewUser');
            await createNewUser(data);
        }

        fetchUsersAndPermisos(); // Refetch data after submit
        setFormOpen(false);
        setSelectedUser(null);

    } catch (error) {
        console.error("Error saving user: ", error);
    } finally {
        setLoading(false);
    }
  };

  // Updated Grid Columns
  const columns: GridColDef[] = [
    {
        field: 'foto',
        headerName: 'Foto',
        width: 80,
        renderCell: (params) => {
            const { foto, nombre, apellido_paterno } = params.row;
            return (
                <Avatar src={foto || undefined}>
                    {!foto && nombre && apellido_paterno ? `${nombre[0]}${apellido_paterno[0]}`.toUpperCase() : null}
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
        width: 150,
        renderCell: (params) => {
            return permisos.get(params.value) || 'Sin Permiso';
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
                    icon={<EditIcon />}
                    label="Edit"
                    onClick={() => handleEditUser(row as User)}
                />,
                <GridActionsCellItem
                    icon={<DeleteIcon />}
                    label="Delete"
                    onClick={() => handleDeleteUser(row.id)}
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
