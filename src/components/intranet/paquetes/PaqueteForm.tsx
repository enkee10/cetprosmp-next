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
  moduloItems?: PaqueteModuloItemData[];
}

interface PaqueteModuloItemData {
  moduloId: number;
  multiplicador?: number | null;
  sufijos?: string[] | null;
}

interface ModuloOption {
  id: number;
  titulo: string | null;
  tituloComercial: string | null;
  orden: number | null;
  activo: boolean | null;
  planId: number | null;
}

const MAX_INSTANCIAS_PER_PAQUETE = 6;

const getModuloLabel = (modulo: ModuloOption) =>
  modulo.titulo || `Modulo ${modulo.id}`;

export function PaqueteForm({ paqueteId, asModal = false, onSaved, onCancel }: PaqueteFormProps) {
  const [descripcion, setDescripcion] = useState('');
  const [archivado, setArchivado] = useState(false);
  const [moduloItems, setModuloItems] = useState<PaqueteModuloItemData[]>([]);
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
            .sort((a, b) => getModuloLabel(a).localeCompare(getModuloLabel(b), 'es', { numeric: true }) || a.id - b.id),
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
          setModuloItems(
            fetched.moduloItems && fetched.moduloItems.length > 0
              ? fetched.moduloItems.map((item) => ({
                  moduloId: item.moduloId,
                  multiplicador: Math.max(1, Math.min(MAX_INSTANCIAS_PER_PAQUETE, Number(item.multiplicador ?? 1))),
                  sufijos: Array.isArray(item.sufijos) ? item.sufijos.map((suffix) => String(suffix ?? '')) : [],
                }))
              : (fetched.moduloIds || []).map((moduloId) => ({
                  moduloId,
                  multiplicador: 1,
                  sufijos: [''],
                })),
          );
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

  const moduloIds = moduloItems.map((item) => String(item.moduloId));
  const totalInstances = moduloItems.reduce((sum, item) => sum + Math.max(1, Number(item.multiplicador ?? 1)), 0);

  const selectedModuloNames = moduloItems
    .map((item) => {
      const id = String(item.moduloId);
      const name = moduloTitleById.get(id) || `Modulo ${id}`;
      const multiplicador = Math.max(1, Number(item.multiplicador ?? 1));
      return multiplicador > 1 ? `${name} x${multiplicador}` : name;
    })
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

    if (moduloItems.length < 1 || totalInstances > MAX_INSTANCIAS_PER_PAQUETE) {
      setError(`Selecciona entre 1 y ${MAX_INSTANCIAS_PER_PAQUETE} instancias de modulos para el paquete.`);
      setLoading(false);
      return;
    }

    const normalizedModuloItems = moduloItems.map((item) => {
      const multiplicador = Math.max(1, Math.min(MAX_INSTANCIAS_PER_PAQUETE, Number(item.multiplicador ?? 1)));
      const sufijos = Array.from({ length: multiplicador }, (_unused, index) =>
        String(item.sufijos?.[index] ?? '').trim(),
      );
      return { moduloId: item.moduloId, multiplicador, sufijos };
    });

    try {
      const functions = getFunctions(app);
      const createOrUpdatePaquete = httpsCallable<
        {
          id?: number;
          titulo: string;
          descripcion: string;
          archivado: boolean;
          moduloIds: number[];
          moduloItems: PaqueteModuloItemData[];
        },
        { id: number | null }
      >(functions, 'createOrUpdatePaquete');

      await createOrUpdatePaquete({
        id: paqueteId ? Number(paqueteId) : undefined,
        titulo: generatedTitulo,
        descripcion,
        archivado,
        moduloIds: normalizedModuloItems.map((item) => item.moduloId),
        moduloItems: normalizedModuloItems,
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
              const uniqueIds = Array.from(new Set(nextIds.map((value) => String(value))));
              setModuloItems((prev) => {
                const previousById = new Map(prev.map((item) => [String(item.moduloId), item]));
                const nextItems: PaqueteModuloItemData[] = [];
                let nextTotal = 0;
                for (const id of uniqueIds) {
                  const previous = previousById.get(id);
                  const multiplicador = Math.max(1, Math.min(MAX_INSTANCIAS_PER_PAQUETE, Number(previous?.multiplicador ?? 1)));
                  if (nextTotal + multiplicador > MAX_INSTANCIAS_PER_PAQUETE) continue;
                  nextItems.push(previous ?? { moduloId: Number(id), multiplicador: 1, sufijos: [''] });
                  nextTotal += multiplicador;
                }
                return nextItems;
              });
            }}
            input={<OutlinedInput label="Modulos del paquete" />}
            renderValue={() => selectedModuloNames}
          >
            {modulos.map((modulo) => {
              const value = String(modulo.id);
              const checked = moduloIds.includes(value);
              const disabled = !checked && totalInstances >= MAX_INSTANCIAS_PER_PAQUETE;
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

        {moduloItems.length > 0 && (
          <Box sx={{ mt: 1.5, display: 'grid', gap: 1.5 }}>
            {moduloItems.map((item) => {
              const id = String(item.moduloId);
              const multiplicador = Math.max(1, Math.min(MAX_INSTANCIAS_PER_PAQUETE, Number(item.multiplicador ?? 1)));
              const suffixes = Array.from({ length: multiplicador }, (_unused, index) => item.sufijos?.[index] ?? '');
              return (
                <Box
                  key={item.moduloId}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1.5,
                    display: 'grid',
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 96px' }, gap: 1 }}>
                    <TextField
                      label="Modulo"
                      value={moduloTitleById.get(id) || `Modulo ${id}`}
                      size="small"
                      fullWidth
                      disabled
                    />
                    <TextField
                      label="Veces"
                      value={multiplicador}
                      onChange={(event) => {
                        const nextMultiplier = Math.max(
                          1,
                          Math.min(MAX_INSTANCIAS_PER_PAQUETE, Number(event.target.value) || 1),
                        );
                        setModuloItems((prev) =>
                          prev.map((current) => {
                            if (current.moduloId !== item.moduloId) return current;
                            const nextSuffixes = Array.from({ length: nextMultiplier }, (_unused, index) =>
                              String(current.sufijos?.[index] ?? ''),
                            );
                            return { ...current, multiplicador: nextMultiplier, sufijos: nextSuffixes };
                          }),
                        );
                      }}
                      type="number"
                      size="small"
                      inputProps={{ min: 1, max: MAX_INSTANCIAS_PER_PAQUETE }}
                    />
                  </Box>
                  {multiplicador >= 1 && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1 }}>
                      {suffixes.map((suffix, index) => (
                        <TextField
                          key={`${item.moduloId}-${index}`}
                          label={`Sufijo ${index + 1}`}
                          value={suffix}
                          onChange={(event) => {
                            const value = event.target.value;
                            setModuloItems((prev) =>
                              prev.map((current) => {
                                if (current.moduloId !== item.moduloId) return current;
                                const nextSuffixes = Array.from({ length: multiplicador }, (_unused, suffixIndex) =>
                                  String(current.sufijos?.[suffixIndex] ?? ''),
                                );
                                nextSuffixes[index] = value;
                                return { ...current, sufijos: nextSuffixes };
                              }),
                            );
                          }}
                          size="small"
                          placeholder={index === 0 ? 'mar-may' : 'may-jul'}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

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
