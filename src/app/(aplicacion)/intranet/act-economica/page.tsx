'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Container, Typography } from '@mui/material';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { getClientDataConnect } from '@/lib/dataconnect';
import { listActEconomicas as dcListActEconomicas } from '@dataconnect/generated';
import { CustomTable } from '@/components/CustomTable';

interface ActEconomica {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  familiaId: number | null;
  especialidadId: number | null;
}

export default function ActEconomicaPage() {
  const [items, setItems] = useState<ActEconomica[]>([]);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth(app);
  const dataConnect = useMemo(() => getClientDataConnect(app), []);

  useEffect(() => {
    const fetchActEconomicas = async () => {
      try {
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }

        const result = await dcListActEconomicas(dataConnect);
        setItems(result.data.actEconomicas || []);
      } catch (err) {
        console.error('Error fetching act economicas: ', err);
        setError('No se pudo cargar ActEconomica. Verifica claims (level >= 600), queries desplegadas y conexion de Data Connect.');
      }
    };

    fetchActEconomicas();
  }, [auth, dataConnect]);

  const columns = [
    { id: 'id', label: 'ID', minWidth: 70 },
    { id: 'titulo', label: 'Titulo', minWidth: 180 },
    { id: 'descripcion', label: 'Descripcion', minWidth: 220 },
    { id: 'familiaId', label: 'Familia ID', minWidth: 100 },
    { id: 'especialidadId', label: 'Especialidad ID', minWidth: 130 },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          ActEconomica
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      </Box>

      <CustomTable
        columns={columns}
        data={items.map((item) => ({
          ...item,
          id: String(item.id),
          titulo: item.titulo ?? '-',
          descripcion: item.descripcion ?? '-',
          familiaId: item.familiaId ?? '-',
          especialidadId: item.especialidadId ?? '-',
        }))}
      />
    </Container>
  );
}
