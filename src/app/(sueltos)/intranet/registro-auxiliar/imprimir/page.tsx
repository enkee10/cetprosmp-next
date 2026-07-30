'use client';

import { CSSProperties, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, FormControl, GlobalStyles, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useSearchParams } from 'next/navigation';
import { app } from '@/lib/firebase';
import { formatDateOnly } from '@/lib/dateOnly';
import PrintDocumentViewer, {
  cmToMm,
  getA4PageSizeMm,
  getPrintContentHeightMm,
  getPrintContentWidthMm,
  type PrintMarginsCm,
  type PrintOrientation,
} from '@/components/print/PrintDocumentViewer';

type DatosGenerales = {
  nombreInstitucion?: string | null;
};

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

type PrintColumn = {
  key: string;
  widthMm: number;
  headerTextWidthMm?: number;
  type: 'indicador' | 'capacidad' | 'efsrt' | 'puntaje' | 'promedio';
  unidad: Unidad | null;
  capacidad: Capacidad | null;
  indicador?: Indicador | null;
};

type PrintPage = {
  columns: PrintColumn[];
  unscaledWidthMm: number;
  scale: number;
  headerHeightPx: number;
};

type VisualPrintPage = PrintPage & {
  students: Estudiante[];
  pageIndex: number;
  horizontalPageIndex: number;
  verticalPageIndex: number;
  verticalPageCount: number;
  studentStartIndex: number;
};

const DEFAULT_PRINT_MARGINS_CM: PrintMarginsCm = {
  top: 2,
  bottom: 1,
  left: 1,
  right: 1,
};
const FIXED_COLUMNS = [
  { key: 'nro', widthMm: 8 },
  { key: 'estudiante', widthMm: 68 },
];
const FIXED_WIDTH_MM = FIXED_COLUMNS.reduce((sum, column) => sum + column.widthMm, 0);
const MIN_SCALE = 0.55;
const MAX_SCALE = 1;
const MAX_HORIZONTAL_PRINT_PAGES = 2;
const STUDENT_ROW_HEIGHT_PX = 14;
const DEFAULT_STUDENTS_PER_PAGE = 23;
const MODULE_INFO_HEIGHT_PX = 84;
const PAGE_NUMBER_HEIGHT_PX = 18;
const UNIT_HEADER_HEIGHT_PX = 20;
const INDICATOR_HEADER_HEIGHT_PX = 135;
const PX_TO_MM = 25.4 / 96;
const CAPACITY_HEADER_HORIZONTAL_PADDING_MM = 1.4;
const CAPACITY_HEADER_VERTICAL_PADDING_PX = 4;
const AUTO_CAPACITY_HEADER_REFERENCE_HEIGHT_PX = 120;
const getCapacityHeaderHeightPx = (studentCount: number) => (studentCount <= 20 ? null : 93);
const getCapacityHeaderContentHeightPx = (capacityHeaderHeightPx: number) =>
  capacityHeaderHeightPx - CAPACITY_HEADER_VERTICAL_PADDING_PX;
const getCapacityHeaderMeasureHeightPx = (capacityHeaderHeightPx: number) =>
  getCapacityHeaderContentHeightPx(capacityHeaderHeightPx) - 8;
const getTableHeaderHeightPx = (capacityHeaderHeightPx: number) =>
  UNIT_HEADER_HEIGHT_PX + capacityHeaderHeightPx + INDICATOR_HEADER_HEIGHT_PX;
const INDICATOR_TEXT_PADDING_PX = 10;
const INDICATOR_TEXT_WIDTH_PX = Math.max(80, INDICATOR_HEADER_HEIGHT_PX - INDICATOR_TEXT_PADDING_PX);
const INDICATOR_TEXT_WIDTH_MM = INDICATOR_TEXT_WIDTH_PX * PX_TO_MM;
const selectMenuProps = {
  disableScrollLock: true,
  PaperProps: {
    sx: {
      maxHeight: 360,
    },
  },
};

const normalizeText = (value: string | null | undefined) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getHeaderTextMetrics = (value: string | null | undefined) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  const words = text.split(/\s+/).filter(Boolean);
  const maxWordLength = words.reduce((max, word) => Math.max(max, word.length), 0);
  return {
    length: text.length,
    wordCount: words.length,
    maxWordLength,
  };
};

const estimateWrappedLineCount = (text: string, maxCharsPerLine: number) => {
  const words = text.replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;

  let lines = 1;
  let currentLength = 0;

  for (const word of words) {
    const length = word.length;
    if (length > maxCharsPerLine) {
      if (currentLength > 0) {
        lines += 1;
        currentLength = 0;
      }
      lines += Math.max(0, Math.ceil(length / maxCharsPerLine) - 1);
      currentLength = length % maxCharsPerLine;
      continue;
    }

    const nextLength = currentLength === 0 ? length : currentLength + 1 + length;
    if (nextLength <= maxCharsPerLine) {
      currentLength = nextLength;
    } else {
      lines += 1;
      currentLength = length;
    }
  }

  return lines;
};

const estimateIndicatorLayout = (label: string) => {
  const metrics = getHeaderTextMetrics(label);
  const charsPerLine = Math.max(18, Math.floor(INDICATOR_TEXT_WIDTH_PX / 4));
  const lineCount = estimateWrappedLineCount(label, charsPerLine);
  const requiredTextHeightPx = lineCount * 7.4 + Math.min(metrics.wordCount, 4) * 0.3 + 4;
  const widthMm = clampNumber(requiredTextHeightPx * 25.4 / 96 + 1.6, 7.5, 22);

  return { widthMm, headerTextWidthMm: INDICATOR_TEXT_WIDTH_MM };
};

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

const getTurnoHorarioName = (grupo: RegistroAuxiliar['grupo']) => {
  const turno = grupo?.turno?.nombre || grupo?.turnoNombre || '';
  const horario = grupo?.horario?.nombre || grupo?.horario?.diasSemana || '';
  return [turno, horario].filter(Boolean).join(' - ');
};

const getGrupoModuloLabel = (grupoModulo: GrupoModuloOption) =>
  grupoModulo.nombre ||
  `${grupoModulo.grupo.nombreDisplay || `Grupo ${grupoModulo.grupo.id}`} - ${
    grupoModulo.modulo?.titulo || grupoModulo.modulo?.tituloComercial || `Modulo ${grupoModulo.moduloId}`
  }`;

