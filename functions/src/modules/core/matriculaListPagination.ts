import { type MatriculaModuloRow } from './matriculaModuloRows.js';

export type MatriculaGridRequest = {
  page?: number; pageSize?: number;
  sortModel?: Array<{ field: string; sort?: 'asc' | 'desc' | null }>;
  filterModel?: { items?: Array<{ field: string; operator: string; value?: unknown }>;
    logicOperator?: string; quickFilterValues?: unknown[]; quickFilterLogicOperator?: string };
  quickFilterFields?: string[];
};
export type MatriculaGridIndex = { id: number; fecha?: string | null; recibo?: string | null; archivado?: boolean | null;
  user?: Record<string, unknown> | null; semestre?: { id?: number | null; titulo?: string | null } | null;
  responsableUser?: Record<string, unknown> | null };

const fields = new Set(['fecha', 'estudiante', 'fechaNacimiento', 'edad', 'sexo', 'direccion', 'distrito',
  'documento', 'periodo', 'celular', 'grupo', 'recibo', 'responsableFormulario', 'archivado']);
const shortDate = new Intl.DateTimeFormat('es-PE', {dateStyle:'short',timeZone:'America/Lima'});
const calendarDate = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Lima'});
const text = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');
const date = (value: unknown) => {
  const raw = String(value ?? '');
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!parts) return raw;
  const calendarOnly = !/[T\s]\d{2}:\d{2}/.test(raw) || /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/i.test(raw);
  const parsed = calendarOnly ? new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), 12)) : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : shortDate.format(parsed);
};
const name = (user?: Record<string, unknown> | null, student = false) => {
  const surnames = [user?.apellidoPaterno, user?.apellidoMaterno].filter(Boolean).join(' ');
  return student && (surnames || user?.nombre) ? [surnames, user?.nombre].filter(Boolean).join(', ')
    : user?.username || [surnames, user?.nombre].filter(Boolean).join(' ') || user?.email || '';
};
export function matriculaGridValue(row: MatriculaModuloRow<MatriculaGridIndex>, field: string): unknown {
  const user = row.user;
  switch (field) {
    case 'estudiante': return name(user, true);
    case 'responsableFormulario': return name(row.responsableUser);
    case 'fecha': return date(row.fecha);
    case 'fechaNacimiento': return date(user?.fechaNacimiento);
    case 'edad': {
      const raw = String(user?.fechaNacimiento ?? '');
      if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return null;
      const today = calendarDate.format(new Date());
      return Number(today.slice(0, 4)) - Number(raw.slice(0, 4)) - (today.slice(5) < raw.slice(5, 10) ? 1 : 0);
    }
    case 'documento': return [user?.tipoDocumento || 'DNI', user?.dni].filter(Boolean).join(' ');
    case 'periodo': return row.semestre?.titulo || (row.semestre?.id ? `Semestre ${row.semestre.id}` : '');
    case 'grupo': return row.grupoModuloNombre;
    case 'archivado': return row.archivado ? 'Si' : 'No';
    case 'recibo': return row.recibo || '';
    default: return user?.[field] ?? '';
  }
}
export function matchesGridFilter(value: unknown, operator: string, filter: unknown) {
  const a = text(value), b = text(filter);
  switch (operator) {
    case 'isEmpty': return value == null || a === '';
    case 'isNotEmpty': return value != null && a !== '';
    case 'contains': return a.includes(b);
    case 'doesNotContain': return !a.includes(b);
    case 'equals': case 'is': return a === b;
    case 'doesNotEqual': case 'not': return a !== b;
    case 'startsWith': return a.startsWith(b);
    case 'endsWith': return a.endsWith(b);
    case 'isAnyOf': return Array.isArray(filter) && filter.some((item) => a === text(item));
    case '=': return value != null && Number(value) === Number(filter);
    case '!=': return value != null && Number(value) !== Number(filter);
    case '>': return value != null && Number(value) > Number(filter);
    case '>=': return value != null && Number(value) >= Number(filter);
    case '<': return value != null && Number(value) < Number(filter);
    case '<=': return value != null && Number(value) <= Number(filter);
    default: throw new Error(`Operador de filtro no soportado: ${operator}`);
  }
}
export function matriculaPageNeedsSearch(request: MatriculaGridRequest) {
  return Boolean(request.sortModel?.some((item) => fields.has(item.field))
    || request.filterModel?.items?.some((item) => fields.has(item.field))
    || request.filterModel?.quickFilterValues?.some((value) => String(value).trim()));
}
export function selectMatriculaPage<T extends MatriculaGridIndex>(rows: MatriculaModuloRow<T>[], request: MatriculaGridRequest) {
  const filters = (request.filterModel?.items ?? []).filter((item) => fields.has(item.field)
    && (['isEmpty', 'isNotEmpty'].includes(item.operator) || (item.value != null && String(item.value) !== '')));
  const quickValues = (request.filterModel?.quickFilterValues ?? []).filter((value) => String(value).trim());
  const quickFields = (request.quickFilterFields ?? Array.from(fields)).filter((field) => fields.has(field));
  const filtered = rows.filter((row) => {
    const checks = filters.map((item) => matchesGridFilter(matriculaGridValue(row, item.field), item.operator, item.value));
    if (checks.length && !(request.filterModel?.logicOperator === 'or' ? checks.some(Boolean) : checks.every(Boolean))) return false;
  const quickChecks = quickValues.map((value) => quickFields.some((field) => field === 'edad'
    ? matriculaGridValue(row, field) != null && Number(matriculaGridValue(row, field)) === Number(value)
    : text(matriculaGridValue(row, field)).includes(text(value))));
    return !quickChecks.length || (request.filterModel?.quickFilterLogicOperator === 'or' ? quickChecks.some(Boolean) : quickChecks.every(Boolean));
  });
  const sort = (request.sortModel ?? []).filter((item) => fields.has(item.field) && item.sort);
  if (sort.length) filtered.sort((a, b) => {
    for (const item of sort) {
      const av = matriculaGridValue(a, item.field), bv = matriculaGridValue(b, item.field);
      const comparison = item.field === 'edad' ? Number(av ?? -1) - Number(bv ?? -1)
        : text(av).localeCompare(text(bv), 'es-PE');
      if (comparison) return item.sort === 'desc' ? -comparison : comparison;
    }
    return 0; // Preserve the initial date/ID ordering for equal column values, as the grid did.
  });
  const pageSize = Math.max(1, Math.min(100, Math.floor(Number(request.pageSize) || 50)));
  const page = Math.max(0, Math.floor(Number(request.page) || 0));
  return { rows: filtered.slice(page * pageSize, (page + 1) * pageSize), rowCount: filtered.length };
}
