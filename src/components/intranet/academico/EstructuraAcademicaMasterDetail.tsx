'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
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
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
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
  orden: number | null;
  capacidadTerminalId: number | null;
}

interface CapacidadDetalle {
  id: number;
  descripcion: string | null;
  sigla: string | null;
  orden: number | null;
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
  competencia: string | null;
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
type ReorderAcademicEntity = 'unidadDidacticaModulo' | 'capacidadTerminal' | 'indicadorCapacidad';

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

type DragState = {
  entity: ReorderAcademicEntity;
  id: number;
};

type DropPosition = 'before' | 'after';

type DropIndicatorState = DragState & {
  position: DropPosition;
};

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
  return modulo?.titulo || modulo?.tituloComercial || `Modulo ${modulo?.id ?? ''}`;
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

function moveItem<T>(items: T[], fromIndex: number, toIndex: number, position: DropPosition) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;
  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  let insertionIndex = position === 'after' ? toIndex + 1 : toIndex;
  if (fromIndex < insertionIndex) insertionIndex -= 1;
  insertionIndex = Math.max(0, Math.min(insertionIndex, next.length));
  next.splice(insertionIndex, 0, moved);
  return next;
}

function withSequentialOrder<T extends { orden: number | null }>(items: T[]) {
  return items.map((item, index) => ({ ...item, orden: index + 1 }));
}

function reorderById<T>(
  items: T[],
  sourceId: number,
  targetId: number,
  position: DropPosition,
  getId: (item: T) => number,
) {
  const fromIndex = items.findIndex((item) => getId(item) === sourceId);
  const toIndex = items.findIndex((item) => getId(item) === targetId);
  return moveItem(items, fromIndex, toIndex, position);
}

function getDropPosition(event: DragEvent<HTMLElement>): DropPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