const notaKey = (matriculaId: number, indicadorId: number) => `${matriculaId}:${indicadorId}`;
const efsrtPppKey = (moduloEstudianteId: number) => String(moduloEstudianteId);

const parseNota = (value: string | number | null | undefined) => {
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

const gradeColor = (value: number | null) => (value != null && value < 13 ? '#c00000' : 'inherit');

const roundPromedio = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(value);
};

const buildNotasMap = (registro: RegistroAuxiliar | null) => {
  const next: Record<string, string> = {};
  for (const nota of registro?.notas || []) {
    if (!nota.indicadorCapacidadId || nota.promedio == null) continue;
    next[notaKey(nota.matriculaId, nota.indicadorCapacidadId)] = displayGrade(nota.promedio);
  }
  return next;
};

const buildEfsrtPppMap = (registro: RegistroAuxiliar | null) => {
  const next: Record<string, string> = {};
  for (const promedio of registro?.promediosEfsrtPpp || []) {
    if (promedio.promedioFinal == null) continue;
    next[efsrtPppKey(promedio.moduloEstudianteId)] = displayGrade(promedio.promedioFinal);
  }
  return next;
};

const buildPrintColumns = (registro: RegistroAuxiliar | null, showEfsrtPpp: boolean, isProgramaEstudio: boolean) => {
  const columns: PrintColumn[] = [];
  for (const unidad of registro?.estructura || []) {
    for (const capacidad of unidad.capacidadesTerminales || []) {
      for (const indicador of capacidad.indicadoresCapacidad || []) {
        const label = indicador.descripcion || indicador.sigla || '';
        const layout = estimateIndicatorLayout(label);
        columns.push({
          key: `indicator-${indicador.id}`,
          widthMm: layout.widthMm,
          headerTextWidthMm: layout.headerTextWidthMm,
          type: 'indicador',
          unidad,
          capacidad,
          indicador,
        });
      }
      columns.push({
        key: `capacidad-${capacidad.id}`,
        widthMm: isProgramaEstudio ? 10 : 9,
        type: 'capacidad',
        unidad,
        capacidad,
      });
    }
  }
  if (showEfsrtPpp) {
    columns.push({ key: 'efsrt-ppp', widthMm: 10, type: 'efsrt', unidad: null, capacidad: null });
  }
  if (!isProgramaEstudio) {
    columns.push({ key: 'puntaje', widthMm: 10, type: 'puntaje', unidad: null, capacidad: null });
  }
  columns.push({ key: 'promedio-general', widthMm: isProgramaEstudio ? 9.7 : 11, type: 'promedio', unidad: null, capacidad: null });
  return columns;
};

const widthOfColumns = (columns: PrintColumn[]) =>
  FIXED_WIDTH_MM + columns.reduce((sum, column) => sum + column.widthMm, 0);

const widthOfVariableColumns = (columns: PrintColumn[]) =>
  columns.reduce((sum, column) => sum + column.widthMm, 0);

const getMinimumColumnWidthMm = (column: PrintColumn) => {
  if (column.type === 'indicador') return 4.2;
  if (column.type === 'capacidad') return 5.2;
  if (column.type === 'efsrt') return 6.2;
  if (column.type === 'puntaje') return 6.2;
  return 6.8;
};

const getColumnContentWeight = (column: PrintColumn) => {
  const text = [
    column.unidad?.sigla,
    column.unidad?.nombre,
    column.capacidad?.descripcion,
    column.indicador?.descripcion,
    column.indicador?.sigla,
    column.type,
  ]
    .filter(Boolean)
    .join(' ');
  const metrics = getHeaderTextMetrics(text);
  return Math.max(1, metrics.length + metrics.maxWordLength * 1.5);
};

const shrinkColumnsToVariableWidth = (columns: PrintColumn[], targetVariableWidthMm: number) => {
  const currentVariableWidth = widthOfVariableColumns(columns);
  if (currentVariableWidth <= targetVariableWidthMm) return columns;

  const excessWidth = currentVariableWidth - targetVariableWidthMm;
  const shrinkable = columns.map((column) => {
    const minWidth = getMinimumColumnWidthMm(column);
    const room = Math.max(0, column.widthMm - minWidth);
    return {
      column,
      minWidth,
      room,
      weight: room / Math.sqrt(getColumnContentWeight(column)),
    };
  });
  const totalWeight = shrinkable.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return columns;

  return shrinkable.map(({ column, minWidth, weight }) => ({
    ...column,
    widthMm: Math.max(minWidth, column.widthMm - excessWidth * (weight / totalWeight)),
  }));
};

const buildPrintPage = (columns: PrintColumn[], contentWidthMm: number, tableHeaderHeightPx: number): PrintPage => {
  const variableWidth = widthOfVariableColumns(columns);
  const width = FIXED_WIDTH_MM + variableWidth;
  const availableVariableWidth = Math.max(1, contentWidthMm - FIXED_WIDTH_MM);

  return {
    columns,
    unscaledWidthMm: width,
    scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, availableVariableWidth / Math.max(1, variableWidth))),
    headerHeightPx: tableHeaderHeightPx,
  };
};

const buildColumnGroups = (columns: PrintColumn[]) => {
  const groups: PrintColumn[][] = [];
  let currentUnitId: number | null = null;
  let currentUnitColumns: PrintColumn[] = [];

  for (const column of columns) {
    if (!column.unidad) {
      if (currentUnitColumns.length > 0) {
        groups.push(currentUnitColumns);
        currentUnitColumns = [];
        currentUnitId = null;
      }
      groups.push([column]);
      continue;
    }

    if (currentUnitId == null || currentUnitId === column.unidad.id) {
      currentUnitId = column.unidad.id;
      currentUnitColumns.push(column);
      continue;
    }

    groups.push(currentUnitColumns);
    currentUnitId = column.unidad.id;
    currentUnitColumns = [column];
  }

  if (currentUnitColumns.length > 0) {
    groups.push(currentUnitColumns);
  }

  return groups;
};

