'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Container, TextField, Typography } from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface CarreraFormProps {
  carreraId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface CarreraData {
  id: number;
  nombre: string | null;
  codigo: string | null;
  descripcion: string | null;
  tipo: string | null;
  estado: string | null;
  actEconomicaId: number | null;
}

export function CarreraForm({ carreraId, asModal = false, onSaved, onCancel }: CarreraFormProps) {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [actEconomicaId, setActEconomicaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCarrera, setLoadingCarrera] = useState(Boolean(carreraId));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchCarrera = async () => {
      if (!carreraId) return;

      setLoadingCarrera(true);
      try {
        const functions = getFunctions(app);
        const getCarrera = httpsCallable<{ id: number }, { carrera: CarreraData | null }>(functions, 'getCarrera');
        const result = await getCarrera({ id: Number(carreraId) });
        const fetched = result.data.carrera;

        if (fetched) {
          setNombre(fetched.nombre || '');
          setCodigo(fetched.codigo || '');
          setDescripcion(fetched.descripcion || '');
          setTipo(fetched.tipo || '');
          setEstado(fetched.estado || '');
          setActEconomicaId(fetched.actEconomicaId != null ? String(fetched.actEconomicaId) : '');
        }
      } catch (err) {
        console.error('Error fetching carrera: ', err);
        setError('No se pudo cargar la carrera para edicion.');
      } finally {
        setLoadingCarrera(false);
      }
    };

    void fetchCarrera();
  }, [carreraId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(app);
      const createOrUpdateCarrera = httpsCallable<
        {
          id?: number;
          nombre: string;
          codigo: string;
          descripcion: string;
          tipo: string;
          estado: string;
          actEconomicaId?: number | null;
        },
        { id: number | null }
      >(functions, 'createOrUpdateCarrera');

      await createOrUpdateCarrera({
        id: carreraId ? Number(carreraId) : undefined,
        nombre,
        codigo,
        descripcion,
        tipo,
        estado,
        actEconomicaId: actEconomicaId ? Number(actEconomicaId) : null,
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/carreras');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling carrera form: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para crear o editar carreras (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar la carrera: ${message}`);
      } else {
        setError('No se pudo guardar la carrera en Data Connect.');
      }
      setLoading(false);
    }
  };

  if (loadingCarrera) {
    const loadingContent = (
      <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );

    if (asModal) return loadingContent;
    return <Container maxWidth="sm">{loadingContent}</Container>;
  }

  const formContent = (
    <Box sx={asModal ? { pt: 1 } : { my: 4 }}>
      {!asModal && (
        <Typography variant="h4" component="h1" gutterBottom>
          {carreraId ? 'Editar Carrera' : 'Crear Carrera'}
        </Typography>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <TextField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} fullWidth margin="normal" required />
        <TextField label="Codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} fullWidth margin="normal" />
        <TextField label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} fullWidth margin="normal" />
        <TextField label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)} fullWidth margin="normal" />
        <TextField label="Actividad Economica ID" value={actEconomicaId} onChange={(e) => setActEconomicaId(e.target.value)} fullWidth margin="normal" type="number" />
        <TextField label="Descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} fullWidth margin="normal" minRows={3} multiline />
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (carreraId ? 'Actualizar' : 'Crear')}
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

  if (asModal) return formContent;
  return <Container maxWidth="sm">{formContent}</Container>;
}
