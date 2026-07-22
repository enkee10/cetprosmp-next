'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
import SaveIcon from '@mui/icons-material/Save';
import { useSearchParams } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import { useAuth } from '@/context/AuthContext';
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
  descripcion?: string | null;
  sigla?: string | null;
  capacidadTerminalId?: number | null;
};

type Capacidad = {
  id: number;
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
    paquete?: { titulo?: string | null } | null;
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
const MODULE_INFO_ROW_COUNT = 5;
const TABLE_HEADER_ONLY_ROW_COUNT = 3;
const TABLE_HEADER_ROW_START = MODULE_INFO_ROW_COUNT;
const TABLE_HEADER_ROW_COUNT = MODULE_INFO_ROW_COUNT + TABLE_HEADER_ONLY_ROW_COUNT;
const MODULE_INFO_LEFT_LABEL_COL = 0;
const MODULE_INFO_LEFT_VALUE_COL = 1;
const MODULE_INFO_RIGHT_LABEL_COL = 3;
const MODULE_INFO_RIGHT_VALUE_COL = 4;
const TEACHER_ROLE_ID = 4;

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
  if (valid.length === 0) return null;
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
    if (typeof item.value !== 'number' || !Number.isFinite(item.value)) continue;
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

const getGrupoModuloLabel = (grupoModulo: GrupoModuloOption) =>
  grupoModulo.nombre ||
  `${grupoModulo.grupo.nombreDisplay || `Grupo ${grupoModulo.grupo.id}`} - ${
    grupoModulo.modulo?.titulo || grupoModulo.modulo?.tituloComercial || `Modulo ${grupoModulo.moduloId}`
  }`;

export default function RegistroAuxiliarPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { can } = useIntranetPermissions();
  const [grupos, setGrupos] = useState<GrupoOption[]>([]);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [datosGenerales, setDatosGenerales] = useState<DatosGenerales | null>(null);
  const [semestreId, setSemestreId] = useState('');
  const [grupoModuloId, setGrupoModuloId] = useState('');
  const [registro, setRegistro] = useState<RegistroAuxiliar | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [efsrtPppNotas, setEfsrtPppNotas] = useState<Record<string, string>>({});
  const [focusedCell, setFocusedCell] = useState<CellPosition | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingRegistro, setLoadingRegistro] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingModuloFechas, setEditingModuloFechas] = useState(false);
  const [fechaInicioModulo, setFechaInicioModulo] = useState('');
  const [fechaFinModulo, setFechaFinModulo] = useState('');
  const [savingModuloFechas, setSavingModuloFechas] = useState(false);
  const [unitPage, setUnitPage] = useState(0);
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
  const editableCellRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const registroScrollRef = useRef<HTMLDivElement | null>(null);
  const selectionPointerRef = useRef<{ x: number; y: number } | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const committingStudentNameRef = useRef(false);

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);
  const directGrupoModuloId = searchParams.get('grupoModuloId') || '';
  const isDirectRegistro = Boolean(directGrupoModuloId);
  const isDocente = Number(user?.role ?? 0) === TEACHER_ROLE_ID && Number(user?.level ?? 0) < 600;
  const canEditRegistro = can('registro-auxiliar', 'edit');
  const canEditModuloFechas = canEditRegistro;
  const canCreateRegistroMatriculas = can('registro-auxiliar', 'create');
  const canDeleteRegistroMatriculas = can('registro-auxiliar', 'delete');

  useEffect(() => {
    if (!directGrupoModuloId) return;
    setGrupoModuloId(directGrupoModuloId);
    setSemestreId('');
  }, [directGrupoModuloId]);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      setError(null);
      try {
        if (auth.currentUser) await auth.currentUser.getIdToken(true);
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

  const semestreOptions = useMemo(
    () => semestres.filter((semestre) => availableSemestreIds.has(semestre.id)),
    [availableSemestreIds, semestres],
  );

  useEffect(() => {
    if (isDirectRegistro || isDocente) return;
    if (semestreOptions.some((semestre) => String(semestre.id) === semestreId)) return;
    setSemestreId(semestreOptions[0] ? String(semestreOptions[0].id) : '');
  }, [isDirectRegistro, isDocente, semestreId, semestreOptions]);

  const filteredGrupoModuloOptions = useMemo(
    () =>
      semestreId
        ? grupoModuloOptions.filter((option) => String(option.grupo.semestreId ?? '') === semestreId)
        : [],
    [grupoModuloOptions, semestreId],
  );

  useEffect(() => {
    if (isDirectRegistro || isDocente) return;
    if (filteredGrupoModuloOptions.some((option) => String(option.id) === grupoModuloId)) return;
    setGrupoModuloId(filteredGrupoModuloOptions[0] ? String(filteredGrupoModuloOptions[0].id) : '');
  }, [filteredGrupoModuloOptions, grupoModuloId, isDirectRegistro, isDocente]);

  const fetchRegistro = useCallback(async () => {
    if (!grupoModuloId) {
      setRegistro(null);
      setNotas({});
      setEfsrtPppNotas({});
      return;
    }
    setLoadingRegistro(true);
    setError(null);
    setMessage(null);
    try {
      const getRegistroAuxiliar = httpsCallable<{ grupoModuloId: number }, RegistroAuxiliar>(
        functions,
        'getRegistroAuxiliar',
      );
      const result = await getRegistroAuxiliar({ grupoModuloId: Number(grupoModuloId) });
      setRegistro(result.data);
      setEditingModuloFechas(false);
      const nextNotas: Record<string, string> = {};
      for (const nota of result.data.notas || []) {
        if (!nota.indicadorCapacidadId || nota.promedio == null) continue;
        nextNotas[notaKey(nota.matriculaId, nota.indicadorCapacidadId)] = displayGrade(nota.promedio);
      }
      setNotas(nextNotas);
      const nextEfsrtPppNotas: Record<string, string> = {};
      for (const promedio of result.data.promediosEfsrtPpp || []) {
        if (promedio.promedioFinal == null) continue;
        nextEfsrtPppNotas[efsrtPppKey(promedio.moduloEstudianteId)] = displayGrade(promedio.promedioFinal);
      }
      setEfsrtPppNotas(nextEfsrtPppNotas);
      setEditingNewMatricula(false);
      setNewMatriculaDni('');
    } catch (err) {
      console.error('Error loading registro auxiliar', err);
      setRegistro(null);
      setEfsrtPppNotas({});
      setError('No se pudo cargar el registro auxiliar.');
    } finally {
      setLoadingRegistro(false);
    }
  }, [functions, grupoModuloId]);

  useEffect(() => {
    void fetchRegistro();
  }, [fetchRegistro]);

  useEffect(() => {
    setUnitPage(0);
  }, [grupoModuloId]);

  const indicatorColumns = useMemo(() => buildIndicatorColumns(registro?.estructura || []), [registro]);

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
  const editableColumnCount = visibleIndicatorColumns.length + (showEfsrtPpp ? 1 : 0);

  const focusEditableCell = useCallback(
    (rowIndex: number, columnIndex: number) => {
      if (!registro?.estudiantes.length || editableColumnCount <= 0) return;
      const nextRow = Math.max(0, Math.min(registro.estudiantes.length - 1, rowIndex));
      const nextColumn = Math.max(0, Math.min(editableColumnCount - 1, columnIndex));
      window.requestAnimationFrame(() => {
        const nextInput = editableCellRefs.current[editableCellKey(nextRow, nextColumn)];
        nextInput?.focus();
        nextInput?.select();
      });
    },
    [editableColumnCount, registro?.estudiantes.length],
  );

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
      focusEditableCell(nextRow, nextColumn);
    },
    [focusEditableCell],
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
      if (usesOcupacionalRules) {
        const lastIndicador = indicadores[indicadores.length - 1];
        return lastIndicador ? roundPromedio(getNotaValue(matriculaId, lastIndicador.id)) : null;
      }
      return average(indicadores.map((indicador) => getNotaValue(matriculaId, indicador.id)));
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
      return weightedAverage([
        ...(registro?.estructura || []).map((unidad, index) => ({
          value: unitGrades[index],
          weight: unidad.creditos,
        })),
        {
          value: getEfsrtPppAverage(student),
          weight: registro?.grupoModulo?.modulo?.creditosEfsrt,
        },
      ]);
    },
    [getEfsrtPppAverage, getUnidadAverage, registro, usesOcupacionalRules],
  );

  const getModuloPuntaje = useCallback(
    (student: Estudiante) => {
      const unitGrades = (registro?.estructura || []).map((unidad) => getUnidadAverage(student.matriculaId, unidad));
      if (usesOcupacionalRules) return sumNotas(unitGrades);
      return sumNotas([...unitGrades, getEfsrtPppAverage(student)]);
    },
    [getEfsrtPppAverage, getUnidadAverage, registro, usesOcupacionalRules],
  );

  const selectableColumns = useMemo<SelectableColumn[]>(() => {
    const columns: SelectableColumn[] = [
      { key: 'nro', getValue: (_student, studentIndex) => String(studentIndex + 1) },
      { key: 'codigo', getValue: (student) => student.matricula?.codigoInscripcion || '' },
      { key: 'estudiante', getValue: (student) => getStudentName(student) },
    ];

    for (const unidad of visibleUnits) {
      for (const capacidad of unidad.capacidadesTerminales || []) {
        for (const indicador of capacidad.indicadoresCapacidad || []) {
          columns.push({
            key: `indicator-${indicador.id}`,
            getValue: (student) => displayGrade(getNotaValue(student.matriculaId, indicador.id)),
          });
        }
        columns.push({
          key: `capacidad-${capacidad.id}`,
          getValue: (student) => displayGrade(getCapacidadAverage(student.matriculaId, capacidad)),
        });
      }
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
    getCapacidadAverage,
    getEfsrtPppAverage,
    getModuloAverage,
    getModuloPuntaje,
    getNotaValue,
    showEfsrtPpp,
    visibleUnits,
  ]);

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
        const colSpan = Math.max(1, capacidad.indicadoresCapacidad.length) + 1;
        capacidades.set(capacidad.id, { col, colSpan });
        col += colSpan;
      }
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
      onMouseDown: (event: React.MouseEvent<HTMLElement>) => {
        if (columnIndex < 0) return;
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

    const headerRows = [makeRow(), makeRow(), makeRow()];
    headerRows[0][0] = 'Nro.';
    headerRows[0][1] = 'Codigo';
    headerRows[0][2] = 'Apellidos y Nombres';

    for (const unidad of visibleUnits) {
      const span = headerSpans.unidades.get(unidad.id);
      if (span) headerRows[0][span.col] = unidad.sigla || unidad.nombre || '';
      for (const capacidad of unidad.capacidadesTerminales || []) {
        const capacidadSpan = headerSpans.capacidades.get(capacidad.id);
        if (capacidadSpan) headerRows[1][capacidadSpan.col] = capacidad.descripcion || '';
        for (const indicador of capacidad.indicadoresCapacidad || []) {
          const indicatorCol = selectableColumnIndexByKey.get(`indicator-${indicador.id}`);
          if (indicatorCol != null) headerRows[2][indicatorCol] = indicador.descripcion || indicador.sigla || `C.E. ${indicador.id}`;
        }
        const promedioCol = selectableColumnIndexByKey.get(`capacidad-${capacidad.id}`);
        if (promedioCol != null) headerRows[2][promedioCol] = isProgramaEstudio ? 'PROMEDIO' : 'LOGRO';
      }
    }

    const efsrtCol = selectableColumnIndexByKey.get('efsrt-ppp');
    if (efsrtCol != null) headerRows[0][efsrtCol] = 'EFSRT/PPP';
    const puntajeCol = selectableColumnIndexByKey.get('puntaje');
    if (puntajeCol != null) headerRows[0][puntajeCol] = 'Puntaje';
    const promedioCol = selectableColumnIndexByKey.get('promedio-general');
    if (promedioCol != null) headerRows[0][promedioCol] = isProgramaEstudio ? 'Promedio General' : 'Promedio';

    const bodyRows = registro.estudiantes.map((student, studentIndex) =>
      selectableColumns.map((column) => column.getValue(student, studentIndex)),
    );
    return [...moduleRows, ...headerRows, ...bodyRows];
  }, [
    datosGenerales?.nombreInstitucion,
    headerSpans,
    isProgramaEstudio,
    registro,
    selectableColumnIndexByKey,
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

        if (deltaY !== 0 || deltaX !== 0) {
          container.scrollBy({ top: deltaY, left: deltaX });
        }
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
  }, [selectingCells]);

  useEffect(() => {
    const handleCopy = (event: ClipboardEvent) => {
      if (!selectedText) return;
      event.preventDefault();
      event.clipboardData?.setData('text/plain', selectedText);
      setMessage('Rango copiado al portapapeles.');
    };
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [selectedText]);

  useEffect(() => {
    setCellSelection(null);
  }, [grupoModuloId, unitPage]);

  const updateNota = (matriculaId: number, indicadorId: number, value: string) => {
    const cleaned = value.replace(',', '.');
    if (cleaned !== '' && !/^\d{0,2}(\.\d{0,2})?$/.test(cleaned)) return;
    const numeric = parseNota(cleaned);
    if (numeric != null && numeric > 20) return;
    setNotas((prev) => ({ ...prev, [notaKey(matriculaId, indicadorId)]: cleaned }));
  };

  const formatNota = (matriculaId: number, indicadorId: number) => {
    setNotas((prev) => {
      const key = notaKey(matriculaId, indicadorId);
      const nota = parseNota(prev[key]);
      return { ...prev, [key]: nota == null ? '' : displayGrade(nota) };
    });
  };

  const updateEfsrtPppNota = (moduloEstudianteId: number, value: string) => {
    const cleaned = value.replace(',', '.');
    if (cleaned !== '' && !/^\d{0,2}(\.\d{0,2})?$/.test(cleaned)) return;
    const numeric = parseNota(cleaned);
    if (numeric != null && numeric > 20) return;
    setEfsrtPppNotas((prev) => ({ ...prev, [efsrtPppKey(moduloEstudianteId)]: cleaned }));
  };

  const formatEfsrtPppNota = (moduloEstudianteId: number) => {
    setEfsrtPppNotas((prev) => {
      const key = efsrtPppKey(moduloEstudianteId);
      const nota = parseNota(prev[key]);
      return { ...prev, [key]: nota == null ? '' : displayGrade(nota) };
    });
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>, position: CellPosition) => {
    const text = event.clipboardData.getData('text');
    if (!text.includes('\t') && !text.includes('\n')) return;
    event.preventDefault();
    const rows = text.replace(/\r/g, '').split('\n').filter((row) => row.length > 0);
    setNotas((prev) => {
      const next = { ...prev };
      rows.forEach((row, rowOffset) => {
        const student = registro?.estudiantes[position.estudianteIndex + rowOffset];
        if (!student) return;
        row.split('\t').forEach((cell, columnOffset) => {
          const indicator = visibleIndicatorColumns[position.indicadorIndex + columnOffset]?.indicador;
          if (!indicator) return;
          const nota = parseNota(cell);
          next[notaKey(student.matriculaId, indicator.id)] = nota == null ? '' : displayGrade(nota);
        });
      });
      return next;
    });
  };

  const handleCopyNotas = async () => {
    if (!registro) return;
    const header = [
      'Estudiante',
      ...indicatorColumns.map((column) => column.indicador.sigla || `CE ${column.indicador.id}`),
      ...(showEfsrtPpp ? ['EFSRT/PPP'] : []),
      'Puntaje',
      isProgramaEstudio ? 'Promedio General' : 'Promedio',
    ];
    const rows = registro.estudiantes.map((student) => [
      getStudentName(student),
      ...indicatorColumns.map((column) => notas[notaKey(student.matriculaId, column.indicador.id)] || ''),
      ...(showEfsrtPpp ? [displayGrade(getEfsrtPppAverage(student))] : []),
      displayNumber(getModuloPuntaje(student)),
      displayGrade(getModuloAverage(student)),
    ]);
    await navigator.clipboard.writeText([header, ...rows].map((row) => row.join('\t')).join('\n'));
    setMessage('Matriz copiada al portapapeles.');
  };

  const handleSave = async () => {
    if (!registro || !grupoModuloId) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const saveRegistroAuxiliar = httpsCallable<
        {
          grupoModuloId: number;
          notas: Array<{ matriculaId: number; indicadorCapacidadId: number; nota: number | null }>;
          efsrtPppPromedios: Array<{ moduloEstudianteId: number; promedioFinal: number | null }>;
        },
        { saved: number; efsrtPppSaved?: number }
      >(functions, 'saveRegistroAuxiliar');
      const payload = registro.estudiantes.flatMap((student) =>
        indicatorColumns.map((column) => ({
          matriculaId: student.matriculaId,
          indicadorCapacidadId: column.indicador.id,
          nota: getNotaValue(student.matriculaId, column.indicador.id),
        })),
      );
      const efsrtPppPayload = registro.estudiantes.map((student) => ({
        moduloEstudianteId: student.id,
        promedioFinal: parseNota(efsrtPppNotas[efsrtPppKey(student.id)]),
      }));
      const result = await saveRegistroAuxiliar({
        grupoModuloId: Number(grupoModuloId),
        notas: payload,
        efsrtPppPromedios: showEfsrtPpp ? efsrtPppPayload : [],
      });
      setMessage(
        showEfsrtPpp
          ? `Registro guardado. Celdas procesadas: ${result.data.saved}. EFSRT/PPP: ${result.data.efsrtPppSaved ?? 0}.`
          : `Registro guardado. Celdas procesadas: ${result.data.saved}.`,
      );
      await fetchRegistro();
    } catch (err) {
      console.error('Error saving registro auxiliar', err);
      setError('No se pudo guardar el registro auxiliar.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMatricula = async () => {
    const dni = newMatriculaDni.replace(/\D/g, '');
    if (!registro?.grupoModulo?.id || !dni) return;
    if (!/^\d{8}$/.test(dni)) {
      setError('Ingresa un DNI valido de 8 digitos.');
      return;
    }

    setCreatingMatricula(true);
    setError(null);
    setMessage(null);
    try {
      const createRegistroAuxiliarMatricula = httpsCallable<
        { grupoModuloId: number; dni: string },
        { matriculaId: number; moduloEstudianteId: number; dni: string }
      >(functions, 'createRegistroAuxiliarMatricula');
      await createRegistroAuxiliarMatricula({
        grupoModuloId: registro.grupoModulo.id,
        dni,
      });
      setMessage('Matricula creada y agregada al registro.');
      setEditingNewMatricula(false);
      setNewMatriculaDni('');
      await fetchRegistro();
    } catch (err) {
      console.error('Error creating registro auxiliar matricula', err);
      const message = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message?: unknown }).message || '')
        : '';
      setError(message || 'No se pudo crear la matricula.');
    } finally {
      setCreatingMatricula(false);
    }
  };

  const handleRetireMatricula = async (student: Estudiante) => {
    if (!registro?.grupoModulo?.id) return;
    const studentName = getStudentName(student);
    const confirmed = window.confirm(
      `Se retirara a ${studentName} de esta matricula. Deseas continuar?`,
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
      setMessage('Estudiante retirado de la matricula.');
      await fetchRegistro();
    } catch (err) {
      console.error('Error retiring registro auxiliar matricula', err);
      const message = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message?: unknown }).message || '')
        : '';
      setError(message || 'No se pudo retirar la matricula.');
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
  };

  const criterioLabelSx = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 164,
    whiteSpace: 'normal',
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
    <Box sx={{ pb: 3, overflowAnchor: 'none' }}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', lg: 'center' }}
        justifyContent={isDirectRegistro || isDocente ? 'flex-end' : 'initial'}
        sx={{ mb: 0.75 }}
      >
        {!isDirectRegistro && !isDocente && (
          <>
            <Typography variant="h6" sx={{ fontWeight: 800, flex: 1, fontSize: 18, lineHeight: 1.15 }}>
              Registro Auxiliar de Evaluacion
            </Typography>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', lg: 180 } }} disabled={loadingOptions || !semestreOptions.length}>
              <InputLabel>Semestre</InputLabel>
              <Select
                label="Semestre"
                value={semestreId}
                MenuProps={selectMenuProps}
                onChange={(event) => setSemestreId(String(event.target.value))}
              >
                {semestreOptions.map((semestre) => (
                  <MenuItem key={semestre.id} value={String(semestre.id)}>
                    {semestre.titulo || `Semestre ${semestre.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', lg: 520 } }} disabled={loadingOptions || !semestreId || !filteredGrupoModuloOptions.length}>
              <InputLabel>Modulo</InputLabel>
              <Select
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
            </FormControl>
          </>
        )}
        <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopyNotas} disabled={!registro}>
          Copiar
        </Button>
        <Button variant="contained" startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />} onClick={handleSave} disabled={!registro || saving || !canEditRegistro}>
          Guardar
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      <AutoDismissAlert message={message} severity="success" sx={{ mb: 1.5 }} />

      <Paper sx={{ overflow: 'hidden', borderRadius: 1, border: '1px solid #2d2d2d' }}>
        <Box
          ref={registroScrollRef}
          onWheelCapture={stopScrollChaining}
          onMouseMove={handleSelectionMouseMove}
          sx={{
            overflow: 'auto',
            maxHeight: 'calc(100vh - 170px)',
            bgcolor: '#fff',
            overscrollBehavior: 'contain',
            overscrollBehaviorX: 'contain',
            overscrollBehaviorY: 'contain',
            scrollbarGutter: 'stable',
          }}
        >
          {loadingRegistro ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : registro ? (
            <Box sx={{ minWidth: Math.max(showEfsrtPpp ? 920 : 872, (showEfsrtPpp ? 478 : 430) + visibleIndicatorColumns.length * 56) }}>
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
                  REGISTRO AUXILIAR DE EVALUACION {registro.grupo?.semestre?.titulo || ''}
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

              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <Box component="thead" sx={{ position: 'sticky', top: 0, zIndex: 3 }}>
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
                        (sum, capacidad) => sum + Math.max(1, capacidad.indicadoresCapacidad.length) + 1,
                        0,
                      );
                      return (
                        <Box
                          key={unidad.id}
                          component="th"
                          colSpan={colSpan}
                          {...selectableCellProps(TABLE_HEADER_ROW_START, span.col, 1, span.colSpan)}
                          sx={{ ...cellBaseSx, ...selectableCellSx(TABLE_HEADER_ROW_START, span.col, 1, span.colSpan), bgcolor: '#eef6ff', height: 30 }}
                        >
                          {unidad.sigla || unidad.nombre}
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
                          bgcolor: '#d9ead3',
                          width: 48,
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
                        width: 48,
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
                        width: 48,
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                      }}
                    >
                      {isProgramaEstudio ? 'Promedio General' : 'Promedio'}
                    </Box>
                  </Box>
                  <Box component="tr">
                    {visibleUnits.flatMap((unidad) =>
                      unidad.capacidadesTerminales.map((capacidad) => {
                        const span = headerSpans.capacidades.get(capacidad.id) ?? { col: -1, colSpan: 1 };
                        return (
                          <Box
                            key={capacidad.id}
                            component="th"
                            colSpan={Math.max(1, capacidad.indicadoresCapacidad.length) + 1}
                            {...selectableCellProps(TABLE_HEADER_ROW_START + 1, span.col, 1, span.colSpan)}
                            sx={{ ...cellBaseSx, ...selectableCellSx(TABLE_HEADER_ROW_START + 1, span.col, 1, span.colSpan), bgcolor: '#fff', height: 64, verticalAlign: 'middle', p: 0 }}
                          >
                            <Box title={capacidad.descripcion || ''} sx={capacidadLabelSx}>
                              {capacidad.descripcion}
                            </Box>
                          </Box>
                        );
                      }),
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
                                width: 66,
                                verticalAlign: 'bottom',
                                position: 'relative',
                                overflow: 'hidden',
                                px: 0,
                              }}
                            >
                              <Box title={indicador.descripcion || indicador.sigla || `C.E. ${indicador.id}`} sx={criterioLabelSx}>
                                {indicador.descripcion || indicador.sigla || `C.E. ${indicador.id}`}
                              </Box>
                            </Box>
                          );
                        }),
                        (() => {
                          const col = selectableColumnIndexByKey.get(`capacidad-${capacidad.id}`) ?? -1;
                          return (
                            <Box
                              key={`p-${capacidad.id}`}
                              component="th"
                              {...selectableCellProps(TABLE_HEADER_ROW_START + 2, col)}
                              sx={{
                                ...cellBaseSx,
                                ...selectableCellSx(TABLE_HEADER_ROW_START + 2, col),
                                bgcolor: '#d9ead3',
                                width: 42,
                                writingMode: 'vertical-rl',
                                transform: 'rotate(180deg)',
                              }}
                            >
                              {isProgramaEstudio ? 'PROMEDIO' : 'LOGRO'}
                            </Box>
                          );
                        })(),
                      ]),
                    )}
                  </Box>
                </Box>
                <Box component="tbody">
                  {registro.estudiantes.map((student, studentIndex) => {
                    const tableRowIndex = TABLE_HEADER_ROW_COUNT + studentIndex;
                    return (
                    <Box component="tr" key={student.id}>
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
                        sx={{ ...cellBaseSx, ...selectableCellSx(tableRowIndex, 2), bgcolor: '#fff', fontWeight: focusedCell?.estudianteIndex === studentIndex ? 700 : 400 }}
                      >
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
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
                              sx={{ flex: 1, minWidth: 0, py: 0.35 }}
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
                            <Tooltip title="Retirar de la matricula">
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={retiringModuloEstudianteId === student.id}
                                  onMouseDown={(event) => event.stopPropagation()}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleRetireMatricula(student);
                                  }}
                                  sx={{ width: 22, height: 22 }}
                                >
                                  {retiringModuloEstudianteId === student.id ? (
                                    <CircularProgress size={13} color="inherit" />
                                  ) : (
                                    <PersonRemoveIcon sx={{ fontSize: 16 }} />
                                  )}
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : null}
                        </Stack>
                      </Box>
                      {visibleUnits.flatMap((unidad) =>
                        unidad.capacidadesTerminales.flatMap((capacidad) => [
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
                                  ref={(element: HTMLInputElement | null) => {
                                    editableCellRefs.current[editableCellKey(studentIndex, indicatorIndex)] = element;
                                  }}
                                  value={notas[key] ?? ''}
                                  onFocus={() => setFocusedCell({ estudianteIndex: studentIndex, indicadorIndex: indicatorIndex })}
                                  onPaste={(event) => handlePaste(event, { estudianteIndex: studentIndex, indicadorIndex: indicatorIndex })}
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
                          (() => {
                            const selectableColIndex = selectableColumnIndexByKey.get(`capacidad-${capacidad.id}`) ?? -1;
                            return (
                              <Box
                                component="td"
                                key={`avg-${student.matriculaId}-${capacidad.id}`}
                                {...selectableCellProps(tableRowIndex, selectableColIndex)}
                                sx={{
                                  ...cellBaseSx,
                                  ...selectableCellSx(tableRowIndex, selectableColIndex),
                                  bgcolor: '#d9ead3',
                                  color: gradeColor(getCapacidadAverage(student.matriculaId, capacidad)),
                                  textAlign: 'center',
                                  fontWeight: 800,
                                }}
                              >
                                {displayGrade(getCapacidadAverage(student.matriculaId, capacidad))}
                              </Box>
                            );
                          })(),
                        ]),
                      )}
                      {showEfsrtPpp ? (
                        <Box
                          component="td"
                          {...selectableCellProps(tableRowIndex, selectableColumnIndexByKey.get('efsrt-ppp') ?? -1)}
                          sx={{
                            ...cellBaseSx,
                            ...selectableCellSx(tableRowIndex, selectableColumnIndexByKey.get('efsrt-ppp') ?? -1),
                            p: 0,
                            bgcolor: '#d9ead3',
                          }}
                        >
                          <Box
                            component="input"
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
                              bgcolor: isCellSelected(tableRowIndex, selectableColumnIndexByKey.get('efsrt-ppp') ?? -1) ? '#eef7e8' : '#d9ead3',
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
                      {canCreateRegistroMatriculas && editingNewMatricula ? (
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
                            sx={{ minWidth: 108, py: 0.25, fontSize: 11 }}
                          >
                            {creatingMatricula ? 'Creando...' : 'Crear matricula'}
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
                ? 'Selecciona un modulo desde el menu Registros.'
                : 'Selecciona un semestre y modulo para cargar el registro.'}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
