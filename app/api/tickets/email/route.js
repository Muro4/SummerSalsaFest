import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, apiError, authenticate, documentId, requestBody } from "@/lib/room-server";
import { isOptionalEmail } from "@/lib/validation";

export async function POST(req) {
  try {
    const actor = await authenticate(req, ["ambassador", "superadmin"]);
    const body = await requestBody(req);
    const ticketId = documentId(body.ticketId);
    if (typeof body.email !== "string" || !isOptionalEmail(body.email)) throw new ApiError("invalidInput");
    const email = body.email.trim().toLowerCase();
    const ref = adminDb.collection("tickets").doc(ticketId);
    await adminDb.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new ApiError("ticketMissing", 404);
      const ticket = snapshot.data();
      if (actor.role !== "superadmin" && ticket.userId !== actor.uid) throw new ApiError("forbidden", 403);
      // guestEmail is the canonical recipient used by ticket delivery and the modal.
      // Keep the legacy alias synchronized only on documents that already have it.
      tx.update(ref, { guestEmail: email, ...(Object.hasOwn(ticket, "email") ? { email } : {}) });
    });
    return NextResponse.json({ success: true, email });
  } catch (error) {
    return apiError(error);
  }
}
