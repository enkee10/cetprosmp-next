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
import { getDateOnlyLocalDate, toDateOnlyInputValue } from '@/lib/dateOnly';

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
  inicio: string | null;
  fin: string | null;
  duracion: number | null;
  color: string | null;
  activo: boolean | null;
  anioId: number | null;
  semestreId: number | null;
  horarioId: number | null;
}

interface AnioOption {
  id: number;
  nombre: string | null;
  titulo: string | null;
}

interface SemestreOption {
  id: number;
  titulo: string | null;
  inicio?: string | null;
  fin?: string | null;
  anioId?: number | null;
  anio?: {
    id: number;
    nombre?: string | null;
    titulo?: string | null;
  } | null;
}

interface HorarioOption {
  id: number;
  nombre: string | null;
}

const isoToDateInput = (value: string | null | undefined) => {
  return toDateOnlyInputValue(value);
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getSemestreCodigo = (value: string | null | undefined) => {
  return String(value ?? '').trim().slice(-4);
};

const normalizeHorarioNombre = (value: string | null | undefined) =>
  String(value ?? '').trim().replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').toLowerCase();

const getDateOrNull = (value: string | null | undefined) => {
  return getDateOnlyLocalDate(value);
};

const getDatePartsOrNull = (value: string | null | undefined) => {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }

  const date = getDateOrNull(value);
  if (!date) return null;
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
};

const getDateKey = (year: number, month: number, day: number) => year * 10000 + month * 100 + day;

const getCalendarioPeriodoSuffix = (
  horarioNombre: string | null | undefined,
  duracionValue: string | number | null | undefined,
  calendarioFin: string | null | undefined,
  semestreFin: string | null | undefined,
) => {
  const duracionText = String(duracionValue ?? '').trim();

  if (duracionText === '150') {
    const calendarioFinParts = getDatePartsOrNull(calendarioFin);
    if (!calendarioFinParts) return '';

    const calendarioFinKey = getDateKey(
      calendarioFinParts.year,
      calendarioFinParts.month,
      calendarioFinParts.day,
    );
    const cortes = [
      { key: getDateKey(calendarioFinParts.year, 5, 30), suffix: '-1' },
      { key: getDateKey(calendarioFinParts.year, 7, 30), suffix: '-2' },
      { key: getDateKey(calendarioFinParts.year, 10, 30), suffix: '-3' },
      { key: getDateKey(calendarioFinParts.year, 12, 30), suffix: '-4' },
    ];

    return cortes.find((corte) => calendarioFinKey < corte.key)?.suffix || '';
  }

  if (normalizeHorarioNombre(horarioNombre) !== 'lun - vie') return '';
  if (duracionText !== '300') return '';

  const calendarioFinDate = getDateOrNull(calendarioFin);
  const semestreFinDate = getDateOrNull(semestreFin);
  if (!calendarioFinDate || !semestreFinDate) return '-2';

  const limitePrimerBloque = new Date(semestreFinDate.getTime() - 30 * MS_PER_DAY);
  return calendarioFinDate.getTime() < limitePrimerBloque.getTime() ? '-1' : '-2';
};

const isSemestreVigente = (semestre: SemestreOption, date: Date) => {
  if (!semestre.inicio || !semestre.fin) return false;
  const inicio = new Date(semestre.inicio);
  const fin = new Date(semestre.fin);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return false;

  const finInclusivo = new Date(fin);
  const endsAtLocalMidnight =
    finInclusivo.getHours() === 0 &&
    finInclusivo.getMinutes() === 0 &&
    finInclusivo.getSeconds() === 0 &&
    finInclusivo.getMilliseconds() === 0;
  const endsAtUtcMidnight =
    finInclusivo.getUTCHours() === 0 &&
    finInclusivo.getUTCMinutes() === 0 &&
    finInclusivo.getUTCSeconds() === 0 &&
    finInclusivo.getUTCMilliseconds() === 0;

  if (endsAtUtcMidnight) {
    finInclusivo.setUTCHours(23, 59, 59, 999);
  } else if (endsAtLocalMidnight) {
    finInclusivo.setHours(23, 59, 59, 999);
  }

  return inicio.getTime() <= date.getTime() && date.getTime() <= finInclusivo.getTime();
};

const getSemestreAnioId = (semestre: SemestreOption | null | undefined) => semestre?.anioId ?? semestre?.anio?.id ?? null;

