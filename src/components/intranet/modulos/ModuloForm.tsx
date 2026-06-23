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
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface ModuloFormProps {
  moduloId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface ModuloData {
  id: number;
  titulo: string | null;
  tituloComercial: string | null;
  orden: number | null;
  descripcion: string | null;
  horas: number | null;
  creditos: number | null;
  metas: number | null;
  activo: boolean | null;
  slug: string | null;
  descripcion2: string | null;
  planId: number | null;
}

export function ModuloForm({ moduloId, asModal = false, onSaved, onCancel }: ModuloFormProps) {
  const [titulo, setTitulo] = useState('');
  const [tituloComercial, setTituloComercial] = useState('');
  const [orden, setOrden] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [horas, setHoras] = useState('');
  const [creditos, setCreditos] = useState('');
  const [metas, setMetas] = useState('');
  const [activo, setActivo] = useState(true);
  const [slug, setSlug] = useState('');
  const [descripcion2, setDescripcion2] = useState('');
  const [planId, setPlanId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingModulo, setLoadingModulo] = useState(Boolean(moduloId));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchModulo = async () => {
      if (!moduloId) return;

      setLoadingModulo(true);
      try {
        const functions = getFunctions(app);
        const getModulo = httpsCallable<{ id: number }, { modulo: ModuloData | null }>(functions, 'getModulo');
        const result = await getModulo({ id: Number(moduloId) });
        const fetched = result.data.modulo;

        if (fetched) {
          setTitulo(fetched.titulo || '');
          setTituloComercial(fetched.tituloComercial || '');
          setOrden(fetched.orden != null ? String(fetched.orden) : '');
          setDescripcion(fetched.descripcion || '');
          setHoras(fetched.horas != null ? String(fetched.horas) : '');
          setCreditos(fetched.creditos != null ? String(fetched.creditos) : '');
          setMetas(fetched.metas != null ? String(fetched.metas) : '');
          setActivo(Boolean(fetched.activo));
          setSlug(fetched.slug || '');
          setDescripcion2(fetched.descripcion2 || '');
          setPlanId(fetched.planId != null ? String(fetched.planId) : '');
        }
      } catch (err) {
        console.error('Error fetching modulo: ', err);
        setError('No se pudo cargar el modulo para edicion.');
      } finally {
        setLoadingModulo(false);
      }
    };

    void fetchModulo();
  }, [moduloId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(app);
      const createOrUpdateModulo = httpsCallable<
        {
          id?: number;
          titulo: string;
          tituloComercial: string;
          orden?: number | null;
          descripcion: string;
          horas?: number | null;
          creditos?: number | null;
          metas?: number | null;
          activo: boolean;
          slug: string;
          descripcion2: string;
          planId?: number | null;
        },
        { id: number | null }
      >(functions, 'createOrUpdateModulo');

      await createOrUpdateModulo({
        id: moduloId ? Number(moduloId) : undefined,
        titulo,
        tituloComercial,
        orden: orden ? Number(orden) : null,
        descripcion,
        horas: horas ? Number(horas) : null,
        creditos: creditos ? Number(creditos) : null,
        metas: metas ? Number(metas) : null,
        activo,
        slug,
        descripcion2,
        planId: planId ? Number(planId) : null,
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/modulos');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling modulo form: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para crear o editar modulos (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar el modulo: ${message}`);
      } else {
        setError('No se pudo guardar el modulo en Data Connect.');
      }
      setLoading(false);
    }
  };

  if (loadingModulo) {
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
          {moduloId ? 'Editar Modulo' : 'Crear Modulo'}
        </Typography>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <TextField label="Titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} fullWidth margin="normal" required />
        <TextField label="Titulo Comercial" value={tituloComercial} onChange={(e) => setTituloComercial(e.target.value)} fullWidth margin="normal" />
        <TextField label="Orden" value={orden} onChange={(e) => setOrden(e.target.value)} fullWidth margin="normal" type="number" />
        <TextField label="Horas" value={horas} onChange={(e) => setHoras(e.target.value)} fullWidth margin="normal" type="number" />
        <TextField label="Creditos" value={creditos} onChange={(e) => setCreditos(e.target.value)} fullWidth margin="normal" type="number" />
        <TextField label="Metas" value={metas} onChange={(e) => setMetas(e.target.value)} fullWidth margin="normal" type="number" />
        <TextField label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} fullWidth margin="normal" />
        <TextField label="Plan ID" value={planId} onChange={(e) => setPlanId(e.target.value)} fullWidth margin="normal" type="number" />
        <FormControlLabel
          control={<Checkbox checked={activo} onChange={(e) => setActivo(e.target.checked)} />}
          label="Activo"
        />
        <TextField label="Descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} fullWidth margin="normal" minRows={3} multiline />
        <TextField label="Descripcion 2" value={descripcion2} onChange={(e) => setDescripcion2(e.target.value)} fullWidth margin="normal" minRows={3} multiline />
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (moduloId ? 'Actualizar' : 'Crear')}
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
