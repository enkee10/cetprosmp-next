'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface EventoFormProps {
  eventoId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface EventoData {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  tipoEvento: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  todoElDia: boolean | null;
  ubicacion: string | null;
  color: string | null;
  estado: string | null;
  calendarioId: number;
  grupoId: number | null;
}

interface CalendarioOption {
  id: number;
  titulo: string | null;
  tipo: string | null;
  activo: boolean | null;
}

interface GrupoOption {
  id: number;
  nombreDisplay: string | null;
  turnoNombre: string | null;
  estado: string | null;
}

const EVENTO_TIPOS = ['clase', 'evaluacion', 'feriado', 'reunion', 'actividad', 'otro'];
const EVENTO_ESTADOS = ['programado', 'confirmado', 'cancelado', 'realizado'];

const toDateTimeLocal = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const getGrupoLabel = (grupo: GrupoOption) =>
  [grupo.nombreDisplay || `Grupo ${grupo.id}`, grupo.turnoNombre].filter(Boolean).join(' - ');

export function EventoForm({ eventoId, asModal = false, onSaved, onCancel }: EventoFormProps) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoEvento, setTipoEvento] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [todoElDia, setTodoElDia] = useState(false);
  const [ubicacion, setUbicacion] = useState('');
  const [color, setColor] = useState('#2e7d32');
  const [estado, setEstado] = useState('programado');
  const [calendarioId, setCalendarioId] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [calendarios, setCalendarios] = useState<CalendarioOption[]>([]);
  const [grupos, setGrupos] = useState<GrupoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEvento, setLoadingEvento] = useState(Boolean(eventoId));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const functions = getFunctions(app);
        const listCalendarios = httpsCallable<undefined, { calendarios?: CalendarioOption[] }>(
          functions,
          'listCalendarios',
        );
        const listGrupos = httpsCallable<undefined, { grupos?: GrupoOption[] }>(functions, 'listGrupos');
        const [calendariosResult, gruposResult] = await Promise.all([
          listCalendarios(),
          listGrupos(),
        ]);
        setCalendarios(calendariosResult.data.calendarios || []);
        setGrupos(gruposResult.data.grupos || []);
      } catch (err) {
        console.error('Error fetching evento options: ', err);
        setError('No se pudieron cargar las opciones para el formulario.');
      }
    };

    void fetchOptions();
  }, []);

  useEffect(() => {
    const fetchEvento = async () => {
      if (!eventoId) return;

      setLoadingEvento(true);
      try {
        const functions = getFunctions(app);
        const getEvento = httpsCallable<{ id: number }, { evento: EventoData | null }>(functions, 'getEvento');
        const result = await getEvento({ id: Number(eventoId) });
        const fetched = result.data.evento;

        if (fetched) {
          setTitulo(fetched.titulo || '');
          setDescripcion(fetched.descripcion || '');
          setTipoEvento(fetched.tipoEvento || '');
          setFechaInicio(toDateTimeLocal(fetched.fechaInicio));
          setFechaFin(toDateTimeLocal(fetched.fechaFin));
          setTodoElDia(Boolean(fetched.todoElDia));
          setUbicacion(fetched.ubicacion || '');
          setColor(fetched.color || '#2e7d32');
          setEstado(fetched.estado || 'programado');
          setCalendarioId(String(fetched.calendarioId));
          setGrupoId(fetched.grupoId != null ? String(fetched.grupoId) : '');
        }
      } catch (err) {
        console.error('Error fetching evento: ', err);
        setError('No se pudo cargar el evento para edicion.');
      } finally {
        setLoadingEvento(false);
      }
    };

    void fetchEvento();
  }, [eventoId]);

  const grupoTitleById = useMemo(
    () => new Map(grupos.map((grupo) => [String(grupo.id), getGrupoLabel(grupo)])),
    [grupos],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!calendarioId) {
      setError('Selecciona un calendario para el evento.');
      setLoading(false);
      return;
    }

    try {
      const functions = getFunctions(app);
      const createOrUpdateEvento = httpsCallable<
        {
          id?: number;
          titulo: string;
          descripcion: string;
          tipoEvento?: string | null;
          fechaInicio?: string | null;
          fechaFin?: string | null;
          todoElDia: boolean;
          ubicacion?: string | null;
          color?: string | null;
          estado?: string | null;
          calendarioId: number;
          grupoId?: number | null;
        },
        { id: number | null }
      >(functions, 'createOrUpdateEvento');

      await createOrUpdateEvento({
        id: eventoId ? Number(eventoId) : undefined,
        titulo,
        descripcion,
        tipoEvento: tipoEvento || null,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
        todoElDia,
        ubicacion: ubicacion || null,
        color: color || null,
        estado: estado || null,
        calendarioId: Number(calendarioId),
        grupoId: grupoId ? Number(grupoId) : null,
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/eventos');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling evento form: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para crear o editar eventos (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar el evento: ${message}`);
      } else {
        setError('No se pudo guardar el evento en Data Connect.');
      }
      setLoading(false);
    }
  };

  if (loadingEvento) {
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
          {eventoId ? 'Editar Evento' : 'Crear Evento'}
        </Typography>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(12, minmax(0, 1fr))' },
            '& .MuiFormControl-root': { m: 0 },
          }}
        >
          <TextField
            label="Titulo"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            fullWidth
            required
            sx={{ gridColumn: '1 / -1' }}
          />

          <FormControl fullWidth required sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}>
            <InputLabel>Calendario</InputLabel>
            <Select
              label="Calendario"
              value={calendarioId}
              onChange={(event) => setCalendarioId(String(event.target.value))}
            >
              {calendarioId && !calendarios.some((calendario) => String(calendario.id) === calendarioId) ? (
                <MenuItem value={calendarioId} disabled>
                  Calendario actual no disponible
                </MenuItem>
              ) : null}
              {calendarios.map((calendario) => (
                <MenuItem key={calendario.id} value={String(calendario.id)}>
                  {calendario.titulo || `Calendario ${calendario.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}>
            <InputLabel>Grupo</InputLabel>
            <Select label="Grupo" value={grupoId} onChange={(event) => setGrupoId(String(event.target.value))}>
              <MenuItem value="">Sin grupo</MenuItem>
              {grupoId && !grupoTitleById.has(grupoId) ? (
                <MenuItem value={grupoId} disabled>
                  Grupo actual no disponible
                </MenuItem>
              ) : null}
              {grupos.map((grupo) => (
                <MenuItem key={grupo.id} value={String(grupo.id)}>
                  {getGrupoLabel(grupo)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}>
            <InputLabel>Tipo</InputLabel>
            <Select label="Tipo" value={tipoEvento} onChange={(event) => setTipoEvento(String(event.target.value))}>
              <MenuItem value="">Sin tipo</MenuItem>
              {EVENTO_TIPOS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}>
            <InputLabel>Estado</InputLabel>
            <Select label="Estado" value={estado} onChange={(event) => setEstado(String(event.target.value))}>
              <MenuItem value="">Sin estado</MenuItem>
              {EVENTO_ESTADOS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            fullWidth
            type="color"
            sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}
          />

          <TextField
            label="Fecha inicio"
            value={fechaInicio}
            onChange={(event) => setFechaInicio(event.target.value)}
            fullWidth
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}
          />
          <TextField
            label="Fecha fin"
            value={fechaFin}
            onChange={(event) => setFechaFin(event.target.value)}
            fullWidth
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}
          />

          <FormControlLabel
            control={<Checkbox checked={todoElDia} onChange={(event) => setTodoElDia(event.target.checked)} />}
            label="Todo el dia"
            sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
          />

          <TextField
            label="Ubicacion"
            value={ubicacion}
            onChange={(event) => setUbicacion(event.target.value)}
            fullWidth
            sx={{ gridColumn: { xs: 'auto', md: 'span 9' } }}
          />

          <TextField
            label="Descripcion"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            fullWidth
            minRows={3}
            multiline
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (eventoId ? 'Actualizar' : 'Crear')}
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
