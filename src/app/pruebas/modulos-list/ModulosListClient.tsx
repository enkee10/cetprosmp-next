'use client';

import { useEffect, useState } from 'react';
import { Box, CircularProgress, Alert, Paper, List, ListItem, ListItemText } from '@mui/material';
import { getModulosTitulosFromApi, ModuloTitulo } from '@/lib/dataconnect';

export default function ModulosListClient() {
  const [modulos, setModulos] = useState<ModuloTitulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getModulosTitulosFromApi();
        setModulos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Paper elevation={0} variant="outlined">
      <List>
        {modulos.length === 0 ? (
          <ListItem><ListItemText primary="No hay módulos encontrados." /></ListItem>
        ) : (
          modulos.map((modulo, i) => (
            <ListItem key={i} divider={i < modulos.length - 1}>
              <ListItemText primary={modulo.titulo || 'Sin título'} />
            </ListItem>
          ))
        )}
      </List>
    </Paper>
  );
}
