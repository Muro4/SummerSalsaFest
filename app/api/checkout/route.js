import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPriceAtDate } from "@/lib/pricing"; 
import { adminDb } from "@/lib/firebase-admin"; // <-- Import Admin SDK

export async function POST(req) {
  try {
    // 1. Fetch system settings directly from Firestore Admin
    const sysDoc = await adminDb.collection("settings").doc("system").get();
    const system = sysDoc.exists ? sysDoc.data() : { salesEnabled: true, stripeMode: 'test' };

    // 2. Enforce Kill Switch on the backend
    if (!system.salesEnabled) {
       return NextResponse.json({ error: "Ticket sales are currently paused." }, { status: 403 });
    }

    // 3. Select the correct Stripe Environment based on the Dev Panel toggle
    const stripeSecret = system.stripeMode === 'live' 
        ? process.env.STRIPE_LIVE_SECRET_KEY 
        : process.env.STRIPE_TEST_SECRET_KEY;

    if (!stripeSecret) {
      console.error(`Missing Stripe Secret Key for ${system.stripeMode} mode.`);
      return NextResponse.json({ error: `Stripe configuration error for ${system.stripeMode} mode.` }, { status: 500 });
    }

    // Initialize Stripe with the dynamically selected key
    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2023-10-16',
    });

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Failed to parse request body" }, { status: 400 });
    }

    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart items array is empty or missing" }, { status: 400 });
    }

    // 4. Extract Ticket IDs so we can pass them to Stripe Metadata
    // Note: Stripe metadata has a 500 character limit per key. 
    // If users can buy 50+ tickets at once, you'd need to store this in a temporary DB doc instead.
    const ticketIds = items.map(item => item.id).join(',');

    // 5. Format Line Items using SERVER-SIDE pricing
    const lineItems = items.map((item) => {
      // 🚨 IGNORING item.price FROM THE FRONTEND 🚨
      const serverPrice = getPriceAtDate(item.passType); 

      if (serverPrice === undefined || isNaN(serverPrice)) {
        throw new Error(`Invalid pass type or price calculation failed for: ${item.passType}`);
      }

      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: String(item.passType || "Festival Ticket"),
            description: `Attendee: ${item.userName || "Guest"} | ID: ${item.ticketID || "N/A"}`,
          },
          unit_amount: Math.round(serverPrice * 100), // Securely calculated
        },
        quantity: 1,
      };
    });

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // 6. Create Stripe Session with Metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      // Best practice: Append the session_id so the success page can verify it if needed
      success_url: `${origin}/cart/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: {
        ticketIds: ticketIds // We will need this in the Webhook!
      }
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error("STRIPE SERVER ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}