export function CalendarioForm({ calendarioId, asModal = false, onSaved, onCancel }: CalendarioFormProps) {
  const [descripcion, setDescripcion] = useState('');
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [duracion, setDuracion] = useState('');
  const [color, setColor] = useState('#1976d2');
  const [activo, setActivo] = useState(true);
  const [anioId, setAnioId] = useState('');
  const [semestreId, setSemestreId] = useState('');
  const [horarioId, setHorarioId] = useState('');
  const [anios, setAnios] = useState<AnioOption[]>([]);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [horarios, setHorarios] = useState<HorarioOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCalendario, setLoadingCalendario] = useState(Boolean(calendarioId));
  const [autoPeriodoAplicado, setAutoPeriodoAplicado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const functions = getFunctions(app);
        const listAnios = httpsCallable<undefined, { anios?: AnioOption[] }>(functions, 'listAnios');
        const listSemestres = httpsCallable<undefined, { semestres?: SemestreOption[] }>(functions, 'listSemestres');
        const listHorarios = httpsCallable<undefined, { horarios?: HorarioOption[] }>(functions, 'listHorarios');
        const [aniosResult, semestresResult, horariosResult] = await Promise.all([
          listAnios(),
          listSemestres(),
          listHorarios(),
        ]);
        setAnios(aniosResult.data.anios || []);
        setSemestres(semestresResult.data.semestres || []);
        setHorarios(
          (horariosResult.data.horarios || [])
            .slice()
            .sort((a, b) => String(a.nombre ?? '').localeCompare(String(b.nombre ?? ''), 'es', { numeric: true })),
        );
      } catch (err) {
        console.error('Error fetching calendario options: ', err);
        setError('No se pudieron cargar los años para el formulario.');
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
          setDescripcion(fetched.descripcion || '');
          setInicio(isoToDateInput(fetched.inicio));
          setFin(isoToDateInput(fetched.fin));
          setDuracion(fetched.duracion != null ? String(fetched.duracion) : '');
          setColor(fetched.color || '#1976d2');
          setActivo(fetched.activo ?? true);
          setAnioId(fetched.anioId != null ? String(fetched.anioId) : '');
          setSemestreId(fetched.semestreId != null ? String(fetched.semestreId) : '');
          setHorarioId(fetched.horarioId != null ? String(fetched.horarioId) : '');
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

  const semestreVigente = useMemo(
    () => (!calendarioId ? semestres.find((semestre) => isSemestreVigente(semestre, new Date())) || null : null),
    [calendarioId, semestres],
  );

  useEffect(() => {
    if (calendarioId || autoPeriodoAplicado || !semestreVigente) return;
    const vigenteAnioId = getSemestreAnioId(semestreVigente);
    if (vigenteAnioId == null) return;

    setAnioId(String(vigenteAnioId));
    setSemestreId(String(semestreVigente.id));
    setAutoPeriodoAplicado(true);
  }, [autoPeriodoAplicado, calendarioId, semestreVigente]);

  useEffect(() => {
    if (calendarioId || semestreId || !anioId || !semestreVigente) return;
    const vigenteAnioId = getSemestreAnioId(semestreVigente);
    if (vigenteAnioId != null && String(vigenteAnioId) === anioId) {
      setSemestreId(String(semestreVigente.id));
    }
  }, [anioId, calendarioId, semestreId, semestreVigente]);

  useEffect(() => {
    if (!semestreId) return;
    const semestre = semestres.find((item) => String(item.id) === semestreId);
    const selectedAnioId = getSemestreAnioId(semestre);
    if (selectedAnioId != null && anioId !== String(selectedAnioId)) {
      setAnioId(String(selectedAnioId));
    }
  }, [anioId, semestreId, semestres]);

  useEffect(() => {
    if (!anioId || !semestreId) return;
    const semestre = semestres.find((item) => String(item.id) === semestreId);
    const selectedAnioId = getSemestreAnioId(semestre);
    if (semestre && String(selectedAnioId ?? '') !== anioId) {
      setSemestreId('');
    }
  }, [anioId, semestreId, semestres]);

  const filteredSemestres = anioId
    ? semestres.filter((semestre) => String(getSemestreAnioId(semestre) ?? '') === anioId)
    : [];
  const selectedSemestre = semestres.find((semestre) => String(semestre.id) === semestreId) || null;
  const selectedHorario = horarios.find((horario) => String(horario.id) === horarioId) || null;
  const titulo = useMemo(
    () => {
      const duracionText = duracion.trim();
      const horarioText = selectedHorario?.nombre?.trim() || '';
      const semestreCodigo = getSemestreCodigo(selectedSemestre?.titulo);
      const semestreText = semestreCodigo
        ? `(${semestreCodigo}${getCalendarioPeriodoSuffix(horarioText, duracionText, fin, selectedSemestre?.fin)})`
        : '';

      return [
        duracionText,
        duracionText ? 'horas' : '',
        horarioText,
        semestreText,
      ].filter(Boolean).join(' ');
    },
    [duracion, fin, selectedHorario, selectedSemestre],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!semestreId || !horarioId || !duracion.trim()) {
      setError('Selecciona semestre, horario y duracion para formar el titulo del calendario.');
      setLoading(false);
      return;
    }

    try {
      const functions = getFunctions(app);
      const createOrUpdateCalendario = httpsCallable<
        {
          id?: number;
          titulo: string;
          descripcion: string;
          inicio?: string | null;
          fin?: string | null;
          duracion?: number | null;
          color?: string | null;
          activo: boolean;
          anioId?: number | null;
          semestreId?: number | null;
          horarioId?: number | null;
        },
        { id: number | null }
      >(functions, 'createOrUpdateCalendario');

      await createOrUpdateCalendario({
        id: calendarioId ? Number(calendarioId) : undefined,
        titulo,
        descripcion,
        inicio: inicio || null,
        fin: fin || null,
        duracion: duracion ? Number(duracion) : null,
        color: color || null,
        activo,
        anioId: anioId ? Number(anioId) : null,
        semestreId: semestreId ? Number(semestreId) : null,
        horarioId: horarioId ? Number(horarioId) : null,
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
            fullWidth
            required
            disabled
            sx={{ gridColumn: '1 / -1' }}
          />

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}>
            <InputLabel>Año</InputLabel>
            <Select
              label="Año"
              value={anioId}
              onChange={(event) => setAnioId(String(event.target.value))}
            >
              <MenuItem value="">Sin año</MenuItem>
              {anioId && !anios.some((anio) => String(anio.id) === anioId) ? (
                <MenuItem value={anioId} disabled>
                  Año actual no disponible
                </MenuItem>
              ) : null}
              {anios.map((anio) => (
                <MenuItem key={anio.id} value={String(anio.id)}>
                  {anio.nombre || anio.titulo || `Año ${anio.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}>
            <InputLabel>Semestre</InputLabel>
            <Select
              label="Semestre"
              value={semestreId}
              onChange={(event) => setSemestreId(String(event.target.value))}
              disabled={!anioId}
            >
              <MenuItem value="">{anioId ? 'Sin semestre' : 'Selecciona un año primero'}</MenuItem>
              {semestreId && !filteredSemestres.some((semestre) => String(semestre.id) === semestreId) ? (
                <MenuItem value={semestreId} disabled>
                  Semestre actual no disponible
                </MenuItem>
              ) : null}
              {filteredSemestres.map((semestre) => (
                <MenuItem key={semestre.id} value={String(semestre.id)}>
                  {semestre.titulo || `Semestre ${semestre.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Inicio"
            value={inicio}
            onChange={(event) => setInicio(event.target.value)}
            fullWidth
            type="date"
            InputLabelProps={{ shrink: true }}
            sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}
          />

          <TextField
            label="Fin"
            value={fin}
            onChange={(event) => setFin(event.target.value)}
            fullWidth
            type="date"
            InputLabelProps={{ shrink: true }}
            sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}
          />

          <TextField
            label="Duracion"
            value={duracion}
            onChange={(event) => setDuracion(event.target.value)}
            fullWidth
            type="number"
            sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}
          />

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}>
            <InputLabel>Horario</InputLabel>
            <Select
              label="Horario"
              value={horarioId}
              onChange={(event) => setHorarioId(String(event.target.value))}
            >
              <MenuItem value="">Sin horario</MenuItem>
              {horarioId && !horarios.some((horario) => String(horario.id) === horarioId) ? (
                <MenuItem value={horarioId} disabled>
                  Horario actual no disponible
                </MenuItem>
              ) : null}
              {horarios.map((horario) => (
                <MenuItem key={horario.id} value={String(horario.id)}>
                  {horario.nombre || `Horario ${horario.id}`}
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

          <FormControlLabel
            control={<Checkbox checked={activo} onChange={(event) => setActivo(event.target.checked)} />}
            label="Activo"
            sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}
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
