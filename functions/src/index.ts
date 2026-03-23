
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
const DEFAULT_ROLE_ID = 'DqZRaaQwPMwS3uiHiYt6'; // define el id del rol por defecto usado al registrar usuarios nuevos
const DEFAULT_LEVEL = 0; // define el nivel por defecto asignado a usuarios nuevos

/**
 * Asigna un rol por defecto y crea un perfil de usuario en Firestore
 * para cualquier nuevo usuario.
 */
export const assignDefaultRole = auth.user().onCreate(async (user) => {
    try {
        await authAdmin.setCustomUserClaims(user.uid, { role: DEFAULT_ROLE_ID, level: DEFAULT_LEVEL }); // asigna el rol y nivel base al usuario recien creado

        const userDocRef = dbFirestore.collection('users').doc(user.uid); // obtiene la referencia del perfil del usuario en Firestore
        
        const { nombre, apellido_paterno, apellido_materno } = separarNombreCompleto(user.displayName || null); // 
        const primerNombre = nombre.split(' ').filter(Boolean)[0] || ''; // 
        const username = [primerNombre, apellido_paterno].filter(Boolean).join(' '); // 

        await userDocRef.set({
            uid: user.uid,
            email: user.email || '',
            username, // 
            displayName: user.displayName || '',
            foto: user.photoURL || null, // <-- LA LÍNEA CRÍTICA, AHORA PRESENTE
            nombre,
            apellido_paterno,
            apellido_materno,
            celular: '',
            permisoId: DEFAULT_ROLE_ID, // guarda el permiso por defecto dentro del perfil del usuario
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
 * Registra un usuario publico con correo y contraseña.
 */
export const registerUser = https.onCall(async (data) => { // expone una callable publica para registrar usuarios desde el formulario web
    const { username, email, password } = data; // extrae los datos necesarios enviados por el formulario de registro
    if (!username || !email || !password) { // valida que el formulario haya enviado todos los campos obligatorios
        throw new https.HttpsError('invalid-argument', 'Completa nombre de usuario, correo y contrasena.'); // + informa en espanol que el formulario debe enviar todos los datos obligatorios
    }

    try {
        const userRecord = await authAdmin.createUser({ email, password, displayName: username }); // crea el usuario en Firebase Auth con el nombre visible definido por el formulario
        await authAdmin.setCustomUserClaims(userRecord.uid, { role: DEFAULT_ROLE_ID, level: DEFAULT_LEVEL }); // asigna inmediatamente el rol y nivel base al usuario recien registrado
        const { nombre, apellido_paterno, apellido_materno } = separarNombreCompleto(username); // separa el nombre visible para poblar los campos personalizados del perfil
        await dbFirestore.collection('users').doc(userRecord.uid).set({ // crea de inmediato el documento base del usuario para que la app lo encuentre al iniciar sesion
            uid: userRecord.uid, // guarda el identificador del usuario recien registrado
            email, // guarda el correo del usuario recien registrado
            username, // guarda el nombre de usuario visible definido en el formulario
            displayName: username, // conserva el nombre visible del usuario para la interfaz
            foto: null, // inicializa la foto del usuario sin imagen de perfil
            nombre, // guarda la parte nombre separada del displayName
            apellido_paterno, // guarda el apellido paterno separado del displayName
            apellido_materno, // guarda el apellido materno separado del displayName
            celular: '', // inicializa el celular del nuevo usuario vacio
            permisoId: DEFAULT_ROLE_ID, // guarda el permiso por defecto dentro del perfil del usuario
            bloqueado: false, // deja el usuario habilitado por defecto
            createdAt: FieldValue.serverTimestamp(), // registra la fecha de creacion del perfil en Firestore
            tipo_documento: 'DNI', // inicializa el tipo de documento por defecto del usuario
            dni: '', // inicializa el numero de documento vacio
            sexo: 'M', // inicializa el sexo con el valor por defecto existente en el sistema
            estado_civil: 'Soltero', // inicializa el estado civil con el valor por defecto existente en el sistema
            fecha_nacimiento: null, // inicializa la fecha de nacimiento sin valor
            instruccion: null, // inicializa el nivel de instruccion sin valor
            direccion: null, // inicializa la direccion sin valor
            distrito: null, // inicializa el distrito sin valor
        }); // cierra la creacion del documento base del usuario
        return { uid: userRecord.uid, email: userRecord.email }; // devuelve los datos minimos del usuario creado para confirmar el registro
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') { // detecta si el correo ya estaba registrado previamente
            throw new https.HttpsError('already-exists', 'Ese correo ya esta registrado.'); // + informa al formulario que el correo ya pertenece a otra cuenta
        }
        if (error.code === 'auth/invalid-email') { // + detecta cuando el correo enviado no cumple el formato admitido por Firebase Auth
            throw new https.HttpsError('invalid-argument', 'El correo electronico no es valido.'); // + informa al formulario que debe corregir el correo antes de registrar
        }
        if (error.code === 'auth/invalid-password') { // + detecta cuando la contrasena no cumple las reglas minimas aceptadas por Firebase Auth
            throw new https.HttpsError('invalid-argument', 'La contrasena debe tener al menos 6 caracteres.'); // + informa al formulario la validacion minima de la contrasena
        }
        if (error.code === 'auth/operation-not-allowed') { // + detecta cuando el proveedor email y contrasena no esta habilitado en el proyecto
            throw new https.HttpsError('failed-precondition', 'El acceso con correo y contrasena no esta habilitado en Firebase.'); // + informa al frontend que falta habilitar el proveedor correspondiente
        }
        if (error.code === 'auth/too-many-requests') { // + detecta bloqueos temporales del servicio por demasiados intentos seguidos
            throw new https.HttpsError('resource-exhausted', 'Demasiados intentos. Intenta nuevamente en unos minutos.'); // + informa al frontend que debe esperar antes de volver a intentar
        }
        console.error("Error in registerUser:", error); // registra el error del backend para diagnostico
        throw new https.HttpsError('internal', 'Ocurrio un error inesperado mientras se registraba el usuario.'); // + devuelve un error generico solo cuando el backend falla por una causa no contemplada
    }
}); // cierra la callable publica de registro


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
            foto: null, // <-- CORREGIDO: Establecer explícitamente a null
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