function DragHandle({
  enabled,
  onDragStart,
}: {
  enabled: boolean;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
}) {
  return (
    <Box
      component="span"
      aria-hidden
      draggable={enabled}
      onDragStart={enabled ? onDragStart : undefined}
      sx={{
        width: 18,
        minWidth: 18,
        mt: 0.1,
        display: 'inline-flex',
        justifyContent: 'center',
        color: enabled ? 'text.secondary' : 'action.disabled',
        cursor: enabled ? 'grab' : 'default',
      }}
    >
      <DragIndicatorIcon fontSize="small" />
    </Box>
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

function isCommonUnidadTarget(items: ModuloDetalle[], target: EditableCellTarget) {
  for (const modulo of items) {
    for (const unidad of modulo.unidadesDidacticas) {
      if (!unidad.comun) continue;

      if (target.entity === 'unidadDidactica' && unidad.id === target.id) return true;
      if (target.entity === 'unidadDidacticaModulo' && unidad.relacionId === target.id) return true;

      for (const capacidad of unidad.capacidadesTerminales) {
        if (target.entity === 'capacidadTerminal' && capacidad.id === target.id) return true;

        if (
          target.entity === 'indicadorCapacidad' &&
          capacidad.indicadoresCapacidad.some((indicador) => indicador.id === target.id)
        ) {
          return true;
        }
      }
    }
  }

  return false;
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
  canCreate = !readOnly,
  canEdit = !readOnly,
  canDelete = !readOnly,
  showSearch = true,
  errorMessage = 'No se pudo cargar la estructura academica. Verifica que tu usuario tenga permiso administrativo.',
}: {
  callableName?: EstructuraAcademicaCallableName;
  title?: string;
  readOnly?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
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
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const dropIndicatorRef = useRef<DropIndicatorState | null>(null);

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);
  const allowEdit = !readOnly && canEdit;
  const allowCreate = !readOnly && canCreate;
  const allowDelete = !readOnly && canDelete;

  const saveEditableCell = useCallback(async (target: EditableCellTarget, value: EditableCellValue) => {
    if (!allowEdit) {
      throw new Error('No tienes permiso para editar la estructura academica.');
    }
    if (isCommonUnidadTarget(modulos, target)) {
      throw new Error('Las unidades didacticas comunes no se pueden editar desde esta vista.');
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
  }, [allowEdit, auth, functions, modulos]);

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
  const selectedUnidadIsComun = Boolean(selectedUnidad?.comun);
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

  const beginDrag = useCallback((event: DragEvent<HTMLElement>, nextDragState: DragState) => {
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${nextDragState.entity}:${nextDragState.id}`);
  }, []);

  const endDrag = useCallback(() => {
    dragStateRef.current = null;
    dropIndicatorRef.current = null;
    setDragState(null);
    setDropIndicator(null);
  }, []);

  const updateDropIndicator = useCallback((
    event: DragEvent<HTMLElement>,
    entity: ReorderAcademicEntity,
    id: number,
    enabled: boolean,
  ) => {
    const currentDrag = dragStateRef.current;
    if (!enabled || currentDrag?.entity !== entity) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const nextIndicator: DropIndicatorState = { entity, id, position: getDropPosition(event) };
    const currentIndicator = dropIndicatorRef.current;
    if (
      currentIndicator?.entity !== nextIndicator.entity ||
      currentIndicator.id !== nextIndicator.id ||
      currentIndicator.position !== nextIndicator.position
    ) {
      dropIndicatorRef.current = nextIndicator;
      setDropIndicator(nextIndicator);
    }
  }, []);

  const clearDropIndicator = useCallback((entity: ReorderAcademicEntity, id: number) => {
    const currentIndicator = dropIndicatorRef.current;
    if (currentIndicator?.entity !== entity || currentIndicator.id !== id) return;
    dropIndicatorRef.current = null;
    setDropIndicator(null);
  }, []);

  const dropIndicatorSx = useCallback((entity: ReorderAcademicEntity, id: number) => {
    const active = dropIndicator?.entity === entity && dropIndicator.id === id;
    return {
      position: 'relative' as const,
      '&::before': active && dropIndicator.position === 'before'
        ? {
            content: '""',
            position: 'absolute' as const,
            left: 8,
            right: 8,
            top: 0,
            height: 4,
            bgcolor: 'common.black',
            borderRadius: 999,
            zIndex: 2,
          }
        : undefined,
      '&::after': active && dropIndicator.position === 'after'
        ? {
            content: '""',
            position: 'absolute' as const,
            left: 8,
            right: 8,
            bottom: 0,
            height: 4,
            bgcolor: 'common.black',
            borderRadius: 999,
            zIndex: 2,
          }
        : undefined,
    };
  }, [dropIndicator]);

  const persistReorder = useCallback(async (
    entity: ReorderAcademicEntity,
    items: Array<{ id: number; orden: number | null }>,
  ) => {
    if (!allowEdit) return;
    setActionLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const reorderEstructuraAcademicaItems = httpsCallable<
        { entity: ReorderAcademicEntity; items: Array<{ id: number; orden: number }> },
        { updated: number }
      >(functions, 'reorderEstructuraAcademicaItems');
      await reorderEstructuraAcademicaItems({
        entity,
        items: items.map((item, index) => ({ id: item.id, orden: item.orden ?? index + 1 })),
      });
      setError(null);
    } catch (err) {
      console.error('Error reordering academic structure: ', err);
      setError('No se pudo guardar el nuevo orden.');
      await fetchEstructura();
    } finally {
      setActionLoading(false);
    }
  }, [allowEdit, auth, fetchEstructura, functions]);

  const handleUnidadDrop = useCallback((targetRelacionId: number, position: DropPosition) => {
    const currentDrag = dragStateRef.current;
    if (!selectedModulo?.id || !currentDrag || currentDrag.entity !== 'unidadDidacticaModulo') return;
    if (currentDrag.id === targetRelacionId) return;
    const source = unidades.find((unidad) => unidad.relacionId === currentDrag.id);
    const target = unidades.find((unidad) => unidad.relacionId === targetRelacionId);
    if (!source || !target || source.comun || target.comun) return;
    const ordered = withSequentialOrder(reorderById(
      unidades,
      currentDrag.id,
      targetRelacionId,
      position,
      (unidad) => unidad.relacionId,
    ));
    setModulos((current) => current.map((modulo) => (
      modulo.id === selectedModulo.id ? { ...modulo, unidadesDidacticas: ordered } : modulo
    )));
    void persistReorder('unidadDidacticaModulo', ordered.map((unidad) => ({ id: unidad.relacionId, orden: unidad.orden })));
  }, [persistReorder, selectedModulo?.id, unidades]);

  const handleCapacidadDrop = useCallback((targetCapacidadId: number, position: DropPosition) => {
    const currentDrag = dragStateRef.current;
    if (!selectedModulo?.id || !selectedUnidad?.id || !currentDrag || currentDrag.entity !== 'capacidadTerminal') return;
    if (currentDrag.id === targetCapacidadId || selectedUnidadIsComun) return;
    const ordered = withSequentialOrder(reorderById(capacidades, currentDrag.id, targetCapacidadId, position, (capacidad) => capacidad.id));
    setModulos((current) => current.map((modulo) => (
      modulo.id !== selectedModulo.id ? modulo : {
        ...modulo,
        unidadesDidacticas: modulo.unidadesDidacticas.map((unidad) => (
          unidad.id === selectedUnidad.id ? { ...unidad, capacidadesTerminales: ordered } : unidad
        )),
      }
    )));
    void persistReorder('capacidadTerminal', ordered.map((capacidad) => ({ id: capacidad.id, orden: capacidad.orden })));
  }, [capacidades, persistReorder, selectedModulo?.id, selectedUnidad?.id, selectedUnidadIsComun]);

  const handleIndicadorDrop = useCallback((targetIndicadorId: number, position: DropPosition) => {
    const currentDrag = dragStateRef.current;
    if (!selectedModulo?.id || !selectedUnidad?.id || !selectedCapacidad?.id || !currentDrag || currentDrag.entity !== 'indicadorCapacidad') return;
    if (currentDrag.id === targetIndicadorId || selectedUnidadIsComun) return;
    const ordered = withSequentialOrder(reorderById(indicadores, currentDrag.id, targetIndicadorId, position, (indicador) => indicador.id));
    setModulos((current) => current.map((modulo) => (
      modulo.id !== selectedModulo.id ? modulo : {
        ...modulo,
        unidadesDidacticas: modulo.unidadesDidacticas.map((unidad) => (
          unidad.id !== selectedUnidad.id ? unidad : {
            ...unidad,
            capacidadesTerminales: unidad.capacidadesTerminales.map((capacidad) => (
              capacidad.id === selectedCapacidad.id ? { ...capacidad, indicadoresCapacidad: ordered } : capacidad
            )),
          }
        )),
      }
    )));
    void persistReorder('indicadorCapacidad', ordered.map((indicador) => ({ id: indicador.id, orden: indicador.orden })));
  }, [indicadores, persistReorder, selectedCapacidad?.id, selectedModulo?.id, selectedUnidad?.id, selectedUnidadIsComun]);

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
    if (!selectedUnidad?.id || selectedUnidadIsComun) return;
    void runStructureAction('createEstructuraAcademicaItem', {
      entity: 'capacidadTerminal',
      unidadDidacticaId: selectedUnidad.id,
    });
  }, [runStructureAction, selectedUnidad?.id, selectedUnidadIsComun]);

  const handleCreateIndicador = useCallback(() => {
    if (!selectedCapacidad?.id || selectedUnidadIsComun) return;
    void runStructureAction('createEstructuraAcademicaItem', {
      entity: 'indicadorCapacidad',
      capacidadTerminalId: selectedCapacidad.id,
    });
  }, [runStructureAction, selectedCapacidad?.id, selectedUnidadIsComun]);

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
    if (!selectedCapacidad?.id || selectedUnidadIsComun) return;
    if (!window.confirm('Se quitara esta capacidad y sus indicadores. Deseas continuar?')) return;
    void runStructureAction('detachEstructuraAcademicaItem', {
      entity: 'capacidadTerminal',
      capacidadTerminalId: selectedCapacidad.id,
    });
  }, [runStructureAction, selectedCapacidad?.id, selectedUnidadIsComun]);

  const handleDetachIndicador = useCallback((indicadorId: number) => {
    if (selectedUnidadIsComun) return;
    if (!window.confirm('Se quitara este indicador. Deseas continuar?')) return;
    void runStructureAction('detachEstructuraAcademicaItem', {
      entity: 'indicadorCapacidad',
      indicadorCapacidadId: indicadorId,
    });
  }, [runStructureAction, selectedUnidadIsComun]);

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
        <Box sx={{ px: 1, pb: 2 }}>
          <Alert severity="info">No hay registros para mostrar.</Alert>
        </Box>
      ) : (
        <Box
          sx={{
            px: 1,
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
            actions={allowCreate || allowEdit || allowDelete ? (
              <>
                {allowCreate ? (
                  <IconButton size="small" title="Crear modulo" disabled={actionLoading || !selectedModulo?.planId} onClick={handleCreateModulo}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                ) : null}
                {allowEdit ? (
                  <IconButton
                    size="small"
                    title="Reutilizar modulo comun"
                    disabled={actionLoading || !selectedModulo?.planId || reusableModulos.length === 0}
                    onClick={() => setReuseDialog({ kind: 'modulo', value: '' })}
                  >
                    <LinkIcon fontSize="small" />
                  </IconButton>
                ) : null}
                {allowDelete ? (
                  <IconButton size="small" title="Quitar modulo del plan" color="error" disabled={actionLoading || !selectedModulo?.planModuloId} onClick={handleDetachModulo}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </>
            ) : undefined}
            details={
              selectedModulo ? (
                <DetailFields
                  onSave={saveEditableCell}
                  readOnly={!allowEdit}
                  rows={[
                    {
                      label: 'Titulo',
                      value: selectedModulo.titulo,
                      target: { entity: 'modulo', id: selectedModulo.id, field: 'titulo', valueType: 'text' },
                    },
                    {
                      label: 'Unidad de Competencia',
                      value: selectedModulo.competencia,
                      lines: 4,
                      target: { entity: 'modulo', id: selectedModulo.id, field: 'competencia', valueType: 'text' },
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
                          target={{ entity: 'modulo', id: modulo.id, field: 'titulo', valueType: 'text' }}
                          lines={2}
                          variant="body2"
                          onSave={saveEditableCell}
                          readOnly={!allowEdit}
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
            actions={allowCreate || allowEdit || allowDelete ? (
              <>
                {allowCreate ? (
                  <IconButton size="small" title="Crear unidad didactica" disabled={actionLoading || !selectedModulo?.id} onClick={handleCreateUnidad}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                ) : null}
                {allowEdit ? (
                  <IconButton
                    size="small"
                    title="Reutilizar unidad comun"
                    disabled={actionLoading || !selectedModulo?.id || reusableUnidades.length === 0}
                    onClick={() => setReuseDialog({ kind: 'unidadDidactica', value: '' })}
                  >
                    <LinkIcon fontSize="small" />
                  </IconButton>
                ) : null}
                {allowDelete ? (
                  <IconButton size="small" title="Quitar unidad del modulo" color="error" disabled={actionLoading || !selectedUnidad?.relacionId} onClick={handleDetachUnidad}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </>
            ) : undefined}
            details={
              selectedUnidad ? (
                <DetailFields
                  onSave={saveEditableCell}
                  readOnly={!allowEdit || selectedUnidadIsComun}
                  rows={[
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
                  ]}
                />
              ) : undefined
            }
          >
            {unidades.length === 0 ? (
              <EmptyState label="Sin unidades." />
            ) : (
              <List dense disablePadding>
                {unidades.map((unidad) => {
                  const unidadComun = Boolean(unidad.comun);
                  const unidadReadOnly = !allowEdit || unidadComun;
                  const canDragUnidad = allowEdit && !unidadComun && !actionLoading;

                  return (
                    <ListItemButton
                      key={`${unidad.relacionId}-${unidad.id}`}
                      onDragOver={(event) => updateDropIndicator(
                        event,
                        'unidadDidacticaModulo',
                        unidad.relacionId,
                        canDragUnidad,
                      )}
                      onDragLeave={() => clearDropIndicator('unidadDidacticaModulo', unidad.relacionId)}
                      onDrop={(event) => {
                        event.preventDefault();
                        handleUnidadDrop(unidad.relacionId, dropIndicatorRef.current?.position ?? getDropPosition(event));
                        endDrag();
                      }}
                      onDragEnd={endDrag}
                      selected={selectedUnidad?.id === unidad.id}
                      onClick={() => {
                        setSelectedUnidadId(unidad.id);
                        setSelectedCapacidadId(null);
                        setSelectedIndicadorId(null);
                      }}
                      sx={{
                        alignItems: 'flex-start',
                        px: 1,
                        py: 0.9,
                        minHeight: 68,
                        ...dropIndicatorSx('unidadDidacticaModulo', unidad.relacionId),
                        bgcolor: unidadComun ? 'rgba(244, 143, 177, 0.16)' : undefined,
                        '&:hover': {
                          bgcolor: unidadComun ? 'rgba(244, 143, 177, 0.24)' : undefined,
                        },
                        '&.Mui-selected': {
                          bgcolor: unidadComun ? 'rgba(244, 143, 177, 0.30)' : undefined,
                        },
                        '&.Mui-selected:hover': {
                          bgcolor: unidadComun ? 'rgba(244, 143, 177, 0.36)' : undefined,
                        },
                      }}
                    >
                      <ListItemText
                        primaryTypographyProps={{ component: 'div' }}
                        secondaryTypographyProps={{ component: 'div' }}
                        primary={
                          <Stack direction="row" spacing={0.5} alignItems="flex-start">
                            <DragHandle
                              enabled={canDragUnidad}
                              onDragStart={(event) => beginDrag(event, {
                                entity: 'unidadDidacticaModulo',
                                id: unidad.relacionId,
                              })}
                            />
                            <EditableValue
                              value={unidad.nombre || `Unidad ${unidad.id}`}
                              target={{ entity: 'unidadDidactica', id: unidad.id, field: 'nombre', valueType: 'text' }}
                              lines={2}
                              variant="body2"
                              onSave={saveEditableCell}
                              readOnly={unidadReadOnly}
                            />
                          </Stack>
                        }
                        secondary={
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.65, flexWrap: 'wrap', rowGap: 0.5 }}>
                            {unidadComun ? <Chip size="small" label="Comun" color="secondary" variant="outlined" /> : null}
                            <EditableMetricChip
                              value={unidad.duracion}
                              target={{ entity: 'unidadDidactica', id: unidad.id, field: 'duracion', valueType: 'number' }}
                              suffix=" hr"
                              onSave={saveEditableCell}
                              readOnly={unidadReadOnly}
                            />
                            <EditableMetricChip
                              value={unidad.creditos}
                              target={{ entity: 'unidadDidactica', id: unidad.id, field: 'creditos', valueType: 'number' }}
                              prefix="Cr "
                              onSave={saveEditableCell}
                              readOnly={unidadReadOnly}
                            />
                            <Chip size="small" label={`CAP ${unidad.capacidadesTerminales.length}`} />
                            <Chip size="small" label={`IND ${unidad.capacidadesTerminales.reduce((total, capacidad) => total + capacidad.indicadoresCapacidad.length, 0)}`} />
                          </Stack>
                        }
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Panel>

          <Panel
            title="Capacidad"
            count={capacidades.length}
            actions={allowCreate || allowDelete ? (
              <>
                {allowCreate ? (
                  <IconButton size="small" title="Crear capacidad" disabled={actionLoading || !selectedUnidad?.id || selectedUnidadIsComun} onClick={handleCreateCapacidad}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                ) : null}
                {allowDelete ? (
                  <IconButton size="small" title="Quitar capacidad" color="error" disabled={actionLoading || !selectedCapacidad?.id || selectedUnidadIsComun} onClick={handleDetachCapacidad}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </>
            ) : undefined}
            details={
              selectedCapacidad ? (
                <DetailFields
                  onSave={saveEditableCell}
                  readOnly={!allowEdit || selectedUnidadIsComun}
                  rows={[
                    { label: 'Unidad', value: selectedUnidad?.nombre || (selectedUnidad ? `Unidad ${selectedUnidad.id}` : '-') },
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
                {capacidades.map((capacidad) => {
                  const canDragCapacidad = allowEdit && !selectedUnidadIsComun && !actionLoading;
                  return (
                  <ListItemButton
                    key={capacidad.id}
                    onDragOver={(event) => updateDropIndicator(
                      event,
                      'capacidadTerminal',
                      capacidad.id,
                      canDragCapacidad,
                    )}
                    onDragLeave={() => clearDropIndicator('capacidadTerminal', capacidad.id)}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleCapacidadDrop(capacidad.id, dropIndicatorRef.current?.position ?? getDropPosition(event));
                      endDrag();
                    }}
                    onDragEnd={endDrag}
                    selected={selectedCapacidad?.id === capacidad.id}
                    onClick={() => {
                      setSelectedCapacidadId(capacidad.id);
                      setSelectedIndicadorId(null);
                    }}
                    sx={{
                      alignItems: 'flex-start',
                      px: 1,
                      py: 0.95,
                      minHeight: 78,
                      ...dropIndicatorSx('capacidadTerminal', capacidad.id),
                    }}
                  >
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={
                        <Stack direction="row" spacing={0.5} alignItems="flex-start">
                          <DragHandle
                            enabled={canDragCapacidad}
                            onDragStart={(event) => beginDrag(event, {
                              entity: 'capacidadTerminal',
                              id: capacidad.id,
                            })}
                          />
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
                            readOnly={!allowEdit || selectedUnidadIsComun}
                          />
                        </Stack>
                      }
                      secondary={
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.65, flexWrap: 'wrap', rowGap: 0.5 }}>
                          <Chip size="small" label={`Id ${capacidad.id}`} />
                          <Chip size="small" label={`IND ${capacidad.indicadoresCapacidad.length}`} />
                        </Stack>
                      }
                    />
                  </ListItemButton>
                );
                })}
              </List>
            )}
          </Panel>

          <Panel
            title="Criterio / Indicador"
            count={indicadores.length}
            actions={allowCreate || allowDelete ? (
              <>
                {allowCreate ? (
                  <IconButton size="small" title="Crear indicador" disabled={actionLoading || !selectedCapacidad?.id || selectedUnidadIsComun} onClick={handleCreateIndicador}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                ) : null}
                {allowDelete ? (
                  <IconButton size="small" title="Quitar indicador" color="error" disabled={actionLoading || !selectedIndicador?.id || selectedUnidadIsComun} onClick={handleDetachSelectedIndicador}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </>
            ) : undefined}
            details={
              selectedCapacidad ? (
                <DetailFields
                  onSave={saveEditableCell}
                  readOnly={!allowEdit}
                  rows={[
                    { label: 'Capacidad', value: selectedCapacidad.descripcion || `Capacidad ${selectedCapacidad.id}`, lines: 3 },
                  ]}
                />
              ) : undefined
            }
          >
            {indicadores.length === 0 ? (
              <EmptyState label="Sin indicadores." />
            ) : (
              <List dense disablePadding>
                {indicadores.map((indicador) => {
                  const canDragIndicador = allowEdit && !selectedUnidadIsComun && !actionLoading;
                  return (
                  <ListItemButton
                    key={indicador.id}
                    onDragOver={(event) => updateDropIndicator(
                      event,
                      'indicadorCapacidad',
                      indicador.id,
                      canDragIndicador,
                    )}
                    onDragLeave={() => clearDropIndicator('indicadorCapacidad', indicador.id)}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleIndicadorDrop(indicador.id, dropIndicatorRef.current?.position ?? getDropPosition(event));
                      endDrag();
                    }}
                    onDragEnd={endDrag}
                    selected={selectedIndicador?.id === indicador.id}
                    onClick={() => setSelectedIndicadorId(indicador.id)}
                    sx={{
                      alignItems: 'flex-start',
                      px: 1,
                      py: 0.95,
                      minHeight: 72,
                      ...dropIndicatorSx('indicadorCapacidad', indicador.id),
                    }}
                  >
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={
                        <Stack direction="row" spacing={0.5} alignItems="flex-start">
                          <DragHandle
                            enabled={canDragIndicador}
                            onDragStart={(event) => beginDrag(event, {
                              entity: 'indicadorCapacidad',
                              id: indicador.id,
                            })}
                          />
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
                            readOnly={!allowEdit || selectedUnidadIsComun}
                          />
                        </Stack>
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
                              readOnly={!allowEdit || selectedUnidadIsComun}
                            />
                          </Box>
                        </Stack>
                      }
                    />
                  </ListItemButton>
                );
                })}
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
                    ? item.titulo || item.tituloComercial || `Modulo ${item.id}`
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
