'use client';

import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {
  GridColDef,
  GridColumnVisibilityModel,
  GridPaginationModel,
} from '@mui/x-data-grid';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { app, functions, storage } from '@/lib/firebase';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import Modal1 from '@/components/Modal1';

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

interface MatriculaListItem {
  id: number;
  recibo?: string | null;
  fecha?: string | null;
  archivado?: boolean | null;
  paqueteId?: number | null;
  semestreId?: number | null;
  userId?: number | null;
  user?: MatriculaUser | null;
  paquete?: PaqueteOption | null;
  semestre?: SemestreOption | null;
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
  nacionalidad: '',
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

const steps = ['Documento de Identidad', 'Datos de Usuario', 'Datos de los Cursos'];

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
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'short' }).format(date);
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
    nacionalidad: user?.nacionalidad || '',
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

function MatriculaForm({
  matriculaId,
  isOpen,
  onCancel,
  onSaved,
}: {
  matriculaId?: string;
  isOpen: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const isEditing = Boolean(matriculaId);
  const dniInputRef = useRef<HTMLInputElement | null>(null);
  const [activeStep, setActiveStep] = useState(0);
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
  const [recognitionMode, setRecognitionMode] = useState<RecognitionMode>('gemini');
  const [documentVerified, setDocumentVerified] = useState(false);
  const [isExistingUserWithImages, setIsExistingUserWithImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedSemestreId = Number(values.semestreId || 0);
  const selectedSemestreLabel = useMemo(() => {
    const semestre = semestres.find((item) => String(item.id) === values.semestreId);
    return semestre?.titulo || semestre?.nombre || (semestre?.id ? `Semestre ${semestre.id}` : '');
  }, [semestres, values.semestreId]);

  const updateValue = useCallback(<K extends keyof MatriculaFormValues>(key: K, value: MatriculaFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value, ...(key === 'semestreId' ? { paqueteId: '' } : {}) }));
    setMessage(null);
    setSuccessMessage(null);
    if (key === 'tipoDocumento' || key === 'dni') {
      setDocumentVerified(false);
      setIsExistingUserWithImages(false);
      setDocumentAnalysisMetadata(null);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || isEditing || activeStep !== 0) return;

    const timer = window.setTimeout(() => {
      dniInputRef.current?.focus();
      dniInputRef.current?.select();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [activeStep, isEditing, isOpen]);

  useEffect(() => {
    let mounted = true;
    const loadInitialData = async () => {
      setLoadingOptions(true);
      try {
        const listSemestres = httpsCallable<undefined, { semestres?: SemestreOption[] }>(functions, 'listSemestres');
        const semestresResult = await listSemestres();
        if (!mounted) return;
        const nextSemestres = semestresResult.data.semestres || [];
        setSemestres(nextSemestres);

        if (matriculaId) {
          const getMatricula = httpsCallable<{ id: number }, { matricula?: MatriculaListItem | null }>(
            functions,
            'getMatricula',
          );
          const result = await getMatricula({ id: Number(matriculaId) });
          if (!mounted) return;
          const matricula = result.data.matricula;
          if (!matricula) {
            setMessage('No se encontro la matricula seleccionada.');
            return;
          }
          setValues(valuesFromMatricula(matricula));
          setProcessedDocumentImages({
            frente: matricula.user?.dniImagenFrenteProcesadaUrl || null,
            reverso: matricula.user?.dniImagenReversoProcesadaUrl || null,
          });
          setDocumentVerified(true);
          setIsExistingUserWithImages(Boolean(matricula.user?.dniImagenFrenteUrl && matricula.user?.dniImagenReversoUrl));
          setActiveStep(1);
        } else {
          const currentSemestre = getCurrentSemestre(nextSemestres);
          if (currentSemestre) {
            setValues((prev) => ({ ...prev, semestreId: String(currentSemestre.id), paqueteId: '' }));
          }
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
  }, [matriculaId]);

  useEffect(() => {
    let mounted = true;
    const loadPaquetes = async () => {
      setPaquetes([]);
      if (!selectedSemestreId) return;

      setLoadingOptions(true);
      try {
        const listPaquetes = httpsCallable<{ semestreId: number }, { paquetes?: PaqueteOption[] }>(
          functions,
          'listMatriculaPaquetesBySemestre',
        );
        const result = await listPaquetes({ semestreId: selectedSemestreId });
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
  }, [selectedSemestreId]);

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

  const validateSectionOne = () => {
    if (!values.semestreId) return 'Selecciona un periodo.';
    if (!values.tipoDocumento) return 'Selecciona el tipo de documento.';
    if (!normalizeDocumentNumber(values.dni)) return 'Ingresa el numero de documento.';
    return null;
  };

  const handleVerifyDocument = async () => {
    const sectionError = validateSectionOne();
    if (sectionError) {
      setMessage(sectionError);
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
          setMessage([
            'Gemini no pudo validar el documento con los datos ingresados.',
            JSON.stringify({
              esperado: { tipoDocumento: values.tipoDocumento, dni: expectedNumber },
              analisisDocumentoTemporal: analysisMetadata,
            }, null, 2),
          ].join('\n'));
          return;
        }

        const uploadedFront = fileClassification.frontIndex !== null
          ? await uploadDocumentImage(files[fileClassification.frontIndex], 'frente')
          : null;
        const uploadedBack = fileClassification.reverseIndex !== null
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
          fechaVencimiento: normalizeDateInput(aiResult.fechaVencimiento) || prev.fechaVencimiento,
          estadoCivil: normalizeAiCivilStatus(aiResult.estadoCivil) || prev.estadoCivil,
          direccion: asString(aiResult.direccion) || prev.direccion,
          distrito: asString(aiResult.distrito) || prev.distrito,
        }));
        setDocumentVerified(true);
        setIsExistingUserWithImages(false);
        setDocumentAnalysisMetadata(analysisMetadata);
        setActiveStep(1);
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
        fechaVencimiento: prev.fechaVencimiento,
        estadoCivil: normalizeAiCivilStatus(datos.estadoCivil) || prev.estadoCivil,
        instruccion: asString(datos.instruccion) || prev.instruccion,
        direccion: asString(datos.direccion) || prev.direccion,
        distrito: asString(datos.distrito) || prev.distrito,
      }));
      setDocumentVerified(true);
      setIsExistingUserWithImages(Boolean(result.data.userExists && result.data.userHasStoredImages));
      setActiveStep(1);
      setSuccessMessage(
        result.data.userExists
          ? 'Documento verificado. Se cargaron los datos guardados del usuario.'
          : 'Documento verificado. Revisa y completa los datos del usuario.',
      );
    } catch (error) {
      setMessage(getCallableErrorMessage(error, 'No se pudo verificar el documento.'));
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
    return null;
  };

  const handleGoToCourses = () => {
    const sectionError = validateSectionTwo();
    if (sectionError) {
      setMessage(sectionError);
      return;
    }
    setMessage(null);
    setActiveStep(2);
  };

  const handleSubmit = async () => {
    if (!documentVerified) {
      setMessage('Primero verifica el documento de identidad.');
      setActiveStep(0);
      return;
    }
    const sectionTwoError = validateSectionTwo();
    if (sectionTwoError) {
      setMessage(sectionTwoError);
      setActiveStep(1);
      return;
    }
    if (!values.paqueteId) {
      setMessage('Selecciona un modulo.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setSuccessMessage(null);
    try {
      const callableName = isEditing ? 'updateMatriculaFormulario' : 'crearMatriculaFormulario';
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
        dniImagenFrente: isExistingUserWithImages ? null : frontImage,
        dniImagenReverso: isExistingUserWithImages ? null : backImage,
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
    if (side === 'frente') {
      setFrontFile(file);
      setFrontImage(null);
    } else {
      setBackFile(file);
      setBackImage(null);
    }
    setDocumentVerified(false);
    setDocumentAnalysisMetadata(null);
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          {isEditing ? 'Editar Matricula' : 'Nueva Matricula'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {selectedSemestreLabel || 'Selecciona un periodo para iniciar.'}
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {loading && <LinearProgress />}
      {message && <Alert severity="error" sx={{ whiteSpace: 'pre-wrap' }}>{message}</Alert>}
      {successMessage && <Alert severity="success" sx={{ whiteSpace: 'pre-wrap' }}>{successMessage}</Alert>}
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

      {activeStep === 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          <FormControl fullWidth>
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
              disabled={loading}
            >
              <MenuItem value="gemini">Gemini 2.5 Flash</MenuItem>
              <MenuItem value="documentAi">Document AI OCR</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Periodo</InputLabel>
            <Select
              label="Periodo"
              value={values.semestreId}
              onChange={(event) => updateValue('semestreId', String(event.target.value))}
              disabled={loadingOptions || loading}
            >
              {semestres.map((semestre) => (
                <MenuItem key={semestre.id} value={String(semestre.id)}>
                  {semestre.titulo || semestre.nombre || `Semestre ${semestre.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Tipo documento</InputLabel>
            <Select
              label="Tipo documento"
              value={values.tipoDocumento}
              onChange={(event) => updateValue('tipoDocumento', event.target.value === 'CE' ? 'CE' : 'DNI')}
              disabled={loading}
            >
              <MenuItem value="DNI">DNI</MenuItem>
              <MenuItem value="CE">CE</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Numero de DNI"
            value={values.dni}
            onChange={(event) => updateValue('dni', normalizeDocumentNumber(event.target.value))}
            disabled={loading}
            inputRef={dniInputRef}
            autoFocus={!isEditing}
            fullWidth
          />
          <Button component="label" variant="outlined" disabled={loading}>
            {frontFile ? frontFile.name : isExistingUserWithImages ? 'Archivo frente guardado' : 'Archivo dni frente'}
            <input type="file" accept="image/*,application/pdf" hidden onChange={handleFileChange('frente')} />
          </Button>
          <Button component="label" variant="outlined" disabled={loading}>
            {backFile ? backFile.name : isExistingUserWithImages ? 'Archivo reverso guardado' : 'Archivo dni reverso'}
            <input type="file" accept="image/*,application/pdf" hidden onChange={handleFileChange('reverso')} />
          </Button>
          <Box sx={{ gridColumn: { xs: 'span 1', md: 'span 2' }, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={onCancel} disabled={loading}>Cancelar</Button>
            <Button variant="contained" onClick={handleVerifyDocument} disabled={loading}>
              Verificar y continuar
            </Button>
          </Box>
        </Box>
      )}

      {activeStep === 1 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          <TextField label="Apellido Paterno" value={values.apellidoPaterno} onChange={(event) => updateValue('apellidoPaterno', event.target.value)} fullWidth />
          <TextField label="Apellido Materno" value={values.apellidoMaterno} onChange={(event) => updateValue('apellidoMaterno', event.target.value)} fullWidth />
          <TextField label="Nombres" value={values.nombre} onChange={(event) => updateValue('nombre', event.target.value)} fullWidth />
          <FormControl>
            <FormLabel>Sexo</FormLabel>
            <RadioGroup row value={values.sexo} onChange={(event) => updateValue('sexo', event.target.value === 'M' ? 'M' : 'F')}>
              <FormControlLabel value="F" control={<Radio />} label="Femenino" />
              <FormControlLabel value="M" control={<Radio />} label="Masculino" />
            </RadioGroup>
          </FormControl>
          <TextField label="Nacionalidad" value={values.nacionalidad} onChange={(event) => updateValue('nacionalidad', event.target.value)} fullWidth />
          <TextField label="Fecha de Nacimiento" type="date" value={values.fechaNacimiento} onChange={(event) => updateValue('fechaNacimiento', event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="Fecha de Vencimiento" type="date" value={values.fechaVencimiento} onChange={(event) => updateValue('fechaVencimiento', event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Estado Civil</InputLabel>
            <Select label="Estado Civil" value={values.estadoCivil} onChange={(event) => updateValue('estadoCivil', String(event.target.value))}>
              <MenuItem value="Soltero(a)">Soltero(a)</MenuItem>
              <MenuItem value="Casado(a)">Casado(a)</MenuItem>
              <MenuItem value="Viudo(a)">Viudo(a)</MenuItem>
              <MenuItem value="Divorciado(a)">Divorciado(a)</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Grado de Instruccion</InputLabel>
            <Select label="Grado de Instruccion" value={values.instruccion} onChange={(event) => updateValue('instruccion', String(event.target.value))}>
              <MenuItem value="Primaria">Primaria</MenuItem>
              <MenuItem value="Secundaria">Secundaria</MenuItem>
              <MenuItem value="Superior">Superior</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Domicilio Direccion" value={values.direccion} onChange={(event) => updateValue('direccion', event.target.value)} fullWidth />
          <TextField label="Domicilio Distrito" value={values.distrito} onChange={(event) => updateValue('distrito', event.target.value)} fullWidth />
          <TextField label="Numero de Celular" value={values.celular} onChange={(event) => updateValue('celular', event.target.value.replace(/\D/g, '').slice(0, 9))} fullWidth />
          <TextField label="Numero de Telefono Fijo" value={values.telefono} onChange={(event) => updateValue('telefono', event.target.value)} fullWidth />
          <TextField label="Correo Electronico" type="email" value={values.email} onChange={(event) => updateValue('email', event.target.value)} fullWidth />
          <TextField label="Numero de recibo" value={values.recibo} onChange={(event) => updateValue('recibo', event.target.value)} fullWidth />
          <Box sx={{ gridColumn: { xs: 'span 1', md: 'span 2' }, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setActiveStep(0)} disabled={loading}>Volver</Button>
            <Button variant="contained" onClick={handleGoToCourses} disabled={loading}>Continuar</Button>
          </Box>
        </Box>
      )}

      {activeStep === 2 && (
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Seleccione un Modulo</InputLabel>
            <Select
              label="Seleccione un Modulo"
              value={values.paqueteId}
              onChange={(event) => updateValue('paqueteId', String(event.target.value))}
              disabled={loadingOptions || loading}
            >
              {paquetes.map((paquete) => (
                <MenuItem key={paquete.id} value={String(paquete.id)}>
                  {paquete.titulo || `Modulo ${paquete.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {paquetes.length === 0 && values.semestreId && !loadingOptions && (
            <Alert severity="warning">No hay modulos disponibles para este periodo.</Alert>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setActiveStep(1)} disabled={loading}>Volver</Button>
            <Button variant="contained" onClick={handleSubmit} disabled={loading || paquetes.length === 0}>
              {isEditing ? 'Guardar Cambios' : 'Registrar Matricula'}
            </Button>
          </Box>
        </Stack>
      )}
    </Stack>
  );
}

export default function MatriculasPage() {
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
      const listMatriculas = httpsCallable<undefined, { matriculas?: MatriculaListItem[] }>(functions, 'listMatriculas');
      const result = await listMatriculas();
      setMatriculas(result.data.matriculas || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching matriculas: ', err);
      setError(getCallableErrorMessage(err, 'No se pudieron cargar las matriculas.'));
    } finally {
      setLoading(false);
    }
  }, []);

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
        <MenuItem
          onClick={() => {
            if (menuMatriculaId) void handleDeleteMatricula(menuMatriculaId);
          }}
        >
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={openMatriculaModal}
        onClose={handleDismissModal}
        title={editingMatriculaId ? 'Editar Matricula' : 'Nueva Matricula'}
        maxWidth={1100}
        disableAutoFocus
      >
        <MatriculaForm
          key={`${editingMatriculaId ?? 'new-matricula'}-${formResetKey}`}
          matriculaId={editingMatriculaId ?? undefined}
          isOpen={openMatriculaModal}
          onCancel={handleDismissModal}
          onSaved={handleSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
