'use client';

import { useEffect, useMemo, useState } from 'react';
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
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface PaqueteFormProps {
  paqueteId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface PaqueteData {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  archivado: boolean | null;
  moduloIds?: number[];
}

interface ModuloOption {
  id: number;
  titulo: string | null;
  tituloComercial: string | null;
  orden: number | null;
  activo: boolean | null;
  planId: number | null;
}

const MAX_MODULOS_PER_PAQUETE = 3;

const getModuloLabel = (modulo: ModuloOption) =>
  modulo.tituloComercial || modulo.titulo || `Modulo ${modulo.id}`;

export function PaqueteForm({ paqueteId, asModal = false, onSaved, onCancel }: PaqueteFormProps) {
  const [descripcion, setDescripcion] = useState('');
  const [archivado, setArchivado] = useState(false);
  const [moduloIds, setModuloIds] = useState<string[]>([]);
  const [modulos, setModulos] = useState<ModuloOption[]>([]);
  const [loadingModulos, setLoadingModulos] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingPaquete, setLoadingPaquete] = useState(Boolean(paqueteId));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingModulos(true);
      try {
        const functions = getFunctions(app);
        const listModulos = httpsCallable<undefined, { modulos?: ModuloOption[] }>(functions, 'listModulos');
        const result = await listModulos();
        setModulos(
          (result.data.modulos || [])
            .slice()
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || getModuloLabel(a).localeCompare(getModuloLabel(b), 'es')),
        );
      } catch (err) {
        console.error('Error fetching paquete form options: ', err);
        setError('No se pudieron cargar los modulos para el formulario.');
      } finally {
        setLoadingModulos(false);
      }
    };

    void fetchOptions();
  }, []);

  useEffect(() => {
    const fetchPaquete = async () => {
      if (!paqueteId) return;

      setLoadingPaquete(true);
      try {
        const functions = getFunctions(app);
        const getPaquete = httpsCallable<{ id: number }, { paquete: PaqueteData | null }>(functions, 'getPaquete');
        const result = await getPaquete({ id: Number(paqueteId) });
        const fetched = result.data.paquete;

        if (fetched) {
          setDescripcion(fetched.descripcion || '');
          setArchivado(Boolean(fetched.archivado));
          setModuloIds((fetched.moduloIds || []).map((id) => String(id)));
        }
      } catch (err) {
        console.error('Error fetching paquete: ', err);
        setError('No se pudo cargar el paquete para edicion.');
      } finally {
        setLoadingPaquete(false);
      }
    };

    void fetchPaquete();
  }, [paqueteId]);

  const moduloTitleById = useMemo(
    () => new Map(modulos.map((modulo) => [String(modulo.id), getModuloLabel(modulo)])),
    [modulos],
  );

  const selectedModuloNames = moduloIds
    .map((id) => moduloTitleById.get(id) || `Modulo ${id}`)
    .join(' / ');

  const generatedTitulo = selectedModuloNames;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (loadingModulos) {
      setError('Espera a que carguen los modulos antes de guardar el paquete.');
      setLoading(false);
      return;
    }

    if (moduloIds.length < 1 || moduloIds.length > MAX_MODULOS_PER_PAQUETE) {
      setError('Selecciona entre 1 y 3 modulos para el paquete.');
      setLoading(false);
      return;
    }

    try {
      const functions = getFunctions(app);
      const createOrUpdatePaquete = httpsCallable<
        {
          id?: number;
          titulo: string;
          descripcion: string;
          archivado: boolean;
          moduloIds: number[];
        },
        { id: number | null }
      >(functions, 'createOrUpdatePaquete');

      await createOrUpdatePaquete({
        id: paqueteId ? Number(paqueteId) : undefined,
        titulo: generatedTitulo,
        descripcion,
        archivado,
        moduloIds: moduloIds.map(Number),
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/paquetes');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling paquete form: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para crear o editar paquetes (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar el paquete: ${message}`);
      } else {
        setError('No se pudo guardar el paquete en Data Connect.');
      }
      setLoading(false);
    }
  };

  if (loadingPaquete) {
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
          {paqueteId ? 'Editar Paquete' : 'Crear Paquete'}
        </Typography>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <TextField
          label="Titulo"
          value={generatedTitulo}
          fullWidth
          margin="normal"
          required
          disabled
          helperText="Se genera automaticamente con los modulos seleccionados."
        />

        <FormControl fullWidth margin="normal" required disabled={loadingModulos}>
          <InputLabel>Modulos del paquete</InputLabel>
          <Select
            multiple
            value={moduloIds}
            onChange={(event) => {
              const nextValue = event.target.value;
              const nextIds = typeof nextValue === 'string' ? nextValue.split(',') : nextValue;
              setModuloIds(Array.from(new Set(nextIds)).slice(0, MAX_MODULOS_PER_PAQUETE));
            }}
            input={<OutlinedInput label="Modulos del paquete" />}
            renderValue={() => selectedModuloNames}
          >
            {modulos.map((modulo) => {
              const value = String(modulo.id);
              const checked = moduloIds.includes(value);
              const disabled = !checked && moduloIds.length >= MAX_MODULOS_PER_PAQUETE;
              return (
                <MenuItem key={modulo.id} value={value} disabled={disabled}>
                  <Checkbox checked={checked} />
                  <ListItemText
                    primary={getModuloLabel(modulo)}
                    secondary={modulo.activo === false ? 'Inactivo' : undefined}
                  />
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        <TextField
          label="Descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          fullWidth
          margin="normal"
          minRows={3}
          multiline
        />

        <FormControlLabel
          control={<Checkbox checked={archivado} onChange={(e) => setArchivado(e.target.checked)} />}
          label="Archivado"
        />

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading || loadingModulos}>
            {loading ? <CircularProgress size={24} /> : (paqueteId ? 'Actualizar' : 'Crear')}
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
