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
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface PermisoData {
  id: number;
  titulo: string | null;
  scala: number | null;
}

export function PermisoForm({ permiso, permisoId, asModal = false, onSaved, onCancel }: PermisoFormProps) {
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

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/permisos');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling permiso form: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes permisos para crear o editar permisos (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar el permiso: ${message}`);
      } else {
        setError('No se pudo guardar el permiso en Data Connect.');
      }
      setLoading(false);
    }
  };

  if (loadingPermiso) {
    const loadingContent = (
      <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );

    if (asModal) {
      return loadingContent;
    }

    return (
      <Container maxWidth="sm">
        {loadingContent}
      </Container>
    );
  }

  const formContent = (
    <Box sx={asModal ? { pt: 1 } : { my: 4 }}>
      {!asModal && (
        <Typography variant="h4" component="h1" gutterBottom>
          {permisoId ? 'Editar Permiso' : 'Crear Permiso'}
        </Typography>
      )}

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
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (permisoId ? 'Actualizar' : 'Crear')}
          </Button>
          {onCancel && (
            <Button variant="outlined" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
          )}
        </Box>
      </form>
    </Box>
  );

  if (asModal) {
    return formContent;
  }

  return <Container maxWidth="sm">{formContent}</Container>;
}
