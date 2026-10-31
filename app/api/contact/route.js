import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, apiError, authenticate, requestBody } from "@/lib/room-server";
import { boundedText, emailAddress } from "@/lib/server-validation";

export async function POST(req) {
  try {
    const actor = await authenticate(req);
    const body = await requestBody(req);
    const message = {
      name: boundedText(body.name, 150), email: emailAddress(body.email),
      category: boundedText(body.category, 100), subject: boundedText(body.subject, 200),
      message: boundedText(body.message, 10000), status: "unread", createdAt: new Date().toISOString(),
    };
    await adminDb.runTransaction(async tx => {
      const guard = adminDb.collection("contact_guards").doc(actor.uid);
      const snapshot = await tx.get(guard);
      if ((snapshot.data()?.nextAllowedAt || 0) > Date.now()) throw new ApiError("rateLimited", 429);
      tx.set(guard, { nextAllowedAt: Date.now() + 60_000 });
      tx.create(adminDb.collection("contact_messages").doc(), message);
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
