import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin"; // Using Admin SDK to bypass Firestore rules

export async function POST(req) {
  // ✅ FIX: Initializing Stripe INSIDE the POST function.
  // We also add a fallback string so the Next.js build never crashes even if env vars are missing.
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "dummy_key_for_build", {
    apiVersion: "2023-10-16",
  });

  // 1. Next.js App Router requires reading the raw body as text for Stripe signature verification
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Only throw an error if this is a real request missing variables, not a build evaluation
    if (!sig || !webhookSecret) {
      console.error("Missing Stripe signature or webhook secret.");
      return NextResponse.json({ error: "Missing config" }, { status: 400 });
    }
    
    // 2. Verify the event actually came from Stripe
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    console.error("❌ Webhook Error: Signature verification failed.", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // 3. Handle successful checkout sessions
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    
    // Grab the Firestore document reference ID from Stripe metadata
    const checkoutSessionId = session.metadata?.checkoutSessionId;

    if (checkoutSessionId) {
      try {
        // Fetch the temporary session document from Firestore
        const checkoutDocRef = adminDb.collection("checkout_sessions").doc(checkoutSessionId);
        const checkoutDoc = await checkoutDocRef.get();

        if (!checkoutDoc.exists) {
          console.error(`❌ Webhook Error: Checkout session doc ${checkoutSessionId} not found.`);
          return NextResponse.json({ error: "Session document missing" }, { status: 404 });
        }

        const ticketIds = checkoutDoc.data().ticketIds;
        const timestamp = new Date().toISOString();

        // 4. Use a Firestore Batch to activate all tickets simultaneously
        const batch = adminDb.batch();

        ticketIds.forEach((id) => {
          const ticketRef = adminDb.collection("tickets").doc(id);
          batch.update(ticketRef, {
            status: "active",
            paymentConfirmedAt: timestamp,
          });
        });

        // 5. Mark the reference document as completed so we have a paper trail
        batch.update(checkoutDocRef, {
          status: "completed",
          completedAt: timestamp
        });

        await batch.commit();
        console.log(`✅ Successfully activated ${ticketIds.length} tickets for session: ${checkoutSessionId}`);
        
      } catch (error) {
        console.error("❌ Failed to activate tickets in Firestore:", error);
        // Returning a 500 tells Stripe to retry this webhook later if our DB fails
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }
    } else {
      console.warn("⚠️ Checkout completed, but no checkoutSessionId was found in metadata.");
    }
  }

  // 5. Acknowledge receipt of the event
  return NextResponse.json({ received: true });
}