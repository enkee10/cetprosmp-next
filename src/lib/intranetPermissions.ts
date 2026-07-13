export const normalizeRoleId = (role: string | number | null | undefined) => {
  const value = Number(role);
  return Number.isFinite(value) ? value : 0;
};

export const isSuperUserLevel = (level = 0) => level >= 600;

export const canAccessIntranet = (role: string | number | null | undefined, level = 0) =>
  isSuperUserLevel(level) || normalizeRoleId(role) > 0;
