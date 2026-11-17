import { https } from 'firebase-functions/v1';
import {
  getIdentityDocumentType, normalizeIdentityDate, normalizeIdentitySexo,
  type IdentityStudentData,
} from '../../shared/identityDocument.js';

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord | null => value && typeof value === 'object' && !Array.isArray(value)
  ? value as JsonRecord : null;
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;

interface LookupOptions {
  request?: typeof fetch;
  factilizaToken?: string;
  peruDevsKey?: string;
  timeoutMs?: number;
}

/** Never merge data from providers: PeruDevs is used only when Factiliza fails. */
export async function lookupIdentityDocument(document: string, options: LookupOptions = {}): Promise<IdentityStudentData> {
  const type = getIdentityDocumentType(document);
  if (!type) throw new https.HttpsError('invalid-argument', 'Documento no válido.');
  const request = options.request ?? fetch;
  const timeoutMs = options.timeoutMs ?? 12000;
  const token = options.factilizaToken ?? process.env.FACTILIZA_API_TOKEN ?? '';
  const key = options.peruDevsKey ?? process.env.PERUDEVS_DNI_API_KEY ?? '';

  if (token) {
    try {
      const response = await request(`https://api.factiliza.com/v1/${type === 'DNI' ? 'dni' : 'cee'}/info/${document}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs), redirect: 'error',
      });
      const payload = record(await response.json());
      const data = record(payload?.data);
      const message = String(payload?.message ?? '').toLowerCase();
      const failureMessage = /error|saldo|vencid|expirad|agotad|sin cr[eé]dito|no encontrad|no disponible|no se encontr/.test(message);
      // CE's documented success example has no `success` field.
      if (!response.ok || Number(payload?.status) !== 200 || payload?.success === false || failureMessage
        || !data || String(data.numero ?? '') !== document || !text(data.nombres) || !text(data.apellido_paterno)) {
        throw new Error('Factiliza no devolvió datos válidos.');
      }
      return {
        nombre: text(data.nombres), apellidoPaterno: text(data.apellido_paterno), apellidoMaterno: text(data.apellido_materno),
        fechaNacimiento: normalizeIdentityDate(data.fecha_nacimiento), sexo: normalizeIdentitySexo(data.sexo),
        direccion: text(data.direccion_completa) ?? text(data.direccion), distrito: text(data.distrito),
        nacionalidad: text(data.nacionalidad), estadoCivil: text(data.estado_civil),
      };
    } catch {
      // Provider failures, including HTTP-200 error payloads and timeouts, allow the fallback.
    }
  }

  if (type === 'DNI' && key) {
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
