'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LinkIcon from '@mui/icons-material/Link';
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
  comun?: boolean | null;
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
  comun: boolean | null;
  planModuloId?: number | null;
  planId: number | null;
  planIds?: number[];
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

type EditableAcademicEntity = 'modulo' | 'unidadDidactica' | 'unidadDidacticaModulo' | 'capacidadTerminal' | 'indicadorCapacidad';
type EditableValueType = 'text' | 'number' | 'boolean';
type EditableCellValue = string | number | boolean | null;

interface EstructuraOpciones {
  modulosComunes: Array<{
    id: number;
    titulo: string | null;
    tituloComercial: string | null;
    planIds?: number[];
  }>;
  unidadesComunes: Array<{
    id: number;
    nombre: string | null;
    sigla: string | null;
    moduloIds?: number[];
  }>;
}

type ReuseDialogKind = 'modulo' | 'unidadDidactica';

interface EditableCellTarget {
  entity: EditableAcademicEntity;
  id: number;
  field: string;
  valueType: EditableValueType;
}

interface DetailRow {
  label: string;
  value: string | number | boolean | null | undefined;
  lines?: number;
  target?: EditableCellTarget;
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function displayText(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function draftFromValue(value: EditableCellValue | undefined) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function coerceDraftValue(value: string, valueType: EditableValueType): EditableCellValue {
  const trimmed = value.trim();
  if (valueType === 'number') {
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) throw new Error('El valor debe ser numerico.');
    return parsed;
  }
  if (valueType === 'boolean') {
    const normalized = trimmed.toLowerCase();
    if (['true', '1', 'si', 'sí', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
    throw new Error('El valor debe ser true/false o si/no.');
  }
  return trimmed || null;
}

function sameEditableValue(a: EditableCellValue | undefined, b: EditableCellValue | undefined) {
  return String(a ?? '') === String(b ?? '');
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

function applyEditableCellUpdate(
  items: ModuloDetalle[],
  target: EditableCellTarget,
  value: EditableCellValue,
): ModuloDetalle[] {
  return items.map((modulo) => {
    if (target.entity === 'modulo' && modulo.id === target.id) {
      return { ...modulo, [target.field]: value } as ModuloDetalle;
    }

    return {
      ...modulo,
      unidadesDidacticas: modulo.unidadesDidacticas.map((unidad) => {
        if (target.entity === 'unidadDidacticaModulo' && unidad.relacionId === target.id) {
          return { ...unidad, [target.field]: value } as UnidadDidacticaDetalle;
        }

        const updatedUnidad = target.entity === 'unidadDidactica' && unidad.id === target.id
          ? ({ ...unidad, [target.field]: value } as UnidadDidacticaDetalle)
          : unidad;

        return {
          ...updatedUnidad,
          capacidadesTerminales: updatedUnidad.capacidadesTerminales.map((capacidad) => {
            const updatedCapacidad = target.entity === 'capacidadTerminal' && capacidad.id === target.id
              ? ({ ...capacidad, [target.field]: value } as CapacidadDetalle)
              : capacidad;

            return {
              ...updatedCapacidad,
              indicadoresCapacidad: updatedCapacidad.indicadoresCapacidad.map((indicador) => (
                target.entity === 'indicadorCapacidad' && indicador.id === target.id
                  ? ({ ...indicador, [target.field]: value } as IndicadorDetalle)
                  : indicador
              )),
            };
          }),
        };
      }),
    };
  });
}

function EditableValue({
  value,
  target,
  lines = 2,
  variant = 'caption',
  onSave,
  readOnly = false,
}: {
  value: EditableCellValue | undefined;
  target?: EditableCellTarget;
  lines?: number;
  variant?: 'caption' | 'body2';
  onSave: (target: EditableCellTarget, value: EditableCellValue) => Promise<void>;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(draftFromValue(value));
  const committingRef = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(draftFromValue(value));
  }, [editing, value]);

  const commit = useCallback(async () => {
    if (!target || committingRef.current) return;
    committingRef.current = true;
    try {
      const nextValue = coerceDraftValue(draft, target.valueType);
      if (!sameEditableValue(value, nextValue)) {
        await onSave(target, nextValue);
      }
      setEditing(false);
    } finally {
      committingRef.current = false;
    }
  }, [draft, onSave, target, value]);

  const activeTarget = readOnly ? undefined : target;

  if (activeTarget && editing) {
    return (
      <TextField
        autoFocus
        fullWidth
        multiline={lines > 1 && activeTarget.valueType === 'text'}
        maxRows={Math.max(lines, 2)}
        size="small"
        type={activeTarget.valueType === 'number' ? 'number' : 'text'}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void commit();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setDraft(draftFromValue(value));
            setEditing(false);
          }
        }}
        sx={{
          '& .MuiInputBase-input': {
            fontSize: variant === 'caption' ? '0.75rem' : '0.875rem',
            py: 0.35,
          },
        }}
      />
    );
  }

