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

interface ActEconomicaFormProps {
  actEconomica?: {
    id: string;
    titulo: string;
    descripcion: string;
    imagenPortadaUrl?: string | null;
    familiaId: string;
    especialidadId: string;
  } | null;
  actEconomicaId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface ActEconomicaData {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  imagenPortadaUrl: string | null;
  familiaId: number | null;
  especialidadId: number | null;
}

interface FamiliaOption {
  id: number;
  titulo: string | null;
}

interface EspecialidadOption {
  id: number;
  titulo: string | null;
}

export function ActEconomicaForm({
  actEconomica,
  actEconomicaId,
  asModal = false,
  onSaved,
  onCancel,
}: ActEconomicaFormProps) {
  const [titulo, setTitulo] = useState(actEconomica ? actEconomica.titulo : '');
  const [descripcion, setDescripcion] = useState(actEconomica ? actEconomica.descripcion : '');
  const [imagenPortadaUrl, setImagenPortadaUrl] = useState(actEconomica?.imagenPortadaUrl || '');
  const [familiaId, setFamiliaId] = useState(actEconomica ? actEconomica.familiaId : '');
  const [especialidadId, setEspecialidadId] = useState(actEconomica ? actEconomica.especialidadId : '');
  const [familias, setFamilias] = useState<FamiliaOption[]>([]);
  const [especialidades, setEspecialidades] = useState<EspecialidadOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingActEconomica, setLoadingActEconomica] = useState(Boolean(actEconomicaId && !actEconomica));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const functions = getFunctions(app);
        const listFamilias = httpsCallable<undefined, { familias?: FamiliaOption[] }>(functions, 'listFamilias');
        const listEspecialidades = httpsCallable<undefined, { especialidades?: EspecialidadOption[] }>(
          functions,
          'listEspecialidades',
        );
        const [familiasResult, especialidadesResult] = await Promise.all([
          listFamilias(),
          listEspecialidades(),
        ]);
        setFamilias(familiasResult.data.familias || []);
        setEspecialidades(especialidadesResult.data.especialidades || []);
      } catch (err) {
        console.error('Error fetching act economica options: ', err);
        setError('No se pudieron cargar las opciones relacionadas para el formulario.');
      }
    };

    void fetchOptions();
  }, []);

  useEffect(() => {
    const fetchActEconomica = async () => {
      if (!actEconomicaId || actEconomica) return;

      setLoadingActEconomica(true);
      try {
        const functions = getFunctions(app);
        const getActEconomica = httpsCallable<{ id: number }, { actEconomica: ActEconomicaData | null }>(
          functions,
          'getActEconomica',
        );
        const result = await getActEconomica({ id: Number(actEconomicaId) });
        const fetched = result.data.actEconomica;

        if (fetched) {
          setTitulo(fetched.titulo || '');
          setDescripcion(fetched.descripcion || '');
          setImagenPortadaUrl(fetched.imagenPortadaUrl || '');
          setFamiliaId(fetched.familiaId != null ? String(fetched.familiaId) : '');
          setEspecialidadId(fetched.especialidadId != null ? String(fetched.especialidadId) : '');
        }
      } catch (err) {
        console.error('Error fetching act economica: ', err);
        setError('No se pudo cargar la actividad economica para edicion.');
      } finally {
        setLoadingActEconomica(false);
      }
    };

    void fetchActEconomica();
  }, [actEconomicaId, actEconomica]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(app);
      const createOrUpdateActEconomica = httpsCallable<
        {
          id?: number;
          titulo: string;
          descripcion: string;
          imagenPortadaUrl?: string | null;
          familiaId?: number | null;
          especialidadId?: number | null;
        },
        { id: number | null }
      >(functions, 'createOrUpdateActEconomica');

      await createOrUpdateActEconomica({
        id: actEconomicaId ? Number(actEconomicaId) : undefined,
        titulo,
        descripcion,
        imagenPortadaUrl: imagenPortadaUrl.trim() || null,
        familiaId: familiaId ? Number(familiaId) : null,
        especialidadId: especialidadId ? Number(especialidadId) : null,
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/act-economicas');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling act economica form: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para crear o editar actividades economicas (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar la actividad economica: ${message}`);
      } else {
        setError('No se pudo guardar la actividad economica en Data Connect.');
      }
      setLoading(false);
    }
  };

  if (loadingActEconomica) {
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
          {actEconomicaId ? 'Editar Actividad Economica' : 'Crear Actividad Economica'}
        </Typography>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <TextField
          label="Titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          fullWidth
          margin="normal"
          minRows={3}
          multiline
        />
        <CoverImageField
          value={imagenPortadaUrl}
          onChange={setImagenPortadaUrl}
          storageFolder="act-economicas"
          disabled={loading}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Familia</InputLabel>
          <Select
            label="Familia"
            value={familiaId}
            onChange={(event) => setFamiliaId(String(event.target.value))}
          >
            <MenuItem value="">Sin familia</MenuItem>
            {familiaId && !familias.some((familia) => String(familia.id) === familiaId) ? (
              <MenuItem value={familiaId} disabled>
                Familia actual no disponible
              </MenuItem>
            ) : null}
            {familias.map((familia) => (
              <MenuItem key={familia.id} value={String(familia.id)}>
                {familia.titulo || `Familia ${familia.id}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>Especialidad</InputLabel>
          <Select
            label="Especialidad"
            value={especialidadId}
            onChange={(event) => setEspecialidadId(String(event.target.value))}
          >
            <MenuItem value="">Sin especialidad</MenuItem>
            {especialidadId && !especialidades.some((especialidad) => String(especialidad.id) === especialidadId) ? (
              <MenuItem value={especialidadId} disabled>
                Especialidad actual no disponible
              </MenuItem>
            ) : null}
            {especialidades.map((especialidad) => (
              <MenuItem key={especialidad.id} value={String(especialidad.id)}>
                {especialidad.titulo || `Especialidad ${especialidad.id}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (actEconomicaId ? 'Actualizar' : 'Crear')}
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
