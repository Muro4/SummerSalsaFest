import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, apiError, authenticate, documentId, requestBody } from "@/lib/room-server";
import { getPriceAtDate } from "@/lib/pricing";
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
      if (settings.data()?.salesEnabled === false) throw new ApiError("salesPaused", 403);
      const snapshots = await tx.getAll(...ids.map(id => adminDb.collection("tickets").doc(id)));
      const records = snapshots.map(snapshot => {
        if (!snapshot.exists) throw new ApiError("ticketMissing", 404);
        const ticket = snapshot.data();
        if (ticket.userId !== actor.uid) throw new ApiError("forbidden", 403);
        if (ticket.status !== "pending" || ticket.roomId || ticket.festivalYear !== getActiveFestivalYear()) throw new ApiError("invalidStatus", 409);
        if (!["Full Pass", "Party Pass", "Day Pass", "Performers Pass"].includes(ticket.passType)) throw new ApiError("invalidInput");
        let currentPrice = getPriceAtDate(ticket.passType);
// Re-apply the 5€ markup if the ticket has no ambassador attached (direct purchase)
if (!ticket.ambassadorId && currentPrice > 0) {
  currentPrice += 5;
}
return { ...ticket, price: currentPrice };
      });
      const amountTotal = records.reduce((sum, ticket) => sum + Math.round(ticket.price * 100), 0);
      if (amountTotal <= 0) throw new ApiError("invalidInput");
      tx.set(sessionRef, { userId: actor.uid, ticketIds: ids, amountTotal, currency: "eur", status: "pending", createdAt: new Date().toISOString() });
      return records;
    });
    const stripe = new Stripe(secret, { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], mode: "payment",
      line_items: tickets.map(ticket => ({
        price_data: { currency: "eur", product_data: { name: ticket.passType, description: `Attendee: ${ticket.userName} | ID: ${ticket.ticketID}` }, unit_amount: Math.round(ticket.price * 100) },
        quantity: 1,
      })),
      success_url: `${origin}/cart/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: { checkoutSessionId: sessionRef.id },
      ...(actor.email ? { customer_email: actor.email } : {}),
    });
    await sessionRef.update({ stripeSessionId: session.id });
    return NextResponse.json({ url: session.url });
  } catch (error) { return apiError(error); }
}