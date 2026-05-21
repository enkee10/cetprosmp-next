'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyD77s4vQE_0uRq9uFPvRypMsEEIwNaHCfs',
  authDomain: 'cetprosmp-2026.firebaseapp.com',
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

const shouldUseFirebaseEmulators = () => {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS) {
    return process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
  }

  return process.env.NODE_ENV !== 'production';
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

if (shouldUseFirebaseEmulators()) {
  const authHost = process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST || '127.0.0.1';
  const authPort = Number(process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || '9099');
  const firestoreHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || '127.0.0.1';
  const firestorePort = Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080');
  const storageHost = process.env.NEXT_PUBLIC_STORAGE_EMULATOR_HOST || '127.0.0.1';
  const storagePort = Number(process.env.NEXT_PUBLIC_STORAGE_EMULATOR_PORT || '9199');
  const functionsHost = process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST || '127.0.0.1';
  const functionsPort = Number(process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_PORT || '5001');

  safelyConnectEmulator(() => {
    connectAuthEmulator(auth, `http://${authHost}:${authPort}`, { disableWarnings: true });
  });
  safelyConnectEmulator(() => {
    connectFirestoreEmulator(db, firestoreHost, firestorePort);
  });
  safelyConnectEmulator(() => {
    connectStorageEmulator(storage, storageHost, storagePort);
  });
  safelyConnectEmulator(() => {
    connectFunctionsEmulator(functions, functionsHost, functionsPort);
  });
}

export { app, auth, db, functions, storage };