const buildPrintPages = (columns: PrintColumn[], contentWidthMm: number, tableHeaderHeightPx: number) => {
  const columnGroups = buildColumnGroups(columns);
  if (columnGroups.length === 0) return [buildPrintPage(columns, contentWidthMm, tableHeaderHeightPx)];

  const availableVariableWidth = Math.max(1, contentWidthMm - FIXED_WIDTH_MM);
  const getLayoutScale = (layout: PrintColumn[][]) =>
    layout.reduce((minScale, pageColumns) => {
      const variableWidth = widthOfVariableColumns(pageColumns);
      return Math.min(minScale, Math.min(MAX_SCALE, availableVariableWidth / Math.max(1, variableWidth)));
    }, MAX_SCALE);

  let bestLayout: PrintColumn[][] = [columns];
  let bestScale = getLayoutScale(bestLayout);

  for (let splitIndex = 1; splitIndex < columnGroups.length; splitIndex += 1) {
    const layout = [
      columnGroups.slice(0, splitIndex).flat(),
      columnGroups.slice(splitIndex).flat(),
    ];
    const scale = getLayoutScale(layout);
    const improvesScale = scale > bestScale + 0.005;
    const tiesWithFewerPages = Math.abs(scale - bestScale) <= 0.005 && layout.length < bestLayout.length;
    if (improvesScale || tiesWithFewerPages) {
      bestLayout = layout;
      bestScale = scale;
    }
  }

  const maxUnscaledVariableWidth = Math.max(1, availableVariableWidth / MIN_SCALE);
  const normalizedLayout =
    bestScale >= MIN_SCALE
      ? bestLayout
      : bestLayout.map((pageColumns) => shrinkColumnsToVariableWidth(pageColumns, maxUnscaledVariableWidth));

  return normalizedLayout
    .slice(0, MAX_HORIZONTAL_PRINT_PAGES)
    .map((pageColumns) => buildPrintPage(pageColumns, contentWidthMm, tableHeaderHeightPx));
};

const groupConsecutive = <T,>(items: T[], getKey: (item: T) => string) => {
  const groups: Array<{ key: string; items: T[] }> = [];
  for (const item of items) {
    const key = getKey(item);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, items: [item] });
    }
  }
  return groups;
};

const chunkStudents = (students: Estudiante[], size: number) => {
  const chunks: Estudiante[][] = [];
  const chunkSize = Math.max(1, size);
  for (let index = 0; index < students.length; index += chunkSize) {
    chunks.push(students.slice(index, index + chunkSize));
  }
  return chunks.length > 0 ? chunks : [[]];
};

