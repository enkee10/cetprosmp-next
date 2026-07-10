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
  duracionEfsrt: number | null;
  creditosEfsrt: number | null;
  metas: number | null;
  activo: boolean | null;
  slug: string | null;
  planId: number | null;
}

interface PlanOption {
  id: number;
  tituloComercial: string | null;
  carreraId: number | null;
}

interface CarreraOption {
  id: number;
  nombre: string | null;
}

const normalizeSlug = (value: string): string =>
  value
    .replace(/[ÃƒÂ±Ãƒâ€˜]/g, 'n')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const getPlanLabel = (plan: PlanOption, carreraTitleById: Map<number, string>) =>
  (plan.carreraId != null ? carreraTitleById.get(plan.carreraId) : undefined) ||
  plan.tituloComercial ||
  `Plan ${plan.id}`;

export function ModuloForm({ moduloId, asModal = false, onSaved, onCancel }: ModuloFormProps) {
  const [titulo, setTitulo] = useState('');
  const [tituloComercial, setTituloComercial] = useState('');
  const [orden, setOrden] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [horas, setHoras] = useState('');
  const [creditos, setCreditos] = useState('');
  const [duracionEfsrt, setDuracionEfsrt] = useState('');
  const [creditosEfsrt, setCreditosEfsrt] = useState('');
  const [metas, setMetas] = useState('');
  const [activo, setActivo] = useState(true);
  const [slug, setSlug] = useState('');
  const [planId, setPlanId] = useState('');
  const [planes, setPlanes] = useState<PlanOption[]>([]);
  const [carreras, setCarreras] = useState<CarreraOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingModulo, setLoadingModulo] = useState(Boolean(moduloId));
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPlanes = async () => {
      setLoadingPlanes(true);
      try {
        const functions = getFunctions(app);
        const listPlanes = httpsCallable<undefined, { planes?: PlanOption[] }>(functions, 'listPlanes');
        const listCarreras = httpsCallable<undefined, { carreras?: CarreraOption[] }>(functions, 'listCarreras');
        const [planesResult, carrerasResult] = await Promise.all([
          listPlanes(),
          listCarreras(),
        ]);
        const nextCarreras = carrerasResult.data.carreras || [];
        const nextCarreraTitleById = new Map(
          nextCarreras.map((carrera) => [carrera.id, carrera.nombre || `Carrera ${carrera.id}`]),
        );
        setPlanes(
          (planesResult.data.planes || [])
            .slice()
            .sort((a, b) =>
              getPlanLabel(a, nextCarreraTitleById).localeCompare(
                getPlanLabel(b, nextCarreraTitleById),
                'es',
                { numeric: true },
              ),
            ),
        );
        setCarreras(nextCarreras);
      } catch (err) {
        console.error('Error fetching plan options: ', err);
        setError('No se pudieron cargar los planes para el formulario.');
      } finally {
        setLoadingPlanes(false);
      }
    };

    void fetchPlanes();
  }, []);

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
          setDuracionEfsrt(fetched.duracionEfsrt != null ? String(fetched.duracionEfsrt) : '');
          setCreditosEfsrt(fetched.creditosEfsrt != null ? String(fetched.creditosEfsrt) : '');
          setMetas(fetched.metas != null ? String(fetched.metas) : '');
          setActivo(Boolean(fetched.activo));
          setSlug(fetched.slug || '');
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

  const carreraTitleById = new Map(
    carreras.map((carrera) => [carrera.id, carrera.nombre || `Carrera ${carrera.id}`]),
  );

  const handleTituloBlur = () => {
    setSlug(normalizeSlug(titulo));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const nextSlug = normalizeSlug(titulo);
    setSlug(nextSlug);

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
          duracionEfsrt?: number | null;
          creditosEfsrt?: number | null;
          metas?: number | null;
          activo: boolean;
          slug: string;
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
        duracionEfsrt: duracionEfsrt ? Number(duracionEfsrt) : null,
        creditosEfsrt: creditosEfsrt ? Number(creditosEfsrt) : null,
        metas: metas ? Number(metas) : null,
        activo,
        slug: nextSlug,
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
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(12, minmax(0, 1fr))' },
            '& .MuiFormControl-root': { m: 0 },
          }}
        >
          <TextField
            label="Titulo de modulo"
            value={titulo}
            onBlur={handleTituloBlur}
            onChange={(e) => setTitulo(e.target.value)}
            fullWidth
            required
            sx={{ gridColumn: '1 / -1' }}
          />

          <TextField
            label="Titulo comercial"
            value={tituloComercial}
            onChange={(e) => setTituloComercial(e.target.value)}
            fullWidth
            sx={{ gridColumn: '1 / -1' }}
          />

          <FormControl fullWidth sx={{ gridColumn: '1 / -1' }}>
            <InputLabel>Titulo del plan</InputLabel>
            <Select
              label="Titulo del plan"
              value={planId}
              onChange={(event) => setPlanId(String(event.target.value))}
              disabled={loadingPlanes}
            >
              <MenuItem value="">Sin plan</MenuItem>
              {planId && !planes.some((plan) => String(plan.id) === planId) ? (
                <MenuItem value={planId} disabled>
                  Plan actual no disponible
                </MenuItem>
              ) : null}
              {planes.map((plan) => (
                <MenuItem key={plan.id} value={String(plan.id)}>
                  {getPlanLabel(plan, carreraTitleById)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Orden"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            fullWidth
            type="number"
            sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
          />
          <TextField
            label="Horas"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            fullWidth
            type="number"
            sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
          />
          <TextField
            label="Creditos"
            value={creditos}
            onChange={(e) => setCreditos(e.target.value)}
            fullWidth
            type="number"
            sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
          />
          <TextField
            label="Duracion EFSRT"
            value={duracionEfsrt}
            onChange={(e) => setDuracionEfsrt(e.target.value)}
            fullWidth
            type="number"
            sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
          />
          <TextField
            label="Creditos EFSRT"
            value={creditosEfsrt}
            onChange={(e) => setCreditosEfsrt(e.target.value)}
            fullWidth
            type="number"
            sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
          />
          <TextField
            label="Metas"
            value={metas}
            onChange={(e) => setMetas(e.target.value)}
            fullWidth
            type="number"
            sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}
          />

          <TextField
            label="Slug"
            value={slug}
            fullWidth
            disabled
            sx={{ gridColumn: { xs: 'auto', md: 'span 9' } }}
          />
          <FormControlLabel
            control={<Checkbox checked={activo} onChange={(e) => setActivo(e.target.checked)} />}
            label="Activo"
            sx={{ gridColumn: { xs: 'auto', md: 'span 3' }, alignSelf: 'center' }}
          />

          <TextField
            label="Descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            fullWidth
            minRows={3}
            multiline
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>

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
