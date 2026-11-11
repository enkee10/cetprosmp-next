'use client';

import { useCalendarPeriodFinished } from '@/hooks/useCalendarPeriodFinished';
import { isDocenteRole } from '@/lib/intranetPermissions';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  ClickAwayListener,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import SearchIcon from '@mui/icons-material/Search';
import { useSearchParams } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import IntranetDocumentTitle from '@/components/intranet/IntranetDocumentTitle';
import { useAuth } from '@/context/AuthContext';
import { useCurrentSemestreFilter } from '@/hooks/useCurrentSemestreFilter';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useRegistroGradeQueue } from '@/hooks/useRegistroGradeQueue';
import { useRegistroColumnWidths } from '@/hooks/useRegistroColumnWidths';
import { gradeChangeKey, type GradeChange } from '@/lib/registroGradeQueue';
import { RegistroGradeHistory } from '@/lib/registroGradeHistory';
import { repeatRegistroFill, type RegistroFillRange } from '@/lib/registroFill';
import { invalidateMatriculaLists } from '@/lib/matriculasListCache';
import { app } from '@/lib/firebase';
import { formatDateOnly, toDateOnlyInputValue } from '@/lib/dateOnly';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';

type GrupoOption = {
  id: number;
  nombreDisplay: string | null;
  semestreId?: number | null;
  turnoNombre?: string | null;
  semestre?: { titulo?: string | null } | null;
  personal?: {
    displayName?: string | null;
    user?: {
      username?: string | null;
      nombre?: string | null;
      apellidoPaterno?: string | null;
      apellidoMaterno?: string | null;
    } | null;
  } | null;
  grupoModulos?: Array<{
    id: number;
    nombre?: string | null;
    orden: number | null;
    moduloId: number;
    modulo?: {
      titulo?: string | null;
      tituloComercial?: string | null;
    } | null;
  }>;
};

type GrupoModuloOption = {
  id: number;
  nombre?: string | null;
  orden: number | null;
  moduloId: number;
  grupo: GrupoOption;
  modulo?: {
    titulo?: string | null;
    tituloComercial?: string | null;
  } | null;
};

type SemestreOption = {
  id: number;
  titulo?: string | null;
};

type DatosGenerales = {
  nombreInstitucion?: string | null;
  direccion?: string | null;
  telefono1?: string | null;
  correo?: string | null;
};

type Indicador = {
  id: number;
  codigo?: string | null;
  descripcion?: string | null;
  sigla?: string | null;
  capacidadTerminalId?: number | null;
};

type Capacidad = {
  id: number;
  codigo?: string | null;
  competenciaCodigo?: string | null;
  descripcion?: string | null;
  sigla?: string | null;
  unidadDidacticaId?: number | null;
  indicadoresCapacidad: Indicador[];
};

type Unidad = {
  id: number;
  nombre?: string | null;
  sigla?: string | null;
  duracion?: number | null;
  creditos?: number | null;
  capacidadesTerminales: Capacidad[];
};

type Estudiante = {
  id: number;
  promedio?: number | null;
  puntaje?: number | null;
  matriculaId: number;
  matricula?: {
    id: number;
    codigoInscripcion?: string | null;
    user?: {
      id?: number | null;
      dni?: string | null;
      nombre?: string | null;
      apellidos?: string | null;
      apellidoPaterno?: string | null;
      apellidoMaterno?: string | null;
      username?: string | null;
    } | null;
  } | null;
};

type NotaRow = {
  id: number;
  promedio?: number | null;
  matriculaId: number;
  indicadorCapacidadId?: number;
  capacidadTerminalId?: number;
  unidadDidacticaId?: number;
};

type EfsrtPppPromedioRow = {
  id: number;
  promedioFinal?: number | null;
  grupoModuloId: number;
  moduloEstudianteId: number;
};

type RegistroAuxiliar = {
  grupo: {
    id: number;
    nombreDisplay?: string | null;
    turnoNombre?: string | null;
    semestre?: { titulo?: string | null; inicio?: string | null; fin?: string | null } | null;
    personal?: {
      displayName?: string | null;
      user?: {
        username?: string | null;
        nombre?: string | null;
        apellidoPaterno?: string | null;
        apellidoMaterno?: string | null;
      } | null;
    } | null;
    turno?: { nombre?: string | null } | null;
    horario?: { nombre?: string | null; diasSemana?: string | null } | null;

  } | null;
  grupoModulo: {
    id: number;
    nombre?: string | null;
    inicio?: string | null;
    fin?: string | null;
    modulo?: {
      id: number;
      titulo?: string | null;
      tituloComercial?: string | null;
      horas?: number | null;
      creditosEfsrt?: number | null;
      plan?: {
        planEstudio?: string | null;
        carrera?: {
          nombre?: string | null;
          titulo?: string | null;
          tituloComercial?: string | null;
          nivel?: string | null;
          tipoCarrera?: { nombre?: string | null } | null;
          especialidad?: { titulo?: string | null; tituloComercial?: string | null } | null;
        } | null;
      } | null;
    } | null;
  } | null;
  estructura: Unidad[];
  estudiantes: Estudiante[];
  notas: NotaRow[];
  promediosEfsrtPpp?: EfsrtPppPromedioRow[];
};

type CellPosition = {
  estudianteIndex: number;
  indicadorIndex: number;
};

type CellSelection = {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
};

type GradeHistoryLocation = { page: number; cell: GradeChange };
type GradeValues = { notas: Record<string, string>; efsrtPppNotas: Record<string, string> };
type EditableGridColumn = { index: number; col: number; indicadorId?: number };
type FillDrag = {
  page: number;
  original: GradeValues;
  selection: CellSelection;
  source: Array<Array<number | null>>;
  bounds: RegistroFillRange;
  expanded: RegistroFillRange;
  preview: GradeChange[];
  startX: number;
  startY: number;
  moved: boolean;
  axis: 'row' | 'col' | null;
};

type SelectableColumn = {
  key: string;
  getValue: (student: Estudiante, studentIndex: number) => string;
};

type StudentNameDraft = {
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
};

const UNITS_PER_PAGE = 2;
const SUMMARY_COLUMN_WIDTH = 45;
const REGISTRO_CUT_CLIPBOARD_TYPE = 'application/x-cetprosmp-registro-cut';
// Keep consumed cuts across unit pages and component remounts in this tab.
const consumedCutIds = new Set<string>();
const FILL_CURSOR = 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27%3E%3Cpath d=%27M7 1h2v6h6v2H9v6H7V9H1V7h6z%27 fill=%27black%27/%3E%3C/svg%3E") 8 8, crosshair';
const MODULE_INFO_ROW_COUNT = 5;
const TABLE_HEADER_ONLY_ROW_COUNT = 3;
const TABLE_HEADER_ROW_START = MODULE_INFO_ROW_COUNT;
const TABLE_HEADER_ROW_COUNT = MODULE_INFO_ROW_COUNT + TABLE_HEADER_ONLY_ROW_COUNT;
const MODULE_INFO_LEFT_LABEL_COL = 0;
const MODULE_INFO_LEFT_VALUE_COL = 1;
const MODULE_INFO_RIGHT_LABEL_COL = 3;
const MODULE_INFO_RIGHT_VALUE_COL = 4;
const PAGE_TITLE = 'Registro Auxiliar de Evaluación';

const toTitleCase = (value: string | null | undefined) =>
  String(value ?? '')
    .toLocaleLowerCase('es-PE')
    .replace(/\b([\p{L}])/gu, (letter) => letter.toLocaleUpperCase('es-PE'));

const getStudentName = (student: Estudiante) => {
  const user = student.matricula?.user;
  const apellidos = [user?.apellidoPaterno, user?.apellidoMaterno]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const nombres = (user?.nombre || user?.apellidos || user?.username || '').replace(/\s+/g, ' ').trim();
  if (apellidos && nombres) return `${apellidos.toLocaleUpperCase('es-PE')}, ${toTitleCase(nombres)}`;
  if (apellidos) return apellidos.toLocaleUpperCase('es-PE');
  if (nombres) return toTitleCase(nombres);
  return `Matricula ${student.matriculaId}`;
};

const studentNameDraftFromStudent = (student: Estudiante): StudentNameDraft => ({
  apellidoPaterno: String(student.matricula?.user?.apellidoPaterno ?? '').trim(),
  apellidoMaterno: String(student.matricula?.user?.apellidoMaterno ?? '').trim(),
  nombres: String(student.matricula?.user?.nombre ?? '').trim(),
});

const getPersonalName = (grupo: RegistroAuxiliar['grupo']) => {
  const personal = grupo?.personal;
  const user = personal?.user;
  return personal?.displayName || [user?.nombre, user?.apellidoPaterno, user?.apellidoMaterno].filter(Boolean).join(' ') || user?.username || '';
};

const getModuloName = (registro: RegistroAuxiliar | null) =>
  registro?.grupoModulo?.modulo?.titulo || registro?.grupoModulo?.modulo?.tituloComercial || '';

const getModuloCiclo = (registro: RegistroAuxiliar | null) =>
  registro?.grupoModulo?.modulo?.plan?.carrera?.nivel || '';

const getPlanEstudioName = (registro: RegistroAuxiliar | null) => {
  const carrera = registro?.grupoModulo?.modulo?.plan?.carrera;
  return carrera?.nombre || carrera?.titulo || carrera?.tituloComercial || carrera?.especialidad?.tituloComercial || carrera?.especialidad?.titulo || '';
};

const normalizeText = (value: string | null | undefined) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getTipoCarreraName = (registro: RegistroAuxiliar | null) =>
  registro?.grupoModulo?.modulo?.plan?.carrera?.tipoCarrera?.nombre || '';

const usesOpcionOcupacionalRulesRegistro = (registro: RegistroAuxiliar | null) => {
  const normalized = normalizeText(getTipoCarreraName(registro));
  return normalized.includes('opcion ocupacional') || normalized.includes('modulo ocupacional');
};

const isProgramaEstudioRegistro = (registro: RegistroAuxiliar | null) =>
  normalizeText(getTipoCarreraName(registro)).includes('programa de estudio');

const getTipoCarreraRegistroLabel = (registro: RegistroAuxiliar | null) => {
  const tipoCarrera = getTipoCarreraName(registro);
  const normalized = normalizeText(tipoCarrera);
  if (normalized.includes('programa de estudio')) return 'PLAN DE ESTUDIOS';
  if (normalized.includes('opcion ocupacional')) return 'OPCION OCUPACIONAL';
  if (normalized.includes('modulo ocupacional')) return 'MODULO OCUPACIONAL';
  return tipoCarrera ? tipoCarrera.toLocaleUpperCase('es-PE') : 'PLAN DE ESTUDIOS';
};

const formatDate = (value: string | null | undefined) => {
  return formatDateOnly(value);
};

const formatDateInput = (value: string | null | undefined) => {
  return toDateOnlyInputValue(value);
};

const getTurnoHorarioName = (grupo: RegistroAuxiliar['grupo']) => {
  const turno = grupo?.turno?.nombre || grupo?.turnoNombre || '';
  const horario = grupo?.horario?.nombre || grupo?.horario?.diasSemana || '';
  return [turno, horario].filter(Boolean).join(' - ');
};

const notaKey = (matriculaId: number, indicadorId: number) => `${matriculaId}:${indicadorId}`;
const efsrtPppKey = (moduloEstudianteId: number) => String(moduloEstudianteId);
const editableCellKey = (rowIndex: number, columnIndex: number) => `${rowIndex}:${columnIndex}`;

const parseNota = (value: string | null | undefined) => {
  if (value == null || String(value).trim() === '') return null;
  const numeric = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(20, Math.round(numeric * 100) / 100));
};

const gradeValue = (values: GradeValues, change: GradeChange) => parseNota(change.kind === 'nota'
  ? values.notas[notaKey(change.matriculaId, change.indicadorCapacidadId)]
  : values.efsrtPppNotas[efsrtPppKey(change.moduloEstudianteId)]);

const gradeEdits = (changes: GradeChange[], original: GradeValues) => changes.map(after => ({
  before: { ...after, value: gradeValue(original, after) }, after,
}));

const gridGradeChange = (student: Estudiante, column: EditableGridColumn, value: number | null): GradeChange => column.indicadorId != null
  ? { kind: 'nota', matriculaId: student.matriculaId, indicadorCapacidadId: column.indicadorId, value }
  : { kind: 'efsrt', moduloEstudianteId: student.id, value };

const displayNumber = (value: number | null) => {
  if (value == null) return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const displayGrade = (value: number | null) => {
  if (value == null) return '';
  const text = Number.isInteger(value) ? String(value) : String(value);
  const [integerPart, decimalPart] = text.split('.');
  return `${integerPart.padStart(2, '0')}${decimalPart ? `.${decimalPart}` : ''}`;
};

const isLowGrade = (value: number | null) => value != null && value < 13;

const gradeColor = (value: number | null) => (isLowGrade(value) ? '#c00000' : 'inherit');

const roundPromedio = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(value);
};

const average = (values: Array<number | null>) => {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (valid.length === 0 || valid.length !== values.length) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
};

const sumNotas = (values: Array<number | null>) => {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) * 10) / 10;
};

const weightedAverage = (values: Array<{ value: number | null; weight: number | null | undefined }>) => {
  let weightedSum = 0;
  let totalWeight = 0;
  const rawValues: Array<number | null> = [];

  for (const item of values) {
    rawValues.push(item.value);
    if (typeof item.value !== 'number' || !Number.isFinite(item.value)) return null;
    if (typeof item.weight !== 'number' || !Number.isFinite(item.weight) || item.weight <= 0) continue;
    weightedSum += item.value * item.weight;
    totalWeight += item.weight;
  }

  if (totalWeight <= 0) return average(rawValues);
  return Math.round(weightedSum / totalWeight);
};

const buildIndicatorColumns = (estructura: Unidad[]) => {
  const columns: Array<{
    unidad: Unidad;
    capacidad: Capacidad;
    indicador: Indicador;
  }> = [];
  for (const unidad of estructura) {
    for (const capacidad of unidad.capacidadesTerminales || []) {
      for (const indicador of capacidad.indicadoresCapacidad || []) {
        columns.push({ unidad, capacidad, indicador });
      }
    }
  }
  return columns;
};

const curricularLabel = (...parts: Array<string | null | undefined>) =>
  parts.map(part => part?.trim()).filter((part): part is string => Boolean(part)).join(' ');

const unitLabel = (unidad: Unidad, position: number) =>
  `${position}. ${(unidad.nombre || unidad.sigla || '').trim().toLocaleUpperCase('es-PE')}`;

const getGrupoModuloLabel = (grupoModulo: GrupoModuloOption) => {
  const titulo = grupoModulo.modulo?.titulo?.trim();
  const nombre = grupoModulo.nombre?.trim();
  return nombre || `${grupoModulo.grupo.nombreDisplay || `Grupo ${grupoModulo.grupo.id}`} - ${
    titulo || grupoModulo.modulo?.tituloComercial || `Modulo ${grupoModulo.moduloId}`
  }`;
};

