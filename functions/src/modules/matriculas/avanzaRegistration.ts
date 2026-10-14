import type { AvanzaCellValue } from './avanzaTemplate';

export type AvanzaStudent = {
  tipoDocumento: string | null; dni: string | null;
  apellidoPaterno: string | null; apellidoMaterno: string | null; nombre: string | null;
  fechaNacimiento: string | null; sexo: string | null; correoInstitucional: string | null; celular: string | null;
};
export type AvanzaRegistrationContext = { periodo: string; codigoModular: string; carrera: string; plan: string; moduloOficial: string };
const upper = (value: string | null | undefined): string => (value ?? '').trim().toLocaleUpperCase('es-PE');

export function avanzaRegistrationRow(student: AvanzaStudent, context: AvanzaRegistrationContext, sequence: number): AvanzaCellValue[] {
  const type = upper(student.tipoDocumento);
  const document = ['CE', 'C.E.', 'CARNET DE EXTRANJERIA', 'CARNÉ DE EXTRANJERÍA', 'CARNET DE EXTRANJERÍA'].includes(type) ? 'PTP' : type;
  let birthday = '';
  if (student.fechaNacimiento) {
    // Birth dates are stored as midnight UTC calendar dates. Do not shift a day in Lima.
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(student.fechaNacimiento);
    if (!match) throw new Error('Una fecha de nacimiento no tiene formato válido.');
    birthday = `${match[3]}/${match[2]}/${match[1]}`;
  }
  const sex = upper(student.sexo);
  const normalizedSex = sex === 'F' || sex.startsWith('FEM') ? 'F' : sex === 'M' || sex.startsWith('MAS') ? 'M' : '';
  const career = upper(context.carrera).replace(/\s*\(AUXILIAR\)\s*$/, '') + ' (AUXILIAR)';
  const cycle = context.periodo.trim().slice(-1);
  if (!/^\d$/.test(cycle)) throw new Error('El semestre actual no tiene un período numérico al final.');
  return [sequence, upper(context.periodo), upper(context.codigoModular), document, upper(student.dni), upper(student.apellidoPaterno), upper(student.apellidoMaterno), upper(student.nombre), birthday, normalizedSex, 'ESTUDIANTE', upper(student.correoInstitucional), upper(student.celular), career, upper(context.plan), upper(context.moduloOficial), Number(cycle)];
}
