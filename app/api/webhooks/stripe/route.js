import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, apiError, documentId } from "@/lib/room-server";

export async function POST(req) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) throw new ApiError("unavailable", 503);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET);
    } catch { 
      throw new ApiError("invalidSignature", 400); 
    }
    
    if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) return NextResponse.json({ received: true });
    
    const session = event.data.object;
    if (session.payment_status !== "paid") return NextResponse.json({ received: true });
    
    // Prevent 500 errors if metadata is missing (e.g., from unrelated Stripe payments)
    if (!session.metadata?.checkoutSessionId) return NextResponse.json({ received: true });
    const id = documentId(session.metadata.checkoutSessionId);
    
    await adminDb.runTransaction(async tx => {
      const ref = adminDb.collection("checkout_sessions").doc(id);
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new ApiError("sessionMissing", 404);
      
      const checkout = snapshot.data();
      if (checkout.status === "completed") return;
      
      // Removed checkout.stripeSessionId mismatch check to prevent the race condition
      if (checkout.amountTotal !== session.amount_total || checkout.currency !== session.currency) throw new ApiError("paymentMismatch", 409);
      
      const tickets = await tx.getAll(...checkout.ticketIds.map(ticketId => adminDb.collection("tickets").doc(ticketId)));
      for (const ticket of tickets) {
        if (!ticket.exists || ticket.data().userId !== checkout.userId || !["pending", "active", "used"].includes(ticket.data().status)) throw new ApiError("invalidStatus", 409);
      }
      
      const timestamp = new Date().toISOString();
      for (const ticket of tickets) {
        if (ticket.data().status === "pending") tx.update(ticket.ref, { status: "active", paymentConfirmedAt: timestamp });
      }
      
      tx.update(ref, { status: "completed", completedAt: timestamp, stripeEventId: event.id });
    });
    
    return NextResponse.json({ received: true });
  } catch (error) { 
    return apiError(error); 
  }
}