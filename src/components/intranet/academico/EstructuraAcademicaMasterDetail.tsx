'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import AcademicListItem from './AcademicListItem';
import { AcademicPreviewText, AcademicTextPreviewProvider } from './AcademicTextPreview';
import SesionItemList, { type SesionListItem } from './SesionItemList';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import {
  Box,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  List,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAppSettings } from '@/hooks/useAppSettings';
import { curricularCompetencyCodes, curricularDescendantCodes, curricularItemCode, curricularSessionsInOrder, curricularUnitsInOrder, orderedCurricularItems } from '@/lib/curricularCodes';
import { canHideCurricularPlan, selectionColumns, withPeriodSelection, type PlanSelection, type SelectionSemester, type SelectionEntity, type PeriodNode } from '@/lib/curricularSelection';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { isDocenteRole, isSuperUserEmail, isSuperUserRole, isSuperUserTitle } from '@/lib/intranetPermissions';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import {
  curricularPlanCatalog,
  curricularStudyPlanOptions,
  curricularTitle,
  filterCurricularModules,
  type CurricularPlan,
} from '@/lib/curricularFilters';
import {
  academicLabels, academicLocations, academicReorderItems, applyAcademicReassignment, reassignmentFor,
  type AcademicDrag, type Reassignment, type ModuloDetalle, type UnidadDidacticaDetalle, type CapacidadDetalle, type IndicadorDetalle,
} from '@/lib/curricularReassignment';
import { applyAcademicCreation, applyAcademicOrder, applyAcademicRemoval, type AcademicCreationResult, type AcademicRemoval, type AcademicRemovalResult } from '@/lib/curricularUpdates';

type EditableAcademicEntity = 'modulo' | 'competencia' | 'actividad' | 'aprendizaje' | 'indicadorContenido' | 'actividadMaterial' | 'unidadDidactica' | 'competenciaUnidadDidactica' | 'capacidadTerminal' | 'indicadorCapacidad';
type EditableValueType = 'text' | 'number' | 'boolean';
type EditableCellValue = string | number | boolean | null;
type ReorderAcademicEntity = 'modulo' | 'competencia' | 'actividad' | 'aprendizaje' | 'competenciaUnidadDidactica' | 'capacidadTerminal' | 'indicadorCapacidad';

interface EditableCellTarget {
  entity: EditableAcademicEntity;
  id: number;
  field: string;
  valueType: EditableValueType;
}



