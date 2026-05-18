'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Container, Typography, Box, CircularProgress, TextField } from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface PermisoFormProps {
  permiso?: {
    id: string;
    titulo: string;
    scala: number;
  } | null;
  permisoId?: string;
}

interface PermisoData {
  id: number;
  titulo: string | null;
  scala: number | null;
}

export function PermisoForm({ permiso, permisoId }: PermisoFormProps) {
  const [titulo, setTitulo] = useState(permiso ? permiso.titulo : '');
  const [scala, setScala] = useState(permiso ? permiso.scala.toString() : '');
  const [loading, setLoading] = useState(false);
  const [loadingPermiso, setLoadingPermiso] = useState(Boolean(permisoId && !permiso));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPermiso = async () => {
      if (!permisoId || permiso) return;

      setLoadingPermiso(true);
      try {
        const functions = getFunctions(app);
        const getPermiso = httpsCallable<{ id: number }, { permiso: PermisoData | null }>(functions, 'getPermiso');
        const result = await getPermiso({ id: Number(permisoId) });
        const fetched = result.data.permiso;

        if (fetched) {
          setTitulo(fetched.titulo || '');
          setScala(fetched.scala !== null && fetched.scala !== undefined ? String(fetched.scala) : '');
        }
      } catch (err) {
        console.error('Error fetching permiso: ', err);
        setError('No se pudo cargar el permiso para edición.');
      } finally {
        setLoadingPermiso(false);
      }
    };

    fetchPermiso();
  }, [permisoId, permiso]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(app);
      const createOrUpdatePermiso = httpsCallable<{ id?: number; titulo: string; scala: number }, { id: number | null }>(
        functions,
        'createOrUpdatePermiso',
      );

      await createOrUpdatePermiso({
        id: permisoId ? Number(permisoId) : undefined,
        titulo,
        scala: parseInt(scala, 10),
      });

      router.push('/intranet/permisos');
      router.refresh();
    } catch (err) {
      console.error('Error handling permiso form: ', err);
      setError('No se pudo guardar el permiso en Data Connect.');
      setLoading(false);
    }
  };

  if (loadingPermiso) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {permisoId ? 'Editar Permiso' : 'Crear Permiso'}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
              {loading ? <CircularProgress size={24} /> : (permisoId ? 'Actualizar' : 'Crear')}
            </Button>
          </Box>
        </form>
      </Box>
    </Container>
  );
}
