import { matchesGridFilter, type MatriculaGridRequest } from './matriculaListPagination.js';

export type UserGridRequest = MatriculaGridRequest;
export type UserGridIndex = { id: number; [field: string]: unknown };
export const USER_GRID_FIELDS = ['username', 'nickName', 'correoInstitucional', 'email', 'celular',
  'sexo', 'fechaNacimiento', 'dni', 'nacionalidad', 'estadoCivil', 'instruccion', 'direccion',
  'distrito', 'rolId', 'bloqueado'];
const fields = new Set(USER_GRID_FIELDS);
const normalize = (value: unknown) => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE');

export function userGridValue(row: UserGridIndex, field: string): unknown {
  if (field === 'bloqueado') return String(Boolean(row.blocked));
  if (field === 'rolId') return row.rolId == null ? null : Number(row.rolId);
  if (field === 'nacionalidad') return row.nacionalidad || 'PERUANA';
  return row[field] ?? '';
}

export function userPageNeedsSearch(request: UserGridRequest) {
  return Boolean(request.sortModel?.some((item) => fields.has(item.field))
    || request.filterModel?.items?.some((item) => fields.has(item.field))
    || request.filterModel?.quickFilterValues?.some((value) => String(value).trim()));
}

export function selectUserPage<T extends UserGridIndex>(rows: T[], request: UserGridRequest) {
  const filters = (request.filterModel?.items ?? []).filter((item) => fields.has(item.field)
    && (['isEmpty', 'isNotEmpty'].includes(item.operator) || (item.value != null && String(item.value) !== '')));
  const quickValues = (request.filterModel?.quickFilterValues ?? []).filter((value) => String(value).trim());
  const quickFields = (request.quickFilterFields ?? USER_GRID_FIELDS).filter((field) => fields.has(field));
  const filtered = rows.filter((row) => {
    const checks = filters.map((item) => matchesGridFilter(userGridValue(row, item.field), item.operator, item.value));
    if (checks.length && !(request.filterModel?.logicOperator === 'or' ? checks.some(Boolean) : checks.every(Boolean))) return false;
    const quickChecks = quickValues.map((value) => quickFields.some((field) => field === 'rolId'
      ? row.rolId != null && Number(row.rolId) === Number(value)
      : normalize(userGridValue(row, field)).includes(normalize(value))));
    return !quickChecks.length || (request.filterModel?.quickFilterLogicOperator === 'or' ? quickChecks.some(Boolean) : quickChecks.every(Boolean));
  });
  const sort = (request.sortModel ?? []).filter((item) => fields.has(item.field) && item.sort);
  if (sort.length) filtered.sort((a, b) => {
    for (const item of sort) {
      const av = userGridValue(a, item.field), bv = userGridValue(b, item.field);
      const comparison = item.field === 'rolId' ? Number(av ?? -1) - Number(bv ?? -1)
        : normalize(av).localeCompare(normalize(bv), 'es-PE');
      if (comparison) return item.sort === 'desc' ? -comparison : comparison;
    }
    return 0;
  });
  const pageSize = Math.max(1, Math.min(100, Math.floor(Number(request.pageSize) || 30)));
  const page = Math.max(0, Math.floor(Number(request.page) || 0));
  return { rows: filtered.slice(page * pageSize, (page + 1) * pageSize), rowCount: filtered.length };
}
