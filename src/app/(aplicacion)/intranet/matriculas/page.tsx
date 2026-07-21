'use client';

import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
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
  InputLabel,
  LinearProgress,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
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
import { httpsCallable } from 'firebase/functions';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { useSearchParams } from 'next/navigation';
import { app, functions, storage } from '@/lib/firebase';
import { formatDateOnly, getDateOnlyLocalDate } from '@/lib/dateOnly';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import Modal1 from '@/components/Modal1';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';

type RecognitionMode = 'gemini' | 'documentAi';

interface SemestreOption {
  id: number;
  titulo?: string | null;
  nombre?: string | null;
  anioTitulo?: string | null;
  inicio?: string | null;
  fin?: string | null;
}

interface PaqueteOption {
  id: number;
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
  email?: string | null;
  dni?: string | null;
  tipoDocumento?: string | null;
  nombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  sexo?: string | null;
  nacionalidad?: string | null;
  estadoCivil?: string | null;
  instruccion?: string | null;
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
  archivado?: boolean | null;
  paqueteId?: number | null;
  semestreId?: number | null;
  userId?: number | null;
  responsableId?: number | null;
  responsableUserId?: number | null;
  user?: MatriculaUser | null;
  responsable?: MatriculaResponsable | null;
  responsableUser?: MatriculaResponsableUser | null;
  paquete?: PaqueteOption | null;
  semestre?: SemestreOption | null;
}

interface MatriculaFormProps {
  matriculaId?: string;
  isOpen: boolean;
  onCancel: () => void;
  onSaved: () => void;
  defaultSemestreId?: number | null;
  formVariant?: 'intranet' | 'standalone';
  hideSemestreControl?: boolean;
  hideRecognitionModeControl?: boolean;
  disableRecognitionModeControl?: boolean;
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
  direccion: string;
  distrito: string;
  celular: string;
  telefono: string;
  email: string;
  recibo: string;
  paqueteId: string;
}

interface VerificarDocumentoResponse {
  userExists?: boolean;
  userHasStoredImages?: boolean;
  user?: MatriculaUser | null;
  documentImagePolicy?: DocumentImagePolicy | null;
  datos?: Partial<MatriculaFormValues>;
}

interface DocumentImagePolicy {
  userHasStoredImages?: boolean;
  fechaVencimiento?: string | null;
  storedDocumentExpired?: boolean;
  shouldPersistDocumentImages?: boolean;
  reason?: string | null;
}

interface MatriculaDocumentoEstadoResponse {
  userExists?: boolean;
  user?: MatriculaUser | null;
  documentImagePolicy?: DocumentImagePolicy | null;
}

interface VerificarReniecResponse {
  userExists?: boolean;
  datos?: Partial<MatriculaFormValues>;
}

interface GeminiArchivoResult {
  indice?: number | null;
  nombreArchivo?: string | null;
  tipoLado?: 'frente' | 'reverso' | 'desconocido' | string | null;
  areaLectura?: 'pagina-1' | 'pagina-2' | 'superior' | 'inferior' | 'completa' | string | null;
  tieneDosCuerpos?: boolean | null;
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
  direccion: '',
  distrito: '',
  celular: '',
  telefono: '',
  email: '',
  recibo: '',
  paqueteId: '',
};

const getCallableErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { message?: string } | null)?.message;
  return message || fallback;
};

const normalizeDocumentNumber = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const sanitizeFileName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-');

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

const fileToGenerativePart = async (file: File) => {
  const data = await new Promise<string>((resolve, reject) => {
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
      mimeType: detectDocumentContentType(file),
    },
  };
};

class GeminiJsonParseError extends Error {
  preview: string;

  constructor(message: string, preview: string) {
    super(message);
    this.name = 'GeminiJsonParseError';
    this.preview = preview;
  }
}

const wait = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

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

