import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

function formatPrivateKey(key) {
  if (!key) return undefined;
  // Strip surrounding quotes if pasted with double/single quotes in Vercel
  const unquoted = key.replace(/^["']|["']$/g, "").trim();
  // Ensure escaped \n characters become real newlines
  return unquoted.replace(/\\n/g, "\n");
}

if (!getApps().length) {
  if (projectId && clientEmail && rawPrivateKey) {
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formatPrivateKey(rawPrivateKey),
        }),
      });
    } catch (error) {
      // Prevents top-level crashes from knocking out serverless function imports
      console.error("Firebase Admin initialization failed:", error.message);
    }
  } else {
    console.warn("Firebase Admin credentials missing or incomplete.");
  }
}

// Keep builds without deployment credentials possible; authenticated routes fail closed.
export const adminAuth = getApps().length ? getAuth() : null;
export const adminDb = getApps().length ? getFirestore() : null;