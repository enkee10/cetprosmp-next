export type IdentityDocumentType = 'DNI' | 'CE';

export interface IdentityStudentData {
  nombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  fechaNacimiento?: string | null;
  sexo?: string | null;
  nacionalidad?: string | null;
  estadoCivil?: string | null;
  instruccion?: string | null;
  nombreColegio?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  celular?: string | null;
  telefono?: string | null;
  email?: string | null;
}

export const IDENTITY_STUDENT_FIELDS = [
  'nombre', 'apellidoPaterno', 'apellidoMaterno', 'fechaNacimiento', 'sexo', 'nacionalidad',
  'estadoCivil', 'instruccion', 'nombreColegio', 'direccion', 'distrito', 'celular', 'telefono', 'email',
] as const;

export function getIdentityDocumentType(value: string): IdentityDocumentType | null {
  if (/^\d{8}$/.test(value)) return 'DNI';
  if (/^0\d{8}$/.test(value)) return 'CE';
  return null;
}

export function getIdentityDocumentError(value: string): string | null {
  if (getIdentityDocumentType(value)) return null;
  if (/^\d{9}$/.test(value)) return 'El CE debe comenzar con 0. Si es un DNI, revisa que tenga solo 8 dígitos.';
  return 'Ingresa un DNI de 8 dígitos o un CE de 9 dígitos que comience con 0.';
}

export function normalizeIdentityDate(value: unknown): string | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw);
  const iso = dmy ? `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}` : raw;
  const parts = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(iso);
  if (!parts) return null;
  const date = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
  return date.toISOString().slice(0, 10) === iso.slice(0, 10) ? iso.slice(0, 10) : null;
}

export function normalizeIdentitySexo(value: unknown): 'F' | 'M' | null {
  const text = String(value ?? '').trim().toUpperCase();
  if (text === 'M' || text === '1' || text === 'MASCULINO') return 'M';
  if (text === 'F' || text === '2' || text === 'FEMENINO') return 'F';
  return null;
}

export function isAttendingSecondary(value: unknown): boolean {
  return /secundaria.*(?:curso|incomplet|escolar)|cursando.*secundaria/i.test(String(value ?? ''));
}

export function validateManualStudent(data: IdentityStudentData, required = true, today?: string): Partial<Record<keyof IdentityStudentData, string>> {
  const errors: Partial<Record<keyof IdentityStudentData, string>> = {};
  for (const field of ['nombre', 'apellidoPaterno', 'apellidoMaterno'] as const) {
    if (required && !String(data[field] ?? '').trim()) errors[field] = 'Este campo es obligatorio.';
  }
  const birthDate = normalizeIdentityDate(data.fechaNacimiento);
  if ((required || data.fechaNacimiento) && (!birthDate || birthDate < '1900-01-01' || (today && birthDate > today))) {
    errors.fechaNacimiento = 'Ingresa una fecha de nacimiento válida.';
  }
  if ((required || data.sexo) && data.sexo !== 'F' && data.sexo !== 'M') errors.sexo = 'Selecciona el sexo.';
  if (required && isAttendingSecondary(data.instruccion) && !String(data.nombreColegio ?? '').trim()) {
    errors.nombreColegio = 'Ingresa el colegio donde cursa secundaria.';
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'Ingresa un correo válido.';
  if (data.celular && !/^9\d{8}$/.test(data.celular.trim())) errors.celular = 'El celular debe tener 9 dígitos y comenzar con 9.';
  return errors;
}
