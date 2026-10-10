'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import SesionItemList, { type SesionListItem } from './SesionItemList';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
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
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { isSuperUserEmail, isSuperUserRole, isSuperUserTitle } from '@/lib/intranetPermissions';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import MultiSelectWithActions from '@/components/intranet/MultiSelectWithActions';
import {
  curricularCareerOptions,
  curricularPlanCatalog,
  curricularPlanOptions,
  curricularTitle,
  filterCurricularModules,
  type CurricularPlan,
} from '@/lib/curricularFilters';

interface SesionDetalle {
  id: number;
  nombre: string | null;
  numeroSesion: number | null;
  duracion?: number | null;
  fecha?: string | null;
  orden: number | null;
  contenidos: Array<{ id: number; orden: number; texto: string }>;
  materiales: Array<{ id: number; orden: number; texto: string }>;
}

interface IndicadorDetalle {
  id: number;
  descripcion: string | null;
  sigla: string | null;
  orden: number | null;
  capacidadTerminalId: number | null;
  aprendizajes?: Array<{ id: number; descripcion: string | null; actividades: SesionDetalle[] }>;
}

interface CapacidadDetalle {
  id: number;
  descripcion: string | null;
  sigla: string | null;
  orden: number | null;
  unidadDidacticaId: number | null;
  competencias?: Array<{ id: number; nombre: string; tipo: 'TECNICA' | 'EMPLEABILIDAD'; moduloId: number }>;
  indicadoresCapacidad: IndicadorDetalle[];
}

interface UnidadDidacticaDetalle {
  id: number;
  relacionId: number;
  competenciaId: number;
  competencia: { id: number; nombre: string; tipo: 'TECNICA' | 'EMPLEABILIDAD'; moduloId: number };
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
  competencias: Array<{ id: number; nombre: string; tipo: 'TECNICA' | 'EMPLEABILIDAD'; orden?: number | null }>;
  horas: number | null;
  creditos: number | null;
  metas: number | null;
  activo: boolean | null;
  slug: string | null;
  comun: boolean | null;
  planModuloId?: number | null;
  planId: number | null;
  planIds?: number[];
  plan: CurricularPlan | null;
  planModulos?: Array<{ id: number; planId: number; orden?: number | null; plan?: CurricularPlan | null }>;
  unidadesDidacticas: UnidadDidacticaDetalle[];
}

type EditableAcademicEntity = 'modulo' | 'competencia' | 'actividad' | 'aprendizaje' | 'actividadContenido' | 'actividadMaterial' | 'unidadDidactica' | 'competenciaUnidadDidactica' | 'capacidadTerminal' | 'indicadorCapacidad';
type EditableValueType = 'text' | 'number' | 'boolean';
type EditableCellValue = string | number | boolean | null;
type ReorderAcademicEntity = 'modulo' | 'competencia' | 'actividad' | 'competenciaUnidadDidactica' | 'capacidadTerminal' | 'indicadorCapacidad';

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



type DragState = {
  entity: ReorderAcademicEntity;
  id: number;
};

type DropPosition = 'before' | 'after';

type DropIndicatorState = DragState & {
  position: DropPosition;
};

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

