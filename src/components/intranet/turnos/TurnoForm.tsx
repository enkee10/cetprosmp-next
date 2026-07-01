'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface TurnoFormProps {
  turnoId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface TurnoData {
  id: number;
  nombre: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  estado: string | null;
}

const toTimeInput = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(11, 16);
};

const timeToTimestamp = (value: string) => (value ? `1970-01-01T${value}:00.000Z` : null);

export function TurnoForm({ turnoId, asModal = false, onSaved, onCancel }: TurnoFormProps) {
  const [nombre, setNombre] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [estado, setEstado] = useState('activo');
  const [loading, setLoading] = useState(false);
  const [loadingTurno, setLoadingTurno] = useState(Boolean(turnoId));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchTurno = async () => {
      if (!turnoId) return;
      setLoadingTurno(true);
      try {
        const functions = getFunctions(app);
        const getTurno = httpsCallable<{ id: number }, { turno: TurnoData | null }>(functions, 'getTurno');
        const result = await getTurno({ id: Number(turnoId) });
        const fetched = result.data.turno;
        if (fetched) {
          setNombre(fetched.nombre || '');
          setHoraInicio(toTimeInput(fetched.horaInicio));
          setHoraFin(toTimeInput(fetched.horaFin));
          setEstado(fetched.estado || 'activo');
        }
      } catch (err) {
        console.error('Error fetching turno: ', err);
        setError('No se pudo cargar el turno para edicion.');
      } finally {
        setLoadingTurno(false);
      }
    };

    void fetchTurno();
  }, [turnoId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!nombre.trim()) {
      setError('El nombre del turno es obligatorio.');
      setLoading(false);
      return;
    }

    try {
      const functions = getFunctions(app);
      const createOrUpdateTurno = httpsCallable<
        {
          id?: number;
          nombre: string;
          horaInicio?: string | null;
          horaFin?: string | null;
          estado?: string | null;
        },
        { id: number | null }
      >(functions, 'createOrUpdateTurno');

      await createOrUpdateTurno({
        id: turnoId ? Number(turnoId) : undefined,
        nombre: nombre.trim(),
        horaInicio: timeToTimestamp(horaInicio),
        horaFin: timeToTimestamp(horaFin),
        estado: estado || null,
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/turnos');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling turno form: ', err);
      const message = (err as { message?: string } | null)?.message || '';
      setError(message ? `No se pudo guardar el turno: ${message}` : 'No se pudo guardar el turno.');
      setLoading(false);
    }
  };

  if (loadingTurno) {
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
          {turnoId ? 'Editar Turno' : 'Crear Turno'}
        </Typography>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(12, minmax(0, 1fr))' } }}>
          <TextField
            label="Nombre"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            fullWidth
            required
            sx={{ gridColumn: '1 / -1' }}
          />
          <TextField
            label="Hora inicio"
            value={horaInicio}
            onChange={(event) => setHoraInicio(event.target.value)}
            fullWidth
            type="time"
            InputLabelProps={{ shrink: true }}
            sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}
          />
          <TextField
            label="Hora fin"
            value={horaFin}
            onChange={(event) => setHoraFin(event.target.value)}
            fullWidth
            type="time"
            InputLabelProps={{ shrink: true }}
            sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}
          />
          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}>
            <InputLabel>Estado</InputLabel>
            <Select label="Estado" value={estado} onChange={(event) => setEstado(String(event.target.value))}>
              <MenuItem value="activo">activo</MenuItem>
              <MenuItem value="inactivo">inactivo</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (turnoId ? 'Actualizar' : 'Crear')}
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