type DragState = {
  entity: ReorderAcademicEntity | 'aprendizaje';
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
  if (['competencia', 'actividad', 'aprendizaje', 'indicadorContenido'].includes(target.entity)) {
    return items.map(modulo => ({ ...modulo,
      competencias: modulo.competencias.map(item => target.entity === 'competencia' && item.id === target.id ? { ...item, [target.field]: value } as typeof item : item),
      unidadesDidacticas: modulo.unidadesDidacticas.map(unidad => ({ ...unidad,
        competencia: target.entity === 'competencia' && unidad.competencia.id === target.id ? { ...unidad.competencia, [target.field]: value } as typeof unidad.competencia : unidad.competencia,
        capacidadesTerminales: unidad.capacidadesTerminales.map(capacidad => ({ ...capacidad,
          indicadoresCapacidad: capacidad.indicadoresCapacidad.map(indicador => ({ ...indicador,
            contenidos: (indicador.contenidos ?? []).map(item => target.entity === 'indicadorContenido' && item.id === target.id ? { ...item, texto: value as string } : item),
            aprendizajes: indicador.aprendizajes?.map(aprendizaje => ({ ...aprendizaje,
              descripcion: target.entity === 'aprendizaje' && aprendizaje.id === target.id ? value as string : aprendizaje.descripcion,
              actividades: aprendizaje.actividades.map(actividad => ({ ...actividad,
                ...(target.entity === 'actividad' && actividad.id === target.id ? { [target.field]: value } : {}),
                materiales: (actividad.materiales ?? []).map(item => target.entity === 'actividadMaterial' && item.id === target.id ? { ...item, texto: value as string } : item),
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

function EditableValue({
  value,
  target,
  lines = 2,
  variant = 'caption',
  onSave,
  readOnly = false,
  details,
  properties,
  actions,
  prefix,
}: {
  value: EditableCellValue | undefined;
  target?: EditableCellTarget;
  lines?: number;
  variant?: 'caption' | 'body2';
  onSave: (target: EditableCellTarget, value: EditableCellValue) => Promise<void>;
  readOnly?: boolean;
  details?: ReactNode;
  properties?: ReactNode;
  actions?: ReactNode;
  prefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(draftFromValue(value));
  const committingRef = useRef(false);
  const editingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    input?.focus();
    if (target?.valueType === 'text') input?.setSelectionRange(input.value.length, input.value.length);
  }, [editing, target?.valueType]);

  useEffect(() => {
    if (!editing) setDraft(draftFromValue(value));
  }, [editing, value]);

  const commit = useCallback(async () => {
    if (!target || !editingRef.current || committingRef.current) return;
    committingRef.current = true;
    setSaving(true);
    try {
      const nextValue = coerceDraftValue(draft, target.valueType);
      if (!sameEditableValue(value, nextValue)) {
        await onSave(target, nextValue);
      }
      editingRef.current = false;
      setEditing(false);
    } catch {
      // The parent displays the save error; keep the draft available for correction.
    } finally {
      committingRef.current = false;
      setSaving(false);
    }
  }, [draft, onSave, target, value]);

  const activeTarget = readOnly ? undefined : target;
  const beginEditing = () => {
    if (!activeTarget) return;
    setDraft(draftFromValue(value));
    editingRef.current = true;
    setEditing(true);
  };
  const cancel = () => {
    if (committingRef.current) return;
    editingRef.current = false;
    setDraft(draftFromValue(value));
    setEditing(false);
  };

  return (
    <Box
      sx={{ flex: 1, minWidth: 0, alignSelf: 'flex-start', width: '100%' }}
      onBlur={(event) => {
        if (editingRef.current && !event.currentTarget.contains(event.relatedTarget as Node | null)) void commit();
      }}
    >
      {activeTarget && editing ? (
        <TextField
          autoFocus
          inputRef={inputRef}
          fullWidth
          multiline={lines > 1 && activeTarget.valueType === 'text'}
          maxRows={Math.max(lines, 2)}
          size="small"
          type={activeTarget.valueType === 'number' ? 'number' : 'text'}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          slotProps={{ input: { readOnly: saving } }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Escape') {
              event.preventDefault();
              cancel();
            }
          }}
          sx={{
            '& .MuiInputBase-root': {
              fontSize: variant === 'caption' ? '0.75rem' : '0.875rem',
              lineHeight: 1.25,
            },
            '& .MuiInputBase-multiline': { p: 0 },
            '& .MuiInputBase-input': {
              boxSizing: 'border-box',
              px: '7px',
              py: 0.175,
            },
            '& .MuiInputBase-inputMultiline': {
              py: '5.65px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--mui-palette-divider, #bdbdbd) transparent',
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
              '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            },
          }}
        />
      ) : (
        <AcademicPreviewText
          text={`${prefix ? `${prefix} ` : ''}${displayText(value)}`}
          lines={lines}
          variant={variant}
          onEdit={activeTarget ? beginEditing : undefined}
        />
      )}
      {details}
      {(properties || actions || (activeTarget && editing)) && (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 0.65 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>{properties}</Box>
          {!editing && actions}
          {activeTarget && editing && (
            <Stack direction="row" sx={{ flexShrink: 0 }}
              onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              <IconButton size="small" color="success" aria-label="Guardar cambios" title="Guardar cambios" disabled={saving} onClick={() => void commit()}><CheckIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="error" aria-label="Cancelar cambios" title="Cancelar cambios" disabled={saving} onClick={cancel}><CloseIcon fontSize="small" /></IconButton>
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}

const employabilityChipSx = (theme: Theme) => ({ bgcolor: alpha(theme.palette.error.main, 0.18) });

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
    <MenuItem value="TECNICA">Técnica</MenuItem><MenuItem value="EMPLEABILIDAD">Empleabilidad</MenuItem>
  </Select>;
  return <Chip size="small" title={readOnly ? undefined : 'Doble clic para editar'} label={tipo === 'TECNICA' ? 'Técnica' : 'Empleabilidad'} sx={tipo === 'EMPLEABILIDAD' ? employabilityChipSx : undefined} onDoubleClick={event => { if (!readOnly) { event.stopPropagation(); setEditing(true); } }} />;
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
            event.stopPropagation();
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
            '& > .MuiList-root > .MuiListItemButton-root': { flex: '0 0 auto', width: cardWidth, minWidth: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1 },
            '& > .MuiList-root > [data-empleabilidad="true"]': { borderColor: theme => alpha(theme.palette.error.main, 0.4) },
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
  const { settings, loading: loadingSettings } = useAppSettings();
  const [semesterOverride, setSemesterOverride] = useState<number | null>(null);
  const selectedSemesterId = semesterOverride ?? settings.general.semestreActualId;
  const [semesters, setSemesters] = useState<SelectionSemester[]>([]);
  const [selections, setSelections] = useState<PlanSelection[]>([]);
  const [showHidden, setShowHidden] = useState<Record<SelectionEntity, boolean>>({ competencia: false, unidadDidactica: false, capacidadTerminal: false, indicadorCapacidad: false });
  const showToolbar = Boolean(user && user.profileResolved !== false && (
    (Number(user.level) > 200 && !isDocenteRole(user.role))
    || Number(user.level) >= 600
    || isSuperUserRole(user.role)
    || isSuperUserTitle(user.roleTitle)
    || isSuperUserEmail(user.email)
  ));
  const [modulos, setModulos] = useState<ModuloDetalle[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<Array<{ id: number; nombre: string }>>([]);
  const [planes, setPlanes] = useState<CurricularPlan[]>([]);
  const [resolvedTitle, setResolvedTitle] = useState(curricularTitle(title));
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanKey, setSelectedPlanKey] = useState('all');
  const [selectedModuloId, setSelectedModuloId] = useState<number | null>(null);
  const [selectedCompetenciaId, setSelectedCompetenciaId] = useState<number | null>(null);
  const [selectedUnidadId, setSelectedUnidadId] = useState<number | null>(null);
  const [selectedCapacidadId, setSelectedCapacidadId] = useState<number | null>(null);
  const [selectedIndicadorId, setSelectedIndicadorId] = useState<number | null>(null);
  const [selectedSesionId, setSelectedSesionId] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [moveTarget, setMoveTarget] = useState<AcademicDrag | null>(null);
  const [movePending, setMovePending] = useState(false);
  const movePendingRef = useRef(false);
  const dragPreviewRef = useRef<HTMLElement | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverKeyRef = useRef<string | null>(null);
  const createdCardRef = useRef<AcademicDrag | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const dropIndicatorRef = useRef<DropIndicatorState | null>(null);

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);
  const allowEdit = !readOnly && canEdit;
  const allowCreate = !readOnly && canCreate;
  const allowDelete = !readOnly && canDelete;
  const locations = useMemo(() => academicLocations(modulos), [modulos]);
  useEffect(() => {
    const created = createdCardRef.current;
    if (!created) return;
    const card = document.querySelector<HTMLElement>(`[data-academic-entity="${created.entity}"][data-academic-id="${created.id}"]`);
    if (card) { card.scrollIntoView({ block: 'nearest', inline: 'end', behavior: 'smooth' }); createdCardRef.current = null; }
  }, [modulos]);

  const fetchEstructura = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listEstructuraAcademica = httpsCallable<{ semestreId?: number | null }, {
        modulos?: ModuloDetalle[];
        planes?: CurricularPlan[];
        materiales?: Array<{ id: number; nombre: string }>;
        title?: string | null;
        semestreId?: number;
        semestres?: SelectionSemester[];
        selecciones?: PlanSelection[];
      }>(
        functions,
        callableName,
      );
      const result = await listEstructuraAcademica({ semestreId: selectedSemesterId });
      setModulos(result.data.modulos || []);
      setPlanes(result.data.planes || []);
      setSemesters(result.data.semestres || []);
      setSelections(result.data.selecciones || []);
      if (result.data.semestreId && result.data.semestreId !== selectedSemesterId) setSemesterOverride(result.data.semestreId);
      setCatalogMaterials(result.data.materiales || []);
      setResolvedTitle(curricularTitle(result.data.title || title));
      setError(null);
    } catch (err) {
      console.error('Error fetching academic structure: ', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [auth, callableName, errorMessage, functions, title, selectedSemesterId]);

  const saveEditableCell = useCallback(async (target: EditableCellTarget, value: EditableCellValue) => {
    if (!allowEdit) {
      throw new Error('No tienes permiso para editar la estructura academica.');
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
  }, [allowEdit, auth, fetchEstructura, functions]);



  useEffect(() => {
    setResolvedTitle(curricularTitle(title));
  }, [title]);

  const autoFetchRef = useRef<typeof fetchEstructura | null>(null);
  useEffect(() => {
    if (loadingSettings || autoFetchRef.current === fetchEstructura) return;
    autoFetchRef.current = fetchEstructura;
    void fetchEstructura();
  }, [fetchEstructura, loadingSettings]);

  const planCatalog = useMemo(() => curricularPlanCatalog(planes, modulos), [planes, modulos]);
  const planOptions = useMemo(() => curricularStudyPlanOptions(planCatalog), [planCatalog]);
  const selectedPlan = planOptions.find(option => option.key === selectedPlanKey) ?? null;
  const occupationalHiding = settings.general.poderOcultarProgramacionOpcionesOcupacionales;
  const filteredModulos = useMemo(() => filterCurricularModules(modulos, planCatalog, ['all'], selectedPlan)
    .map(module => withPeriodSelection(module, canHideCurricularPlan(module.plan, occupationalHiding) ? selections.find(s => s.planId === module.planId) : undefined)),
    [modulos, planCatalog, selectedPlan, selections, occupationalHiding]);

  useEffect(() => {
    if (!loading && selectedPlanKey !== 'all' && !selectedPlan) setSelectedPlanKey('all');
  }, [loading, selectedPlan, selectedPlanKey]);

  const selectedModulo = useMemo(
    () => filteredModulos.find((modulo) => modulo.id === selectedModuloId) ?? filteredModulos[0] ?? null,
    [filteredModulos, selectedModuloId],
  );

  const todasUnidades = useMemo(() => curricularUnitsInOrder(selectedModulo), [selectedModulo]);
  const descendantCodes = useMemo(() => curricularDescendantCodes(selectedModulo), [selectedModulo]);
  const competencyCodes = useMemo(() => curricularCompetencyCodes(selectedModulo?.competencias ?? []), [selectedModulo]);
  const competencias = useMemo(() => (selectedModulo?.competencias ?? []).filter(item => showHidden.competencia || item.periodActive !== false).sort((a, b) =>
    (a.orden ?? a.id) - (b.orden ?? b.id) || a.id - b.id,
  ), [selectedModulo, showHidden.competencia]);
  const selectedCompetencia = competencias.find(competencia => competencia.id === selectedCompetenciaId) ?? competencias[0] ?? null;
  const unidades = useMemo(() => todasUnidades.filter(unidad => unidad.competenciaId === selectedCompetencia?.id && (showHidden.unidadDidactica || unidad.periodActive !== false)),
    [todasUnidades, selectedCompetencia?.id, showHidden.unidadDidactica]);
  useEffect(() => { setSelectedCompetenciaId(null); }, [selectedModulo?.id]);
  const selectedUnidad = useMemo(
    () => unidades.find((unidad) => unidad.id === selectedUnidadId) ?? unidades[0] ?? null,
    [selectedUnidadId, unidades],
  );
  const capacidades = useMemo(() => orderedCurricularItems(selectedUnidad?.capacidadesTerminales ?? []).filter(item => showHidden.capacidadTerminal || item.periodActive !== false), [selectedUnidad, showHidden.capacidadTerminal]);
  const selectedCapacidad = useMemo(
    () => capacidades.find((capacidad) => capacidad.id === selectedCapacidadId) ?? capacidades[0] ?? null,
    [capacidades, selectedCapacidadId],
  );
  const indicadores = useMemo(() => orderedCurricularItems(selectedCapacidad?.indicadoresCapacidad ?? []).filter(item => showHidden.indicadorCapacidad || item.periodActive !== false), [selectedCapacidad, showHidden.indicadorCapacidad]);
  const selectedIndicador = useMemo(
    () => indicadores.find((indicador) => indicador.id === selectedIndicadorId) ?? indicadores[0] ?? null,
    [indicadores, selectedIndicadorId],
  );
  const aprendizajes = useMemo(() => (selectedIndicador?.periodActive === false ? [] : selectedIndicador?.aprendizajes ?? []).slice().sort((a, b) => (a.orden ?? a.id) - (b.orden ?? b.id) || a.id - b.id), [selectedIndicador]);
  const sesiones = useMemo(() => curricularSessionsInOrder(aprendizajes), [aprendizajes]);

  const selectedSesion = sesiones.find(item => item.id === selectedSesionId) ?? sesiones[0] ?? null;
  const selectedAprendizaje = aprendizajes.find(item => item.id === selectedSesion?.aprendizajeId) ?? aprendizajes[0] ?? null;
  const visibilityAllowed = Boolean(selectedModulo && canHideCurricularPlan(selectedModulo.plan, occupationalHiding));
  const periodSelection = visibilityAllowed ? selections.find(item => item.planId === selectedModulo?.planId) : undefined;
  const periodArchived = semesters.find(item => item.id === selectedSemesterId)?.archivado;
  const changeVisibility = async (entity: SelectionEntity, id: number, active: boolean) => {
    if (!allowEdit || !periodSelection || actionLoading || periodArchived) return;
    setActionLoading(true);
    try {
      const call = httpsCallable<Record<string, unknown>, { selection: PlanSelection }>(functions, 'setPlanSemesterVisibility');
      const result = await call({ entity, id, active, planId: periodSelection.planId, semestreId: selectedSemesterId, revision: periodSelection.revision });
      setSelections(current => current.map(item => item.planId === result.data.selection.planId ? result.data.selection : item));
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar la selección del semestre.');
    } finally { setActionLoading(false); }
  };
  const visibilityButton = (entity: SelectionEntity, item: PeriodNode & { id: number }, parentActive = true) => {
    if (!visibilityAllowed) return null;
    const selected = item.periodSelected !== false;
    const label = !parentActive ? 'Activa primero el elemento superior' : `${selected ? 'Ocultar' : 'Incluir'} en este semestre`;
    return <IconButton size="small" aria-label={label} title={label} disabled={!allowEdit || !periodSelection || actionLoading || movePending || periodArchived === true || !parentActive}
      onDoubleClick={event => event.stopPropagation()}
      onClick={event => { event.stopPropagation(); void changeVisibility(entity, item.id, !selected); }}>
      {selected ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
    </IconButton>;
  };
  const hiddenToggle = (entity: SelectionEntity) => {
    if (!visibilityAllowed) return null;
    const label = showHidden[entity] ? 'Mostrar solo activos' : 'Mostrar activos y ocultos';
    return <IconButton size="small" aria-label={label} title={label} color={showHidden[entity] ? 'primary' : 'default'} aria-pressed={showHidden[entity]}
      onClick={() => setShowHidden(current => ({ ...current, [entity]: !current[entity] }))}>
      {showHidden[entity] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
    </IconButton>;
  };
  const materialOptions = useMemo(() => catalogMaterials.map(item => ({ id: item.id, orden: 0, texto: item.nombre })), [catalogMaterials]);
  const saveSesionResource = useCallback(async (actividadId: number, action: 'add' | 'remove' | 'reorder', data: { texto?: string; materialId?: number; itemId?: number; items?: Array<{ id: number; orden: number }> }) => {
    if (!allowEdit) throw new Error('No tienes permiso para editar.');
    const callable = httpsCallable<Record<string, unknown>, { items: SesionListItem[] }>(functions, 'saveEstructuraAcademicaSesionItem');
    const result = await callable({ actividadId, kind: 'material', action, ...data });
    setCatalogMaterials(current => {
      const byId = new Map(current.map(item => [item.id, item]));
      for (const item of result.data.items) if (item.materialId) byId.set(item.materialId, { id: item.materialId, nombre: item.texto });
      return [...byId.values()].sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));
    });
    setModulos(current => current.map(modulo => ({ ...modulo, unidadesDidacticas: modulo.unidadesDidacticas.map(unidad => ({ ...unidad, capacidadesTerminales: unidad.capacidadesTerminales.map(capacidad => ({ ...capacidad, indicadoresCapacidad: capacidad.indicadoresCapacidad.map(indicador => ({ ...indicador, aprendizajes: indicador.aprendizajes?.map(aprendizaje => ({ ...aprendizaje, actividades: aprendizaje.actividades.map(actividad => actividad.id === actividadId ? { ...actividad, materiales: result.data.items } : actividad) })) })) })) })) })));
  }, [allowEdit, functions]);

  const saveIndicadorContenido = useCallback(async (indicadorCapacidadId: number, action: 'add' | 'remove' | 'reorder', data: { texto?: string; itemId?: number; items?: Array<{ id: number; orden: number }> }) => {
    if (!allowEdit) throw new Error('No tienes permiso para editar.');
    const callable = httpsCallable<Record<string, unknown>, { items: SesionListItem[] }>(functions, 'saveEstructuraAcademicaIndicadorContenido');
    const result = await callable({ indicadorCapacidadId, action, ...data });
    setModulos(current => current.map(modulo => ({ ...modulo, unidadesDidacticas: modulo.unidadesDidacticas.map(unidad => ({ ...unidad, capacidadesTerminales: unidad.capacidadesTerminales.map(capacidad => ({ ...capacidad, indicadoresCapacidad: capacidad.indicadoresCapacidad.map(indicador => indicador.id === indicadorCapacidadId ? { ...indicador, contenidos: result.data.items } : indicador) })) })) })));
  }, [allowEdit, functions]);

  const runStructureAction = useCallback(async (
    callableName: 'createEstructuraAcademicaItem' | 'detachEstructuraAcademicaItem',
    payload: Record<string, unknown>,
  ) => {
    setActionLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const callable = httpsCallable<Record<string, unknown>, AcademicCreationResult | AcademicRemovalResult>(functions, callableName);
      const result = await callable(payload);
      if (callableName === 'createEstructuraAcademicaItem') {
        const created = 'item' in result.data ? result.data : null;
        const assignment = created?.unitAssignments?.find(item => item.unidadDidacticaId === created.id);
        if (!created?.item || created.item.id !== created.id || !created.entity || !Number.isSafeInteger(created.id) || (payload.entity === 'unidadDidactica' && !assignment)) throw new Error('El servidor no devolvió el registro creado completo. Actualiza la vista para comprobarlo.');
        createdCardRef.current = payload.entity === 'unidadDidactica'
          ? { entity: 'competenciaUnidadDidactica', id: assignment!.id }
          : { entity: payload.entity as AcademicDrag['entity'], id: result.data.id };
        setModulos(current => applyAcademicCreation(current, created));
        if (Object.prototype.hasOwnProperty.call(selectionColumns, created.entity)) setShowHidden(current => ({ ...current, [created.entity]: true }));
        if (payload.entity === 'modulo') setSelectedModuloId(result.data.id);
        if (payload.entity === 'competencia') setSelectedCompetenciaId(result.data.id);
        if (payload.entity === 'unidadDidactica') {
          if (assignment) setSelectedCompetenciaId(assignment.competenciaId);
          setSelectedUnidadId(result.data.id);
        }
        if (payload.entity === 'capacidadTerminal') setSelectedCapacidadId(result.data.id);
        if (payload.entity === 'indicadorCapacidad') setSelectedIndicadorId(result.data.id);
        if (payload.entity === 'actividad') setSelectedSesionId(result.data.id);
        if (allowEdit && periodSelection && !periodArchived && Object.prototype.hasOwnProperty.call(selectionColumns, created.entity)) {
          const activate = httpsCallable<Record<string, unknown>, { selection: PlanSelection }>(functions, 'setPlanSemesterVisibility');
          const activation = await activate({ entity: created.entity, id: created.id, active: true, planId: periodSelection.planId, semestreId: selectedSemesterId, revision: periodSelection.revision });
          setSelections(current => current.map(item => item.planId === periodSelection.planId ? activation.data.selection : item));
        }
      } else setModulos(current => applyAcademicRemoval(current, payload as AcademicRemoval, result.data, planCatalog));
      setError(null);
    } catch (err) {
      console.error(`Error running ${callableName}: `, err);
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción.');
    } finally {
      setActionLoading(false);
    }
  }, [auth, functions, planCatalog, periodSelection, periodArchived, selectedSemesterId, allowEdit]);

  const beginDrag = useCallback((event: DragEvent<HTMLElement>, nextDragState: DragState) => {
    event.stopPropagation();
    if (movePendingRef.current) { event.preventDefault(); return; }
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${nextDragState.entity}:${nextDragState.id}`);
    dragPreviewRef.current?.remove();
    const preview = document.createElement('div');
    const text = locations.get(`${nextDragState.entity}:${nextDragState.id}`)?.text;
    preview.textContent = `${academicLabels[nextDragState.entity]} · ${text || nextDragState.id}`;
    Object.assign(preview.style, { position: 'fixed', top: '-1000px', left: '0', width: '230px', padding: '8px 12px',
      border: '1px solid #1565c0', borderRadius: '6px', background: '#fff', color: '#16324f',
      boxShadow: '0 2px 8px #0003', font: '13px sans-serif', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', pointerEvents: 'none' });
    document.body.appendChild(preview);
    dragPreviewRef.current = preview;
    event.dataTransfer.setDragImage(preview, 12, 16);
  }, [locations]);

  const endDrag = useCallback(() => {
    dragStateRef.current = null;
    dropIndicatorRef.current = null;
    setDragState(null);
    setDropIndicator(null);
    setMoveTarget(null);
    dragPreviewRef.current?.remove();
    dragPreviewRef.current = null;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverKeyRef.current = null;
  }, []);

  useEffect(() => () => {
    dragPreviewRef.current?.remove();
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  }, []);

  const persistReassignment = async (move: Reassignment) => {
    if (!allowEdit || actionLoading || movePendingRef.current) return;
    movePendingRef.current = true;
    setMovePending(true);
    setActionLoading(true);
    const originalOrder = locations.get(`${move.entity}:${move.id}`)?.orden;
    const originalTargetOrders = move.targetSiblingId ? [...locations].flatMap(([key, row]) =>
      key.startsWith(`${move.entity}:`) && row.parentId === move.parentId ? [{ id: Number(key.slice(move.entity.length + 1)), orden: row.orden }] : []) : [];
    setModulos(current => {
      const next = applyAcademicReassignment(current, move);
      return move.targetSiblingId ? applyAcademicOrder(next, move.entity,
        academicReorderItems(next, move.entity, move.id, move.targetSiblingId, move.position ?? 'before')) : next;
    });
    try {
      const callable = httpsCallable<Reassignment, Reassignment>(functions, 'reassignEstructuraAcademicaItem');
      const result = await callable(move);
      setModulos(current => {
        let next = current;
        if (move.targetIndicatorId && result.data.learning) {
          next = applyAcademicCreation(next, { entity: 'aprendizaje', id: result.data.learning.id, item: { ...result.data.learning } });
          next = applyAcademicReassignment(next, result.data);
        }
        return result.data.orders ? applyAcademicOrder(next, move.entity, result.data.orders)
          : result.data.orden != null ? applyAcademicOrder(next, move.entity, [{ id: move.id, orden: result.data.orden }]) : next;
      });
      setError(null);
    } catch (err) {
      // Restore only affected branches; keep any unrelated state and edits intact.
      if (!move.targetIndicatorId) setModulos(current => {
        const next = applyAcademicReassignment(current, { ...move, parentId: move.previousParentId, previousParentId: move.parentId, orden: originalOrder });
        return originalTargetOrders.length ? applyAcademicOrder(next, move.entity, originalTargetOrders) : next;
      });
      setError(err instanceof Error ? err.message : 'No se pudo guardar la reasignación. Se restauró la ubicación anterior.');
    } finally {
      movePendingRef.current = false;
      setMovePending(false);
      setActionLoading(false);
    }
  };

  const rowDragProps = (target: AcademicDrag, reorder?: {
    onDragOver?: (event: DragEvent<HTMLElement>) => void;
    onDrop?: (event: DragEvent<HTMLElement>) => void;
  }) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!allowEdit || actionLoading) return;
      const source = dragStateRef.current;
      if (!source) return;
      const move = reassignmentFor(modulos, source, target, locations);
      if (move) {
        event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move';
        setMoveTarget(current => current?.entity === target.entity && current.id === target.id ? current : target);
      } else reorder?.onDragOver?.(event);
      // Hovering an ancestor exposes its children without losing the dragged item.
      const key = `${target.entity}:${target.id}`;
      if (source.entity !== target.entity && hoverKeyRef.current !== key) {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverKeyRef.current = key;
        hoverTimerRef.current = setTimeout(() => {
          if (target.entity === 'modulo') setSelectedModuloId(target.id);
          if (target.entity === 'competencia') setSelectedCompetenciaId(target.id);
          if (target.entity === 'competenciaUnidadDidactica') setSelectedUnidadId(locations.get(key)?.unitId ?? null);
          if (target.entity === 'capacidadTerminal') setSelectedCapacidadId(target.id);
          if (target.entity === 'indicadorCapacidad') setSelectedIndicadorId(target.id);
        }, 650);
      }
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
      setMoveTarget(current => current?.entity === target.entity && current.id === target.id ? null : current);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverKeyRef.current = null;
      if (target.entity !== 'aprendizaje') clearDropIndicator(target.entity, target.id);
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      const source = dragStateRef.current;
      const move = source && reassignmentFor(modulos, source, target, locations);
      event.preventDefault(); event.stopPropagation();
      if (move && allowEdit && !actionLoading) void persistReassignment(move);
      else reorder?.onDrop?.(event);
      endDrag();
    },
    onDragEnd: endDrag,
    'data-academic-entity': target.entity,
    'data-academic-id': target.id,
  });

  const updateDropIndicator = useCallback((
    event: DragEvent<HTMLElement>,
    entity: ReorderAcademicEntity,
    id: number,
    enabled: boolean,
  ) => {
    const currentDrag = dragStateRef.current;
    if (!enabled || currentDrag?.entity !== entity) return;
    if (entity !== 'modulo' && entity !== 'actividad' && locations.get(`${entity}:${currentDrag.id}`)?.parentId !== locations.get(`${entity}:${id}`)?.parentId) return;
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
  }, [locations]);

  const clearDropIndicator = useCallback((entity: ReorderAcademicEntity, id: number) => {
    const currentIndicator = dropIndicatorRef.current;
    if (currentIndicator?.entity !== entity || currentIndicator.id !== id) return;
    dropIndicatorRef.current = null;
    setDropIndicator(null);
  }, []);

  const dropIndicatorSx = (entity: DragState['entity'], id: number) => {
    const active = dropIndicator?.entity === entity && dropIndicator.id === id;
    const canReceive = allowEdit && !actionLoading && dragState && reassignmentFor(modulos, dragState, { entity, id }, locations);
    const receiving = canReceive && moveTarget?.entity === entity && moveTarget.id === id;
    return {
      position: 'relative' as const,
      ...(canReceive ? { outline: '1px dashed', outlineColor: 'primary.main', outlineOffset: -2 } : {}),
      ...(receiving ? { bgcolor: 'action.selected', boxShadow: 'inset 0 0 0 2px var(--mui-palette-primary-main, #1976d2)', '&.Mui-selected': { bgcolor: 'action.selected' } } : {}),
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
  };

  const persistReorder = useCallback(async (
    entity: ReorderAcademicEntity,
    items: Array<{ id: number; orden: number | null }>,
    scope?: { planId: number | null },
  ) => {
    if (!allowEdit || actionLoading) return;
    const planId = scope?.planId ?? selectedModulo?.planId;
    const beforeLocations = academicLocations(modulos);
    const previous = items.map(item => ({ id: item.id, orden: entity === 'modulo'
      ? modulos.find(modulo => modulo.id === item.id)?.planModulos?.find(row => row.planId === planId)?.orden ?? beforeLocations.get(`${entity}:${item.id}`)?.orden
      : beforeLocations.get(`${entity}:${item.id}`)?.orden }));
    setActionLoading(true);
    setModulos(current => applyAcademicOrder(current, entity, items, planId));
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
      setError(null);
    } catch (err) {
      console.error('Error reordering academic structure: ', err);
      setError('No se pudo guardar el nuevo orden.');
      setModulos(current => applyAcademicOrder(current, entity, previous, planId));
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, allowEdit, auth, functions, modulos, selectedModulo?.id, selectedModulo?.planId, selectedIndicador?.id]);

  const handleExtraDrop = (entity: ReorderAcademicEntity, targetId: number, position: DropPosition) => {
    const drag = dragStateRef.current;
    if (!allowEdit || actionLoading || drag?.entity !== entity || drag.id === targetId) return;
    if (entity === 'actividad') {
      const source = locations.get(`actividad:${drag.id}`), target = locations.get(`actividad:${targetId}`);
      if (source?.parentId && target?.parentId && source.parentId !== target.parentId) {
        void persistReassignment({ entity, id: drag.id, parentId: target.parentId, previousParentId: source.parentId, targetSiblingId: targetId, position });
        return;
      }
    }
    const planId = entity === 'modulo' ? filteredModulos.find(item => item.id === targetId)?.planId ?? null : undefined;
    const ordered = academicReorderItems(modulos, entity, drag.id, targetId, position, planId);
    if (ordered.length) void persistReorder(entity, ordered, entity === 'modulo' ? { planId: planId ?? null } : undefined);
  };
  const extraDragProps = (entity: 'modulo' | 'competencia' | 'actividad' | 'aprendizaje', id: number, enabled: boolean) => rowDragProps({ entity, id }, {
    onDragOver: (event: DragEvent<HTMLElement>) => {
      const source = dragStateRef.current;
      const sameScope = entity === 'modulo' ? filteredModulos.find(item => item.id === source?.id)?.planId === filteredModulos.find(item => item.id === id)?.planId : true;
      updateDropIndicator(event, entity, id, enabled && sameScope);
    },
    onDrop: (event: DragEvent<HTMLElement>) => { event.preventDefault(); if (enabled) handleExtraDrop(entity, id, dropIndicatorRef.current?.position ?? getDropPosition(event)); endDrag(); },
  });
  const handleCreateCompetencia = () => {
    if (selectedModulo) void runStructureAction('createEstructuraAcademicaItem', { entity: 'competencia', moduloId: selectedModulo.id, tipo: selectedCompetencia?.tipo ?? 'TECNICA' });
  };
  const handleDeleteCompetencia = () => {
    if (selectedCompetencia && window.confirm('¿Eliminar esta competencia?')) void runStructureAction('detachEstructuraAcademicaItem', { entity: 'competencia', competenciaId: selectedCompetencia.id });
  };
  const handleCreateSesion = () => {
    if (selectedModulo && selectedIndicador) void runStructureAction('createEstructuraAcademicaItem', { entity: 'actividad', moduloId: selectedModulo.id, indicadorCapacidadId: selectedIndicador.id, aprendizajeId: selectedAprendizaje?.id });
  };
  const handleDeleteSesion = () => {
    if (selectedSesion && window.confirm('¿Eliminar esta sesión con sus recursos?')) void runStructureAction('detachEstructuraAcademicaItem', { entity: 'actividad', actividadId: selectedSesion.id });
  };

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
      competenciaId: selectedCompetencia?.id,
    });
  }, [runStructureAction, selectedModulo?.id, selectedCompetencia?.id]);

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
    <AcademicTextPreviewProvider enabled={settings.programacionCurricular.mostrarContenidoEnCuadroEmergente}>
    <IntranetListLayout
      message={error}
      messageSeverity="error"
      title={resolvedTitle}
      showToolbar={showToolbar}
      commands={(
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ sm: 'center' }}>
          <FormControl size="small" sx={{ width: '100px', minWidth: '100px' }}>
            <InputLabel id="curricular-semester-label">Semestre</InputLabel>
            <Select labelId="curricular-semester-label" label="Semestre" value={semesters.some(item => item.id === selectedSemesterId) ? selectedSemesterId : ''}
              MenuProps={{ disableScrollLock: true }}
              disabled={loading || actionLoading || movePending} onChange={event => { setSemesterOverride(Number(event.target.value)); setSelectedPlanKey('all'); }}>
              {semesters.map(item => <MenuItem key={item.id} value={item.id}>{item.titulo || `Semestre ${item.id}`}{item.archivado ? ' (archivado)' : ''}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 300 } }}>
            <InputLabel id="curricular-plan-label">Plan de Estudios</InputLabel>
            <Select labelId="curricular-plan-label" label="Plan de Estudios" value={selectedPlan?.key ?? 'all'} disabled={loading || actionLoading || movePending}
              MenuProps={{ disableScrollLock: true }}
              onChange={event => {
                setSelectedPlanKey(event.target.value);
                setSelectedModuloId(null);
                setSelectedCompetenciaId(null);
                setSelectedUnidadId(null);
                setSelectedCapacidadId(null);
                setSelectedIndicadorId(null);
              }}>
              <MenuItem value="all">Todos</MenuItem>
              {planOptions.map(option => <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>)}
            </Select>
          </FormControl>
          {showToolbar && <IconButton color="primary" aria-label="Actualizar" title="Actualizar" onClick={() => void fetchEstructura()} disabled={loading || actionLoading}><RefreshIcon /></IconButton>}
        </Stack>
      )}
    >
      {periodArchived && visibilityAllowed && <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>Semestre archivado: selección de elementos en modo consulta.</Typography>}
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
          {movePending && <Typography role="status" variant="caption" color="text.secondary">Guardando reasignación…</Typography>}
          {allowEdit && <Typography variant="caption" color="text.secondary">Arrastra desde el asa y suelta sobre el elemento superior para reasignar. Mantén el puntero sobre una tarjeta para ver su contenido.</Typography>}
          <Panel
            title="Módulos"
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
                  <AcademicListItem
                    key={modulo.id}
                    {...extraDragProps('modulo', modulo.id, allowEdit && !actionLoading)}
                    selected={selectedModulo?.id === modulo.id}
                    onClick={() => {
                      setSelectedModuloId(modulo.id);
                      setSelectedUnidadId(null);
                      setSelectedCapacidadId(null);
                      setSelectedIndicadorId(null);
                    }}
                    sx={{ minHeight: 72, ...dropIndicatorSx('modulo', modulo.id) }}
                    dragHandle={
                      <DragHandle enabled={allowEdit && !actionLoading} onDragStart={event => beginDrag(event, { entity: 'modulo', id: modulo.id })} />
                    }
                  >
                    <EditableValue
                      value={moduloName(modulo)}
                      prefix={curricularItemCode('M', filteredModulos.filter(item => item.planId === modulo.planId), modulo.id)}
                      target={{ entity: 'modulo', id: modulo.id, field: 'titulo', valueType: 'text' }}
                      lines={2}
                      variant="body2"
                      onSave={saveEditableCell}
                      readOnly={!allowEdit || movePending}
                      details={
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.65, wordBreak: 'break-word' }}>
                          {[planName(modulo), carreraName(modulo)].filter(Boolean).join(' / ') || `Plan ${modulo.planId ?? '-'}`}
                        </Typography>
                      }
                      properties={
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                          <EditableMetricChip value={modulo.horas} target={{ entity: 'modulo', id: modulo.id, field: 'horas', valueType: 'number' }} suffix=" hr" onSave={saveEditableCell} readOnly={!allowEdit || movePending} />
                          <EditableMetricChip value={modulo.creditos} target={{ entity: 'modulo', id: modulo.id, field: 'creditos', valueType: 'number' }} prefix="Cr " onSave={saveEditableCell} readOnly={!allowEdit || movePending} />
                          <Chip size="small" label={`UD ${unidadCount}`} />
                        </Stack>
                      }
                    />
                  </AcademicListItem>
                );
              })}
            </List>
          </Panel>

          <Panel title="Competencias" count={competencias.length} actions={<>
            {hiddenToggle('competencia')}
            {allowCreate && <IconButton size="small" title="Crear competencia" disabled={actionLoading || !selectedModulo} onClick={handleCreateCompetencia}><AddIcon fontSize="small" /></IconButton>}
            {allowDelete && <IconButton size="small" title="Eliminar competencia" color="error" disabled={actionLoading || !selectedCompetencia} onClick={handleDeleteCompetencia}><DeleteOutlineIcon fontSize="small" /></IconButton>}
          </>}>
            {competencias.length === 0 ? <EmptyState label="Sin competencias." /> : (
              <List dense disablePadding>
                {competencias.map(competencia => (
                  <AcademicListItem
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
                    sx={{ opacity: competencia.periodActive === false ? 0.4 : 1, ...dropIndicatorSx('competencia', competencia.id) }}
                    dragHandle={
                      <DragHandle enabled={allowEdit && !actionLoading} onDragStart={event => beginDrag(event, { entity: 'competencia', id: competencia.id })} />
                    }
                  >
                    <EditableValue value={competencia.nombre || 'Sin nombre'} target={{ entity: 'competencia', id: competencia.id, field: 'nombre', valueType: 'text' }} lines={4} variant="body2" onSave={saveEditableCell} readOnly={!allowEdit || movePending}
                      prefix={competencyCodes.get(competencia.id)}
                      actions={visibilityButton('competencia', competencia)}
                      properties={<EditableCompetenciaTipo id={competencia.id} tipo={competencia.tipo} readOnly={!allowEdit || movePending} onSave={saveEditableCell} />} />
                  </AcademicListItem>
                ))}
              </List>
            )}
          </Panel>

          <Panel
            title="Unidades"
            count={unidades.length}
            actions={(
              <>
                {hiddenToggle('unidadDidactica')}
                {allowCreate ? (
                  <IconButton size="small" title="Crear unidad" disabled={actionLoading || !selectedModulo?.id} onClick={handleCreateUnidad}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                ) : null}
                {allowDelete ? (
                  <IconButton size="small" title="Quitar unidad del modulo" color="error" disabled={actionLoading || !selectedUnidad?.relacionId} onClick={handleDetachUnidad}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </>
            )}

          >
            {unidades.length === 0 ? (
              <EmptyState label="Sin unidades." />
            ) : (
              <List dense disablePadding>
                {unidades.map((unidad) => {
                  const unidadReadOnly = !allowEdit || movePending;
                  const canDragUnidad = allowEdit && !actionLoading;

                  return (
                    <AcademicListItem
                      key={`${unidad.relacionId}-${unidad.id}`}
                      {...rowDragProps({ entity: 'competenciaUnidadDidactica', id: unidad.relacionId }, {
 onDragOver: event => updateDropIndicator(event, 'competenciaUnidadDidactica', unidad.relacionId, allowEdit && !actionLoading),
 onDrop: event => { if (allowEdit && !actionLoading) handleExtraDrop('competenciaUnidadDidactica', unidad.relacionId, dropIndicatorRef.current?.position ?? getDropPosition(event)); },
 })}
                      selected={selectedUnidad?.id === unidad.id}
                      onClick={() => {
                        setSelectedUnidadId(unidad.id);
                        setSelectedCapacidadId(null);
                        setSelectedIndicadorId(null);
                      }}
                      sx={{ minHeight: 68, opacity: unidad.periodActive === false ? 0.4 : 1, ...dropIndicatorSx('competenciaUnidadDidactica', unidad.relacionId) }}
                      dragHandle={
                        <DragHandle
                          enabled={canDragUnidad}
                          onDragStart={(event) => beginDrag(event, {
                            entity: 'competenciaUnidadDidactica',
                            id: unidad.relacionId,
                          })}
                        />
                      }
                    >
                      <EditableValue
                        value={unidad.nombre || `Unidad ${unidad.id}`}
                        prefix={descendantCodes.unidades.get(unidad.id)}
                        actions={visibilityButton('unidadDidactica', unidad, selectedCompetencia?.periodActive !== false)}
                        target={{ entity: 'unidadDidactica', id: unidad.id, field: 'nombre', valueType: 'text' }}
                        lines={2}
                        variant="body2"
                        onSave={saveEditableCell}
                        readOnly={unidadReadOnly}
                        properties={
                          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
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
                    </AcademicListItem>
                  );
                })}
              </List>
            )}
          </Panel>

          <Panel
            title="Capacidades"
            count={capacidades.length}
            actions={(
              <>
                {hiddenToggle('capacidadTerminal')}
                {allowCreate ? (
                  <IconButton size="small" title="Crear capacidad" disabled={actionLoading || !selectedUnidad?.id} onClick={handleCreateCapacidad}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                ) : null}
                {allowDelete ? (
                  <IconButton size="small" title="Quitar capacidad" color="error" disabled={actionLoading || !selectedCapacidad?.id} onClick={handleDetachCapacidad}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </>
            )}

          >
            {capacidades.length === 0 ? (
              <EmptyState label="Sin capacidades." />
            ) : (
              <List dense disablePadding>
                {capacidades.map((capacidad) => {
                  const canDragCapacidad = allowEdit && !actionLoading;
                  return (
                  <AcademicListItem
                    key={capacidad.id}
                    data-empleabilidad={selectedUnidad?.competencia.tipo === 'EMPLEABILIDAD' ? 'true' : undefined}
                    {...rowDragProps({ entity: 'capacidadTerminal', id: capacidad.id }, {
 onDragOver: event => updateDropIndicator(event, 'capacidadTerminal', capacidad.id, allowEdit && !actionLoading),
 onDrop: event => { if (allowEdit && !actionLoading) handleExtraDrop('capacidadTerminal', capacidad.id, dropIndicatorRef.current?.position ?? getDropPosition(event)); },
 })}
                    selected={selectedCapacidad?.id === capacidad.id}
                    onClick={() => {
                      setSelectedCapacidadId(capacidad.id);
                      setSelectedIndicadorId(null);
                    }}
                    sx={{ minHeight: 78, opacity: capacidad.periodActive === false ? 0.4 : 1, ...dropIndicatorSx('capacidadTerminal', capacidad.id) }}
                    dragHandle={
                      <DragHandle
                        enabled={canDragCapacidad}
                        onDragStart={(event) => beginDrag(event, {
                          entity: 'capacidadTerminal',
                          id: capacidad.id,
                        })}
                      />
                    }
                  >
                    <EditableValue
                      value={capacidad.descripcion || `Capacidad ${capacidad.id}`}
                      prefix={`${competencyCodes.get(selectedUnidad!.competenciaId) ?? ''} ${descendantCodes.capacidades.get(capacidad.id) ?? ''}`}
                      actions={visibilityButton('capacidadTerminal', capacidad, selectedUnidad?.periodActive !== false)}
                      target={{
                        entity: 'capacidadTerminal',
                        id: capacidad.id,
                        field: 'descripcion',
                        valueType: 'text',
                      }}
                      lines={4}
                      variant="body2"
                      onSave={saveEditableCell}
                      readOnly={!allowEdit || movePending}
                      properties={
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                          {selectedUnidad?.competencia && <Chip size="small"
                            label={selectedUnidad.competencia.tipo === 'TECNICA' ? 'Técnica' : 'Empleabilidad'} title={selectedUnidad.competencia.nombre}
                            sx={selectedUnidad.competencia.tipo === 'EMPLEABILIDAD' ? employabilityChipSx : undefined} />}
                          <Chip size="small" label={`IND ${capacidad.indicadoresCapacidad.length}`} />
                        </Stack>
                      }
                    />
                  </AcademicListItem>
                );
                })}
              </List>
            )}
          </Panel>

          <Panel
            title="Indicadores"
            count={indicadores.length}
            actions={(
              <>
                {hiddenToggle('indicadorCapacidad')}
                {allowCreate ? (
                  <IconButton size="small" title="Crear indicador" disabled={actionLoading || !selectedCapacidad?.id} onClick={handleCreateIndicador}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                ) : null}
                {allowDelete ? (
                  <IconButton size="small" title="Quitar indicador" color="error" disabled={actionLoading || !selectedIndicador?.id} onClick={handleDetachSelectedIndicador}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </>
            )}

          >
            {indicadores.length === 0 ? (
              <EmptyState label="Sin indicadores." />
            ) : (
              <List dense disablePadding>
                {indicadores.map((indicador) => {
                  const canDragIndicador = allowEdit && !actionLoading;
                  return (
                  <AcademicListItem
                    key={indicador.id}
                    {...rowDragProps({ entity: 'indicadorCapacidad', id: indicador.id }, {
 onDragOver: event => updateDropIndicator(event, 'indicadorCapacidad', indicador.id, allowEdit && !actionLoading),
 onDrop: event => { if (allowEdit && !actionLoading) handleExtraDrop('indicadorCapacidad', indicador.id, dropIndicatorRef.current?.position ?? getDropPosition(event)); },
 })}
                    selected={selectedIndicador?.id === indicador.id}
                    onClick={() => setSelectedIndicadorId(indicador.id)}
                    sx={{ minHeight: 72, opacity: indicador.periodActive === false ? 0.4 : 1, ...dropIndicatorSx('indicadorCapacidad', indicador.id) }}
                    dragHandle={
                      <DragHandle
                        enabled={canDragIndicador}
                        onDragStart={(event) => beginDrag(event, {
                          entity: 'indicadorCapacidad',
                          id: indicador.id,
                        })}
                      />
                    }
                  >
                    <EditableValue
                      value={indicador.descripcion || `Indicador ${indicador.id}`}
                      prefix={`${descendantCodes.capacidades.get(selectedCapacidad!.id) ?? ''} ${descendantCodes.indicadores.get(indicador.id) ?? ''}`}
                      actions={visibilityButton('indicadorCapacidad', indicador, selectedCapacidad?.periodActive !== false)}
                      target={{
                        entity: 'indicadorCapacidad',
                        id: indicador.id,
                        field: 'descripcion',
                        valueType: 'text',
                      }}
                      lines={4}
                      variant="body2"
                      onSave={saveEditableCell}
                      readOnly={!allowEdit || movePending}
                    />
                    <SesionItemList kind="contenido" items={indicador.contenidos ?? []} options={[]} canEdit={allowEdit} disabled={actionLoading}
                      renderText={item => <EditableValue value={item.texto} target={{ entity: 'indicadorContenido', id: item.id, field: 'texto', valueType: 'text' }} lines={6} variant="body2" onSave={saveEditableCell} readOnly={!allowEdit || movePending} />}
                      onAdd={data => saveIndicadorContenido(indicador.id, 'add', data)}
                      onRemove={itemId => saveIndicadorContenido(indicador.id, 'remove', { itemId })}
                      onReorder={items => saveIndicadorContenido(indicador.id, 'reorder', { items })} />
                  </AcademicListItem>
                );
                })}
              </List>
            )}
          </Panel>

          <Panel title="Sesiones" count={sesiones.length} cardWidth={{ xs: 280, sm: 360 }} actions={<>
            {allowCreate && <IconButton size="small" title="Crear sesión" disabled={actionLoading || !selectedIndicador} onClick={handleCreateSesion}><AddIcon fontSize="small" /></IconButton>}
            {allowDelete && <IconButton size="small" title="Eliminar sesión" color="error" disabled={actionLoading || !selectedSesion} onClick={handleDeleteSesion}><DeleteOutlineIcon fontSize="small" /></IconButton>}
          </>}>
            {sesiones.length === 0 ? <EmptyState label="Sin sesiones para este indicador." /> : (
              <List dense disablePadding>
                {sesiones.map(sesion => (
                  <AcademicListItem
                    key={sesion.id}
                    selected={selectedSesion?.id === sesion.id}
                    onClick={() => setSelectedSesionId(sesion.id)}
                    {...extraDragProps('actividad', sesion.id, allowEdit && !actionLoading)}
                    sx={{ ...dropIndicatorSx('actividad', sesion.id) }}
                    dragHandle={
                      <DragHandle enabled={allowEdit && !actionLoading} onDragStart={event => beginDrag(event, { entity: 'actividad', id: sesion.id })} />
                    }
                  >
                    <Stack spacing={1.25}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.25 }}>Nombre de sesión</Typography>
                        <EditableValue value={sesion.nombre || 'Sin nombre.'} target={{ entity: 'actividad', id: sesion.id, field: 'nombre', valueType: 'text' }} lines={4} variant="body2" onSave={saveEditableCell} readOnly={!allowEdit || movePending}
                          prefix={descendantCodes.sesiones.get(sesion.id)}
                          properties={<EditableMetricChip value={sesion.duracion ?? null} target={{ entity: 'actividad', id: sesion.id, field: 'duracion', valueType: 'number' }} suffix=" hr" onSave={saveEditableCell} readOnly={!allowEdit || movePending} />} />
                      </Box>
                      <SesionItemList kind="material" items={sesion.materiales ?? []} options={materialOptions} canEdit={allowEdit} disabled={actionLoading}
                        renderText={item => <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.texto}</Typography>}
                        onAdd={data => saveSesionResource(sesion.id, 'add', data)}
                        onRemove={itemId => saveSesionResource(sesion.id, 'remove', { itemId })}
                        onReorder={items => saveSesionResource(sesion.id, 'reorder', { items })} />
                    </Stack>
                  </AcademicListItem>
                ))}
              </List>
            )}
          </Panel>
        </Box>
      )}
    </IntranetListLayout>
    </AcademicTextPreviewProvider>
  );
}
