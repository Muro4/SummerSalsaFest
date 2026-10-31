import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { ApiError, apiError, authenticate, requestBody } from "@/lib/room-server";

export async function POST(req) {
  try {
    const actor = await authenticate(req);
    if (actor.anonymous) throw new ApiError("forbidden", 403);
    const { guestToken } = await requestBody(req);
    if (typeof guestToken !== "string") throw new ApiError("unauthorized", 401);
    let guest;
    try { guest = await adminAuth.verifyIdToken(guestToken, true); }
    catch { throw new ApiError("unauthorized", 401); }
    if (guest.firebase?.sign_in_provider !== "anonymous" || guest.uid === actor.uid) throw new ApiError("forbidden", 403);
    const count = await adminDb.runTransaction(async tx => {
      const snapshot = await tx.get(adminDb.collection("tickets").where("userId", "==", guest.uid).limit(401));
      if (snapshot.size > 400) throw new ApiError("invalidInput");
      for (const ticket of snapshot.docs) tx.update(ticket.ref, { userId: actor.uid, isGuest: false });
      return snapshot.size;
    });
    return NextResponse.json({ success: true, count });
  } catch (error) { return apiError(error); }
}
