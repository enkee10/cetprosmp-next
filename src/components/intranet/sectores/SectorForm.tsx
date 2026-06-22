'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Container, TextField, Typography } from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface SectorFormProps {
  sector?: {
    id: string;
    titulo: string;
    descripcion: string;
  } | null;
  sectorId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface SectorData {
  id: number;
  titulo: string | null;
  descripcion: string | null;
}

export function SectorForm({ sector, sectorId, asModal = false, onSaved, onCancel }: SectorFormProps) {
  const [titulo, setTitulo] = useState(sector ? sector.titulo : '');
  const [descripcion, setDescripcion] = useState(sector ? sector.descripcion : '');
  const [loading, setLoading] = useState(false);
  const [loadingSector, setLoadingSector] = useState(Boolean(sectorId && !sector));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSector = async () => {
      if (!sectorId || sector) return;

      setLoadingSector(true);
      try {
        const functions = getFunctions(app);
        const getSector = httpsCallable<{ id: number }, { sector: SectorData | null }>(functions, 'getSector');
        const result = await getSector({ id: Number(sectorId) });
        const fetched = result.data.sector;

        if (fetched) {
          setTitulo(fetched.titulo || '');
          setDescripcion(fetched.descripcion || '');
        }
      } catch (err) {
        console.error('Error fetching sector: ', err);
        setError('No se pudo cargar el sector para edición.');
      } finally {
        setLoadingSector(false);
      }
    };

    void fetchSector();
  }, [sectorId, sector]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(app);
      const createOrUpdateSector = httpsCallable<
        { id?: number; titulo: string; descripcion: string },
        { id: number | null }
      >(functions, 'createOrUpdateSector');

      await createOrUpdateSector({
        id: sectorId ? Number(sectorId) : undefined,
        titulo,
        descripcion,
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/sectores');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling sector form: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para crear o editar sectores (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar el sector: ${message}`);
      } else {
        setError('No se pudo guardar el sector en Data Connect.');
      }
      setLoading(false);
    }
  };

  if (loadingSector) {
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
          {sectorId ? 'Editar Sector' : 'Crear Sector'}
        </Typography>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <TextField
          label="Título del Sector"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          fullWidth
          margin="normal"
          minRows={3}
          multiline
        />
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (sectorId ? 'Actualizar' : 'Crear')}
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
