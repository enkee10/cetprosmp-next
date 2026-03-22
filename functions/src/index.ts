
import { https, auth, firestore } from "firebase-functions";
import { initializeApp, getApps, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Separa un nombre completo en nombre, apellido paterno y materno.
 */
function separarNombreCompleto(displayName: string | null) {
    const texto = (displayName || '').trim().replace(/\s+/g, ' ');
    if (!texto) {
        return { nombre: '', apellido_paterno: '', apellido_materno: '' };
    }

    const partes = texto.split(' ');
    if (partes.length >= 3) {
        return {
            nombre: partes.slice(0, -2).join(' '),
            apellido_paterno: partes[partes.length - 2],
            apellido_materno: partes[partes.length - 1],
        };
    }
    if (partes.length === 2) {
        return { nombre: partes[0], apellido_paterno: partes[1], apellido_materno: '' };
    }
    return { nombre: partes[0], apellido_paterno: '', apellido_materno: '' };
}

// Initialize Firebase Admin SDK
let app: App;
if (!getApps().length) {
  app = initializeApp();
} else {
  app = getApps()[0];
}

const authAdmin = getAuth(app);
const dbFirestore = getFirestore(app);

/**
 * Asigna un rol por defecto y crea un perfil de usuario en Firestore
 * para cualquier nuevo usuario.
 */
export const assignDefaultRole = auth.user().onCreate(async (user) => {
    const defaultRoleId = 'DqZRaaQwPMwS3uiHiYt6'; 
    const defaultLevel = 0;

    try {
        await authAdmin.setCustomUserClaims(user.uid, { role: defaultRoleId, level: defaultLevel });

        const userDocRef = dbFirestore.collection('users').doc(user.uid);
        
        const { nombre, apellido_paterno, apellido_materno } = separarNombreCompleto(user.displayName || null);

        await userDocRef.set({
            uid: user.uid,
            email: user.email || '',
            username: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || null, // <-- LA LÍNEA CRÍTICA, AHORA PRESENTE
            nombre,
            apellido_paterno,
            apellido_materno,
            celular: '',
            permisoId: defaultRoleId,
            bloqueado: false,
            createdAt: FieldValue.serverTimestamp(),
            tipo_documento: 'DNI',
            dni: '',
            sexo: 'M',
            estado_civil: 'Soltero',
            fecha_nacimiento: null,
            instruccion: null,
            direccion: null,
            distrito: null,
        });

        console.log(`Successfully assigned role and created profile for user ${user.uid}`);

    } catch (error) {
        console.error(`Error assigning default role to user ${user.uid}:`, error);
    }
});


/**
 * Crea un nuevo usuario en Auth y Firestore, con un rol específico.
 */
export const createNewUser = https.onCall(async (data, context) => {
    const requesterLevel = context.auth?.token?.level ?? 0;
    if (requesterLevel < 600) {
        throw new https.HttpsError('permission-denied', 'You do not have permission to create new users.');
    }

    const { email, password, username, permisoId, ...otherData } = data;
    if (!email || !password || !username || !permisoId) {
        throw new https.HttpsError('invalid-argument', 'Email, password, username, and permisoId are required.');
    }

    try {
        const permisoDoc = await dbFirestore.collection('permisos').doc(permisoId).get();
        if (!permisoDoc.exists) {
            throw new https.HttpsError('not-found', `The permission ID '${permisoId}' does not exist.`);
        }
        const permissionLevel = permisoDoc.data()?.scala ?? 0; 

        const userRecord = await authAdmin.createUser({ email, password, displayName: username });

        await authAdmin.setCustomUserClaims(userRecord.uid, { role: permisoId, level: permissionLevel });

        const { nombre, apellido_paterno, apellido_materno } = separarNombreCompleto(username);

        await dbFirestore.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            username,
            displayName: username,
            photoURL: null, // <-- CORREGIDO: Establecer explícitamente a null
            nombre,
            apellido_paterno,
            apellido_materno,
            permisoId,
            bloqueado: false,
            createdAt: FieldValue.serverTimestamp(),
            ...otherData
        });

        return { result: `Successfully created user ${userRecord.uid} with role ${permisoId}.` };

    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            throw new https.HttpsError('already-exists', 'A user with this email address already exists.');
        }
        console.error("Error in createNewUser:", error);
        throw new https.HttpsError('internal', 'An unexpected error occurred.');
    }
});

/**
 * Updates a user's role and their corresponding permission level claim.
 */
export const setUserRole = https.onCall(async (data, context) => {
    const requesterLevel = context.auth?.token?.level ?? 0;
    if (requesterLevel < 600) {
        throw new https.HttpsError('permission-denied', 'You do not have permission to change roles.');
    }

    const { uid, roleId } = data;
    if (!uid || !roleId) {
        throw new https.HttpsError('invalid-argument', 'User ID and Role ID are required.');
    }

    try {
        const permisoDoc = await dbFirestore.collection('permisos').doc(roleId).get();
        if (!permisoDoc.exists) {
            throw new https.HttpsError('not-found', `The permission ID '${roleId}' does not exist.`);
        }
        const newLevel = permisoDoc.data()?.scala ?? 0; 

        await authAdmin.setCustomUserClaims(uid, { role: roleId, level: newLevel });

        await dbFirestore.collection('users').doc(uid).update({ permisoId: roleId });

        return { result: `Role updated for user ${uid}. New level: ${newLevel}.` };
    
    } catch (error: any) {
        console.error("Error in setUserRole:", error);
        throw new https.HttpsError('internal', 'An unexpected error occurred.');
    }
});

/**
 * Deletes the corresponding Firebase Authentication user when a user document is deleted from Firestore.
 */
export const deleteAuthUser = firestore.document('users/{userId}').onDelete(async (snap, context) => {
    const { userId } = context.params;
    console.log(`Firestore user document ${userId} deleted. Triggering Auth user deletion.`);

    try {
        await authAdmin.deleteUser(userId);
        console.log(`Successfully deleted Firebase Auth user: ${userId}`);
    } catch (error) {
        console.error(`Error deleting Firebase Auth user ${userId}:`, error);
    }
});