function withSequentialOrder<T extends { orden?: number | null }>(items: T[]) {
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
  return event.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
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
  if (['competencia', 'actividad', 'aprendizaje', 'actividadContenido'].includes(target.entity)) {
    return items.map(modulo => ({ ...modulo,
      competencias: modulo.competencias.map(item => target.entity === 'competencia' && item.id === target.id ? { ...item, [target.field]: value } as typeof item : item),
      unidadesDidacticas: modulo.unidadesDidacticas.map(unidad => ({ ...unidad,
        competencia: target.entity === 'competencia' && unidad.competencia.id === target.id ? { ...unidad.competencia, [target.field]: value } as typeof unidad.competencia : unidad.competencia,
        capacidadesTerminales: unidad.capacidadesTerminales.map(capacidad => ({ ...capacidad,
          indicadoresCapacidad: capacidad.indicadoresCapacidad.map(indicador => ({ ...indicador,
            aprendizajes: indicador.aprendizajes?.map(aprendizaje => ({ ...aprendizaje,
              descripcion: target.entity === 'aprendizaje' && aprendizaje.id === target.id ? value as string : aprendizaje.descripcion,
              actividades: aprendizaje.actividades.map(actividad => ({ ...actividad,
                ...(target.entity === 'actividad' && actividad.id === target.id ? { [target.field]: value } : {}),
                contenidos: actividad.contenidos.map(item => target.entity === 'actividadContenido' && item.id === target.id ? { ...item, texto: value as string } : item),
                materiales: actividad.materiales.map(item => target.entity === 'actividadMaterial' && item.id === target.id ? { ...item, texto: value as string } : item),
              })),
            })),
          })),
        })),
      })),
    }));
  }
  return items.map((modulo) => {
    if (target.entity === 'modulo' && modulo.id === target.id) {
      return { ...modulo, [target.field]: value } as ModuloDetalle;
    }

    return {
      ...modulo,
      unidadesDidacticas: modulo.unidadesDidacticas.map((unidad) => {
        if (target.entity === 'competenciaUnidadDidactica' && unidad.relacionId === target.id) {
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
      if (target.entity === 'competenciaUnidadDidactica' && unidad.relacionId === target.id) return true;

      for (const capacidad of unidad.capacidadesTerminales) {
        if (target.entity === 'capacidadTerminal' && capacidad.id === target.id) return true;

        if (
          target.entity === 'indicadorCapacidad' &&
          capacidad.indicadoresCapacidad.some((indicador) => indicador.id === target.id)
        ) {
          return true;
        }
        for (const indicador of capacidad.indicadoresCapacidad) for (const aprendizaje of indicador.aprendizajes ?? []) {
          if (target.entity === 'aprendizaje' && aprendizaje.id === target.id) return true;
          for (const actividad of aprendizaje.actividades) {
            if (target.entity === 'actividad' && actividad.id === target.id) return true;
            if (target.entity === 'actividadContenido' && actividad.contenidos.some(item => item.id === target.id)) return true;
            if (target.entity === 'actividadMaterial' && actividad.materiales.some(item => item.id === target.id)) return true;
          }
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
    } catch {
      // The parent displays the save error; keep the draft available for correction.
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

function EditableCompetenciaTipo({ id, tipo, readOnly, onSave }: {
  id: number;
  tipo: 'TECNICA' | 'EMPLEABILIDAD';
  readOnly: boolean;
  onSave: (target: EditableCellTarget, value: EditableCellValue) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  if (editing && !readOnly) return <Select size="small" value={tipo} disabled={saving} onClick={event => event.stopPropagation()} onClose={() => { if (!saving) setEditing(false); }} onChange={async event => {
    setSaving(true);
    try {
      await onSave({ entity: 'competencia', id, field: 'tipo', valueType: 'text' }, event.target.value);
      setEditing(false);
    } catch { /* The parent displays the validation error. */ }
    finally { setSaving(false); }
  }}>
    <MenuItem value="TECNICA">Técnica</MenuItem><MenuItem value="EMPLEABILIDAD">Para la empleabilidad</MenuItem>
  </Select>;
  return <Chip size="small" sx={{ mt: 1 }} title={readOnly ? undefined : 'Doble clic para editar'} label={tipo === 'TECNICA' ? 'Técnica' : 'Para la empleabilidad'} onDoubleClick={event => { if (!readOnly) { event.stopPropagation(); setEditing(true); } }} />;
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
  actions,
  cardWidth = { xs: 240, sm: 300 },
}: {
  title: string;
  count: number;
  children: ReactNode;
  actions?: ReactNode;
  cardWidth?: { xs: number; sm: number };
}) {
  return (
    <Box
      component="section"
      aria-label={title}
      sx={{
        minWidth: 0,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'row',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 0.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          flex: '0 0 80px',
          borderRight: '1px solid',
          borderColor: 'divider',
          minHeight: 144,
          bgcolor: 'action.hover',
        }}
      >
        <Typography component="h2" variant="subtitle2" sx={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
          {title}
        </Typography>
        <Stack spacing={0.5} alignItems="center" sx={{ '& .MuiIconButton-root': { flexShrink: 0 } }}>
          {actions}
          <Chip size="small" label={count} />
        </Stack>
      </Box>
      <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
        <Box
          role="group"
          aria-label={`${title}: elementos`}
          tabIndex={0}
          sx={{
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--mui-palette-divider, #bdbdbd) transparent',
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
            '& > .MuiList-root': { display: 'flex', flexWrap: 'nowrap', alignItems: 'stretch', gap: 1, p: 1, width: 'max-content', minWidth: '100%', boxSizing: 'border-box' },
            '& > .MuiList-root > .MuiListItemButton-root, & > .MuiList-root > .MuiListItem-root': { flex: '0 0 auto', width: cardWidth, minWidth: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1 },
            '& > .MuiList-root > [data-empleabilidad="true"]': { borderWidth: 2, borderColor: 'text.secondary' },
            '& .MuiListItemText-root': { minWidth: 0 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

type EstructuraAcademicaCallableName = 'listEstructuraAcademica' | 'listEstructuraAcademicaDocente';

export default function EstructuraAcademicaMasterDetail({
  callableName = 'listEstructuraAcademica',
  title = 'Programación Curricular',
  readOnly = false,
  canCreate = !readOnly,
  canEdit = !readOnly,
  canDelete = !readOnly,
  errorMessage = 'No se pudo cargar la programación curricular. Verifica que tu usuario tenga permiso administrativo.',
}: {
  callableName?: EstructuraAcademicaCallableName;
  title?: string;
  readOnly?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  errorMessage?: string;
}) {
  const { user } = useAuth();
  const showToolbar = Boolean(user && user.profileResolved !== false && (
    Number(user.level) > 200
    || isSuperUserRole(user.role)
    || isSuperUserTitle(user.roleTitle)
    || isSuperUserEmail(user.email)
  ));
  const [modulos, setModulos] = useState<ModuloDetalle[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<Array<{ id: number; nombre: string }>>([]);
  const [planes, setPlanes] = useState<CurricularPlan[]>([]);
  const [opciones, setOpciones] = useState<EstructuraOpciones>({ modulosComunes: [], unidadesComunes: [] });
  const [resolvedTitle, setResolvedTitle] = useState(curricularTitle(title));
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanKeys, setSelectedPlanKeys] = useState<string[]>(['all']);
  const [selectedCareerKey, setSelectedCareerKey] = useState('all');
  const [selectedModuloId, setSelectedModuloId] = useState<number | null>(null);
  const [selectedCompetenciaId, setSelectedCompetenciaId] = useState<number | null>(null);
  const [selectedUnidadId, setSelectedUnidadId] = useState<number | null>(null);
  const [selectedCapacidadId, setSelectedCapacidadId] = useState<number | null>(null);
  const [selectedIndicadorId, setSelectedIndicadorId] = useState<number | null>(null);
  const [selectedSesionId, setSelectedSesionId] = useState<number | null>(null);
  const [reuseDialog, setReuseDialog] = useState<{ kind: ReuseDialogKind; value: string } | null>(null);
  const [, setDragState] = useState<DragState | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const dropIndicatorRef = useRef<DropIndicatorState | null>(null);

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);
  const allowEdit = !readOnly && canEdit;
  const allowCreate = !readOnly && canCreate;
  const allowDelete = !readOnly && canDelete;

  const fetchEstructura = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listEstructuraAcademica = httpsCallable<undefined, {
        modulos?: ModuloDetalle[];
        planes?: CurricularPlan[];
        materiales?: Array<{ id: number; nombre: string }>;
        opciones?: EstructuraOpciones;
        title?: string | null;
      }>(
        functions,
        callableName,
      );
      const result = await listEstructuraAcademica();
      setModulos(result.data.modulos || []);
      setPlanes(result.data.planes || []);
      setCatalogMaterials(result.data.materiales || []);
      setOpciones(result.data.opciones || { modulosComunes: [], unidadesComunes: [] });
      setResolvedTitle(curricularTitle(result.data.title || title));
      setError(null);
    } catch (err) {
      console.error('Error fetching academic structure: ', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [auth, callableName, errorMessage, functions, title]);

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
      if ((target.entity === 'modulo' && target.field === 'horas') || (target.entity === 'competencia' && target.field === 'tipo')) await fetchEstructura();
      else setModulos((current) => applyEditableCellUpdate(current, target, value));
      setError(null);
    } catch (err) {
      console.error('Error saving academic structure cell: ', err);
      setError(err instanceof Error ? err.message : 'No se pudo guardar la celda.');
      throw err;
    }
  }, [allowEdit, auth, fetchEstructura, functions, modulos]);



  useEffect(() => {
    setResolvedTitle(curricularTitle(title));
  }, [title]);

  useEffect(() => {
    void fetchEstructura();
  }, [fetchEstructura]);

  const planCatalog = useMemo(() => curricularPlanCatalog(planes, modulos), [planes, modulos]);
  const planOptions = useMemo(() => curricularPlanOptions(planCatalog), [planCatalog]);
  const careerOptions = useMemo(() => curricularCareerOptions(planCatalog, selectedPlanKeys), [planCatalog, selectedPlanKeys]);
  const selectedCareer = careerOptions.find(option => option.key === selectedCareerKey) ?? null;
  const filteredModulos = useMemo(() => filterCurricularModules(modulos, planCatalog, selectedPlanKeys, selectedCareer),
    [modulos, planCatalog, selectedPlanKeys, selectedCareer]);

  useEffect(() => {
    if (loading || selectedPlanKeys.includes('all')) return;
    const available = selectedPlanKeys.filter(key => planOptions.some(option => option.key === key));
    if (available.length !== selectedPlanKeys.length) setSelectedPlanKeys(available.length ? available : ['all']);
  }, [loading, planOptions, selectedPlanKeys]);

  useEffect(() => {
    if (selectedCareerKey !== 'all' && !selectedCareer) setSelectedCareerKey('all');
  }, [selectedCareer, selectedCareerKey]);

  const selectedModulo = useMemo(
    () => filteredModulos.find((modulo) => modulo.id === selectedModuloId) ?? filteredModulos[0] ?? null,
    [filteredModulos, selectedModuloId],
  );

  const todasUnidades = useMemo(() => selectedModulo?.unidadesDidacticas ?? [], [selectedModulo]);
  const competencias = useMemo(() => (selectedModulo?.competencias ?? []).slice().sort((a, b) =>
    Number(a.tipo === 'EMPLEABILIDAD') - Number(b.tipo === 'EMPLEABILIDAD') || (a.orden ?? a.id) - (b.orden ?? b.id) || a.id - b.id,
  ), [selectedModulo]);
  const selectedCompetencia = competencias.find(competencia => competencia.id === selectedCompetenciaId) ?? competencias[0] ?? null;
  const unidades = useMemo(() => todasUnidades.filter(unidad => unidad.competenciaId === selectedCompetencia?.id),
    [todasUnidades, selectedCompetencia?.id]);
  useEffect(() => { setSelectedCompetenciaId(null); }, [selectedModulo?.id]);
  const selectedUnidad = useMemo(
    () => unidades.find((unidad) => unidad.id === selectedUnidadId) ?? unidades[0] ?? null,
    [selectedUnidadId, unidades],
  );
  const selectedUnidadIsComun = Boolean(selectedUnidad?.comun);
  const capacidades = useMemo(() => selectedUnidad?.capacidadesTerminales ?? [], [selectedUnidad]);
  const selectedCapacidad = useMemo(
    () => capacidades.find((capacidad) => capacidad.id === selectedCapacidadId) ?? capacidades[0] ?? null,
    [capacidades, selectedCapacidadId],
  );
  const indicadores = useMemo(() => selectedCapacidad?.indicadoresCapacidad ?? [], [selectedCapacidad]);
  const selectedIndicador = useMemo(
    () => indicadores.find((indicador) => indicador.id === selectedIndicadorId) ?? indicadores[0] ?? null,
    [indicadores, selectedIndicadorId],
  );
  const sesiones = useMemo(() => (selectedIndicador?.aprendizajes ?? []).flatMap(aprendizaje =>
    (aprendizaje.actividades ?? []).map(actividad => ({ ...actividad, aprendizajeId: aprendizaje.id, aprendizaje: aprendizaje.descripcion })),
  ).sort((a, b) => (a.orden ?? a.numeroSesion ?? a.id) - (b.orden ?? b.numeroSesion ?? b.id) || a.id - b.id), [selectedIndicador]);

  const selectedSesion = sesiones.find(item => item.id === selectedSesionId) ?? sesiones[0] ?? null;
  const materialOptions = useMemo(() => catalogMaterials.map(item => ({ id: item.id, orden: 0, texto: item.nombre })), [catalogMaterials]);
  const saveSesionItem = useCallback(async (actividadId: number, kind: 'contenido' | 'material', action: 'add' | 'remove' | 'reorder', data: { texto?: string; materialId?: number; itemId?: number; items?: Array<{ id: number; orden: number }> }) => {
    if (!allowEdit) throw new Error('No tienes permiso para editar.');
    const callable = httpsCallable<Record<string, unknown>, { items: SesionListItem[] }>(functions, 'saveEstructuraAcademicaSesionItem');
    const result = await callable({ actividadId, kind, action, ...data });
    if (kind === 'material') setCatalogMaterials(current => {
      const byId = new Map(current.map(item => [item.id, item]));
      for (const item of result.data.items) if (item.materialId) byId.set(item.materialId, { id: item.materialId, nombre: item.texto });
      return [...byId.values()].sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));
    });
    const field = kind === 'contenido' ? 'contenidos' : 'materiales';
    setModulos(current => current.map(modulo => ({ ...modulo, unidadesDidacticas: modulo.unidadesDidacticas.map(unidad => ({ ...unidad, capacidadesTerminales: unidad.capacidadesTerminales.map(capacidad => ({ ...capacidad, indicadoresCapacidad: capacidad.indicadoresCapacidad.map(indicador => ({ ...indicador, aprendizajes: indicador.aprendizajes?.map(aprendizaje => ({ ...aprendizaje, actividades: aprendizaje.actividades.map(actividad => actividad.id === actividadId ? { ...actividad, [field]: result.data.items } : actividad) })) })) })) })) })));
  }, [allowEdit, functions]);

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
      const result = await callable(payload);
      await fetchEstructura();
      if (callableName === 'createEstructuraAcademicaItem' && result.data.id) {
        if (payload.entity === 'competencia') setSelectedCompetenciaId(result.data.id);
        if (payload.entity === 'actividad') setSelectedSesionId(result.data.id);
      }
      setError(null);
    } catch (err) {
      console.error(`Error running ${callableName}: `, err);
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción.');
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
            left: 0,
            top: 8,
            bottom: 8,
            width: 4,
            bgcolor: 'common.black',
            borderRadius: 999,
            zIndex: 2,
          }
        : undefined,
      '&::after': active && dropIndicator.position === 'after'
        ? {
            content: '""',
            position: 'absolute' as const,
            right: 0,
            top: 8,
            bottom: 8,
            width: 4,
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
    scope?: { planId: number | null },
  ) => {
    if (!allowEdit) return;
    setActionLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const reorderEstructuraAcademicaItems = httpsCallable<
        { entity: ReorderAcademicEntity; items: Array<{ id: number; orden: number }>; planId?: number | null; moduloId?: number; indicadorCapacidadId?: number },
        { updated: number }
      >(functions, 'reorderEstructuraAcademicaItems');
      await reorderEstructuraAcademicaItems({
        entity,
        planId: selectedModulo?.planId, moduloId: selectedModulo?.id, indicadorCapacidadId: selectedIndicador?.id,
        ...scope,
        items: items.map((item, index) => ({ id: item.id, orden: item.orden ?? index + 1 })),
      });
      if (['modulo', 'competencia', 'actividad', 'competenciaUnidadDidactica'].includes(entity)) await fetchEstructura();
      setError(null);
    } catch (err) {
      console.error('Error reordering academic structure: ', err);
      setError('No se pudo guardar el nuevo orden.');
      await fetchEstructura();
    } finally {
      setActionLoading(false);
    }
  }, [allowEdit, auth, fetchEstructura, functions, selectedModulo?.id, selectedModulo?.planId, selectedIndicador?.id]);

  const handleExtraDrop = (entity: 'modulo' | 'competencia' | 'actividad', targetId: number, position: DropPosition) => {
    const drag = dragStateRef.current;
    if (!allowEdit || actionLoading || drag?.entity !== entity || drag.id === targetId) return;
    const list: Array<{ id: number; orden?: number | null }> = entity === 'modulo' ? filteredModulos.filter(item => item.planId === filteredModulos.find(row => row.id === targetId)?.planId) : entity === 'competencia' ? competencias : sesiones;
    const source = list.find(item => item.id === drag.id);
    const target = list.find(item => item.id === targetId);
    if (!source || !target) return;
    if (entity === 'competencia' && competencias.find(item => item.id === drag.id)?.tipo !== competencias.find(item => item.id === targetId)?.tipo) return;
    if (entity === 'actividad' && selectedUnidadIsComun) return;
    const ordered = withSequentialOrder(reorderById(list, drag.id, targetId, position, item => item.id));
    void persistReorder(entity, ordered.map(item => ({ id: item.id, orden: item.orden })), entity === 'modulo' ? { planId: filteredModulos.find(item => item.id === targetId)?.planId ?? null } : undefined);
  };
  const extraDragProps = (entity: 'modulo' | 'competencia' | 'actividad', id: number, enabled: boolean) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => {
      const source = dragStateRef.current;
      const sameScope = entity === 'modulo' ? filteredModulos.find(item => item.id === source?.id)?.planId === filteredModulos.find(item => item.id === id)?.planId : entity === 'competencia' ? competencias.find(item => item.id === source?.id)?.tipo === competencias.find(item => item.id === id)?.tipo : true;
      updateDropIndicator(event, entity, id, enabled && sameScope);
    },
    onDragLeave: () => clearDropIndicator(entity, id),
    onDrop: (event: DragEvent<HTMLElement>) => { event.preventDefault(); if (enabled) handleExtraDrop(entity, id, dropIndicatorRef.current?.position ?? getDropPosition(event)); endDrag(); },
    onDragEnd: endDrag,
  });
  const handleCreateCompetencia = () => {
    if (selectedModulo) void runStructureAction('createEstructuraAcademicaItem', { entity: 'competencia', moduloId: selectedModulo.id, tipo: selectedCompetencia?.tipo ?? 'TECNICA' });
  };
  const handleDeleteCompetencia = () => {
    if (selectedCompetencia && window.confirm('¿Eliminar esta competencia?')) void runStructureAction('detachEstructuraAcademicaItem', { entity: 'competencia', competenciaId: selectedCompetencia.id });
  };
  const handleCreateSesion = () => {
    if (selectedModulo && selectedIndicador && !selectedUnidadIsComun) void runStructureAction('createEstructuraAcademicaItem', { entity: 'actividad', moduloId: selectedModulo.id, indicadorCapacidadId: selectedIndicador.id });
  };
  const handleDeleteSesion = () => {
    if (selectedSesion && !selectedUnidadIsComun && window.confirm('¿Eliminar esta sesión con sus contenidos y materiales?')) void runStructureAction('detachEstructuraAcademicaItem', { entity: 'actividad', actividadId: selectedSesion.id });
  };

  const handleUnidadDrop = useCallback((targetRelacionId: number, position: DropPosition) => {
    const currentDrag = dragStateRef.current;
    if (!selectedModulo?.id || !currentDrag || currentDrag.entity !== 'competenciaUnidadDidactica') return;
    if (currentDrag.id === targetRelacionId) return;
    const source = unidades.find((unidad) => unidad.relacionId === currentDrag.id);
    const target = unidades.find((unidad) => unidad.relacionId === targetRelacionId);
    if (!source || !target || source.comun || target.comun) return;
    const reordered = reorderById(
      unidades,
      currentDrag.id,
      targetRelacionId,
      position,
      (unidad) => unidad.relacionId,
    );
    let nextIndex = 0;
    const ordered = withSequentialOrder(todasUnidades.map(unidad =>
      unidad.competenciaId === selectedCompetencia?.id ? reordered[nextIndex++] : unidad,
    ));
    setModulos((current) => current.map((modulo) => (
      modulo.id === selectedModulo.id ? { ...modulo, unidadesDidacticas: ordered } : modulo
    )));
    void persistReorder('competenciaUnidadDidactica', ordered.map((unidad) => ({ id: unidad.relacionId, orden: unidad.orden })));
  }, [persistReorder, selectedModulo?.id, selectedCompetencia?.id, todasUnidades, unidades]);

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
    setSelectedCompetenciaId(null);
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
    if (!selectedModulo?.id || !selectedModulo.planId) return;
    if (!window.confirm('Se quitara este modulo del plan actual. Deseas continuar?')) return;
    void runStructureAction('detachEstructuraAcademicaItem', {
      entity: 'modulo',
      moduloId: selectedModulo.id,
      planId: selectedModulo.planId,
      relacionId: selectedModulo.planModuloId,
    });
  }, [runStructureAction, selectedModulo?.id, selectedModulo?.planId, selectedModulo?.planModuloId]);

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

  return (
    <IntranetListLayout
      message={error}
      messageSeverity="error"
      title={resolvedTitle}
      showToolbar={showToolbar}
      commands={showToolbar ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ sm: 'center' }}>
          <MultiSelectWithActions
            label="Plan de Estudios"
            displayEmpty
            value={selectedPlanKeys.includes('all') ? [] : selectedPlanKeys}
            sx={{ minWidth: { xs: '100%', sm: 220 }, maxWidth: { sm: 400 } }}
            fullWidth={false}
            options={planOptions.map(option => ({ value: option.key, label: option.label }))}
            allOption={{ value: 'all', label: 'Todos', isSelected: keys => keys.length === 0, getValue: () => [] }}
            renderValue={keys => keys.length === 0 ? 'Todos' : keys.map(key => planOptions.find(option => option.key === key)?.label).filter(Boolean).join(', ')}
            onChange={keys => {
              const selected = keys.length ? keys : ['all'];
              if (selected.length === selectedPlanKeys.length && selected.every(key => selectedPlanKeys.includes(key))) return;
              setSelectedPlanKeys(selected);
              setSelectedCareerKey('all');
              setSelectedModuloId(null);
              setSelectedCompetenciaId(null);
              setSelectedUnidadId(null);
              setSelectedCapacidadId(null);
              setSelectedIndicadorId(null);
            }}
            disabled={loading}
          />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 300 } }}>
            <InputLabel id="curricular-career-label">Carrera</InputLabel>
            <Select labelId="curricular-career-label" label="Carrera" value={selectedCareer?.key ?? 'all'} disabled={loading}
              onChange={event => {
                setSelectedCareerKey(event.target.value);
                setSelectedModuloId(null);
                setSelectedCompetenciaId(null);
                setSelectedUnidadId(null);
                setSelectedCapacidadId(null);
                setSelectedIndicadorId(null);
              }}>
              <MenuItem value="all">Todas</MenuItem>
              {careerOptions.map(option => <MenuItem key={option.key} value={option.key}>{option.semester} {option.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void fetchEstructura()} disabled={loading}>Actualizar</Button>
        </Stack>
      ) : undefined}
    >
      {loading ? (
        <Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : filteredModulos.length === 0 ? (
        <Box sx={{ px: 1, pb: 2 }}>
          <AutoDismissAlert severity="info">No hay registros para mostrar.</AutoDismissAlert>
        </Box>
      ) : (
        <Box
          sx={{
            px: 1,
            pb: 2,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
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
                {allowDelete ? (
                  <IconButton size="small" title="Quitar modulo del plan" color="error" disabled={actionLoading || !selectedModulo?.planId} onClick={handleDetachModulo}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </>
            ) : undefined}

          >
            <List dense disablePadding>
              {filteredModulos.map((modulo) => {
                const unidadCount = modulo.unidadesDidacticas.length;
                return (
                  <ListItemButton
                    key={modulo.id}
                    {...extraDragProps('modulo', modulo.id, allowEdit && !actionLoading)}
                    selected={selectedModulo?.id === modulo.id}
                    onClick={() => {
                      setSelectedModuloId(modulo.id);
                      setSelectedUnidadId(null);
                      setSelectedCapacidadId(null);
                      setSelectedIndicadorId(null);
                    }}
                    sx={{ alignItems: 'flex-start', py: 0.9, minHeight: 72, ...dropIndicatorSx('modulo', modulo.id) }}
                  >
                    <DragHandle enabled={allowEdit && !actionLoading} onDragStart={event => beginDrag(event, { entity: 'modulo', id: modulo.id })} />
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
                            <EditableMetricChip value={modulo.horas} target={{ entity: 'modulo', id: modulo.id, field: 'horas', valueType: 'number' }} suffix=" hr" onSave={saveEditableCell} readOnly={!allowEdit} />
                            <EditableMetricChip value={modulo.creditos} target={{ entity: 'modulo', id: modulo.id, field: 'creditos', valueType: 'number' }} prefix="Cr " onSave={saveEditableCell} readOnly={!allowEdit} />
                            <Chip size="small" label={`UD ${unidadCount}`} />
                          </Stack>
                        </Stack>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Panel>

          <Panel title="Competencia" count={competencias.length} actions={<>
            {allowCreate && <IconButton size="small" title="Crear competencia" disabled={actionLoading || !selectedModulo} onClick={handleCreateCompetencia}><AddIcon fontSize="small" /></IconButton>}
            {allowDelete && <IconButton size="small" title="Eliminar competencia" color="error" disabled={actionLoading || !selectedCompetencia} onClick={handleDeleteCompetencia}><DeleteOutlineIcon fontSize="small" /></IconButton>}
          </>}>
            {competencias.length === 0 ? <EmptyState label="Sin competencias." /> : (
              <List dense disablePadding>
                {competencias.map(competencia => (
                  <ListItemButton
                    key={competencia.id}
                    {...extraDragProps('competencia', competencia.id, allowEdit && !actionLoading)}
                    data-empleabilidad={competencia.tipo === 'EMPLEABILIDAD' ? 'true' : undefined}
                    selected={selectedCompetencia?.id === competencia.id}
                    onClick={() => {
                      setSelectedCompetenciaId(competencia.id);
                      setSelectedUnidadId(null);
                      setSelectedCapacidadId(null);
                      setSelectedIndicadorId(null);
                    }}
                    sx={{ alignItems: 'flex-start', py: 1, ...dropIndicatorSx('competencia', competencia.id) }}
                  >
                    <DragHandle enabled={allowEdit && !actionLoading} onDragStart={event => beginDrag(event, { entity: 'competencia', id: competencia.id })} />
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={<EditableValue value={competencia.nombre || 'Sin nombre'} target={{ entity: 'competencia', id: competencia.id, field: 'nombre', valueType: 'text' }} lines={4} variant="body2" onSave={saveEditableCell} readOnly={!allowEdit} />}
                      secondary={<EditableCompetenciaTipo id={competencia.id} tipo={competencia.tipo} readOnly={!allowEdit} onSave={saveEditableCell} />}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Panel>

          <Panel
            title="Unidad"
            count={unidades.length}
            actions={allowCreate || allowEdit || allowDelete ? (
              <>
                {allowCreate ? (
                  <IconButton size="small" title="Crear unidad" disabled={actionLoading || !selectedModulo?.id} onClick={handleCreateUnidad}>
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
                        'competenciaUnidadDidactica',
                        unidad.relacionId,
                        canDragUnidad,
                      )}
                      onDragLeave={() => clearDropIndicator('competenciaUnidadDidactica', unidad.relacionId)}
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
                        ...dropIndicatorSx('competenciaUnidadDidactica', unidad.relacionId),
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
                                entity: 'competenciaUnidadDidactica',
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
                          {selectedUnidad?.competencia && <Chip size="small"
                            label={selectedUnidad.competencia.tipo === 'TECNICA' ? 'Técnica' : 'Para la empleabilidad'} title={selectedUnidad.competencia.nombre} />}
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
            title="Indicador"
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
                    />
                  </ListItemButton>
                );
                })}
              </List>
            )}
          </Panel>

          <Panel title="Sesión" count={sesiones.length} cardWidth={{ xs: 280, sm: 360 }} actions={<>
            {allowCreate && <IconButton size="small" title="Crear sesión" disabled={actionLoading || !selectedIndicador || selectedUnidadIsComun} onClick={handleCreateSesion}><AddIcon fontSize="small" /></IconButton>}
            {allowDelete && <IconButton size="small" title="Eliminar sesión" color="error" disabled={actionLoading || !selectedSesion || selectedUnidadIsComun} onClick={handleDeleteSesion}><DeleteOutlineIcon fontSize="small" /></IconButton>}
          </>}>
            {sesiones.length === 0 ? <EmptyState label="Sin sesiones para este indicador." /> : (
              <List dense disablePadding>
                {sesiones.map(sesion => (
                  <ListItemButton key={sesion.id} component="div" selected={selectedSesion?.id === sesion.id} onClick={() => setSelectedSesionId(sesion.id)} {...extraDragProps('actividad', sesion.id, allowEdit && !actionLoading && !selectedUnidadIsComun)} sx={{ display: 'block', py: 1.25, ...dropIndicatorSx('actividad', sesion.id) }}>
                    <Stack spacing={1.25}>
                      <Stack direction="row" alignItems="flex-start" spacing={0.5}>
                        <DragHandle enabled={allowEdit && !actionLoading && !selectedUnidadIsComun} onDragStart={event => beginDrag(event, { entity: 'actividad', id: sesion.id })} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">Aprendizaje</Typography>
                          <EditableValue value={sesion.aprendizaje || 'Sin descripción.'} target={{ entity: 'aprendizaje', id: sesion.aprendizajeId, field: 'descripcion', valueType: 'text' }} lines={6} variant="body2" onSave={saveEditableCell} readOnly={!allowEdit || selectedUnidadIsComun} />
                        </Box>
                      </Stack>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Nombre de sesión</Typography>
                        <EditableValue value={sesion.nombre || 'Sin nombre.'} target={{ entity: 'actividad', id: sesion.id, field: 'nombre', valueType: 'text' }} lines={4} variant="body2" onSave={saveEditableCell} readOnly={!allowEdit || selectedUnidadIsComun} />
                        <EditableMetricChip value={sesion.duracion ?? null} target={{ entity: 'actividad', id: sesion.id, field: 'duracion', valueType: 'number' }} suffix=" hr" onSave={saveEditableCell} readOnly={!allowEdit || selectedUnidadIsComun} />
                      </Box>
                      {(['contenido', 'material'] as const).map(kind => <SesionItemList key={kind} kind={kind} items={kind === 'contenido' ? sesion.contenidos : sesion.materiales} options={kind === 'material' ? materialOptions : []} canEdit={allowEdit && !selectedUnidadIsComun} disabled={actionLoading} renderText={item => kind === 'material' ? <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.texto}</Typography> : <EditableValue value={item.texto} target={{ entity: 'actividadContenido', id: item.id, field: 'texto', valueType: 'text' }} lines={6} variant="body2" onSave={saveEditableCell} readOnly={!allowEdit || selectedUnidadIsComun} />} onAdd={data => saveSesionItem(sesion.id, kind, 'add', data)} onRemove={itemId => saveSesionItem(sesion.id, kind, 'remove', { itemId })} onReorder={items => saveSesionItem(sesion.id, kind, 'reorder', { items })} />)}
                    </Stack>
                  </ListItemButton>
                ))}
              </List>
            )}
          </Panel>
        </Box>
      )}
      <Dialog open={Boolean(reuseDialog)} onClose={() => setReuseDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {reuseDialog?.kind === 'modulo' ? 'Reutilizar modulo comun' : 'Reutilizar unidad comun'}
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
