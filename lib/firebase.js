// 1. Import the necessary functions from Firebase
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // <-- This import is required!

// 2. Your Firebase configuration (pulls from .env.local)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// 3. Initialize Firebase safely (prevents duplicate apps in Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 4. Export the tools so other files (like login/page.js) can use them
export const db = getFirestore(app);
export const auth = getAuth(app);

// THE PERMANENT FIX: Initialize and export the Google Provider
export const googleProvider = new GoogleAuthProvider();