'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Container, TextField, Typography } from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface EspecialidadFormProps {
  especialidad?: {
    id: string;
    titulo: string;
    tituloComercial: string;
    descripcion: string;
    descripcion2: string;
    slug: string;
    actEconomicaId: string;
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
  descripcion: string | null;
  descripcion2: string | null;
  slug: string | null;
  actEconomicaId: number | null;
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
  const [descripcion, setDescripcion] = useState(especialidad ? especialidad.descripcion : '');
  const [descripcion2, setDescripcion2] = useState(especialidad ? especialidad.descripcion2 : '');
  const [slug, setSlug] = useState(especialidad ? especialidad.slug : '');
  const [actEconomicaId, setActEconomicaId] = useState(especialidad ? especialidad.actEconomicaId : '');
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
          setDescripcion(fetched.descripcion || '');
          setDescripcion2(fetched.descripcion2 || '');
          setSlug(fetched.slug || '');
          setActEconomicaId(fetched.actEconomicaId != null ? String(fetched.actEconomicaId) : '');
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
          descripcion: string;
          descripcion2: string;
          slug: string;
          actEconomicaId?: number | null;
        },
        { id: number | null }
      >(functions, 'createOrUpdateEspecialidad');

      await createOrUpdateEspecialidad({
        id: especialidadId ? Number(especialidadId) : undefined,
        titulo,
        tituloComercial,
        descripcion,
        descripcion2,
        slug,
        actEconomicaId: actEconomicaId ? Number(actEconomicaId) : null,
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
        <TextField
          label="Titulo Comercial"
          value={tituloComercial}
          onChange={(e) => setTituloComercial(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Actividad Economica ID"
          value={actEconomicaId}
          onChange={(e) => setActEconomicaId(e.target.value)}
          fullWidth
          margin="normal"
          type="number"
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
