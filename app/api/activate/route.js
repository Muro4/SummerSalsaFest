import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const { ticketIds, guestSessionId } = await req.json();
    
    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return NextResponse.json({ error: "No tickets provided." }, { status: 400 });
    }

    // 🔒 1. IDENTIFY THE REQUESTER
    const authHeader = req.headers.get('authorization');
    let requesterId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await adminAuth.verifyIdToken(token);
      requesterId = decodedToken.uid;
    } else if (guestSessionId) {
      requesterId = guestSessionId;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batch = adminDb.batch();

    for (const id of ticketIds) {
      const ref = adminDb.collection("tickets").doc(id);
      const snap = await ref.get();
      
      if (!snap.exists) continue;

      const ticketData = snap.data();

      // 🔒 2. OWNERSHIP VERIFICATION (The IDOR Fix)
      if (ticketData.userId !== requesterId) {
        console.warn(`Illegal activation attempt by ${requesterId} on ticket ${id}`);
        return NextResponse.json({ error: "Forbidden: You do not own this ticket." }, { status: 403 });
      }

      // 3. SECURE ACTIVATION CONDITIONS
      if (ticketData.status === "pending" && ticketData.price === 0) {
        batch.update(ref, {
          status: "active",
          paymentConfirmedAt: new Date().toISOString()
        });
      }
    }
    
    await batch.commit();
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Free Pass Activation Error:", error);
    return NextResponse.json({ error: "Failed to activate passes" }, { status: 500 });
  }
}