import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPriceAtDate } from "@/lib/pricing"; 
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const sysDoc = await adminDb.collection("settings").doc("system").get();
    const system = sysDoc.exists ? sysDoc.data() : { salesEnabled: true, stripeMode: 'test' };

    if (!system.salesEnabled) {
       return NextResponse.json({ error: "Ticket sales are currently paused." }, { status: 403 });
    }

    const stripeSecret = system.stripeMode === 'live' 
        ? process.env.STRIPE_LIVE_SECRET_KEY 
        : process.env.STRIPE_TEST_SECRET_KEY;

    if (!stripeSecret) {
      return NextResponse.json({ error: `Stripe configuration error.` }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2023-10-16' });

    let body;
    try { body = await req.json(); } 
    catch (e) { return NextResponse.json({ error: "Failed to parse request" }, { status: 400 }); }

    const { items } = body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const ticketIdsArray = items.map(item => item.id);

    // 🔒 SECURITY FIX: Fetch the REAL tickets from Firestore to prevent spoofing
    const ticketRefs = ticketIdsArray.map(id => adminDb.collection("tickets").doc(id));
    const ticketSnapshots = await adminDb.getAll(...ticketRefs);

    const lineItems = [];

    // Loop through the real database documents, NOT the client payload
    for (const docSnap of ticketSnapshots) {
      if (!docSnap.exists) {
        return NextResponse.json({ error: `Ticket ${docSnap.id} not found in database.` }, { status: 404 });
      }

      const realTicket = docSnap.data();
      
      // Calculate price based on the VERIFIED passType
      const serverPrice = getPriceAtDate(realTicket.passType); 

      if (serverPrice === undefined || isNaN(serverPrice)) {
        throw new Error(`Invalid pass type: ${realTicket.passType}`);
      }

      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: String(realTicket.passType || "Festival Ticket"),
            description: `Attendee: ${realTicket.userName || "Guest"} | ID: ${realTicket.ticketID || "N/A"}`,
          },
          unit_amount: Math.round(serverPrice * 100), 
        },
        quantity: 1,
      });
    }

    // Save the reference document for the webhook
    const checkoutSessionRef = adminDb.collection("checkout_sessions").doc();
    await checkoutSessionRef.set({
      ticketIds: ticketIdsArray,
      status: "pending",
      createdAt: new Date().toISOString()
    });

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/cart/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: { checkoutSessionId: checkoutSessionRef.id }
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error("STRIPE SERVER ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}