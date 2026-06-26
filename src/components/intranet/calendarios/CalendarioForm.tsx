'use client';

import { useEffect, useState } from 'react';
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

interface CalendarioFormProps {
  calendarioId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface CalendarioData {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  fechaIni: string | null;
  fechaFin: string | null;
  tipo: string | null;
  color: string | null;
  activo: boolean | null;
  archivado: boolean | null;
  semestreId: number | null;
}

interface SemestreOption {
  id: number;
  titulo: string | null;
  archivado: boolean | null;
}

const CALENDARIO_TIPOS = ['academico', 'institucional', 'clases', 'evaluaciones', 'otros'];

const toDateTimeLocal = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

export function CalendarioForm({ calendarioId, asModal = false, onSaved, onCancel }: CalendarioFormProps) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaIni, setFechaIni] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tipo, setTipo] = useState('');
  const [color, setColor] = useState('#1976d2');
  const [activo, setActivo] = useState(true);
  const [archivado, setArchivado] = useState(false);
  const [semestreId, setSemestreId] = useState('');
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCalendario, setLoadingCalendario] = useState(Boolean(calendarioId));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const functions = getFunctions(app);
        const listSemestres = httpsCallable<undefined, { semestres?: SemestreOption[] }>(functions, 'listSemestres');
        const result = await listSemestres();
        setSemestres(result.data.semestres || []);
      } catch (err) {
        console.error('Error fetching calendario options: ', err);
        setError('No se pudieron cargar los semestres para el formulario.');
      }
    };

    void fetchOptions();
  }, []);

  useEffect(() => {
    const fetchCalendario = async () => {
      if (!calendarioId) return;

      setLoadingCalendario(true);
      try {
        const functions = getFunctions(app);
        const getCalendario = httpsCallable<{ id: number }, { calendario: CalendarioData | null }>(
          functions,
          'getCalendario',
        );
        const result = await getCalendario({ id: Number(calendarioId) });
        const fetched = result.data.calendario;

        if (fetched) {
          setTitulo(fetched.titulo || '');
          setDescripcion(fetched.descripcion || '');
          setFechaIni(toDateTimeLocal(fetched.fechaIni));
          setFechaFin(toDateTimeLocal(fetched.fechaFin));
          setTipo(fetched.tipo || '');
          setColor(fetched.color || '#1976d2');
          setActivo(fetched.activo ?? true);
          setArchivado(Boolean(fetched.archivado));
          setSemestreId(fetched.semestreId != null ? String(fetched.semestreId) : '');
        }
      } catch (err) {
        console.error('Error fetching calendario: ', err);
        setError('No se pudo cargar el calendario para edicion.');
      } finally {
        setLoadingCalendario(false);
      }
    };

    void fetchCalendario();
  }, [calendarioId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(app);
      const createOrUpdateCalendario = httpsCallable<
        {
          id?: number;
          titulo: string;
          descripcion: string;
          fechaIni?: string | null;
          fechaFin?: string | null;
          tipo?: string | null;
          color?: string | null;
          activo: boolean;
          archivado: boolean;
          semestreId?: number | null;
        },
        { id: number | null }
      >(functions, 'createOrUpdateCalendario');

      await createOrUpdateCalendario({
        id: calendarioId ? Number(calendarioId) : undefined,
        titulo,
        descripcion,
        fechaIni: fechaIni || null,
        fechaFin: fechaFin || null,
        tipo: tipo || null,
        color: color || null,
        activo,
        archivado,
        semestreId: semestreId ? Number(semestreId) : null,
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/calendarios');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling calendario form: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para crear o editar calendarios (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar el calendario: ${message}`);
      } else {
        setError('No se pudo guardar el calendario en Data Connect.');
      }
      setLoading(false);
    }
  };

  if (loadingCalendario) {
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
          {calendarioId ? 'Editar Calendario' : 'Crear Calendario'}
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

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}>
            <InputLabel>Semestre</InputLabel>
            <Select
              label="Semestre"
              value={semestreId}
              onChange={(event) => setSemestreId(String(event.target.value))}
            >
              <MenuItem value="">Sin semestre</MenuItem>
              {semestreId && !semestres.some((semestre) => String(semestre.id) === semestreId) ? (
                <MenuItem value={semestreId} disabled>
                  Semestre actual no disponible
                </MenuItem>
              ) : null}
              {semestres.map((semestre) => (
                <MenuItem key={semestre.id} value={String(semestre.id)}>
                  {semestre.titulo || `Semestre ${semestre.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}>
            <InputLabel>Tipo</InputLabel>
            <Select label="Tipo" value={tipo} onChange={(event) => setTipo(String(event.target.value))}>
              <MenuItem value="">Sin tipo</MenuItem>
              {CALENDARIO_TIPOS.map((option) => (
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
            sx={{ gridColumn: { xs: 'auto', md: 'span 2' } }}
          />

          <TextField
            label="Fecha inicio"
            value={fechaIni}
            onChange={(event) => setFechaIni(event.target.value)}
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
            control={<Checkbox checked={activo} onChange={(event) => setActivo(event.target.checked)} />}
            label="Activo"
            sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
          />
          <FormControlLabel
            control={<Checkbox checked={archivado} onChange={(event) => setArchivado(event.target.checked)} />}
            label="Archivado"
            sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
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
            {loading ? <CircularProgress size={24} /> : (calendarioId ? 'Actualizar' : 'Crear')}
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
