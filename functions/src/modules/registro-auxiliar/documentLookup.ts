import { https } from 'firebase-functions/v1';
import {
  getDniError, normalizeIdentityDate, normalizeIdentitySexo,
  type IdentityStudentData,
} from '../../shared/identityDocument.js';

type JsonRecord = Record<string, unknown>;
export const PANEL_API_PERU_SECRET = 'PANEL_API_PERU_TOKEN';

const record = (value: unknown): JsonRecord | null => value && typeof value === 'object' && !Array.isArray(value)
  ? value as JsonRecord : null;
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;

const civilStatuses = new Map([
  ['SOLTERO', 'Soltero'], ['SOLTERA', 'Soltero'], ['CASADO', 'Casado(a)'], ['CASADA', 'Casado(a)'],
  ['VIUDO', 'Viudo(a)'], ['VIUDA', 'Viudo(a)'], ['DIVORCIADO', 'Divorciado(a)'], ['DIVORCIADA', 'Divorciado(a)'],
]);

interface LookupOptions {
  request?: typeof fetch;
  panelApiPeruToken?: string;
  peruDevsKey?: string;
  timeoutMs?: number;
}

export async function lookupIdentityDocument(document: string, options: LookupOptions = {}): Promise<IdentityStudentData> {
  const documentError = getDniError(document);
  if (documentError) throw new https.HttpsError('invalid-argument', documentError);
  const request = options.request ?? fetch;
  const timeoutMs = options.timeoutMs ?? 12000;
  const token = (options.panelApiPeruToken ?? process.env[PANEL_API_PERU_SECRET] ?? '').trim();
  const key = options.peruDevsKey ?? process.env.PERUDEVS_DNI_API_KEY ?? '';

  if (token) {
    try {
      const response = await request(`https://api2.cluzter.dev/api/dni/${document}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs), redirect: 'error',
      });
      const data = record(await response.json());
      if (!response.ok || !data || text(data.DNI) !== document || !text(data.NOMBRES) || !text(data.AP_PAT)) {
        throw new Error('Panel API Perú no devolvió datos válidos.');
      }
      const district = text(data.UBIGEO_DIR)?.split('-').slice(2).join('-');
      return {
        nombre: text(data.NOMBRES), apellidoPaterno: text(data.AP_PAT), apellidoMaterno: text(data.AP_MAT),
        fechaNacimiento: normalizeIdentityDate(data.FECHA_NAC), sexo: normalizeIdentitySexo(data.SEXO),
        direccion: text(data.DIRECCION), distrito: text(district),
        estadoCivil: civilStatuses.get(text(data.EST_CIVIL)?.toUpperCase() ?? '') ?? text(data.EST_CIVIL),
      };
    } catch {
      // Provider failures, including HTTP-200 error payloads and timeouts, allow the fallback.
    }
  }

  if (key) {
    try {
      const url = new URL('https://api.perudevs.com/api/v1/dni/complete');
      url.searchParams.set('document', document);
      url.searchParams.set('key', key);
      const response = await request(url, {
        headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs), redirect: 'error',
      });
      const payload = record(await response.json());
      const data = record(payload?.resultado);
      if (!response.ok || payload?.estado !== true || !data || String(data.id ?? '') !== document
        || !text(data.nombres) || !text(data.apellido_paterno)) {
        throw new Error('PeruDevs no devolvió datos válidos.');
      }
      return {
        nombre: text(data.nombres), apellidoPaterno: text(data.apellido_paterno), apellidoMaterno: text(data.apellido_materno),
        fechaNacimiento: normalizeIdentityDate(data.fecha_nacimiento), sexo: normalizeIdentitySexo(data.genero),
      };
    } catch {
      // No account, user or enrollment is created when both lookups fail.
    }
  }
  throw new https.HttpsError('failed-precondition',
    'No se pudieron obtener los datos del documento. Completa la matrícula manualmente.',
    { manualEntryRequired: true });
}
