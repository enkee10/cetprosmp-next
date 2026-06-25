'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import CoverImageField from '@/components/intranet/academico/CoverImageField';

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
  nivel: string | null;
  imagenPortadaUrl: string | null;
  actEconomicaId: number | null;
  tipoCarreraId: number | null;
}

interface ActEconomicaOption {
  id: number;
  titulo: string | null;
}

interface TipoCarreraOption {
  id: number;
  nombre: string | null;
}

const NIVEL_OPTIONS = ['Auxiliar Técnico', 'Técnico', 'Profesional'];

export function CarreraForm({ carreraId, asModal = false, onSaved, onCancel }: CarreraFormProps) {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [nivel, setNivel] = useState('');
  const [imagenPortadaUrl, setImagenPortadaUrl] = useState('');
  const [actEconomicaId, setActEconomicaId] = useState('');
  const [tipoCarreraId, setTipoCarreraId] = useState('');
  const [actEconomicas, setActEconomicas] = useState<ActEconomicaOption[]>([]);
  const [tiposCarrera, setTiposCarrera] = useState<TipoCarreraOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCarrera, setLoadingCarrera] = useState(Boolean(carreraId));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const functions = getFunctions(app);
        const listActEconomicas = httpsCallable<undefined, { actEconomicas?: ActEconomicaOption[] }>(
          functions,
          'listActEconomicas',
        );
        const listTiposCarrera = httpsCallable<undefined, { tiposCarrera?: TipoCarreraOption[] }>(
          functions,
          'listTiposCarrera',
        );
        const [actEconomicasResult, tiposCarreraResult] = await Promise.all([
          listActEconomicas(),
          listTiposCarrera(),
        ]);
        setActEconomicas(actEconomicasResult.data.actEconomicas || []);
        setTiposCarrera(tiposCarreraResult.data.tiposCarrera || []);
      } catch (err) {
        console.error('Error fetching carrera options: ', err);
        setError('No se pudieron cargar las opciones relacionadas para el formulario.');
      }
    };

    void fetchOptions();
  }, []);

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
          setNivel(fetched.nivel || '');
          setImagenPortadaUrl(fetched.imagenPortadaUrl || '');
          setActEconomicaId(fetched.actEconomicaId != null ? String(fetched.actEconomicaId) : '');
          setTipoCarreraId(fetched.tipoCarreraId != null ? String(fetched.tipoCarreraId) : '');
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
          nivel?: string | null;
          imagenPortadaUrl?: string | null;
          actEconomicaId?: number | null;
          tipoCarreraId?: number | null;
        },
        { id: number | null }
      >(functions, 'createOrUpdateCarrera');

      await createOrUpdateCarrera({
        id: carreraId ? Number(carreraId) : undefined,
        nombre,
        codigo,
        descripcion,
        nivel: nivel || null,
        imagenPortadaUrl: imagenPortadaUrl.trim() || null,
        actEconomicaId: actEconomicaId ? Number(actEconomicaId) : null,
        tipoCarreraId: tipoCarreraId ? Number(tipoCarreraId) : null,
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
        <FormControl fullWidth margin="normal">
          <InputLabel>Nivel</InputLabel>
          <Select
            label="Nivel"
            value={nivel}
            onChange={(event) => setNivel(String(event.target.value))}
          >
            <MenuItem value="">Sin nivel</MenuItem>
            {nivel && !NIVEL_OPTIONS.includes(nivel) ? (
              <MenuItem value={nivel} disabled>
                Nivel actual no disponible
              </MenuItem>
            ) : null}
            {NIVEL_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>Tipo de Carrera</InputLabel>
          <Select
            label="Tipo de Carrera"
            value={tipoCarreraId}
            onChange={(event) => setTipoCarreraId(String(event.target.value))}
          >
            <MenuItem value="">Sin tipo</MenuItem>
            {tipoCarreraId && !tiposCarrera.some((tipoCarrera) => String(tipoCarrera.id) === tipoCarreraId) ? (
              <MenuItem value={tipoCarreraId} disabled>
                Tipo actual no disponible
              </MenuItem>
            ) : null}
            {tiposCarrera.map((tipoCarrera) => (
              <MenuItem key={tipoCarrera.id} value={String(tipoCarrera.id)}>
                {tipoCarrera.nombre || `Tipo ${tipoCarrera.id}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>Actividad Economica</InputLabel>
          <Select
            label="Actividad Economica"
            value={actEconomicaId}
            onChange={(event) => setActEconomicaId(String(event.target.value))}
          >
            <MenuItem value="">Sin actividad economica</MenuItem>
            {actEconomicaId && !actEconomicas.some((actEconomica) => String(actEconomica.id) === actEconomicaId) ? (
              <MenuItem value={actEconomicaId} disabled>
                Actividad economica actual no disponible
              </MenuItem>
            ) : null}
            {actEconomicas.map((actEconomica) => (
              <MenuItem key={actEconomica.id} value={String(actEconomica.id)}>
                {actEconomica.titulo || `Actividad economica ${actEconomica.id}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <CoverImageField
          value={imagenPortadaUrl}
          onChange={setImagenPortadaUrl}
          storageFolder="carreras"
          disabled={loading}
        />
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
