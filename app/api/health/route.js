import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // UPDATED: Added new checks and spaced out the keys for better UI readability
  const results = {
    "Firebase Auth": { status: "pending", message: "Waiting..." },
    "Firebase DB": { status: "pending", message: "Waiting..." },
    "Stripe Test": { status: "pending", message: "Waiting..." },
    "Stripe Live": { status: "pending", message: "Waiting..." },
    "Stripe Webhook": { status: "pending", message: "Waiting..." },
    "Email Config": { status: "pending", message: "Waiting..." }
  };

  try {
    // Safety check in case the env variables are completely missing
    if (!adminAuth || !adminDb) {
      throw new Error("Firebase Admin SDK failed to initialize. Check your env variables.");
    }

    // 1. Verify Admin Token and Role
    const token = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'superadmin') {
       throw new Error("Access Denied: Not a superadmin");
    }
    results["Firebase Auth"] = { status: "pass", message: "Admin Auth Operational" };

    // 2. Test Firebase DB Connection
    await adminDb.collection("settings").doc("system").get();
    results["Firebase DB"] = { status: "pass", message: "Database Read Operational" };

    // 3. Test Stripe Test Keys
    if (process.env.STRIPE_TEST_SECRET_KEY) {
      const stripeTest = new Stripe(process.env.STRIPE_TEST_SECRET_KEY, { apiVersion: '2023-10-16' });
      await stripeTest.balance.retrieve(); // A lightweight call to verify the key
      results["Stripe Test"] = { status: "pass", message: "Test Keys Valid" };
    } else {
      results["Stripe Test"] = { status: "fail", message: "Missing Test Key" };
    }

    // 4. Test Stripe Live Keys
    if (process.env.STRIPE_LIVE_SECRET_KEY) {
      const stripeLive = new Stripe(process.env.STRIPE_LIVE_SECRET_KEY, { apiVersion: '2023-10-16' });
      await stripeLive.balance.retrieve();
      results["Stripe Live"] = { status: "pass", message: "Live Keys Valid" };
    } else {
      results["Stripe Live"] = { status: "warn", message: "Missing Live Key (OK for Dev)" };
    }

    // 5. Test Stripe Webhook
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      results["Stripe Webhook"] = { status: "pass", message: "Webhook Secret Configured" };
    } else {
      results["Stripe Webhook"] = { status: "fail", message: "Missing Webhook Secret (Critical for fulfillment)" };
    }

    // 6. Test Email Server Credentials
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      results["Email Config"] = { status: "pass", message: "Email Credentials Loaded" };
    } else {
      results["Email Config"] = { status: "warn", message: "Missing Email Credentials (Receipts won't send)" };
    }

    const allPassed = Object.values(results).every(r => r.status === "pass" || r.status === "warn");
    return NextResponse.json({ success: allPassed, results }, { status: 200 });

  } catch (error) {
    // Mark anything still pending as failed/aborted so the panel explains why it stopped
    Object.keys(results).forEach(key => {
      if (results[key].status === "pending") {
        results[key] = { status: "fail", message: `Aborted: ${error.message}` };
      }
    });
    return NextResponse.json({ success: false, error: error.message, results }, { status: 500 });
  }
}