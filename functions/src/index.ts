import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { https, auth } from "firebase-functions";

// Initialize Firebase Admin SDK
initializeApp();

/**
 * Fallback role assignment on user creation. This is good practice.
 */
export const assignDefaultRole = auth.user().onCreate(async (user) => {
    // ... (This function remains as a fallback)
});

/**
 * Creates a new user in Auth and Firestore, with the correct role.
 * Called from the admin panel.
 */
export const createNewUser = https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.level || context.auth.token.level < 600) {
        throw new https.HttpsError('permission-denied', 'You must be a superuser.');
    }

    const { email, password, username, nombre, apellidos, celular, tipo_documento, dni, sexo, estado_civil, permisoId } = data;

    if (!email || !password || !username || !permisoId) {
        throw new https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    const authAdmin = getAuth();
    const firestore = getFirestore();

    try {
        // 1. Create the user in Firebase Authentication
        const userRecord = await authAdmin.createUser({
            email: email,
            password: password,
            displayName: username,
        });

        // 2. Set the selected role from the form
        const roleDoc = await firestore.collection('permisos').doc(permisoId).get();
        if (roleDoc.exists) {
            const roleLevel = roleDoc.data()?.scala;
            if (typeof roleLevel === 'number') {
                await authAdmin.setCustomUserClaims(userRecord.uid, { role: permisoId, level: roleLevel });
            }
        } else {
             // If role is invalid, a default role will have been assigned by assignDefaultRole
             console.warn(`Invalid permisoId "${permisoId}" provided. Default role may be assigned.`);
        }

        // 3. Create the complete user profile in Firestore
        const userData = {
            username, email, nombre, apellidos, celular, 
            tipo_documento, dni, sexo, estado_civil, permisoId,
            uid: userRecord.uid, // Store the UID for reference
        };
        await firestore.collection('users').doc(userRecord.uid).set(userData);

        return { uid: userRecord.uid, message: "User created successfully" };

    } catch (error: any) {
        console.error("Error in createNewUser:", error);
        if (error.code === 'auth/email-already-exists') {
            throw new https.HttpsError('already-exists', 'A user with this email already exists.');
        }
        throw new https.HttpsError('internal', 'An internal error occurred.');
    }
});


/**
 * Sets a user's role. Can only be called by an admin.
 */
export const setUserRole = https.onCall(async (data, context) => {
   // ... (This function remains the same)
});
