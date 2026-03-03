// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD77s4vQE_0uRq9uFPvRypMsEEIwNaHCfs",
  authDomain: "cetprosmp-2026.firebaseapp.com",
  projectId: "cetprosmp-2026",
  storageBucket: "cetprosmp-2026.appspot.com",
  messagingSenderId: "242152120618",
  appId: "1:242152120618:web:aa51d721f79369f3ed3e53",
  measurementId: "G-2Z85V0RGNS"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, auth, analytics };
