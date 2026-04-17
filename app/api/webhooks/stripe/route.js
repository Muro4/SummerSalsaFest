import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");

  try {
    // ==========================================
    // DYNAMIC CONFIG (COMMENTED OUT FOR NOW)
    // ==========================================
    // const sysDoc = await adminDb.collection("settings").doc("system").get();
    // const system = sysDoc.exists ? sysDoc.data() : { stripeMode: 'test' };
    // const isLive = system.stripeMode === 'live';
    // const stripeSecret = isLive ? process.env.STRIPE_LIVE_SECRET_KEY : process.env.STRIPE_TEST_SECRET_KEY;
    // const webhookSecret = isLive ? process.env.STRIPE_LIVE_WEBHOOK_SECRET : process.env.STRIPE_TEST_WEBHOOK_SECRET;

    // ==========================================
    // STRICT TEST MODE (ACTIVE)
    // ==========================================
    const stripeSecret = process.env.STRIPE_TEST_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_TEST_WEBHOOK_SECRET;

    if (!sig || !webhookSecret || !stripeSecret) {
      console.error("Missing Stripe config (Signature, Webhook Secret, or Stripe Secret).");
      return NextResponse.json({ error: "Missing config" }, { status: 400 });
    }

    // Initialize Stripe with the test environment key
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });
    
    // Verify the event actually came from Stripe
    const event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);

    // Handle successful checkout sessions
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      
      const checkoutSessionId = session.metadata?.checkoutSessionId;

      if (checkoutSessionId) {
        const checkoutDocRef = adminDb.collection("checkout_sessions").doc(checkoutSessionId);
        const checkoutDoc = await checkoutDocRef.get();

        if (!checkoutDoc.exists) {
          console.error(`❌ Webhook Error: Checkout session doc ${checkoutSessionId} not found.`);
          return NextResponse.json({ error: "Session document missing" }, { status: 404 });
        }

        const checkoutData = checkoutDoc.data();
        const ticketIds = checkoutData.ticketIds || [];
        const userId = checkoutData.userId; 
        const timestamp = new Date().toISOString();

        // Use a Firestore Batch for all DB operations
        const batch = adminDb.batch();

        // A) Activate all tickets
        ticketIds.forEach((id) => {
          const ticketRef = adminDb.collection("tickets").doc(id);
          batch.update(ticketRef, {
            status: "active",
            paymentConfirmedAt: timestamp,
          });
        });

        // B) Mark the session tracking doc as completed
        batch.update(checkoutDocRef, {
          status: "completed",
          completedAt: timestamp
        });

        // C) Clear the logged-in user's cart so they don't accidentally buy again
        if (userId && !userId.startsWith("guest_")) {
          const cartSnapshot = await adminDb.collection("users").doc(userId).collection("cart").get();
          cartSnapshot.forEach((cartDoc) => {
            batch.delete(cartDoc.ref);
          });
        }

        await batch.commit();
        console.log(`✅ Successfully activated ${ticketIds.length} tickets for session: ${checkoutSessionId}`);
      } else {
        console.warn("⚠️ Checkout completed, but no checkoutSessionId was found in metadata.");
      }
    }

    // Acknowledge receipt of the event
    return NextResponse.json({ received: true });

  } catch (err) {
    console.error("❌ Webhook Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}