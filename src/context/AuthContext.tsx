'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    User as FirebaseUser,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { CircularProgress, Box } from '@mui/material';
import { useRouter } from 'next/navigation';

// --- Interfaces y Tipos ---
interface UserData {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: string | null;
    level: number;
    [key: string]: any;
}

interface AuthContextType {
    user: UserData | null;
    loading: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Componente Principal del Proveedor de Autenticación ---

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            setLoading(true);
            if (firebaseUser) {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const firestoreData = userDocSnap.data();
                    const token = await firebaseUser.getIdTokenResult();
                    const claims = token.claims;

                    // Lógica de fusión mejorada:
                    // 1. Empezar con los datos de Firestore (nuestra base de datos custom).
                    // 2. Sobrescribir con los datos de Firebase Auth (fuente de verdad para la identidad).
                    // 3. Sobrescribir con los claims del token (fuente de verdad para los permisos).
                    const userData: UserData = {
                        ...firestoreData,
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL, // <-- Esto asegura que siempre se use la foto de Google.
                        role: (claims.role as string) || null,
                        level: (claims.level as number) || 0,
                    };
                    setUser(userData);
                } else {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async () => {
        setLoading(true);
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            router.push('/intranet');
        } catch (error) {
            console.error("Error during Google sign-in:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        router.push('/');
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// --- Hook para consumir el contexto ---
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
