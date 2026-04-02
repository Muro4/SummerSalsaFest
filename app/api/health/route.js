import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    firebaseAuth: { status: "pending", message: "Waiting..." },
    firebaseDb: { status: "pending", message: "Waiting..." },
    stripeTest: { status: "pending", message: "Waiting..." },
    stripeLive: { status: "pending", message: "Waiting..." }
  };

  try {
    // 1. Verify Admin Token and Role
    const token = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    
    // 🚀 THE FIX: Fetch role from the Firestore database, not the raw token!
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'superadmin') {
       throw new Error("Access Denied: Not a superadmin");
    }
    results.firebaseAuth = { status: "pass", message: "Admin Auth Operational" };

    // 2. Test Firebase DB Connection
    await adminDb.collection("settings").doc("system").get();
    results.firebaseDb = { status: "pass", message: "Database Read Operational" };

    // 3. Test Stripe Test Keys
    if (process.env.STRIPE_TEST_SECRET_KEY) {
      const stripeTest = new Stripe(process.env.STRIPE_TEST_SECRET_KEY, { apiVersion: '2023-10-16' });
      await stripeTest.balance.retrieve(); // A lightweight call to verify the key
      results.stripeTest = { status: "pass", message: "Test Keys Valid" };
    } else {
      results.stripeTest = { status: "fail", message: "Missing Test Key" };
    }

    // 4. Test Stripe Live Keys
    if (process.env.STRIPE_LIVE_SECRET_KEY) {
      const stripeLive = new Stripe(process.env.STRIPE_LIVE_SECRET_KEY, { apiVersion: '2023-10-16' });
      await stripeLive.balance.retrieve();
      results.stripeLive = { status: "pass", message: "Live Keys Valid" };
    } else {
      results.stripeLive = { status: "warn", message: "Missing Live Key (OK for Dev)" };
    }

    const allPassed = Object.values(results).every(r => r.status === "pass" || r.status === "warn");
    return NextResponse.json({ success: allPassed, results }, { status: 200 });

  } catch (error) {
    // 🚀 UI FIX: Mark anything still pending as failed/aborted so the panel explains why it stopped
    Object.keys(results).forEach(key => {
      if (results[key].status === "pending") {
        results[key] = { status: "fail", message: `Aborted: ${error.message}` };
      }
    });
    return NextResponse.json({ success: false, error: error.message, results }, { status: 500 });
  }
}