import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, apiError, authenticate, documentId, requestBody } from "@/lib/room-server";
import { calculateFinalPrice, isSalesOpen } from "@/lib/pricing";
import { getActiveFestivalYear } from "@/lib/utils";

export async function POST(req) {
  try {
    const actor = await authenticate(req);
    if (actor.anonymous) throw new ApiError("unauthorized", 401);

    const { items } = await requestBody(req);
    if (!Array.isArray(items) || !items.length || items.length > 100) throw new ApiError("invalidInput");
    const ids = items.map(item => documentId(item?.id));
    if (new Set(ids).size !== ids.length) throw new ApiError("invalidInput");
    
    const secret = process.env.STRIPE_SECRET_KEY;
    const base = process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : null);
    if (!secret || !base) throw new ApiError("unavailable", 503);
    
    const origin = new URL(base).origin;
    const sessionRef = adminDb.collection("checkout_sessions").doc();
    
    const tickets = await adminDb.runTransaction(async tx => {
      const settings = await tx.get(adminDb.collection("settings").doc("system"));
      
      // PHASE 1 FIX: Server-side sales open enforcement
      if (settings.data()?.salesEnabled === false || !isSalesOpen()) {
        throw new ApiError("salesPaused", 403);
      }

      const snapshots = await tx.getAll(...ids.map(id => adminDb.collection("tickets").doc(id)));
      const records = snapshots.map(snapshot => {
        if (!snapshot.exists) throw new ApiError("ticketMissing", 404);
        const ticket = snapshot.data();
        if (ticket.userId !== actor.uid) throw new ApiError("forbidden", 403);
        if (ticket.status !== "pending" || ticket.roomId || ticket.festivalYear !== getActiveFestivalYear()) throw new ApiError("invalidStatus", 409);
        if (!["Full Pass", "Party Pass", "Day Pass", "Performers Pass"].includes(ticket.passType)) throw new ApiError("invalidInput");
        
        // PHASE 2 FIX: Use the single source of truth for pricing
        const isDirectPurchase = !ticket.ambassadorId;
        const currentPrice = calculateFinalPrice(ticket.passType, isDirectPurchase);
        
        // THE FIX: Explicitly attach snapshot.id so lockedPrices can find it
        return { ...ticket, id: snapshot.id, price: currentPrice };
      });

      const amountTotal = records.reduce((sum, ticket) => sum + Math.round(ticket.price * 100), 0);
      if (amountTotal <= 0) throw new ApiError("invalidInput");
      
      // PHASE 2 FIX: Save the locked prices into the session document
      const lockedPrices = records.map(t => ({ id: t.id, price: t.price }));

      tx.set(sessionRef, { 
        userId: actor.uid, 
        ticketIds: ids, 
        lockedPrices, // <-- Storing this so the webhook can apply it
        amountTotal, 
        currency: "eur", 
        status: "pending", 
        createdAt: new Date().toISOString() 
      });
      
      return records;
    });

    const stripe = new Stripe(secret, { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], 
      mode: "payment",
      // PHASE 1 FIX: Expire session in 31 minutes to prevent double-payments
      expires_at: Math.floor(Date.now() / 1000) + (31 * 60),
      line_items: tickets.map(ticket => ({
        price_data: { 
          currency: "eur", 
          product_data: { name: ticket.passType, description: `Attendee: ${ticket.userName} | ID: ${ticket.ticketID}` }, 
          unit_amount: Math.round(ticket.price * 100) 
        },
        quantity: 1,
      })),
      success_url: `${origin}/cart/success?checkout=${sessionRef.id}`,
      cancel_url: `${origin}/cart`,
      metadata: { checkoutSessionId: sessionRef.id },
      ...(actor.email ? { customer_email: actor.email } : {}),
    });

    await sessionRef.update({ stripeSessionId: session.id });
    return NextResponse.json({ url: session.url });
  } catch (error) { 
    return apiError(error); 
  }
}