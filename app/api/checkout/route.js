import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPriceAtDate } from "@/lib/pricing"; 
import { adminDb, adminAuth } from "@/lib/firebase-admin"; // <-- ADDED adminAuth

export async function POST(req) {
  try {
    const sysDoc = await adminDb.collection("settings").doc("system").get();
    const system = sysDoc.exists ? sysDoc.data() : { salesEnabled: true, stripeMode: 'test' };

    if (!system.salesEnabled) return NextResponse.json({ error: "Ticket sales paused." }, { status: 403 });

    const stripeSecret = system.stripeMode === 'live' ? process.env.STRIPE_LIVE_SECRET_KEY : process.env.STRIPE_TEST_SECRET_KEY;
    if (!stripeSecret) return NextResponse.json({ error: `Stripe config error.` }, { status: 500 });
    const stripe = new Stripe(stripeSecret, { apiVersion: '2023-10-16' });

    let body;
    try { body = await req.json(); } catch (e) { return NextResponse.json({ error: "Parse error" }, { status: 400 }); }

    const { items, guestSessionId } = body;
    if (!items || !Array.isArray(items) || items.length === 0) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

    // 🔒 1. IDENTIFY THE REQUESTER
    const authHeader = req.headers.get('authorization');
    let requesterId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await adminAuth.verifyIdToken(token);
      requesterId = decodedToken.uid;
    } else if (guestSessionId) {
      requesterId = guestSessionId;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticketIdsArray = items.map(item => item.id);
    const ticketRefs = ticketIdsArray.map(id => adminDb.collection("tickets").doc(id));
    const ticketSnapshots = await adminDb.getAll(...ticketRefs);

    const lineItems = [];

    for (const docSnap of ticketSnapshots) {
      if (!docSnap.exists) return NextResponse.json({ error: `Ticket not found.` }, { status: 404 });
      
      const realTicket = docSnap.data();

      // 🔒 2. OWNERSHIP VERIFICATION (The IDOR Fix)
      if (realTicket.userId !== requesterId) {
        return NextResponse.json({ error: `Forbidden: You do not own this ticket.` }, { status: 403 });
      }
      
      const serverPrice = getPriceAtDate(realTicket.passType); 
      if (serverPrice === undefined || isNaN(serverPrice)) throw new Error(`Invalid pass type`);

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

    const checkoutSessionRef = adminDb.collection("checkout_sessions").doc();
    await checkoutSessionRef.set({ ticketIds: ticketIdsArray, status: "pending", createdAt: new Date().toISOString() });

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}