export default function RegistroAuxiliarPrintPage() {
  const searchParams = useSearchParams();
  const initialGrupoModuloId = searchParams.get('grupoModuloId') || '';
  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);
  const [grupos, setGrupos] = useState<GrupoOption[]>([]);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [semestreId, setSemestreId] = useState('');
  const [grupoModuloId, setGrupoModuloId] = useState(initialGrupoModuloId);
  const [registro, setRegistro] = useState<RegistroAuxiliar | null>(null);
  const [datosGenerales, setDatosGenerales] = useState<DatosGenerales | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scalePercent, setScalePercent] = useState(100);
  const [printOrientation, setPrintOrientation] = useState<PrintOrientation>('landscape');
  const [printMargins, setPrintMargins] = useState<PrintMarginsCm>(DEFAULT_PRINT_MARGINS_CM);
  const [showPageOverflow, setShowPageOverflow] = useState(false);
  const [measuredIndicatorWidths, setMeasuredIndicatorWidths] = useState<Record<string, number>>({});
  const [capacityColumnExtraWidths, setCapacityColumnExtraWidths] = useState<Record<string, number>>({});
  const printViewerRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarWidthRef = useRef(0);
  const capacityAdjustmentSignatureRef = useRef('');
  const capacityAdjustmentPassRef = useRef(0);
  const [floatingScrollbarWidth, setFloatingScrollbarWidth] = useState(0);
  const pageSizeMm = useMemo(() => getA4PageSizeMm(printOrientation), [printOrientation]);
  const contentWidthMm = useMemo(() => getPrintContentWidthMm(pageSizeMm, printMargins), [pageSizeMm, printMargins]);
  const contentHeightMm = useMemo(() => getPrintContentHeightMm(pageSizeMm, printMargins), [pageSizeMm, printMargins]);
  const printableHeightPx = useMemo(() => contentHeightMm / PX_TO_MM, [contentHeightMm]);

  useEffect(() => {
    document.title = 'Registro Auxiliar';
  }, []);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        if (auth.currentUser) await auth.currentUser.getIdToken(true);
        const listRegistroAuxiliarOpciones = httpsCallable<
          undefined,
          {
            grupos?: GrupoOption[];
            semestres?: SemestreOption[];
            datoGeneral?: DatosGenerales | null;
            datosGenerales?: DatosGenerales | null;
          }
        >(functions, 'listRegistroAuxiliarOpciones');
        const result = await listRegistroAuxiliarOpciones();
        if (!active) return;
        const nextGrupos = (result.data.grupos || [])
          .filter((grupo) => (grupo.grupoModulos || []).length > 0)
          .sort((a, b) => String(a.nombreDisplay ?? '').localeCompare(String(b.nombreDisplay ?? ''), 'es', { numeric: true }));
        setGrupos(nextGrupos);
        setSemestres(result.data.semestres || []);
        setDatosGenerales(result.data.datoGeneral || result.data.datosGenerales || null);
      } catch (err) {
        console.error('Error loading printable registro auxiliar options', err);
        if (active) setError('No se pudieron cargar los grupos para el visor imprimible.');
      } finally {
        if (active) setLoadingOptions(false);
      }
    };

    void loadOptions();
    return () => {
      active = false;
    };
  }, [auth, functions]);

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

  const filteredGrupoModuloOptions = useMemo(
    () =>
      semestreId
        ? grupoModuloOptions.filter((option) => String(option.grupo.semestreId ?? '') === semestreId)
        : [],
    [grupoModuloOptions, semestreId],
  );

  useEffect(() => {
    if (semestreId) return;
    if (!grupoModuloOptions.length) return;
    const current = grupoModuloOptions.find((option) => String(option.id) === grupoModuloId);
    if (current?.grupo.semestreId) {
      setSemestreId(String(current.grupo.semestreId));
      return;
    }
    const firstSemestre = semestreOptions[0];
    if (firstSemestre) setSemestreId(String(firstSemestre.id));
  }, [grupoModuloId, grupoModuloOptions, semestreId, semestreOptions]);

  useEffect(() => {
    if (!semestreId || !filteredGrupoModuloOptions.length) return;
    if (filteredGrupoModuloOptions.some((option) => String(option.id) === grupoModuloId)) return;
    setGrupoModuloId(String(filteredGrupoModuloOptions[0].id));
  }, [filteredGrupoModuloOptions, grupoModuloId, semestreId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!grupoModuloId) {
        setError('No se recibio el grupo-modulo para imprimir.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        if (auth.currentUser) await auth.currentUser.getIdToken(true);
        const getRegistroAuxiliar = httpsCallable<{ grupoModuloId: number }, RegistroAuxiliar>(
          functions,
          'getRegistroAuxiliar',
        );
        const getDatosGeneralesGlobales = httpsCallable<
          undefined,
          { datoGeneral?: DatosGenerales | null; datosGenerales?: DatosGenerales | null }
        >(
          functions,
          'getDatosGeneralesGlobales',
        );
        const [registroResult, datosResult] = await Promise.all([
          getRegistroAuxiliar({ grupoModuloId: Number(grupoModuloId) }),
          getDatosGeneralesGlobales(),
        ]);
        if (!active) return;
        setRegistro(registroResult.data);
        setDatosGenerales(datosResult.data.datoGeneral || datosResult.data.datosGenerales || null);
      } catch (err) {
        console.error('Error loading printable registro auxiliar', err);
        if (active) setError('No se pudo cargar el registro auxiliar imprimible.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [auth, functions, grupoModuloId]);

  const notas = useMemo(() => buildNotasMap(registro), [registro]);
  const efsrtPppNotas = useMemo(() => buildEfsrtPppMap(registro), [registro]);
  const usesOcupacionalRules = useMemo(() => usesOpcionOcupacionalRulesRegistro(registro), [registro]);
  const isProgramaEstudio = useMemo(() => isProgramaEstudioRegistro(registro), [registro]);
  const showEfsrtPpp = !usesOcupacionalRules;
  const basePrintColumns = useMemo(() => buildPrintColumns(registro, showEfsrtPpp, isProgramaEstudio), [isProgramaEstudio, registro, showEfsrtPpp]);
  const indicatorAdjustedColumns = useMemo(
    () =>
      basePrintColumns.map((column) => {
        const measuredWidth = measuredIndicatorWidths[column.key];
        if (column.type !== 'indicador' || !measuredWidth) return column;
        return { ...column, widthMm: measuredWidth };
      }),
    [basePrintColumns, measuredIndicatorWidths],
  );
  const printColumns = useMemo(
    () =>
      indicatorAdjustedColumns.map((column) => {
        const extraWidth = capacityColumnExtraWidths[column.key];
        if (column.type !== 'indicador' || !extraWidth) return column;
        return { ...column, widthMm: column.widthMm + extraWidth };
      }),
    [capacityColumnExtraWidths, indicatorAdjustedColumns],
  );

  useLayoutEffect(() => {
    const indicatorColumns = basePrintColumns.filter((column) => column.type === 'indicador');
    if (indicatorColumns.length === 0) {
      setMeasuredIndicatorWidths({});
      return;
    }

    const measureBox = document.createElement('div');
    measureBox.style.position = 'absolute';
    measureBox.style.left = '-10000px';
    measureBox.style.top = '-10000px';
    measureBox.style.visibility = 'hidden';
    measureBox.style.pointerEvents = 'none';
    measureBox.style.width = `${INDICATOR_TEXT_WIDTH_MM}mm`;
    measureBox.style.fontFamily = 'Arial, Helvetica, sans-serif';
    measureBox.style.fontSize = '6pt';
    measureBox.style.fontWeight = '500';
    measureBox.style.lineHeight = '1';
    measureBox.style.whiteSpace = 'normal';
    measureBox.style.overflowWrap = 'normal';
    measureBox.style.wordBreak = 'normal';
    measureBox.style.boxSizing = 'content-box';
    measureBox.style.padding = '0';
    measureBox.style.border = '0';
    document.body.appendChild(measureBox);

    const nextWidths: Record<string, number> = {};
    for (const column of indicatorColumns) {
      measureBox.textContent = column.indicador?.descripcion || column.indicador?.sigla || '';
      const measuredHeightPx = Math.max(measureBox.scrollHeight, measureBox.getBoundingClientRect().height);
      nextWidths[column.key] = clampNumber((measuredHeightPx + 10) * PX_TO_MM + 1.2, 7.5, 30);
    }

    setMeasuredIndicatorWidths((current) => {
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(nextWidths);
      const changed =
        currentKeys.length !== nextKeys.length ||
        nextKeys.some((key) => Math.abs((current[key] ?? 0) - nextWidths[key]) > 0.1);
      return changed ? nextWidths : current;
    });

    return () => {
      measureBox.remove();
    };
  }, [basePrintColumns]);

  const studentCount = registro?.estudiantes?.length ?? 0;
  const capacityHeaderHeightPx = getCapacityHeaderHeightPx(studentCount);
  const isAutoCapacityHeaderHeight = capacityHeaderHeightPx === null;
  const capacityHeaderReferenceHeightPx = capacityHeaderHeightPx ?? AUTO_CAPACITY_HEADER_REFERENCE_HEIGHT_PX;
  const capacityHeaderContentHeightPx = isAutoCapacityHeaderHeight
    ? null
    : getCapacityHeaderContentHeightPx(capacityHeaderHeightPx);
  const capacityHeaderMeasureHeightPx = isAutoCapacityHeaderHeight
    ? Number.POSITIVE_INFINITY
    : getCapacityHeaderMeasureHeightPx(capacityHeaderHeightPx);
  const tableHeaderHeightPx = getTableHeaderHeightPx(capacityHeaderReferenceHeightPx);
  const pages = useMemo(
    () => buildPrintPages(printColumns, contentWidthMm, tableHeaderHeightPx),
    [contentWidthMm, printColumns, tableHeaderHeightPx],
  );
  const autoScalePercent = useMemo(
    () => Math.round((pages.reduce((min, page) => Math.min(min, page.scale), MAX_SCALE)) * 100),
    [pages],
  );

  useEffect(() => {
    setScalePercent(Math.max(Math.round(MIN_SCALE * 100), Math.min(Math.round(MAX_SCALE * 100), autoScalePercent)));
  }, [autoScalePercent]);

  const currentScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scalePercent / 100));

  const updateFloatingScrollbar = useCallback(() => {
    const viewer = printViewerRef.current;
    if (!viewer) return;
    const nextWidth = viewer.scrollWidth;
    if (Math.abs(floatingScrollbarWidthRef.current - nextWidth) > 1) {
      floatingScrollbarWidthRef.current = nextWidth;
      setFloatingScrollbarWidth(nextWidth);
    }
    if (floatingScrollbarRef.current && floatingScrollbarRef.current.scrollLeft !== viewer.scrollLeft) {
      floatingScrollbarRef.current.scrollLeft = viewer.scrollLeft;
    }
  }, []);

  useLayoutEffect(() => {
    const viewer = printViewerRef.current;
    if (!viewer || loading || error) return;

    const frame = window.requestAnimationFrame(updateFloatingScrollbar);
    const resizeObserver = new ResizeObserver(updateFloatingScrollbar);
    resizeObserver.observe(viewer);
    if (viewer.firstElementChild) resizeObserver.observe(viewer.firstElementChild);
    window.addEventListener('resize', updateFloatingScrollbar);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateFloatingScrollbar);
    };
  }, [currentScale, error, loading, pages.length, registro?.estudiantes?.length, updateFloatingScrollbar]);

  const handleViewerScroll = () => {
    const viewer = printViewerRef.current;
    const floatingScrollbar = floatingScrollbarRef.current;
    if (!viewer || !floatingScrollbar) return;
    if (floatingScrollbar.scrollLeft !== viewer.scrollLeft) {
      floatingScrollbar.scrollLeft = viewer.scrollLeft;
    }
  };

  const handleFloatingScrollbarScroll = () => {
    const viewer = printViewerRef.current;
    const floatingScrollbar = floatingScrollbarRef.current;
    if (!viewer || !floatingScrollbar) return;
    if (viewer.scrollLeft !== floatingScrollbar.scrollLeft) {
      viewer.scrollLeft = floatingScrollbar.scrollLeft;
    }
  };

  const visualPages = useMemo<VisualPrintPage[]>(() => {
    const students = registro?.estudiantes || [];
    let pageCounter = 0;

    return pages.flatMap((page, horizontalPageIndex) => {
      const estimatedStudentsPerPage = Math.min(
        DEFAULT_STUDENTS_PER_PAGE,
        Math.max(
          1,
          Math.floor((printableHeightPx - MODULE_INFO_HEIGHT_PX - PAGE_NUMBER_HEIGHT_PX - tableHeaderHeightPx) / STUDENT_ROW_HEIGHT_PX),
        ),
      );
      const studentChunks = chunkStudents(students, estimatedStudentsPerPage);
      return studentChunks.map((chunk, verticalPageIndex) => ({
        ...page,
        headerHeightPx: tableHeaderHeightPx,
        students: chunk,
        pageIndex: pageCounter++,
        horizontalPageIndex,
        verticalPageIndex,
        verticalPageCount: studentChunks.length,
        studentStartIndex: verticalPageIndex * estimatedStudentsPerPage,
      }));
    });
  }, [pages, printableHeightPx, registro?.estudiantes, tableHeaderHeightPx]);

  useLayoutEffect(() => {
    const capacidadGroups = groupConsecutive(
      indicatorAdjustedColumns.filter((column) => column.capacidad),
      (column) => String(column.capacidad?.id ?? column.key),
    );

    const signature = [
      grupoModuloId,
      contentWidthMm.toFixed(2),
      capacityHeaderHeightPx ?? 'auto',
      indicatorAdjustedColumns.map((column) => `${column.key}:${column.widthMm.toFixed(2)}`).join(','),
    ].join('|');

    if (capacityAdjustmentSignatureRef.current !== signature) {
      capacityAdjustmentSignatureRef.current = signature;
      capacityAdjustmentPassRef.current = 0;
      if (Object.keys(capacityColumnExtraWidths).length > 0) {
        setCapacityColumnExtraWidths({});
        return;
      }
    }

    if (isAutoCapacityHeaderHeight) {
      setCapacityColumnExtraWidths((current) => (Object.keys(current).length > 0 ? {} : current));
      return;
    }

    if (capacidadGroups.length === 0) {
      setCapacityColumnExtraWidths((current) => (Object.keys(current).length > 0 ? {} : current));
      return;
    }

    if (capacityAdjustmentPassRef.current >= 4) return;

    const measureBox = document.createElement('div');
    measureBox.style.position = 'absolute';
    measureBox.style.left = '-10000px';
    measureBox.style.top = '-10000px';
    measureBox.style.visibility = 'hidden';
    measureBox.style.pointerEvents = 'none';
    measureBox.style.fontFamily = 'Arial, Helvetica, sans-serif';
    measureBox.style.fontSize = '6.7pt';
    measureBox.style.fontWeight = '500';
    measureBox.style.lineHeight = '1';
    measureBox.style.whiteSpace = 'normal';
    measureBox.style.overflowWrap = 'normal';
    measureBox.style.wordBreak = 'normal';
    measureBox.style.boxSizing = 'border-box';
    measureBox.style.padding = '0';
    measureBox.style.border = '0';
    document.body.appendChild(measureBox);

    const fitsCapacityText = (text: string, widthPx: number) => {
      measureBox.style.width = `${Math.max(1, widthPx)}px`;
      measureBox.textContent = text;
      return measureBox.scrollHeight <= capacityHeaderMeasureHeightPx + 0.5;
    };

    const findRequiredCapacityContentWidthPx = (text: string, initialWidthPx: number) => {
      if (!text.trim()) return initialWidthPx;
      if (fitsCapacityText(text, initialWidthPx)) return initialWidthPx;

      let low = initialWidthPx;
      let high = Math.max(low + 1, low * 1.25);
      for (let index = 0; index < 12 && !fitsCapacityText(text, high); index += 1) {
        low = high;
        high *= 1.25;
      }

      for (let index = 0; index < 12; index += 1) {
        const mid = (low + high) / 2;
        if (fitsCapacityText(text, mid)) {
          high = mid;
        } else {
          low = mid;
        }
      }

      return high;
    };

    const nextExtraWidths: Record<string, number> = {};
    for (const group of capacidadGroups) {
      const text = group.items[0].capacidad?.descripcion || '';
      if (!text.trim()) continue;

      const indicatorColumns = group.items.filter((column) => column.type === 'indicador');
      if (indicatorColumns.length === 0) continue;

      const currentGroupWidthMm = group.items.reduce((sum, column) => sum + column.widthMm, 0);
      const currentContentWidthMm = Math.max(1, currentGroupWidthMm * currentScale - CAPACITY_HEADER_HORIZONTAL_PADDING_MM * 1.8);
      const requiredContentWidthPx = findRequiredCapacityContentWidthPx(text, currentContentWidthMm / PX_TO_MM);
      const requiredGroupWidthMm = requiredContentWidthPx * PX_TO_MM + CAPACITY_HEADER_HORIZONTAL_PADDING_MM * 1.8;
      const desiredUnscaledGroupWidthMm = requiredGroupWidthMm / currentScale;
      const extraGroupWidthMm = clampNumber(Math.max(0, desiredUnscaledGroupWidthMm - currentGroupWidthMm) * 1.18, 0, 90);
      if (extraGroupWidthMm <= 0.05) continue;

      const weights = indicatorColumns.map((column) => {
        const label = column.indicador?.descripcion || column.indicador?.sigla || '';
        const metrics = getHeaderTextMetrics(label);
        return Math.max(1, metrics.length + metrics.maxWordLength * 0.5);
      });
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || indicatorColumns.length;

      indicatorColumns.forEach((column, index) => {
        nextExtraWidths[column.key] = (nextExtraWidths[column.key] || 0) + extraGroupWidthMm * (weights[index] / totalWeight);
      });
    }

    measureBox.remove();

    setCapacityColumnExtraWidths((current) => {
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(nextExtraWidths);
      const changed =
        currentKeys.length !== nextKeys.length ||
        nextKeys.some((key) => Math.abs((current[key] ?? 0) - nextExtraWidths[key]) > 0.1);
      if (changed) capacityAdjustmentPassRef.current += 1;
      return changed ? nextExtraWidths : current;
    });
  }, [
    capacityColumnExtraWidths,
    capacityHeaderHeightPx,
    capacityHeaderMeasureHeightPx,
    contentWidthMm,
    currentScale,
    grupoModuloId,
    indicatorAdjustedColumns,
    isAutoCapacityHeaderHeight,
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

  const renderModuloInfo = (page: PrintPage) => (
    <Box
      className="registro-print-info"
      sx={{
        width: `${contentWidthMm}mm`,
        gridTemplateColumns: '42mm minmax(0, 1fr) 39mm minmax(0, 1fr)',
      }}
    >
      <Box className="print-title" sx={{ gridColumn: '1 / -1' }}>
        REGISTRO AUXILIAR DE EVALUACION {registro?.grupo?.semestre?.titulo || ''}
      </Box>
      <Box className="print-label">CETPRO</Box>
      <Box>{datosGenerales?.nombreInstitucion || 'San Martin De Porres'}</Box>
      <Box className="print-label">DOCENTE</Box>
      <Box>{getPersonalName(registro?.grupo ?? null).toUpperCase()}</Box>
      <Box className="print-label">{getTipoCarreraRegistroLabel(registro)}</Box>
      <Box>{getPlanEstudioName(registro).toUpperCase()}</Box>
      <Box className="print-label">INICIO / TERMINO</Box>
      <Box>{[formatDateOnly(registro?.grupoModulo?.inicio), formatDateOnly(registro?.grupoModulo?.fin)].filter(Boolean).join(' al ')}</Box>
      <Box className="print-label">MODULO</Box>
      <Box>{getModuloName(registro).toUpperCase()}</Box>
      <Box className="print-label">TURNO</Box>
      <Box>{getTurnoHorarioName(registro?.grupo ?? null)}</Box>
      <Box className="print-label">DURACION</Box>
      <Box>{registro?.grupoModulo?.modulo?.horas ? `${registro.grupoModulo.modulo.horas} horas` : ''}</Box>
      <Box className="print-label">CICLO</Box>
      <Box>{getModuloCiclo(registro).toUpperCase()}</Box>
    </Box>
  );

  const renderColumnHeaderRows = (page: PrintPage, studentWidthMm: number) => {
    const unitGroups = groupConsecutive(
      page.columns.filter((column) => column.unidad),
      (column) => String(column.unidad?.id ?? column.key),
    );
    const capacidadGroups = groupConsecutive(
      page.columns.filter((column) => column.capacidad),
      (column) => String(column.capacidad?.id ?? column.key),
    );
    const standAloneColumns = page.columns.filter((column) => !column.unidad);

    return (
      <thead>
        <tr>
          <th
            rowSpan={3}
            className="fixed-header"
            style={{ width: `${FIXED_COLUMNS[0].widthMm}mm`, height: isAutoCapacityHeaderHeight ? undefined : page.headerHeightPx }}
          >
            Nro.
          </th>
          <th
            rowSpan={3}
            className="fixed-header"
            style={{ width: `${studentWidthMm}mm`, height: isAutoCapacityHeaderHeight ? undefined : page.headerHeightPx }}
          >
            Apellidos y Nombres
          </th>
          {unitGroups.map((group) => (
            <th key={`unit-${group.key}`} colSpan={group.items.length} className="unit-header" style={{ height: UNIT_HEADER_HEIGHT_PX }}>
              {group.items[0].unidad?.sigla || group.items[0].unidad?.nombre || ''}
            </th>
          ))}
          {standAloneColumns.map((column) => (
            <th
              key={`top-${column.key}`}
              rowSpan={3}
              className="summary-header vertical-header"
              style={{ height: isAutoCapacityHeaderHeight ? undefined : page.headerHeightPx }}
            >
              <span>{column.type === 'efsrt' ? 'EFSRT/PPP' : column.type === 'puntaje' ? 'Puntaje' : isProgramaEstudio ? 'Promedio General' : 'Promedio'}</span>
            </th>
          ))}
        </tr>
        <tr>
          {capacidadGroups.map((group) => (
            <th
              key={`cap-${group.key}`}
              colSpan={group.items.length}
              className="capacity-header"
              style={{ height: capacityHeaderHeightPx ?? undefined }}
            >
              <span className="capacity-header-content">{group.items[0].capacidad?.descripcion || ''}</span>
            </th>
          ))}
        </tr>
        <tr>
          {page.columns.filter((column) => column.capacidad).map((column) => (
            <th
              key={`leaf-${column.key}`}
              className={column.type === 'capacidad' ? 'capacity-grade-header vertical-header' : 'indicator-header'}
              style={{
                height: INDICATOR_HEADER_HEIGHT_PX,
                '--indicator-text-width': `${column.headerTextWidthMm ?? 30}mm`,
              } as CSSProperties}
            >
              {column.type === 'capacidad' ? (
                <span>{isProgramaEstudio ? 'PROMEDIO' : 'LOGRO'}</span>
              ) : (
                <span>{column.indicador?.descripcion || column.indicador?.sigla || ''}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
    );
  };

  const renderStudentCell = (student: Estudiante, column: PrintColumn) => {
    if (column.type === 'indicador' && column.indicador) {
      const value = getNotaValue(student.matriculaId, column.indicador.id);
      return <td key={`${student.id}-${column.key}`} className="grade-cell" style={{ color: gradeColor(value) }}>{displayGrade(value)}</td>;
    }
    if (column.type === 'capacidad' && column.capacidad) {
      const value = getCapacidadAverage(student.matriculaId, column.capacidad);
      return <td key={`${student.id}-${column.key}`} className="grade-cell calculated-cell" style={{ color: gradeColor(value) }}>{displayGrade(value)}</td>;
    }
    if (column.type === 'efsrt') {
      const value = getEfsrtPppAverage(student);
      return <td key={`${student.id}-${column.key}`} className="grade-cell calculated-cell" style={{ color: gradeColor(value) }}>{displayGrade(value)}</td>;
    }
    if (column.type === 'puntaje') {
      return <td key={`${student.id}-${column.key}`} className="grade-cell total-cell">{displayNumber(getModuloPuntaje(student))}</td>;
    }
    const averageValue = getModuloAverage(student);
    return <td key={`${student.id}-${column.key}`} className="grade-cell total-cell" style={{ color: gradeColor(averageValue) }}>{displayGrade(averageValue)}</td>;
  };

  const renderPage = (page: VisualPrintPage) => {
    const nroWidthMm = FIXED_COLUMNS[0].widthMm;
    const studentBaseWidthMm = FIXED_COLUMNS[1].widthMm;
    const scaledColumnWidths = page.columns.map((column) => column.widthMm * currentScale);
    const stretchableBaseWidthMm = studentBaseWidthMm + scaledColumnWidths.reduce((sum, width) => sum + width, 0);
    const freeWidthMm = Math.max(0, contentWidthMm - nroWidthMm - stretchableBaseWidthMm);
    const stretchFactor = stretchableBaseWidthMm > 0 ? freeWidthMm / stretchableBaseWidthMm : 0;
    const studentWidthMm = studentBaseWidthMm * (1 + stretchFactor);
    const columnWidthsMm = scaledColumnWidths.map((width) => width * (1 + stretchFactor));
    const tableWidthMm = nroWidthMm + studentWidthMm + columnWidthsMm.reduce((sum, width) => sum + width, 0);

    return (
      <Box className="print-page" key={`page-${page.pageIndex}`}>
        <Box className="print-page-inner">
          {renderModuloInfo(page)}
          <table className="registro-print-table" style={{ width: `${tableWidthMm}mm` }}>
            <colgroup>
              <col key={FIXED_COLUMNS[0].key} style={{ width: `${nroWidthMm}mm` }} />
              <col key={FIXED_COLUMNS[1].key} style={{ width: `${studentWidthMm}mm` }} />
              {page.columns.map((column, index) => <col key={column.key} style={{ width: `${columnWidthsMm[index]}mm` }} />)}
            </colgroup>
            {renderColumnHeaderRows(page, studentWidthMm)}
            <tbody>
              {page.students.map((student, index) => (
                <tr key={student.id}>
                  <td className="nro-cell">{page.studentStartIndex + index + 1}</td>
                  <td className="student-cell">{getStudentName(student)}</td>
                  {page.columns.map((column) => renderStudentCell(student, column))}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
        {visualPages.length > 1 ? (
          <Box className="print-page-number">
            Pagina {page.pageIndex + 1} de {visualPages.length}
          </Box>
        ) : null}
      </Box>
    );
  };

  const toolbarFilters = (
    <>
      <FormControl size="small" sx={{ width: { xs: '100%', md: 120 }, flexShrink: 0 }} disabled={loadingOptions || !semestreOptions.length}>
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
      <FormControl size="small" sx={{ width: { xs: '100%', md: 'auto' }, minWidth: { md: 220 }, flexShrink: 0 }} disabled={loadingOptions || !semestreId || !filteredGrupoModuloOptions.length}>
        <InputLabel>Grupo-Modulo</InputLabel>
        <Select
          label="Grupo-Modulo"
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
  );

  return (
    <PrintDocumentViewer
      title="Registro Auxiliar"
      orientation={printOrientation}
      onOrientationChange={setPrintOrientation}
      margins={printMargins}
      onMarginsChange={setPrintMargins}
      showPageOverflow={showPageOverflow}
      onShowPageOverflowChange={setShowPageOverflow}
      scalePercent={scalePercent}
      onScalePercentChange={setScalePercent}
      minScalePercent={55}
      maxScalePercent={100}
      filters={toolbarFilters}
      loading={loading}
      error={error}
      canPrint={Boolean(registro)}
      pageSizeMm={pageSizeMm}
      viewerRef={printViewerRef}
      onViewerScroll={handleViewerScroll}
      floatingScrollbarRef={floatingScrollbarRef}
      onFloatingScrollbarScroll={handleFloatingScrollbarScroll}
      floatingScrollbarWidth={floatingScrollbarWidth}
      contentMinWidthMm={pageSizeMm.width}
    >
      <GlobalStyles
        styles={{
          '@media print': {
            '.MuiTooltip-popper, [role="tooltip"]': {
              display: 'none !important',
            },
            '.print-viewer': {
              overflow: 'visible !important',
              padding: '0 !important',
            },
            '.print-viewer-inner': {
              minWidth: '0 !important',
              width: 'auto !important',
            },
            '.print-page': {
              width: `${contentWidthMm}mm !important`,
              height: `${contentHeightMm}mm !important`,
              pageBreakAfter: 'always',
              breakAfter: 'page',
              boxShadow: 'none !important',
              margin: '0 !important',
              padding: '0 !important',
              boxSizing: 'border-box',
              overflow: `${showPageOverflow ? 'visible' : 'hidden'} !important`,
            },
            '.print-page:last-child': {
              pageBreakAfter: 'auto',
              breakAfter: 'auto',
            },
            '.print-page-inner': {
              padding: '0 !important',
              outline: 'none !important',
              overflow: `${showPageOverflow ? 'visible' : 'hidden'} !important`,
            },
          },
          '.print-page': {
            width: `${pageSizeMm.width}mm`,
            height: `${pageSizeMm.height}mm`,
            position: 'relative',
            marginLeft: 'auto',
            marginRight: 'auto',
            backgroundColor: '#fff',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
            marginBottom: '18px',
            padding: `${cmToMm(printMargins.top)}mm ${cmToMm(printMargins.right)}mm ${cmToMm(printMargins.bottom)}mm ${cmToMm(printMargins.left)}mm`,
            boxSizing: 'border-box',
            overflow: showPageOverflow ? 'visible' : 'hidden',
          },
          '.print-page-inner': {
            width: `${contentWidthMm}mm`,
            height: `${contentHeightMm}mm`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            outline: '1px dashed #c8d2df',
            outlineOffset: '0',
            overflow: showPageOverflow ? 'visible' : 'hidden',
          },
          '.registro-print-info': {
            display: 'grid',
            borderTop: '1px solid #2d2d2d',
            borderLeft: '1px solid #2d2d2d',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '8pt',
            lineHeight: 1.05,
            color: '#111',
          },
          '.registro-print-info > div': {
            borderRight: '1px solid #2d2d2d',
            borderBottom: '1px solid #2d2d2d',
            minHeight: '4.4mm',
            paddingLeft: '1mm',
            paddingRight: '1mm',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
          },
          '.registro-print-info .print-title': {
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '10pt',
            minHeight: '5.4mm',
          },
          '.print-label': {
            fontWeight: 800,
            background: '#fff',
          },
          '.registro-print-table': {
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'fixed',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '8pt',
            lineHeight: 1.04,
            color: '#111',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
          },
          '.registro-print-table th, .registro-print-table td': {
            borderRight: '1px solid #2d2d2d',
            borderBottom: '1px solid #2d2d2d',
            padding: '0.45mm 0.7mm',
            overflow: 'hidden',
            verticalAlign: 'middle',
          },
          '.registro-print-table tr > *:first-child': { borderLeft: '1px solid #2d2d2d' },
          '.registro-print-table thead tr:first-child > th': { borderTop: '1px solid #2d2d2d' },
          '.registro-print-table th': { textAlign: 'center', fontWeight: 800 },
          '.fixed-header': { background: '#dbeaf7' },
          '.unit-header': { background: '#eef6ff', fontSize: '7.4pt', lineHeight: 1 },
          '.capacity-header': {
            background: '#fff',
            fontWeight: 500,
            fontSize: '6.7pt',
            lineHeight: 1,
            height: capacityHeaderHeightPx === null ? undefined : `${capacityHeaderHeightPx}px !important`,
            maxHeight: capacityHeaderHeightPx === null ? undefined : `${capacityHeaderHeightPx}px`,
            overflow: capacityHeaderHeightPx === null ? 'visible' : 'hidden',
          },
          '.capacity-header-content': {
            display: 'block',
            maxHeight: capacityHeaderContentHeightPx === null ? undefined : `${capacityHeaderContentHeightPx}px`,
            overflow: capacityHeaderContentHeightPx === null ? 'visible' : 'hidden',
          },
          '.indicator-header': { position: 'relative', padding: '0 !important', background: '#fff' },
          '.indicator-header span': {
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 'var(--indicator-text-width, 30mm)',
            whiteSpace: 'normal',
            textAlign: 'center',
            transform: 'translate(-50%, -50%) rotate(-90deg)',
            transformOrigin: 'center',
            fontWeight: 500,
            fontSize: '6pt',
            lineHeight: 1,
          },
          '.vertical-header': { background: '#d9ead3', padding: '0 !important', position: 'relative' },
          '.vertical-header span': {
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '28mm',
            transform: 'translate(-50%, -50%) rotate(-90deg)',
            transformOrigin: 'center',
            textAlign: 'center',
            fontWeight: 800,
            fontSize: '6.6pt',
            lineHeight: 1,
          },
          '.summary-header, .total-cell': { background: '#c6e0b4' },
          '.capacity-grade-header, .calculated-cell': { background: '#d9ead3' },
          '.registro-print-table tbody td': {
            height: `${STUDENT_ROW_HEIGHT_PX}px`,
            paddingTop: '0.2mm',
            paddingBottom: '0.2mm',
          },
          '.nro-cell, .grade-cell': { textAlign: 'center' },
          '.student-cell': { whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
          '.grade-cell': { fontWeight: 700 },
          '.print-page-number': {
            position: 'absolute',
            top: `${Math.max(1, cmToMm(printMargins.top) / 2 - 2)}mm`,
            right: `${Math.max(2, cmToMm(printMargins.right))}mm`,
            textAlign: 'right',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '7pt',
            color: '#555',
            lineHeight: 1,
          },
          '.print-viewer': { scrollbarWidth: 'none' },
          '.print-viewer::-webkit-scrollbar': { display: 'none' },
        }}
      />
      {visualPages.map((page) => renderPage(page))}
    </PrintDocumentViewer>
  );
}
