import admin from 'firebase-admin';

// Prevent duplicate initializations in Next.js development mode
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // The replace() function is critical here. 
        // Vercel and Next.js handle newline characters in .env files differently, 
        // so this ensures the key is formatted correctly on the server.
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin Initialized successfully.');
  } catch (error) {
    console.error('❌ Firebase Admin Initialization Error', error.stack);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();