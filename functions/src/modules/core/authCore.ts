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
export const DEFAULT_LEVEL = 0;
const SUPERADMIN_EMAIL = "enkee03@cetprosmp.edu.pe";
const SUPERADMIN_ROLE = "600";
const SUPERADMIN_LEVEL = 600;

export function getInitialClaimsByEmail(email: string | null | undefined): { role: string; level: number } {
  const normalized = (email || "").trim().toLowerCase();
  if (normalized === SUPERADMIN_EMAIL) {
    return { role: SUPERADMIN_ROLE, level: SUPERADMIN_LEVEL };
  }

  return { role: String(DEFAULT_ROLE_ID), level: DEFAULT_LEVEL };
}
