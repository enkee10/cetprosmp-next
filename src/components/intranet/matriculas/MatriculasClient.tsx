'use client';

import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  ListItemText,
  Menu,
  MenuItem,
  OutlinedInput,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ClearIcon from '@mui/icons-material/Clear';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  GridColDef,
  GridColumnVisibilityModel,
  GridPaginationModel,
} from '@mui/x-data-grid';
import type { SelectChangeEvent } from '@mui/material/Select';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { functions, storage } from '@/lib/firebase';
import { formatDateOnly, getDateOnlyLocalDate } from '@/lib/dateOnly';
import FormLoadingOverlay from '@/components/FormLoadingOverlay';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import Modal1 from '@/components/Modal1';
import { useAuth } from '@/context/AuthContext';
import { useAppSettings, type AppSettings } from '@/hooks/useAppSettings';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';
import UserForm from '@/components/intranet/users/UserForm';

interface SemestreOption {
  id: number;
  titulo?: string | null;
  nombre?: string | null;
  anioTitulo?: string | null;
  inicio?: string | null;
  fin?: string | null;
  placeholder?: boolean;
}

function getConfiguredMatriculaSemestreIds(settings: AppSettings) {
  return Array.from(new Set(settings.general.semestresConsultaIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)));
}

function getCurrentMatriculaSemestreId(settings: AppSettings) {
  const currentId = Number(settings.general.semestreActualId);
  return Number.isFinite(currentId) && currentId > 0 ? String(currentId) : '';
}

function buildPlaceholderSemestreOptions(ids: number[]): SemestreOption[] {
  return ids.map((id) => ({ id, titulo: `Semestre ${id}`, placeholder: true }));
}

function buildDisplayedSemestreIds(currentSemestreId: string, configuredIds: number[]) {
  const currentId = Number(currentSemestreId);
  return Array.from(new Set([
    ...(Number.isFinite(currentId) && currentId > 0 ? [currentId] : []),
    ...configuredIds,
  ]));
}

function mergeCurrentSemestrePlaceholder(
  currentSemestreId: string,
  options: SemestreOption[],
) {
  const currentId = Number(currentSemestreId);
  if (!Number.isFinite(currentId) || currentId <= 0 || options.some((semestre) => semestre.id === currentId)) {
    return options;
  }
  return [{ id: currentId, titulo: `Semestre ${currentId}`, placeholder: true }, ...options];
}

interface PaqueteOption {
  id: number;
  grupoId?: number | null;
  paqueteId?: number | null;
  titulo?: string | null;
  descripcion?: string | null;
  grupoModuloTitulo?: string | null;
  moduloOrden?: number | null;
  grupoModuloOrden?: number | null;
  grupoIds?: number[];
}

interface UploadedImage {
  path: string;
  url: string;
  contentType: string;
}

interface MatriculaUser {
  id: number;
  documentId?: string | null;
  username?: string | null;
  nickName?: string | null;
  email?: string | null;
  avatar?: string | null;
  avatarMediano?: string | null;
  avatarPequeno?: string | null;
  avatarTiny?: string | null;
  blocked?: boolean | null;
  dni?: string | null;
  tipoDocumento?: string | null;
  nombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  sexo?: string | null;
  nacionalidad?: string | null;
  estadoCivil?: string | null;
  instruccion?: string | null;
  nombreColegio?: string | null;
  fechaNacimiento?: string | null;
  fechaVencimiento?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  telefono?: string | null;
  celular?: string | null;
  dniImagenFrenteUrl?: string | null;
  dniImagenReversoUrl?: string | null;
  dniImagenFrenteProcesadaUrl?: string | null;
  dniImagenReversoProcesadaUrl?: string | null;
  correoInstitucional?: string | null;
  fechaCreacion?: string | null;
  fechaModificacion?: string | null;
  emailCreador?: string | null;
  rolId?: number | null;
}

interface MatriculaResponsable {
  id: number;
  displayName?: string | null;
  userId?: number | null;
  user?: {
    id?: number | null;
    username?: string | null;
    nombre?: string | null;
    apellidoPaterno?: string | null;
    apellidoMaterno?: string | null;
    email?: string | null;
    correoInstitucional?: string | null;
  } | null;
}

interface MatriculaResponsableUser {
  id: number;
  username?: string | null;
  nombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  email?: string | null;
  correoInstitucional?: string | null;
}

interface MatriculaListItem {
  id: number;
  recibo?: string | null;
  fecha?: string | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  archivado?: boolean | null;
  paqueteId?: number | null;
  grupoId?: number | null;
  semestreId?: number | null;
  userId?: number | null;
  responsableId?: number | null;
  responsableUserId?: number | null;
  user?: MatriculaUser | null;
  responsable?: MatriculaResponsable | null;
  responsableUser?: MatriculaResponsableUser | null;
  modulosEstudiantes?: Array<{
    id?: number | null;
    grupoId?: number | null;
    grupoModuloId?: number | null;
    moduloId?: number | null;
    promedio?: number | null;
    puntaje?: number | null;
    grupoModulo?: {
      id?: number | null;
      nombre?: string | null;
      inicio?: string | null;
      fin?: string | null;
      grupo?: {
        id?: number | null;
        nombreDisplay?: string | null;
        semestre?: { id?: number | null; titulo?: string | null } | null;
      } | null;
      modulo?: {
        id?: number | null;
        titulo?: string | null;
        tituloComercial?: string | null;
      } | null;
    } | null;
  }>;
  cambiosModulo?: Array<{
    id?: number | null;
    fechaCambio?: string | null;
    grupoModuloAnterior?: { id?: number | null; nombre?: string | null } | null;
    grupoModuloNuevo?: { id?: number | null; nombre?: string | null } | null;
    grupoAnterior?: { id?: number | null; nombreDisplay?: string | null } | null;
    grupoNuevo?: { id?: number | null; nombreDisplay?: string | null } | null;
    moduloAnterior?: { id?: number | null; titulo?: string | null; tituloComercial?: string | null } | null;
    moduloNuevo?: { id?: number | null; titulo?: string | null; tituloComercial?: string | null } | null;
    semestre?: { id?: number | null; titulo?: string | null } | null;
    registradoPor?: {
      id?: number | null;
      username?: string | null;
      nombre?: string | null;
      apellidoPaterno?: string | null;
      apellidoMaterno?: string | null;
      email?: string | null;
      correoInstitucional?: string | null;
    } | null;
  }>;
  paquete?: PaqueteOption | null;
  semestre?: SemestreOption | null;
}

interface MatriculaFormProps {
  matriculaId?: string;
  isOpen: boolean;
  onCancel: () => void;
  onReset?: () => void;
  onSaved: (result?: { id?: number }) => void;
  defaultSemestreId?: number | null;
  reconocimientoDniActivo?: boolean;
  formVariant?: 'intranet' | 'standalone';
  standaloneFormKind?: 'actual' | 'siguiente';
  hideSemestreControl?: boolean;
  documentSectionLocked?: boolean;
  courseOnlyEditMode?: boolean;
}

interface MatriculaGrupoModuloOption {
  id: number;
  nombre?: string | null;
  moduloId?: number | null;
  grupo?: {
    nombreDisplay?: string | null;
    semestre?: { titulo?: string | null } | null;
  } | null;
  modulo?: {
    titulo?: string | null;
    tituloComercial?: string | null;
  } | null;
}

interface MatriculaFormValues {
  semestreId: string;
  tipoDocumento: 'DNI' | 'CE';
  dni: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombre: string;
  sexo: '' | 'F' | 'M';
  nacionalidad: string;
  fechaNacimiento: string;
  fechaVencimiento: string;
  estadoCivil: string;
  instruccion: string;
  nombreColegio: string;
  direccion: string;
  distrito: string;
  celular: string;
  telefono: string;
  email: string;
  recibo: string;
  paqueteId: string;
  grupoId: string;
}

interface DocumentImagePolicy {
  userHasStoredImages?: boolean;
  fechaVencimiento?: string | null;
  storedDocumentExpired?: boolean;
  shouldPersistDocumentImages?: boolean;
  reason?: string | null;
}

interface VerificarReniecResponse {
  userExists?: boolean;
  datos?: Partial<MatriculaFormValues>;
  documentImagePolicy?: DocumentImagePolicy | null;
}

interface VerificarOcrSimpleResponse {
  frontValid?: boolean;
  backValid?: boolean;
  frontError?: string | null;
  backError?: string | null;
  debug?: unknown;
}

interface GeminiArchivoResult {
  indice?: number | null;
  nombreArchivo?: string | null;
  tipoLado?: 'frente' | 'reverso' | 'desconocido' | string | null;
  areaLectura?: 'pagina-1' | 'pagina-2' | 'superior' | 'inferior' | 'completa' | string | null;
  tieneDosCuerpos?: boolean | null;
  direccionTexto?: 'izquierda_derecha' | 'arriba_abajo' | 'abajo_arriba' | 'de_cabeza' | string | null;
  textoReconocido?: string | null;
  senalesReverso?: string[] | null;
  fragmentosReverso?: string[] | null;
  contieneDireccion?: boolean | null;
  contieneDomicilio?: boolean | null;
  contieneDistrito?: boolean | null;
  contienePerMrz?: boolean | null;
}

interface GeminiMatriculaResult {
  tipoDocumento?: 'DNI' | 'CE' | string | null;
  numeroDocumento?: string | null;
  documentoCoincide?: boolean | null;
  contieneReverso?: boolean | null;
  archivos?: GeminiArchivoResult[] | null;
  nombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  sexo?: 'F' | 'M' | string | null;
  nacionalidad?: string | null;
  fechaNacimiento?: string | null;
  fechaVencimiento?: string | null;
  estadoCivil?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  textoReconocido?: string | null;
  observaciones?: string | null;
}

interface DocumentoArchivoClasificado {
  indice: number;
  nombreArchivo: string;
  ladoAsignado: string;
  gemini: {
    indice: number;
    tipoLado: string | null;
    areaLectura: string | null;
    tieneDosCuerpos: boolean;
    direccionTexto: string | null;
    senalesReverso: string[];
    fragmentosReverso: string[];
    contieneDireccion: boolean;
    contieneDomicilio: boolean;
    contieneDistrito: boolean;
    contienePerMrz: boolean;
  } | null;
}

interface DocumentoAnalisisTemporal {
  motor: 'gemini';
  pdfDuplicadoConDeteccionDeCuerpos: boolean;
  archivos: DocumentoArchivoClasificado[];
  respuestaGemini: ReturnType<typeof compactGeminiResultForMessage>;
}

type VerificationFailureReason = 'document_mismatch' | 'expired' | 'analysis_error' | 'simple_ocr';

interface LastVerificationFailure {
  frontSignature: string;
  backSignature: string;
  message: string;
  frontError?: string | null;
  backError?: string | null;
  reason: VerificationFailureReason;
  aiResult?: GeminiMatriculaResult | null;
  reniecDatos?: Partial<MatriculaFormValues> | null;
  analysisMetadata?: DocumentoAnalisisTemporal | null;
}

const initialValues: MatriculaFormValues = {
  semestreId: '',
  tipoDocumento: 'DNI',
  dni: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  nombre: '',
  sexo: '',
  nacionalidad: 'PERUANA',
  fechaNacimiento: '',
  fechaVencimiento: '',
  estadoCivil: '',
  instruccion: '',
  nombreColegio: '',
  direccion: '',
  distrito: '',
  celular: '',
  telefono: '',
  email: '',
  recibo: '',
  paqueteId: '',
  grupoId: '',
};

const getCallableErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { message?: string } | null)?.message;
  return message || fallback;
};

const normalizeDocumentNumber = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const detectDocumentContentType = (file: File) => {
  const lowerName = file.name.toLowerCase();
  if (file.type) return file.type;
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
};

const parseSemestreDate = (value?: string | null) => {
  return getDateOnlyLocalDate(value);
};

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const getCurrentSemestre = (semestres: SemestreOption[], now = new Date()) =>
  semestres.find((semestre) => {
    const inicio = parseSemestreDate(semestre.inicio);
    const fin = parseSemestreDate(semestre.fin);
    if (!inicio || !fin) return false;
    return startOfDay(inicio).getTime() <= now.getTime() && now.getTime() <= endOfDay(fin).getTime();
  }) ?? null;

const asString = (value: unknown) => (typeof value === 'string' ? value : '');

const imageFileToOptimizedDataUrl = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo preparar la imagen para validar.'));
      img.src = objectUrl;
    });
    const maxSide = 2200;
    const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la imagen para validar.');
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.9);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const fileToGenerativePart = async (file: File) => {
  const contentType = detectDocumentContentType(file);
  const shouldOptimizeImage = contentType.startsWith('image/') && contentType !== 'image/gif';
  let optimizedData: string | null = null;
  if (shouldOptimizeImage) {
    try {
      const optimizedDataUrl = await imageFileToOptimizedDataUrl(file);
      optimizedData = optimizedDataUrl.includes(',') ? optimizedDataUrl.split(',')[1] : optimizedDataUrl;
    } catch (error) {
      console.warn('No se pudo optimizar la imagen para validar; se usara el archivo original.', error);
    }
  }

  const data = optimizedData ?? await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data,
      mimeType: optimizedData ? 'image/jpeg' : contentType,
    },
  };
};

