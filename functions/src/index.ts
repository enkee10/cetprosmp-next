
import { https, auth } from "firebase-functions";
import { initializeApp, getApps, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
let app: App;
if (!getApps().length) {
  app = initializeApp();
} else {
  app = getApps()[0];
}

const authAdmin = getAuth(app);
const firestore = getFirestore(app);

/**
 * Assigns a default 'visitante' role to any new user created in Firebase Auth.
 */
export const assignDefaultRole = auth.user().onCreate(async (user) => {
    const defaultRoleId = 'DqZRaaQwPMwS3uiHiYt6'; 
    const defaultLevel = 0;

    try {
        await authAdmin.setCustomUserClaims(user.uid, { role: defaultRoleId, level: defaultLevel });

        const userDocRef = firestore.collection('users').doc(user.uid);
        
        const displayName = user.displayName || 'Usuario Nuevo';
        const nameParts = displayName.split(' ');
        const nombre = nameParts[0] || '';
        const apellido_paterno = nameParts.slice(1).join(' ') || '';

        await userDocRef.set({
            uid: user.uid,
            email: user.email || '',
            username: displayName,
            nombre: nombre,
            apellido_paterno: apellido_paterno,
            apellido_materno: '',
            celular: '',
            permisoId: defaultRoleId,
            bloqueado: false,
            foto: user.photoURL || null,
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

        console.log(`Successfully assigned role '${defaultRoleId}' (level ${defaultLevel}) and created profile for user ${user.uid}`);

    } catch (error) {
        console.error(`Error assigning default role to user ${user.uid}:`, error);
    }
});


/**
 * Creates a new user in Auth and Firestore, with a specific role.
 * Reads the permission level from the 'scala' field in the 'permisos' collection.
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
        const permisoDoc = await firestore.collection('permisos').doc(permisoId).get();
        if (!permisoDoc.exists) {
            throw new https.HttpsError('not-found', `The permission ID '${permisoId}' does not exist.`);
        }
        // --- CORRECTED: Reading from 'scala' field as per user's confirmation ---
        const permissionLevel = permisoDoc.data()?.scala ?? 0; 

        const userRecord = await authAdmin.createUser({ email, password, displayName: username });

        await authAdmin.setCustomUserClaims(userRecord.uid, { role: permisoId, level: permissionLevel });

        await firestore.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            username,
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
 * Reads the permission level from the 'scala' field in the 'permisos' collection.
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
        const permisoDoc = await firestore.collection('permisos').doc(roleId).get();
        if (!permisoDoc.exists) {
            throw new https.HttpsError('not-found', `The permission ID '${roleId}' does not exist.`);
        }
        // --- CORRECTED: Reading from 'scala' field as per user's confirmation ---
        const newLevel = permisoDoc.data()?.scala ?? 0; 

        await authAdmin.setCustomUserClaims(uid, { role: roleId, level: newLevel });

        await firestore.collection('users').doc(uid).update({ permisoId: roleId });

        return { result: `Role updated for user ${uid}. New level: ${newLevel}.` };
    
    } catch (error: any) {
        console.error("Error in setUserRole:", error);
        throw new https.HttpsError('internal', 'An unexpected error occurred.');
    }
});
