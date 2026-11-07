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
    
    const validEvents = [
      "checkout.session.completed", 
      "checkout.session.async_payment_succeeded",
      "checkout.session.expired" // PHASE 1 FIX: Listen for expired sessions
    ];
    
    if (!validEvents.includes(event.type)) return NextResponse.json({ received: true });
    
    const session = event.data.object;
    if (!session.metadata?.checkoutSessionId) return NextResponse.json({ received: true });
    const id = documentId(session.metadata.checkoutSessionId);

    // PHASE 1 FIX: Handle Session Expiry to prevent cart locking
    if (event.type === "checkout.session.expired") {
      await adminDb.runTransaction(async tx => {
        const ref = adminDb.collection("checkout_sessions").doc(id);
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) return;
        
        const checkout = snapshot.data();
        if (checkout.status !== "pending") return;
        
        const tickets = await tx.getAll(...checkout.ticketIds.map(ticketId => adminDb.collection("tickets").doc(ticketId)));
        for (const ticket of tickets) {
          // Delete abandoned pending tickets so they don't count towards the user's limit
          if (ticket.exists && ticket.data().status === "pending") {
            tx.delete(ticket.ref);
          }
        }
        tx.update(ref, { status: "expired", updatedAt: new Date().toISOString() });
      });
      return NextResponse.json({ received: true });
    }
    
    if (session.payment_status !== "paid") return NextResponse.json({ received: true });
    
    // Handle successful payment
    try {
        await adminDb.runTransaction(async tx => {
          const ref = adminDb.collection("checkout_sessions").doc(id);
          const snapshot = await tx.get(ref);
          if (!snapshot.exists) throw new ApiError("sessionMissing", 404);
          
          const checkout = snapshot.data();
          if (checkout.status === "completed") return;
          
          // PHASE 1 FIX: Safe session ID check to prevent race conditions
          if (checkout.stripeSessionId && checkout.stripeSessionId !== session.id) {
             throw new ApiError("paymentMismatch", 409);
          }
          
          if (checkout.amountTotal !== session.amount_total || checkout.currency !== session.currency) {
             throw new ApiError("paymentMismatch", 409);
          }
          
          const tickets = await tx.getAll(...checkout.ticketIds.map(ticketId => adminDb.collection("tickets").doc(ticketId)));
          for (const ticket of tickets) {
            if (!ticket.exists || ticket.data().userId !== checkout.userId || !["pending", "active", "used"].includes(ticket.data().status)) {
                throw new ApiError("invalidStatus", 409);
            }
          }
          
          const timestamp = new Date().toISOString();
          for (const ticket of tickets) {
            if (ticket.data().status === "pending") {
              tx.update(ticket.ref, { 
                status: "active", 
                paymentConfirmedAt: timestamp,
                checkoutSessionId: id
              });
            }
          }
          
          tx.update(ref, { status: "completed", completedAt: timestamp, stripeEventId: event.id });
        });
    } catch (txError) {
        // PHASE 1 FIX: Catch and Log Silent Webhook Failures
        if (txError instanceof ApiError) {
            await adminDb.collection("failed_payments_review").add({
                error: txError.message,
                checkoutSessionId: id,
                stripeSessionId: session.id,
                amount: session.amount_total,
                timestamp: new Date().toISOString(),
                rawEventData: JSON.parse(JSON.stringify(event))
            });
            
            // Return 200 so Stripe doesn't infinitely retry a logical error (like an already finalized cart)
            return NextResponse.json({ received: true, errorLogged: true });
        }
        throw txError; // Throw unknown errors to trigger a retry
    }
    
    return NextResponse.json({ received: true });
  } catch (error) { 
    return apiError(error); 
  }
}