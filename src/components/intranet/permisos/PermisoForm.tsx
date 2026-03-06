'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, collection, setDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, TextField, Container, Typography, Box, CircularProgress } from '@mui/material';

interface PermisoFormProps {
    permiso?: {
        id: string;
        titulo: string;
        scala: number;
    } | null;
}

export function PermisoForm({ permiso }: PermisoFormProps) {
    const [titulo, setTitulo] = useState(permiso ? permiso.titulo : '');
    const [scala, setScala] = useState(permiso ? permiso.scala.toString() : '');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const permisoData = {
            titulo: titulo,
            scala: parseInt(scala, 10),
        };

        try {
            if (permiso) {
                // Update existing document
                const docRef = doc(db, 'permisos', permiso.id);
                await setDoc(docRef, permisoData, { merge: true });
            } else {
                // Create new document
                await addDoc(collection(db, 'permisos'), permisoData);
            }
            router.push('/intranet/permisos');
            router.refresh(); // To see the changes in the list
        } catch (error) {
            console.error("Error saving document: ", error);
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {permiso ? 'Editar Permiso' : 'Crear Permiso'}
                </Typography>
                <form onSubmit={handleSubmit}>
                    <TextField
                        label="Título del Rol"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                    />
                    <TextField
                        label="Nivel (Scala)"
                        value={scala}
                        onChange={(e) => setScala(e.target.value)}
                        fullWidth
                        margin="normal"
                        type="number"
                        required
                    />
                    <Box sx={{ mt: 2 }}>
                        <Button type="submit" variant="contained" color="primary" disabled={loading}>
                            {loading ? <CircularProgress size={24} /> : (permiso ? 'Actualizar' : 'Crear')}
                        </Button>
                    </Box>
                </form>
            </Box>
        </Container>
    );
}