  return (
    <Typography
      component="span"
      variant={variant}
      onDoubleClick={(event) => {
        if (!activeTarget) return;
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
      }}
      title={activeTarget ? 'Doble clic para editar' : undefined}
      sx={{
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: lines,
        overflow: 'hidden',
        wordBreak: 'break-word',
        lineHeight: 1.25,
        cursor: activeTarget ? 'text' : 'inherit',
        borderBottom: activeTarget ? '1px dotted transparent' : undefined,
        '&:hover': activeTarget ? { borderBottomColor: 'text.secondary' } : undefined,
      }}
    >
      {displayText(value)}
    </Typography>
  );
}

function DetailFields({
  rows,
  onSave,
  readOnly = false,
}: {
  rows: DetailRow[];
  onSave: (target: EditableCellTarget, value: EditableCellValue) => Promise<void>;
  readOnly?: boolean;
}) {
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
      {rows.map((row) => (
        <Box key={row.label} sx={{ display: 'contents' }}>
          <Typography variant="caption" color="text.secondary">
            {row.label}
          </Typography>
          <EditableValue
            value={row.value ?? null}
            target={row.target}
            lines={row.lines}
            onSave={onSave}
            readOnly={readOnly}
          />
        </Box>
      ))}
    </Box>
  );
}

