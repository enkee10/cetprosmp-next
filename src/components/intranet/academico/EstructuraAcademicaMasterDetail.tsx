'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';

interface IndicadorDetalle {
  id: number;
  descripcion: string | null;
  sigla: string | null;
  capacidadTerminalId: number | null;
}

interface CapacidadDetalle {
  id: number;
  descripcion: string | null;
  sigla: string | null;
  unidadDidacticaId: number | null;
  indicadoresCapacidad: IndicadorDetalle[];
}

interface UnidadDidacticaDetalle {
  id: number;
  relacionId: number;
  orden: number | null;
  nombre: string | null;
  duracion: number | null;
  creditos: number | null;
  sigla: string | null;
  capacidadesTerminales: CapacidadDetalle[];
}

interface ModuloDetalle {
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
  planId: number | null;
  plan: {
    id?: number | null;
    planEstudio?: string | null;
    tituloComercial?: string | null;
    carrera?: {
      id?: number | null;
      nombre?: string | null;
      tituloComercial?: string | null;
      especialidad?: {
        id?: number | null;
        titulo?: string | null;
        tituloComercial?: string | null;
        orden?: number | null;
      } | null;
    } | null;
  } | null;
  unidadesDidacticas: UnidadDidacticaDetalle[];
}

type DetailRow = [string, string | number | null | undefined];

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function displayText(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function moduloName(modulo: ModuloDetalle | null | undefined) {
  return modulo?.tituloComercial || modulo?.titulo || `Modulo ${modulo?.id ?? ''}`;
}

function planName(modulo: ModuloDetalle | null | undefined) {
  return modulo?.plan?.planEstudio || modulo?.plan?.tituloComercial || '';
}

function carreraName(modulo: ModuloDetalle | null | undefined) {
  return modulo?.plan?.carrera?.tituloComercial || modulo?.plan?.carrera?.nombre || '';
}

function countCapacidades(unidades: UnidadDidacticaDetalle[]) {
  return unidades.reduce((total, unidad) => total + unidad.capacidadesTerminales.length, 0);
}

function countIndicadores(unidades: UnidadDidacticaDetalle[]) {
  return unidades.reduce(
    (total, unidad) =>
      total + unidad.capacidadesTerminales.reduce(
        (subtotal, capacidad) => subtotal + capacidad.indicadoresCapacidad.length,
        0,
      ),
    0,
  );
}

function LineText({ children, lines = 2 }: { children: string; lines?: number }) {
  return (
    <Typography
      component="span"
      sx={{
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: lines,
        overflow: 'hidden',
        wordBreak: 'break-word',
        lineHeight: 1.25,
      }}
    >
      {children}
    </Typography>
  );
}

function DetailFields({ rows }: { rows: DetailRow[] }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(82px, 0.42fr) minmax(0, 1fr)',
        gap: 0.75,
        px: 1.25,
        py: 1,
      }}
    >
      {rows.map(([label, value]) => (
        <Box key={label} sx={{ display: 'contents' }}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="caption" sx={{ wordBreak: 'break-word' }}>
            {displayText(value)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Box sx={{ px: 1.5, py: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

function Panel({
  title,
  count,
  children,
  details,
}: {
  title: string;
  count: number;
  children: ReactNode;
  details?: ReactNode;
}) {
  return (
    <Box
      sx={{
        minWidth: 0,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        minHeight: { xs: 360, lg: 'calc(100vh - 220px)' },
      }}
    >
      <Box
        sx={{
          px: 1.25,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          minHeight: 48,
        }}
      >
        <Typography variant="subtitle2" sx={{ minWidth: 0 }}>
          {title}
        </Typography>
        <Chip size="small" label={count} />
      </Box>
      <Box sx={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>{children}</Box>
      {details ? (
        <>
          <Divider />
          {details}
        </>
      ) : null}
    </Box>
  );
}

export default function EstructuraAcademicaMasterDetail() {
  const [modulos, setModulos] = useState<ModuloDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedModuloId, setSelectedModuloId] = useState<number | null>(null);
  const [selectedUnidadId, setSelectedUnidadId] = useState<number | null>(null);
  const [selectedCapacidadId, setSelectedCapacidadId] = useState<number | null>(null);

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchEstructura = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listEstructuraAcademica = httpsCallable<undefined, { modulos?: ModuloDetalle[] }>(
        functions,
        'listEstructuraAcademica',
      );
      const result = await listEstructuraAcademica();
      setModulos(result.data.modulos || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching academic structure: ', err);
      setError('No se pudo cargar la estructura academica. Verifica que tu usuario tenga claim level >= 600.');
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchEstructura();
  }, [fetchEstructura]);

  const filteredModulos = useMemo(() => {
    const term = normalizeText(search);
    if (!term) return modulos;

    return modulos.filter((modulo) => {
      const haystack = normalizeText([
        moduloName(modulo),
        modulo.slug,
        planName(modulo),
        carreraName(modulo),
        modulo.unidadesDidacticas.map((unidad) => unidad.nombre).join(' '),
      ].join(' '));
      return haystack.includes(term);
    });
  }, [modulos, search]);

  const selectedModulo = useMemo(
    () => filteredModulos.find((modulo) => modulo.id === selectedModuloId) ?? filteredModulos[0] ?? null,
    [filteredModulos, selectedModuloId],
  );

  const unidades = selectedModulo?.unidadesDidacticas ?? [];
  const selectedUnidad = useMemo(
    () => unidades.find((unidad) => unidad.id === selectedUnidadId) ?? unidades[0] ?? null,
    [selectedUnidadId, unidades],
  );
  const capacidades = selectedUnidad?.capacidadesTerminales ?? [];
  const selectedCapacidad = useMemo(
    () => capacidades.find((capacidad) => capacidad.id === selectedCapacidadId) ?? capacidades[0] ?? null,
    [capacidades, selectedCapacidadId],
  );
  const indicadores = selectedCapacidad?.indicadoresCapacidad ?? [];

  useEffect(() => {
    const nextId = selectedModulo?.id ?? null;
    if (selectedModuloId !== nextId) setSelectedModuloId(nextId);
  }, [selectedModulo?.id, selectedModuloId]);

  useEffect(() => {
    const nextId = selectedUnidad?.id ?? null;
    if (selectedUnidadId !== nextId) setSelectedUnidadId(nextId);
  }, [selectedUnidad?.id, selectedUnidadId]);

  useEffect(() => {
    const nextId = selectedCapacidad?.id ?? null;
    if (selectedCapacidadId !== nextId) setSelectedCapacidadId(nextId);
  }, [selectedCapacidad?.id, selectedCapacidadId]);

  const totals = useMemo(() => ({
    modulos: modulos.length,
    unidades: modulos.reduce((total, modulo) => total + modulo.unidadesDidacticas.length, 0),
    capacidades: modulos.reduce((total, modulo) => total + countCapacidades(modulo.unidadesDidacticas), 0),
    indicadores: modulos.reduce((total, modulo) => total + countIndicadores(modulo.unidadesDidacticas), 0),
  }), [modulos]);

  return (
    <IntranetListLayout
      message={error}
      messageSeverity="error"
      title="Estructura Academica"
      commands={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ sm: 'center' }}>
          <TextField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            size="small"
            placeholder="Buscar"
            sx={{ minWidth: { xs: '100%', sm: 320 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void fetchEstructura()}
            disabled={loading}
          >
            Actualizar
          </Button>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
            <Chip size="small" label={`Modulos ${totals.modulos}`} />
            <Chip size="small" label={`Unidades ${totals.unidades}`} />
            <Chip size="small" label={`Capacidades ${totals.capacidades}`} />
            <Chip size="small" label={`Indicadores ${totals.indicadores}`} />
          </Stack>
        </Stack>
      }
    >
      {loading ? (
        <Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : filteredModulos.length === 0 ? (
        <Box sx={{ px: 2, pb: 2 }}>
          <Alert severity="info">No hay registros para mostrar.</Alert>
        </Box>
      ) : (
        <Box
          sx={{
            px: 2,
            pb: 2,
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              md: 'minmax(220px, 0.85fr) minmax(260px, 1fr)',
              xl: 'minmax(240px, 0.9fr) minmax(260px, 1fr) minmax(280px, 1.05fr) minmax(280px, 1.05fr)',
            },
            gap: 1.25,
            alignItems: 'stretch',
          }}
        >
          <Panel
            title="Modulo"
            count={filteredModulos.length}
            details={
              selectedModulo ? (
                <DetailFields
                  rows={[
                    ['Id', selectedModulo.id],
                    ['Orden', selectedModulo.orden],
                    ['Horas', selectedModulo.horas],
                    ['Creditos', selectedModulo.creditos],
                    ['Plan', planName(selectedModulo)],
                  ]}
                />
              ) : undefined
            }
          >
            <List dense disablePadding>
              {filteredModulos.map((modulo) => {
                const unidadCount = modulo.unidadesDidacticas.length;
                return (
                  <ListItemButton
                    key={modulo.id}
                    selected={selectedModulo?.id === modulo.id}
                    onClick={() => {
                      setSelectedModuloId(modulo.id);
                      setSelectedUnidadId(null);
                      setSelectedCapacidadId(null);
                    }}
                    sx={{ alignItems: 'flex-start', py: 0.9, minHeight: 72 }}
                  >
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={<LineText lines={2}>{moduloName(modulo)}</LineText>}
                      secondary={
                        <Stack spacing={0.65} sx={{ mt: 0.65 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                            {[planName(modulo), carreraName(modulo)].filter(Boolean).join(' / ') || `Plan ${modulo.planId ?? '-'}`}
                          </Typography>
                          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                            <Chip size="small" label={`UD ${unidadCount}`} />
                            <Chip size="small" label={`CAP ${countCapacidades(modulo.unidadesDidacticas)}`} />
                            <Chip size="small" label={`IND ${countIndicadores(modulo.unidadesDidacticas)}`} />
                          </Stack>
                        </Stack>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Panel>

          <Panel
            title="Unidad Didactica"
            count={unidades.length}
            details={
              selectedUnidad ? (
                <DetailFields
                  rows={[
                    ['Id', selectedUnidad.id],
                    ['Orden', selectedUnidad.orden],
                    ['Duracion', selectedUnidad.duracion],
                    ['Creditos', selectedUnidad.creditos],
                    ['Sigla', selectedUnidad.sigla],
                  ]}
                />
              ) : undefined
            }
          >
            {unidades.length === 0 ? (
              <EmptyState label="Sin unidades." />
            ) : (
              <List dense disablePadding>
                {unidades.map((unidad) => (
                  <ListItemButton
                    key={`${unidad.relacionId}-${unidad.id}`}
                    selected={selectedUnidad?.id === unidad.id}
                    onClick={() => {
                      setSelectedUnidadId(unidad.id);
                      setSelectedCapacidadId(null);
                    }}
                    sx={{ alignItems: 'flex-start', py: 0.9, minHeight: 68 }}
                  >
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={<LineText lines={2}>{unidad.nombre || `Unidad ${unidad.id}`}</LineText>}
                      secondary={
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.65, flexWrap: 'wrap', rowGap: 0.5 }}>
                          <Chip size="small" label={`Ord ${unidad.orden ?? '-'}`} />
                          <Chip size="small" label={`CAP ${unidad.capacidadesTerminales.length}`} />
                          <Chip size="small" label={`IND ${unidad.capacidadesTerminales.reduce((total, capacidad) => total + capacidad.indicadoresCapacidad.length, 0)}`} />
                        </Stack>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Panel>

          <Panel
            title="Capacidad"
            count={capacidades.length}
            details={
              selectedCapacidad ? (
                <DetailFields
                  rows={[
                    ['Id', selectedCapacidad.id],
                    ['Sigla', selectedCapacidad.sigla],
                    ['Unidad', selectedCapacidad.unidadDidacticaId],
                    ['Indicadores', selectedCapacidad.indicadoresCapacidad.length],
                  ]}
                />
              ) : undefined
            }
          >
            {capacidades.length === 0 ? (
              <EmptyState label="Sin capacidades." />
            ) : (
              <List dense disablePadding>
                {capacidades.map((capacidad) => (
                  <ListItemButton
                    key={capacidad.id}
                    selected={selectedCapacidad?.id === capacidad.id}
                    onClick={() => setSelectedCapacidadId(capacidad.id)}
                    sx={{ alignItems: 'flex-start', py: 0.95, minHeight: 78 }}
                  >
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={<LineText lines={4}>{capacidad.descripcion || `Capacidad ${capacidad.id}`}</LineText>}
                      secondary={
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.65, flexWrap: 'wrap', rowGap: 0.5 }}>
                          <Chip size="small" label={`Id ${capacidad.id}`} />
                          <Chip size="small" label={`IND ${capacidad.indicadoresCapacidad.length}`} />
                        </Stack>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Panel>

          <Panel
            title="Criterio / Indicador"
            count={indicadores.length}
            details={
              selectedCapacidad ? (
                <DetailFields
                  rows={[
                    ['Capacidad', selectedCapacidad.id],
                    ['Unidad', selectedUnidad?.id],
                    ['Modulo', selectedModulo?.id],
                  ]}
                />
              ) : undefined
            }
          >
            {indicadores.length === 0 ? (
              <EmptyState label="Sin indicadores." />
            ) : (
              <List dense disablePadding>
                {indicadores.map((indicador) => (
                  <ListItemButton
                    key={indicador.id}
                    selected={false}
                    sx={{ alignItems: 'flex-start', py: 0.95, minHeight: 72, cursor: 'default' }}
                  >
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={<LineText lines={4}>{indicador.descripcion || `Indicador ${indicador.id}`}</LineText>}
                      secondary={
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.65, flexWrap: 'wrap', rowGap: 0.5 }}>
                          <Chip size="small" label={`Id ${indicador.id}`} />
                          {indicador.sigla ? <Chip size="small" label={indicador.sigla} /> : null}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Panel>
        </Box>
      )}
    </IntranetListLayout>
  );
}
