import { initializeApp, getApps, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app: App;
if (!getApps().length) {
  app = initializeApp();
} else {
  app = getApps()[0];
}

export const authAdmin = getAuth(app);
export const DEFAULT_ROLE_ID = 1;
export const STUDENT_ROLE_ID = 3;
export const TEACHER_ROLE_ID = 4;
export const DEFAULT_LEVEL = 0;
const SUPERADMIN_EMAIL = "enkee03@cetprosmp.edu.pe";
const SUPERADMIN_ROLE = "600";
const SUPERADMIN_LEVEL = 600;
const INSTITUTIONAL_DOMAIN = "cetprosmp.edu.pe";

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return (email || "").trim().toLowerCase() === SUPERADMIN_EMAIL;
}

export function resolveInitialRoleIdByEmail(email: string | null | undefined): number {
  const normalized = (email || "").trim().toLowerCase();
  const [localPart, domain] = normalized.split("@");

  if (!localPart || domain !== INSTITUTIONAL_DOMAIN) {
    return DEFAULT_ROLE_ID;
  }

  if (/^\d/.test(localPart)) {
    return STUDENT_ROLE_ID;
  }

  if (/^[a-z]/.test(localPart)) {
    return TEACHER_ROLE_ID;
  }

  return DEFAULT_ROLE_ID;
}

export function getInitialClaimsByEmail(email: string | null | undefined): { role: string; level: number } {
  if (isSuperAdminEmail(email)) {
    return { role: SUPERADMIN_ROLE, level: SUPERADMIN_LEVEL };
  }

  return { role: String(resolveInitialRoleIdByEmail(email)), level: DEFAULT_LEVEL };
}
