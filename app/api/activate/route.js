import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, apiError, authenticate, documentId, requestBody } from "@/lib/room-server";

export async function POST(req) {
  try {
    const actor = await authenticate(req);
    const { ticketIds } = await requestBody(req);
    if (!Array.isArray(ticketIds) || !ticketIds.length || ticketIds.length > 100) throw new ApiError("invalidInput");
    const ids = [...new Set(ticketIds.map(documentId))];
    await adminDb.runTransaction(async tx => {
      const snapshots = await tx.getAll(...ids.map(id => adminDb.collection("tickets").doc(id)));
      for (const snapshot of snapshots) {
        if (!snapshot.exists) throw new ApiError("ticketMissing", 404);
        const ticket = snapshot.data();
        if (ticket.userId !== actor.uid) throw new ApiError("forbidden", 403);
        if (ticket.price !== 0 || (ticket.accommodationPrice || 0) !== 0) throw new ApiError("paymentRequired", 409);
        if (!["pending", "active"].includes(ticket.status)) throw new ApiError("invalidStatus", 409);
      }
      for (const snapshot of snapshots) {
        if (snapshot.data().status === "pending") tx.update(snapshot.ref, { status: "active", paymentConfirmedAt: new Date().toISOString() });
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}