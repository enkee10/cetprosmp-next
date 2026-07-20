'use client'; // marca el contexto de autenticacion para que Next lo trate siempre como componente cliente

import { createContext, useContext, useEffect, useState } from 'react'; // importa las utilidades base de React para el contexto de autenticacion
import { GoogleAuthProvider, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth'; // + importa tambien la utilidad para enviar correos de restablecimiento de contrasena
import { auth, functions } from '@/lib/firebase'; // importa servicios cliente de Firebase ya configurados
import { canAccessIntranet } from '@/lib/intranetPermissions'; // centraliza la regla de acceso a intranet por rol/nivel
import { httpsCallable } from 'firebase/functions'; // importa las utilidades para llamar la function de registro publico
import { Box, CircularProgress } from '@mui/material'; // importa los componentes visuales del estado de carga global
import { usePathname, useRouter } from 'next/navigation'; // importa la navegacion del App Router para redirigir tras autenticar

interface UserData { // define la forma de los datos del usuario expuestos al resto de la app
    uid: string; // guarda el identificador unico del usuario autenticado
    email: string | null; // guarda el correo electronico del usuario autenticado
    displayName: string | null; // guarda el nombre visible del usuario autenticado
    photoURL: string | null; // guarda la foto de perfil del usuario autenticado
    role: string | null; // guarda el rol personalizado del usuario autenticado
    roleTitle?: string | null; // guarda el nombre legible del rol/cargo del usuario autenticado
    cargo?: string | null; // mantiene un alias semantico para mostrar el cargo en la interfaz
    level: number; // guarda el nivel numerico del usuario autenticado
    [key: string]: any; // permite exponer campos adicionales almacenados en Firestore
} // cierra la interfaz de datos del usuario

interface AuthContextType { // define todos los metodos y estados expuestos por el contexto
    user: UserData | null; // expone el usuario autenticado o null si no hay sesion
    loading: boolean; // expone si el contexto esta resolviendo una accion de autenticacion
    login: () => Promise<void>; // mantiene el metodo de login legado usando Google
    loginWithGoogle: () => Promise<void>; // expone el inicio de sesion con Google para el modal login
    loginWithEmail: (identifier: string, password: string) => Promise<void>; // expone el inicio de sesion con usuario/correo y contrasena
    registerWithEmail: (username: string, email: string, password: string) => Promise<void>; // expone el registro publico con login automatico
    resetPassword: (identifier: string) => Promise<void>; // + expone el envio del correo de restablecimiento de contrasena
    logout: () => Promise<void>; // expone el cierre de sesion del usuario actual
} // cierra la interfaz del contexto de autenticacion

const AuthContext = createContext<AuthContextType | undefined>(undefined); // crea el contexto base que compartira el estado de autenticacion
const INTRANET_REDIRECT_KEY = 'cetprosmp.auth.intranetRedirectedForUid';

const isExpectedAuthError = (error: unknown) => { // + detecta si el error pertenece a un flujo esperado de validacion de Firebase Auth
    const code = (error as { code?: string } | null)?.code || ''; // + intenta extraer el codigo del error lanzado por Firebase o por el flujo controlado
    return code.startsWith('auth/') || code.startsWith('functions/'); // + considera esperados los errores conocidos de autenticacion y functions
}; // + cierra el detector de errores esperados para evitar ruido en desarrollo

const cleanUrl = (value: unknown): string | null => {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || null;
};

const resolveProfilePhotoURL = (profile: unknown, fallback: string | null): string | null => {
    const data = profile as {
        avatarPequeno?: unknown;
        avatar?: unknown;
        recorteFotografia?: unknown;
        recorte_fotografia?: unknown;
    } | null;
    return (
        cleanUrl(data?.avatarPequeno)
        ?? cleanUrl(data?.avatar)
        ?? cleanUrl(data?.recorteFotografia ?? data?.recorte_fotografia)
        ?? cleanUrl(fallback)
    );
};

const cleanText = (value: unknown): string | null => {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || null;
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<T>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} no respondio a tiempo.`)), timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

const resolveProfileRoleTitle = (profile: unknown): string | null => {
    const data = profile as {
        rolTitulo?: unknown;
        roleTitle?: unknown;
        cargo?: unknown;
        rol?: { titulo?: unknown } | null;
    } | null;
    return (
        cleanText(data?.cargo)
        ?? cleanText(data?.roleTitle)
        ?? cleanText(data?.rolTitulo)
        ?? cleanText(data?.rol?.titulo)
    );
};

const resolveEmailForPasswordLogin = async (identifier: string): Promise<string> => {
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) return normalizedIdentifier;

    const resolveLoginEmail = httpsCallable<{ identifier: string }, { email?: string | null }>(functions, 'resolveLoginEmail');
    const result = await resolveLoginEmail({ identifier: normalizedIdentifier });
    return result.data.email?.trim() || normalizedIdentifier;
};

const createIntranetAccessDeniedError = () => {
    const accessError = new Error('Tu cuenta no tiene acceso a Intranet.') as Error & { code: string };
    accessError.code = 'auth/intranet-access-denied';
    return accessError;
};

const loadUserDataFromFirebaseUser = async (firebaseUser: FirebaseUser): Promise<UserData> => {
    try {
        const refreshMyClaims = httpsCallable(functions, 'refreshMyClaims', { timeout: 10000 });
        await withTimeout(refreshMyClaims(), 12000, 'refreshMyClaims');
    } catch (error) {
        if (!isExpectedAuthError(error)) {
            console.error('Error refreshing auth claims:', error);
        }
    }

    let profile: Record<string, unknown> | null = null;
    try {
        const getMyProfile = httpsCallable<undefined, { profile?: Record<string, unknown> | null }>(
            functions,
            'getMyProfile',
            { timeout: 10000 },
        );
        const profileResult = await withTimeout(getMyProfile(), 12000, 'getMyProfile');
        profile = profileResult.data.profile ?? null;
    } catch (error) {
        if (!isExpectedAuthError(error)) {
            console.error('Error loading auth profile:', error);
        }
    }

    const token = await withTimeout(firebaseUser.getIdTokenResult(true), 12000, 'getIdTokenResult');
    const claims = token.claims;
    const roleTitle = resolveProfileRoleTitle(profile);
    return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: resolveProfilePhotoURL(profile, firebaseUser.photoURL),
        role: (claims.role as string) || null,
        roleTitle,
        cargo: roleTitle,
        level: (claims.level as number) || 0,
    };
};

export function AuthProvider({ children }: { children: React.ReactNode }) { // define el proveedor principal de autenticacion para toda la app
    const [user, setUser] = useState<UserData | null>(null); // guarda el usuario autenticado disponible para la interfaz
    const [loading, setLoading] = useState(true); // guarda si el contexto esta resolviendo auth o cargando perfil
    const [authReady, setAuthReady] = useState(false); // + guarda si la verificacion inicial de Firebase Auth ya termino para no desmontar la interfaz en cada accion
    const router = useRouter(); // obtiene el router para redirigir tras login, registro o logout
    const pathname = usePathname(); // obtiene la ruta actual para decidir redirecciones de autenticacion sin secuestrar la navegacion publica

    useEffect(() => { // sincroniza el contexto con el estado real de Firebase Auth
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => { // escucha cambios de sesion del usuario autenticado
            setLoading(true); // activa el estado de carga mientras se resuelve el nuevo estado de sesion
            if (firebaseUser) { // verifica si existe un usuario autenticado en Firebase
                try {
                    const userData = await loadUserDataFromFirebaseUser(firebaseUser); // construye el usuario con Auth, perfil y claims actualizados
                    if (!canAccessIntranet(userData.role, userData.level, userData.roleTitle)) {
                        await signOut(auth);
                        setUser(null);
                    } else {
                        setUser(userData); // guarda el usuario para el resto de la app
                    }
                } catch (error) {
                    if (!isExpectedAuthError(error)) {
                        console.error('Error loading auth user:', error);
                    }
                    setUser(null);
                }
            } else { // maneja el caso en que no exista un usuario autenticado
                setUser(null); // limpia el usuario del contexto al cerrar sesion
            }
            setLoading(false); // desactiva el estado de carga cuando termina la sincronizacion
            setAuthReady(true); // + marca que la sincronizacion inicial ya termino y la interfaz puede quedarse montada
        });

        return () => unsubscribe(); // libera el listener de auth al desmontar el proveedor
    }, []); // ejecuta la sincronizacion inicial una sola vez

    useEffect(() => { // redirige una sola vez a intranet cuando ya existe una sesion valida con acceso
        if (!authReady || loading || !user) return;
        if (!canAccessIntranet(user.role, user.level, user.roleTitle)) return;
        if (pathname?.startsWith('/intranet')) {
            window.sessionStorage.setItem(INTRANET_REDIRECT_KEY, user.uid);
            return;
        }
        if (pathname?.startsWith('/sso')) return;
        if (pathname?.startsWith('/matricula')) return;

        const redirectedForUid = window.sessionStorage.getItem(INTRANET_REDIRECT_KEY);
        if (redirectedForUid === user.uid) return;

        window.sessionStorage.setItem(INTRANET_REDIRECT_KEY, user.uid);
        router.replace('/intranet');
    }, [authReady, loading, pathname, router, user]);

    const loginWithGoogle = async () => { // define el flujo explicito de autenticacion con Google
        setLoading(true); // activa el estado de carga mientras se abre el popup de Google
        const provider = new GoogleAuthProvider(); // prepara el proveedor de autenticacion de Google
        try {
            const credential = await signInWithPopup(auth, provider); // inicia el popup de Google para autenticar al usuario
            const userData = await loadUserDataFromFirebaseUser(credential.user);
            if (!canAccessIntranet(userData.role, userData.level, userData.roleTitle)) {
                await signOut(auth);
                setUser(null);
                throw createIntranetAccessDeniedError();
            }
            setUser(userData);
            router.replace('/intranet'); // redirige al usuario autenticado hacia la intranet
        } catch (error) {
            if (!isExpectedAuthError(error)) { // + evita registrar en consola los errores esperados de autenticacion controlados por la interfaz
                console.error('Error during Google sign-in:', error); // + registra solo errores inesperados del login con Google para diagnostico real
            }
            setUser(null); // limpia el usuario local si el acceso falla
            throw error; // reenvia el error para que la interfaz del modal pueda mostrarlo
        } finally {
            setLoading(false); // desactiva el estado de carga al terminar el intento de login con Google
        }
    }; // cierra el flujo de login con Google

    const loginWithEmail = async (identifier: string, password: string) => { // define el flujo de autenticacion por usuario/correo y contrasena
        setLoading(true); // activa el estado de carga mientras se valida el acceso por correo
        try {
            const resolvedEmail = await resolveEmailForPasswordLogin(identifier); // traduce DNI/usuario/correo al correo principal de Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, resolvedEmail, password); // autentica al usuario con las credenciales ingresadas
            await userCredential.user.reload(); // recarga el estado del usuario para obtener el valor actualizado de emailVerified
            if (!auth.currentUser?.emailVerified) { // bloquea el acceso si el correo aun no fue verificado
                const verificationError = new Error('Debes verificar tu correo antes de iniciar sesion.') as Error & { code: string }; // crea un error controlado para informar que falta verificar el correo
                verificationError.code = 'auth/email-not-verified'; // asigna un codigo propio para manejar este caso desde la interfaz
                await signOut(auth); // cierra la sesion parcial para mantener protegido el acceso por correo
                setUser(null); // limpia el usuario local cuando el correo no esta verificado
                throw verificationError; // devuelve el error controlado para mostrar el mensaje adecuado en el modal
            }
            const userData = await loadUserDataFromFirebaseUser(userCredential.user);
            if (!canAccessIntranet(userData.role, userData.level, userData.roleTitle)) {
                await signOut(auth);
                setUser(null);
                throw createIntranetAccessDeniedError();
            }
            setUser(userData);
            router.replace('/intranet'); // redirige al usuario autenticado hacia la intranet
        } catch (error) {
            if (!isExpectedAuthError(error)) { // + evita registrar en consola los errores esperados de autenticacion controlados por la interfaz
                console.error('Error during email sign-in:', error); // + registra solo errores inesperados del login por correo para diagnostico real
            }
            setUser(null); // limpia el usuario local si el acceso falla
            throw error; // reenvia el error para que la interfaz del modal pueda mostrarlo
        } finally {
            setLoading(false); // desactiva el estado de carga al terminar el intento de login por correo
        }
    }; // cierra el flujo de login por correo

    const registerWithEmail = async (username: string, email: string, password: string) => { // define el flujo de registro publico con login automatico
        setLoading(true); // activa el estado de carga mientras se registra el nuevo usuario
        try {
            const registerUser = httpsCallable(functions, 'registerUser'); // prepara la callable que crea usuarios en Firebase Auth
            await registerUser({ username, email, password }); // solicita al backend crear el usuario con el nombre visible definido en el formulario
            const userCredential = await signInWithEmailAndPassword(auth, email, password); // inicia sesion temporalmente con la cuenta recien creada para poder enviar la verificacion
            const verificationRedirectUrl = new URL(window.location.origin); // + construye la URL base del sitio para volver despues de verificar el correo
            verificationRedirectUrl.searchParams.set('emailVerified', '1'); // + marca en la URL que el usuario viene de completar la verificacion de correo
            verificationRedirectUrl.searchParams.set('email', email); // + agrega el correo a la URL para precargarlo luego en el formulario login
            await sendEmailVerification(userCredential.user, { url: verificationRedirectUrl.toString(), handleCodeInApp: false }); // + envia el correo de verificacion para volver al inicio del sitio despues de pulsar Continue
            await signOut(auth); // cierra la sesion temporal hasta que el usuario confirme su correo
            setUser(null); // limpia el usuario local tras enviar el correo de verificacion
        } catch (error) {
            if (!isExpectedAuthError(error)) { // + evita registrar en consola los errores esperados de autenticacion controlados por la interfaz
                console.error('Error during register sign-in:', error); // + registra solo errores inesperados del registro para diagnostico real
            }
            setUser(null); // limpia el usuario local si el registro falla
            throw error; // reenvia el error para que la interfaz del modal pueda mostrarlo
        } finally {
            setLoading(false); // desactiva el estado de carga al terminar el intento de registro
        }
    }; // cierra el flujo de registro publico

    const resetPassword = async (identifier: string) => { // + define el flujo que envia el correo de restablecimiento de contrasena
        const resolvedEmail = await resolveEmailForPasswordLogin(identifier); // + traduce usuario/DNI/correo al correo real de Firebase Auth
        await sendPasswordResetEmail(auth, resolvedEmail); // + solicita a Firebase enviar el correo de recuperacion al email indicado
    }; // + cierra el flujo de restablecimiento de contrasena

    const login = async () => loginWithGoogle(); // mantiene la API anterior reutilizando el login con Google

    const logout = async () => { // define el flujo de cierre de sesion del usuario actual
        await signOut(auth); // cierra la sesion activa en Firebase Auth
        window.sessionStorage.removeItem(INTRANET_REDIRECT_KEY); // permite redirigir de nuevo cuando se inicie una sesion nueva
        setUser(null); // limpia el usuario local inmediatamente tras cerrar sesion
        router.push('/'); // redirige al usuario al inicio tras cerrar sesion
    }; // cierra el flujo de logout

    const contextValue = { user, loading, login, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, logout };
    const bypassInitialAuthGate = pathname?.startsWith('/sso') || pathname?.startsWith('/matricula');

    if (!authReady && !bypassInitialAuthGate) { // + muestra una pantalla de carga solo durante la sincronizacion inicial de autenticacion
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}> {/* + centra el indicador de carga en toda la pantalla */} 
                <CircularProgress /> {/* + muestra el spinner mientras la autenticacion esta cargando */} 
            </Box>
        );
    }

    return (
        <AuthContext.Provider value={contextValue}> {/* + expone tambien el metodo de restablecer contrasena a toda la aplicacion */} 
            {children}
        </AuthContext.Provider>
    );
} // cierra el proveedor principal de autenticacion

export const useAuth = () => { // define el hook que permite consumir el contexto de autenticacion
    const context = useContext(AuthContext); // obtiene el valor actual del contexto compartido
    if (context === undefined) { // valida que el hook se use dentro del proveedor AuthProvider
        throw new Error('useAuth must be used within an AuthProvider'); // informa un error claro si el hook se usa fuera del proveedor
    }
    return context; // devuelve el contexto tipado al componente consumidor
}; // cierra el hook useAuth