const fileToOcrSimpleInput = async (file: File) => {
  const part = await fileToGenerativePart(file);
  return {
    data: part.inlineData.data,
    mimeType: part.inlineData.mimeType,
    name: file.name,
  };
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} no respondio a tiempo.`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const normalizeAiDocumentType = (value: unknown): 'DNI' | 'CE' | null => {
  const text = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (text.includes('ce') || text.includes('carnet') || text.includes('extranjeria')) return 'CE';
  if (text.includes('dni') || text.includes('nacional')) return 'DNI';
  return null;
};

const normalizeDateInput = (value: unknown) => {
  const text = asString(value).trim();
  if (!text) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (slash) return `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`;
  return '';
};

const formatDateInputForDisplay = (value: unknown) => {
  const normalized = normalizeDateInput(value);
  if (!normalized) return asString(value).trim();
  const [year, month, day] = normalized.split('-');
  return `${day}/${month}/${year}`;
};

const formatDateTypingValue = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const isValidDateOnlyValue = (value: unknown) => {
  const normalized = normalizeDateInput(value);
  if (!normalized) return false;
  const [year, month, day] = normalized.split('-').map((item) => Number(item));
  if (!year || !month || !day) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const getAgeFromBirthDate = (value: unknown) => {
  const normalized = normalizeDateInput(value);
  if (!normalized || !isValidDateOnlyValue(normalized)) return null;
  const [year, month, day] = normalized.split('-').map((item) => Number(item));
  const today = todayDateOnly();
  let age = today.getFullYear() - year;
  const hasBirthdayPassed =
    today.getMonth() > month - 1 || (today.getMonth() === month - 1 && today.getDate() >= day);
  if (!hasBirthdayPassed) age -= 1;
  return age;
};

const getBirthDateValidationError = (value: unknown) => {
  const text = asString(value).trim();
  if (!text) return 'Esta pregunta es obligatoria.';
  if (!isValidDateOnlyValue(text)) return 'Ingresa una fecha valida.';
  const age = getAgeFromBirthDate(text);
  if (age === null || age < 13 || age > 90) return 'La edad debe estar entre 13 y 90 anos.';
  return '';
};

const getDocumentNumberValidationError = (tipoDocumento: string, value: unknown) => {
  const number = normalizeDocumentNumber(String(value ?? ''));
  if (!number) return 'Esta pregunta es obligatoria.';
  if (tipoDocumento === 'CE' && !/^\d{9}$/.test(number)) return 'El numero tiene que tener 9 digitos.';
  if (tipoDocumento !== 'CE' && !/^\d{8}$/.test(number)) return 'El numero tiene que tener 8 digitos.';
  return '';
};

const isValidEmail = (value: unknown) => {
  const text = asString(value).trim();
  if (!text) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
};

const getEmailValidationError = (value: unknown) => (
  isValidEmail(value) ? '' : 'Ingresa un correo electronico valido.'
);

const RECIBO_OPTIONS = ['CONADIS', 'BECADO', 'POR REGULARIZAR'] as const;

const normalizeReciboInputValue = (value: unknown) => {
  const text = String(value ?? '').toUpperCase().replace(/\s+/g, ' ').trim();
  if (RECIBO_OPTIONS.includes(text as typeof RECIBO_OPTIONS[number])) return text;
  const compactText = text.replace(/\s+/g, '');
  if (compactText === 'PORREGULARIZAR') return 'POR REGULARIZAR';
  if (/^\d+$/.test(compactText)) return compactText.slice(0, 5);
  return text;
};

const isValidReciboValue = (value: unknown) => {
  const text = normalizeReciboInputValue(value);
  return Boolean(text && (RECIBO_OPTIONS.includes(text as typeof RECIBO_OPTIONS[number]) || /^\d{1,5}$/.test(text)));
};

const getPaqueteOptionLabel = (paquete: PaqueteOption) =>
  paquete.grupoModuloTitulo || paquete.titulo || `Modulo ${paquete.id}`;

const getPaqueteOptionGrupoId = (paquete: PaqueteOption) => paquete.grupoId ?? paquete.id;

const getPaqueteOptionPaqueteId = (paquete: PaqueteOption) => paquete.paqueteId ?? paquete.id;

const parseDateOnly = (value: unknown) => {
  const normalized = normalizeDateInput(value);
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map((item) => Number(item));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const todayDateOnly = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const isExpiredDate = (value: unknown) => {
  const date = parseDateOnly(value);
  if (!date) return false;
  return date.getTime() < todayDateOnly().getTime();
};

const isCourseChangeExpired = (matricula?: MatriculaListItem | null) => {
  const today = todayDateOnly();
  return Boolean(
    matricula?.modulosEstudiantes?.some((item) => {
      const inicio = parseDateOnly(item.grupoModulo?.inicio);
      if (!inicio) return false;
      const elapsedDays = Math.floor((today.getTime() - inicio.getTime()) / 86_400_000);
      return elapsedDays > 21;
    }),
  );
};

const areStringArraysEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const normalizeAiGender = (value: unknown): 'F' | 'M' | null => {
  const text = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (text === 'f' || text.includes('femenino') || text.includes('mujer')) return 'F';
  if (text === 'm' || text.includes('masculino') || text.includes('hombre')) return 'M';
  return null;
};

const normalizeAiCivilStatus = (value: unknown) => {
  const text = asString(value).trim();
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (!normalized) return '';
  if (normalized === 's') return 'Soltero(a)';
  if (normalized === 'c') return 'Casado(a)';
  if (normalized === 'd') return 'Divorciado(a)';
  if (normalized === 'v') return 'Viudo(a)';
  if (normalized.startsWith('solter')) return 'Soltero(a)';
  if (normalized.startsWith('casad')) return 'Casado(a)';
  if (normalized.startsWith('viud')) return 'Viudo(a)';
  if (normalized.startsWith('divorciad')) return 'Divorciado(a)';
  return text;
};

const normalizeDetectedDocumentNumber = (tipoDocumento: 'DNI' | 'CE', value: unknown) => {
  const raw = asString(value).toUpperCase();
  if (tipoDocumento === 'DNI') {
    const withCheckDigit = /(\d{8})\s*-\s*\d/.exec(raw);
    if (withCheckDigit) return withCheckDigit[1];
  }
  return normalizeDocumentNumber(raw);
};

const normalizeSearchText = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const hasReverseEvidenceInText = (value: unknown) => {
  const text = normalizeSearchText(value);
  return text.includes('direccion')
    || text.includes('domicilio')
    || text.includes('distrito');
};

const hasReverseEvidenceInGeminiFile = (archivo: GeminiArchivoResult) => {
  const signalsText = [
    archivo.tipoLado,
    ...(Array.isArray(archivo.senalesReverso) ? archivo.senalesReverso : []),
    ...(Array.isArray(archivo.fragmentosReverso) ? archivo.fragmentosReverso : []),
    archivo.textoReconocido,
  ].join(' ');

  return normalizeSearchText(archivo.tipoLado).includes('reverso')
    || Boolean(archivo.contieneDireccion)
    || Boolean(archivo.contieneDomicilio)
    || Boolean(archivo.contieneDistrito)
    || Boolean(archivo.contienePerMrz)
    || hasReverseEvidenceInText(signalsText);
};

const getGeminiArchivoIndex = (archivo: GeminiArchivoResult, fallbackIndex: number, filesCount: number) => {
  const rawIndex = Number(archivo.indice ?? fallbackIndex + 1);
  if (!Number.isFinite(rawIndex)) return fallbackIndex;
  const zeroBased = rawIndex - 1;
  if (zeroBased < 0 || zeroBased >= filesCount) return fallbackIndex;
  return zeroBased;
};

const classifyGeminiFiles = (files: File[], aiResult: GeminiMatriculaResult) => {
  const archivos = Array.isArray(aiResult.archivos) ? aiResult.archivos : [];
  const explicitReverseArchivo = archivos.find((archivo) =>
    normalizeSearchText(archivo.tipoLado).includes('reverso'),
  );
  const explicitFrontArchivo = archivos.find((archivo) =>
    normalizeSearchText(archivo.tipoLado).includes('frente'),
  );
  const reverseArchivo = explicitReverseArchivo ?? archivos.find(hasReverseEvidenceInGeminiFile);
  const reverseIndex = reverseArchivo
    ? getGeminiArchivoIndex(reverseArchivo, archivos.indexOf(reverseArchivo), files.length)
    : null;
  const explicitFrontIndex = explicitFrontArchivo
    ? getGeminiArchivoIndex(explicitFrontArchivo, archivos.indexOf(explicitFrontArchivo), files.length)
    : null;
  const frontIndex = explicitFrontIndex !== null
    ? explicitFrontIndex
    : files.length > 1 && reverseIndex !== null
    ? files.findIndex((_file, index) => index !== reverseIndex)
    : files.length === 1 && reverseIndex === null
      ? 0
      : null;
  const buildClassifiedArchivo = (
    archivo: GeminiArchivoResult,
    itemIndex: number,
  ): DocumentoArchivoClasificado => {
    const fileIndex = getGeminiArchivoIndex(archivo, itemIndex, files.length);
    const tipoLado = normalizeSearchText(archivo.tipoLado);
    const ladoAsignado = tipoLado.includes('reverso') || hasReverseEvidenceInGeminiFile(archivo)
      ? 'reverso'
      : tipoLado.includes('frente')
        ? 'frente'
        : fileIndex === reverseIndex
          ? 'reverso'
          : fileIndex === frontIndex
            ? 'frente'
            : 'desconocido';

    return {
      indice: fileIndex + 1,
      nombreArchivo: asString(archivo.nombreArchivo) || files[fileIndex]?.name || `archivo ${fileIndex + 1}`,
      ladoAsignado,
      gemini: {
        indice: archivo.indice ?? fileIndex + 1,
        tipoLado: archivo.tipoLado ?? null,
        areaLectura: archivo.areaLectura ?? null,
        tieneDosCuerpos: Boolean(archivo.tieneDosCuerpos),
        direccionTexto: archivo.direccionTexto ?? null,
        senalesReverso: archivo.senalesReverso ?? [],
        fragmentosReverso: archivo.fragmentosReverso ?? [],
        contieneDireccion: Boolean(archivo.contieneDireccion),
        contieneDomicilio: Boolean(archivo.contieneDomicilio),
        contieneDistrito: Boolean(archivo.contieneDistrito),
        contienePerMrz: Boolean(archivo.contienePerMrz),
      },
    };
  };

  const classifiedArchivos = archivos.map(buildClassifiedArchivo);
  const hasFrontMetadata = classifiedArchivos.some((archivo) => archivo.ladoAsignado === 'frente');
  const hasReverseMetadata = classifiedArchivos.some((archivo) => archivo.ladoAsignado === 'reverso');
  if (!hasFrontMetadata && frontIndex !== null && frontIndex >= 0) {
    classifiedArchivos.push({
      indice: frontIndex + 1,
      nombreArchivo: files[frontIndex]?.name || `archivo ${frontIndex + 1}`,
      ladoAsignado: 'frente',
      gemini: null,
    });
  }
  if (!hasReverseMetadata && reverseIndex !== null && reverseIndex >= 0) {
    classifiedArchivos.push({
      indice: reverseIndex + 1,
      nombreArchivo: files[reverseIndex]?.name || `archivo ${reverseIndex + 1}`,
      ladoAsignado: 'reverso',
      gemini: null,
    });
  }

  return {
    frontIndex: frontIndex !== null && frontIndex >= 0 ? frontIndex : null,
    reverseIndex,
    archivos: classifiedArchivos.length
      ? classifiedArchivos
      : files.map((file, index) => ({
          indice: index + 1,
          nombreArchivo: file.name,
          ladoAsignado: index === reverseIndex ? 'reverso' : index === frontIndex ? 'frente' : 'desconocido',
          gemini: null,
        })),
  };
};

const compactGeminiResultForMessage = (aiResult: GeminiMatriculaResult) => ({
  tipoDocumento: aiResult.tipoDocumento ?? null,
  numeroDocumento: aiResult.numeroDocumento ?? null,
  contieneReverso: Boolean(aiResult.contieneReverso),
  nombre: aiResult.nombre ?? null,
  apellidoPaterno: aiResult.apellidoPaterno ?? null,
  apellidoMaterno: aiResult.apellidoMaterno ?? null,
  sexo: aiResult.sexo ?? null,
  nacionalidad: aiResult.nacionalidad ?? null,
  fechaNacimiento: aiResult.fechaNacimiento ?? null,
  fechaVencimiento: aiResult.fechaVencimiento ?? null,
  estadoCivil: aiResult.estadoCivil ?? null,
  direccion: aiResult.direccion ?? null,
  distrito: aiResult.distrito ?? null,
  observaciones: aiResult.observaciones ?? null,
});

const fileSignature = (file: File | null) => (
  file ? `${file.name}|${file.size}|${file.lastModified}` : ''
);


const fullName = (user?: MatriculaUser | null) =>
  [user?.apellidoPaterno, user?.apellidoMaterno, user?.nombre].filter(Boolean).join(' ').trim();

const toUpperName = (value?: string | null) =>
  String(value || '').trim().toLocaleUpperCase('es-PE');

const toTitleName = (value?: string | null) =>
  String(value || '')
    .trim()
    .toLocaleLowerCase('es-PE')
    .replace(/(^|\s)(\S)/g, (match) => match.toLocaleUpperCase('es-PE'));

const studentListName = (user?: MatriculaUser | null) => {
  const apellidos = [user?.apellidoPaterno, user?.apellidoMaterno]
    .map(toUpperName)
    .filter(Boolean)
    .join(' ');
  const nombres = toTitleName(user?.nombre);
  return [apellidos, nombres].filter(Boolean).join(', ') || fullName(user);
};

const studentInitials = (user?: MatriculaUser | null) => {
  const firstName = toTitleName(user?.nombre).charAt(0);
  const firstSurname = toUpperName(user?.apellidoPaterno).charAt(0);
  return `${firstName}${firstSurname}` || '?';
};

const getSemestreLabel = (semestre?: SemestreOption | null) =>
  semestre?.titulo || semestre?.nombre || (semestre?.id ? `Semestre ${semestre.id}` : '');

const getGrupoModuloFilterLabel = (grupoModulo: MatriculaGrupoModuloOption) => {
  const nombre = String(grupoModulo.nombre || '').trim();
  if (nombre) return nombre;
  return grupoModulo.modulo?.titulo
    || grupoModulo.modulo?.tituloComercial
    || grupoModulo.grupo?.nombreDisplay
    || `Grupo-modulo ${grupoModulo.id}`;
};

const responsableName = (responsable?: MatriculaResponsable | null) =>
  responsable?.displayName
  || responsable?.user?.username
  || [responsable?.user?.apellidoPaterno, responsable?.user?.apellidoMaterno, responsable?.user?.nombre]
    .filter(Boolean)
    .join(' ')
    .trim()
  || responsable?.user?.correoInstitucional
  || responsable?.user?.email
  || '';

const responsableUserName = (user?: MatriculaResponsableUser | null) =>
  user?.username
  || [user?.apellidoPaterno, user?.apellidoMaterno, user?.nombre]
    .filter(Boolean)
    .join(' ')
    .trim()
  || user?.correoInstitucional
  || user?.email
  || '';

const formatDate = (value?: string | null) => {
  return formatDateOnly(value, { dateStyle: 'short' }) || value || '';
};

const formatDateTimeForDisplay = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const firstCleanValue = (...values: Array<string | null | undefined>) =>
  values.map((value) => asString(value).trim()).find(Boolean) || null;

const DOCENTE_MAX_MODULO_CHANGE_EVENTS = 3;
const SECONDARY_INCOMPLETE_VALUE = 'Secundaria incompleta';

type MatriculaModuloChange = NonNullable<MatriculaListItem['cambiosModulo']>[number];

const getPreviousModuloChangeName = (change: MatriculaModuloChange) =>
  asString(change.grupoModuloAnterior?.nombre).trim()
  || asString(change.grupoAnterior?.nombreDisplay).trim()
  || asString(change.moduloAnterior?.titulo).trim()
  || asString(change.moduloAnterior?.tituloComercial).trim();

const getNewModuloChangeName = (change: MatriculaModuloChange) =>
  asString(change.grupoModuloNuevo?.nombre).trim()
  || asString(change.grupoNuevo?.nombreDisplay).trim()
  || asString(change.moduloNuevo?.titulo).trim()
  || asString(change.moduloNuevo?.tituloComercial).trim();

const hasPreviousModuloChange = (change: MatriculaModuloChange) =>
  Boolean(change.grupoModuloAnterior?.id || change.moduloAnterior?.id || change.grupoAnterior?.id || getPreviousModuloChangeName(change));

const hasNewModuloChange = (change: MatriculaModuloChange) =>
  Boolean(change.grupoModuloNuevo?.id || change.moduloNuevo?.id || change.grupoNuevo?.id || getNewModuloChangeName(change));

const getModuloChangeEventKey = (change: MatriculaModuloChange, fallbackIndex: number) => {
  const fechaCambio = asString(change.fechaCambio).trim();
  return fechaCambio || `id:${change.id ?? fallbackIndex}`;
};

const normalizeModuloChanges = (changes?: MatriculaListItem['cambiosModulo'] | null) => {
  const grouped = new Map<string, MatriculaModuloChange>();
  for (const [index, change] of (changes ?? []).entries()) {
    if (!hasPreviousModuloChange(change)) continue;
    const key = getModuloChangeEventKey(change, index);
    if (!grouped.has(key)) {
      grouped.set(key, change);
      continue;
    }
    const current = grouped.get(key);
    if (!current) continue;
    if (!hasPreviousModuloChange(current) && hasPreviousModuloChange(change)) {
      grouped.set(key, change);
      continue;
    }
    if (!hasNewModuloChange(current) && hasNewModuloChange(change)) {
      grouped.set(key, change);
    }
  }
  return Array.from(grouped.values()).sort((a, b) => {
    const dateA = new Date(a.fechaCambio || '').getTime();
    const dateB = new Date(b.fechaCambio || '').getTime();
    const normalizedA = Number.isNaN(dateA) ? 0 : dateA;
    const normalizedB = Number.isNaN(dateB) ? 0 : dateB;
    return normalizedB - normalizedA || (Number(b.id ?? 0) - Number(a.id ?? 0));
  });
};

const countModuloChangeEvents = (changes?: MatriculaListItem['cambiosModulo'] | null) => {
  return normalizeModuloChanges(changes).length;
};

function valuesFromMatricula(matricula: MatriculaListItem): MatriculaFormValues {
  const user = matricula.user;
  return {
    semestreId: matricula.semestreId ? String(matricula.semestreId) : '',
    tipoDocumento: user?.tipoDocumento === 'CE' ? 'CE' : 'DNI',
    dni: normalizeDocumentNumber(user?.dni || ''),
    apellidoPaterno: user?.apellidoPaterno || '',
    apellidoMaterno: user?.apellidoMaterno || '',
    nombre: user?.nombre || '',
    sexo: user?.sexo === 'M' ? 'M' : user?.sexo === 'F' ? 'F' : '',
    nacionalidad: user?.nacionalidad || 'PERUANA',
    fechaNacimiento: asString(user?.fechaNacimiento).split('T')[0],
    fechaVencimiento: asString(user?.fechaVencimiento).split('T')[0],
    estadoCivil: normalizeAiCivilStatus(user?.estadoCivil) || '',
    instruccion: user?.instruccion || 'Secundaria',
    nombreColegio: user?.nombreColegio || '',
    direccion: user?.direccion || '',
    distrito: user?.distrito || '',
    celular: user?.celular || '',
    telefono: user?.telefono || '',
    email: user?.email || '',
    recibo: matricula.recibo || '',
    paqueteId: matricula.paqueteId ? String(matricula.paqueteId) : '',
    grupoId: matricula.grupoId ? String(matricula.grupoId) : '',
  };
}

export function MatriculaForm({
  matriculaId,
  isOpen,
  onCancel,
  onReset,
  onSaved,
  defaultSemestreId,
  reconocimientoDniActivo = true,
  formVariant = 'intranet',
  standaloneFormKind = 'actual',
  hideSemestreControl = false,
  documentSectionLocked = false,
  courseOnlyEditMode = false,
}: MatriculaFormProps) {
  const isEditing = Boolean(matriculaId);
  const isStandalone = formVariant === 'standalone';
  const dniInputRef = useRef<HTMLInputElement | null>(null);
  const birthDatePickerRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [values, setValues] = useState<MatriculaFormValues>(initialValues);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [paquetes, setPaquetes] = useState<PaqueteOption[]>([]);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontImage, setFrontImage] = useState<UploadedImage | null>(null);
  const [backImage, setBackImage] = useState<UploadedImage | null>(null);
  const [documentAnalysisMetadata, setDocumentAnalysisMetadata] = useState<DocumentoAnalisisTemporal | null>(null);
  const [responsable, setResponsable] = useState<MatriculaResponsable | null>(null);
  const [responsableUser, setResponsableUser] = useState<MatriculaResponsableUser | null>(null);
  const [documentVerified, setDocumentVerified] = useState(false);
  const [isExistingUserWithImages, setIsExistingUserWithImages] = useState(false);
  const [shouldPersistDocumentImages, setShouldPersistDocumentImages] = useState(true);
  const [verificationFailureCount, setVerificationFailureCount] = useState(0);
  const [cameraSide, setCameraSide] = useState<'frente' | 'reverso' | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraPreview, setCameraPreview] = useState<{ file: File; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [courseChangeExpired, setCourseChangeExpired] = useState(false);
  const [courseChangeLimitReached, setCourseChangeLimitReached] = useState(false);
  const [moduleChanges, setModuleChanges] = useState<NonNullable<MatriculaListItem['cambiosModulo']>>([]);
  const [matriculaOriginalDate, setMatriculaOriginalDate] = useState<string | null>(null);
  const [frontFileVerificationError, setFrontFileVerificationError] = useState<string | null>(null);
  const [backFileVerificationError, setBackFileVerificationError] = useState<string | null>(null);
  const [lastVerificationFailure, setLastVerificationFailure] = useState<LastVerificationFailure | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const selectedSemestreId = Number(values.semestreId || 0);

  const updateValue = useCallback(<K extends keyof MatriculaFormValues>(key: K, value: MatriculaFormValues[K]) => {
    const documentIdentityChanged =
      (key === 'tipoDocumento' && values.tipoDocumento !== value)
      || (key === 'dni' && values.dni !== value);
    setValues((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'semestreId' ? { paqueteId: '', grupoId: '' } : {}),
      ...(key === 'instruccion' && value !== SECONDARY_INCOMPLETE_VALUE ? { nombreColegio: '' } : {}),
    }));
    setMessage(null);
    setSuccessMessage(null);
    setTouched((prev) => ({ ...prev, [key]: false }));
    if (documentIdentityChanged) {
      setFrontFile(null);
      setBackFile(null);
      setFrontImage(null);
      setBackImage(null);
      setDocumentVerified(false);
      setIsExistingUserWithImages(false);
      setShouldPersistDocumentImages(true);
      setDocumentAnalysisMetadata(null);
      setVerificationFailureCount(0);
      setFrontFileVerificationError(null);
      setBackFileVerificationError(null);
      setLastVerificationFailure(null);
      setTouched((prev) => ({ ...prev, frontFile: false, backFile: false }));
    }
  }, [values.dni, values.tipoDocumento]);

  const updateGrupoSelection = useCallback((grupoIdValue: string) => {
    const selectedOption = paquetes.find((paquete) => String(getPaqueteOptionGrupoId(paquete)) === grupoIdValue);
    setValues((prev) => ({
      ...prev,
      grupoId: grupoIdValue,
      paqueteId: selectedOption ? String(getPaqueteOptionPaqueteId(selectedOption)) : '',
    }));
    setMessage(null);
    setSuccessMessage(null);
    setTouched((prev) => ({ ...prev, grupoId: false }));
  }, [paquetes]);

  const handleCancelFromVerification = useCallback(() => {
    if (isStandalone && onReset) {
      onReset();
      return;
    }
    onCancel();
  }, [isStandalone, onCancel, onReset]);

  const registerVerificationFailure = useCallback(() => {
    setVerificationFailureCount((current) => current + 1);
  }, []);

  const setDocumentFile = useCallback((side: 'frente' | 'reverso', file: File | null) => {
    if (side === 'frente') {
      setFrontFile(file);
      setFrontImage(null);
    } else {
      setBackFile(file);
      setBackImage(null);
    }
    setDocumentVerified(false);
    setDocumentAnalysisMetadata(null);
    setShouldPersistDocumentImages(true);
    if (side === 'frente') {
      setFrontFileVerificationError(null);
    } else {
      setBackFileVerificationError(null);
    }
    setMessage(null);
    setSuccessMessage(null);
    setTouched((prev) => ({ ...prev, [side === 'frente' ? 'frontFile' : 'backFile']: Boolean(file) }));
  }, []);

  const markTouched = useCallback((key: string) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  const stopCameraCapture = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setCameraPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
    setCameraSide(null);
    setCameraStarting(false);
    setCameraError(null);
  }, []);

  const openCameraCapture = useCallback((side: 'frente' | 'reverso') => {
    setCameraPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
    setCameraError(null);
    setCameraSide(side);
  }, []);

  useEffect(() => {
    if (!cameraSide) return undefined;
    let cancelled = false;

    const startCamera = async () => {
      setCameraStarting(true);
      setCameraError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Tu navegador no permite abrir la camara desde esta pagina.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          await cameraVideoRef.current.play().catch(() => undefined);
        }
      } catch (error) {
        if (!cancelled) {
          setCameraError(getCallableErrorMessage(error, 'No se pudo abrir la camara.'));
        }
      } finally {
        if (!cancelled) setCameraStarting(false);
      }
    };

    void startCamera();
    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, [cameraSide]);

  useEffect(() => {
    if (!cameraSide || cameraPreview || !cameraStreamRef.current || !cameraVideoRef.current) return;
    cameraVideoRef.current.srcObject = cameraStreamRef.current;
    void cameraVideoRef.current.play().catch(() => undefined);
  }, [cameraPreview, cameraSide]);

  const handleCaptureCameraImage = useCallback(async () => {
    const side = cameraSide;
    const video = cameraVideoRef.current;
    if (!side || !video || !video.videoWidth || !video.videoHeight) {
      setCameraError('La camara todavia no esta lista.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('No se pudo capturar la imagen.');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setCameraError('No se pudo generar la imagen.');
      return;
    }

    const file = new File([blob], `dni-${side}-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const url = URL.createObjectURL(file);
    setCameraPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return { file, url };
    });
  }, [cameraSide]);

  const handleRetakeCameraImage = useCallback(() => {
    setCameraPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
    setCameraError(null);
  }, []);

  const handleAcceptCameraImage = useCallback(() => {
    if (!cameraSide || !cameraPreview) return;
    setDocumentFile(cameraSide, cameraPreview.file);
    stopCameraCapture();
  }, [cameraPreview, cameraSide, setDocumentFile, stopCameraCapture]);

  useEffect(() => {
    if (!isOpen || isEditing) return;

    const timer = window.setTimeout(() => {
      dniInputRef.current?.focus();
      dniInputRef.current?.select();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [isEditing, isOpen]);

  useEffect(() => {
    let mounted = true;
    const loadInitialData = async () => {
      setLoadingOptions(true);
      setResponsable(null);
      setResponsableUser(null);
      try {
        const listMatriculaSemestres = httpsCallable<undefined, { semestres?: SemestreOption[] }>(
          functions,
          isStandalone ? 'listFormularioMatriculaSemestres' : 'listMatriculaSemestres',
          { timeout: 12000 },
        );
        const semestresResult = await withTimeout(
          listMatriculaSemestres(),
          14000,
          isStandalone ? 'listFormularioMatriculaSemestres' : 'listMatriculaSemestres',
        );
        if (!mounted) return;
        const nextSemestres = semestresResult.data.semestres || [];
        setSemestres(nextSemestres);

        if (matriculaId) {
          const getMatricula = httpsCallable<{ id: number }, { matricula?: MatriculaListItem | null }>(
            functions,
            'getMatricula',
            { timeout: 12000 },
          );
          const result = await withTimeout(getMatricula({ id: Number(matriculaId) }), 14000, 'getMatricula');
          if (!mounted) return;
          const matricula = result.data.matricula;
          if (!matricula) {
            setMessage('No se encontro la matricula seleccionada.');
            return;
          }
          setValues(valuesFromMatricula(matricula));
          setCourseChangeExpired(isCourseChangeExpired(matricula));
          const cambiosModulo = normalizeModuloChanges(matricula.cambiosModulo);
          setCourseChangeLimitReached(countModuloChangeEvents(cambiosModulo) >= DOCENTE_MAX_MODULO_CHANGE_EVENTS);
          setModuleChanges(cambiosModulo);
          setMatriculaOriginalDate(firstCleanValue(matricula.fechaCreacion, matricula.fecha, matricula.fechaActualizacion));
          setResponsable(matricula.responsable ?? null);
          setResponsableUser(matricula.responsableUser ?? null);
          setFrontImage(matricula.user?.dniImagenFrenteUrl
            ? { url: matricula.user.dniImagenFrenteUrl, path: '', contentType: 'image/*' }
            : null);
          setBackImage(matricula.user?.dniImagenReversoUrl
            ? { url: matricula.user.dniImagenReversoUrl, path: '', contentType: 'image/*' }
            : null);
          setDocumentVerified(true);
          setIsExistingUserWithImages(Boolean(matricula.user?.dniImagenFrenteUrl && matricula.user?.dniImagenReversoUrl));
        } else {
          setCourseChangeExpired(false);
          setCourseChangeLimitReached(false);
          setModuleChanges([]);
          setMatriculaOriginalDate(null);
          const configuredSemestre = defaultSemestreId
            ? nextSemestres.find((semestre) => semestre.id === defaultSemestreId)
            : null;
          setValues((prev) => ({
            ...prev,
            semestreId: configuredSemestre ? String(configuredSemestre.id) : '',
            paqueteId: '',
            grupoId: '',
          }));
          const getMatriculaResponsableActual = httpsCallable<
            undefined,
            { responsable?: MatriculaResponsable | null; responsableUser?: MatriculaResponsableUser | null }
          >(functions, isStandalone ? 'getFormularioMatriculaResponsableActual' : 'getMatriculaResponsableActual', { timeout: 12000 });
          const responsableResult = await withTimeout(
            getMatriculaResponsableActual(),
            14000,
            isStandalone ? 'getFormularioMatriculaResponsableActual' : 'getMatriculaResponsableActual',
          );
          if (!mounted) return;
          setResponsable(responsableResult.data.responsable ?? null);
          setResponsableUser(responsableResult.data.responsableUser ?? null);
        }
      } catch (error) {
        if (mounted) setMessage(getCallableErrorMessage(error, 'No se pudieron cargar los datos de matricula.'));
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    };
    void loadInitialData();
    return () => {
      mounted = false;
    };
  }, [defaultSemestreId, isStandalone, matriculaId]);

  useEffect(() => {
    let mounted = true;
    const loadPaquetes = async () => {
      setPaquetes([]);
      if (!selectedSemestreId) return;

      setLoadingOptions(true);
      try {
        const listPaquetes = httpsCallable<{ semestreId: number }, { paquetes?: PaqueteOption[] }>(
          functions,
          isStandalone ? 'listFormularioMatriculaPaquetesBySemestre' : 'listMatriculaPaquetesBySemestre',
          { timeout: 12000 },
        );
        const result = await withTimeout(
          listPaquetes({ semestreId: selectedSemestreId }),
          14000,
          isStandalone ? 'listFormularioMatriculaPaquetesBySemestre' : 'listMatriculaPaquetesBySemestre',
        );
        if (mounted) setPaquetes(result.data.paquetes || []);
      } catch (error) {
        if (mounted) setMessage(getCallableErrorMessage(error, 'No se pudieron cargar los modulos del periodo.'));
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    };
    void loadPaquetes();
    return () => {
      mounted = false;
    };
  }, [isStandalone, selectedSemestreId]);

  const uploadDocumentImage = async (file: File, side: 'frente' | 'reverso'): Promise<UploadedImage> => {
    const cleanDni = normalizeDocumentNumber(values.dni);
    const documentPrefix = values.tipoDocumento === 'CE' ? 'ce' : 'dni';
    const contentType = detectDocumentContentType(file);
    const path = [
      'matriculas',
      'documentos',
      cleanDni || 'documento',
      `${documentPrefix}-${cleanDni || 'documento'}-original-${side}`,
    ].join('/');
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType });
    const url = await getDownloadURL(storageRef);
    return { path, url, contentType };
  };

  const uploadVerifiedDocumentImages = async (
    shouldPersist: boolean,
    frontIndex: number | null,
    backIndex: number | null,
    files: File[],
  ) => {
    if (!shouldPersist) return { uploadedFront: null, uploadedBack: null };
    const [uploadedFront, uploadedBack] = await Promise.all([
      frontIndex !== null && files[frontIndex] ? uploadDocumentImage(files[frontIndex], 'frente') : Promise.resolve(null),
      backIndex !== null && files[backIndex] ? uploadDocumentImage(files[backIndex], 'reverso') : Promise.resolve(null),
    ]);
    return { uploadedFront, uploadedBack };
  };

  const fetchReniecForVerification = useCallback(async () => {
    const verificarMatriculaReniec = httpsCallable<
      { tipoDocumento: string; dni: string },
      VerificarReniecResponse
    >(functions, 'verificarMatriculaReniec', { timeout: 60000 });
    const result = await verificarMatriculaReniec({
      tipoDocumento: values.tipoDocumento,
      dni: normalizeDocumentNumber(values.dni),
    });
    return result.data;
  }, [values.dni, values.tipoDocumento]);

  const applyVerifiedDocumentData = useCallback((
    aiResult: GeminiMatriculaResult | null | undefined,
    reniecDatos: Partial<MatriculaFormValues> | null | undefined,
    detectedType: 'DNI' | 'CE' | null,
    detectedNumber: string,
    detectedExpiration: string,
  ) => {
    setValues((prev) => ({
      ...prev,
      tipoDocumento: reniecDatos?.tipoDocumento === 'CE' || detectedType === 'CE' ? 'CE' : 'DNI',
      dni: asString(reniecDatos?.dni) || detectedNumber || prev.dni,
      apellidoPaterno: asString(reniecDatos?.apellidoPaterno) || asString(aiResult?.apellidoPaterno) || prev.apellidoPaterno,
      apellidoMaterno: asString(reniecDatos?.apellidoMaterno) || asString(aiResult?.apellidoMaterno) || prev.apellidoMaterno,
      nombre: asString(reniecDatos?.nombre) || asString(aiResult?.nombre) || prev.nombre,
      sexo: normalizeAiGender(reniecDatos?.sexo) || normalizeAiGender(aiResult?.sexo) || prev.sexo,
      nacionalidad: detectedType === 'DNI'
        ? 'PERUANA'
        : asString(aiResult?.nacionalidad) || asString(reniecDatos?.nacionalidad) || prev.nacionalidad,
      fechaNacimiento: normalizeDateInput(reniecDatos?.fechaNacimiento) || normalizeDateInput(aiResult?.fechaNacimiento) || prev.fechaNacimiento,
      fechaVencimiento: detectedExpiration || prev.fechaVencimiento,
      estadoCivil: normalizeAiCivilStatus(aiResult?.estadoCivil) || normalizeAiCivilStatus(reniecDatos?.estadoCivil) || prev.estadoCivil,
      direccion: asString(aiResult?.direccion) || asString(reniecDatos?.direccion) || prev.direccion,
      distrito: asString(aiResult?.distrito) || asString(reniecDatos?.distrito) || prev.distrito,
      instruccion: asString(reniecDatos?.instruccion) || prev.instruccion,
      nombreColegio: asString(reniecDatos?.nombreColegio) || prev.nombreColegio,
      celular: asString(reniecDatos?.celular) || prev.celular,
      telefono: asString(reniecDatos?.telefono) || prev.telefono,
      email: asString(reniecDatos?.email) || prev.email,
    }));
  }, []);

  const allowContinueAfterThirdFailure = useCallback((failure: LastVerificationFailure) => {
    const aiResult = failure.aiResult ?? null;
    const detectedType = normalizeAiDocumentType(aiResult?.tipoDocumento) || (values.tipoDocumento === 'CE' ? 'CE' : 'DNI');
    const detectedNumber = normalizeDetectedDocumentNumber(values.tipoDocumento, aiResult?.numeroDocumento);
    const detectedExpiration = normalizeDateInput(aiResult?.fechaVencimiento);
    applyVerifiedDocumentData(aiResult, failure.reniecDatos, detectedType, detectedNumber, detectedExpiration);
    setDocumentVerified(true);
    setDocumentAnalysisMetadata(failure.analysisMetadata ?? null);
    setFrontFileVerificationError(null);
    setBackFileVerificationError(null);
    setVerificationFailureCount(3);
    setSuccessMessage('Documento habilitado despues del tercer intento. Completa o corrige los datos antes de guardar.');
  }, [applyVerifiedDocumentData, values.tipoDocumento]);

  const handleDocumentValidationFailure = useCallback((failure: LastVerificationFailure) => {
    const nextCount = verificationFailureCount + 1;
    if (nextCount >= 3) {
      setLastVerificationFailure(failure);
      allowContinueAfterThirdFailure(failure);
      return;
    }
    setVerificationFailureCount(nextCount);
    setLastVerificationFailure(failure);
    setFrontFileVerificationError(failure.frontError ?? null);
    setBackFileVerificationError(failure.backError ?? null);
    setTouched((prev) => ({
      ...prev,
      ...(failure.frontError ? { frontFile: true } : {}),
      ...(failure.backError ? { backFile: true } : {}),
    }));
  }, [allowContinueAfterThirdFailure, verificationFailureCount]);

  const applyDocumentImagePolicy = (policy?: DocumentImagePolicy | null) => {
    const shouldPersist = policy?.shouldPersistDocumentImages !== false;
    setIsExistingUserWithImages(Boolean(policy?.userHasStoredImages));
    setShouldPersistDocumentImages(shouldPersist);
    return shouldPersist;
  };

  const validateSectionOne = () => {
    if (!values.semestreId) return 'Selecciona un periodo.';
    if (!values.tipoDocumento) return 'Selecciona el tipo de documento.';
    const documentNumberError = getDocumentNumberValidationError(values.tipoDocumento, values.dni);
    if (documentNumberError) return documentNumberError;
    if (!frontFile) return 'Sube la imagen del DNI frente.';
    if (!backFile) return 'Sube la imagen del DNI reverso.';
    return null;
  };

  const getFieldError = useCallback((key: string) => {
    if (!touched[key]) return '';
    if (key === 'semestreId' && !values.semestreId) return 'Esta pregunta es obligatoria.';
    if (key === 'dni') {
      return getDocumentNumberValidationError(values.tipoDocumento, values.dni);
    }
    if (key === 'frontFile' && !frontFile) return 'Esta pregunta es obligatoria.';
    if (key === 'frontFile' && frontFileVerificationError) return frontFileVerificationError;
    if (key === 'backFile' && !backFile) return 'Esta pregunta es obligatoria.';
    if (key === 'backFile' && backFileVerificationError) return backFileVerificationError;
    const requiredLabels: Partial<Record<keyof MatriculaFormValues, string>> = {
      apellidoPaterno: 'Esta pregunta es obligatoria.',
      apellidoMaterno: 'Esta pregunta es obligatoria.',
      nombre: 'Esta pregunta es obligatoria.',
      sexo: 'Esta pregunta es obligatoria.',
      nacionalidad: 'Esta pregunta es obligatoria.',
      fechaNacimiento: 'Esta pregunta es obligatoria.',
      estadoCivil: 'Esta pregunta es obligatoria.',
      instruccion: 'Esta pregunta es obligatoria.',
      direccion: 'Esta pregunta es obligatoria.',
      distrito: 'Esta pregunta es obligatoria.',
      celular: 'Esta pregunta es obligatoria.',
      recibo: 'Esta pregunta es obligatoria.',
      grupoId: 'Esta pregunta es obligatoria.',
    };
    if (
      key === 'nombreColegio'
      && values.instruccion === SECONDARY_INCOMPLETE_VALUE
      && !values.nombreColegio.trim()
    ) {
      return 'Esta pregunta es obligatoria.';
    }
    if (key in requiredLabels && !String(values[key as keyof MatriculaFormValues] || '').trim()) {
      return requiredLabels[key as keyof MatriculaFormValues] || '';
    }
    if (key === 'fechaNacimiento') {
      return getBirthDateValidationError(values.fechaNacimiento);
    }
    if (key === 'celular' && values.celular.trim() && !/^9\d{8}$/.test(values.celular.trim())) {
      return 'El celular debe tener 9 digitos y empezar con 9.';
    }
    if (key === 'email' && values.email.trim()) {
      return getEmailValidationError(values.email);
    }
    if (key === 'recibo' && values.recibo.trim() && !isValidReciboValue(values.recibo)) {
      return 'Ingresa hasta 5 digitos o selecciona CONADIS/BECADO/POR REGULARIZAR.';
    }
    return '';
  }, [backFile, backFileVerificationError, frontFile, frontFileVerificationError, touched, values]);

  const handleVerifyDocument = async () => {
    if (documentVerified) return;

    const sectionError = validateSectionOne();
    if (sectionError) {
      setTouched((prev) => ({
        ...prev,
        semestreId: true,
        dni: true,
        frontFile: true,
        backFile: true,
      }));
      setMessage(isStandalone ? null : sectionError);
      return;
    }

    const currentFrontSignature = fileSignature(frontFile);
    const currentBackSignature = fileSignature(backFile);
    if (
      lastVerificationFailure
      && !documentVerified
      && verificationFailureCount > 0
    ) {
      const frontStillFailed = Boolean(
        lastVerificationFailure.frontError
        && lastVerificationFailure.frontSignature === currentFrontSignature,
      );
      const backStillFailed = Boolean(
        lastVerificationFailure.backError
        && lastVerificationFailure.backSignature === currentBackSignature,
      );
      if (frontStillFailed || backStillFailed) {
        setMessage(null);
        setSuccessMessage(null);
        handleDocumentValidationFailure(lastVerificationFailure);
        return;
      }
    }

    setLoading(true);
    setMessage(null);
    setSuccessMessage(null);
    setFrontFileVerificationError(null);
    setBackFileVerificationError(null);
    setDocumentAnalysisMetadata(null);
    try {
      const files = [frontFile, backFile].filter((file): file is File => Boolean(file));
      if (files.length === 0) {
        registerVerificationFailure();
        setFrontFileVerificationError(
          reconocimientoDniActivo
            ? 'Sube al menos un archivo del documento para analizarlo con Gemini.'
            : 'Sube al menos un archivo del documento.',
        );
        setTouched((prev) => ({ ...prev, frontFile: true }));
        return;
      }

      const reniecPromise = fetchReniecForVerification().catch(() => null);
      if (!reconocimientoDniActivo) {
        if (!frontFile || !backFile) return;
        const ocrPromise = (async () => {
          const verificarMatriculaOcrSimple = httpsCallable<
            {
              tipoDocumento: string;
              dni: string;
              frente: Awaited<ReturnType<typeof fileToOcrSimpleInput>>;
              reverso: Awaited<ReturnType<typeof fileToOcrSimpleInput>>;
            },
            VerificarOcrSimpleResponse
          >(functions, 'verificarMatriculaOcrSimple', { timeout: 60000 });
          const [frente, reverso] = await Promise.all([
            fileToOcrSimpleInput(frontFile),
            fileToOcrSimpleInput(backFile),
          ]);
          const result = await verificarMatriculaOcrSimple({
            tipoDocumento: values.tipoDocumento,
            dni: normalizeDocumentNumber(values.dni),
            frente,
            reverso,
          });
          return result.data;
        })();
        const [reniecResult, ocrResult] = await Promise.all([
          reniecPromise,
          ocrPromise,
        ]);
        const reniecDatos = reniecResult?.datos ?? null;
        const documentPolicy = reniecResult?.documentImagePolicy ?? null;
        if (!ocrResult.frontValid || !ocrResult.backValid) {
          handleDocumentValidationFailure({
            frontSignature: currentFrontSignature,
            backSignature: currentBackSignature,
            reason: 'simple_ocr',
            message: [
              ocrResult.frontError,
              ocrResult.backError,
            ].filter(Boolean).join(' '),
            frontError: ocrResult.frontError ?? null,
            backError: ocrResult.backError ?? null,
            aiResult: null,
            reniecDatos,
            analysisMetadata: null,
          });
          return;
        }
        const shouldPersist = applyDocumentImagePolicy(documentPolicy);
        const { uploadedFront, uploadedBack } = await uploadVerifiedDocumentImages(shouldPersist, 0, 1, [frontFile, backFile]);
        setFrontImage(uploadedFront);
        setBackImage(uploadedBack);
        applyVerifiedDocumentData(
          null,
          reniecDatos,
          values.tipoDocumento === 'CE' ? 'CE' : 'DNI',
          normalizeDocumentNumber(values.dni),
          '',
        );
        setDocumentVerified(true);
        setVerificationFailureCount(0);
        setLastVerificationFailure(null);
        setFrontFileVerificationError(null);
        setBackFileVerificationError(null);
        setDocumentAnalysisMetadata(null);
        setSuccessMessage(
          reniecDatos
            ? 'Datos cargados con API. Revisa y completa los datos del usuario.'
            : 'Documento habilitado sin reconocimiento de DNI. Completa los datos del usuario.',
        );
        return;
      }

      const verificarMatriculaGemini = httpsCallable<
        {
          tipoDocumento: string;
          dni: string;
          archivos: Awaited<ReturnType<typeof fileToOcrSimpleInput>>[];
        },
        GeminiMatriculaResult
      >(functions, 'verificarMatriculaGemini', { timeout: 90000 });
      const archivos = await Promise.all(files.map(fileToOcrSimpleInput));
      const geminiResult = await verificarMatriculaGemini({
        tipoDocumento: values.tipoDocumento,
        dni: normalizeDocumentNumber(values.dni),
        archivos,
      });
      const aiResult = geminiResult.data;
      const reniecResult = await reniecPromise;
      const reniecDatos = reniecResult?.datos ?? null;
      const documentPolicy = reniecResult?.documentImagePolicy ?? null;
      const detectedType = normalizeAiDocumentType(aiResult.tipoDocumento);
      const detectedNumber = normalizeDetectedDocumentNumber(values.tipoDocumento, aiResult.numeroDocumento);
      const expectedNumber = normalizeDocumentNumber(values.dni);
      const documentMatches = detectedType === values.tipoDocumento && detectedNumber === expectedNumber;
      const fileClassification = classifyGeminiFiles(files, aiResult);
      const analysisMetadata: DocumentoAnalisisTemporal = {
        motor: 'gemini',
        pdfDuplicadoConDeteccionDeCuerpos: false,
        archivos: fileClassification.archivos,
        respuestaGemini: compactGeminiResultForMessage(aiResult),
      };

      if (!documentMatches || !aiResult.contieneReverso || fileClassification.reverseIndex === null) {
        const frontError = fileClassification.frontIndex === null
          ? 'No se encontro lado de frente del DNI.'
          : !documentMatches
            ? 'No se pudo validar el documento con los datos ingresados.'
            : null;
        const backError = !aiResult.contieneReverso || fileClassification.reverseIndex === null
          ? 'No se encontro el lado reverso del DNI.'
          : null;
        handleDocumentValidationFailure({
          frontSignature: currentFrontSignature,
          backSignature: currentBackSignature,
          reason: 'document_mismatch',
          message: [frontError, backError].filter(Boolean).join(' '),
          frontError,
          backError,
          aiResult,
          reniecDatos,
          analysisMetadata,
        });
        setSuccessMessage(null);
        return;
      }

      const detectedExpiration = normalizeDateInput(aiResult.fechaVencimiento);
      if (isExpiredDate(detectedExpiration)) {
        handleDocumentValidationFailure({
          frontSignature: currentFrontSignature,
          backSignature: currentBackSignature,
          reason: 'expired',
          message: 'Documento vencido.',
          frontError: 'Documento vencido.',
          backError: null,
          aiResult,
          reniecDatos,
          analysisMetadata,
        });
        setSuccessMessage(null);
        return;
      }

      const shouldPersist = applyDocumentImagePolicy(documentPolicy);
      const { uploadedFront, uploadedBack } = await uploadVerifiedDocumentImages(
        shouldPersist,
        fileClassification.frontIndex,
        fileClassification.reverseIndex,
        files,
      );
      setFrontImage(uploadedFront);
      setBackImage(uploadedBack);

      applyVerifiedDocumentData(aiResult, reniecDatos, detectedType, detectedNumber, detectedExpiration);
      setDocumentVerified(true);
      setVerificationFailureCount(0);
      setLastVerificationFailure(null);
      setFrontFileVerificationError(null);
      setBackFileVerificationError(null);
      setDocumentAnalysisMetadata(analysisMetadata);
      setSuccessMessage('Documento verificado con Gemini. Revisa y completa los datos del usuario.');
    } catch (error) {
      const errorMessage = getCallableErrorMessage(error, 'No se pudo verificar el documento.');
      handleDocumentValidationFailure({
        frontSignature: currentFrontSignature,
        backSignature: currentBackSignature,
        reason: 'analysis_error',
        message: errorMessage,
        frontError: errorMessage,
        backError: errorMessage,
        aiResult: null,
        reniecDatos: null,
        analysisMetadata: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const validateSectionTwo = () => {
    const required: Array<[keyof MatriculaFormValues, string]> = [
      ['apellidoPaterno', 'Apellido Paterno'],
      ['apellidoMaterno', 'Apellido Materno'],
      ['nombre', 'Nombres'],
      ['sexo', 'Sexo'],
      ['nacionalidad', 'Nacionalidad'],
      ['fechaNacimiento', 'Fecha de Nacimiento'],
      ['estadoCivil', 'Estado Civil'],
      ['instruccion', 'Grado de Instruccion'],
      ['direccion', 'Domicilio Direccion'],
      ['distrito', 'Domicilio Distrito'],
      ['celular', 'Numero de Celular'],
      ['recibo', 'Numero de recibo'],
    ];
    const missing = required.find(([key]) => !String(values[key] || '').trim());
    if (missing) return `Completa ${missing[1]}.`;
    if (values.instruccion === SECONDARY_INCOMPLETE_VALUE && !values.nombreColegio.trim()) {
      return 'Completa Nombre de colegio.';
    }
    const birthDateError = getBirthDateValidationError(values.fechaNacimiento);
    if (birthDateError) return birthDateError;
    if (!/^9\d{8}$/.test(values.celular.trim())) return 'El celular debe tener 9 digitos y empezar con 9.';
    const emailError = getEmailValidationError(values.email);
    if (emailError) return emailError;
    if (!isValidReciboValue(values.recibo)) return 'El recibo debe ser CONADIS, BECADO, POR REGULARIZAR o hasta 5 digitos.';
    return null;
  };

  const handleSubmit = async () => {
    if (!documentVerified) {
      setMessage('Primero verifica el documento de identidad.');
      return;
    }
    const sectionTwoError = validateSectionTwo();
    if (sectionTwoError) {
      setTouched((prev) => ({
        ...prev,
        apellidoPaterno: true,
        apellidoMaterno: true,
        nombre: true,
        sexo: true,
        nacionalidad: true,
        fechaNacimiento: true,
        estadoCivil: true,
        instruccion: true,
        direccion: true,
        distrito: true,
        celular: true,
        nombreColegio: values.instruccion === SECONDARY_INCOMPLETE_VALUE,
        email: true,
        recibo: true,
      }));
      setMessage(isStandalone ? null : sectionTwoError);
      return;
    }
    if (!values.grupoId || !values.paqueteId) {
      markTouched('grupoId');
      setMessage(isStandalone ? null : 'Selecciona un modulo.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setSuccessMessage(null);
    try {
      const [finalFrontImage, finalBackImage] = await Promise.all([
        shouldPersistDocumentImages && !frontImage && frontFile
          ? uploadDocumentImage(frontFile, 'frente')
          : Promise.resolve(frontImage),
        shouldPersistDocumentImages && !backImage && backFile
          ? uploadDocumentImage(backFile, 'reverso')
          : Promise.resolve(backImage),
      ]);
      if (finalFrontImage !== frontImage) setFrontImage(finalFrontImage);
      if (finalBackImage !== backImage) setBackImage(finalBackImage);
      const callableName = isEditing
        ? 'updateMatriculaFormulario'
        : isStandalone
          ? 'crearMatriculaFormularioSuelto'
          : 'crearMatriculaFormulario';
      const saveMatricula = httpsCallable<Record<string, unknown>, { id?: number; workspaceWarnings?: string[] }>(
        functions,
        callableName,
        { timeout: 60000 },
      );
      const result = await saveMatricula({
        ...(isEditing ? { id: Number(matriculaId) } : {}),
        ...values,
        dni: normalizeDocumentNumber(values.dni),
        nombreColegio: values.instruccion === SECONDARY_INCOMPLETE_VALUE ? values.nombreColegio : '',
        fechaNacimiento: normalizeDateInput(values.fechaNacimiento) || values.fechaNacimiento,
        semestreId: Number(values.semestreId),
        paqueteId: Number(values.paqueteId),
        grupoId: Number(values.grupoId),
        ...(isStandalone ? { formularioMatriculaTipo: standaloneFormKind } : {}),
        dniImagenFrente: shouldPersistDocumentImages ? finalFrontImage : null,
        dniImagenReverso: shouldPersistDocumentImages ? finalBackImage : null,
        procesarImagenesDni: shouldPersistDocumentImages,
        analisisDocumentoTemporal: documentAnalysisMetadata,
      });
      const workspaceWarnings = result.data.workspaceWarnings || [];
      setSuccessMessage([
        isEditing ? 'Matricula actualizada correctamente.' : 'Matricula registrada correctamente.',
        ...workspaceWarnings.map((warning) => `Advertencia Workspace: ${warning}`),
      ].join('\n'));
      onSaved({ id: result.data.id });
    } catch (error) {
      setMessage(getCallableErrorMessage(error, isEditing ? 'No se pudo actualizar la matricula.' : 'No se pudo registrar la matricula.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (side: 'frente' | 'reverso') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setDocumentFile(side, file);
    event.target.value = '';
  };

  const openFilePreview = useCallback((file: File | null, image: UploadedImage | null) => {
    if (file) {
      const url = URL.createObjectURL(file);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }
    if (image?.url) {
      window.open(image.url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const renderDocumentFileControl = (
    side: 'frente' | 'reverso',
    file: File | null,
    image: UploadedImage | null,
    title: React.ReactNode,
  ) => {
    const errorKey = side === 'frente' ? 'frontFile' : 'backFile';
    const error = getFieldError(errorKey);
    const hasFile = Boolean(file || image?.url);

    return (
      <Box sx={isStandalone ? standaloneCardSx(errorKey) : undefined}>
        {isStandalone ? (
          <>
            <Typography variant="subtitle1" sx={{ color: 'text.primary', mb: 1.25 }}>
              {title}
            </Typography>
            <Box
              component="img"
              src={`/media/matricula/${side === 'frente' ? 'dni-frente.jpg' : 'dni-reverso.jpg'}`}
              alt={side === 'frente' ? 'Ejemplo DNI frente' : 'Ejemplo DNI reverso'}
              sx={{
                display: 'block',
                width: 160,
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 1,
                mb: 1.5,
              }}
            />
          </>
        ) : null}
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          {hasFile ? (
            <Button
              variant="outlined"
              startIcon={<InsertDriveFileIcon />}
              onClick={() => openFilePreview(file, image)}
              disabled={loading}
              sx={{
                flex: 1,
                maxWidth: '100%',
                justifyContent: 'space-between',
                textTransform: 'none',
                overflow: 'hidden',
                ...(isStandalone ? { flex: '0 1 auto' } : {}),
                '& .MuiButton-endIcon': { ml: 1 },
              }}
              endIcon={documentSectionLocked ? undefined : (
                <Box
                  component="span"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDocumentFile(side, null);
                    markTouched(side === 'frente' ? 'frontFile' : 'backFile');
                  }}
                  sx={{ display: 'inline-flex', color: 'text.secondary' }}
                >
                  <ClearIcon fontSize="small" />
                </Box>
              )}
            >
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file?.name || (side === 'frente' ? 'dni-frente' : 'dni-reverso')}
              </Box>
            </Button>
          ) : (
            <Button
              component="label"
              variant="outlined"
              startIcon={isStandalone ? <UploadFileIcon /> : undefined}
              disabled={documentFileControlsLocked}
              sx={{
                flex: isStandalone ? '0 0 auto' : 1,
                justifyContent: 'flex-start',
                textTransform: 'none',
              }}
            >
              {isStandalone ? 'Agregar archivo' : title}
              <input
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                hidden
                onBlur={() => markTouched(side === 'frente' ? 'frontFile' : 'backFile')}
                onChange={handleFileChange(side)}
              />
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<CameraAltIcon />}
            disabled={documentFileControlsLocked}
            onClick={() => openCameraCapture(side)}
            sx={{ display: { xs: 'none', md: 'inline-flex' }, ml: 'auto' }}
          >
            Camara
          </Button>
        </Stack>
        {isStandalone ? renderFieldError(errorKey) : error ? (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75 }}>
            {error}
          </Typography>
        ) : null}
      </Box>
    );
  };

  const lockedUntilVerified = !documentVerified || loading;
  const courseLocked = !documentVerified || loadingOptions || loading;
  const courseSelectionLocked = courseLocked || Boolean(courseOnlyEditMode && (courseChangeExpired || courseChangeLimitReached));
  const documentControlsLocked = documentSectionLocked || loading;
  const documentFileControlsLocked = documentControlsLocked || documentVerified;
  const verifyDocumentButtonLocked = documentControlsLocked || documentVerified;
  const responsableLabel = responsableName(responsable)
    || responsableUserName(responsableUser)
    || (isEditing ? 'Sin responsable registrado' : 'Cargando responsable...');
  const requiredLabel = (label: string) => (
    isStandalone
      ? (
        <Box component="span">
          {label} <Box component="span" sx={{ color: 'error.main' }}>*</Box>
        </Box>
      )
      : `${label} (*)`
  );
  const optionalLabel = (label: string) => (isStandalone ? `${label} (Opcional)` : label);
  const textFieldVariant = isStandalone ? 'standard' : 'outlined';
  const renderFieldError = (key: string) => {
    const error = getFieldError(key);
    if (!error) return null;
    return (
      <Box component="span" sx={{ display: 'inline-flex', gap: 1, alignItems: 'center', mt: 1.25, color: 'error.main' }}>
        <ErrorOutlineIcon sx={{ fontSize: 19 }} />
        <Typography component="span" variant="caption" sx={{ color: 'error.main' }}>
          {error}
        </Typography>
      </Box>
    );
  };
  const questionCardSx = isStandalone
    ? {
      p: { xs: 2.25, md: 2.75 },
      bgcolor: '#fff',
      border: '1px solid #dadce0',
      borderRadius: 2,
      boxShadow: '0 1px 2px rgba(60, 64, 67, 0.12)',
    }
    : {};
  const standaloneCardSx = (errorKey?: string) => ({
    ...questionCardSx,
    ...(errorKey && getFieldError(errorKey)
      ? {
        borderColor: 'error.main',
      }
      : {}),
    '& .MuiFormLabel-root.Mui-error, & .MuiInputLabel-root.Mui-error': {
      color: 'text.primary',
    },
  });
  const standaloneHelperText = (key: string) => (
    isStandalone ? renderFieldError(key) : getFieldError(key)
  );
  const standaloneRadioSx = (errorKey?: string) => (
    isStandalone
      ? {
        ...standaloneCardSx(errorKey),
        '& .MuiFormLabel-root': {
          color: 'text.primary',
          fontSize: 16,
          mb: 1.1,
        },
        '& .MuiFormLabel-root.Mui-focused, & .MuiFormLabel-root.Mui-error': {
          color: 'text.primary',
        },
        '& .MuiRadioGroup-root': {
          gap: 1.85,
        },
        '& .MuiFormControlLabel-root': {
          alignItems: 'center',
          m: 0,
          minHeight: 0,
        },
        '& .MuiRadio-root': {
          p: 0,
          mr: 1,
        },
        '& .MuiFormControlLabel-label': {
          lineHeight: 1.25,
        },
      }
      : undefined
  );
  const textFieldSx = (errorKey?: string) => (
    isStandalone
      ? {
        ...standaloneCardSx(errorKey),
        ...inputLineSx,
      }
      : undefined
  );
  const inputLineSx = isStandalone
    ? {
      '& .MuiInputBase-root': {
        width: { xs: '100%', sm: '62.5%' },
        transform: 'translateY(-5px)',
      },
      '& .MuiInputBase-input': {
        px: 0,
      },
      '& .MuiInput-root:before': {
        borderBottomColor: 'rgba(0, 0, 0, 0.24)',
      },
      '& .MuiInput-root:hover:not(.Mui-disabled):before': {
        borderBottomColor: 'rgba(0, 0, 0, 0.54)',
      },
      '& .MuiFormLabel-root': {
        color: 'text.primary',
        fontSize: 16,
        transform: 'none',
        position: 'static',
        mb: 1.1,
      },
      '& .MuiFormLabel-root.Mui-focused, & .MuiFormLabel-root.Mui-error': {
        color: 'text.primary',
      },
      '& .MuiFormHelperText-root': {
        mx: 0,
      },
    }
    : undefined;
  const selectLineSx = isStandalone
    ? {
      '& .MuiInputBase-root': {
        width: { xs: '100%', sm: '50%' },
      },
      '& .MuiFormLabel-root': {
        color: 'text.primary',
        fontSize: 16,
        transform: 'none',
        position: 'static',
        mb: 1.1,
      },
      '& .MuiFormLabel-root.Mui-focused, & .MuiFormLabel-root.Mui-error': {
        color: 'text.primary',
      },
    }
    : undefined;
  const gridSx = {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', md: isStandalone ? '1fr' : 'repeat(2, minmax(0, 1fr))' },
    gap: isStandalone ? 1.5 : 2,
  };
  const renderReciboField = (disabled: boolean) => {
    const input = (
      <Autocomplete
        freeSolo
        options={[...RECIBO_OPTIONS]}
        value={values.recibo || null}
        inputValue={values.recibo}
        disabled={disabled}
        onInputChange={(_event, nextValue) => updateValue('recibo', normalizeReciboInputValue(nextValue))}
        onChange={(_event, nextValue) => updateValue('recibo', normalizeReciboInputValue(nextValue))}
        renderInput={(params) => (
          <TextField
            {...params}
            label={requiredLabel('Numero de recibo')}
            variant={textFieldVariant}
            placeholder={isStandalone ? 'Tu respuesta' : undefined}
            sx={isStandalone ? inputLineSx : undefined}
            onBlur={() => markTouched('recibo')}
            error={Boolean(getFieldError('recibo'))}
            helperText={standaloneHelperText('recibo')}
            fullWidth
          />
        )}
      />
    );

    return isStandalone ? <Box sx={standaloneCardSx('recibo')}>{input}</Box> : input;
  };

  const renderBirthDateField = (disabled: boolean) => (
    <Box sx={{ position: 'relative' }}>
      <TextField
        disabled={disabled}
        label={requiredLabel('Fecha de Nacimiento')}
        variant={textFieldVariant}
        placeholder="dd/mm/aaaa"
        sx={textFieldSx('fechaNacimiento')}
        value={formatDateInputForDisplay(values.fechaNacimiento)}
        onChange={(event) => {
          updateValue('fechaNacimiento', formatDateTypingValue(event.target.value));
        }}
        onBlur={() => {
          markTouched('fechaNacimiento');
          const normalized = normalizeDateInput(values.fechaNacimiento);
          if (normalized) updateValue('fechaNacimiento', formatDateInputForDisplay(normalized));
        }}
        error={Boolean(getFieldError('fechaNacimiento'))}
        helperText={standaloneHelperText('fechaNacimiento')}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                size="small"
                aria-label="Seleccionar fecha"
                disabled={disabled}
                onClick={() => {
                  const picker = birthDatePickerRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
                  if (picker?.showPicker) picker.showPicker();
                  else picker?.click();
                }}
              >
                <CalendarMonthIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        fullWidth
      />
      <Box
        component="input"
        ref={birthDatePickerRef}
        type="date"
        value={normalizeDateInput(values.fechaNacimiento)}
        onChange={(event) => updateValue('fechaNacimiento', formatDateInputForDisplay(event.target.value))}
        tabIndex={-1}
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
          bottom: 0,
          right: 0,
        }}
      />
    </Box>
  );
  const formatChangeUserName = (user: NonNullable<NonNullable<MatriculaListItem['cambiosModulo']>[number]['registradoPor']>) =>
    user.username
    || [user.apellidoPaterno, user.apellidoMaterno, user.nombre].filter(Boolean).join(' ').trim()
    || user.correoInstitucional
    || user.email
    || '';
  const selectedPaqueteOption = paquetes.find((paquete) => String(getPaqueteOptionGrupoId(paquete)) === values.grupoId);
  const currentGrupoModuloName = selectedPaqueteOption ? getPaqueteOptionLabel(selectedPaqueteOption) : '';
  const formatModuloChangeDetails = (date?: string | null, userName?: string | null, dateLabel = 'Fecha de cambio') =>
    [
      date ? `${dateLabel}: ${formatDateTimeForDisplay(date)}` : '',
      userName ? `Registrado por: ${userName}` : '',
    ].filter(Boolean).join(' · ');
  const moduloChangeTimeline = (() => {
    if (!isEditing || moduleChanges.length === 0) return [];
    const latestChange = moduleChanges[0];
    const rows = [{
      marker: '*',
      name: getNewModuloChangeName(latestChange) || currentGrupoModuloName || 'Modulo actual',
      details: formatModuloChangeDetails(
        latestChange.fechaCambio,
        latestChange.registradoPor ? formatChangeUserName(latestChange.registradoPor) : '',
      ),
    }];

    for (const [index, change] of moduleChanges.entries()) {
      const name = getPreviousModuloChangeName(change);
      if (!name) continue;
      const isOriginal = index === moduleChanges.length - 1;
      rows.push({
        marker: '<-',
        name,
        details: isOriginal
          ? formatModuloChangeDetails(matriculaOriginalDate || 'Sin fecha registrada', responsableLabel, 'Fecha de creacion')
          : formatModuloChangeDetails(
            change.fechaCambio,
            change.registradoPor ? formatChangeUserName(change.registradoPor) : '',
          ),
      });
    }

    return rows;
  })();

  return (
    <Box sx={{ position: 'relative' }}>
      <FormLoadingOverlay open={loading} variant="contained" />
      <Stack spacing={isStandalone ? 1.5 : 2.5}>
        <AutoDismissAlert message={message} severity="error" sx={{ whiteSpace: 'pre-wrap' }} />
        <AutoDismissAlert message={successMessage} severity="success" sx={{ whiteSpace: 'pre-wrap' }} />
        <Box sx={questionCardSx}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Responsable del llenado de la matricula
        </Typography>
        <FormControlLabel
          control={<Checkbox checked disabled />}
          label={responsableLabel}
          sx={{
            m: 0,
            '& .MuiFormControlLabel-label': {
              color: 'text.primary',
              fontWeight: 600,
            },
          }}
        />
      </Box>
      {!courseOnlyEditMode ? (
      <Stack spacing={1.5}>
        {!isStandalone ? (
          <Typography variant="subtitle2" fontWeight={700}>
            Documento de Identidad
          </Typography>
        ) : null}
        <Box sx={gridSx}>
          {!hideSemestreControl ? (
          <FormControl fullWidth error={Boolean(getFieldError('semestreId'))} variant={isStandalone ? 'standard' : 'outlined'} sx={selectLineSx}>
            <InputLabel>{requiredLabel('Periodo')}</InputLabel>
            <Select
              label={isStandalone ? undefined : 'Periodo (*)'}
              variant={isStandalone ? 'standard' : 'outlined'}
              value={values.semestreId}
              onChange={(event) => updateValue('semestreId', String(event.target.value))}
              onBlur={() => markTouched('semestreId')}
              disabled={loadingOptions || documentControlsLocked}
            >
              {semestres.map((semestre) => (
                <MenuItem key={semestre.id} value={String(semestre.id)}>
                  {semestre.titulo || semestre.nombre || `Semestre ${semestre.id}`}
                </MenuItem>
              ))}
            </Select>
            {getFieldError('semestreId') ? (
              <Typography variant="caption" color="error" sx={{ mt: 0.75 }}>
                {getFieldError('semestreId')}
              </Typography>
            ) : null}
          </FormControl>
          ) : null}
          <FormControl fullWidth disabled={documentControlsLocked} variant={isStandalone ? 'standard' : 'outlined'} sx={isStandalone ? standaloneRadioSx() : selectLineSx}>
            {isStandalone ? <FormLabel>{requiredLabel('Tipo documento')}</FormLabel> : <InputLabel>{requiredLabel('Tipo documento')}</InputLabel>}
            {isStandalone ? (
              <RadioGroup
                value={values.tipoDocumento}
                onChange={(event) => updateValue('tipoDocumento', event.target.value === 'CE' ? 'CE' : 'DNI')}
              >
                <FormControlLabel value="DNI" control={<Radio />} label="DNI" />
                <FormControlLabel value="CE" control={<Radio />} label="Carnet de Extranjeria" />
              </RadioGroup>
            ) : (
              <Select
                label="Tipo documento (*)"
                value={values.tipoDocumento}
                onChange={(event) => updateValue('tipoDocumento', event.target.value === 'CE' ? 'CE' : 'DNI')}
                disabled={documentControlsLocked}
              >
                <MenuItem value="DNI">DNI</MenuItem>
                <MenuItem value="CE">CE</MenuItem>
              </Select>
            )}
          </FormControl>
          <TextField
            label={requiredLabel('Numero de Documento')}
            variant={textFieldVariant}
            placeholder={isStandalone ? 'Tu respuesta' : undefined}
            sx={textFieldSx('dni')}
            value={values.dni}
            onChange={(event) => {
              const maxLength = values.tipoDocumento === 'CE' ? 9 : 8;
              updateValue('dni', event.target.value.replace(/\D/g, '').slice(0, maxLength));
            }}
            onBlur={() => markTouched('dni')}
            error={Boolean(getFieldError('dni'))}
            helperText={standaloneHelperText('dni')}
            disabled={documentControlsLocked}
            inputRef={dniInputRef}
            autoFocus={!isEditing}
            fullWidth
          />
          {!isStandalone ? <Box sx={{ display: { xs: 'none', md: 'block' } }} /> : null}
          {renderDocumentFileControl('frente', frontFile, frontImage, requiredLabel('Imagen DNI ó Documento de Extranjeria (De Frente)'))}
          {renderDocumentFileControl('reverso', backFile, backImage, requiredLabel('Imagen DNI ó Documento de Extranjeria (De Reverso)'))}
          <Box className="matricula-actions" sx={{ gridColumn: { xs: 'span 1', md: isStandalone ? 'span 1' : 'span 2' }, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Button onClick={handleCancelFromVerification} disabled={loading}>{isStandalone ? 'RESETEAR' : 'Cancelar'}</Button>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={handleVerifyDocument} disabled={verifyDocumentButtonLocked}>
                Verificar y continuar
              </Button>
            </Stack>
          </Box>
        </Box>
      </Stack>
      ) : null}

      {!courseOnlyEditMode ? (
      <Stack
        component="fieldset"
        disabled={lockedUntilVerified}
        spacing={1.5}
        sx={{
          m: 0,
          p: 0,
          border: 0,
          minWidth: 0,
          opacity: lockedUntilVerified ? 0.55 : 1,
        }}
      >
        {!isStandalone ? (
          <Typography variant="subtitle2" fontWeight={700}>
            Datos de Usuario
          </Typography>
        ) : null}
        <Box sx={gridSx}>
          <TextField disabled={lockedUntilVerified} label={requiredLabel('Apellido Paterno')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx('apellidoPaterno')} value={values.apellidoPaterno} onChange={(event) => updateValue('apellidoPaterno', event.target.value)} onBlur={() => markTouched('apellidoPaterno')} error={Boolean(getFieldError('apellidoPaterno'))} helperText={standaloneHelperText('apellidoPaterno')} fullWidth />
          <TextField disabled={lockedUntilVerified} label={requiredLabel('Apellido Materno')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx('apellidoMaterno')} value={values.apellidoMaterno} onChange={(event) => updateValue('apellidoMaterno', event.target.value)} onBlur={() => markTouched('apellidoMaterno')} error={Boolean(getFieldError('apellidoMaterno'))} helperText={standaloneHelperText('apellidoMaterno')} fullWidth />
          <TextField disabled={lockedUntilVerified} label={requiredLabel('Nombres')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx('nombre')} value={values.nombre} onChange={(event) => updateValue('nombre', event.target.value)} onBlur={() => markTouched('nombre')} error={Boolean(getFieldError('nombre'))} helperText={standaloneHelperText('nombre')} fullWidth />
          <FormControl disabled={lockedUntilVerified} error={Boolean(getFieldError('sexo'))} onBlur={() => markTouched('sexo')} sx={standaloneRadioSx('sexo')}>
            <FormLabel>{requiredLabel('Sexo')}</FormLabel>
            <RadioGroup row={!isStandalone} value={values.sexo} onChange={(event) => updateValue('sexo', event.target.value === 'M' ? 'M' : 'F')}>
              <FormControlLabel value="F" control={<Radio />} label="Femenino" />
              <FormControlLabel value="M" control={<Radio />} label="Masculino" />
            </RadioGroup>
            {isStandalone ? renderFieldError('sexo') : getFieldError('sexo') ? <Typography variant="caption" color="error">{getFieldError('sexo')}</Typography> : null}
          </FormControl>
          <TextField disabled={lockedUntilVerified} label={requiredLabel('Nacionalidad')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx('nacionalidad')} value={values.nacionalidad} onChange={(event) => updateValue('nacionalidad', event.target.value)} onBlur={() => markTouched('nacionalidad')} error={Boolean(getFieldError('nacionalidad'))} helperText={standaloneHelperText('nacionalidad')} fullWidth />
          {renderBirthDateField(lockedUntilVerified)}
          {!isStandalone ? <TextField disabled={lockedUntilVerified} label="Fecha de Vencimiento" variant={textFieldVariant} sx={textFieldSx()} type="date" value={values.fechaVencimiento} onChange={(event) => updateValue('fechaVencimiento', event.target.value)} InputLabelProps={{ shrink: true }} fullWidth /> : null}
          <FormControl fullWidth disabled={lockedUntilVerified} error={Boolean(getFieldError('estadoCivil'))} variant={isStandalone ? 'standard' : 'outlined'} sx={isStandalone ? standaloneRadioSx('estadoCivil') : selectLineSx}>
            {isStandalone ? (
              <>
                <FormLabel>{requiredLabel('Estado Civil')}</FormLabel>
                <RadioGroup value={values.estadoCivil} onChange={(event) => updateValue('estadoCivil', String(event.target.value))} onBlur={() => markTouched('estadoCivil')}>
                  <FormControlLabel value="Soltero(a)" control={<Radio />} label="Soltero(a)" />
                  <FormControlLabel value="Casado(a)" control={<Radio />} label="Casado(a)" />
                  <FormControlLabel value="Viudo(a)" control={<Radio />} label="Viudo(a)" />
                  <FormControlLabel value="Divorciado(a)" control={<Radio />} label="Divorciado(a)" />
                </RadioGroup>
                {renderFieldError('estadoCivil')}
              </>
            ) : (
              <>
                <InputLabel>{requiredLabel('Estado Civil')}</InputLabel>
                <Select label="Estado Civil (*)" value={values.estadoCivil} onChange={(event) => updateValue('estadoCivil', String(event.target.value))} onBlur={() => markTouched('estadoCivil')}>
                  <MenuItem value="Soltero(a)">Soltero(a)</MenuItem>
                  <MenuItem value="Casado(a)">Casado(a)</MenuItem>
                  <MenuItem value="Viudo(a)">Viudo(a)</MenuItem>
                  <MenuItem value="Divorciado(a)">Divorciado(a)</MenuItem>
                </Select>
                {getFieldError('estadoCivil') ? <Typography variant="caption" color="error" sx={{ mt: 0.75 }}>{getFieldError('estadoCivil')}</Typography> : null}
              </>
            )}
          </FormControl>
          <TextField disabled={lockedUntilVerified} label={requiredLabel('Domicilio Direccion')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx('direccion')} value={values.direccion} onChange={(event) => updateValue('direccion', event.target.value)} onBlur={() => markTouched('direccion')} error={Boolean(getFieldError('direccion'))} helperText={standaloneHelperText('direccion')} fullWidth />
          <TextField disabled={lockedUntilVerified} label={requiredLabel('Domicilio Distrito')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx('distrito')} value={values.distrito} onChange={(event) => updateValue('distrito', event.target.value)} onBlur={() => markTouched('distrito')} error={Boolean(getFieldError('distrito'))} helperText={standaloneHelperText('distrito')} fullWidth />
          <TextField disabled={lockedUntilVerified} label={requiredLabel('Numero de Celular')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx('celular')} value={values.celular} onChange={(event) => updateValue('celular', event.target.value.replace(/\D/g, '').slice(0, 9))} onBlur={() => markTouched('celular')} error={Boolean(getFieldError('celular'))} helperText={standaloneHelperText('celular')} fullWidth />
          <FormControl fullWidth disabled={lockedUntilVerified} error={Boolean(getFieldError('instruccion'))} variant={isStandalone ? 'standard' : 'outlined'} sx={isStandalone ? standaloneRadioSx('instruccion') : selectLineSx}>
            {isStandalone ? (
              <>
                <FormLabel>{requiredLabel('Grado de Instruccion')}</FormLabel>
                <RadioGroup value={values.instruccion} onChange={(event) => updateValue('instruccion', String(event.target.value))} onBlur={() => markTouched('instruccion')}>
                  <FormControlLabel value="Primaria" control={<Radio />} label="Primaria" />
                  <FormControlLabel value="Secundaria" control={<Radio />} label="Secundaria" />
                  <FormControlLabel value={SECONDARY_INCOMPLETE_VALUE} control={<Radio />} label={SECONDARY_INCOMPLETE_VALUE} />
                  <FormControlLabel value="Superior" control={<Radio />} label="Superior" />
                </RadioGroup>
                {renderFieldError('instruccion')}
              </>
            ) : (
              <>
                <InputLabel>{requiredLabel('Grado de Instruccion')}</InputLabel>
                <Select label="Grado de Instruccion (*)" value={values.instruccion} onChange={(event) => updateValue('instruccion', String(event.target.value))} onBlur={() => markTouched('instruccion')}>
                  <MenuItem value="Primaria">Primaria</MenuItem>
                  <MenuItem value="Secundaria">Secundaria</MenuItem>
                  <MenuItem value={SECONDARY_INCOMPLETE_VALUE}>{SECONDARY_INCOMPLETE_VALUE}</MenuItem>
                  <MenuItem value="Superior">Superior</MenuItem>
                </Select>
                {getFieldError('instruccion') ? <Typography variant="caption" color="error" sx={{ mt: 0.75 }}>{getFieldError('instruccion')}</Typography> : null}
              </>
            )}
          </FormControl>
          {values.instruccion === SECONDARY_INCOMPLETE_VALUE ? (
            <TextField disabled={lockedUntilVerified} label={requiredLabel('Nombre de colegio (solo escolares)')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx('nombreColegio')} value={values.nombreColegio} onChange={(event) => updateValue('nombreColegio', event.target.value)} onBlur={() => markTouched('nombreColegio')} error={Boolean(getFieldError('nombreColegio'))} helperText={standaloneHelperText('nombreColegio')} fullWidth />
          ) : null}
          <TextField disabled={lockedUntilVerified} label={optionalLabel('Numero de Telefono Fijo')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx()} value={values.telefono} onChange={(event) => updateValue('telefono', event.target.value)} fullWidth />
          <TextField disabled={lockedUntilVerified} label={optionalLabel('Correo Electronico')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx('email')} type="email" value={values.email} onChange={(event) => updateValue('email', event.target.value)} onBlur={() => markTouched('email')} error={Boolean(getFieldError('email'))} helperText={standaloneHelperText('email')} fullWidth />
        </Box>
      </Stack>
      ) : null}

      <Stack
        component="fieldset"
        disabled={courseLocked}
        spacing={1.5}
        sx={{
          m: 0,
          p: 0,
          border: 0,
          minWidth: 0,
          opacity: courseLocked ? 0.55 : 1,
        }}
      >
        {!isStandalone ? (
          <Typography variant="subtitle2" fontWeight={700}>
            Datos de los Cursos
          </Typography>
        ) : null}
        <Stack spacing={2}>
          <FormControl fullWidth error={Boolean(getFieldError('grupoId'))} variant={isStandalone ? 'standard' : 'outlined'} sx={isStandalone ? standaloneRadioSx('grupoId') : undefined}>
            {isStandalone ? (
              <>
                <FormLabel>{requiredLabel('Seleccione un Modulo')}</FormLabel>
                <RadioGroup
                  value={values.grupoId}
                  onChange={(event) => updateGrupoSelection(String(event.target.value))}
                  onBlur={() => markTouched('grupoId')}
                >
                  {paquetes.map((paquete) => (
                    <FormControlLabel
                      key={getPaqueteOptionGrupoId(paquete)}
                      value={String(getPaqueteOptionGrupoId(paquete))}
                      control={<Radio />}
                      label={getPaqueteOptionLabel(paquete)}
                    />
                  ))}
                </RadioGroup>
                {renderFieldError('grupoId')}
              </>
            ) : (
              <>
                <InputLabel>{requiredLabel('Seleccione un Modulo')}</InputLabel>
                <Select
                  label="Seleccione un Modulo (*)"
                  value={values.grupoId}
                  onChange={(event) => updateGrupoSelection(String(event.target.value))}
                  onBlur={() => markTouched('grupoId')}
                  disabled={courseSelectionLocked}
                >
                  {paquetes.map((paquete) => (
                    <MenuItem key={getPaqueteOptionGrupoId(paquete)} value={String(getPaqueteOptionGrupoId(paquete))}>
                      {getPaqueteOptionLabel(paquete)}
                    </MenuItem>
                  ))}
                </Select>
                {getFieldError('grupoId') ? <Typography variant="caption" color="error" sx={{ mt: 0.75 }}>{getFieldError('grupoId')}</Typography> : null}
                {courseOnlyEditMode && courseChangeExpired ? (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>
                    Fecha de cambios vencida.
                  </Typography>
                ) : null}
                {courseOnlyEditMode && courseChangeLimitReached ? (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>
                    Limite de cambios de modulo alcanzado.
                  </Typography>
                ) : null}
              </>
            )}
          </FormControl>
          {renderReciboField(courseLocked || courseOnlyEditMode)}
          {paquetes.length === 0 && values.semestreId && !loadingOptions && (
            <Alert severity="warning">No hay modulos disponibles para este periodo.</Alert>
          )}
          {moduloChangeTimeline.length > 0 ? (
            <Box sx={questionCardSx}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Historial de cambios
              </Typography>
              <Box
                sx={{
                  p: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                }}
              >
                <Stack spacing={0.75}>
                  {moduloChangeTimeline.map((row, index) => (
                    <Box
                      key={`${row.marker}-${row.name}-${index}`}
                      sx={{ display: 'grid', gridTemplateColumns: '19px 1fr', columnGap: 0.25 }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {row.marker}
                      </Typography>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.name}
                        </Typography>
                        {row.details ? (
                          <Typography variant="caption" color="text.secondary" component="div">
                            {row.details}
                          </Typography>
                        ) : null}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
              {false ? (
              <Stack spacing={1}>
                {moduleChanges.slice(0, 1).map((change) => {
                  const registradoPor = change.registradoPor ? formatChangeUserName(change.registradoPor) : '';
                  return (
                    <Box
                      key={change.id ?? `${change.fechaCambio}-${change.grupoModuloNuevo?.id ?? 'nuevo'}`}
                      sx={{
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Cambio de: &lt;- {moduleChanges.map(getPreviousModuloChangeName).filter(Boolean).join(' <- ')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="div">
                        {change.semestre?.titulo ? `Semestre: ${change.semestre.titulo}` : 'Semestre no registrado'}
                        {change.fechaCambio ? ` · Fecha de cambio: ${formatDateTimeForDisplay(change.fechaCambio)}` : ''}
                        {registradoPor ? ` · Registrado por: ${registradoPor}` : ''}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
              ) : null}
            </Box>
          ) : null}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            {!isStandalone ? <Button onClick={onCancel} disabled={loading}>Cancelar</Button> : null}
            {isStandalone ? <Button onClick={onReset} disabled={loading}>RESETEAR</Button> : null}
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={courseSelectionLocked || paquetes.length === 0 || (!isEditing && !responsable && !responsableUser)}
            >
              {isEditing ? 'Guardar Cambios' : 'Registrar Matricula'}
            </Button>
          </Box>
        </Stack>
      </Stack>

      {false && isEditing && moduleChanges.length > 0 ? (
        <Box sx={questionCardSx}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Historial de cambios
          </Typography>
          <Stack spacing={1}>
            {moduleChanges.slice(0, 1).map((change) => {
              const registradoPor = change.registradoPor ? formatChangeUserName(change.registradoPor) : '';
              return (
                <Box
                  key={change.id ?? `${change.fechaCambio}-${change.grupoModuloNuevo?.id ?? 'nuevo'}`}
                  sx={{
                    p: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Cambio de: &lt;- {moduleChanges.map(getPreviousModuloChangeName).filter(Boolean).join(' <- ')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    {change.semestre?.titulo ? `Semestre: ${change.semestre.titulo}` : 'Semestre no registrado'}
                    {change.fechaCambio ? ` · Fecha de cambio: ${formatDateTimeForDisplay(change.fechaCambio)}` : ''}
                    {registradoPor ? ` · Registrado por: ${registradoPor}` : ''}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Box>
      ) : null}

      <Dialog open={Boolean(cameraSide)} onClose={stopCameraCapture} fullWidth maxWidth="sm">
        <DialogTitle>
          {cameraSide === 'frente' ? 'Capturar DNI frente' : 'Capturar DNI reverso'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            {cameraError ? <Alert severity="error">{cameraError}</Alert> : null}
            {cameraStarting ? <LinearProgress /> : null}
            {cameraPreview ? (
              <Box
                component="img"
                src={cameraPreview.url}
                alt="Vista previa del documento"
                sx={{
                  width: '100%',
                  aspectRatio: '4 / 3',
                  bgcolor: 'common.black',
                  borderRadius: 1,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Box
                component="video"
                ref={cameraVideoRef}
                muted
                playsInline
                autoPlay
                sx={{
                  width: '100%',
                  aspectRatio: '4 / 3',
                  bgcolor: 'common.black',
                  borderRadius: 1,
                  objectFit: 'contain',
                }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={stopCameraCapture}>Cancelar</Button>
          {cameraPreview ? (
            <>
              <Button onClick={handleRetakeCameraImage}>Tomar otra</Button>
              <Button variant="contained" onClick={handleAcceptCameraImage}>
                Aceptar foto
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              startIcon={<CameraAltIcon />}
              onClick={() => void handleCaptureCameraImage()}
              disabled={cameraStarting || Boolean(cameraError)}
            >
              Tomar foto
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Stack>
    </Box>
  );
}

export function MatriculasPage() {
  const { user } = useAuth();
  const { can } = useIntranetPermissions();
  const { settings, loading: loadingSettings } = useAppSettings();
  const isDocente = Number(user?.role ?? 0) === 4 && Number(user?.level ?? 0) < 600;
  const canCreateRecords = can('matriculas', 'create');
  const canEditRecords = can('matriculas', 'edit');
  const canDeleteRecords = !isDocente && can('matriculas', 'delete');
  const [matriculas, setMatriculas] = useState<MatriculaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [semestreFilterOptions, setSemestreFilterOptions] = useState<SemestreOption[]>([]);
  const [selectedSemestreFilterId, setSelectedSemestreFilterId] = useState('');
  const [grupoModuloFilterOptions, setGrupoModuloFilterOptions] = useState<MatriculaGrupoModuloOption[]>([]);
  const [selectedGrupoModuloFilterIds, setSelectedGrupoModuloFilterIds] = useState<string[]>([]);
  const matriculasFetchRequestRef = useRef(0);
  const [openMatriculaModal, setOpenMatriculaModal] = useState(false);
  const [editingMatriculaId, setEditingMatriculaId] = useState<string | null>(null);
  const [openUserModal, setOpenUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<MatriculaUser | null>(null);
  const [userFormSubmitting, setUserFormSubmitting] = useState(false);
  const [userFormResetKey, setUserFormResetKey] = useState(0);
  const [formResetKey, setFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuMatriculaId, setMenuMatriculaId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      numero: true,
      avatar: true,
      fecha: true,
      estudiante: true,
      documento: true,
      celular: true,
      periodo: false,
      modulo: true,
      recibo: true,
      archivado: false,
      actions: true,
    });

  const selectedSemestreFilter = useMemo(
    () => semestreFilterOptions.find((semestre) => String(semestre.id) === selectedSemestreFilterId) ?? null,
    [selectedSemestreFilterId, semestreFilterOptions],
  );

  const selectedSemestreFilterLabel = selectedSemestreFilter?.placeholder ? '' : getSemestreLabel(selectedSemestreFilter);
  const matriculaListSemestreTitulo = selectedGrupoModuloFilterIds.length > 0 ? selectedSemestreFilterLabel : '';

  useEffect(() => {
    if (loadingSettings) return;

    let active = true;
    const configuredSemestreIds = getConfiguredMatriculaSemestreIds(settings);
    const currentSemestreId = getCurrentMatriculaSemestreId(settings);

    setSemestreFilterOptions(buildPlaceholderSemestreOptions(
      buildDisplayedSemestreIds(currentSemestreId, configuredSemestreIds),
    ));
    setSelectedSemestreFilterId(currentSemestreId);

    const loadFilterSemestres = async () => {
      setLoadingFilters(true);
      try {
        const listMatriculaSemestres = httpsCallable<{ semestreIds?: number[] }, { semestres?: SemestreOption[] }>(
          functions,
          'listMatriculaSemestres',
          { timeout: 12000 },
        );
        const result = await withTimeout(
          listMatriculaSemestres({ semestreIds: configuredSemestreIds }),
          14000,
          'listMatriculaSemestres',
        );
        if (!active) return;
        const nextSemestres = result.data.semestres || [];
        setSemestreFilterOptions(mergeCurrentSemestrePlaceholder(currentSemestreId, nextSemestres));
      } catch (err) {
        console.error('Error fetching matricula semestres: ', err);
        if (active) {
          setSemestreFilterOptions(buildPlaceholderSemestreOptions(
            buildDisplayedSemestreIds(currentSemestreId, configuredSemestreIds),
          ));
        }
      } finally {
        if (active) setLoadingFilters(false);
      }
    };

    if (configuredSemestreIds.length > 0) {
      void loadFilterSemestres();
    } else {
      setLoadingFilters(false);
    }
    return () => {
      active = false;
    };
  }, [loadingSettings, settings]);

  useEffect(() => {
    let active = true;

    const loadGrupoModuloFilters = async () => {
      setGrupoModuloFilterOptions([]);
      if (!selectedSemestreFilterLabel) {
        return;
      }

      setLoadingFilters(true);
      try {
        const listMatriculaDocenteGrupos = httpsCallable<
          { semestreTitulo?: string | null },
          { grupoModulos?: MatriculaGrupoModuloOption[]; semestreTitulo?: string | null }
        >(functions, 'listMatriculaDocenteGrupos', { timeout: 12000 });
        const result = await withTimeout(
          listMatriculaDocenteGrupos({ semestreTitulo: selectedSemestreFilterLabel }),
          14000,
          'listMatriculaDocenteGrupos',
        );
        if (!active) return;
        const options = result.data.grupoModulos || [];
        setGrupoModuloFilterOptions(options);
        setSelectedGrupoModuloFilterIds((current) => {
          const availableIds = new Set(options.map((item) => String(item.id)));
          const nextIds = current.filter((id) => availableIds.has(id));
          return areStringArraysEqual(current, nextIds) ? current : nextIds;
        });
      } catch (err) {
        console.error('Error fetching matricula grupo-modulos: ', err);
        if (active) {
          setError(getCallableErrorMessage(err, 'No se pudieron cargar los grupos-modulo.'));
        }
      } finally {
        if (active) setLoadingFilters(false);
      }
    };

    void loadGrupoModuloFilters();
    return () => {
      active = false;
    };
  }, [selectedSemestreFilterId, selectedSemestreFilterLabel]);

  useEffect(() => {
    matriculasFetchRequestRef.current += 1;
    setMatriculas([]);
    setLoading(Boolean(selectedSemestreFilterId));
    setPaginationModel((current) => current.page === 0 ? current : { ...current, page: 0 });
  }, [selectedSemestreFilterId]);

  const fetchMatriculas = useCallback(async () => {
    if (loadingSettings) {
      setLoading(true);
      return;
    }

    const semestreId = Number(selectedSemestreFilterId);
    if (!semestreId) {
      setMatriculas([]);
      setLoading(false);
      return;
    }

    const requestId = matriculasFetchRequestRef.current + 1;
    matriculasFetchRequestRef.current = requestId;
    setLoading(true);
    try {
      const listMatriculas = httpsCallable<
        {
          grupoModuloIds?: number[];
          semestreId?: number | null;
          semestreTitulo?: string | null;
        },
        { matriculas?: MatriculaListItem[] }
      >(functions, 'listMatriculas');
      const result = await listMatriculas({
        grupoModuloIds: selectedGrupoModuloFilterIds.map((id) => Number(id)).filter(Boolean),
        semestreId,
        semestreTitulo: matriculaListSemestreTitulo || null,
      });
      if (matriculasFetchRequestRef.current !== requestId) return;
      const nextMatriculas = (result.data.matriculas || [])
        .filter((matricula) => Number(matricula.semestreId) === semestreId);
      setMatriculas(nextMatriculas);
      setError(null);
    } catch (err) {
      if (matriculasFetchRequestRef.current !== requestId) return;
      console.error('Error fetching matriculas: ', err);
      setError(getCallableErrorMessage(err, 'No se pudieron cargar las matriculas.'));
    } finally {
      if (matriculasFetchRequestRef.current === requestId) setLoading(false);
    }
  }, [
    loadingSettings,
    selectedGrupoModuloFilterIds,
    selectedSemestreFilterId,
    matriculaListSemestreTitulo,
  ]);

  useEffect(() => {
    void fetchMatriculas();
  }, [fetchMatriculas]);

  const handleDismissModal = useCallback(() => {
    setOpenMatriculaModal(false);
  }, []);

  const handleSaved = useCallback(() => {
    setOpenMatriculaModal(false);
    setEditingMatriculaId(null);
    setFormResetKey((prev) => prev + 1);
    void fetchMatriculas();
  }, [fetchMatriculas]);

  const handleCreateMatricula = useCallback(() => {
    setEditingMatriculaId(null);
    setFormResetKey((prev) => prev + 1);
    setOpenMatriculaModal(true);
  }, []);

  const handleEditMatricula = useCallback((id: string) => {
    setEditingMatriculaId(id);
    setOpenMatriculaModal(true);
    setMenuAnchorEl(null);
    setMenuMatriculaId(null);
  }, []);

  const handleOpenFichaMatricula = useCallback((id: string) => {
    window.open(`/intranet/matriculas/ficha?matriculaId=${encodeURIComponent(id)}`, '_blank', 'noopener,noreferrer');
    setMenuAnchorEl(null);
    setMenuMatriculaId(null);
  }, []);

  const handleOpenUserForm = useCallback(async (matriculaToEdit?: MatriculaListItem | null) => {
    if (!matriculaToEdit?.user) return;
    setEditingUser(matriculaToEdit.user);
    setUserFormResetKey((prev) => prev + 1);
    setOpenUserModal(true);

    try {
      const getMatricula = httpsCallable<{ id: number }, { matricula?: MatriculaListItem | null }>(
        functions,
        'getMatricula',
      );
      const result = await getMatricula({ id: Number(matriculaToEdit.id) });
      const fullUser = result.data.matricula?.user;
      if (fullUser) {
        setEditingUser(fullUser);
        setUserFormResetKey((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Error fetching user details from matricula: ', err);
    }
  }, []);

  const handleDismissUserModal = useCallback(() => {
    setOpenUserModal(false);
    setEditingUser(null);
  }, []);

  const handleUserFormSubmit = useCallback(async (data: unknown) => {
    if (!editingUser?.documentId) {
      setError('No se pudo identificar el usuario seleccionado.');
      return;
    }

    setUserFormSubmitting(true);
    setError(null);
    try {
      const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
      const dataToUpdate = { ...(data as Record<string, unknown>) };
      delete (dataToUpdate as { password?: unknown }).password;
      if (isDocente) {
        const docenteEditableValues = {
          celular: dataToUpdate.celular,
          direccion: dataToUpdate.direccion,
          distrito: dataToUpdate.distrito,
        };
        Object.assign(dataToUpdate, {
          apellido_paterno: editingUser.apellidoPaterno ?? '',
          apellido_materno: editingUser.apellidoMaterno ?? '',
          nombre: editingUser.nombre ?? '',
          username: editingUser.username ?? '',
          nickName: editingUser.nickName ?? null,
          sexo: editingUser.sexo ?? 'F',
          fecha_nacimiento: editingUser.fechaNacimiento ?? '',
          telefono: editingUser.telefono ?? '',
          email: editingUser.email ?? '',
          tipo_documento: editingUser.tipoDocumento ?? 'DNI',
          dni: editingUser.dni ?? '',
          nacionalidad: editingUser.nacionalidad ?? 'PERUANA',
          instruccion: editingUser.instruccion ?? 'Primaria',
          estado_civil: editingUser.estadoCivil ?? 'Soltero',
          rolId: editingUser.rolId ? String(editingUser.rolId) : '',
          avatar: editingUser.avatar ?? '',
          avatarRemoved: false,
          bloqueado: Boolean(editingUser.blocked),
          correo_institucional: editingUser.correoInstitucional ?? '',
          fecha_creacion: editingUser.fechaCreacion ?? '',
          fecha_modificacion: editingUser.fechaModificacion ?? '',
          email_creador: editingUser.emailCreador ?? '',
          dniImagenFrenteUrl: editingUser.dniImagenFrenteUrl ?? '',
          dniImagenReversoUrl: editingUser.dniImagenReversoUrl ?? '',
          dniImagenFrenteProcesadaUrl: editingUser.dniImagenFrenteProcesadaUrl ?? '',
          dniImagenReversoProcesadaUrl: editingUser.dniImagenReversoProcesadaUrl ?? '',
          ...docenteEditableValues,
        });
      }

      await updateUserProfile({
        documentId: editingUser.documentId,
        previousEmail: editingUser.email,
        previousCorreoInstitucional: editingUser.correoInstitucional ?? null,
        previousDni: editingUser.dni,
        previousRolId: editingUser.rolId,
        previousNombre: editingUser.nombre,
        previousApellidoPaterno: editingUser.apellidoPaterno,
        previousApellidoMaterno: editingUser.apellidoMaterno,
        previousAvatar: editingUser.avatar ?? null,
        previousAvatarPequeno: null,
        previousPhotoURL: editingUser.avatar ?? null,
        ...dataToUpdate,
      });

      setOpenUserModal(false);
      setEditingUser(null);
      void fetchMatriculas();
    } catch (err) {
      console.error('Error saving user from matriculas: ', err);
      setError(getCallableErrorMessage(err, 'No se pudo guardar el usuario.'));
    } finally {
      setUserFormSubmitting(false);
    }
  }, [editingUser, fetchMatriculas, isDocente]);

  const handleDeleteMatricula = useCallback(async (id: string) => {
    const matricula = matriculas.find((item) => String(item.id) === id);
    const estudiante = fullName(matricula?.user) || `matricula ${id}`;
    if (!window.confirm(`Estas seguro de eliminar la matricula de ${estudiante}? Esta accion no elimina al usuario.`)) {
      return;
    }

    try {
      const deleteMatricula = httpsCallable<{ id: number }, { id: number | null }>(functions, 'deleteMatricula');
      await deleteMatricula({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuMatriculaId(null);
      void fetchMatriculas();
    } catch (err) {
      console.error('Error deleting matricula: ', err);
      setError(getCallableErrorMessage(err, 'No se pudo eliminar la matricula.'));
    }
  }, [fetchMatriculas, matriculas]);

  const handleSemestreFilterChange = useCallback((event: SelectChangeEvent<string>) => {
    matriculasFetchRequestRef.current += 1;
    setMatriculas([]);
    setLoading(true);
    setSelectedSemestreFilterId(String(event.target.value));
    setSelectedGrupoModuloFilterIds([]);
    setPaginationModel((current) => ({ ...current, page: 0 }));
  }, []);

  const handleGrupoModuloFilterChange = useCallback((event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const nextValues = typeof value === 'string' ? value.split(',') : value;
    setSelectedGrupoModuloFilterIds(nextValues.includes('__ALL__') ? [] : nextValues);
    setPaginationModel((current) => ({ ...current, page: 0 }));
  }, []);

  const grupoModuloFilterLabelById = useMemo(
    () => new Map(grupoModuloFilterOptions.map((item) => [String(item.id), getGrupoModuloFilterLabel(item)])),
    [grupoModuloFilterOptions],
  );

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'numero',
        headerName: '#',
        width: 40,
        minWidth: 40,
        maxWidth: 40,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
      },
      {
        field: 'avatar',
        headerName: 'Foto',
        width: 68,
        minWidth: 68,
        maxWidth: 68,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          const row = params.row as MatriculaListItem;
          return (
            <Box
              component="button"
              type="button"
              onClick={() => void handleOpenUserForm(row)}
              sx={{
                p: 0,
                border: 0,
                bgcolor: 'transparent',
                cursor: row.user ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
              }}
            >
              <Avatar
                src={row.user?.avatarTiny || row.user?.avatar || undefined}
                alt={studentListName(row.user)}
                sx={{
                  width: 48,
                  height: 48,
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#ffffff',
                  bgcolor: 'transparent',
                  background: 'linear-gradient(180deg, #8fd8ff 0%, #ffffff 100%)',
                }}
                imgProps={{
                  referrerPolicy: 'no-referrer',
                  style: {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: '50% 10%',
                  },
                }}
              >
                {studentInitials(row.user)}
              </Avatar>
            </Box>
          );
        },
      },
      {
        field: 'fecha',
        headerName: 'Fecha',
        width: 90,
        minWidth: 90,
        maxWidth: 90,
        valueGetter: (_value, row: MatriculaListItem) => formatDate(row.fecha),
      },
      {
        field: 'estudiante',
        headerName: 'Estudiante',
        flex: 1.4,
        minWidth: 220,
        valueGetter: (_value, row: MatriculaListItem) => studentListName(row.user),
        renderCell: (params) => {
          const row = params.row as MatriculaListItem;
          return (
            <Box
              component="button"
              type="button"
              onClick={() => void handleOpenUserForm(row)}
              sx={{
                p: 0,
                border: 0,
                bgcolor: 'transparent',
                color: 'inherit',
                font: 'inherit',
                textAlign: 'left',
                cursor: row.user ? 'pointer' : 'default',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                lineHeight: 1.35,
                maxHeight: '2.7em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                textDecoration: 'none',
                '&:hover': row.user
                  ? { textDecoration: 'underline' }
                  : undefined,
              }}
            >
              {studentListName(row.user)}
            </Box>
          );
        },
      },
      {
        field: 'documento',
        headerName: 'Documento',
        width: 120,
        minWidth: 120,
        maxWidth: 120,
        valueGetter: (_value, row: MatriculaListItem) =>
          [row.user?.tipoDocumento || 'DNI', row.user?.dni].filter(Boolean).join(' '),
      },
      {
        field: 'periodo',
        headerName: 'Periodo',
        width: 70,
        minWidth: 70,
        maxWidth: 70,
        valueGetter: (_value, row: MatriculaListItem) => getSemestreLabel(row.semestre),
      },
      {
        field: 'celular',
        headerName: 'Celular',
        width: 90,
        minWidth: 90,
        maxWidth: 90,
        valueGetter: (_value, row: MatriculaListItem) => row.user?.celular || '',
      },
      {
        field: 'modulo',
        headerName: 'Modulo',
        flex: 1.2,
        minWidth: 190,
        valueGetter: (_value, row: MatriculaListItem) =>
          row.paquete?.titulo || (row.paqueteId ? `Modulo ${row.paqueteId}` : ''),
      },
      {
        field: 'recibo',
        headerName: 'Recibo',
        width: 70,
        minWidth: 70,
        maxWidth: 70,
        valueGetter: (_value, row: MatriculaListItem) => row.recibo || '',
      },
      {
        field: 'archivado',
        headerName: 'Archivado',
        flex: 0.65,
        minWidth: 115,
        valueGetter: (_value, row: MatriculaListItem) => (row.archivado ? 'Si' : 'No'),
      },
      {
        field: 'actions',
        headerName: '...',
        align: 'center',
        headerAlign: 'center',
        width: 56,
        minWidth: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <IconButton
            size="small"
            aria-label="Opciones"
            onClick={(event) => {
              setMenuAnchorEl(event.currentTarget);
              setMenuMatriculaId(String((params.row as MatriculaListItem).id));
            }}
          >
            <MoreHorizIcon />
          </IconButton>
        ),
      },
    ],
    [handleOpenUserForm],
  );

  const columnToggleItems = useMemo(
    () =>
      columns.map((column) => ({
        field: column.field,
        label:
          typeof column.headerName === 'string' && column.headerName.trim().length > 0
            ? column.headerName
            : column.field,
        checked: columnVisibilityModel[column.field] !== false,
        disabled: column.field === 'numero' || column.field === 'actions',
      })),
    [columnVisibilityModel, columns],
  );

  return (
    <IntranetListLayout
      message={error}
      messageSeverity="error"
      title="Gestion de Matriculas"
      commands={
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          {!isDocente ? (
            <>
              <FormControl size="small" sx={{ width: 100 }}>
                <InputLabel id="matriculas-semestre-filter-label">Semestre</InputLabel>
                <Select
                  labelId="matriculas-semestre-filter-label"
                  label="Semestre"
                  value={selectedSemestreFilterId}
                  onChange={handleSemestreFilterChange}
                  disabled={loadingFilters}
                  MenuProps={{ disableScrollLock: true }}
                >
                  {semestreFilterOptions.map((semestre) => (
                    <MenuItem key={semestre.id} value={String(semestre.id)}>
                      {getSemestreLabel(semestre)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ width: 320, maxWidth: '100%' }}>
                <InputLabel id="matriculas-grupo-modulo-filter-label">Grupo-modulo</InputLabel>
                <Select
                  labelId="matriculas-grupo-modulo-filter-label"
                  multiple
                  label="Grupo-modulo"
                  value={selectedGrupoModuloFilterIds}
                  onChange={handleGrupoModuloFilterChange}
                  input={<OutlinedInput label="Grupo-modulo" />}
                  disabled={loadingFilters || grupoModuloFilterOptions.length === 0}
                  renderValue={(selected) => {
                    if (selected.length === 0) return 'Todos';
                    if (selected.length === 1) return grupoModuloFilterLabelById.get(selected[0]) || selected[0];
                    return `${selected.length} seleccionados`;
                  }}
                  MenuProps={{ disableScrollLock: true }}
                >
                  <MenuItem value="__ALL__">
                    <Checkbox checked={selectedGrupoModuloFilterIds.length === 0} />
                    <ListItemText primary="Todos" />
                  </MenuItem>
                  {grupoModuloFilterOptions.map((grupoModulo) => {
                    const id = String(grupoModulo.id);
                    return (
                      <MenuItem key={id} value={id}>
                        <Checkbox checked={selectedGrupoModuloFilterIds.includes(id)} />
                        <ListItemText primary={getGrupoModuloFilterLabel(grupoModulo)} />
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </>
          ) : null}
          {canCreateRecords ? (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreateMatricula}>
              Nueva Matricula
            </Button>
          ) : null}
        </Stack>
      }
      columnToggleItems={columnToggleItems}
      onToggleColumn={(field, checked) =>
        setColumnVisibilityModel((prev) => ({ ...prev, [field]: checked }))
      }
      columnToggleLabel="Campos"
    >
      <IntranetDataGrid
        rows={matriculas}
        columns={columns}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        loading={loading}
        getRowId={(row) => row.id}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
      />

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        disableScrollLock
        onClose={() => {
          setMenuAnchorEl(null);
          setMenuMatriculaId(null);
        }}
      >
        {canEditRecords ? (
          <MenuItem
            onClick={() => {
              if (menuMatriculaId) handleEditMatricula(menuMatriculaId);
            }}
          >
            Editar
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={() => {
            if (menuMatriculaId) handleOpenFichaMatricula(menuMatriculaId);
          }}
        >
          Ver ficha de matricula
        </MenuItem>
        {canDeleteRecords ? (
          <MenuItem
            onClick={() => {
              if (menuMatriculaId) void handleDeleteMatricula(menuMatriculaId);
            }}
          >
            Eliminar
          </MenuItem>
        ) : null}
      </Menu>

      <Modal1
        open={openMatriculaModal}
        onClose={handleDismissModal}
        title={editingMatriculaId ? 'Editar Matricula' : 'Nueva Matricula'}
        maxWidth="md"
        disableAutoFocus
      >
        <MatriculaForm
          key={`${editingMatriculaId ?? 'new-matricula'}-${formResetKey}`}
          matriculaId={editingMatriculaId ?? undefined}
          isOpen={openMatriculaModal}
          onCancel={handleDismissModal}
          onSaved={handleSaved}
          defaultSemestreId={settings.general.semestreActualId}
          reconocimientoDniActivo={settings.formularioMatricula.activarReconocimientoDni}
          courseOnlyEditMode={Boolean(isDocente && editingMatriculaId)}
        />
      </Modal1>

      <Modal1
        open={openUserModal}
        onClose={handleDismissUserModal}
        title="Editar Usuario"
        maxWidth="md"
      >
        {openUserModal && editingUser ? (
          <UserForm
            key={`${editingUser.id}-${userFormResetKey}`}
            onCancel={handleDismissUserModal}
            onSubmit={handleUserFormSubmit}
            isSubmitting={userFormSubmitting}
            submittingMessage="Guardando cambios..."
            initialData={editingUser as unknown as Record<string, unknown>}
            restrictFieldsFromMatriculaDocente={isDocente}
          />
        ) : null}
      </Modal1>
    </IntranetListLayout>
  );
}
