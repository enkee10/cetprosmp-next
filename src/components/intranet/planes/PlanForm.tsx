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
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import CoverImageField from '@/components/intranet/academico/CoverImageField';

interface PlanFormProps {
  planId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface PlanData {
  id: number;
  duracion: string | null;
  creditos: number | null;
  tituloComercial: string | null;
  slug: string | null;
  descripcion2: string | null;
  imagenPortadaUrl: string | null;
  planEstudio: string | null;
  periodoCaducidad: string | null;
  resolucionTipo: string | null;
  nro: string | null;
  anio: number | null;
  genera: string | null;
  carreraId: number | null;
  periodoVigenciaId: number | null;
}

interface CarreraOption {
  id: number;
  nombre: string | null;
}

interface SemestreOption {
  id: number;
  titulo: string | null;
  archivado: boolean | null;
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

interface ModuloDraft {
  localId: string;
  id?: number;
  titulo: string;
  tituloComercial: string;
  orden: string;
  descripcion: string;
  horas: string;
  creditos: string;
  metas: string;
  activo: boolean;
  slug: string;
  descripcion2: string;
  deleted?: boolean;
}

const RESOLUCION_TIPO_OPTIONS = ['R.D.', 'R.M.', 'OFI.'];
const GENERA_OPTIONS = ['UGEL', 'DRE', 'MINEDU'];

const normalizeSlug = (value: string): string =>
  value
    .replace(/[Ã±Ã‘]/g, 'n')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const createEmptyModuloDraft = (): ModuloDraft => ({
  localId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  titulo: '',
  tituloComercial: '',
  orden: '',
  descripcion: '',
  horas: '',
  creditos: '',
  metas: '',
  activo: true,
  slug: '',
  descripcion2: '',
});

const mapModuloToDraft = (modulo: ModuloData): ModuloDraft => ({
  localId: `existing-${modulo.id}`,
  id: modulo.id,
  titulo: modulo.titulo || '',
  tituloComercial: modulo.tituloComercial || '',
  orden: modulo.orden != null ? String(modulo.orden) : '',
  descripcion: modulo.descripcion || '',
  horas: modulo.horas != null ? String(modulo.horas) : '',
  creditos: modulo.creditos != null ? String(modulo.creditos) : '',
  metas: modulo.metas != null ? String(modulo.metas) : '',
  activo: modulo.activo ?? true,
  slug: modulo.slug || '',
  descripcion2: modulo.descripcion2 || '',
});

const hasModuloDraftContent = (modulo: ModuloDraft) =>
  [
    modulo.titulo,
    modulo.tituloComercial,
    modulo.orden,
    modulo.descripcion,
    modulo.horas,
    modulo.creditos,
    modulo.metas,
    modulo.slug,
    modulo.descripcion2,
  ].some((value) => value.trim().length > 0);

const getYearFromPeriodoVigencia = (value: string) => value.match(/\b(?:19|20)\d{2}\b/)?.[0] || '';

export function PlanForm({ planId, asModal = false, onSaved, onCancel }: PlanFormProps) {
  const [duracion, setDuracion] = useState('');
  const [creditos, setCreditos] = useState('');
  const [tituloComercial, setTituloComercial] = useState('');
  const [slug, setSlug] = useState('');
  const [descripcion2, setDescripcion2] = useState('');
  const [imagenPortadaUrl, setImagenPortadaUrl] = useState('');
  const [planEstudio, setPlanEstudio] = useState('');
  const [periodoCaducidad, setPeriodoCaducidad] = useState('');
  const [resolucionTipo, setResolucionTipo] = useState('');
  const [nro, setNro] = useState('');
  const [anio, setAnio] = useState('');
  const [genera, setGenera] = useState('');
  const [carreraId, setCarreraId] = useState('');
  const [periodoVigenciaId, setPeriodoVigenciaId] = useState('');
  const [modulos, setModulos] = useState<ModuloDraft[]>([]);
  const [deletedModuloIds, setDeletedModuloIds] = useState<number[]>([]);
  const [carreras, setCarreras] = useState<CarreraOption[]>([]);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(Boolean(planId));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const functions = getFunctions(app);
        const listCarreras = httpsCallable<undefined, { carreras?: CarreraOption[] }>(functions, 'listCarreras');
        const listSemestres = httpsCallable<undefined, { semestres?: SemestreOption[] }>(functions, 'listSemestres');
        const [carrerasResult, semestresResult] = await Promise.all([
          listCarreras(),
          listSemestres(),
        ]);
        setCarreras(carrerasResult.data.carreras || []);
        setSemestres(semestresResult.data.semestres || []);
      } catch (err) {
        console.error('Error fetching plan form options: ', err);
        setError('No se pudieron cargar las opciones para el formulario.');
      }
    };

