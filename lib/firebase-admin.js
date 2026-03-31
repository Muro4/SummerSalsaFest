import admin from 'firebase-admin';

if (!admin.apps.length) {
  // Check if we have the required env variables before trying to initialize
  // This prevents the "Default app does not exist" error during Vercel build
  const hasFullConfig = 
    process.env.FIREBASE_CLIENT_EMAIL && 
    process.env.FIREBASE_PRIVATE_KEY && 
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (hasFullConfig) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      console.log('✅ Firebase Admin Initialized');
    } catch (error) {
      console.error('❌ Firebase Admin Init Error:', error.message);
    }
  } else {
    // During local build, if keys are missing, we log a warning instead of crashing
    console.warn('⚠️ Firebase Admin credentials missing. Skipping initialization.');
  }
}

// Export getters to ensure the app is initialized before use
export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;