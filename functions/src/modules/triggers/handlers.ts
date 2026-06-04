import { auth } from "firebase-functions/v1";
import { buildUserDataFromInput, separarNombreCompleto } from "../core/userMappers.js";
import { authAdmin, DEFAULT_LEVEL, DEFAULT_ROLE_ID, STUDENT_ROLE_ID, getInitialClaimsByEmail } from "../core/authCore.js";
import {
  findDataConnectUserIdByDocumentId,
  deleteDataConnectUserByDocumentId,
  getRoleById,
  insertDataConnectUserByDocumentId,
  waitForDataConnectUserIdByDocumentId,
} from "../core/dataConnectCore.js";

export const assignDefaultRole = auth.user().onCreate(async (user) => {
  try {
    const normalizedEmail = String(user.email || "").trim().toLowerCase();
    const [emailLocalPart, emailDomain] = normalizedEmail.split("@");
    const isInstitutionalEmail = emailDomain === "cetprosmp.edu.pe";
    const nowIso = new Date().toISOString();
    const initialClaims = getInitialClaimsByEmail(user.email);
    const initialRoleId = Number(initialClaims.role);
    const initialRole = Number.isFinite(initialRoleId) && initialRoleId > 0
      ? await getRoleById(initialRoleId).catch((error: unknown) => {
        console.warn(`No se pudo resolver el rol inicial ${initialRoleId} para ${user.uid}.`, error);
        return null;
      })
      : null;
    const profileRoleId = initialRole ? initialRoleId : DEFAULT_ROLE_ID;
    const dniFromInstitutionalEmail =
      profileRoleId === STUDENT_ROLE_ID && /^\d{8}$/.test(emailLocalPart || "")
        ? emailLocalPart
        : null;
    const claims = {
      ...initialClaims,
      level: initialRole?.scala ?? initialClaims.level ?? DEFAULT_LEVEL,
    };
    await authAdmin.setCustomUserClaims(user.uid, claims);

    // Evita duplicados cuando el usuario fue creado desde createNewUser
    // y su perfil ya se insertó por el flujo principal.
    const existingUserId = await waitForDataConnectUserIdByDocumentId(user.uid, 25, 200);
    if (existingUserId) {
      console.log(`Auth trigger skipped profile bootstrap for user ${user.uid}; profile already exists (${existingUserId}).`);
      return;
    }

    const { nombre, apellido_paterno, apellido_materno } = separarNombreCompleto(user.displayName || null);
    const primerNombre = nombre.split(" ").filter(Boolean)[0] || "";
    const username = [primerNombre, apellido_paterno].filter(Boolean).join(" ");

    const profileData = buildUserDataFromInput(
      {
        nombre,
        apellido_paterno,
        apellido_materno,
        username,
        email: user.email || "",
        foto: user.photoURL || null,
        celular: null,
        bloqueado: false,
        tipo_documento: "DNI",
        dni: dniFromInstitutionalEmail,
        sexo: "M",
        estado_civil: "Soltero",
        fecha_nacimiento: null,
        instruccion: null,
        direccion: null,
        distrito: null,
        correo_institucional: isInstitutionalEmail ? normalizedEmail : null,
        fecha_creacion: nowIso,
        fecha_modificacion: nowIso,
        email_creador: normalizedEmail || user.email || null,
        rolId: profileRoleId,
      },
      {
        documentId: user.uid,
        email: user.email || "",
        username,
        displayName: user.displayName || username,
        photoURL: user.photoURL || null,
        provider: user.providerData?.[0]?.providerId ?? null,
        rolId: profileRoleId,
      },
    );

    const checkAgainId = await findDataConnectUserIdByDocumentId(user.uid);
    if (checkAgainId) {
      console.log(`Auth trigger skipped late profile bootstrap for user ${user.uid}; profile detected (${checkAgainId}).`);
      return;
    }

    const insertedId = await insertDataConnectUserByDocumentId(user.uid, profileData);
    if (insertedId) {
      console.log(`Successfully assigned role and created profile for user ${user.uid}`);
    } else {
      console.log(`Auth trigger skipped profile bootstrap for user ${user.uid}; profile already existed.`);
    }
  } catch (error) {
    console.error(`Error assigning default role to user ${user.uid}:`, error);
  }
});

export const syncDataConnectUserOnAuthDelete = auth.user().onDelete(async (user) => {
  try {
    const deletedCount = await deleteDataConnectUserByDocumentId(user.uid);
    console.log(`Auth user ${user.uid} deleted. Data Connect rows removed: ${deletedCount}.`);
  } catch (error) {
    console.error(`Error syncing Auth delete for user ${user.uid}:`, error);
  }
});