    void fetchOptions();
  }, []);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!planId) return;

      setLoadingPlan(true);
      try {
        const functions = getFunctions(app);
        const getPlan = httpsCallable<{ id: number }, { plan: PlanData | null }>(functions, 'getPlan');
        const listModulos = httpsCallable<undefined, { modulos?: ModuloData[] }>(functions, 'listModulos');
        const [result, modulosResult] = await Promise.all([
          getPlan({ id: Number(planId) }),
          listModulos(),
        ]);
        const fetched = result.data.plan;

        if (fetched) {
          setDuracion(fetched.duracion || '');
          setCreditos(fetched.creditos != null ? String(fetched.creditos) : '');
          setTituloComercial(fetched.tituloComercial || '');
          setSlug(fetched.slug || '');
          setDescripcion2(fetched.descripcion2 || '');
          setImagenPortadaUrl(fetched.imagenPortadaUrl || '');
          setPlanEstudio(fetched.planEstudio || '');
          setPeriodoCaducidad(fetched.periodoCaducidad || '');
          setResolucionTipo(fetched.resolucionTipo || '');
          setNro(fetched.nro || '');
          setAnio(fetched.anio != null ? String(fetched.anio) : '');
          setGenera(fetched.genera || '');
          setCarreraId(fetched.carreraId != null ? String(fetched.carreraId) : '');
          setPeriodoVigenciaId(fetched.periodoVigenciaId != null ? String(fetched.periodoVigenciaId) : '');
          setModulos(
            (modulosResult.data.modulos || [])
              .filter((modulo) => modulo.planId === fetched.id)
              .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || String(a.titulo ?? '').localeCompare(String(b.titulo ?? ''), 'es'))
              .map(mapModuloToDraft),
          );
          setDeletedModuloIds([]);
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

  useEffect(() => {
    if (!periodoVigenciaId) {
      setPlanEstudio('');
      setAnio('');
      return;
    }

    const selectedPeriodo = semestres.find((semestre) => String(semestre.id) === periodoVigenciaId);
    if (!selectedPeriodo) return;

    const periodoVigenciaTitle = (selectedPeriodo.titulo || `Semestre ${selectedPeriodo.id}`).trim();
    setPlanEstudio(periodoVigenciaTitle ? `Plan ${periodoVigenciaTitle}` : '');
    setAnio(getYearFromPeriodoVigencia(periodoVigenciaTitle));
  }, [periodoVigenciaId, semestres]);

  useEffect(() => {
    if (!carreraId) {
      setSlug('');
      return;
    }

    const selectedCarrera = carreras.find((carrera) => String(carrera.id) === carreraId);
    if (!selectedCarrera) return;

    setSlug(normalizeSlug(selectedCarrera.nombre || `Carrera ${selectedCarrera.id}`));
  }, [carreraId, carreras]);

  const handleAddModulo = () => {
    setModulos((prev) => [...prev, createEmptyModuloDraft()]);
  };

  const handleUpdateModulo = <K extends keyof ModuloDraft>(
    localId: string,
    field: K,
    value: ModuloDraft[K],
  ) => {
    setModulos((prev) =>
      prev.map((modulo) => (modulo.localId === localId ? { ...modulo, [field]: value } : modulo)),
    );
  };

  const handleRemoveModulo = (localId: string) => {
    const target = modulos.find((modulo) => modulo.localId === localId);
    if (target?.id) {
      setDeletedModuloIds((current) => (current.includes(target.id!) ? current : [...current, target.id!]));
      setModulos((prev) => prev.map((modulo) => (modulo.localId === localId ? { ...modulo, deleted: true } : modulo)));
      return;
    }

    setModulos((prev) => prev.filter((modulo) => modulo.localId !== localId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const modulosToSave = modulos.filter((modulo) => !modulo.deleted && (modulo.id || hasModuloDraftContent(modulo)));
    const moduloWithoutTitle = modulosToSave.find((modulo) => !modulo.titulo.trim());
    if (moduloWithoutTitle) {
      setError('Cada modulo del plan debe tener titulo antes de guardar.');
      setLoading(false);
      return;
    }

    try {
      const functions = getFunctions(app);
      const createOrUpdatePlan = httpsCallable<
        {
          id?: number;
          duracion: string;
          creditos?: number | null;
          tituloComercial: string;
          slug: string;
          descripcion2: string;
          imagenPortadaUrl?: string | null;
          planEstudio?: string | null;
          periodoCaducidad?: string | null;
          resolucionTipo?: string | null;
          nro?: string | null;
          anio?: number | null;
          genera?: string | null;
          carreraId?: number | null;
          periodoVigenciaId?: number | null;
        },
        { id: number | null }
      >(functions, 'createOrUpdatePlan');

      const planResult = await createOrUpdatePlan({
        id: planId ? Number(planId) : undefined,
        duracion,
        creditos: creditos ? Number(creditos) : null,
        tituloComercial,
        slug: normalizeSlug(slug),
        descripcion2,
        imagenPortadaUrl: imagenPortadaUrl.trim() || null,
        planEstudio: planEstudio.trim() || null,
        periodoCaducidad: planId ? periodoCaducidad.trim() || null : null,
        resolucionTipo: resolucionTipo || null,
        nro: nro.trim() || null,
        anio: anio ? Number(anio) : null,
        genera: genera || null,
        carreraId: carreraId ? Number(carreraId) : null,
        periodoVigenciaId: periodoVigenciaId ? Number(periodoVigenciaId) : null,
      });
      const savedPlanId = planResult.data.id ?? (planId ? Number(planId) : null);
      if (!savedPlanId) {
        throw new Error('No se pudo obtener el id del plan guardado.');
      }

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
      const deleteModulo = httpsCallable<{ id: number }, { id: number | null }>(functions, 'deleteModulo');

      await Promise.all(deletedModuloIds.map((id) => deleteModulo({ id })));
      await Promise.all(
        modulosToSave.map((modulo) =>
          createOrUpdateModulo({
            id: modulo.id,
            titulo: modulo.titulo,
            tituloComercial: modulo.tituloComercial,
            orden: modulo.orden ? Number(modulo.orden) : null,
            descripcion: modulo.descripcion,
            horas: modulo.horas ? Number(modulo.horas) : null,
            creditos: modulo.creditos ? Number(modulo.creditos) : null,
            metas: modulo.metas ? Number(modulo.metas) : null,
            activo: modulo.activo,
            slug: modulo.slug,
            descripcion2: modulo.descripcion2,
            planId: savedPlanId,
          }),
        ),
      );

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
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(12, minmax(0, 1fr))' },
            '& .MuiFormControl-root': { m: 0 },
          }}
        >
          <FormControl fullWidth sx={{ gridColumn: '1 / -1' }}>
            <InputLabel>Carrera</InputLabel>
            <Select
              label="Carrera"
              value={carreraId}
              onChange={(event) => setCarreraId(String(event.target.value))}
            >
              <MenuItem value="">Sin carrera</MenuItem>
              {carreraId && !carreras.some((carrera) => String(carrera.id) === carreraId) ? (
                <MenuItem value={carreraId} disabled>
                  Carrera actual no disponible
                </MenuItem>
              ) : null}
              {carreras.map((carrera) => (
                <MenuItem key={carrera.id} value={String(carrera.id)}>
                  {carrera.nombre || `Carrera ${carrera.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Titulo Comercial"
            value={tituloComercial}
            onChange={(e) => setTituloComercial(e.target.value)}
            fullWidth
            sx={{ gridColumn: '1 / -1' }}
          />

          <TextField
            label="Slug"
            value={slug}
            fullWidth
            disabled
            sx={{ gridColumn: '1 / -1' }}
          />
          <TextField
            label="Plan Estudio"
            value={planEstudio}
            fullWidth
            disabled
            sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}
          />
          <TextField
            label="Duracion"
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
            fullWidth
            sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}
          />
          <TextField
            label="Creditos"
            value={creditos}
            onChange={(e) => setCreditos(e.target.value)}
            fullWidth
            type="number"
            sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}
          />

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}>
            <InputLabel>Resolucion</InputLabel>
            <Select
              label="Resolucion"
              value={resolucionTipo}
              onChange={(event) => setResolucionTipo(String(event.target.value))}
            >
              <MenuItem value="">Sin tipo</MenuItem>
              {RESOLUCION_TIPO_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Nro"
            value={nro}
            onChange={(e) => setNro(e.target.value)}
            fullWidth
            sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
          />
          <TextField
            label="Año"
            value={anio}
            fullWidth
            disabled
            type="number"
            sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
          />
          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}>
            <InputLabel>Genera</InputLabel>
            <Select
              label="Genera"
              value={genera}
              onChange={(event) => setGenera(String(event.target.value))}
            >
              <MenuItem value="">Sin entidad</MenuItem>
              {GENERA_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}>
            <InputLabel>periodo_vigencia</InputLabel>
            <Select
              label="periodo_vigencia"
              value={periodoVigenciaId}
              onChange={(event) => setPeriodoVigenciaId(String(event.target.value))}
            >
              <MenuItem value="">Sin periodo vigencia</MenuItem>
              {periodoVigenciaId && !semestres.some((semestre) => String(semestre.id) === periodoVigenciaId) ? (
                <MenuItem value={periodoVigenciaId} disabled>
                  Periodo vigencia actual no disponible
                </MenuItem>
              ) : null}
              {semestres.map((semestre) => (
                <MenuItem key={semestre.id} value={String(semestre.id)}>
                  {semestre.titulo || `Semestre ${semestre.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {planId ? (
            <TextField
              label="Periodo Caducidad"
              value={periodoCaducidad}
              onChange={(e) => setPeriodoCaducidad(e.target.value)}
              fullWidth
              sx={{ gridColumn: { xs: 'auto', md: 'span 4' } }}
            />
          ) : null}

          <Box sx={{ gridColumn: '1 / -1' }}>
            <CoverImageField
              value={imagenPortadaUrl}
              onChange={setImagenPortadaUrl}
              storageFolder="planes"
              disabled={loading}
            />
          </Box>

          <TextField
            label="Descripcion"
            value={descripcion2}
            onChange={(e) => setDescripcion2(e.target.value)}
            fullWidth
            minRows={3}
            multiline
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mt: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', mb: 2 }}
          >
            <Typography variant="h6" component="h2">
              Modulos
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddModulo} disabled={loading}>
              Agregar Modulo
            </Button>
          </Stack>

          <Stack spacing={2}>
            {modulos.filter((modulo) => !modulo.deleted).map((modulo, index) => (
              <Box
                key={modulo.localId}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2">
                    Modulo {index + 1}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label="Eliminar modulo"
                    onClick={() => handleRemoveModulo(modulo.localId)}
                    disabled={loading}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>

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
                    value={modulo.titulo}
                    onChange={(e) => handleUpdateModulo(modulo.localId, 'titulo', e.target.value)}
                    fullWidth
                    required={hasModuloDraftContent(modulo) || Boolean(modulo.id)}
                    sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}
                  />
                  <TextField
                    label="Titulo Comercial"
                    value={modulo.tituloComercial}
                    onChange={(e) => handleUpdateModulo(modulo.localId, 'tituloComercial', e.target.value)}
                    fullWidth
                    sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}
                  />
                  <TextField
                    label="Orden"
                    value={modulo.orden}
                    onChange={(e) => handleUpdateModulo(modulo.localId, 'orden', e.target.value)}
                    fullWidth
                    type="number"
                    sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
                  />
                  <TextField
                    label="Horas"
                    value={modulo.horas}
                    onChange={(e) => handleUpdateModulo(modulo.localId, 'horas', e.target.value)}
                    fullWidth
                    type="number"
                    sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
                  />
                  <TextField
                    label="Creditos"
                    value={modulo.creditos}
                    onChange={(e) => handleUpdateModulo(modulo.localId, 'creditos', e.target.value)}
                    fullWidth
                    type="number"
                    sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
                  />
                  <TextField
                    label="Metas"
                    value={modulo.metas}
                    onChange={(e) => handleUpdateModulo(modulo.localId, 'metas', e.target.value)}
                    fullWidth
                    type="number"
                    sx={{ gridColumn: { xs: 'auto', md: 'span 3' } }}
                  />
                  <TextField
                    label="Slug"
                    value={modulo.slug}
                    onChange={(e) => handleUpdateModulo(modulo.localId, 'slug', e.target.value)}
                    fullWidth
                    sx={{ gridColumn: { xs: 'auto', md: 'span 9' } }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={modulo.activo}
                        onChange={(e) => handleUpdateModulo(modulo.localId, 'activo', e.target.checked)}
                      />
                    }
                    label="Activo"
                    sx={{ gridColumn: { xs: 'auto', md: 'span 3' }, alignSelf: 'center' }}
                  />
                  <TextField
                    label="Descripcion"
                    value={modulo.descripcion}
                    onChange={(e) => handleUpdateModulo(modulo.localId, 'descripcion', e.target.value)}
                    fullWidth
                    minRows={2}
                    multiline
                    sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}
                  />
                  <TextField
                    label="Descripcion 2"
                    value={modulo.descripcion2}
                    onChange={(e) => handleUpdateModulo(modulo.localId, 'descripcion2', e.target.value)}
                    fullWidth
                    minRows={2}
                    multiline
                    sx={{ gridColumn: { xs: 'auto', md: 'span 6' } }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>

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
