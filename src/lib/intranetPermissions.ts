export const normalizeRoleId = (role: string | number | null | undefined) => {
  const value = Number(role);
  return Number.isFinite(value) ? value : 0;
};

export const isSuperUserLevel = (level = 0) => level >= 600;

const blockedIntranetRoleIds = new Set([1, 9]);
const blockedIntranetRoleTitles = new Set(['visitante', 'exestudiante', 'exdocente']);

const normalizeRoleTitle = (roleTitle: unknown) =>
  String(roleTitle ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_-]+/g, '');

export const isBlockedIntranetRole = (
  role: string | number | null | undefined,
  roleTitle?: unknown,
) => {
  const roleId = normalizeRoleId(role);
  if (blockedIntranetRoleIds.has(roleId)) return true;

  const normalizedTitle = normalizeRoleTitle(roleTitle);
  return blockedIntranetRoleTitles.has(normalizedTitle);
};

export const canAccessIntranet = (
  role: string | number | null | undefined,
  level = 0,
  roleTitle?: unknown,
) =>
  isSuperUserLevel(level) || (
    normalizeRoleId(role) > 0
    && Number(level) > 0
    && !isBlockedIntranetRole(role, roleTitle)
  );
