'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Container, Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { CustomTable } from '@/components/CustomTable';
import { PermisoForm } from '@/components/intranet/permisos/PermisoForm';

interface Permiso {
  id: number;
  titulo: string | null;
  scala: number | null;
}

export default function PermisosPage() {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openPermisoModal, setOpenPermisoModal] = useState(false);
  const [editingPermisoId, setEditingPermisoId] = useState<string | null>(null);
  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchPermisos = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listPermisos = httpsCallable<undefined, { permisos?: Permiso[] }>(functions, 'listPermisos');
      const result = await listPermisos();
      setPermisos(result.data.permisos || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching permisos: ', err);
      setError('No se pudieron cargar los permisos. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesión.');
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
  }, []);

  const columns = [
    { id: 'titulo', label: 'Título', minWidth: 170 },
    { id: 'scala', label: 'Nivel (Scala)', minWidth: 100 },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestión de Permisos
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Button variant="contained" onClick={handleCreatePermiso}>
          Crear Permiso
        </Button>
      </Box>
      <CustomTable
        columns={columns}
        data={permisos.map((p) => ({ ...p, id: String(p.id) }))}
        onEdit={handleEditPermiso}
      />
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
    </Container>
  );
}
