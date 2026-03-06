'use client'
import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton } from '@mui/material';
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
  apellidos: string;
  celular: string;
  tipo_documento: 'DNI' | 'CE';
  dni: string;
  permisoId?: string;
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const functions = getFunctions(app);

  const fetchUsers = async () => {
    setLoading(true);
    try {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(usersList);
    } catch (error) {
        console.error("Error fetching users: ", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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
            // For a real app, you MUST call a Cloud Function to delete the user from Firebase Auth.
            await deleteDoc(doc(db, 'users', id));
            fetchUsers();
        } catch (error) {
            console.error("Error deleting user: ", error);
        }
    }
  };

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
        if (selectedUser) {
            // EDITING an existing user
            const userDoc = doc(db, 'users', selectedUser.id);
            const { password, ...dataToUpdate } = data; // Password is not editable from this form, so we remove it.

            // 1. Update Firestore document
            await updateDoc(userDoc, dataToUpdate);

            // 2. Update Auth custom claim if role changed
            if (dataToUpdate.permisoId) {
                const setUserRole = httpsCallable(functions, 'setUserRole');
                await setUserRole({ uid: selectedUser.id, roleId: dataToUpdate.permisoId });
            }
        } else {
            // CREATING a new user
            // The `data` object contains the full form data, including the password.
            const createNewUser = httpsCallable(functions, 'createNewUser');
            await createNewUser(data);
        }

        fetchUsers();
        setFormOpen(false);
        setSelectedUser(null); // Clean up state after submission

    } catch (error) {
        console.error("Error saving user: ", error);
    } finally {
        setLoading(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'username', headerName: 'Username', width: 150 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'nombre', headerName: 'Nombre', width: 150 },
    { field: 'apellidos', headerName: 'Apellidos', width: 150 },
    { field: 'celular', headerName: 'Celular', width: 120 },
    {
        field: 'actions',
        type: 'actions',
        headerName: 'Actions',
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
            key={selectedUser ? selectedUser.id : 'new-user'} // Force re-render
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
