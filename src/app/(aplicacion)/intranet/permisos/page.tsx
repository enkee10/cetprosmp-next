'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Container, Typography } from '@mui/material';
import Link from 'next/link';
import { getAuth } from 'firebase/auth';
import { getDataConnect } from 'firebase/data-connect';
import { app } from '@/lib/firebase';
import { connectorConfig, listPermisos as dcListPermisos } from '@dataconnect/generated';
import { CustomTable } from '@/components/CustomTable';

interface Permiso {
  id: number;
  titulo: string | null;
  scala: number | null;
}

export default function PermisosPage() {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth(app);
  const dataConnect = useMemo(() => getDataConnect(app, connectorConfig), []);

  useEffect(() => {
    const fetchPermisos = async () => {
      try {
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }
        const result = await dcListPermisos(dataConnect);
        setPermisos(result.data.permisos || []);
      } catch (err) {
        console.error('Error fetching permisos: ', err);
        setError('No se pudieron cargar los permisos. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesión.');
      }
    };

    fetchPermisos();
  }, [auth, dataConnect]);

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
        <Button variant="contained" component={Link} href="/intranet/permisos/new">
          Crear Permiso
        </Button>
      </Box>
      <CustomTable columns={columns} data={permisos.map((p) => ({ ...p, id: String(p.id) }))} editBasePath="/intranet/permisos" />
    </Container>
  );
}