const parseGeminiJson = (text: string): GeminiMatriculaResult => {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new GeminiJsonParseError('Gemini devolvio una respuesta vacia. Intenta nuevamente.', '');
  }
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed)?.[1];
  const candidate = (fenced || trimmed).trim();
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  const jsonText = firstBrace >= 0 && lastBrace > firstBrace
    ? candidate.slice(firstBrace, lastBrace + 1)
    : candidate;

  try {
    return JSON.parse(jsonText) as GeminiMatriculaResult;
  } catch (error) {
    const preview = candidate.slice(0, 600);
    const detail = String((error as { message?: string } | null)?.message || error);
    throw new GeminiJsonParseError(`Gemini devolvio JSON incompleto o invalido: ${detail}`, preview);
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

const RECIBO_OPTIONS = ['CONADIS', 'BECADO'] as const;

const normalizeReciboInputValue = (value: unknown) => {
  const text = String(value ?? '').toUpperCase().replace(/\s+/g, '');
  if (/^\d+$/.test(text)) return text.slice(0, 5);
  return text;
};

const isValidReciboValue = (value: unknown) => {
  const text = normalizeReciboInputValue(value);
  return Boolean(text && (RECIBO_OPTIONS.includes(text as typeof RECIBO_OPTIONS[number]) || /^\d{1,5}$/.test(text)));
};

const getPaqueteOptionLabel = (paquete: PaqueteOption) =>
  paquete.grupoModuloTitulo || paquete.titulo || `Modulo ${paquete.id}`;

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

const analyzeMatriculaDocumentsWithGemini = async (
  tipoDocumento: string,
  dni: string,
  files: File[],
): Promise<GeminiMatriculaResult> => {
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, {
    model: process.env.NEXT_PUBLIC_MATRICULA_GEMINI_MODEL || 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
      maxOutputTokens: 8192,
    },
  });

  const documentReadingInstructions = `
Estrategia de lectura:
- Primero revisa el archivo 1 para determinar si contiene dos cuerpos/imagenes completos del documento en una misma pagina o vista.
- Si el archivo 1 no tiene dos cuerpos completos, revisa el archivo 2 con el mismo criterio.
- Dos cuerpos significa que se ven claramente dos lados separados del documento, por ejemplo frente arriba y reverso abajo, o reverso arriba y frente abajo.
- Si cualquiera de los dos archivos contiene dos cuerpos completos, trabaja solo con ese archivo y no leas ni uses el otro archivo bajo ninguna circunstancia.
- La prioridad es fija: si el archivo 1 tiene dos cuerpos, usa archivo 1; solo si el archivo 1 no tiene dos cuerpos y el archivo 2 si los tiene, usa archivo 2.
- En ese caso, lee los dos cuerpos del archivo elegido y de ahi extrae todos los datos, valida el tipo y numero de documento, determina cual cuerpo es frente y cual es reverso, y prepara la metadata para OpenCV.
- Si el archivo elegido contiene dos cuerpos completos pero no logras validar algun dato, devuelve el dato como null o la validacion como false; no uses el otro archivo como respaldo.
- Cuando uses un solo archivo con dos cuerpos, devuelve dos elementos en "archivos" con el mismo "indice" del archivo elegido: uno para el cuerpo "superior" y otro para el cuerpo "inferior"; en cada elemento indica "tipoLado" frente/reverso y "areaLectura" superior/inferior.
- Solo si ningun archivo contiene dos cuerpos completos, analiza ambos archivos con el flujo normal de frente/reverso.
- Si un archivo tiene un solo cuerpo, reporta "areaLectura": "completa" y "tieneDosCuerpos": false.
- Si un archivo tiene dos cuerpos, reporta "areaLectura": "superior" o "inferior" segun el cuerpo que estes clasificando en ese elemento de "archivos".
- No generes ni modifiques imagenes; solo limita la lectura visual cuando realmente hay dos cuerpos.
`.trim();

  const prompt = `
Eres un extractor de datos para matriculas de un CETPRO en Peru.
Analiza los archivos adjuntos de un DNI peruano o carnet de extranjeria. Pueden estar en cualquier orden: frente/reverso, reverso/frente, imagen o PDF.

Documento esperado en el formulario:
- tipoDocumento: ${tipoDocumento}
- numeroDocumento: ${dni}

${documentReadingInstructions}

Reglas:
- El primer adjunto es archivo 1, el segundo adjunto es archivo 2. Si la estrategia de lectura indica usar solo un archivo, no reportes datos extraidos del otro archivo.
- Si es DNI, identifica "documento nacional de identidad" o "nacional" y extrae el numero con formato ########-#. Para comparar, usa los 8 digitos antes del guion.
- Si es carnet de extranjeria, identifica "carnet" o "extranjeria" y extrae el numero con formato #########.
- Para reverso, basta encontrar alguna palabra o dato equivalente a direccion, domicilio, distrito o el fragmento "per<".
- En "archivos", indica por cada archivo si es frente, reverso o desconocido.
- En "archivos.senalesReverso", lista solo las senales que encontraste en ese archivo: "direccion", "domicilio", "distrito", "per<" u otra equivalente.
- En "archivos.fragmentosReverso", devuelve maximo 3 fragmentos cortos de texto donde aparecieron esas senales. No devuelvas OCR completo.
- Extrae nombres, apellido paterno y apellido materno desde el documento, no desde texto inferido.
- La direccion debe ser solo la direccion o domicilio. El distrito debe ir separado, sin provincia ni departamento cuando sea posible.
- Las fechas deben devolverse en YYYY-MM-DD. Si el documento muestra formato DD/MM/YYYY o DD-MM-YYYY, conviertelo.
- Sexo debe ser "F" o "M".
- Estado civil puede ser texto completo o una letra: "S" soltero/soltera, "C" casado/casada, "D" divorciado/divorciada, "V" viudo/viuda.
- Nacionalidad debe ser el texto del documento, por ejemplo "PERUANA".
- Fecha de vencimiento debe venir del campo de vencimiento, caducidad o expiracion del documento.
- No inventes datos. Si no estas seguro, usa null.
- No devuelvas texto reconocido completo. Solo campos estructurados y fragmentos cortos de evidencia.
- Devuelve SOLO JSON valido, sin markdown.

Formato exacto:
{
  "tipoDocumento": "DNI|CE|null",
  "numeroDocumento": "string|null",
  "documentoCoincide": true,
  "contieneReverso": true,
  "archivos": [
    {
      "indice": 1,
      "nombreArchivo": "string|null",
      "tipoLado": "frente|reverso|desconocido",
      "areaLectura": "pagina-1|pagina-2|superior|inferior|completa",
      "tieneDosCuerpos": true,
      "senalesReverso": ["direccion|domicilio|distrito|per<"],
      "fragmentosReverso": ["fragmento corto de evidencia"],
      "contieneDireccion": true,
      "contieneDomicilio": true,
      "contieneDistrito": true,
      "contienePerMrz": true
    }
  ],
  "nombre": "string|null",
  "apellidoPaterno": "string|null",
  "apellidoMaterno": "string|null",
  "sexo": "F|M|null",
  "nacionalidad": "string|null",
  "fechaNacimiento": "YYYY-MM-DD|null",
  "fechaVencimiento": "YYYY-MM-DD|null",
  "estadoCivil": "S|C|D|V|string|null",
  "direccion": "string|null",
  "distrito": "string|null",
  "observaciones": "explica brevemente que encontraste"
}
`.trim();

  const parts = await Promise.all(files.map(fileToGenerativePart));
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await model.generateContent([prompt, ...parts]);
      return parseGeminiJson(result.response.text());
    } catch (error) {
      lastError = error;
      const canRetry = error instanceof GeminiJsonParseError && attempt < 3;
      if (!canRetry) break;
      await wait(600 * attempt);
    }
  }

  if (lastError instanceof GeminiJsonParseError) {
    throw new Error([
      lastError.message,
      lastError.preview ? `Respuesta recibida: ${lastError.preview}` : null,
      'Vuelve a intentarlo; si se repite, cambia temporalmente a Document AI o reduce el peso/resolucion de los archivos.',
    ].filter(Boolean).join('\n'));
  }
  throw lastError;
};

