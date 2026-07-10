export const ROLE_IDS = {
  docente: 4,
  administrativo: 5,
  coordinador: 6,
  directivo: 7,
  superusuario: 8,
  superadmin: 600,
} as const;

export const normalizeRoleId = (role: string | number | null | undefined) => {
  const value = Number(role);
  return Number.isFinite(value) ? value : 0;
};

export const isDocenteRole = (role: string | number | null | undefined) =>
  normalizeRoleId(role) === ROLE_IDS.docente;

export const isStaffRestrictedRole = (role: string | number | null | undefined) =>
  new Set<number>([ROLE_IDS.administrativo, ROLE_IDS.coordinador, ROLE_IDS.directivo]).has(normalizeRoleId(role));

export const isSuperUserRole = (role: string | number | null | undefined, level = 0) => {
  const roleId = normalizeRoleId(role);
  return roleId === ROLE_IDS.superusuario || roleId === ROLE_IDS.superadmin || level >= 600;
};

export const canDeleteIntranetRecords = (role: string | number | null | undefined, level = 0) =>
  isSuperUserRole(role, level);

export const canManageRegistroAuxiliarMatriculas = (role: string | number | null | undefined, level = 0) =>
  level >= 600
  || new Set<number>([
    ROLE_IDS.administrativo,
    ROLE_IDS.coordinador,
    ROLE_IDS.directivo,
    ROLE_IDS.superusuario,
    ROLE_IDS.superadmin,
  ]).has(normalizeRoleId(role));

export const canAccessIntranet = (role: string | number | null | undefined, level = 0) =>
  isDocenteRole(role) || level >= 300;
