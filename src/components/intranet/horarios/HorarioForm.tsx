'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface HorarioFormProps {
  horarioId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface HorarioData {
  id: number;
  nombre: string | null;
  descripcion: string | null;
  diasSemana: string | null;
  activo: boolean | null;
}

const DIAS_SEMANA = [
  { value: '1', label: 'Lun' },
  { value: '2', label: 'Mar' },
  { value: '3', label: 'Mie' },
  { value: '4', label: 'Jue' },
  { value: '5', label: 'Vie' },
  { value: '6', label: 'Sab' },
  { value: '0', label: 'Dom' },
];

const LUNES_A_VIERNES = ['1', '2', '3', '4', '5'];

const hasOnlyLunesAViernes = (diasSemana: string[]) =>
  diasSemana.length === LUNES_A_VIERNES.length && LUNES_A_VIERNES.every((dia) => diasSemana.includes(dia));

const buildNombreHorario = (diasSemana: string[]) => {
  if (hasOnlyLunesAViernes(diasSemana)) return 'Lun - Vie';

  return DIAS_SEMANA
    .filter((dia) => diasSemana.includes(dia.value))
    .map((dia) => {
      const shouldMarkViernes = dia.value === '5' && diasSemana.length === 3;
      if (shouldMarkViernes) return `@${dia.label}`;
      return dia.label;
    })
    .join(', ');
};

export function HorarioForm({ horarioId, asModal = false, onSaved, onCancel }: HorarioFormProps) {
  const [descripcion, setDescripcion] = useState('');
  const [diasSemana, setDiasSemana] = useState<string[]>([]);
  const [activo, setActivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingHorario, setLoadingHorario] = useState(Boolean(horarioId));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchHorario = async () => {
      if (!horarioId) return;
      setLoadingHorario(true);
      try {
        const functions = getFunctions(app);
        const getHorario = httpsCallable<{ id: number }, { horario: HorarioData | null }>(functions, 'getHorario');
        const result = await getHorario({ id: Number(horarioId) });
        const fetched = result.data.horario;
        if (fetched) {
          setDescripcion(fetched.descripcion || '');
          setDiasSemana((fetched.diasSemana || '').split(',').filter(Boolean));
          setActivo(fetched.activo !== false);
        }
      } catch (err) {
        console.error('Error fetching horario: ', err);
        setError('No se pudo cargar el horario para edicion.');
      } finally {
        setLoadingHorario(false);
      }
    };

    void fetchHorario();
  }, [horarioId]);

  const nombre = useMemo(
    () => buildNombreHorario(diasSemana),
    [diasSemana],
  );

  const toggleDia = (value: string) => {
    setDiasSemana((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value].sort(),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (diasSemana.length === 0) {
      setError('Selecciona al menos un dia.');
      setLoading(false);
      return;
    }

    try {
      const functions = getFunctions(app);
      const createOrUpdateHorario = httpsCallable<
        {
          id?: number;
          nombre: string;
          descripcion?: string | null;
          diasSemana: string;
          activo: boolean;
        },
        { id: number | null }
      >(functions, 'createOrUpdateHorario');

      await createOrUpdateHorario({
        id: horarioId ? Number(horarioId) : undefined,
        nombre,
        descripcion: descripcion || null,
        diasSemana: diasSemana.join(','),
        activo,
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/horarios');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling horario form: ', err);
      const message = (err as { message?: string } | null)?.message || '';
      setError(message ? `No se pudo guardar el horario: ${message}` : 'No se pudo guardar el horario.');
      setLoading(false);
    }
  };

  if (loadingHorario) {
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
          {horarioId ? 'Editar Horario' : 'Crear Horario'}
        </Typography>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(12, minmax(0, 1fr))' } }}>
          <TextField
            label="Nombre"
            value={nombre}
            fullWidth
            required
            disabled
            sx={{ gridColumn: '1 / -1' }}
          />
          <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {DIAS_SEMANA.map((dia) => (
              <FormControlLabel
                key={dia.value}
                control={<Checkbox checked={diasSemana.includes(dia.value)} onChange={() => toggleDia(dia.value)} />}
                label={dia.label}
              />
            ))}
          </Box>
          <TextField
            label="Descripcion"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            fullWidth
            multiline
            minRows={3}
            sx={{ gridColumn: '1 / -1' }}
          />
          <FormControlLabel
            control={<Checkbox checked={activo} onChange={(event) => setActivo(event.target.checked)} />}
            label="Activo"
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (horarioId ? 'Actualizar' : 'Crear')}
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
