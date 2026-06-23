'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Container, TextField, Typography } from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface PlanFormProps {
  planId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface PlanData {
  id: number;
  version: string | null;
  duracion: string | null;
  creditos: number | null;
  nivel: string | null;
  tituloComercial: string | null;
  slug: string | null;
  descripcion2: string | null;
  carreraId: number | null;
}

export function PlanForm({ planId, asModal = false, onSaved, onCancel }: PlanFormProps) {
  const [version, setVersion] = useState('');
  const [duracion, setDuracion] = useState('');
  const [creditos, setCreditos] = useState('');
  const [nivel, setNivel] = useState('');
  const [tituloComercial, setTituloComercial] = useState('');
  const [slug, setSlug] = useState('');
  const [descripcion2, setDescripcion2] = useState('');
  const [carreraId, setCarreraId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(Boolean(planId));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPlan = async () => {
      if (!planId) return;

      setLoadingPlan(true);
      try {
        const functions = getFunctions(app);
        const getPlan = httpsCallable<{ id: number }, { plan: PlanData | null }>(functions, 'getPlan');
        const result = await getPlan({ id: Number(planId) });
        const fetched = result.data.plan;

        if (fetched) {
          setVersion(fetched.version || '');
          setDuracion(fetched.duracion || '');
          setCreditos(fetched.creditos != null ? String(fetched.creditos) : '');
          setNivel(fetched.nivel || '');
          setTituloComercial(fetched.tituloComercial || '');
          setSlug(fetched.slug || '');
          setDescripcion2(fetched.descripcion2 || '');
          setCarreraId(fetched.carreraId != null ? String(fetched.carreraId) : '');
        }
      } catch (err) {
        console.error('Error fetching plan: ', err);
        setError('No se pudo cargar el plan para edicion.');
      } finally {
        setLoadingPlan(false);
      }
    };

    void fetchPlan();
  }, [planId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(app);
      const createOrUpdatePlan = httpsCallable<
        {
          id?: number;
          version: string;
          duracion: string;
          creditos?: number | null;
          nivel: string;
          tituloComercial: string;
          slug: string;
          descripcion2: string;
          carreraId?: number | null;
        },
        { id: number | null }
      >(functions, 'createOrUpdatePlan');

      await createOrUpdatePlan({
        id: planId ? Number(planId) : undefined,
        version,
        duracion,
        creditos: creditos ? Number(creditos) : null,
        nivel,
        tituloComercial,
        slug,
        descripcion2,
        carreraId: carreraId ? Number(carreraId) : null,
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/planes');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling plan form: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para crear o editar planes (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar el plan: ${message}`);
      } else {
        setError('No se pudo guardar el plan en Data Connect.');
      }
      setLoading(false);
    }
  };

  if (loadingPlan) {
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
          {planId ? 'Editar Plan' : 'Crear Plan'}
        </Typography>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <TextField label="Version" value={version} onChange={(e) => setVersion(e.target.value)} fullWidth margin="normal" />
        <TextField label="Titulo Comercial" value={tituloComercial} onChange={(e) => setTituloComercial(e.target.value)} fullWidth margin="normal" />
        <TextField label="Duracion" value={duracion} onChange={(e) => setDuracion(e.target.value)} fullWidth margin="normal" />
        <TextField label="Creditos" value={creditos} onChange={(e) => setCreditos(e.target.value)} fullWidth margin="normal" type="number" />
        <TextField label="Nivel" value={nivel} onChange={(e) => setNivel(e.target.value)} fullWidth margin="normal" />
        <TextField label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} fullWidth margin="normal" />
        <TextField label="Carrera ID" value={carreraId} onChange={(e) => setCarreraId(e.target.value)} fullWidth margin="normal" type="number" />
        <TextField label="Descripcion 2" value={descripcion2} onChange={(e) => setDescripcion2(e.target.value)} fullWidth margin="normal" minRows={3} multiline />
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (planId ? 'Actualizar' : 'Crear')}
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
