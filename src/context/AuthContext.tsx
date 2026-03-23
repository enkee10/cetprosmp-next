'use client'; // marca el contexto de autenticacion para que Next lo trate siempre como componente cliente

import { createContext, useContext, useEffect, useState } from 'react'; // importa las utilidades base de React para el contexto de autenticacion
import { GoogleAuthProvider, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth'; // + importa tambien la utilidad para enviar correos de restablecimiento de contrasena
import { app, auth, db } from '@/lib/firebase'; // importa la app web y los servicios cliente necesarios para auth y Firestore
import { doc, getDoc } from 'firebase/firestore'; // importa las utilidades para leer el perfil del usuario en Firestore
import { getFunctions, httpsCallable } from 'firebase/functions'; // importa las utilidades para llamar la function de registro publico
import { Box, CircularProgress } from '@mui/material'; // importa los componentes visuales del estado de carga global
import { useRouter } from 'next/navigation'; // importa la navegacion del App Router para redirigir tras autenticar

interface UserData { // define la forma de los datos del usuario expuestos al resto de la app
    uid: string; // guarda el identificador unico del usuario autenticado
    email: string | null; // guarda el correo electronico del usuario autenticado
    displayName: string | null; // guarda el nombre visible del usuario autenticado
    photoURL: string | null; // guarda la foto de perfil del usuario autenticado
    role: string | null; // guarda el rol personalizado del usuario autenticado
    level: number; // guarda el nivel numerico del usuario autenticado
    [key: string]: any; // permite exponer campos adicionales almacenados en Firestore
} // cierra la interfaz de datos del usuario

interface AuthContextType { // define todos los metodos y estados expuestos por el contexto
    user: UserData | null; // expone el usuario autenticado o null si no hay sesion
    loading: boolean; // expone si el contexto esta resolviendo una accion de autenticacion
    login: () => Promise<void>; // mantiene el metodo de login legado usando Google
    loginWithGoogle: () => Promise<void>; // expone el inicio de sesion con Google para el modal login
    loginWithEmail: (email: string, password: string) => Promise<void>; // expone el inicio de sesion con correo y contrasena
    registerWithEmail: (username: string, email: string, password: string) => Promise<void>; // expone el registro publico con login automatico
    resetPassword: (email: string) => Promise<void>; // + expone el envio del correo de restablecimiento de contrasena
    logout: () => Promise<void>; // expone el cierre de sesion del usuario actual
} // cierra la interfaz del contexto de autenticacion

const AuthContext = createContext<AuthContextType | undefined>(undefined); // crea el contexto base que compartira el estado de autenticacion

const isExpectedAuthError = (error: unknown) => { // + detecta si el error pertenece a un flujo esperado de validacion de Firebase Auth
    const code = (error as { code?: string } | null)?.code || ''; // + intenta extraer el codigo del error lanzado por Firebase o por el flujo controlado
    return code.startsWith('auth/') || code.startsWith('functions/'); // + considera esperados los errores conocidos de autenticacion y functions
}; // + cierra el detector de errores esperados para evitar ruido en desarrollo

export function AuthProvider({ children }: { children: React.ReactNode }) { // define el proveedor principal de autenticacion para toda la app
    const [user, setUser] = useState<UserData | null>(null); // guarda el usuario autenticado disponible para la interfaz
    const [loading, setLoading] = useState(true); // guarda si el contexto esta resolviendo auth o cargando perfil
    const [authReady, setAuthReady] = useState(false); // + guarda si la verificacion inicial de Firebase Auth ya termino para no desmontar la interfaz en cada accion
    const router = useRouter(); // obtiene el router para redirigir tras login, registro o logout

    useEffect(() => { // sincroniza el contexto con el estado real de Firebase Auth
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => { // escucha cambios de sesion del usuario autenticado
            setLoading(true); // activa el estado de carga mientras se resuelve el nuevo estado de sesion
            if (firebaseUser) { // verifica si existe un usuario autenticado en Firebase
                const userDocRef = doc(db, 'users', firebaseUser.uid); // construye la referencia al perfil del usuario en Firestore
                const userDocSnap = await getDoc(userDocRef); // lee el perfil del usuario almacenado en Firestore

                if (userDocSnap.exists()) { // valida que exista un perfil asociado al usuario autenticado
                    const firestoreData = userDocSnap.data(); // obtiene los datos personalizados guardados en Firestore
                    const token = await firebaseUser.getIdTokenResult(); // obtiene el token actual para leer claims personalizados
                    const claims = token.claims; // extrae los claims del token para rol y nivel
                    const userData: UserData = { // fusiona datos de Firestore, Auth y claims en un solo objeto de usuario
                        ...firestoreData, // conserva los campos personalizados del documento Firestore
                        uid: firebaseUser.uid, // asegura que el uid venga siempre de Firebase Auth
                        email: firebaseUser.email, // asegura que el correo venga siempre de Firebase Auth
                        displayName: firebaseUser.displayName, // asegura que el nombre visible venga siempre de Firebase Auth
                        photoURL: firebaseUser.photoURL, // asegura que la foto visible venga siempre de Firebase Auth
                        role: (claims.role as string) || null, // expone el rol personalizado del usuario autenticado
                        level: (claims.level as number) || 0, // expone el nivel numerico personalizado del usuario autenticado
                    };
                    setUser(userData); // guarda el usuario fusionado para el resto de la app
                } else { // maneja el caso en que no exista perfil Firestore para el usuario autenticado
                    setUser(null); // limpia el usuario si el perfil aun no existe o es inconsistente
                }
            } else { // maneja el caso en que no exista un usuario autenticado
                setUser(null); // limpia el usuario del contexto al cerrar sesion
            }
            setLoading(false); // desactiva el estado de carga cuando termina la sincronizacion
            setAuthReady(true); // + marca que la sincronizacion inicial ya termino y la interfaz puede quedarse montada
        });

        return () => unsubscribe(); // libera el listener de auth al desmontar el proveedor
    }, []); // ejecuta la sincronizacion inicial una sola vez

    const loginWithGoogle = async () => { // define el flujo explicito de autenticacion con Google
        setLoading(true); // activa el estado de carga mientras se abre el popup de Google
        const provider = new GoogleAuthProvider(); // prepara el proveedor de autenticacion de Google
        try {
            await signInWithPopup(auth, provider); // inicia el popup de Google para autenticar al usuario
            router.push('/intranet'); // redirige al usuario autenticado hacia la intranet
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

    const loginWithEmail = async (email: string, password: string) => { // define el flujo de autenticacion por correo y contrasena
        setLoading(true); // activa el estado de carga mientras se valida el acceso por correo
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password); // autentica al usuario con las credenciales ingresadas
            await userCredential.user.reload(); // recarga el estado del usuario para obtener el valor actualizado de emailVerified
            if (!auth.currentUser?.emailVerified) { // bloquea el acceso si el correo aun no fue verificado
                const verificationError = new Error('Debes verificar tu correo antes de iniciar sesion.') as Error & { code: string }; // crea un error controlado para informar que falta verificar el correo
                verificationError.code = 'auth/email-not-verified'; // asigna un codigo propio para manejar este caso desde la interfaz
                await signOut(auth); // cierra la sesion parcial para mantener protegido el acceso por correo
                setUser(null); // limpia el usuario local cuando el correo no esta verificado
                throw verificationError; // devuelve el error controlado para mostrar el mensaje adecuado en el modal
            }
            router.push('/intranet'); // redirige al usuario autenticado hacia la intranet
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
            const functions = getFunctions(app); // obtiene la instancia cliente de Cloud Functions para llamar el registro publico
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

    const resetPassword = async (email: string) => { // + define el flujo que envia el correo de restablecimiento de contrasena
        await sendPasswordResetEmail(auth, email); // + solicita a Firebase enviar el correo de recuperacion al email indicado
    }; // + cierra el flujo de restablecimiento de contrasena

    const login = async () => loginWithGoogle(); // mantiene la API anterior reutilizando el login con Google

    const logout = async () => { // define el flujo de cierre de sesion del usuario actual
        await signOut(auth); // cierra la sesion activa en Firebase Auth
        setUser(null); // limpia el usuario local inmediatamente tras cerrar sesion
        router.push('/'); // redirige al usuario al inicio tras cerrar sesion
    }; // cierra el flujo de logout

    if (!authReady) { // + muestra una pantalla de carga solo durante la sincronizacion inicial de autenticacion
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}> {/* + centra el indicador de carga en toda la pantalla */} 
                <CircularProgress /> {/* + muestra el spinner mientras la autenticacion esta cargando */} 
            </Box>
        );
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, logout }}> {/* + expone tambien el metodo de restablecer contrasena a toda la aplicacion */} 
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
