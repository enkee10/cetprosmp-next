'use client';

import { useAppSettings } from '@/hooks/useAppSettings';

import { CSSProperties, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, FormControl, GlobalStyles, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useSearchParams } from 'next/navigation';
import { app } from '@/lib/firebase';
import { formatDateOnly } from '@/lib/dateOnly';
import { useRegistroPrintLayout } from '@/hooks/useRegistroPrintLayout';
import { PRINT_PX_TO_MM, REGISTRO_PRINT_SIZES, type RegistroPrintPage } from '@/lib/registroPrintLayout';
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

type PrintColumn = {
  key: string;
  widthMm: number;
  type: 'indicador' | 'unidad' | 'efsrt' | 'puntaje' | 'promedio';
  unidad: Unidad | null;
  capacidad: Capacidad | null;
  indicador?: Indicador | null;
};

type PrintPage = RegistroPrintPage<PrintColumn>;

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
  { key: 'nro', widthMm: REGISTRO_PRINT_SIZES.numberMm },
  { key: 'estudiante', widthMm: REGISTRO_PRINT_SIZES.studentMm },
];
const STUDENT_ROW_HEIGHT_PX = 14;
const MODULE_INFO_HEIGHT_PX = 84;
const PAGE_NUMBER_HEIGHT_PX = 18;
const UNIT_HEADER_HEIGHT_PX = REGISTRO_PRINT_SIZES.unitHeightPx;
const PX_TO_MM = PRINT_PX_TO_MM;
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

const capacityCode = (capacidad: Capacidad | null | undefined, unidad: Unidad | null | undefined) =>
  `${capacidad?.codigo?.replace(/:$/, '') || `C${Math.max(0, unidad?.capacidadesTerminales.findIndex(item => item.id === capacidad?.id) ?? 0) + 1}`}:`;

const indicatorCode = (indicador: Indicador | null | undefined, capacidad: Capacidad | null | undefined) =>
  `${indicador?.codigo?.replace(/:$/, '') || `I${Math.max(0, capacidad?.indicadoresCapacidad.findIndex(item => item.id === indicador?.id) ?? 0) + 1}`}:`;

const unitLabel = (unidad: Unidad | null | undefined) =>
  (unidad?.nombre || unidad?.sigla || '').trim().toLocaleUpperCase('es-PE');

const printIndicatorLabel = (column: PrintColumn) => ({
  code: indicatorCode(column.indicador, column.capacidad),
  text: column.indicador?.descripcion || column.indicador?.sigla || '',
});
const printCapacityLabel = (column: PrintColumn) => ({
  code: capacityCode(column.capacidad, column.unidad),
  text: column.capacidad?.descripcion || '',
});

