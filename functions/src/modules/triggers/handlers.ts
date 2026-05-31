import { auth } from "firebase-functions/v1";
import { buildUserDataFromInput, separarNombreCompleto } from "../core/userMappers.js";
import { authAdmin, DEFAULT_ROLE_ID, getInitialClaimsByEmail } from "../core/authCore.js";
import { deleteDataConnectUserByDocumentId, upsertDataConnectUserByDocumentId } from "../core/dataConnectCore.js";

export const assignDefaultRole = auth.user().onCreate(async (user) => {
  try {
    const claims = getInitialClaimsByEmail(user.email);
    await authAdmin.setCustomUserClaims(user.uid, claims);

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
        celular: "",
        bloqueado: false,
        tipo_documento: "DNI",
        dni: "",
        sexo: "M",
        estado_civil: "Soltero",
        fecha_nacimiento: null,
        instruccion: null,
        direccion: null,
        distrito: null,
        rolId: DEFAULT_ROLE_ID,
      },
      {
        documentId: user.uid,
        email: user.email || "",
        username,
        displayName: user.displayName || username,
        photoURL: user.photoURL || null,
        provider: user.providerData?.[0]?.providerId ?? null,
        rolId: DEFAULT_ROLE_ID,
      },
    );

    await upsertDataConnectUserByDocumentId(user.uid, profileData);
    console.log(`Successfully assigned role and created profile for user ${user.uid}`);
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