const fullName = (user?: MatriculaUser | null) =>
  [user?.apellidoPaterno, user?.apellidoMaterno, user?.nombre].filter(Boolean).join(' ').trim();

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
    direccion: user?.direccion || '',
    distrito: user?.distrito || '',
    celular: user?.celular || '',
    telefono: user?.telefono || '',
    email: user?.email || '',
    recibo: matricula.recibo || '',
    paqueteId: matricula.paqueteId ? String(matricula.paqueteId) : '',
  };
}

export function MatriculaForm({
  matriculaId,
  isOpen,
  onCancel,
  onSaved,
  defaultSemestreId,
  formVariant = 'intranet',
  hideSemestreControl = false,
  hideRecognitionModeControl = false,
  disableRecognitionModeControl = true,
}: MatriculaFormProps) {
  const isEditing = Boolean(matriculaId);
  const isStandalone = formVariant === 'standalone';
  const dniInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [values, setValues] = useState<MatriculaFormValues>(initialValues);
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [paquetes, setPaquetes] = useState<PaqueteOption[]>([]);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontImage, setFrontImage] = useState<UploadedImage | null>(null);
  const [backImage, setBackImage] = useState<UploadedImage | null>(null);
  const [processedDocumentImages, setProcessedDocumentImages] = useState<{
    frente?: string | null;
    reverso?: string | null;
  }>({});
  const [documentAnalysisMetadata, setDocumentAnalysisMetadata] = useState<DocumentoAnalisisTemporal | null>(null);
  const [responsable, setResponsable] = useState<MatriculaResponsable | null>(null);
  const [responsableUser, setResponsableUser] = useState<MatriculaResponsableUser | null>(null);
  const [recognitionMode, setRecognitionMode] = useState<RecognitionMode>('gemini');
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const selectedSemestreId = Number(values.semestreId || 0);

  const updateValue = useCallback(<K extends keyof MatriculaFormValues>(key: K, value: MatriculaFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value, ...(key === 'semestreId' ? { paqueteId: '' } : {}) }));
    setMessage(null);
    setSuccessMessage(null);
    setTouched((prev) => ({ ...prev, [key]: false }));
    if (key === 'tipoDocumento' || key === 'dni') {
      setDocumentVerified(false);
      setIsExistingUserWithImages(false);
      setShouldPersistDocumentImages(true);
      setDocumentAnalysisMetadata(null);
    }
  }, []);

  const showReniecVerification = verificationFailureCount >= 3 && !documentVerified;

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
          setResponsable(matricula.responsable ?? null);
          setResponsableUser(matricula.responsableUser ?? null);
          setProcessedDocumentImages({
            frente: matricula.user?.dniImagenFrenteProcesadaUrl || null,
            reverso: matricula.user?.dniImagenReversoProcesadaUrl || null,
          });
          setDocumentVerified(true);
          setIsExistingUserWithImages(Boolean(matricula.user?.dniImagenFrenteUrl && matricula.user?.dniImagenReversoUrl));
        } else {
          const configuredSemestre = defaultSemestreId
            ? nextSemestres.find((semestre) => semestre.id === defaultSemestreId)
            : null;
          setValues((prev) => ({
            ...prev,
            semestreId: configuredSemestre ? String(configuredSemestre.id) : '',
            paqueteId: '',
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
    const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const contentType = detectDocumentContentType(file);
    const path = [
      'matriculas',
      'documentos',
      `${values.tipoDocumento}-${cleanDni}-${side}-${Date.now()}-${sanitizeFileName(file.name || `documento.${extension}`)}`,
    ].join('/');
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType });
    const url = await getDownloadURL(storageRef);
    return { path, url, contentType };
  };

  const deleteUploadedDocumentImage = async (image: UploadedImage | null) => {
    if (!image?.path) return;
    await deleteObject(ref(storage, image.path)).catch((error) => {
      console.warn('No se pudo eliminar la imagen temporal de matricula:', error);
    });
  };

  const getMatriculaDocumentoPolicy = async () => {
    const getMatriculaDocumentoEstado = httpsCallable<
      { tipoDocumento: string; dni: string },
      MatriculaDocumentoEstadoResponse
    >(functions, 'getMatriculaDocumentoEstado');
    const result = await getMatriculaDocumentoEstado({
      tipoDocumento: values.tipoDocumento,
      dni: normalizeDocumentNumber(values.dni),
    });
    return result.data.documentImagePolicy ?? null;
  };

  const applyDocumentImagePolicy = (policy?: DocumentImagePolicy | null) => {
    const shouldPersist = policy?.shouldPersistDocumentImages !== false;
    setIsExistingUserWithImages(Boolean(policy?.userHasStoredImages));
    setShouldPersistDocumentImages(shouldPersist);
    return shouldPersist;
  };

  const validateSectionOne = () => {
    if (!values.semestreId) return 'Selecciona un periodo.';
    if (!values.tipoDocumento) return 'Selecciona el tipo de documento.';
    if (!normalizeDocumentNumber(values.dni)) return 'Ingresa el numero de documento.';
    if (!frontFile) return 'Sube la imagen del DNI frente.';
    if (!backFile) return 'Sube la imagen del DNI reverso.';
    return null;
  };

  const getFieldError = useCallback((key: string) => {
    if (!touched[key]) return '';
    if (key === 'semestreId' && !values.semestreId) return 'Esta pregunta es obligatoria.';
    if (key === 'dni') {
      const dni = normalizeDocumentNumber(values.dni);
      if (!dni) return 'Esta pregunta es obligatoria.';
      if (values.tipoDocumento === 'DNI' && !/^\d{8}$/.test(dni)) return 'El numero tiene que tener 8 digitos.';
    }
    if (key === 'frontFile' && !frontFile) return 'Esta pregunta es obligatoria.';
    if (key === 'backFile' && !backFile) return 'Esta pregunta es obligatoria.';
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
      paqueteId: 'Esta pregunta es obligatoria.',
    };
    if (key in requiredLabels && !String(values[key as keyof MatriculaFormValues] || '').trim()) {
      return requiredLabels[key as keyof MatriculaFormValues] || '';
    }
    if (key === 'celular' && values.celular.trim() && !/^\d{9}$/.test(values.celular.trim())) {
      return 'El celular debe tener 9 digitos.';
    }
    if (key === 'recibo' && values.recibo.trim() && !isValidReciboValue(values.recibo)) {
      return 'Ingresa hasta 5 digitos o selecciona CONADIS/BECADO.';
    }
    return '';
  }, [backFile, frontFile, touched, values]);

  const handleVerifyDocument = async () => {
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

    setLoading(true);
    setMessage(null);
    setSuccessMessage(null);
    setDocumentAnalysisMetadata(null);
    try {
      if (recognitionMode === 'gemini') {
        const files = [frontFile, backFile].filter((file): file is File => Boolean(file));
        if (files.length === 0) {
          registerVerificationFailure();
          setMessage('Sube al menos un archivo del documento para analizarlo con Gemini.');
          return;
        }

        const aiResult = await analyzeMatriculaDocumentsWithGemini(
          values.tipoDocumento,
          normalizeDocumentNumber(values.dni),
          files,
        );
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
          registerVerificationFailure();
          setMessage([
            'Gemini no pudo validar el documento con los datos ingresados.',
            JSON.stringify({
              esperado: { tipoDocumento: values.tipoDocumento, dni: expectedNumber },
              analisisDocumentoTemporal: analysisMetadata,
            }, null, 2),
          ].join('\n'));
          return;
        }

        const detectedExpiration = normalizeDateInput(aiResult.fechaVencimiento);
        if (isExpiredDate(detectedExpiration)) {
          registerVerificationFailure();
          setMessage('Documento vencido.');
          return;
        }

        const documentPolicy = await getMatriculaDocumentoPolicy();
        const shouldPersist = applyDocumentImagePolicy(documentPolicy);
        const uploadedFront = shouldPersist && fileClassification.frontIndex !== null
          ? await uploadDocumentImage(files[fileClassification.frontIndex], 'frente')
          : null;
        const uploadedBack = shouldPersist && fileClassification.reverseIndex !== null
          ? await uploadDocumentImage(files[fileClassification.reverseIndex], 'reverso')
          : null;
        setFrontImage(uploadedFront);
        setBackImage(uploadedBack);

        setValues((prev) => ({
          ...prev,
          tipoDocumento: detectedType === 'CE' ? 'CE' : 'DNI',
          dni: detectedNumber || prev.dni,
          apellidoPaterno: asString(aiResult.apellidoPaterno) || prev.apellidoPaterno,
          apellidoMaterno: asString(aiResult.apellidoMaterno) || prev.apellidoMaterno,
          nombre: asString(aiResult.nombre) || prev.nombre,
          sexo: normalizeAiGender(aiResult.sexo) || prev.sexo,
          nacionalidad: detectedType === 'DNI' ? 'PERUANA' : asString(aiResult.nacionalidad) || prev.nacionalidad,
          fechaNacimiento: normalizeDateInput(aiResult.fechaNacimiento) || prev.fechaNacimiento,
          fechaVencimiento: detectedExpiration || prev.fechaVencimiento,
          estadoCivil: normalizeAiCivilStatus(aiResult.estadoCivil) || prev.estadoCivil,
          direccion: asString(aiResult.direccion) || prev.direccion,
          distrito: asString(aiResult.distrito) || prev.distrito,
        }));
        setDocumentVerified(true);
        setVerificationFailureCount(0);
        setDocumentAnalysisMetadata(analysisMetadata);
        setSuccessMessage([
          'Documento verificado con Gemini. Revisa y completa los datos del usuario.',
          '',
          'Respuesta temporal de Gemini:',
          JSON.stringify({
            esperado: {
              tipoDocumento: values.tipoDocumento,
              numeroDocumento: expectedNumber,
            },
            detectadoNormalizado: {
              tipoDocumento: detectedType,
              numeroDocumento: detectedNumber,
            },
            analisisDocumentoTemporal: analysisMetadata,
          }, null, 2),
        ].join('\n'));
        return;
      }

      const uploadedFront = frontFile && !frontImage ? await uploadDocumentImage(frontFile, 'frente') : frontImage;
      const uploadedBack = backFile && !backImage ? await uploadDocumentImage(backFile, 'reverso') : backImage;
      if (uploadedFront) setFrontImage(uploadedFront);
      if (uploadedBack) setBackImage(uploadedBack);

      const verificarDocumento = httpsCallable<
        {
          tipoDocumento: string;
          dni: string;
          frente?: UploadedImage | null;
          reverso?: UploadedImage | null;
        },
        VerificarDocumentoResponse
      >(functions, 'verificarDocumentoMatricula', { timeout: 60000 });
      const result = await verificarDocumento({
        tipoDocumento: values.tipoDocumento,
        dni: normalizeDocumentNumber(values.dni),
        frente: uploadedFront,
        reverso: uploadedBack,
      });
      const datos = result.data.datos || {};
      const documentPolicy = result.data.documentImagePolicy ?? null;
      const shouldPersist = applyDocumentImagePolicy(documentPolicy);
      if (!shouldPersist) {
        await Promise.all([
          deleteUploadedDocumentImage(uploadedFront),
          deleteUploadedDocumentImage(uploadedBack),
        ]);
        setFrontImage(null);
        setBackImage(null);
      } else {
        setFrontImage(uploadedFront);
        setBackImage(uploadedBack);
      }
      setValues((prev) => ({
        ...prev,
        tipoDocumento: datos.tipoDocumento === 'CE' ? 'CE' : prev.tipoDocumento,
        dni: asString(datos.dni) || prev.dni,
        apellidoPaterno: asString(datos.apellidoPaterno) || prev.apellidoPaterno,
        apellidoMaterno: asString(datos.apellidoMaterno) || prev.apellidoMaterno,
        nombre: asString(datos.nombre) || prev.nombre,
        sexo: datos.sexo === 'M' ? 'M' : datos.sexo === 'F' ? 'F' : prev.sexo,
        nacionalidad: (datos.tipoDocumento === 'CE' ? 'CE' : prev.tipoDocumento) === 'DNI'
          ? 'PERUANA'
          : asString(datos.nacionalidad) || prev.nacionalidad,
        fechaNacimiento: asString(datos.fechaNacimiento).split('T')[0] || prev.fechaNacimiento,
        fechaVencimiento: asString(datos.fechaVencimiento).split('T')[0] || prev.fechaVencimiento,
        estadoCivil: normalizeAiCivilStatus(datos.estadoCivil) || prev.estadoCivil,
        instruccion: asString(datos.instruccion) || prev.instruccion,
        direccion: asString(datos.direccion) || prev.direccion,
        distrito: asString(datos.distrito) || prev.distrito,
      }));
      setDocumentVerified(true);
      setVerificationFailureCount(0);
      setSuccessMessage(
        result.data.userExists
          ? 'Documento verificado. Se cargaron los datos guardados del usuario.'
          : 'Documento verificado. Revisa y completa los datos del usuario.',
      );
    } catch (error) {
      registerVerificationFailure();
      setMessage(getCallableErrorMessage(error, 'No se pudo verificar el documento.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWithReniec = async () => {
    const sectionError = validateSectionOne();
    if (sectionError) {
      setMessage(isStandalone ? null : sectionError);
      return;
    }

    setLoading(true);
    setMessage(null);
    setSuccessMessage(null);
    setDocumentAnalysisMetadata(null);
    setFrontFile(null);
    setBackFile(null);
    setFrontImage(null);
    setBackImage(null);
    setProcessedDocumentImages({});
    setIsExistingUserWithImages(false);
    setShouldPersistDocumentImages(false);

    try {
      if (values.tipoDocumento === 'CE') {
        setDocumentVerified(true);
        setSuccessMessage('Documento habilitado. Completa los datos del usuario.');
        return;
      }

      const verificarMatriculaReniec = httpsCallable<
        { tipoDocumento: string; dni: string },
        VerificarReniecResponse
      >(functions, 'verificarMatriculaReniec', { timeout: 60000 });
      const result = await verificarMatriculaReniec({
        tipoDocumento: values.tipoDocumento,
        dni: normalizeDocumentNumber(values.dni),
      });
      const datos = result.data.datos || {};
      setValues((prev) => ({
        ...prev,
        tipoDocumento: datos.tipoDocumento === 'CE' ? 'CE' : 'DNI',
        dni: asString(datos.dni) || prev.dni,
        apellidoPaterno: asString(datos.apellidoPaterno) || prev.apellidoPaterno,
        apellidoMaterno: asString(datos.apellidoMaterno) || prev.apellidoMaterno,
        nombre: asString(datos.nombre) || prev.nombre,
        sexo: datos.sexo === 'M' ? 'M' : datos.sexo === 'F' ? 'F' : prev.sexo,
        nacionalidad: asString(datos.nacionalidad) || prev.nacionalidad,
        fechaNacimiento: asString(datos.fechaNacimiento).split('T')[0] || prev.fechaNacimiento,
        estadoCivil: normalizeAiCivilStatus(datos.estadoCivil) || prev.estadoCivil,
        direccion: asString(datos.direccion) || prev.direccion,
        distrito: asString(datos.distrito) || prev.distrito,
      }));
      setDocumentVerified(true);
      setSuccessMessage(
        result.data.userExists
          ? 'Datos cargados con RENIEC y registros guardados. Completa la matricula.'
          : 'Datos cargados con RENIEC. Completa la matricula.',
      );
    } catch (error) {
      setMessage(getCallableErrorMessage(error, 'No se pudo consultar RENIEC.'));
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
    if (!/^\d{9}$/.test(values.celular.trim())) return 'El celular debe tener 9 digitos.';
    if (!isValidReciboValue(values.recibo)) return 'El recibo debe ser CONADIS, BECADO o hasta 5 digitos.';
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
        recibo: true,
      }));
      setMessage(isStandalone ? null : sectionTwoError);
      return;
    }
    if (!values.paqueteId) {
      markTouched('paqueteId');
      setMessage(isStandalone ? null : 'Selecciona un modulo.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setSuccessMessage(null);
    try {
      const callableName = isEditing
        ? 'updateMatriculaFormulario'
        : isStandalone
          ? 'crearMatriculaFormularioSuelto'
          : 'crearMatriculaFormulario';
      const saveMatricula = httpsCallable<Record<string, unknown>, { id?: number }>(
        functions,
        callableName,
        { timeout: 60000 },
      );
      await saveMatricula({
        ...(isEditing ? { id: Number(matriculaId) } : {}),
        ...values,
        dni: normalizeDocumentNumber(values.dni),
        semestreId: Number(values.semestreId),
        paqueteId: Number(values.paqueteId),
        dniImagenFrente: shouldPersistDocumentImages ? frontImage : null,
        dniImagenReverso: shouldPersistDocumentImages ? backImage : null,
        procesarImagenesDni: shouldPersistDocumentImages,
        analisisDocumentoTemporal: documentAnalysisMetadata,
      });
      setSuccessMessage(isEditing ? 'Matricula actualizada correctamente.' : 'Matricula registrada correctamente.');
      onSaved();
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
              endIcon={
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
              }
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
              disabled={loading}
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
            disabled={loading}
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
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.25, color: 'error.main' }}>
        <ErrorOutlineIcon sx={{ fontSize: 19 }} />
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          {error}
        </Typography>
      </Stack>
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
        width: { xs: '100%', sm: '50%' },
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

  return (
    <Stack spacing={isStandalone ? 1.5 : 2.5}>
      {loading && <LinearProgress />}
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
      {(processedDocumentImages.frente || processedDocumentImages.reverso) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
          {processedDocumentImages.frente && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                DNI frente procesado
              </Typography>
              <Box
                component="img"
                src={processedDocumentImages.frente}
                alt="DNI frente procesado"
                sx={{ display: 'block', width: '100%', maxWidth: 400, height: 'auto', borderRadius: 1 }}
              />
            </Box>
          )}
          {processedDocumentImages.reverso && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                DNI reverso procesado
              </Typography>
              <Box
                component="img"
                src={processedDocumentImages.reverso}
                alt="DNI reverso procesado"
                sx={{ display: 'block', width: '100%', maxWidth: 400, height: 'auto', borderRadius: 1 }}
              />
            </Box>
          )}
        </Box>
      )}

      <Stack spacing={1.5}>
        {!isStandalone ? (
          <Typography variant="subtitle2" fontWeight={700}>
            Documento de Identidad
          </Typography>
        ) : null}
        <Box sx={gridSx}>
          {!hideRecognitionModeControl ? (
          <FormControl fullWidth variant={isStandalone ? 'standard' : 'outlined'} sx={selectLineSx}>
            <InputLabel>Motor de lectura</InputLabel>
            <Select
              label="Motor de lectura"
              value={recognitionMode}
              onChange={(event) => {
                setRecognitionMode(event.target.value === 'documentAi' ? 'documentAi' : 'gemini');
                setDocumentVerified(false);
                setDocumentAnalysisMetadata(null);
                setMessage(null);
                setSuccessMessage(null);
              }}
              disabled={loading || disableRecognitionModeControl}
            >
              <MenuItem value="gemini">Gemini 2.5 Flash</MenuItem>
              <MenuItem value="documentAi">Document AI OCR</MenuItem>
            </Select>
          </FormControl>
          ) : null}
          {!hideSemestreControl ? (
          <FormControl fullWidth error={Boolean(getFieldError('semestreId'))} variant={isStandalone ? 'standard' : 'outlined'} sx={selectLineSx}>
            <InputLabel>{requiredLabel('Periodo')}</InputLabel>
            <Select
              label={isStandalone ? undefined : 'Periodo (*)'}
              variant={isStandalone ? 'standard' : 'outlined'}
              value={values.semestreId}
              onChange={(event) => updateValue('semestreId', String(event.target.value))}
              onBlur={() => markTouched('semestreId')}
              disabled={loadingOptions || loading}
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
          <FormControl fullWidth variant={isStandalone ? 'standard' : 'outlined'} sx={isStandalone ? standaloneRadioSx() : selectLineSx}>
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
                disabled={loading}
              >
                <MenuItem value="DNI">DNI</MenuItem>
                <MenuItem value="CE">CE</MenuItem>
              </Select>
            )}
          </FormControl>
          <TextField
            label={requiredLabel('Numero de DNI')}
            variant={textFieldVariant}
            placeholder={isStandalone ? 'Tu respuesta' : undefined}
            sx={textFieldSx('dni')}
            value={values.dni}
            onChange={(event) => updateValue('dni', normalizeDocumentNumber(event.target.value))}
            onBlur={() => markTouched('dni')}
            error={Boolean(getFieldError('dni'))}
            helperText={standaloneHelperText('dni')}
            disabled={loading}
            inputRef={dniInputRef}
            autoFocus={!isEditing}
            fullWidth
          />
          {renderDocumentFileControl('frente', frontFile, frontImage, requiredLabel('Imagen DNI ó Documento de Extranjeria (De Frente)'))}
          {renderDocumentFileControl('reverso', backFile, backImage, requiredLabel('Imagen DNI ó Documento de Extranjeria (De Reverso)'))}
          <Box className="matricula-actions" sx={{ gridColumn: { xs: 'span 1', md: isStandalone ? 'span 1' : 'span 2' }, display: 'flex', justifyContent: isStandalone ? 'flex-end' : 'space-between' }}>
            {!isStandalone ? <Button onClick={onCancel} disabled={loading}>Cancelar</Button> : null}
            <Stack direction="row" spacing={1}>
              {showReniecVerification ? (
                <Button color="success" variant="contained" onClick={handleVerifyWithReniec} disabled={loading}>
                  Verificar con RENIEC
                </Button>
              ) : null}
              <Button variant="contained" onClick={handleVerifyDocument} disabled={loading}>
                Verificar y continuar
              </Button>
            </Stack>
          </Box>
        </Box>
      </Stack>

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
          <TextField disabled={lockedUntilVerified} label={requiredLabel('Fecha de Nacimiento')} variant={textFieldVariant} sx={textFieldSx('fechaNacimiento')} type="date" value={values.fechaNacimiento} onChange={(event) => updateValue('fechaNacimiento', event.target.value)} onBlur={() => markTouched('fechaNacimiento')} error={Boolean(getFieldError('fechaNacimiento'))} helperText={standaloneHelperText('fechaNacimiento')} InputLabelProps={{ shrink: true }} fullWidth />
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
          <FormControl fullWidth disabled={lockedUntilVerified} error={Boolean(getFieldError('instruccion'))} variant={isStandalone ? 'standard' : 'outlined'} sx={isStandalone ? standaloneRadioSx('instruccion') : selectLineSx}>
            {isStandalone ? (
              <>
                <FormLabel>{requiredLabel('Grado de Instruccion')}</FormLabel>
                <RadioGroup value={values.instruccion} onChange={(event) => updateValue('instruccion', String(event.target.value))} onBlur={() => markTouched('instruccion')}>
                  <FormControlLabel value="Primaria" control={<Radio />} label="Primaria" />
                  <FormControlLabel value="Secundaria" control={<Radio />} label="Secundaria" />
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
                  <MenuItem value="Superior">Superior</MenuItem>
                </Select>
                {getFieldError('instruccion') ? <Typography variant="caption" color="error" sx={{ mt: 0.75 }}>{getFieldError('instruccion')}</Typography> : null}
              </>
            )}
          </FormControl>
          <TextField disabled={lockedUntilVerified} label={requiredLabel('Domicilio Direccion')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx('direccion')} value={values.direccion} onChange={(event) => updateValue('direccion', event.target.value)} onBlur={() => markTouched('direccion')} error={Boolean(getFieldError('direccion'))} helperText={standaloneHelperText('direccion')} fullWidth />
          <TextField disabled={lockedUntilVerified} label={requiredLabel('Domicilio Distrito')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx('distrito')} value={values.distrito} onChange={(event) => updateValue('distrito', event.target.value)} onBlur={() => markTouched('distrito')} error={Boolean(getFieldError('distrito'))} helperText={standaloneHelperText('distrito')} fullWidth />
          <TextField disabled={lockedUntilVerified} label={requiredLabel('Numero de Celular')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx('celular')} value={values.celular} onChange={(event) => updateValue('celular', event.target.value.replace(/\D/g, '').slice(0, 9))} onBlur={() => markTouched('celular')} error={Boolean(getFieldError('celular'))} helperText={standaloneHelperText('celular')} fullWidth />
          <TextField disabled={lockedUntilVerified} label={optionalLabel('Numero de Telefono Fijo')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx()} value={values.telefono} onChange={(event) => updateValue('telefono', event.target.value)} fullWidth />
          <TextField disabled={lockedUntilVerified} label={optionalLabel('Correo Electronico')} variant={textFieldVariant} placeholder={isStandalone ? 'Tu respuesta' : undefined} sx={textFieldSx()} type="email" value={values.email} onChange={(event) => updateValue('email', event.target.value)} fullWidth />
          {!isStandalone ? renderReciboField(lockedUntilVerified) : null}
        </Box>
      </Stack>

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
          <FormControl fullWidth error={Boolean(getFieldError('paqueteId'))} variant={isStandalone ? 'standard' : 'outlined'} sx={isStandalone ? standaloneRadioSx('paqueteId') : undefined}>
            {isStandalone ? (
              <>
                <FormLabel>{requiredLabel('Seleccione un Modulo')}</FormLabel>
                <RadioGroup
                  value={values.paqueteId}
                  onChange={(event) => updateValue('paqueteId', String(event.target.value))}
                  onBlur={() => markTouched('paqueteId')}
                >
                  {paquetes.map((paquete) => (
                    <FormControlLabel
                      key={paquete.id}
                      value={String(paquete.id)}
                      control={<Radio />}
                      label={getPaqueteOptionLabel(paquete)}
                    />
                  ))}
                </RadioGroup>
                {renderFieldError('paqueteId')}
              </>
            ) : (
              <>
                <InputLabel>{requiredLabel('Seleccione un Modulo')}</InputLabel>
                <Select
                  label="Seleccione un Modulo (*)"
                  value={values.paqueteId}
                  onChange={(event) => updateValue('paqueteId', String(event.target.value))}
                  onBlur={() => markTouched('paqueteId')}
                  disabled={courseLocked}
                >
                  {paquetes.map((paquete) => (
                    <MenuItem key={paquete.id} value={String(paquete.id)}>
                      {getPaqueteOptionLabel(paquete)}
                    </MenuItem>
                  ))}
                </Select>
                {getFieldError('paqueteId') ? <Typography variant="caption" color="error" sx={{ mt: 0.75 }}>{getFieldError('paqueteId')}</Typography> : null}
              </>
            )}
          </FormControl>
          {paquetes.length === 0 && values.semestreId && !loadingOptions && (
            <Alert severity="warning">No hay modulos disponibles para este periodo.</Alert>
          )}
          {isStandalone ? renderReciboField(courseLocked) : null}
          <Box sx={{ display: 'flex', justifyContent: isStandalone ? 'flex-end' : 'space-between' }}>
            {!isStandalone ? <Button onClick={onCancel} disabled={loading}>Cancelar</Button> : null}
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={courseLocked || paquetes.length === 0 || (!isEditing && !responsable && !responsableUser)}
            >
              {isEditing ? 'Guardar Cambios' : 'Registrar Matricula'}
            </Button>
          </Box>
        </Stack>
      </Stack>

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
  );
}