const buildPrintColumns = (registro: RegistroAuxiliar | null, showEfsrtPpp: boolean, isProgramaEstudio: boolean) => {
  const columns: PrintColumn[] = [];
  for (const unidad of registro?.estructura || []) {
    for (const capacidad of unidad.capacidadesTerminales || []) {
      for (const indicador of capacidad.indicadoresCapacidad || []) {
        columns.push({ key: `indicator-${indicador.id}`, widthMm: REGISTRO_PRINT_SIZES.minimumIndicatorMm, type: 'indicador', unidad, capacidad, indicador });
      }
    }
    columns.push({ key: `unidad-${unidad.id}`, widthMm: REGISTRO_PRINT_SIZES.averageMm, type: 'unidad', unidad, capacidad: null });
  }
  if (showEfsrtPpp) columns.push({ key: 'efsrt-ppp', widthMm: REGISTRO_PRINT_SIZES.efsrtMm, type: 'efsrt', unidad: null, capacidad: null });
  if (!isProgramaEstudio) columns.push({ key: 'puntaje', widthMm: REGISTRO_PRINT_SIZES.scoreMm, type: 'puntaje', unidad: null, capacidad: null });
  columns.push({ key: 'promedio-general', widthMm: REGISTRO_PRINT_SIZES.averageMm, type: 'promedio', unidad: null, capacidad: null });
  return columns;
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
  const { settings, loading: loadingSettings } = useAppSettings();
  const searchParams = useSearchParams();
  const initialGrupoModuloId = searchParams.get('grupoModuloId') || '';
  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);
  const [grupos, setGrupos] = useState<GrupoOption[]>([]);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [semestreId, setSemestreId] = useState(() => initialGrupoModuloId ? '' : String(settings.general.semestreActualId ?? ''));
  const [grupoModuloId, setGrupoModuloId] = useState(initialGrupoModuloId);
  const [registro, setRegistro] = useState<RegistroAuxiliar | null>(null);
  const [datosGenerales, setDatosGenerales] = useState<DatosGenerales | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printOrientation, setPrintOrientation] = useState<PrintOrientation>('landscape');
  const [printMargins, setPrintMargins] = useState<PrintMarginsCm>(DEFAULT_PRINT_MARGINS_CM);
  const [showPageOverflow, setShowPageOverflow] = useState(false);
  const printViewerRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarRef = useRef<HTMLDivElement | null>(null);
  const floatingScrollbarWidthRef = useRef(0);
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
      if (loadingSettings) return;
      setLoadingOptions(true);
      try {
        if (auth.currentUser) await auth.currentUser.getIdToken();
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
  }, [auth, functions, loadingSettings]);

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
    setSemestreId(String(settings.general.semestreActualId ?? ''));
  }, [grupoModuloId, grupoModuloOptions, semestreId, settings.general.semestreActualId]);

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
  const pages = useRegistroPrintLayout(basePrintColumns, contentWidthMm, printIndicatorLabel, printCapacityLabel, usesOcupacionalRules ? 1 : 2);
  const [measuredPageHeights, setMeasuredPageHeights] = useState<Record<number, { info: number; header: number; row: number }>>({});

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
  }, [error, loading, pages, registro?.estudiantes?.length, updateFloatingScrollbar]);

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
      const measured = measuredPageHeights[horizontalPageIndex];
      const studentsPerPage = Math.max(1, Math.floor((printableHeightPx
        - (measured?.info ?? MODULE_INFO_HEIGHT_PX)
        - Math.max(measured?.header ?? 0, page.headerHeightPx)
        - PAGE_NUMBER_HEIGHT_PX - 2) / (measured?.row ?? STUDENT_ROW_HEIGHT_PX)));
      const studentChunks = chunkStudents(students, studentsPerPage);
      return studentChunks.map((chunk, verticalPageIndex) => ({
        ...page, students: chunk, pageIndex: pageCounter++, horizontalPageIndex, verticalPageIndex,
        verticalPageCount: studentChunks.length, studentStartIndex: verticalPageIndex * studentsPerPage,
      }));
    });
  }, [pages, printableHeightPx, registro?.estudiantes, measuredPageHeights]);

  useLayoutEffect(() => {
    const viewer = printViewerRef.current;
    if (!viewer || loading || error) return;
    const measure = () => {
      const next: Record<number, { info: number; header: number; row: number }> = {};
      viewer.querySelectorAll<HTMLElement>('[data-print-horizontal-page]').forEach(page => {
        const index = Number(page.dataset.printHorizontalPage);
        if (next[index]) return;
        const info = page.querySelector('.registro-print-info');
        const header = page.querySelector('thead');
        const rows = [...page.querySelectorAll('tbody tr')];
        if (!info || !header) return;
        next[index] = {
          info: info.getBoundingClientRect().height,
          header: header.getBoundingClientRect().height,
          row: Math.max(STUDENT_ROW_HEIGHT_PX, ...rows.map(row => row.getBoundingClientRect().height)),
        };
      });
      setMeasuredPageHeights(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    viewer.querySelectorAll('.registro-print-info, thead, tbody tr:first-child').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [visualPages, loading, error]);

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
    const standAloneColumns = page.columns.filter((column) => !column.unidad);

    return (
      <thead>
        <tr>
          <th
            rowSpan={3}
            className="fixed-header"
            style={{ width: `${FIXED_COLUMNS[0].widthMm}mm`, height: page.headerHeightPx }}
          >
            Nro.
          </th>
          <th
            rowSpan={3}
            className="fixed-header"
            style={{ width: `${studentWidthMm}mm`, height: page.headerHeightPx }}
          >
            Apellidos y Nombres
          </th>
          {unitGroups.map((group) => (
            <th key={`unit-${group.key}`} colSpan={group.items.length} className="unit-header" style={{ height: UNIT_HEADER_HEIGHT_PX }}>
              {unitLabel(group.items[0].unidad)}
            </th>
          ))}
          {standAloneColumns.map((column) => (
            <th
              key={`top-${column.key}`}
              rowSpan={3}
              className="summary-header vertical-header"
              style={{ height: page.headerHeightPx }}
            >
              <span>{column.type === 'efsrt' ? 'EFSRT/PPP' : column.type === 'puntaje' ? 'Puntaje' : isProgramaEstudio ? 'Promedio General' : 'Promedio'}</span>
            </th>
          ))}
        </tr>
        <tr>
          {unitGroups.flatMap(unitGroup => [
            ...groupConsecutive(unitGroup.items.filter(column => column.capacidad), column => String(column.capacidad!.id)).map((group) => (
            <th
              key={`cap-${group.key}`}
              colSpan={group.items.length}
              className="capacity-header"
              style={{ height: page.capacityHeightPx }}
            >
              <span className="capacity-header-content"><strong>{capacityCode(group.items[0].capacidad, group.items[0].unidad)}</strong>{' '}{group.items[0].capacidad?.descripcion}</span>
            </th>
          )),
            <th key={`unit-average-${unitGroup.key}`} data-registro-unit-average={unitGroup.key} rowSpan={2}
              className="unit-grade-header vertical-header" style={{ height: page.capacityHeightPx + page.indicatorHeightPx }}>
              <span>PROMEDIO UNIDAD</span>
            </th>,
          ])}
        </tr>
        <tr>
          {page.columns.filter((column) => column.type === 'indicador').map((column) => (
            <th
              key={`leaf-${column.key}`}
              className="indicator-header"
              style={{
                height: page.indicatorHeightPx,
              } as CSSProperties}
            >
              <span><strong>{indicatorCode(column.indicador, column.capacidad)}</strong>{' '}{column.indicador?.descripcion || column.indicador?.sigla}</span>
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
    if (column.type === 'unidad' && column.unidad) {
      const value = getUnidadAverage(student.matriculaId, column.unidad);
      return <td key={`${student.id}-${column.key}`} data-registro-unit-average-key={`${student.matriculaId}:${column.unidad.id}`} className="grade-cell calculated-cell" style={{ color: gradeColor(value) }}>{displayGrade(value)}</td>;
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
    const studentWidthMm = FIXED_COLUMNS[1].widthMm;
    const columnWidthsMm = page.columns.map(column => column.widthMm);
    const tableWidthMm = page.widthMm;

    return (
      <Box className="print-page" key={`page-${page.pageIndex}`}
        data-print-horizontal-page={page.horizontalPageIndex} data-print-vertical-page={page.verticalPageIndex}
        style={{ '--capacity-header-height': `${page.capacityHeightPx}px`, '--indicator-text-width': `${(page.indicatorHeightPx - 10) * PX_TO_MM}mm` } as CSSProperties}>
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
          '.registro-print-info, .registro-print-table': { flexShrink: 0 },
          '.registro-print-table th, .registro-print-table td': {
            boxSizing: 'border-box',
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
            height: 'var(--capacity-header-height)',
            maxHeight: 'var(--capacity-header-height)',
            padding: '2px 0.7mm !important',
            overflow: 'hidden',
          },
          '.capacity-header-content': {
            display: 'block', fontWeight: 400, whiteSpace: 'normal', overflowWrap: 'anywhere',
            maxHeight: 'calc(var(--capacity-header-height) - 5px)', overflow: 'hidden',
          },
          '.indicator-header': { position: 'relative', padding: '0 !important', background: '#fff' },
          '.indicator-header span': {
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 'var(--indicator-text-width, 30mm)',
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            textAlign: 'center',
            transform: 'translate(-50%, -50%) rotate(-90deg)',
            transformOrigin: 'center',
            fontWeight: 400,
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
          '.unit-grade-header, .calculated-cell': { background: '#d9ead3' },
          '.registro-print-table tbody td': {
            height: `${STUDENT_ROW_HEIGHT_PX}px`,
            paddingTop: '0.2mm',
            paddingBottom: '0.2mm',
          },
          '.nro-cell, .grade-cell': { textAlign: 'center' },
          '.student-cell': { whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
          '.grade-cell': { fontWeight: 700 },
          '.capacity-header-content strong, .indicator-header strong': { fontWeight: 700 },
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
