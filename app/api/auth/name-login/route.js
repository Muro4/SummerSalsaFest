import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { ApiError, apiError, authenticate, requestBody } from "@/lib/room-server";
import { boundedText } from "@/lib/server-validation";

export async function POST(req) {
  try {
    // Bootstrap with anonymous Firebase Auth; never expose a profile/email lookup.
    const actor = await authenticate(req);
    const body = await requestBody(req);
    const name = boundedText(body.name, 150);
    const password = boundedText(body.password, 4096);
    const nameHash = createHash("sha256").update(name.toLowerCase()).digest("hex");
    await adminDb.runTransaction(async tx => {
      const refs = [actor.uid, nameHash].map(key => adminDb.collection("login_guards").doc(key));
      const snapshots = await tx.getAll(...refs);
      const now = Date.now();
      const counts = snapshots.map(snapshot => (snapshot.data()?.until || 0) > now ? snapshot.data().count : 0);
      if (counts.some(count => count >= 10)) throw new ApiError("rateLimited", 429);
      refs.forEach((ref, index) => tx.set(ref, { count: counts[index] + 1, until: counts[index] ? snapshots[index].data().until : now + 60_000 }));
    });
    const users = await adminDb.collection("users").where("displayName", "==", name).limit(2).get();
    if (users.size !== 1) throw new ApiError("invalidCredentials", 401);
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: users.docs[0].data().email, password: body.password, returnSecureToken: true }),
    });
    if (!response.ok) throw new ApiError("invalidCredentials", 401);
    const result = await response.json();
    let verified;
    try { verified = await adminAuth.verifyIdToken(result.idToken, true); }
    catch { throw new ApiError("invalidCredentials", 401); }
    if (verified.uid !== users.docs[0].id) throw new ApiError("invalidCredentials", 401);
    return NextResponse.json({ token: await adminAuth.createCustomToken(verified.uid) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