function EditableMetricChip({
  value,
  target,
  prefix = '',
  suffix = '',
  onSave,
  readOnly = false,
}: {
  value: number | null | undefined;
  target: EditableCellTarget;
  prefix?: string;
  suffix?: string;
  onSave: (target: EditableCellTarget, value: EditableCellValue) => Promise<void>;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(draftFromValue(value));
  const committingRef = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(draftFromValue(value));
  }, [editing, value]);

  const commit = useCallback(async () => {
    if (committingRef.current) return;
    committingRef.current = true;
    try {
      const nextValue = coerceDraftValue(draft, target.valueType);
      if (!sameEditableValue(value, nextValue)) {
        await onSave(target, nextValue);
      }
      setEditing(false);
    } finally {
      committingRef.current = false;
    }
  }, [draft, onSave, target, value]);

  if (readOnly) {
    return <Chip size="small" label={`${prefix}${value ?? '-'}${suffix}`} />;
  }

  if (editing) {
    return (
      <TextField
        autoFocus
        size="small"
        type="number"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void commit();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setDraft(draftFromValue(value));
            setEditing(false);
          }
        }}
        sx={{
          width: 70,
          '& .MuiInputBase-root': { height: 24, borderRadius: 999 },
          '& .MuiInputBase-input': { px: 1, py: 0, fontSize: 12, textAlign: 'center' },
        }}
      />
    );
  }

  return (
    <Chip
      size="small"
      label={`${prefix}${value ?? '-'}${suffix}`}
      onMouseDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
      }}
      title="Doble clic para editar"
      sx={{
        cursor: 'text',
        '&:hover': { bgcolor: 'action.selected' },
      }}
    />
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
  actions,
}: {
  title: string;
  count: number;
  children: ReactNode;
  details?: ReactNode;
  actions?: ReactNode;
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
        <Stack direction="row" spacing={0.5} alignItems="center">
          {actions}
          <Chip size="small" label={count} />
        </Stack>
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

type EstructuraAcademicaCallableName = 'listEstructuraAcademica' | 'listEstructuraAcademicaDocente';

export default function EstructuraAcademicaMasterDetail({
  callableName = 'listEstructuraAcademica',
  title = 'Estructura Academica',
  readOnly = false,
  showSearch = true,
  errorMessage = 'No se pudo cargar la estructura academica. Verifica que tu usuario tenga permiso administrativo.',
}: {
  callableName?: EstructuraAcademicaCallableName;
  title?: string;
  readOnly?: boolean;
  showSearch?: boolean;
  errorMessage?: string;
}) {
  const [modulos, setModulos] = useState<ModuloDetalle[]>([]);
  const [opciones, setOpciones] = useState<EstructuraOpciones>({ modulosComunes: [], unidadesComunes: [] });
  const [resolvedTitle, setResolvedTitle] = useState(title);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedModuloId, setSelectedModuloId] = useState<number | null>(null);
  const [selectedUnidadId, setSelectedUnidadId] = useState<number | null>(null);
  const [selectedCapacidadId, setSelectedCapacidadId] = useState<number | null>(null);
  const [selectedIndicadorId, setSelectedIndicadorId] = useState<number | null>(null);
  const [reuseDialog, setReuseDialog] = useState<{ kind: ReuseDialogKind; value: string } | null>(null);

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const saveEditableCell = useCallback(async (target: EditableCellTarget, value: EditableCellValue) => {
    if (readOnly) {
      throw new Error('La vista del docente es de solo lectura.');
    }
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const updateEstructuraAcademicaCell = httpsCallable<
        EditableCellTarget & { value: EditableCellValue },
        { id: number }
      >(functions, 'updateEstructuraAcademicaCell');
      await updateEstructuraAcademicaCell({ ...target, value });
      setModulos((current) => applyEditableCellUpdate(current, target, value));
      setError(null);
    } catch (err) {
      console.error('Error saving academic structure cell: ', err);
      setError('No se pudo guardar la celda. Verifica tus permisos y el valor ingresado.');
      throw err;
    }
  }, [auth, functions, readOnly]);

  const fetchEstructura = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listEstructuraAcademica = httpsCallable<undefined, {
        modulos?: ModuloDetalle[];
        opciones?: EstructuraOpciones;
        title?: string | null;
      }>(
        functions,
        callableName,
      );
      const result = await listEstructuraAcademica();
      setModulos(result.data.modulos || []);
      setOpciones(result.data.opciones || { modulosComunes: [], unidadesComunes: [] });
      setResolvedTitle(result.data.title || title);
      setError(null);
    } catch (err) {
      console.error('Error fetching academic structure: ', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [auth, callableName, errorMessage, functions, title]);

  useEffect(() => {
    setResolvedTitle(title);
  }, [title]);

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
  const selectedIndicador = useMemo(
    () => indicadores.find((indicador) => indicador.id === selectedIndicadorId) ?? indicadores[0] ?? null,
    [indicadores, selectedIndicadorId],
  );

  const reusableModulos = useMemo(
    () => opciones.modulosComunes.filter((modulo) => !selectedModulo?.planId || !(modulo.planIds ?? []).includes(selectedModulo.planId)),
    [opciones.modulosComunes, selectedModulo?.planId],
  );
  const reusableUnidades = useMemo(
    () => opciones.unidadesComunes.filter((unidad) => !selectedModulo?.id || !(unidad.moduloIds ?? []).includes(selectedModulo.id)),
    [opciones.unidadesComunes, selectedModulo?.id],
  );

  const runStructureAction = useCallback(async (
    callableName: 'createEstructuraAcademicaItem' | 'reuseEstructuraAcademicaItem' | 'detachEstructuraAcademicaItem',
    payload: Record<string, unknown>,
  ) => {
    setActionLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const callable = httpsCallable<Record<string, unknown>, { id?: number }>(functions, callableName);
      await callable(payload);
      await fetchEstructura();
      setError(null);
    } catch (err) {
      console.error(`Error running ${callableName}: `, err);
      setError('No se pudo completar la accion. Verifica permisos o dependencias del registro.');
    } finally {
      setActionLoading(false);
    }
  }, [auth, fetchEstructura, functions]);

  const handleCreateModulo = useCallback(() => {
    if (!selectedModulo?.planId) return;
    void runStructureAction('createEstructuraAcademicaItem', {
      entity: 'modulo',
      planId: selectedModulo.planId,
    });
  }, [runStructureAction, selectedModulo?.planId]);

  const handleCreateUnidad = useCallback(() => {
    if (!selectedModulo?.id) return;
    void runStructureAction('createEstructuraAcademicaItem', {
      entity: 'unidadDidactica',
      moduloId: selectedModulo.id,
    });
  }, [runStructureAction, selectedModulo?.id]);

  const handleCreateCapacidad = useCallback(() => {
    if (!selectedUnidad?.id) return;
    void runStructureAction('createEstructuraAcademicaItem', {
      entity: 'capacidadTerminal',
      unidadDidacticaId: selectedUnidad.id,
    });
  }, [runStructureAction, selectedUnidad?.id]);

  const handleCreateIndicador = useCallback(() => {
    if (!selectedCapacidad?.id) return;
    void runStructureAction('createEstructuraAcademicaItem', {
      entity: 'indicadorCapacidad',
      capacidadTerminalId: selectedCapacidad.id,
    });
  }, [runStructureAction, selectedCapacidad?.id]);

  const handleDetachModulo = useCallback(() => {
    if (!selectedModulo?.id || !selectedModulo.planModuloId) return;
    if (!window.confirm('Se quitara este modulo del plan actual. Deseas continuar?')) return;
    void runStructureAction('detachEstructuraAcademicaItem', {
      entity: 'modulo',
      moduloId: selectedModulo.id,
      relacionId: selectedModulo.planModuloId,
    });
  }, [runStructureAction, selectedModulo?.id, selectedModulo?.planModuloId]);

  const handleDetachUnidad = useCallback(() => {
    if (!selectedUnidad?.relacionId) return;
    if (!window.confirm('Se quitara esta unidad del modulo actual. Deseas continuar?')) return;
    void runStructureAction('detachEstructuraAcademicaItem', {
      entity: 'unidadDidactica',
      relacionId: selectedUnidad.relacionId,
    });
  }, [runStructureAction, selectedUnidad?.relacionId]);

  const handleDetachCapacidad = useCallback(() => {
    if (!selectedCapacidad?.id) return;
    if (!window.confirm('Se quitara esta capacidad y sus indicadores. Deseas continuar?')) return;
    void runStructureAction('detachEstructuraAcademicaItem', {
      entity: 'capacidadTerminal',
      capacidadTerminalId: selectedCapacidad.id,
    });
  }, [runStructureAction, selectedCapacidad?.id]);

  const handleDetachIndicador = useCallback((indicadorId: number) => {
    if (!window.confirm('Se quitara este indicador. Deseas continuar?')) return;
    void runStructureAction('detachEstructuraAcademicaItem', {
      entity: 'indicadorCapacidad',
      indicadorCapacidadId: indicadorId,
    });
  }, [runStructureAction]);

  const handleDetachSelectedIndicador = useCallback(() => {
    if (!selectedIndicador?.id) return;
    handleDetachIndicador(selectedIndicador.id);
  }, [handleDetachIndicador, selectedIndicador?.id]);

  const handleConfirmReuse = useCallback(() => {
    if (!reuseDialog?.value) return;
    if (reuseDialog.kind === 'modulo') {
      if (!selectedModulo?.planId) return;
      void runStructureAction('reuseEstructuraAcademicaItem', {
        entity: 'modulo',
        planId: selectedModulo.planId,
        moduloId: Number(reuseDialog.value),
      });
      setReuseDialog(null);
      return;
    }
    if (!selectedModulo?.id) return;
    void runStructureAction('reuseEstructuraAcademicaItem', {
      entity: 'unidadDidactica',
      moduloId: selectedModulo.id,
      unidadDidacticaId: Number(reuseDialog.value),
    });
    setReuseDialog(null);
  }, [reuseDialog, runStructureAction, selectedModulo?.id, selectedModulo?.planId]);

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

  useEffect(() => {
    const nextId = selectedIndicador?.id ?? null;
    if (selectedIndicadorId !== nextId) setSelectedIndicadorId(nextId);
  }, [selectedIndicador?.id, selectedIndicadorId]);

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
      title={resolvedTitle}
      commands={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ sm: 'center' }}>
          {showSearch ? (
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
          ) : null}
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
            actions={!readOnly ? (
              <>
                <IconButton size="small" title="Crear modulo" disabled={actionLoading || !selectedModulo?.planId} onClick={handleCreateModulo}>
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  title="Reutilizar modulo comun"
                  disabled={actionLoading || !selectedModulo?.planId || reusableModulos.length === 0}
                  onClick={() => setReuseDialog({ kind: 'modulo', value: '' })}
                >
                  <LinkIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" title="Quitar modulo del plan" color="error" disabled={actionLoading || !selectedModulo?.planModuloId} onClick={handleDetachModulo}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </>
            ) : undefined}
            details={
              selectedModulo ? (
                <DetailFields
                  onSave={saveEditableCell}
                  readOnly={readOnly}
                  rows={[
                    { label: 'Id', value: selectedModulo.id },
                    {
                      label: 'Titulo',
                      value: selectedModulo.titulo,
                      target: { entity: 'modulo', id: selectedModulo.id, field: 'titulo', valueType: 'text' },
                    },
                    {
                      label: 'Comercial',
                      value: selectedModulo.tituloComercial,
                      target: { entity: 'modulo', id: selectedModulo.id, field: 'tituloComercial', valueType: 'text' },
                    },
                    {
                      label: 'Orden',
                      value: selectedModulo.orden,
                      target: { entity: 'modulo', id: selectedModulo.id, field: 'orden', valueType: 'number' },
                    },
                    {
                      label: 'Horas',
                      value: selectedModulo.horas,
                      target: { entity: 'modulo', id: selectedModulo.id, field: 'horas', valueType: 'number' },
                    },
                    {
                      label: 'Creditos',
                      value: selectedModulo.creditos,
                      target: { entity: 'modulo', id: selectedModulo.id, field: 'creditos', valueType: 'number' },
                    },
                    {
                      label: 'Metas',
                      value: selectedModulo.metas,
                      target: { entity: 'modulo', id: selectedModulo.id, field: 'metas', valueType: 'number' },
                    },
                    {
                      label: 'Slug',
                      value: selectedModulo.slug,
                      target: { entity: 'modulo', id: selectedModulo.id, field: 'slug', valueType: 'text' },
                    },
                    {
                      label: 'Comun',
                      value: selectedModulo.comun,
                      target: { entity: 'modulo', id: selectedModulo.id, field: 'comun', valueType: 'boolean' },
                    },
                    { label: 'Plan', value: planName(selectedModulo) },
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
                      setSelectedIndicadorId(null);
                    }}
                    sx={{ alignItems: 'flex-start', py: 0.9, minHeight: 72 }}
                  >
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={
                        <EditableValue
                          value={moduloName(modulo)}
                          target={{ entity: 'modulo', id: modulo.id, field: 'tituloComercial', valueType: 'text' }}
                          lines={2}
                          variant="body2"
                          onSave={saveEditableCell}
                          readOnly={readOnly}
                        />
                      }
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
            actions={!readOnly ? (
              <>
                <IconButton size="small" title="Crear unidad didactica" disabled={actionLoading || !selectedModulo?.id} onClick={handleCreateUnidad}>
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  title="Reutilizar unidad comun"
                  disabled={actionLoading || !selectedModulo?.id || reusableUnidades.length === 0}
                  onClick={() => setReuseDialog({ kind: 'unidadDidactica', value: '' })}
                >
                  <LinkIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" title="Quitar unidad del modulo" color="error" disabled={actionLoading || !selectedUnidad?.relacionId} onClick={handleDetachUnidad}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </>
            ) : undefined}
            details={
              selectedUnidad ? (
                <DetailFields
                  onSave={saveEditableCell}
                  readOnly={readOnly}
                  rows={[
                    { label: 'Id', value: selectedUnidad.id },
                    {
                      label: 'Orden',
                      value: selectedUnidad.orden,
                      target: {
                        entity: 'unidadDidacticaModulo',
                        id: selectedUnidad.relacionId,
                        field: 'orden',
                        valueType: 'number',
                      },
                    },
                    {
                      label: 'Nombre',
                      value: selectedUnidad.nombre,
                      target: { entity: 'unidadDidactica', id: selectedUnidad.id, field: 'nombre', valueType: 'text' },
                    },
                    {
                      label: 'Duracion',
                      value: selectedUnidad.duracion,
                      target: { entity: 'unidadDidactica', id: selectedUnidad.id, field: 'duracion', valueType: 'number' },
                    },
                    {
                      label: 'Creditos',
                      value: selectedUnidad.creditos,
                      target: { entity: 'unidadDidactica', id: selectedUnidad.id, field: 'creditos', valueType: 'number' },
                    },
                    {
                      label: 'Sigla',
                      value: selectedUnidad.sigla,
                      target: { entity: 'unidadDidactica', id: selectedUnidad.id, field: 'sigla', valueType: 'text' },
                    },
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
                      setSelectedIndicadorId(null);
                    }}
                    sx={{ alignItems: 'flex-start', py: 0.9, minHeight: 68 }}
                  >
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={
                        <EditableValue
                          value={unidad.nombre || `Unidad ${unidad.id}`}
                          target={{ entity: 'unidadDidactica', id: unidad.id, field: 'nombre', valueType: 'text' }}
                          lines={2}
                          variant="body2"
                          onSave={saveEditableCell}
                          readOnly={readOnly}
                        />
                      }
                      secondary={
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.65, flexWrap: 'wrap', rowGap: 0.5 }}>
                          <Chip size="small" label={`Ord ${unidad.orden ?? '-'}`} />
                          <EditableMetricChip
                            value={unidad.duracion}
                            target={{ entity: 'unidadDidactica', id: unidad.id, field: 'duracion', valueType: 'number' }}
                            suffix=" hr"
                            onSave={saveEditableCell}
                            readOnly={readOnly}
                          />
                          <EditableMetricChip
                            value={unidad.creditos}
                            target={{ entity: 'unidadDidactica', id: unidad.id, field: 'creditos', valueType: 'number' }}
                            prefix="Cr "
                            onSave={saveEditableCell}
                            readOnly={readOnly}
                          />
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
            actions={!readOnly ? (
              <>
                <IconButton size="small" title="Crear capacidad" disabled={actionLoading || !selectedUnidad?.id} onClick={handleCreateCapacidad}>
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" title="Quitar capacidad" color="error" disabled={actionLoading || !selectedCapacidad?.id} onClick={handleDetachCapacidad}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </>
            ) : undefined}
            details={
              selectedCapacidad ? (
                <DetailFields
                  onSave={saveEditableCell}
                  readOnly={readOnly}
                  rows={[
                    { label: 'Id', value: selectedCapacidad.id },
                    {
                      label: 'Descripcion',
                      value: selectedCapacidad.descripcion,
                      lines: 3,
                      target: {
                        entity: 'capacidadTerminal',
                        id: selectedCapacidad.id,
                        field: 'descripcion',
                        valueType: 'text',
                      },
                    },
                    {
                      label: 'Sigla',
                      value: selectedCapacidad.sigla,
                      target: { entity: 'capacidadTerminal', id: selectedCapacidad.id, field: 'sigla', valueType: 'text' },
                    },
                    { label: 'Unidad', value: selectedCapacidad.unidadDidacticaId },
                    { label: 'Indicadores', value: selectedCapacidad.indicadoresCapacidad.length },
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
                    onClick={() => {
                      setSelectedCapacidadId(capacidad.id);
                      setSelectedIndicadorId(null);
                    }}
                    sx={{ alignItems: 'flex-start', py: 0.95, minHeight: 78 }}
                  >
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={
                        <EditableValue
                          value={capacidad.descripcion || `Capacidad ${capacidad.id}`}
                          target={{
                            entity: 'capacidadTerminal',
                            id: capacidad.id,
                            field: 'descripcion',
                            valueType: 'text',
                          }}
                          lines={4}
                          variant="body2"
                          onSave={saveEditableCell}
                          readOnly={readOnly}
                        />
                      }
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
            actions={!readOnly ? (
              <>
                <IconButton size="small" title="Crear indicador" disabled={actionLoading || !selectedCapacidad?.id} onClick={handleCreateIndicador}>
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" title="Quitar indicador" color="error" disabled={actionLoading || !selectedIndicador?.id} onClick={handleDetachSelectedIndicador}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </>
            ) : undefined}
            details={
              selectedCapacidad ? (
                <DetailFields
                  onSave={saveEditableCell}
                  readOnly={readOnly}
                  rows={[
                    { label: 'Capacidad', value: selectedCapacidad.id },
                    { label: 'Unidad', value: selectedUnidad?.id },
                    { label: 'Modulo', value: selectedModulo?.id },
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
                    selected={selectedIndicador?.id === indicador.id}
                    onClick={() => setSelectedIndicadorId(indicador.id)}
                    sx={{ alignItems: 'flex-start', py: 0.95, minHeight: 72 }}
                  >
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={
                        <EditableValue
                          value={indicador.descripcion || `Indicador ${indicador.id}`}
                          target={{
                            entity: 'indicadorCapacidad',
                            id: indicador.id,
                            field: 'descripcion',
                            valueType: 'text',
                          }}
                          lines={4}
                          variant="body2"
                          onSave={saveEditableCell}
                          readOnly={readOnly}
                        />
                      }
                      secondary={
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.65, flexWrap: 'wrap', rowGap: 0.5 }}>
                          <Chip size="small" label={`Id ${indicador.id}`} />
                          <Box
                            sx={{
                              px: 0.75,
                              minHeight: 24,
                              display: 'inline-flex',
                              alignItems: 'center',
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 12,
                              bgcolor: 'action.hover',
                            }}
                          >
                            <EditableValue
                              value={indicador.sigla}
                              target={{
                                entity: 'indicadorCapacidad',
                                id: indicador.id,
                                field: 'sigla',
                                valueType: 'text',
                              }}
                              lines={1}
                              onSave={saveEditableCell}
                              readOnly={readOnly}
                            />
                          </Box>
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
      <Dialog open={Boolean(reuseDialog)} onClose={() => setReuseDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {reuseDialog?.kind === 'modulo' ? 'Reutilizar modulo comun' : 'Reutilizar unidad didactica comun'}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel id="reuse-academic-item-label">Elemento comun</InputLabel>
            <Select
              labelId="reuse-academic-item-label"
              label="Elemento comun"
              value={reuseDialog?.value ?? ''}
              onChange={(event) => setReuseDialog((current) => current ? { ...current, value: event.target.value } : current)}
            >
              {(reuseDialog?.kind === 'modulo' ? reusableModulos : reusableUnidades).map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {'tituloComercial' in item
                    ? item.tituloComercial || item.titulo || `Modulo ${item.id}`
                    : item.nombre || item.sigla || `Unidad ${item.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReuseDialog(null)}>Cancelar</Button>
          <Button variant="contained" disabled={!reuseDialog?.value || actionLoading} onClick={handleConfirmReuse}>
            Reutilizar
          </Button>
        </DialogActions>
      </Dialog>
    </IntranetListLayout>
  );
}
