import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPriceAtDate } from "@/lib/pricing"; 
import { adminDb, adminAuth } from "@/lib/firebase-admin";

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
    let requesterEmail = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await adminAuth.verifyIdToken(token);
      requesterId = decodedToken.uid;
      requesterEmail = decodedToken.email;
    } else if (guestSessionId) {
      requesterId = guestSessionId;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticketIdsArray = [];
    const lineItems = [];
    const batch = adminDb.batch(); // Use a batch to write all tickets at once efficiently

    // 🔒 2. SECURELY PROCESS CART ITEMS & CREATE PENDING TICKETS
    for (const item of items) {
      // Calculate price securely on the server to prevent client spoofing
      const serverPrice = getPriceAtDate(item.passType); 
      if (serverPrice === undefined || isNaN(serverPrice)) {
        return NextResponse.json({ error: `Invalid pass type: ${item.passType}` }, { status: 400 });
      }

      // Build Stripe Line Item
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: String(item.passType || "Festival Ticket"),
            description: `Attendee: ${item.userName || "Guest"}`,
          },
          unit_amount: Math.round(serverPrice * 100), 
        },
        quantity: 1,
      });

      // Generate a nice readable Ticket ID (e.g., SSF-A8F2B)
      const friendlyTicketID = `SSF-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // We use the item.id from the cart as the document ID. 
      // If the user clicks "Checkout", goes back, and clicks "Checkout" again, 
      // it just overwrites the same pending ticket instead of making duplicates!
      const ticketRef = adminDb.collection("tickets").doc(item.id);
      ticketIdsArray.push(item.id);

      batch.set(ticketRef, {
        userId: requesterId,
        userName: item.userName || "Guest",
        guestEmail: item.guestEmail || requesterEmail || null,
        passType: item.passType,
        price: serverPrice,
        status: "pending", // Important: Stays pending until Stripe webhook confirms payment
        festivalYear: 2026,
        ticketID: friendlyTicketID,
        createdAt: new Date().toISOString()
      }, { merge: true });
    }

    // Commit all new pending tickets to Firestore
    await batch.commit();

    // 3. CREATE CHECKOUT SESSION TRACKER
    const checkoutSessionRef = adminDb.collection("checkout_sessions").doc();
    await checkoutSessionRef.set({ 
      ticketIds: ticketIdsArray, 
      status: "pending", 
      userId: requesterId,
      createdAt: new Date().toISOString() 
    });

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // 4. INITIATE STRIPE SESSION
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
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: "An unexpected error occurred during checkout." }, { status: 500 });
  }
}