'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const PROJECT_AUTH_DOMAIN = 'cetprosmp-2026.firebaseapp.com';

const getFirebaseAuthDomain = () => {
  const configuredAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  if (configuredAuthDomain) return configuredAuthDomain;

  if (typeof window === 'undefined') return PROJECT_AUTH_DOMAIN;

  const hostname = window.location.hostname.toLowerCase();
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
  if (isLocalHost) return PROJECT_AUTH_DOMAIN;

  return hostname;
};

const firebaseConfig = {
  apiKey: 'AIzaSyD77s4vQE_0uRq9uFPvRypMsEEIwNaHCfs',
  authDomain: getFirebaseAuthDomain(),
  projectId: 'cetprosmp-2026',
  storageBucket: 'cetprosmp-2026.firebasestorage.app',
  messagingSenderId: '242152120618',
  appId: '1:242152120618:web:44246a7b79840e63ed3e53',
  measurementId: 'G-NXZB6Q5V02',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

const isEnabled = (value: string | undefined) => value === 'true' || value === '1' || value === 'yes' || value === 'si';

const shouldUseFirebaseEmulator = (serviceFlag: string | undefined, options?: { allowGlobal?: boolean }) => {
  if (serviceFlag !== undefined) {
    return isEnabled(serviceFlag);
  }

  return options?.allowGlobal === false ? false : isEnabled(process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS);
};

const safelyConnectEmulator = (connectFn: () => void) => {
  try {
    connectFn();
  } catch (error) {
    const message = String((error as { message?: string } | null)?.message || '').toLowerCase();
    const alreadyConnected = message.includes('already') && message.includes('emulator');
    if (!alreadyConnected) {
      throw error;
    }
  }
};

if (shouldUseFirebaseEmulator(process.env.NEXT_PUBLIC_USE_AUTH_EMULATOR)) {
  const authHost = process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST || '127.0.0.1';
  const authPort = Number(process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || '9099');
  safelyConnectEmulator(() => {
    connectAuthEmulator(auth, `http://${authHost}:${authPort}`, { disableWarnings: true });
  });
}

if (shouldUseFirebaseEmulator(process.env.NEXT_PUBLIC_USE_FIRESTORE_EMULATOR)) {
  const firestoreHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || '127.0.0.1';
  const firestorePort = Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080');
  safelyConnectEmulator(() => {
    connectFirestoreEmulator(db, firestoreHost, firestorePort);
  });
}

if (shouldUseFirebaseEmulator(process.env.NEXT_PUBLIC_USE_STORAGE_EMULATOR)) {
  const storageHost = process.env.NEXT_PUBLIC_STORAGE_EMULATOR_HOST || '127.0.0.1';
  const storagePort = Number(process.env.NEXT_PUBLIC_STORAGE_EMULATOR_PORT || '9199');
  safelyConnectEmulator(() => {
    connectStorageEmulator(storage, storageHost, storagePort);
  });
}

if (shouldUseFirebaseEmulator(process.env.NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR, { allowGlobal: false })) {
  const functionsHost = process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST || '127.0.0.1';
  const functionsPort = Number(process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_PORT || '5001');
  safelyConnectEmulator(() => {
    connectFunctionsEmulator(functions, functionsHost, functionsPort);
  });
}

export { app, auth, db, functions, storage };