export default function MatriculasPage() {
  const { can } = useIntranetPermissions();
  const { settings } = useAppSettings();
  const searchParams = useSearchParams();
  const grupoModuloId = Number(searchParams.get('grupoModuloId') || 0) || null;
  const canDeleteRecords = can('matriculas', 'delete');
  const [matriculas, setMatriculas] = useState<MatriculaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMatriculaModal, setOpenMatriculaModal] = useState(false);
  const [editingMatriculaId, setEditingMatriculaId] = useState<string | null>(null);
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
      fecha: true,
      estudiante: true,
      documento: true,
      periodo: true,
      modulo: true,
      recibo: true,
      archivado: true,
      actions: true,
    });

  const fetchMatriculas = useCallback(async () => {
    setLoading(true);
    try {
      const listMatriculas = httpsCallable<
        { grupoModuloId?: number | null },
        { matriculas?: MatriculaListItem[] }
      >(functions, 'listMatriculas');
      const result = await listMatriculas({ grupoModuloId });
      setMatriculas(result.data.matriculas || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching matriculas: ', err);
      setError(getCallableErrorMessage(err, 'No se pudieron cargar las matriculas.'));
    } finally {
      setLoading(false);
    }
  }, [grupoModuloId]);

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
    setTimeout(() => {
      void fetchMatriculas();
    }, 400);
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
      setTimeout(() => {
        void fetchMatriculas();
      }, 400);
    } catch (err) {
      console.error('Error deleting matricula: ', err);
      setError(getCallableErrorMessage(err, 'No se pudo eliminar la matricula.'));
    }
  }, [fetchMatriculas, matriculas]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'numero',
        headerName: '#',
        width: 72,
        minWidth: 72,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
      },
      {
        field: 'fecha',
        headerName: 'Fecha',
        flex: 0.7,
        minWidth: 110,
        valueGetter: (_value, row: MatriculaListItem) => formatDate(row.fecha),
      },
      {
        field: 'estudiante',
        headerName: 'Estudiante',
        flex: 1.4,
        minWidth: 220,
        valueGetter: (_value, row: MatriculaListItem) => fullName(row.user),
      },
      {
        field: 'documento',
        headerName: 'Documento',
        flex: 0.8,
        minWidth: 130,
        valueGetter: (_value, row: MatriculaListItem) =>
          [row.user?.tipoDocumento || 'DNI', row.user?.dni].filter(Boolean).join(' '),
      },
      {
        field: 'periodo',
        headerName: 'Periodo',
        flex: 1,
        minWidth: 160,
        valueGetter: (_value, row: MatriculaListItem) =>
          row.semestre?.titulo || row.semestre?.nombre || (row.semestreId ? `Semestre ${row.semestreId}` : ''),
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
        flex: 0.75,
        minWidth: 120,
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
    [],
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
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreateMatricula}>
            Nueva Matricula
          </Button>
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
        <MenuItem
          onClick={() => {
            if (menuMatriculaId) handleEditMatricula(menuMatriculaId);
          }}
        >
          Editar
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
          defaultSemestreId={settings.formularioMatricula.semestreId}
          disableRecognitionModeControl
        />
      </Modal1>
    </IntranetListLayout>
  );
}
