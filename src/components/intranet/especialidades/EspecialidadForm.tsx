'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  TextField,
  Typography,
} from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import CoverImageField from '@/components/intranet/academico/CoverImageField';

interface EspecialidadFormProps {
  especialidad?: {
    id: string;
    titulo: string;
    tituloComercial: string;
    descripcion: string;
    descripcion2: string;
    slug: string;
    imagenPortadaUrl?: string | null;
    orden?: string;
  } | null;
  especialidadId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface EspecialidadData {
  id: number;
  titulo: string | null;
  tituloComercial: string | null;
  orden: number | null;
  descripcion: string | null;
  descripcion2: string | null;
  slug: string | null;
  imagenPortadaUrl: string | null;
}

export function EspecialidadForm({
  especialidad,
  especialidadId,
  asModal = false,
  onSaved,
  onCancel,
}: EspecialidadFormProps) {
  const [titulo, setTitulo] = useState(especialidad ? especialidad.titulo : '');
  const [tituloComercial, setTituloComercial] = useState(especialidad ? especialidad.tituloComercial : '');
  const [orden, setOrden] = useState(especialidad?.orden || '');
  const [descripcion, setDescripcion] = useState(especialidad ? especialidad.descripcion : '');
  const [descripcion2, setDescripcion2] = useState(especialidad ? especialidad.descripcion2 : '');
  const [slug, setSlug] = useState(especialidad ? especialidad.slug : '');
  const [imagenPortadaUrl, setImagenPortadaUrl] = useState(especialidad?.imagenPortadaUrl || '');
  const [loading, setLoading] = useState(false);
  const [loadingEspecialidad, setLoadingEspecialidad] = useState(Boolean(especialidadId && !especialidad));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchEspecialidad = async () => {
      if (!especialidadId || especialidad) return;

      setLoadingEspecialidad(true);
      try {
        const functions = getFunctions(app);
        const getEspecialidad = httpsCallable<{ id: number }, { especialidad: EspecialidadData | null }>(
          functions,
          'getEspecialidad',
        );
        const result = await getEspecialidad({ id: Number(especialidadId) });
        const fetched = result.data.especialidad;

        if (fetched) {
          setTitulo(fetched.titulo || '');
          setTituloComercial(fetched.tituloComercial || '');
          setOrden(fetched.orden != null ? String(fetched.orden) : '');
          setDescripcion(fetched.descripcion || '');
          setDescripcion2(fetched.descripcion2 || '');
          setSlug(fetched.slug || '');
          setImagenPortadaUrl(fetched.imagenPortadaUrl || '');
        }
      } catch (err) {
        console.error('Error fetching especialidad: ', err);
        setError('No se pudo cargar la especialidad para edicion.');
      } finally {
        setLoadingEspecialidad(false);
      }
    };

    void fetchEspecialidad();
  }, [especialidadId, especialidad]);

  const handleOrdenChange = (value: string) => {
    if (/^-?\d*$/.test(value)) {
      setOrden(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(app);
      const createOrUpdateEspecialidad = httpsCallable<
        {
          id?: number;
          titulo: string;
          tituloComercial: string;
          orden?: number | null;
          descripcion: string;
          descripcion2: string;
          slug: string;
          imagenPortadaUrl?: string | null;
        },
        { id: number | null }
      >(functions, 'createOrUpdateEspecialidad');

      await createOrUpdateEspecialidad({
        id: especialidadId ? Number(especialidadId) : undefined,
        titulo,
        tituloComercial,
        orden: orden ? parseInt(orden, 10) : null,
        descripcion,
        descripcion2,
        slug,
        imagenPortadaUrl: imagenPortadaUrl.trim() || null,
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/especialidades');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling especialidad form: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para crear o editar especialidades (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar la especialidad: ${message}`);
      } else {
        setError('No se pudo guardar la especialidad en Data Connect.');
      }
      setLoading(false);
    }
  };

  if (loadingEspecialidad) {
    const loadingContent = (
      <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );

    if (asModal) {
      return loadingContent;
    }

    return <Container maxWidth="sm">{loadingContent}</Container>;
  }

  const formContent = (
    <Box sx={asModal ? { pt: 1 } : { my: 4 }}>
      {!asModal && (
        <Typography variant="h4" component="h1" gutterBottom>
          {especialidadId ? 'Editar Especialidad' : 'Crear Especialidad'}
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
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(12, minmax(0, 1fr))' },
            mt: 2,
          }}
        >
          <TextField
            label="Titulo Comercial"
            value={tituloComercial}
            onChange={(e) => setTituloComercial(e.target.value)}
            fullWidth
            sx={{ gridColumn: { xs: '1 / -1', md: 'span 9' } }}
          />
          <TextField
            label="Orden"
            value={orden}
            onChange={(e) => handleOrdenChange(e.target.value)}
            fullWidth
            type="number"
            inputProps={{ step: 1 }}
            sx={{ gridColumn: { xs: '1 / -1', md: 'span 3' } }}
          />
        </Box>
        <TextField
          label="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          fullWidth
          margin="normal"
        />
        <CoverImageField
          value={imagenPortadaUrl}
          onChange={setImagenPortadaUrl}
          storageFolder="especialidades"
          disabled={loading}
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
        <TextField
          label="Descripcion 2"
          value={descripcion2}
          onChange={(e) => setDescripcion2(e.target.value)}
          fullWidth
          margin="normal"
          minRows={3}
          multiline
        />
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (especialidadId ? 'Actualizar' : 'Crear')}
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
