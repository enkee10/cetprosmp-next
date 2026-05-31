'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Container, Typography, Box, CircularProgress, TextField } from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface RoleFormProps {
  role?: {
    id: string;
    titulo: string;
    scala: number;
  } | null;
  roleId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface RoleData {
  id: number;
  titulo: string | null;
  scala: number | null;
}

export function RoleForm({ role, roleId, asModal = false, onSaved, onCancel }: RoleFormProps) {
  const [titulo, setTitulo] = useState(role ? role.titulo : '');
  const [scala, setScala] = useState(role ? role.scala.toString() : '');
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState(Boolean(roleId && !role));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchRole = async () => {
      if (!roleId || role) return;

      setLoadingRole(true);
      try {
        const functions = getFunctions(app);
        const getRole = httpsCallable<{ id: number }, { role: RoleData | null }>(functions, 'getRole');
        const result = await getRole({ id: Number(roleId) });
        const fetched = result.data.role;

        if (fetched) {
          setTitulo(fetched.titulo || '');
          setScala(fetched.scala !== null && fetched.scala !== undefined ? String(fetched.scala) : '');
        }
      } catch (err) {
        console.error('Error fetching role: ', err);
        setError('No se pudo cargar el rol para edición.');
      } finally {
        setLoadingRole(false);
      }
    };

    fetchRole();
  }, [roleId, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(app);
      const createOrUpdateRole = httpsCallable<{ id?: number; titulo: string; scala: number }, { id: number | null }>(
        functions,
        'createOrUpdateRole',
      );

      await createOrUpdateRole({
        id: roleId ? Number(roleId) : undefined,
        titulo,
        scala: parseInt(scala, 10),
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/roles');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling role form: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para crear o editar roles (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar el rol: ${message}`);
      } else {
        setError('No se pudo guardar el rol en Data Connect.');
      }
      setLoading(false);
    }
  };

  if (loadingRole) {
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
          {roleId ? 'Editar Rol' : 'Crear Rol'}
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
            {loading ? <CircularProgress size={24} /> : (roleId ? 'Actualizar' : 'Crear')}
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