export default function RegistroAuxiliarPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { can } = useIntranetPermissions();
  const { settings } = useAppSettings();
  const [grupos, setGrupos] = useState<GrupoOption[]>([]);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [datosGenerales, setDatosGenerales] = useState<DatosGenerales | null>(null);
  const [semestreId, setSemestreId] = useCurrentSemestreFilter();
  const [selectedGrupoModuloId, setGrupoModuloId] = useState('');
  const [registro, setRegistro] = useState<RegistroAuxiliar | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [efsrtPppNotas, setEfsrtPppNotas] = useState<Record<string, string>>({});
  const [focusedCell, setFocusedCell] = useState<CellPosition | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingRegistro, setLoadingRegistro] = useState(false);
  const [editingModuloFechas, setEditingModuloFechas] = useState(false);
  const [fechaInicioModulo, setFechaInicioModulo] = useState('');
  const [fechaFinModulo, setFechaFinModulo] = useState('');
  const [savingModuloFechas, setSavingModuloFechas] = useState(false);
  const [unitPage, setUnitPage] = useState(0);
  const [registroViewportWidth, setRegistroViewportWidth] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingNewMatricula, setEditingNewMatricula] = useState(false);
  const [newMatriculaDni, setNewMatriculaDni] = useState('');
  const [creatingMatricula, setCreatingMatricula] = useState(false);
  const [retiringModuloEstudianteId, setRetiringModuloEstudianteId] = useState<number | null>(null);
  const [editingStudentNameId, setEditingStudentNameId] = useState<number | null>(null);
  const [studentNameDraft, setStudentNameDraft] = useState<StudentNameDraft>({
    apellidoPaterno: '',
    apellidoMaterno: '',
    nombres: '',
  });
  const [savingStudentNameId, setSavingStudentNameId] = useState<number | null>(null);
  const [cellSelection, setCellSelection] = useState<CellSelection | null>(null);
  const [selectingCells, setSelectingCells] = useState(false);
  const [fillingCells, setFillingCells] = useState(false);
  const fillHandleRef = useRef<HTMLButtonElement | null>(null);
  const fillDragRef = useRef<FillDrag | null>(null);
  const editableCellRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const editableFocusFrameRef = useRef<number | null>(null);
  const pendingPageFocusRef = useRef<{ page: number; matriculaId: number; column: number; selectCell?: boolean } | null>(null);
  const registroFrameRef = useRef<HTMLDivElement | null>(null);
  const registroScrollRef = useRef<HTMLDivElement | null>(null);
  const registroHeaderRef = useRef<HTMLTableSectionElement | null>(null);
  const selectionPointerRef = useRef<{ x: number; y: number } | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const committingStudentNameRef = useRef(false);
  const registroRequestRef = useRef(0);
  const creatingMatriculaRef = useRef(false);

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);
  const directGrupoModuloId = searchParams.get('grupoModuloId') || '';
  const isDirectRegistro = Boolean(directGrupoModuloId);
  const isDocente = isDocenteRole(user?.role) && Number(user?.level ?? 0) < 600;
  const registroTitle = PAGE_TITLE;
  const currentSemestre = settings.general.semestres.find(item => item.id === settings.general.semestreActualId);
  const semestreFinished = useCalendarPeriodFinished(currentSemestre?.fin ?? registro?.grupo?.semestre?.fin);
  const docenteReadOnly = isDocente && semestreFinished;
  const canEditRegistro = can('registro-auxiliar', 'edit') && !docenteReadOnly;
  const canEditModuloFechas = canEditRegistro;
  const canCreateRegistroMatriculas = can('registro-auxiliar', 'create') && !docenteReadOnly;
  const canDeleteRegistroMatriculas = can('registro-auxiliar', 'delete') && !docenteReadOnly;

  useLayoutEffect(() => {
    const container = registroFrameRef.current;
    if (!container) return;

    let frame: number | null = null;
    const viewport = window.visualViewport;
    const scrollContainer = registroScrollRef.current;
    const updateWidth = (width: number) => {
      // Leave one CSS pixel for fractional layout rounding at different zoom levels.
      setRegistroViewportWidth(Math.max(0, Math.floor(width) - 1));
    };
    const updateHeight = () => {
      frame = null;
      const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const height = `${Math.max(0, Math.floor(viewportBottom - container.getBoundingClientRect().top - 10))}px`;
      if (container.style.getPropertyValue('--registro-frame-height') !== height) container.style.setProperty('--registro-frame-height', height);
    };
    const scheduleUpdate = () => {
      if (frame === null) frame = window.requestAnimationFrame(updateHeight);
    };

    const observer = new ResizeObserver(entries => {
      const entry = entries.find(entry => entry.target === scrollContainer);
      // contentRect excludes a visible scrollbar without rounding up like clientWidth.
      if (entry) updateWidth(entry.contentRect.width);
      scheduleUpdate();
    });
    if (container.parentElement) observer.observe(container.parentElement);
    if (scrollContainer) {
      observer.observe(scrollContainer);
      updateWidth(scrollContainer.getBoundingClientRect().width - (scrollContainer.offsetWidth - scrollContainer.clientWidth));
    }
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    viewport?.addEventListener('resize', scheduleUpdate);
    viewport?.addEventListener('scroll', scheduleUpdate);
    updateHeight();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      viewport?.removeEventListener('resize', scheduleUpdate);
      viewport?.removeEventListener('scroll', scheduleUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (editableFocusFrameRef.current !== null) window.cancelAnimationFrame(editableFocusFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (!directGrupoModuloId) return;
    setGrupoModuloId(directGrupoModuloId);
    setSemestreId('');
  }, [directGrupoModuloId, setSemestreId]);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      setError(null);
      try {
        if (auth.currentUser) await auth.currentUser.getIdToken();
        const getDatosGeneralesGlobales = httpsCallable<
          undefined,
          { datoGeneral?: DatosGenerales | null; datosGenerales?: DatosGenerales | null }
        >(
          functions,
          'getDatosGeneralesGlobales',
        );
        if (isDirectRegistro) {
          const datosResult = await getDatosGeneralesGlobales();
          setGrupos([]);
          setSemestres([]);
          setDatosGenerales(datosResult.data.datoGeneral || datosResult.data.datosGenerales || null);
          return;
        }

        const listRegistroAuxiliarOpciones = httpsCallable<
          undefined,
          {
            grupos?: GrupoOption[];
            semestres?: SemestreOption[];
            datoGeneral?: DatosGenerales | null;
            datosGenerales?: DatosGenerales | null;
          }
        >(functions, 'listRegistroAuxiliarOpciones');
        const opcionesResult = await listRegistroAuxiliarOpciones();
        const nextGrupos = (opcionesResult.data.grupos || [])
          .filter((grupo) => (grupo.grupoModulos || []).length > 0)
          .sort((a, b) => String(a.nombreDisplay ?? '').localeCompare(String(b.nombreDisplay ?? ''), 'es', { numeric: true }));
        setGrupos(nextGrupos);
        setSemestres(opcionesResult.data.semestres || []);
        setDatosGenerales(opcionesResult.data.datoGeneral || opcionesResult.data.datosGenerales || null);
      } catch (err) {
        console.error('Error loading registro auxiliar options', err);
        setError('No se pudieron cargar los grupos para el registro auxiliar.');
      } finally {
        setLoadingOptions(false);
      }
    };

    void fetchOptions();
  }, [auth, functions, isDirectRegistro]);

  const grupoModuloOptions = useMemo<GrupoModuloOption[]>(
    () =>
      grupos
        .flatMap((grupo) =>
          (grupo.grupoModulos || []).map((grupoModulo) => ({
            ...grupoModulo,
            grupo,
          })),
        )
        .sort(
          (a, b) =>
            String(getGrupoModuloLabel(a)).localeCompare(String(getGrupoModuloLabel(b)), 'es', { numeric: true }) ||
            (a.orden ?? 0) - (b.orden ?? 0) ||
            a.moduloId - b.moduloId,
        ),
    [grupos],
  );

  const availableSemestreIds = useMemo(
    () =>
      new Set(
        grupoModuloOptions
          .map((option) => option.grupo.semestreId)
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
      ),
    [grupoModuloOptions],
  );

  const semestreOptions = useMemo(() => {
    const options = loadingOptions
      ? settings.general.semestres
      : semestres.filter((semestre) => availableSemestreIds.has(semestre.id));
    const current = settings.general.semestres.find((semestre) => semestre.id === settings.general.semestreActualId);
    return current && !options.some((semestre) => semestre.id === current.id) ? [current, ...options] : options;
  }, [availableSemestreIds, loadingOptions, semestres, settings.general.semestres, settings.general.semestreActualId]);

  const filteredGrupoModuloOptions = useMemo(
    () => {
      const selectedSemester = isDocente ? String(settings.general.semestreActualId ?? '') : semestreId;
      return selectedSemester ? grupoModuloOptions.filter(option => String(option.grupo.semestreId ?? '') === selectedSemester) : [];
    },
    [grupoModuloOptions, semestreId, isDocente, settings.general.semestreActualId],
  );

  // Resolve the default in the same render as the options, without waiting for another effect.
  const grupoModuloId = directGrupoModuloId || (
    filteredGrupoModuloOptions.some((option) => String(option.id) === selectedGrupoModuloId)
      ? selectedGrupoModuloId
      : String(filteredGrupoModuloOptions[0]?.id ?? '')
  );
  const { queue: gradeQueue, status: gradeSaveStatus, enqueue: queueGrades, flush: flushGrades } = useRegistroGradeQueue(user?.uid, grupoModuloId, canEditRegistro);
  const [gradeHistory] = useState(() => new RegistroGradeHistory<GradeHistoryLocation>());

  const recordGradeChanges = (changes: GradeChange[], editingKey?: string) => {
    if (!changes.length) return;
    gradeHistory.record(gradeEdits(changes, { notas, efsrtPppNotas }), editingKey, { page: unitPage, cell: changes[0] });
  };

  const applyGradeChanges = useCallback((changes: GradeChange[], save = true) => {
    if (!changes.length) return;
    const next: Record<string, string> = {};
    const nextEfsrt: Record<string, string> = {};
    for (const change of changes) {
      const value = displayGrade(change.value);
      if (change.kind === 'nota') next[notaKey(change.matriculaId, change.indicadorCapacidadId)] = value;
      else nextEfsrt[efsrtPppKey(change.moduloEstudianteId)] = value;
    }
    if (Object.keys(next).length) setNotas(prev => ({ ...prev, ...next }));
    if (Object.keys(nextEfsrt).length) setEfsrtPppNotas(prev => ({ ...prev, ...nextEfsrt }));
    if (save) gradeQueue?.enqueue(changes);
  }, [gradeQueue]);

  const fetchRegistro = useCallback(async () => {
    const request = ++registroRequestRef.current;
    gradeHistory.clear();
    if (!grupoModuloId) {
      setRegistro(null);
      setNotas({});
      setEfsrtPppNotas({});
      return;
    }
    setLoadingRegistro(true);
    setError(null);
    setMessage(null);
    const pendingBeforeLoad = gradeQueue?.values() ?? [];
    try {
      const getRegistroAuxiliar = httpsCallable<{ grupoModuloId: number }, RegistroAuxiliar>(
        functions,
        'getRegistroAuxiliar',
      );
      const result = await getRegistroAuxiliar({ grupoModuloId: Number(grupoModuloId) });
      if (request !== registroRequestRef.current) return;
      setRegistro(result.data);
      setEditingModuloFechas(false);
      const nextNotas: Record<string, string> = {};
      for (const nota of result.data.notas || []) {
        if (!nota.indicadorCapacidadId || nota.promedio == null) continue;
        nextNotas[notaKey(nota.matriculaId, nota.indicadorCapacidadId)] = displayGrade(nota.promedio);
      }
      const nextEfsrtPppNotas: Record<string, string> = {};
      for (const promedio of result.data.promediosEfsrtPpp || []) {
        if (promedio.promedioFinal == null) continue;
        nextEfsrtPppNotas[efsrtPppKey(promedio.moduloEstudianteId)] = displayGrade(promedio.promedioFinal);
      }
      for (const row of [...pendingBeforeLoad, ...(gradeQueue?.values() ?? [])]) {
        if (row.kind === 'nota') nextNotas[notaKey(row.matriculaId, row.indicadorCapacidadId)] = row.value === null ? '' : displayGrade(row.value);
        else nextEfsrtPppNotas[efsrtPppKey(row.moduloEstudianteId)] = row.value === null ? '' : displayGrade(row.value);
      }
      setNotas(nextNotas);
      setEfsrtPppNotas(nextEfsrtPppNotas);
      setEditingNewMatricula(false);
      setNewMatriculaDni('');
    } catch (err) {
      if (request !== registroRequestRef.current) return;
      console.error('Error loading registro auxiliar', err);
      setRegistro(null);
      setEfsrtPppNotas({});
      setError('No se pudo cargar el registro auxiliar.');
    } finally {
      if (request === registroRequestRef.current) setLoadingRegistro(false);
    }
  }, [functions, grupoModuloId, gradeQueue, gradeHistory]);

  useEffect(() => {
    void fetchRegistro();
  }, [fetchRegistro]);

  useEffect(() => {
    pendingPageFocusRef.current = null;
    setUnitPage(0);
  }, [grupoModuloId]);

  const unitPageCount = Math.max(1, Math.ceil((registro?.estructura?.length || 0) / UNITS_PER_PAGE));

  useEffect(() => {
    setUnitPage((current) => Math.min(current, unitPageCount - 1));
  }, [unitPageCount]);

  const visibleUnits = useMemo(
    () => (registro?.estructura || []).slice(unitPage * UNITS_PER_PAGE, unitPage * UNITS_PER_PAGE + UNITS_PER_PAGE),
    [registro, unitPage],
  );

  const visibleIndicatorColumns = useMemo(() => buildIndicatorColumns(visibleUnits), [visibleUnits]);
  const usesOcupacionalRules = useMemo(() => usesOpcionOcupacionalRulesRegistro(registro), [registro]);
  const isProgramaEstudio = useMemo(() => isProgramaEstudioRegistro(registro), [registro]);
  const tipoCarreraRegistroLabel = useMemo(() => getTipoCarreraRegistroLabel(registro), [registro]);
  const showEfsrtPpp = !usesOcupacionalRules;
  const editableGridColumns = useMemo(() => {
    const columns: EditableGridColumn[] = [];
    let col = 3;
    for (const unit of visibleUnits) {
      for (const capacity of unit.capacidadesTerminales) {
        for (const indicator of capacity.indicadoresCapacidad) columns.push({ index: columns.length, col: col++, indicadorId: indicator.id });
      }
      col += 1;
    }
    if (showEfsrtPpp) columns.push({ index: columns.length, col });
    return columns;
  }, [showEfsrtPpp, visibleUnits]);
  const editableColumnCount = editableGridColumns.length;
  const fixedColumnWidth = 34 + 105 + 275 + SUMMARY_COLUMN_WIDTH * (showEfsrtPpp ? 3 : 2) + 1;
  const visibleCapacityColumns = useMemo(() => visibleUnits.flatMap(unit => unit.capacidadesTerminales.map(capacity => ({
    id: capacity.id,
    indicatorIds: capacity.indicadoresCapacidad.map(indicator => indicator.id),
  }))), [visibleUnits]);
  const columnLayout = useRegistroColumnWidths(registroHeaderRef, visibleCapacityColumns, registroViewportWidth, fixedColumnWidth, visibleUnits.length);

  const scrollVisibleCellIntoView = useCallback((element: HTMLElement) => {
    const container = registroScrollRef.current;
    if (!container) return;

    const viewport = container.getBoundingClientRect();
    const cell = (element.closest('td') ?? element).getBoundingClientRect();
    const left = viewport.left + container.clientLeft;
    const right = left + container.clientWidth;
    const top = Math.max(viewport.top + container.clientTop, registroHeaderRef.current?.getBoundingClientRect().bottom ?? viewport.top);
    const bottom = viewport.top + container.clientTop + container.clientHeight;
    // Native focus scrolling does not account for the sticky header or cell borders.
    if (cell.top < top) container.scrollTop += cell.top - top;
    else if (cell.bottom > bottom) container.scrollTop += cell.bottom - bottom;
    if (cell.left < left) container.scrollLeft += cell.left - left;
    else if (cell.right > right) container.scrollLeft += cell.right - right;
  }, []);

  const focusVisibleGradeInput = useCallback((input: HTMLInputElement | null | undefined, selectCell = false) => {
    if (!input) return;
    input.focus({ preventScroll: true });
    input.select();
    if (selectCell) {
      const cell = input.closest<HTMLElement>('[data-selection-row]');
      if (cell) {
        const row = Number(cell.dataset.selectionRow);
        const col = Number(cell.dataset.selectionCol);
        setCellSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
      }
    }
    scrollVisibleCellIntoView(input);
  }, [scrollVisibleCellIntoView]);

  useLayoutEffect(() => {
    setCellSelection(null);
  }, [grupoModuloId, unitPage]);

  useLayoutEffect(() => {
    if (editableFocusFrameRef.current !== null) {
      window.cancelAnimationFrame(editableFocusFrameRef.current);
      editableFocusFrameRef.current = null;
    }
    const pending = pendingPageFocusRef.current;
    if (!pending || pending.page !== unitPage) return;
    pendingPageFocusRef.current = null;
    const row = registro?.estudiantes.findIndex(student => student.matriculaId === pending.matriculaId) ?? -1;
    if (row < 0) return;
    const input = editableCellRefs.current[editableCellKey(row, pending.column)];
    focusVisibleGradeInput(input, pending.selectCell);
  }, [focusVisibleGradeInput, registro, unitPage]);

  const focusEditableCell = useCallback(
    (rowIndex: number, columnIndex: number, selectCell = false) => {
      if (!registro?.estudiantes.length || editableColumnCount <= 0) return;
      const nextRow = Math.max(0, Math.min(registro.estudiantes.length - 1, rowIndex));
      const nextColumn = Math.max(0, Math.min(editableColumnCount - 1, columnIndex));
      if (editableFocusFrameRef.current !== null) window.cancelAnimationFrame(editableFocusFrameRef.current);
      editableFocusFrameRef.current = window.requestAnimationFrame(() => {
        editableFocusFrameRef.current = null;
        const nextInput = editableCellRefs.current[editableCellKey(nextRow, nextColumn)];
        focusVisibleGradeInput(nextInput, selectCell);
      });
    },
    [editableColumnCount, focusVisibleGradeInput, registro?.estudiantes.length],
  );

  const restoreHistoryLocation = useCallback((location: GradeHistoryLocation | undefined) => {
    if (!registro || !location) return;
    const { page, cell } = location;
    const row = registro.estudiantes.findIndex(student => cell.kind === 'nota'
      ? student.matriculaId === cell.matriculaId : student.id === cell.moduloEstudianteId);
    const units = registro.estructura.slice(page * UNITS_PER_PAGE, (page + 1) * UNITS_PER_PAGE);
    const columns = buildIndicatorColumns(units);
    const column = cell.kind === 'nota'
      ? columns.findIndex(item => item.indicador.id === cell.indicadorCapacidadId) : columns.length;
    if (row < 0 || column < 0) return;
    setCellSelection(null);
    setSelectingCells(false);
    selectionPointerRef.current = null;
    if (page !== unitPage) {
      pendingPageFocusRef.current = { page, matriculaId: registro.estudiantes[row].matriculaId, column, selectCell: true };
      setUnitPage(page);
    } else {
      focusEditableCell(row, column, true);
    }
  }, [focusEditableCell, registro, unitPage]);

  useEffect(() => {
    const handleHistoryKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!(event.ctrlKey || event.metaKey) || event.altKey
        || !(key === 'z' || key === 'y' && !event.shiftKey)) return;
      const target = event.target;
      // A paging button can become disabled and leave keyboard focus on the body.
      if (!(target instanceof HTMLElement)
        || target !== document.body && !registroFrameRef.current?.contains(target)) return;
      const isGradeInput = target instanceof HTMLInputElement
        && (target.hasAttribute('data-nota-key') || target.hasAttribute('data-efsrt-key'));
      if (!isGradeInput && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!canEditRegistro || !registro || loadingRegistro) return;
      event.preventDefault();
      event.stopPropagation();
      const operation = key === 'y' || event.shiftKey ? gradeHistory.redo() : gradeHistory.undo();
      if (operation) {
        applyGradeChanges(operation.changes);
        restoreHistoryLocation(operation.location);
      }
    };
    document.addEventListener('keydown', handleHistoryKeyDown);
    return () => document.removeEventListener('keydown', handleHistoryKeyDown);
  }, [applyGradeChanges, canEditRegistro, gradeHistory, loadingRegistro, registro, restoreHistoryLocation]);

  const handleEditableCellKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, columnIndex: number) => {
      const key = event.key;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(key)) return;

      let nextRow = rowIndex;
      let nextColumn = columnIndex;
      if (key === 'ArrowUp') nextRow -= 1;
      if (key === 'ArrowDown') nextRow += 1;
      if (key === 'ArrowLeft') nextColumn -= 1;
      if (key === 'ArrowRight') nextColumn += 1;
      if (key === 'Enter') nextRow += event.shiftKey ? -1 : 1;
      if (key === 'Tab') nextColumn += event.shiftKey ? -1 : 1;

      event.preventDefault();
      setCellSelection(null);
      setSelectingCells(false);
      selectionPointerRef.current = null;
      const direction = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
      const atPageEdge = direction > 0 ? columnIndex >= visibleIndicatorColumns.length - 1 : columnIndex === 0;
      if (direction && atPageEdge) {
        for (let page = unitPage + direction; page >= 0 && page < unitPageCount; page += direction) {
          const units = (registro?.estructura || []).slice(page * UNITS_PER_PAGE, (page + 1) * UNITS_PER_PAGE);
          const columns = buildIndicatorColumns(units);
          if (!columns.length) continue;
          const student = registro?.estudiantes[rowIndex];
          if (!student) return;
          pendingPageFocusRef.current = {
            page,
            matriculaId: student.matriculaId,
            column: direction > 0 ? 0 : columns.length - 1,
          };
          setUnitPage(page);
          return;
        }
      }
      focusEditableCell(nextRow, nextColumn);
    },
    [focusEditableCell, registro, unitPage, unitPageCount, visibleIndicatorColumns.length],
  );

  const startEditingStudentName = useCallback((student: Estudiante) => {
    if (!canEditRegistro || savingStudentNameId) return;
    setError(null);
    setMessage(null);
    setCellSelection(null);
    setSelectingCells(false);
    selectionPointerRef.current = null;
    setEditingStudentNameId(student.id);
    setStudentNameDraft(studentNameDraftFromStudent(student));
  }, [canEditRegistro, savingStudentNameId]);

  const cancelEditingStudentName = useCallback(() => {
    setEditingStudentNameId(null);
    setStudentNameDraft({ apellidoPaterno: '', apellidoMaterno: '', nombres: '' });
  }, []);

  const commitEditingStudentName = useCallback(async () => {
    if (!registro || !editingStudentNameId || committingStudentNameRef.current) return;

    const student = registro.estudiantes.find((item) => item.id === editingStudentNameId);
    if (!student) {
      cancelEditingStudentName();
      return;
    }

    const nextDraft: StudentNameDraft = {
      apellidoPaterno: studentNameDraft.apellidoPaterno.trim(),
      apellidoMaterno: studentNameDraft.apellidoMaterno.trim(),
      nombres: studentNameDraft.nombres.trim(),
    };
    if (!nextDraft.apellidoPaterno || !nextDraft.apellidoMaterno || !nextDraft.nombres) {
      setError('Completa apellido paterno, apellido materno y nombres.');
      return;
    }

    const currentDraft = studentNameDraftFromStudent(student);
    if (
      currentDraft.apellidoPaterno === nextDraft.apellidoPaterno &&
      currentDraft.apellidoMaterno === nextDraft.apellidoMaterno &&
      currentDraft.nombres === nextDraft.nombres
    ) {
      cancelEditingStudentName();
      return;
    }

    committingStudentNameRef.current = true;
    setSavingStudentNameId(student.id);
    try {
      if (auth.currentUser) await auth.currentUser.getIdToken(true);
      const updateRegistroAuxiliarEstudianteNombre = httpsCallable<
        {
          grupoModuloId: number;
          moduloEstudianteId: number;
          apellidoPaterno: string;
          apellidoMaterno: string;
          nombres: string;
        },
        {
          user?: {
            id?: number | null;
            username?: string | null;
            nombre?: string | null;
            apellidoPaterno?: string | null;
            apellidoMaterno?: string | null;
          };
        }
      >(functions, 'updateRegistroAuxiliarEstudianteNombre');
      const result = await updateRegistroAuxiliarEstudianteNombre({
        grupoModuloId: Number(grupoModuloId),
        moduloEstudianteId: student.id,
        apellidoPaterno: nextDraft.apellidoPaterno,
        apellidoMaterno: nextDraft.apellidoMaterno,
        nombres: nextDraft.nombres,
      });
      const updatedUser = result.data.user;
      invalidateMatriculaLists();
      setRegistro((current) => {
        if (!current) return current;
        return {
          ...current,
          estudiantes: current.estudiantes.map((item) => {
            if (item.id !== student.id) return item;
            const user = item.matricula?.user ?? {};
            return {
              ...item,
              matricula: item.matricula
                ? {
                  ...item.matricula,
                  user: {
                    ...user,
                    id: updatedUser?.id ?? user.id,
                    username: updatedUser?.username ?? user.username,
                    nombre: updatedUser?.nombre ?? nextDraft.nombres,
                    apellidoPaterno: updatedUser?.apellidoPaterno ?? nextDraft.apellidoPaterno,
                    apellidoMaterno: updatedUser?.apellidoMaterno ?? nextDraft.apellidoMaterno,
                  },
                }
                : item.matricula,
            };
          }),
        };
      });
      setMessage('Nombre del estudiante actualizado.');
      setError(null);
      cancelEditingStudentName();
    } catch (err) {
      console.error('Error updating student name', err);
      setError('No se pudo actualizar el nombre del estudiante.');
    } finally {
      committingStudentNameRef.current = false;
      setSavingStudentNameId(null);
    }
  }, [
    auth,
    cancelEditingStudentName,
    editingStudentNameId,
    functions,
    grupoModuloId,
    registro,
    studentNameDraft.apellidoMaterno,
    studentNameDraft.apellidoPaterno,
    studentNameDraft.nombres,
  ]);

  const getNotaValue = useCallback(
    (matriculaId: number, indicadorId: number) => parseNota(notas[notaKey(matriculaId, indicadorId)]),
    [notas],
  );

  const getCapacidadAverage = useCallback(
    (matriculaId: number, capacidad: Capacidad) => {
      const indicadores = capacidad.indicadoresCapacidad || [];
      const values = indicadores.map((indicador) => getNotaValue(matriculaId, indicador.id));
      const completeAverage = average(values);
      if (usesOcupacionalRules) {
        return completeAverage === null ? null : roundPromedio(values[values.length - 1]);
      }
      return completeAverage;
    },
    [getNotaValue, usesOcupacionalRules],
  );

  const getUnidadAverage = useCallback(
    (matriculaId: number, unidad: Unidad) =>
      average((unidad.capacidadesTerminales || []).map((capacidad) => getCapacidadAverage(matriculaId, capacidad))),
    [getCapacidadAverage],
  );

  const getEfsrtPppAverage = useCallback(
    (student: Estudiante) => parseNota(efsrtPppNotas[efsrtPppKey(student.id)]),
    [efsrtPppNotas],
  );

  const getModuloAverage = useCallback(
    (student: Estudiante) => {
      const unitGrades = (registro?.estructura || []).map((unidad) => getUnidadAverage(student.matriculaId, unidad));
      if (usesOcupacionalRules) return average(unitGrades);
      return weightedAverage((registro?.estructura || []).map((unidad, index) => ({
        value: unitGrades[index],
        weight: unidad.creditos,
      })));
    },
    [getUnidadAverage, registro, usesOcupacionalRules],
  );

  const getModuloPuntaje = useCallback(
    (student: Estudiante) => {
      const unitGrades = (registro?.estructura || []).map((unidad) => getUnidadAverage(student.matriculaId, unidad));
      if (usesOcupacionalRules) return sumNotas(unitGrades);
      return sumNotas([...unitGrades, getEfsrtPppAverage(student)]);
    },
    [getEfsrtPppAverage, getUnidadAverage, registro, usesOcupacionalRules],
  );

  const buildSelectableColumns = useCallback((units: Unidad[]): SelectableColumn[] => {
    const columns: SelectableColumn[] = [
      { key: 'nro', getValue: (_student, studentIndex) => String(studentIndex + 1) },
      { key: 'codigo', getValue: (student) => student.matricula?.codigoInscripcion || '' },
      { key: 'estudiante', getValue: (student) => getStudentName(student) },
    ];

    for (const unidad of units) {
      for (const capacidad of unidad.capacidadesTerminales || []) {
        for (const indicador of capacidad.indicadoresCapacidad || []) {
          columns.push({
            key: `indicator-${indicador.id}`,
            getValue: (student) => displayGrade(getNotaValue(student.matriculaId, indicador.id)),
          });
        }
      }
      columns.push({
        key: `unidad-${unidad.id}`,
        getValue: (student) => displayGrade(getUnidadAverage(student.matriculaId, unidad)),
      });
    }

    if (showEfsrtPpp) {
      columns.push({
        key: 'efsrt-ppp',
        getValue: (student) => displayGrade(getEfsrtPppAverage(student)),
      });
    }

    columns.push({
      key: 'puntaje',
      getValue: (student) => displayNumber(getModuloPuntaje(student)),
    });
    columns.push({
      key: 'promedio-general',
      getValue: (student) => displayGrade(getModuloAverage(student)),
    });

    return columns;
  }, [
    getUnidadAverage,
    getEfsrtPppAverage,
    getModuloAverage,
    getModuloPuntaje,
    getNotaValue,
    showEfsrtPpp,
  ]);

  const selectableColumns = useMemo(() => buildSelectableColumns(visibleUnits), [buildSelectableColumns, visibleUnits]);

  const selectableColumnIndexByKey = useMemo(
    () => new Map(selectableColumns.map((column, index) => [column.key, index])),
    [selectableColumns],
  );
  const moduleInfoTitleSpan = Math.max(1, selectableColumns.length);
  const moduleInfoLeftValueSpan = Math.max(1, MODULE_INFO_RIGHT_LABEL_COL - MODULE_INFO_LEFT_VALUE_COL);
  const moduleInfoRightValueSpan = Math.max(1, selectableColumns.length - MODULE_INFO_RIGHT_VALUE_COL);

  const headerSpans = useMemo(() => {
    const unidades = new Map<number, { col: number; colSpan: number }>();
    const capacidades = new Map<number, { col: number; colSpan: number }>();
    let col = 3;
    for (const unidad of visibleUnits) {
      const unitStart = col;
      for (const capacidad of unidad.capacidadesTerminales || []) {
        const colSpan = capacidad.indicadoresCapacidad.length;
        capacidades.set(capacidad.id, { col, colSpan });
        col += colSpan;
      }
      col += 1; // One average per unit, outside capacity spans.
      unidades.set(unidad.id, { col: unitStart, colSpan: col - unitStart });
    }
    return { unidades, capacidades };
  }, [visibleUnits]);

  const selectionBounds = useMemo(() => {
    if (!cellSelection) return null;
    return {
      minRow: Math.min(cellSelection.startRow, cellSelection.endRow),
      maxRow: Math.max(cellSelection.startRow, cellSelection.endRow),
      minCol: Math.min(cellSelection.startCol, cellSelection.endCol),
      maxCol: Math.max(cellSelection.startCol, cellSelection.endCol),
    };
  }, [cellSelection]);

  const finishFillDrag = useCallback((cancel = false, restoreSelection = true) => {
    const drag = fillDragRef.current;
    if (!drag) return;
    fillDragRef.current = null;
    if (cancel) {
      applyGradeChanges(drag.preview.map(change => ({ ...change, value: gradeValue(drag.original, change) })), false);
      setCellSelection(restoreSelection ? drag.selection : null);
    } else if (drag.preview.length) {
      gradeHistory.record(gradeEdits(drag.preview, drag.original), undefined, { page: drag.page, cell: drag.preview[0] });
      gradeQueue?.enqueue(drag.preview);
    }
    setFillingCells(false);
    setSelectingCells(false);
    selectionPointerRef.current = null;
    if (restoreSelection) {
      const input = editableCellRefs.current[editableCellKey(drag.bounds.minRow, drag.bounds.minCol)];
      input?.focus({ preventScroll: true });
      input?.select();
    }
  }, [applyGradeChanges, gradeHistory, gradeQueue]);

  useLayoutEffect(() => {
    finishFillDrag(true, false);
  }, [canEditRegistro, finishFillDrag, grupoModuloId, loadingRegistro, registro, unitPage]);

  const updateFillDrag = useCallback((x: number, y: number) => {
    const drag = fillDragRef.current;
    const container = registroScrollRef.current;
    if (!drag || !container || !registro?.estudiantes.length) return;
    if (!drag.moved) {
      if (Math.abs(x - drag.startX) < 4 && Math.abs(y - drag.startY) < 4) return;
      drag.moved = true;
    }
    const viewport = container.getBoundingClientRect();
    const top = Math.max(viewport.top + container.clientTop, registroHeaderRef.current?.getBoundingClientRect().bottom ?? viewport.top);
    const bottom = viewport.top + container.clientTop + container.clientHeight;
    if (bottom <= top) return;
    const pointX = Math.max(viewport.left + container.clientLeft + 1, Math.min(viewport.left + container.clientLeft + container.clientWidth - 1, x - 1));
    let pointY = Math.max(top + 1, Math.min(bottom - 1, y - 1));
    const lastRow = container.querySelector<HTMLElement>(`[data-selection-row="${TABLE_HEADER_ROW_COUNT + registro.estudiantes.length - 1}"][data-selection-col="3"]`);
    if (lastRow) pointY = Math.min(pointY, lastRow.getBoundingClientRect().bottom - 1);
    const cell = document.elementsFromPoint(pointX, pointY)
      .map(element => element.closest<HTMLElement>('[data-selection-row]'))
      .find(element => element && container.contains(element) && Number(element.dataset.selectionRow) >= TABLE_HEADER_ROW_COUNT);
    if (!cell) return;
    const row = Math.min(registro.estudiantes.length - 1, Number(cell.dataset.selectionRow) - TABLE_HEADER_ROW_COUNT);
    const tableCol = Number(cell.dataset.selectionCol);
    let col = x < drag.startX
      ? editableGridColumns.findIndex(column => column.col >= tableCol)
      : editableGridColumns.findLastIndex(column => column.col <= tableCol);
    if (col < 0) col = editableGridColumns.length - 1;
    const outsideRow = row < drag.bounds.minRow || row > drag.bounds.maxRow;
    const outsideCol = col < drag.bounds.minCol || col > drag.bounds.maxCol;
    if (!outsideRow && !outsideCol) drag.axis = null;
    else if (!drag.axis) drag.axis = outsideRow && (!outsideCol || Math.abs(y - drag.startY) >= Math.abs(x - drag.startX)) ? 'row' : 'col';
    const expanded = {
      minRow: drag.axis === 'row' ? Math.min(drag.bounds.minRow, row) : drag.bounds.minRow,
      maxRow: drag.axis === 'row' ? Math.max(drag.bounds.maxRow, row) : drag.bounds.maxRow,
      minCol: drag.axis === 'col' ? Math.min(drag.bounds.minCol, col) : drag.bounds.minCol,
      maxCol: drag.axis === 'col' ? Math.max(drag.bounds.maxCol, col) : drag.bounds.maxCol,
    };
    if (expanded.minRow === drag.expanded.minRow && expanded.maxRow === drag.expanded.maxRow
      && expanded.minCol === drag.expanded.minCol && expanded.maxCol === drag.expanded.maxCol) return;
    const changes = repeatRegistroFill(drag.source, drag.bounds, expanded).map(({ row, col, value }) =>
      gridGradeChange(registro.estudiantes[row], editableGridColumns[col], value),
    ).filter(change => change.value !== gradeValue(drag.original, change));
    const restored = drag.preview.map(change => ({ ...change, value: gradeValue(drag.original, change) }));
    drag.preview = changes;
    drag.expanded = expanded;
    applyGradeChanges([...restored, ...changes], false);
    setCellSelection({
      startRow: expanded.minRow + TABLE_HEADER_ROW_COUNT,
      endRow: expanded.maxRow + TABLE_HEADER_ROW_COUNT,
      startCol: Math.min(drag.selection.startCol, drag.selection.endCol, editableGridColumns[expanded.minCol].col),
      endCol: Math.max(drag.selection.startCol, drag.selection.endCol, editableGridColumns[expanded.maxCol].col),
    });
  }, [applyGradeChanges, editableGridColumns, registro]);

  const startFillDrag = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !canEditRegistro || !registro || !selectionBounds || !cellSelection) return;
    event.preventDefault();
    event.stopPropagation();
    const selectedColumns = editableGridColumns.filter(column => column.col >= selectionBounds.minCol && column.col <= selectionBounds.maxCol);
    if (!selectedColumns.length || selectionBounds.minRow < TABLE_HEADER_ROW_COUNT) return;
    const bounds = {
      minRow: selectionBounds.minRow - TABLE_HEADER_ROW_COUNT,
      maxRow: selectionBounds.maxRow - TABLE_HEADER_ROW_COUNT,
      minCol: selectedColumns[0].index,
      maxCol: selectedColumns[selectedColumns.length - 1].index,
    };
    const original = { notas, efsrtPppNotas };
    const source = Array.from({ length: bounds.maxRow - bounds.minRow + 1 }, (_, row) => selectedColumns.map(column =>
      gradeValue(original, gridGradeChange(registro.estudiantes[bounds.minRow + row], column, null)),
    ));
    gradeHistory.endEdit();
    fillDragRef.current = { page: unitPage, original, selection: cellSelection, source, bounds, expanded: bounds, preview: [],
      startX: event.clientX, startY: event.clientY, moved: false, axis: null };
    selectionPointerRef.current = { x: event.clientX, y: event.clientY };
    setFillingCells(true);
    setSelectingCells(true);
  };

  useEffect(() => {
    if (!fillingCells) return;
    const cursor = document.body.style.cursor;
    document.body.style.cursor = FILL_CURSOR;
    const move = (event: MouseEvent) => { selectionPointerRef.current = { x: event.clientX, y: event.clientY }; };
    const release = (event: MouseEvent) => { updateFillDrag(event.clientX, event.clientY); finishFillDrag(); };
    const cancel = () => finishFillDrag(true);
    const keyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape' || (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') cancel();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', release);
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', keyDown, true);
    return () => {
      document.body.style.cursor = cursor;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', release);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', keyDown, true);
    };
  }, [fillingCells, finishFillDrag, updateFillDrag]);

  useLayoutEffect(() => {
    const handle = fillHandleRef.current;
    const container = registroScrollRef.current;
    const frame = registroFrameRef.current;
    if (!handle || !container || !frame) return;
    handle.style.display = 'none';
    if (!canEditRegistro || !selectionBounds || loadingRegistro || selectingCells && !fillingCells
      || selectionBounds.minRow < TABLE_HEADER_ROW_COUNT
      || !editableGridColumns.some(column => column.col >= selectionBounds.minCol && column.col <= selectionBounds.maxCol)) return;
    let pending: number | null = null;
    const update = () => {
      pending = null;
      const cell = container.querySelector<HTMLElement>(`[data-selection-row="${selectionBounds.maxRow}"][data-selection-col="${selectionBounds.maxCol}"]`);
      if (!cell) { handle.style.display = 'none'; return; }
      const rect = cell.getBoundingClientRect();
      const viewport = container.getBoundingClientRect();
      const headerBottom = registroHeaderRef.current?.getBoundingClientRect().bottom ?? viewport.top;
      const visible = rect.bottom >= Math.max(headerBottom, viewport.top) && rect.bottom <= viewport.top + container.clientHeight
        && rect.right >= viewport.left && rect.right <= viewport.left + container.clientWidth;
      handle.style.display = visible ? 'block' : 'none';
      const origin = frame.getBoundingClientRect();
      handle.style.left = `${rect.right - origin.left - frame.clientLeft}px`;
      handle.style.top = `${rect.bottom - origin.top - frame.clientTop}px`;
    };
    const schedule = () => { if (pending === null) pending = window.requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    const table = container.querySelector('table');
    if (table) observer.observe(table);
    container.addEventListener('scroll', schedule, { passive: true });
    update();
    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', schedule);
      if (pending !== null) window.cancelAnimationFrame(pending);
    };
  }, [canEditRegistro, editableGridColumns, fillingCells, loadingRegistro, selectingCells, selectionBounds]);

  const isCellSelected = useCallback(
    (rowIndex: number, columnIndex: number, rowSpan = 1, colSpan = 1) =>
      Boolean(
        selectionBounds
          && rowIndex <= selectionBounds.maxRow
          && rowIndex + rowSpan - 1 >= selectionBounds.minRow
          && columnIndex <= selectionBounds.maxCol
          && columnIndex + colSpan - 1 >= selectionBounds.minCol,
      ),
    [selectionBounds],
  );

  const selectableCellSx = useCallback(
    (rowIndex: number, columnIndex: number, rowSpan = 1, colSpan = 1) => ({
      cursor: 'cell',
      userSelect: 'none',
      ...(isCellSelected(rowIndex, columnIndex, rowSpan, colSpan)
        ? {
            boxShadow: 'inset 0 0 0 2px #217346',
            outline: '1px solid #217346',
            outlineOffset: '-1px',
          }
        : {}),
    }),
    [isCellSelected],
  );

  const selectableCellProps = useCallback(
    (rowIndex: number, columnIndex: number, rowSpan = 1, colSpan = 1) => ({
      'data-selection-row': rowIndex,
      'data-selection-col': columnIndex,
      'data-selection-rowspan': rowSpan,
      'data-selection-colspan': colSpan,
      onMouseDown: (event: React.MouseEvent<HTMLElement>) => {
        if (fillDragRef.current) return;
        if (columnIndex < 0) return;
        if (event.target instanceof HTMLElement && !event.target.closest('input, textarea, button, select, [contenteditable="true"]')) {
          event.preventDefault();
          registroScrollRef.current?.focus({ preventScroll: true });
        }
        selectionPointerRef.current = { x: event.clientX, y: event.clientY };
        const endRow = rowIndex + rowSpan - 1;
        const endCol = columnIndex + colSpan - 1;
        if (event.shiftKey && cellSelection) {
          setCellSelection({ ...cellSelection, endRow, endCol });
        } else {
          setCellSelection({ startRow: rowIndex, startCol: columnIndex, endRow, endCol });
        }
        setSelectingCells(true);
      },
      onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
        if (fillDragRef.current) return;
        if (!selectingCells || columnIndex < 0) return;
        selectionPointerRef.current = { x: event.clientX, y: event.clientY };
        setCellSelection((current) => (
          current
            ? { ...current, endRow: rowIndex + rowSpan - 1, endCol: columnIndex + colSpan - 1 }
            : current
        ));
      },
    }),
    [cellSelection, selectingCells],
  );

  const handleSelectionMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectingCells) return;
    selectionPointerRef.current = { x: event.clientX, y: event.clientY };
  }, [selectingCells]);

  const clearSelectedGrades = (bounds: NonNullable<typeof selectionBounds>) => {
    if (!canEditRegistro || !registro || loadingRegistro) return;
    const columns = editableGridColumns.filter(column => column.col >= bounds.minCol && column.col <= bounds.maxCol);
    const changes: GradeChange[] = [];
    const firstStudent = Math.max(0, bounds.minRow - TABLE_HEADER_ROW_COUNT);
    const lastStudent = Math.min(registro.estudiantes.length - 1, bounds.maxRow - TABLE_HEADER_ROW_COUNT);
    for (let index = firstStudent; index <= lastStudent; index += 1) {
      for (const column of columns) changes.push(gridGradeChange(registro.estudiantes[index], column, null));
    }
    if (!changes.length) return;
    recordGradeChanges(changes);
    applyGradeChanges(changes);
  };

  const handleSelectionKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    const isGradeInput = target instanceof HTMLInputElement
      && (target.hasAttribute('data-nota-key') || target.hasAttribute('data-efsrt-key'));

    if (target !== event.currentTarget && !isGradeInput) return;

    if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey
      && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      if (!registro || !selectableColumns.length) return;
      const cell = target instanceof HTMLElement ? target.closest<HTMLElement>('[data-selection-row]') : null;
      const current = cellSelection ?? (cell ? {
        startRow: Number(cell.dataset.selectionRow),
        startCol: Number(cell.dataset.selectionCol),
        endRow: Number(cell.dataset.selectionRow),
        endCol: Number(cell.dataset.selectionCol),
      } : null);
      if (!current) return;

      event.preventDefault();
      event.stopPropagation();
      const endRow = Math.max(0, Math.min(
        TABLE_HEADER_ROW_COUNT + registro.estudiantes.length - 1,
        current.endRow + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0),
      ));
      const endCol = Math.max(0, Math.min(
        selectableColumns.length - 1,
        current.endCol + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0),
      ));
      setCellSelection({ ...current, endRow, endCol });
      setSelectingCells(false);
      selectionPointerRef.current = null;

      const endCell = event.currentTarget.querySelector<HTMLElement>(
        `[data-selection-row="${endRow}"][data-selection-col="${endCol}"]`,
      ) ?? Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
        '[data-selection-row]:not([data-selection-rowspan="1"][data-selection-colspan="1"])',
      )).find(element => {
        const row = Number(element.dataset.selectionRow);
        const col = Number(element.dataset.selectionCol);
        return row <= endRow && endRow < row + Number(element.dataset.selectionRowspan)
          && col <= endCol && endCol < col + Number(element.dataset.selectionColspan);
      });
      if (endCell) scrollVisibleCellIntoView(endCell);
      return;
    }

    if (event.key !== 'Delete' || !canEditRegistro || !registro || !selectionBounds) return;
    event.preventDefault();
    clearSelectedGrades(selectionBounds);
  };

  const buildTableCopyRows = useCallback((units: Unidad[], columns: SelectableColumn[]) => {
    if (!registro) return [];
    const headerRows = Array.from({ length: TABLE_HEADER_ONLY_ROW_COUNT }, () => columns.map(() => ''));
    headerRows[0][0] = 'Nro.';
    headerRows[0][1] = 'Codigo';
    headerRows[0][2] = 'Apellidos y Nombres';
    let col = 3;
    for (const unidad of units) {
      headerRows[0][col] = unitLabel(unidad, registro.estructura.indexOf(unidad) + 1);
      for (const capacidad of unidad.capacidadesTerminales || []) {
        if (capacidad.indicadoresCapacidad.length) {
          headerRows[1][col] = curricularLabel(capacidad.competenciaCodigo, capacidad.codigo, capacidad.descripcion);
        }
        for (const indicador of capacidad.indicadoresCapacidad || []) {
          headerRows[2][col++] = curricularLabel(capacidad.codigo, indicador.codigo, indicador.descripcion || indicador.sigla || `C.E. ${indicador.id}`);
        }
      }
      headerRows[1][col++] = 'PROMEDIO UNIDAD';
    }
    if (showEfsrtPpp) headerRows[0][col++] = 'EFSRT/PPP';
    headerRows[0][col++] = 'Puntaje';
    headerRows[0][col] = isProgramaEstudio ? 'Promedio General' : 'Promedio';
    const bodyRows = registro.estudiantes.map((student, studentIndex) =>
      columns.map(column => column.getValue(student, studentIndex)),
    );
    return [...headerRows, ...bodyRows];
  }, [isProgramaEstudio, registro, showEfsrtPpp]);

  const tableCopyMatrix = useMemo(() => {
    if (!registro) return [];
    const width = selectableColumns.length;
    const makeRow = () => Array.from({ length: width }, () => '');
    const setValue = (row: string[], columnIndex: number, value: string) => {
      if (columnIndex >= 0 && columnIndex < width) row[columnIndex] = value;
    };
    const moduleRows = Array.from({ length: MODULE_INFO_ROW_COUNT }, () => makeRow());
    setValue(moduleRows[0], 0, `REGISTRO AUXILIAR DE EVALUACION ${registro.grupo?.semestre?.titulo || ''}`.trim());
    setValue(moduleRows[1], MODULE_INFO_LEFT_LABEL_COL, 'CETPRO');
    setValue(moduleRows[1], MODULE_INFO_LEFT_VALUE_COL, datosGenerales?.nombreInstitucion || 'San Martin De Porres');
    setValue(moduleRows[1], MODULE_INFO_RIGHT_LABEL_COL, 'DOCENTE');
    setValue(moduleRows[1], MODULE_INFO_RIGHT_VALUE_COL, getPersonalName(registro.grupo).toUpperCase());
    setValue(moduleRows[2], MODULE_INFO_LEFT_LABEL_COL, tipoCarreraRegistroLabel);
    setValue(moduleRows[2], MODULE_INFO_LEFT_VALUE_COL, getPlanEstudioName(registro).toUpperCase());
    setValue(moduleRows[2], MODULE_INFO_RIGHT_LABEL_COL, 'INICIO / TERMINO');
    setValue(moduleRows[2], MODULE_INFO_RIGHT_VALUE_COL, [formatDate(registro.grupoModulo?.inicio), formatDate(registro.grupoModulo?.fin)].filter(Boolean).join(' al '));
    setValue(moduleRows[3], MODULE_INFO_LEFT_LABEL_COL, 'MODULO');
    setValue(moduleRows[3], MODULE_INFO_LEFT_VALUE_COL, getModuloName(registro).toUpperCase());
    setValue(moduleRows[3], MODULE_INFO_RIGHT_LABEL_COL, 'TURNO');
    setValue(moduleRows[3], MODULE_INFO_RIGHT_VALUE_COL, getTurnoHorarioName(registro.grupo));
    setValue(moduleRows[4], MODULE_INFO_LEFT_LABEL_COL, 'DURACION');
    setValue(moduleRows[4], MODULE_INFO_LEFT_VALUE_COL, registro.grupoModulo?.modulo?.horas ? `${registro.grupoModulo.modulo.horas} horas` : '');
    setValue(moduleRows[4], MODULE_INFO_RIGHT_LABEL_COL, 'CICLO');
    setValue(moduleRows[4], MODULE_INFO_RIGHT_VALUE_COL, getModuloCiclo(registro).toUpperCase());

    return [...moduleRows, ...buildTableCopyRows(visibleUnits, selectableColumns)];
  }, [
    buildTableCopyRows,
    datosGenerales?.nombreInstitucion,
    registro,
    selectableColumns,
    tipoCarreraRegistroLabel,
    visibleUnits,
  ]);

  const selectedText = useMemo(() => {
    if (!selectionBounds || tableCopyMatrix.length === 0) return '';
    const rows: string[] = [];
    for (let rowIndex = selectionBounds.minRow; rowIndex <= selectionBounds.maxRow; rowIndex += 1) {
      const sourceRow = tableCopyMatrix[rowIndex];
      if (!sourceRow) continue;
      rows.push(sourceRow.slice(selectionBounds.minCol, selectionBounds.maxCol + 1).join('\t'));
    }
    return rows.join('\n');
  }, [selectionBounds, tableCopyMatrix]);

  useEffect(() => {
    const stopSelecting = () => {
      setSelectingCells(false);
      selectionPointerRef.current = null;
    };
    window.addEventListener('mouseup', stopSelecting);
    return () => window.removeEventListener('mouseup', stopSelecting);
  }, []);

  useEffect(() => {
    if (!selectingCells) {
      if (autoScrollFrameRef.current != null) {
        window.cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
      return undefined;
    }

    const step = () => {
      const container = registroScrollRef.current;
      const pointer = selectionPointerRef.current;
      if (container && pointer) {
        const rect = container.getBoundingClientRect();
        const edge = 52;
        const maxSpeed = 22;
        let deltaY = 0;
        let deltaX = 0;

        if (pointer.y > rect.bottom - edge) {
          deltaY = Math.ceil(((pointer.y - (rect.bottom - edge)) / edge) * maxSpeed);
        } else if (pointer.y < rect.top + edge) {
          deltaY = -Math.ceil((((rect.top + edge) - pointer.y) / edge) * maxSpeed);
        }

        if (pointer.x > rect.right - edge) {
          deltaX = Math.ceil(((pointer.x - (rect.right - edge)) / edge) * maxSpeed);
        } else if (pointer.x < rect.left + edge) {
          deltaX = -Math.ceil((((rect.left + edge) - pointer.x) / edge) * maxSpeed);
        }

        const drag = fillDragRef.current;
        if (drag) {
          if (!drag.axis || drag.axis === 'col') deltaY = 0;
          if (!drag.axis || drag.axis === 'row') deltaX = 0;
        }
        if (deltaY !== 0 || deltaX !== 0) {
          container.scrollBy({ top: deltaY, left: deltaX });
        }
        if (fillDragRef.current) updateFillDrag(pointer.x, pointer.y);
      }
      autoScrollFrameRef.current = window.requestAnimationFrame(step);
    };

    autoScrollFrameRef.current = window.requestAnimationFrame(step);
    return () => {
      if (autoScrollFrameRef.current != null) {
        window.cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
    };
  }, [selectingCells, updateFillDrag]);

  useEffect(() => {
    const handleCopy = (event: ClipboardEvent) => {
      if (!selectedText) return;
      event.preventDefault();
      event.clipboardData?.setData('text/plain', selectedText);
    };
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [selectedText]);

  const handleCut = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const target = event.target;
    const isGradeInput = target instanceof HTMLInputElement
      && (target.hasAttribute('data-nota-key') || target.hasAttribute('data-efsrt-key'));
    if (target !== event.currentTarget && !isGradeInput) return;
    event.preventDefault();
    if (!canEditRegistro || !registro || loadingRegistro || !event.clipboardData) return;
    const cell = target instanceof HTMLElement ? target.closest<HTMLElement>('[data-selection-row]') : null;
    const row = cell ? Number(cell.dataset.selectionRow) : null;
    const col = cell ? Number(cell.dataset.selectionCol) : null;
    const bounds = selectionBounds ?? (row != null && col != null
      ? { minRow: row, maxRow: row, minCol: col, maxCol: col } : null);
    if (!bounds) return;
    const text = selectionBounds ? selectedText : tableCopyMatrix[bounds.minRow]?.[bounds.minCol] ?? '';
    event.clipboardData.setData('text/plain', text);
    event.clipboardData.setData(REGISTRO_CUT_CLIPBOARD_TYPE, crypto.randomUUID());
    clearSelectedGrades(bounds);
  };

  const updateNota = (matriculaId: number, indicadorId: number, value: string) => {
    if (!canEditRegistro) return;
    const cleaned = value.replace(',', '.');
    if (cleaned !== '' && !/^\d{0,2}(\.\d{0,2})?$/.test(cleaned)) return;
    const numeric = parseNota(cleaned);
    if (cleaned !== '' && Number(cleaned) > 20) return;
    const change: GradeChange = { kind: 'nota', matriculaId, indicadorCapacidadId: indicadorId, value: numeric };
    recordGradeChanges([change], gradeChangeKey(change));
    setNotas((prev) => ({ ...prev, [notaKey(matriculaId, indicadorId)]: cleaned }));
    if (cleaned === '' || Number.isFinite(Number(cleaned))) queueGrades([change]);
  };

  const formatNota = (matriculaId: number, indicadorId: number) => {
    gradeHistory.endEdit();
    if (notas[notaKey(matriculaId, indicadorId)] === '.') queueGrades([{ kind: 'nota', matriculaId, indicadorCapacidadId: indicadorId, value: null }]);
    flushGrades();
    setNotas((prev) => {
      const key = notaKey(matriculaId, indicadorId);
      const nota = parseNota(prev[key]);
      return { ...prev, [key]: nota == null ? '' : displayGrade(nota) };
    });
  };

  const updateEfsrtPppNota = (moduloEstudianteId: number, value: string) => {
    if (!canEditRegistro) return;
    const cleaned = value.replace(',', '.');
    if (cleaned !== '' && !/^\d{0,2}(\.\d{0,2})?$/.test(cleaned)) return;
    const numeric = parseNota(cleaned);
    if (cleaned !== '' && Number(cleaned) > 20) return;
    const change: GradeChange = { kind: 'efsrt', moduloEstudianteId, value: numeric };
    recordGradeChanges([change], gradeChangeKey(change));
    setEfsrtPppNotas((prev) => ({ ...prev, [efsrtPppKey(moduloEstudianteId)]: cleaned }));
    if (cleaned === '' || Number.isFinite(Number(cleaned))) queueGrades([change]);
  };

  const formatEfsrtPppNota = (moduloEstudianteId: number) => {
    gradeHistory.endEdit();
    if (efsrtPppNotas[efsrtPppKey(moduloEstudianteId)] === '.') queueGrades([{ kind: 'efsrt', moduloEstudianteId, value: null }]);
    flushGrades();
    setEfsrtPppNotas((prev) => {
      const key = efsrtPppKey(moduloEstudianteId);
      const nota = parseNota(prev[key]);
      return { ...prev, [key]: nota == null ? '' : displayGrade(nota) };
    });
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const target = event.target;
    const isGradeInput = target instanceof HTMLInputElement
      && (target.hasAttribute('data-nota-key') || target.hasAttribute('data-efsrt-key'));
    if (target !== event.currentTarget && !isGradeInput) return;
    event.preventDefault();
    if (!canEditRegistro || !registro || loadingRegistro) return;

    const cutId = event.clipboardData.getData(REGISTRO_CUT_CLIPBOARD_TYPE);
    if (cutId && consumedCutIds.has(cutId)) return;
    const text = event.clipboardData.getData('text/plain');
    if (text === '' && !event.clipboardData.types.includes('text/plain')) return;
    const rows = text.replace(/\r\n?/g, '\n').split('\n');
    if (rows.length > 1 && rows.at(-1) === '') rows.pop();
    const source = rows.map(row => row.split('\t'));
    const sourceWidth = source.reduce((width, row) => Math.max(width, row.length), 0);
    const columns = editableGridColumns;

    const cell = target instanceof HTMLElement ? target.closest<HTMLElement>('[data-selection-row]') : null;
    const row = cell ? Number(cell.dataset.selectionRow) : selectionBounds?.minRow;
    const col = cell ? Number(cell.dataset.selectionCol) : selectionBounds?.minCol;
    if (row == null || col == null) return;
    const fillSelection = selectionBounds
      && (selectionBounds.minRow !== selectionBounds.maxRow || selectionBounds.minCol !== selectionBounds.maxCol)
      && row >= selectionBounds.minRow && row <= selectionBounds.maxRow
      && col >= selectionBounds.minCol && col <= selectionBounds.maxCol;
    const firstRow = Math.max(0, (fillSelection ? selectionBounds.minRow : row) - TABLE_HEADER_ROW_COUNT);
    const lastRow = Math.min(registro.estudiantes.length - 1, fillSelection
      ? selectionBounds.maxRow - TABLE_HEADER_ROW_COUNT : firstRow + source.length - 1);
    const firstColumn = columns.findIndex(column => column.col === col);
    const targetColumns = fillSelection
      ? columns.filter(column => column.col >= selectionBounds.minCol && column.col <= selectionBounds.maxCol)
      : firstColumn < 0 ? [] : columns.slice(firstColumn, firstColumn + sourceWidth);
    if (!targetColumns.length || firstRow > lastRow) return;

    const changes: GradeChange[] = [];
    for (let studentIndex = firstRow; studentIndex <= lastRow; studentIndex += 1) {
      const student = registro.estudiantes[studentIndex];
      const sourceRow = source[(studentIndex - firstRow) % source.length];
      targetColumns.forEach((column, offset) => {
        const value = sourceRow[offset % sourceWidth] ?? '';
        const numeric = Number(value.trim().replace(',', '.'));
        if (value.trim() !== '' && (!Number.isFinite(numeric) || numeric < 0 || numeric > 20)) return;
        const nota = parseNota(value);
        changes.push(gridGradeChange(student, column, nota));
      });
    }
    if (!changes.length) return;
    if (cutId) consumedCutIds.add(cutId);
    recordGradeChanges(changes);
    applyGradeChanges(changes);
    setCellSelection({
      startRow: firstRow + TABLE_HEADER_ROW_COUNT,
      startCol: targetColumns[0].col,
      endRow: lastRow + TABLE_HEADER_ROW_COUNT,
      endCol: targetColumns[targetColumns.length - 1].col,
    });
    setSelectingCells(false);
    selectionPointerRef.current = null;
    focusEditableCell(firstRow, targetColumns[0].index);
  };

  const handleCopyNotas = async () => {
    if (!registro) return;
    const columns = buildSelectableColumns(registro.estructura);
    const rows = buildTableCopyRows(registro.estructura, columns);
    await navigator.clipboard.writeText(rows.map(row => row.join('\t')).join('\n'));
    setMessage('Matriz copiada al portapapeles.');
  };

  const handleOpenPrintView = () => {
    if (!registro || !grupoModuloId) return;
    window.open(`/intranet/registro-auxiliar/imprimir?grupoModuloId=${encodeURIComponent(grupoModuloId)}`, '_blank', 'noopener,noreferrer');
  };

  const handleCreateMatricula = async () => {
    const dni = newMatriculaDni.replace(/\D/g, '');
    if (!canCreateRegistroMatriculas || creatingMatriculaRef.current || !registro?.grupoModulo?.id || !dni) return;
    if (!/^\d{8}$/.test(dni)) {
      setError('Ingresa un DNI valido de 8 digitos.');
      return;
    }

    creatingMatriculaRef.current = true;
    setCreatingMatricula(true);
    setError(null);
    setMessage(null);
    try {
      const createRegistroAuxiliarMatricula = httpsCallable<
        { grupoModuloId: number; dni: string },
        { matriculaId: number; moduloEstudianteId: number; dni: string; estudiante: Estudiante }
      >(functions, 'createRegistroAuxiliarMatricula');
      const result = await createRegistroAuxiliarMatricula({
        grupoModuloId: registro.grupoModulo.id,
        dni,
      });
      if (!result.data.estudiante?.id) throw new Error('No se pudo leer el estudiante matriculado.');
      setRegistro(current => {
        if (!current || current.grupoModulo?.id !== registro.grupoModulo?.id
          || current.estudiantes.some(student => student.id === result.data.estudiante.id)) return current;
        const estudiantes = [...current.estudiantes, result.data.estudiante].sort((a, b) => {
          const aUser = a.matricula?.user;
          const bUser = b.matricula?.user;
          const aName = `${aUser?.apellidoPaterno ?? ''} ${aUser?.apellidoMaterno ?? ''} ${aUser?.nombre ?? ''}`.trim();
          const bName = `${bUser?.apellidoPaterno ?? ''} ${bUser?.apellidoMaterno ?? ''} ${bUser?.nombre ?? ''}`.trim();
          return aName.localeCompare(bName, 'es', { numeric: true }) || a.matriculaId - b.matriculaId;
        });
        return { ...current, estudiantes };
      });
      setMessage('Matricula creada y agregada al registro.');
      invalidateMatriculaLists();
      setEditingNewMatricula(false);
      setNewMatriculaDni('');
    } catch (err) {
      console.error('Error creating registro auxiliar matricula', err);
      const message = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message?: unknown }).message || '')
        : '';
      setError(message || 'No se pudo crear la matricula.');
    } finally {
      creatingMatriculaRef.current = false;
      setCreatingMatricula(false);
    }
  };

  const handleRetireMatricula = async (student: Estudiante) => {
    if (!registro?.grupoModulo?.id || retiringModuloEstudianteId !== null) return;
    const studentName = getStudentName(student);
    const confirmed = window.confirm(
      `¿Retirar a ${studentName} de este grupo-módulo? Sus inscripciones en los demás módulos se conservarán.`,
    );
    if (!confirmed) return;

    setRetiringModuloEstudianteId(student.id);
    setError(null);
    setMessage(null);
    try {
      const retireRegistroAuxiliarMatricula = httpsCallable<
        { grupoModuloId: number; moduloEstudianteId: number },
        { matriculaId: number; userBlocked: boolean }
      >(functions, 'retireRegistroAuxiliarMatricula');
      await retireRegistroAuxiliarMatricula({
        grupoModuloId: registro.grupoModulo.id,
        moduloEstudianteId: student.id,
      });
      invalidateMatriculaLists();
      setMessage('Estudiante retirado de este grupo-módulo.');
      gradeQueue?.discardStudent(student.matriculaId, student.id);
      gradeHistory.clear();
      setRegistro(current => current && current.grupoModulo?.id === registro.grupoModulo?.id
        ? { ...current, estudiantes: current.estudiantes.filter(row => row.id !== student.id) } : current);
    } catch (err) {
      console.error('Error retiring registro auxiliar matricula', err);
      const message = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message?: unknown }).message || '')
        : '';
      setError(message || 'No se pudo retirar la inscripción del módulo.');
    } finally {
      setRetiringModuloEstudianteId(null);
    }
  };

  const startModuloFechasEdit = () => {
    if (!registro?.grupoModulo) return;
    setFechaInicioModulo(formatDateInput(registro.grupoModulo.inicio));
    setFechaFinModulo(formatDateInput(registro.grupoModulo.fin));
    setEditingModuloFechas(true);
  };

  const cancelModuloFechasEdit = () => {
    setEditingModuloFechas(false);
    setFechaInicioModulo('');
    setFechaFinModulo('');
  };

  const saveModuloFechas = async () => {
    if (!registro?.grupoModulo?.id) return;
    setSavingModuloFechas(true);
    setError(null);
    setMessage(null);
    try {
      const updateRegistroAuxiliarGrupoModuloFechas = httpsCallable<
        { grupoModuloId: number; inicio: string | null; fin: string | null },
        { grupoModuloId: number; inicio: string | null; fin: string | null }
      >(functions, 'updateRegistroAuxiliarGrupoModuloFechas');
      const result = await updateRegistroAuxiliarGrupoModuloFechas({
        grupoModuloId: registro.grupoModulo.id,
        inicio: fechaInicioModulo || null,
        fin: fechaFinModulo || null,
      });
      const editedGrupoModuloId = registro.grupoModulo.id;
      setRegistro((current) => {
        if (!current || current.grupoModulo?.id !== editedGrupoModuloId) return current;
        return {
          ...current,
          grupoModulo: {
            ...current.grupoModulo,
            inicio: result.data.inicio,
            fin: result.data.fin,
          },
        };
      });
      setEditingModuloFechas(false);
      setMessage('Fechas del modulo actualizadas.');
    } catch (err) {
      console.error('Error saving registro auxiliar module dates', err);
      setError('No se pudieron guardar las fechas del modulo.');
    } finally {
      setSavingModuloFechas(false);
    }
  };

  const cellBaseSx = {
    border: '1px solid #2d2d2d',
    px: 0.5,
    py: 0.35,
    fontSize: 11,
    lineHeight: 1.2,
  };

  const capacidadLabelSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    fontSize: 10,
    fontWeight: 400,
    lineHeight: 1.2,
    textAlign: 'center',
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
  };

  const criterioLabelSx = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 164,
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    lineHeight: 1.2,
    fontSize: 10,
    fontWeight: 400,
    textAlign: 'center',
    transform: 'translate(-50%, -50%) rotate(-90deg)',
    transformOrigin: 'center center',
  };

  const selectMenuProps = {
    disableScrollLock: true,
    PaperProps: {
      sx: {
        maxHeight: 360,
      },
    },
  };

  const stopScrollChaining = (event: React.WheelEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (target.scrollHeight <= target.clientHeight) return;

    const atTop = target.scrollTop <= 0;
    const atBottom = Math.ceil(target.scrollTop + target.clientHeight) >= target.scrollHeight;
    if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
      event.preventDefault();
    }
  };

  return (
    <Box sx={{ overflowAnchor: 'none' }}>
      <IntranetDocumentTitle title={registroTitle} />
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        alignItems="center"
        sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' }, mb: 0, pb: '5px', rowGap: 0.5 }}
      >
        <Box sx={{ flex: isDocente ? '0 0 100px' : { xs: '1 1 180px', md: '0 1 auto' }, minWidth: 0, ...(isDocente ? { width: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignSelf: 'stretch', minHeight: 32 } : {}) }}>
          <Typography component="h1" variant="h6" sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.1, m: 0, overflowWrap: 'anywhere' }}>
            {isDocente ? 'RAE' : registroTitle}
          </Typography>
          {canEditRegistro && registro && !gradeSaveStatus.error && <Typography variant="caption" color="text.secondary" role="status" aria-live="polite" sx={{ display: 'block', m: 0, lineHeight: 1 }}>
            {gradeSaveStatus.saving || gradeSaveStatus.pending > 0 ? 'Guardando…' : 'Listo'}
          </Typography>}
        </Box>
        {docenteReadOnly && <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: { md: 'nowrap' } }}>(Modulo Finalizado)</Typography>}
        {(!isDirectRegistro || isDocente) && (
          <>
            <Stack direction="row" spacing={1} sx={{ flex: isDirectRegistro ? '0 0 auto' : { xs: isDocente ? '1 1 240px' : '1 1 300px', md: '1 1 0' }, maxWidth: { xs: 778, md: 'none' }, minWidth: 0 }}>
              <FormControl size="small" sx={{ width: 100, minWidth: 100, flexShrink: 0 }} disabled={isDocente || !semestreOptions.length}>
                <InputLabel id="registro-semestre-label">Semestre</InputLabel>
                <Select
                  labelId="registro-semestre-label"
                  label="Semestre"
                  value={isDocente ? String(settings.general.semestreActualId ?? '') : semestreId}
                  MenuProps={selectMenuProps}
                  onChange={(event) => {
                    setSemestreId(String(event.target.value));
                    setGrupoModuloId('');
                  }}
                >
                  {semestreId && !semestreOptions.some((item) => String(item.id) === semestreId) ? (
                    <MenuItem value={semestreId}>Semestre {semestreId}</MenuItem>
                  ) : null}
                  {semestreOptions.map((semestre) => (
                    <MenuItem key={semestre.id} value={String(semestre.id)}>
                      {semestre.titulo || `Semestre ${semestre.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {!isDirectRegistro && <FormControl size="small" sx={{ flex: 1, minWidth: 0 }} disabled={loadingOptions || !filteredGrupoModuloOptions.length}>
                <InputLabel id="registro-modulo-label">Modulo</InputLabel>
                <Select
                  labelId="registro-modulo-label"
                  label="Modulo"
                  value={grupoModuloId}
                  MenuProps={selectMenuProps}
                  onChange={(event) => setGrupoModuloId(String(event.target.value))}
                >
                  {filteredGrupoModuloOptions.map((grupoModulo) => (
                    <MenuItem key={grupoModulo.id} value={String(grupoModulo.id)}>
                      {getGrupoModuloLabel(grupoModulo)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>}
            </Stack>
          </>
        )}
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" sx={{ flexShrink: 0, ml: 'auto' }}>
          <Tooltip title="Copiar">
            <span>
              <IconButton color="primary" onClick={handleCopyNotas} disabled={!registro}>
                <ContentCopyIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Vista previa">
            <span>
              <IconButton aria-label="Vista previa de impresion" color="primary" onClick={handleOpenPrintView} disabled={!registro}>
                <SearchIcon />
              </IconButton>
            </span>
          </Tooltip>
          {canEditRegistro && registro && (gradeSaveStatus.error || !gradeSaveStatus.backedUp) && <Stack direction="row" alignItems="center" spacing={0.75} role="alert">
            <Typography variant="caption" color="error">
              {gradeSaveStatus.error || 'Respaldo local no disponible.'}
            </Typography>
            {gradeSaveStatus.error && <Button size="small" onClick={flushGrades}>Reintentar</Button>}
          </Stack>}
        </Stack>
      </Stack>

      {error && <AutoDismissAlert severity="error" sx={{ mb: 1.5 }}>{error}</AutoDismissAlert>}
      <AutoDismissAlert message={message} severity="success" sx={{ mb: 1.5 }} />

      <Paper
        ref={registroFrameRef}
        sx={{
          position: 'relative',
          ...(fillingCells ? { '&, & *': { cursor: FILL_CURSOR } } : {}),
          display: 'flex',
          flexDirection: 'column',
          height: 'var(--registro-frame-height, 550px)',
          minHeight: 'min(550px, var(--registro-frame-height, 550px))',
          maxHeight: 'var(--registro-frame-height, 550px)',
          overflow: 'hidden',
          borderRadius: 1,
          border: '1px solid #2d2d2d',
        }}
      >
        <Box
          ref={registroScrollRef}
          tabIndex={-1}
          onKeyDownCapture={handleSelectionKeyDown}
          onCutCapture={handleCut}
          onPasteCapture={handlePaste}
          onWheelCapture={stopScrollChaining}
          onMouseMove={handleSelectionMouseMove}
          sx={{
            overflow: 'auto',
            flex: 1,
            minHeight: 0,
            bgcolor: '#fff',
            overscrollBehavior: 'contain',
            overscrollBehaviorX: 'contain',
            overscrollBehaviorY: 'contain',
          }}
        >
          {loadingRegistro ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : registro ? (
            <Box sx={{ minWidth: columnLayout.tableWidth }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '137px minmax(0, 1.02fr) 115px minmax(0, 0.82fr)',
                  borderBottom: '1px solid #2d2d2d',
                  bgcolor: '#fff',
                }}
              >
                <Box
                  {...selectableCellProps(0, 0, 1, moduleInfoTitleSpan)}
                  sx={{
                    gridColumn: '1 / -1',
                    ...selectableCellSx(0, 0, 1, moduleInfoTitleSpan),
                    textAlign: 'center',
                    fontWeight: 900,
                    fontSize: 16,
                    py: 0.4,
                  }}
                >
                  {`REGISTRO AUXILIAR DE EVALUACION ${registro.grupo?.semestre?.titulo || ''}`.trim()}
                </Box>
                <Box
                  {...selectableCellProps(1, MODULE_INFO_LEFT_LABEL_COL)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(1, MODULE_INFO_LEFT_LABEL_COL), fontWeight: 800 }}
                >
                  CETPRO
                </Box>
                <Box
                  {...selectableCellProps(1, MODULE_INFO_LEFT_VALUE_COL, 1, moduleInfoLeftValueSpan)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(1, MODULE_INFO_LEFT_VALUE_COL, 1, moduleInfoLeftValueSpan) }}
                >
                  {datosGenerales?.nombreInstitucion || 'San Martin De Porres'}
                </Box>
                <Box
                  {...selectableCellProps(1, MODULE_INFO_RIGHT_LABEL_COL)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(1, MODULE_INFO_RIGHT_LABEL_COL), fontWeight: 800 }}
                >
                  DOCENTE
                </Box>
                <Box
                  {...selectableCellProps(1, MODULE_INFO_RIGHT_VALUE_COL, 1, moduleInfoRightValueSpan)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(1, MODULE_INFO_RIGHT_VALUE_COL, 1, moduleInfoRightValueSpan) }}
                >
                  {getPersonalName(registro.grupo).toUpperCase()}
                </Box>
                <Box
                  {...selectableCellProps(2, MODULE_INFO_LEFT_LABEL_COL)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(2, MODULE_INFO_LEFT_LABEL_COL), fontWeight: 800, whiteSpace: 'nowrap' }}
                >
                  {tipoCarreraRegistroLabel}
                </Box>
                <Box
                  {...selectableCellProps(2, MODULE_INFO_LEFT_VALUE_COL, 1, moduleInfoLeftValueSpan)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(2, MODULE_INFO_LEFT_VALUE_COL, 1, moduleInfoLeftValueSpan) }}
                >
                  {getPlanEstudioName(registro).toUpperCase()}
                </Box>
                <Box
                  {...selectableCellProps(2, MODULE_INFO_RIGHT_LABEL_COL)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(2, MODULE_INFO_RIGHT_LABEL_COL), fontWeight: 800, whiteSpace: 'nowrap' }}
                >
                  INICIO / TERMINO
                </Box>
                <Box
                  {...selectableCellProps(2, MODULE_INFO_RIGHT_VALUE_COL, 1, moduleInfoRightValueSpan)}
                  onDoubleClick={canEditModuloFechas ? startModuloFechasEdit : undefined}
                  title={canEditModuloFechas ? 'Doble clic para editar las fechas del modulo' : undefined}
                  sx={{
                    ...cellBaseSx,
                    ...selectableCellSx(2, MODULE_INFO_RIGHT_VALUE_COL, 1, moduleInfoRightValueSpan),
                    cursor: canEditModuloFechas ? 'text' : 'cell',
                    ...(editingModuloFechas ? { minHeight: 42 } : {}),
                  }}
                >
                  {editingModuloFechas ? (
                    <Stack direction="row" spacing={0.5} alignItems="center" useFlexGap flexWrap="wrap" onMouseDown={(event) => event.stopPropagation()}>
                      <Box
                        component="input"
                        type="date"
                        value={fechaInicioModulo}
                        onChange={(event) => setFechaInicioModulo(event.target.value)}
                        sx={{ width: 118, fontSize: 11, px: 0.5, py: 0.25 }}
                      />
                      <Box sx={{ fontSize: 11 }}>al</Box>
                      <Box
                        component="input"
                        type="date"
                        value={fechaFinModulo}
                        onChange={(event) => setFechaFinModulo(event.target.value)}
                        sx={{ width: 118, fontSize: 11, px: 0.5, py: 0.25 }}
                      />
                      <Button size="small" variant="contained" onClick={saveModuloFechas} disabled={savingModuloFechas} sx={{ minWidth: 48, py: 0 }}>
                        {savingModuloFechas ? '...' : 'OK'}
                      </Button>
                      <Button size="small" variant="text" onClick={cancelModuloFechasEdit} disabled={savingModuloFechas} sx={{ minWidth: 62, py: 0 }}>
                        Cancelar
                      </Button>
                    </Stack>
                  ) : (
                    [formatDate(registro.grupoModulo?.inicio), formatDate(registro.grupoModulo?.fin)].filter(Boolean).join(' al ')
                  )}
                </Box>
                <Box
                  {...selectableCellProps(3, MODULE_INFO_LEFT_LABEL_COL)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(3, MODULE_INFO_LEFT_LABEL_COL), fontWeight: 800 }}
                >
                  MODULO
                </Box>
                <Box
                  {...selectableCellProps(3, MODULE_INFO_LEFT_VALUE_COL, 1, moduleInfoLeftValueSpan)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(3, MODULE_INFO_LEFT_VALUE_COL, 1, moduleInfoLeftValueSpan) }}
                >
                  {getModuloName(registro).toUpperCase()}
                </Box>
                <Box
                  {...selectableCellProps(3, MODULE_INFO_RIGHT_LABEL_COL)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(3, MODULE_INFO_RIGHT_LABEL_COL), fontWeight: 800 }}
                >
                  TURNO
                </Box>
                <Box
                  {...selectableCellProps(3, MODULE_INFO_RIGHT_VALUE_COL, 1, moduleInfoRightValueSpan)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(3, MODULE_INFO_RIGHT_VALUE_COL, 1, moduleInfoRightValueSpan) }}
                >
                  {getTurnoHorarioName(registro.grupo)}
                </Box>
                <Box
                  {...selectableCellProps(4, MODULE_INFO_LEFT_LABEL_COL)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(4, MODULE_INFO_LEFT_LABEL_COL), fontWeight: 800 }}
                >
                  DURACION
                </Box>
                <Box
                  {...selectableCellProps(4, MODULE_INFO_LEFT_VALUE_COL, 1, moduleInfoLeftValueSpan)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(4, MODULE_INFO_LEFT_VALUE_COL, 1, moduleInfoLeftValueSpan) }}
                >
                  {registro.grupoModulo?.modulo?.horas ? `${registro.grupoModulo.modulo.horas} horas` : ''}
                </Box>
                <Box
                  {...selectableCellProps(4, MODULE_INFO_RIGHT_LABEL_COL)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(4, MODULE_INFO_RIGHT_LABEL_COL), fontWeight: 800 }}
                >
                  CICLO
                </Box>
                <Box
                  {...selectableCellProps(4, MODULE_INFO_RIGHT_VALUE_COL, 1, moduleInfoRightValueSpan)}
                  sx={{ ...cellBaseSx, ...selectableCellSx(4, MODULE_INFO_RIGHT_VALUE_COL, 1, moduleInfoRightValueSpan) }}
                >
                  {getModuloCiclo(registro).toUpperCase()}
                </Box>
              </Box>

              <Box component="table" sx={{ width: columnLayout.tableWidth, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 34 }} />
                  <col style={{ width: 105 }} />
                  <col style={{ width: 275 }} />
                  {visibleUnits.flatMap(unit => [
                    ...unit.capacidadesTerminales.flatMap(capacity => capacity.indicadoresCapacidad.map(indicator => <col key={`indicator-${indicator.id}`} style={{ width: columnLayout.indicatorWidths[indicator.id] }} />)),
                    <col key={`average-unit-${unit.id}`} style={{ width: columnLayout.averageWidth }} />,
                  ])}
                  {showEfsrtPpp && <col style={{ width: SUMMARY_COLUMN_WIDTH }} />}
                  <col style={{ width: SUMMARY_COLUMN_WIDTH }} />
                  <col style={{ width: SUMMARY_COLUMN_WIDTH }} />
                </colgroup>
                <Box component="thead" ref={registroHeaderRef} sx={{ position: 'sticky', top: 0, zIndex: 3 }}>
                  <Box component="tr">
                    <Box
                      component="th"
                      rowSpan={3}
                      {...selectableCellProps(TABLE_HEADER_ROW_START, 0, 3, 1)}
                      sx={{ ...cellBaseSx, ...selectableCellSx(TABLE_HEADER_ROW_START, 0, 3, 1), bgcolor: '#dbeaf7', width: 34 }}
                    >
                      Nro.
                    </Box>
                    <Box
                      component="th"
                      rowSpan={3}
                      {...selectableCellProps(TABLE_HEADER_ROW_START, 1, 3, 1)}
                      sx={{ ...cellBaseSx, ...selectableCellSx(TABLE_HEADER_ROW_START, 1, 3, 1), bgcolor: '#dbeaf7', width: 105 }}
                    >
                      Codigo
                    </Box>
                    <Box
                      component="th"
                      rowSpan={3}
                      {...selectableCellProps(TABLE_HEADER_ROW_START, 2, 3, 1)}
                      sx={{ ...cellBaseSx, ...selectableCellSx(TABLE_HEADER_ROW_START, 2, 3, 1), bgcolor: '#dbeaf7', width: 275 }}
                    >
                      <Stack spacing={0.75} alignItems="center">
                        <Box>Apellidos y Nombres</Box>
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <Tooltip title="Unidades anteriores">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => setUnitPage((current) => Math.max(0, current - 1))}
                                disabled={unitPage <= 0}
                                sx={{ width: 26, height: 26, bgcolor: '#fff', border: '1px solid #8aa7c2' }}
                              >
                                <ChevronLeftIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Box sx={{ minWidth: 58, fontSize: 10, fontWeight: 800 }}>
                            {Math.min(unitPage * UNITS_PER_PAGE + 1, registro.estructura.length)}-
                            {Math.min((unitPage + 1) * UNITS_PER_PAGE, registro.estructura.length)} / {registro.estructura.length}
                          </Box>
                          <Tooltip title="Unidades siguientes">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => setUnitPage((current) => Math.min(unitPageCount - 1, current + 1))}
                                disabled={unitPage >= unitPageCount - 1}
                                sx={{ width: 26, height: 26, bgcolor: '#fff', border: '1px solid #8aa7c2' }}
                              >
                                <ChevronRightIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Box>
                    {visibleUnits.map((unidad) => {
                      const span = headerSpans.unidades.get(unidad.id) ?? { col: -1, colSpan: 1 };
                      const colSpan = unidad.capacidadesTerminales.reduce(
                        (sum, capacidad) => sum + capacidad.indicadoresCapacidad.length,
                        1,
                      );
                      return (
                        <Box
                          key={unidad.id}
                          component="th"
                          colSpan={colSpan}
                          {...selectableCellProps(TABLE_HEADER_ROW_START, span.col, 1, span.colSpan)}
                          sx={{ ...cellBaseSx, ...selectableCellSx(TABLE_HEADER_ROW_START, span.col, 1, span.colSpan), bgcolor: '#eef6ff', height: 30 }}
                        >
                          {unitLabel(unidad, registro.estructura.indexOf(unidad) + 1)}
                        </Box>
                      );
                    })}
                    {showEfsrtPpp ? (
                      <Box
                        component="th"
                        rowSpan={3}
                        {...selectableCellProps(TABLE_HEADER_ROW_START, selectableColumnIndexByKey.get('efsrt-ppp') ?? -1, 3, 1)}
                        sx={{
                          ...cellBaseSx,
                          ...selectableCellSx(TABLE_HEADER_ROW_START, selectableColumnIndexByKey.get('efsrt-ppp') ?? -1, 3, 1),
                          bgcolor: '#fff',
                          width: SUMMARY_COLUMN_WIDTH,
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)',
                        }}
                      >
                        EFSRT/PPP
                      </Box>
                    ) : null}
                    <Box
                      component="th"
                      rowSpan={3}
                      {...selectableCellProps(TABLE_HEADER_ROW_START, selectableColumnIndexByKey.get('puntaje') ?? -1, 3, 1)}
                      sx={{
                        ...cellBaseSx,
                        ...selectableCellSx(TABLE_HEADER_ROW_START, selectableColumnIndexByKey.get('puntaje') ?? -1, 3, 1),
                        bgcolor: '#c6e0b4',
                        width: SUMMARY_COLUMN_WIDTH,
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                      }}
                    >
                      Puntaje
                    </Box>
                    <Box
                      component="th"
                      rowSpan={3}
                      {...selectableCellProps(TABLE_HEADER_ROW_START, selectableColumnIndexByKey.get('promedio-general') ?? -1, 3, 1)}
                      sx={{
                        ...cellBaseSx,
                        ...selectableCellSx(TABLE_HEADER_ROW_START, selectableColumnIndexByKey.get('promedio-general') ?? -1, 3, 1),
                        bgcolor: '#c6e0b4',
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                      }}
                    >
                      {isProgramaEstudio ? 'Promedio General' : 'Promedio'}
                    </Box>
                  </Box>
                  <Box component="tr">
                    {visibleUnits.flatMap((unidad) =>
                      [...unidad.capacidadesTerminales.filter(capacidad => capacidad.indicadoresCapacidad.length > 0).map((capacidad) => {
                        const span = headerSpans.capacidades.get(capacidad.id) ?? { col: -1, colSpan: 1 };
                        return (
                          <Box
                            key={capacidad.id}
                            component="th"
                            colSpan={capacidad.indicadoresCapacidad.length}
                            {...selectableCellProps(TABLE_HEADER_ROW_START + 1, span.col, 1, span.colSpan)}
                            sx={{ ...cellBaseSx, ...selectableCellSx(TABLE_HEADER_ROW_START + 1, span.col, 1, span.colSpan), bgcolor: '#fff', height: 64, verticalAlign: 'middle', p: 0 }}
                          >
                            <Box data-registro-capacity-label={capacidad.id} title={curricularLabel(capacidad.competenciaCodigo, capacidad.codigo, capacidad.descripcion)} sx={capacidadLabelSx}>
                              <span style={{ minWidth: 0 }}><strong>{`${capacidad.codigo?.replace(/:$/, '') || `C${(unidad.capacidadesTerminales.indexOf(capacidad) + 1)}`}:`}</strong>{' '}{capacidad.descripcion}</span>
                            </Box>
                          </Box>
                        );
                      }), (() => {
                        const col = selectableColumnIndexByKey.get(`unidad-${unidad.id}`) ?? -1;
                        return <Box key={`unit-average-${unidad.id}`} component="th" rowSpan={2}
                          data-registro-unit-average={unidad.id}
                          {...selectableCellProps(TABLE_HEADER_ROW_START + 1, col, 2)}
                          sx={{ ...cellBaseSx, ...selectableCellSx(TABLE_HEADER_ROW_START + 1, col, 2), bgcolor: '#d9ead3', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                          PROMEDIO UNIDAD
                        </Box>;
                      })()],
                    )}
                  </Box>
                  <Box component="tr">
                    {visibleUnits.flatMap((unidad) =>
                      unidad.capacidadesTerminales.flatMap((capacidad) => [
                        ...capacidad.indicadoresCapacidad.map((indicador) => {
                          const col = selectableColumnIndexByKey.get(`indicator-${indicador.id}`) ?? -1;
                          return (
                            <Box
                              key={`i-${indicador.id}`}
                              component="th"
                              {...selectableCellProps(TABLE_HEADER_ROW_START + 2, col)}
                              sx={{
                                ...cellBaseSx,
                                ...selectableCellSx(TABLE_HEADER_ROW_START + 2, col),
                                bgcolor: '#fff',
                                height: 180,
                                verticalAlign: 'bottom',
                                position: 'relative',
                                overflow: 'hidden',
                                px: 0,
                              }}
                            >
                              <Box data-registro-indicator-label={indicador.id} title={curricularLabel(capacidad.codigo, indicador.codigo, indicador.descripcion || indicador.sigla || `C.E. ${indicador.id}`)} sx={criterioLabelSx}>
                                <strong>{`${indicador.codigo?.replace(/:$/, '') || `I${capacidad.indicadoresCapacidad.indexOf(indicador) + 1}`}:`}</strong>{' '}{indicador.descripcion || indicador.sigla}
                              </Box>
                            </Box>
                          );
                        }),
                      ]),
                    )}
                  </Box>
                </Box>
                <Box component="tbody">
                  {registro.estudiantes.map((student, studentIndex) => {
                    const tableRowIndex = TABLE_HEADER_ROW_COUNT + studentIndex;
                    const isRetiring = retiringModuloEstudianteId === student.id;
                    return (
                    <Box component="tr" key={student.id} data-registro-student-id={student.id} aria-busy={isRetiring || undefined}>
                      <Box
                        component="td"
                        {...selectableCellProps(tableRowIndex, 0)}
                        sx={{ ...cellBaseSx, ...selectableCellSx(tableRowIndex, 0), textAlign: 'center', bgcolor: '#fff' }}
                      >
                        {studentIndex + 1}
                      </Box>
                      <Box
                        component="td"
                        {...selectableCellProps(tableRowIndex, 1)}
                        sx={{ ...cellBaseSx, ...selectableCellSx(tableRowIndex, 1), textAlign: 'center', bgcolor: '#fff', fontWeight: 700 }}
                      >
                        {student.matricula?.codigoInscripcion || ''}
                      </Box>
                      <Box
                        component="td"
                        {...selectableCellProps(tableRowIndex, 2)}
                        sx={{ ...cellBaseSx, ...selectableCellSx(tableRowIndex, 2), bgcolor: '#fff', fontWeight: focusedCell?.estudianteIndex === studentIndex ? 700 : 400, position: 'relative' }}
                      >
                        <Stack direction="row" spacing={0.5} alignItems="center" inert={isRetiring || undefined} sx={{ minWidth: 0, opacity: isRetiring ? 0.35 : 1 }}>
                          {editingStudentNameId === student.id ? (
                            <Stack
                              direction={{ xs: 'column', md: 'row' }}
                              spacing={0.5}
                              tabIndex={-1}
                              onMouseDown={(event) => event.stopPropagation()}
                              onDoubleClick={(event) => event.stopPropagation()}
                              onBlur={(event) => {
                                const nextTarget = event.relatedTarget as Node | null;
                                if (nextTarget && event.currentTarget.contains(nextTarget)) return;
                                void commitEditingStudentName();
                              }}
                              sx={{ flex: 1, minWidth: 0, py: 0.35, '& .MuiInputBase-root': { bgcolor: '#fff' } }}
                            >
                              <TextField
                                autoFocus
                                size="small"
                                label="Apellido paterno"
                                value={studentNameDraft.apellidoPaterno}
                                disabled={savingStudentNameId === student.id}
                                onChange={(event) => setStudentNameDraft((current) => ({ ...current, apellidoPaterno: event.target.value }))}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    void commitEditingStudentName();
                                  }
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    cancelEditingStudentName();
                                  }
                                }}
                                sx={{ minWidth: { xs: 120, md: 145 }, '& .MuiInputBase-input': { py: 0.55, fontSize: 12 } }}
                              />
                              <TextField
                                size="small"
                                label="Apellido materno"
                                value={studentNameDraft.apellidoMaterno}
                                disabled={savingStudentNameId === student.id}
                                onChange={(event) => setStudentNameDraft((current) => ({ ...current, apellidoMaterno: event.target.value }))}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    void commitEditingStudentName();
                                  }
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    cancelEditingStudentName();
                                  }
                                }}
                                sx={{ minWidth: { xs: 120, md: 145 }, '& .MuiInputBase-input': { py: 0.55, fontSize: 12 } }}
                              />
                              <TextField
                                size="small"
                                label="Nombres"
                                value={studentNameDraft.nombres}
                                disabled={savingStudentNameId === student.id}
                                onChange={(event) => setStudentNameDraft((current) => ({ ...current, nombres: event.target.value }))}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    void commitEditingStudentName();
                                  }
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    cancelEditingStudentName();
                                  }
                                }}
                                sx={{ minWidth: { xs: 140, md: 180 }, '& .MuiInputBase-input': { py: 0.55, fontSize: 12 } }}
                              />
                            </Stack>
                          ) : (
                            <Box
                              onDoubleClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                startEditingStudentName(student);
                              }}
                              title={canEditRegistro ? 'Doble clic para editar nombres' : undefined}
                              sx={{
                                flex: 1,
                                minWidth: 0,
                                cursor: canEditRegistro ? 'text' : 'inherit',
                                borderBottom: canEditRegistro ? '1px dotted transparent' : undefined,
                                '&:hover': canEditRegistro ? { borderBottomColor: 'text.secondary' } : undefined,
                              }}
                            >
                              {getStudentName(student)}
                            </Box>
                          )}
                          {savingStudentNameId === student.id ? <CircularProgress size={14} /> : null}
                          {canDeleteRegistroMatriculas ? (
                            <Tooltip title="Retirar de este grupo-módulo">
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={retiringModuloEstudianteId !== null}
                                  aria-label="Retirar de este grupo-módulo"
                                  onMouseDown={(event) => event.stopPropagation()}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleRetireMatricula(student);
                                  }}
                                  sx={{ width: 22, height: 22 }}
                                >
                                  <PersonRemoveIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : null}
                        </Stack>
                        {isRetiring && <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CircularProgress size={20} aria-label="Retirando matrícula" />
                        </Box>}
                      </Box>
                      {visibleUnits.flatMap((unidad) =>
                        [...unidad.capacidadesTerminales.flatMap((capacidad) => [
                          ...capacidad.indicadoresCapacidad.map((indicador) => {
                            const indicatorIndex = visibleIndicatorColumns.findIndex((column) => column.indicador.id === indicador.id);
                            const selectableColIndex = selectableColumnIndexByKey.get(`indicator-${indicador.id}`) ?? -1;
                            const key = notaKey(student.matriculaId, indicador.id);
                            return (
                              <Box
                                component="td"
                                key={key}
                                {...selectableCellProps(tableRowIndex, selectableColIndex)}
                                sx={{ ...cellBaseSx, ...selectableCellSx(tableRowIndex, selectableColIndex), p: 0, bgcolor: '#fff' }}
                              >
                                <Box
                                  component="input"
                                  data-nota-key={key}
                                  readOnly={!canEditRegistro}
                                  ref={(element: HTMLInputElement | null) => {
                                    editableCellRefs.current[editableCellKey(studentIndex, indicatorIndex)] = element;
                                  }}
                                  value={notas[key] ?? ''}
                                  onFocus={() => setFocusedCell({ estudianteIndex: studentIndex, indicadorIndex: indicatorIndex })}
                                  onKeyDown={(event) => handleEditableCellKeyDown(event, studentIndex, indicatorIndex)}
                                  onBlur={() => formatNota(student.matriculaId, indicador.id)}
                                  onChange={(event) => updateNota(student.matriculaId, indicador.id, event.target.value)}
                                  sx={{
                                    width: '100%',
                                    height: 24,
                                    border: 0,
                                    px: 0.4,
                                    bgcolor: isCellSelected(tableRowIndex, selectableColIndex) ? '#eaf4ee' : '#fff',
                                    color: gradeColor(parseNota(notas[key])),
                                    textAlign: 'center',
                                    fontSize: 12,
                                    outline: 'none',
                                    '&:focus': { boxShadow: 'inset 0 0 0 2px #217346' },
                                  }}
                                />
                              </Box>
                            );
                          }),
                        ]),
                          (() => {
                            const selectableColIndex = selectableColumnIndexByKey.get(`unidad-${unidad.id}`) ?? -1;
                            return (
                              <Box
                                component="td"
                                key={`avg-unit-${student.matriculaId}-${unidad.id}`}
                                data-registro-unit-average-key={`${student.matriculaId}:${unidad.id}`}
                                {...selectableCellProps(tableRowIndex, selectableColIndex)}
                                sx={{
                                  ...cellBaseSx,
                                  ...selectableCellSx(tableRowIndex, selectableColIndex),
                                  bgcolor: '#d9ead3',
                                  color: gradeColor(getUnidadAverage(student.matriculaId, unidad)),
                                  textAlign: 'center',
                                  fontWeight: 800,
                                }}
                              >
                                {displayGrade(getUnidadAverage(student.matriculaId, unidad))}
                              </Box>
                            );
                          })(),
                        ],
                      )}
                      {showEfsrtPpp ? (
                        <Box
                          component="td"
                          {...selectableCellProps(tableRowIndex, selectableColumnIndexByKey.get('efsrt-ppp') ?? -1)}
                          sx={{
                            ...cellBaseSx,
                            ...selectableCellSx(tableRowIndex, selectableColumnIndexByKey.get('efsrt-ppp') ?? -1),
                            p: 0,
                            bgcolor: '#fff',
                          }}
                        >
                          <Box
                            component="input"
                            data-efsrt-key={student.id}
                            readOnly={!canEditRegistro}
                            ref={(element: HTMLInputElement | null) => {
                              editableCellRefs.current[editableCellKey(studentIndex, visibleIndicatorColumns.length)] = element;
                            }}
                            value={efsrtPppNotas[efsrtPppKey(student.id)] ?? ''}
                            onFocus={() => setFocusedCell({ estudianteIndex: studentIndex, indicadorIndex: visibleIndicatorColumns.length })}
                            onKeyDown={(event) => handleEditableCellKeyDown(event, studentIndex, visibleIndicatorColumns.length)}
                            onBlur={() => formatEfsrtPppNota(student.id)}
                            onChange={(event) => updateEfsrtPppNota(student.id, event.target.value)}
                            sx={{
                              width: '100%',
                              height: 24,
                              border: 0,
                              px: 0.4,
                              bgcolor: isCellSelected(tableRowIndex, selectableColumnIndexByKey.get('efsrt-ppp') ?? -1) ? '#eaf4ee' : '#fff',
                              color: gradeColor(parseNota(efsrtPppNotas[efsrtPppKey(student.id)])),
                              textAlign: 'center',
                              fontSize: 12,
                              fontWeight: 800,
                              outline: 'none',
                              '&:focus': { boxShadow: 'inset 0 0 0 2px #217346' },
                            }}
                          />
                        </Box>
                      ) : null}
                      <Box
                        component="td"
                        {...selectableCellProps(tableRowIndex, selectableColumnIndexByKey.get('puntaje') ?? -1)}
                        sx={{
                          ...cellBaseSx,
                          ...selectableCellSx(tableRowIndex, selectableColumnIndexByKey.get('puntaje') ?? -1),
                          bgcolor: '#c6e0b4',
                          textAlign: 'center',
                          fontWeight: 800,
                        }}
                      >
                        {displayNumber(getModuloPuntaje(student))}
                      </Box>
                      <Box
                        component="td"
                        {...selectableCellProps(tableRowIndex, selectableColumnIndexByKey.get('promedio-general') ?? -1)}
                        sx={{
                          ...cellBaseSx,
                          ...selectableCellSx(tableRowIndex, selectableColumnIndexByKey.get('promedio-general') ?? -1),
                          bgcolor: '#c6e0b4',
                          color: gradeColor(getModuloAverage(student)),
                          textAlign: 'center',
                          fontWeight: 800,
                        }}
                      >
                        {displayGrade(getModuloAverage(student))}
                      </Box>
                    </Box>
                    );
                  })}
                  <Box component="tr">
                    <Box
                      component="td"
                      sx={{ ...cellBaseSx, textAlign: 'center', bgcolor: '#f8fbff', color: 'text.secondary', fontWeight: 700 }}
                    >
                      +
                    </Box>
                    <Box
                      component="td"
                      sx={{ ...cellBaseSx, textAlign: 'center', bgcolor: '#f8fbff' }}
                    />
                    <Box
                      component="td"
                      onDoubleClick={canCreateRegistroMatriculas ? () => setEditingNewMatricula(true) : undefined}
                      sx={{
                        ...cellBaseSx,
                        bgcolor: '#f8fbff',
                        cursor: canCreateRegistroMatriculas ? 'text' : 'default',
                        minHeight: 30,
                      }}
                    >
                      {creatingMatricula ? <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} role="status"><CircularProgress size={20} /><Typography variant="caption">Matriculando estudiante…</Typography></Stack> : canCreateRegistroMatriculas && editingNewMatricula ? (
                        <ClickAwayListener onClickAway={() => {
                          if (!newMatriculaDni) setEditingNewMatricula(false);
                        }}>
                          <Stack
                            direction="row"
                            spacing={0.75}
                            alignItems="center"
                            onMouseDown={(event) => event.stopPropagation()}
                          >
                            <Box
                              component="input"
                              autoFocus
                              inputMode="numeric"
                              maxLength={8}
                              placeholder="DNI"
                              value={newMatriculaDni}
                              onChange={(event) => setNewMatriculaDni(event.target.value.replace(/\D/g, '').slice(0, 8))}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  void handleCreateMatricula();
                                }
                                if (event.key === 'Escape') {
                                  setEditingNewMatricula(false);
                                  setNewMatriculaDni('');
                                }
                              }}
                              sx={{
                                width: 92,
                                border: '1px solid #8aa7c2',
                                borderRadius: 0.75,
                                px: 0.75,
                                py: 0.35,
                                fontSize: 12,
                                outline: 'none',
                              }}
                            />
                            <Button
                              size="small"
                              variant="contained"
                              onClick={handleCreateMatricula}
                              disabled={creatingMatricula || newMatriculaDni.length !== 8}
                              sx={{ minWidth: 0, width: 'fit-content', py: 0.25, fontSize: 11 }}
                            >
                              MATRICULAR
                            </Button>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => {
                                setEditingNewMatricula(false);
                                setNewMatriculaDni('');
                              }}
                              disabled={creatingMatricula}
                              sx={{ minWidth: 62, py: 0.25, fontSize: 11 }}
                            >
                              Cancelar
                            </Button>
                          </Stack>
                        </ClickAwayListener>
                      ) : canCreateRegistroMatriculas ? (
                        <Box sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                          Doble clic para agregar estudiante por DNI
                        </Box>
                      ) : null}
                    </Box>
                    <Box
                      component="td"
                      colSpan={Math.max(1, selectableColumns.length - 3)}
                      sx={{ ...cellBaseSx, bgcolor: '#f8fbff' }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : (
            <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
              {isDocente
                ? 'Selecciona uno de tus modulos para cargar el registro.'
                : 'Selecciona un semestre y modulo para cargar el registro.'}
            </Box>
          )}
        </Box>
        <Box
          component="button"
          ref={fillHandleRef}
          type="button"
          tabIndex={-1}
          aria-label="Rellenar seleccion arrastrando"
          data-testid="registro-fill-handle"
          onMouseDown={startFillDrag}
          sx={{
            position: 'absolute', display: 'none', width: 14, height: 14,
            p: 0, m: 0, border: 0, bgcolor: 'transparent', zIndex: 4,
            transform: 'translate(-50%, -50%)', cursor: FILL_CURSOR,
            '&::after': { content: '""', position: 'absolute', left: 3, top: 3, width: 8, height: 8,
              bgcolor: '#000', border: '1px solid #fff', boxSizing: 'border-box' },
          }}
        />
      </Paper>
    </Box>
  );
}
