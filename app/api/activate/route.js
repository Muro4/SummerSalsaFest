import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const { ticketIds } = await req.json();
    
    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return NextResponse.json({ error: "No tickets provided." }, { status: 400 });
    }

    const batch = adminDb.batch();

    for (const id of ticketIds) {
      const ref = adminDb.collection("tickets").doc(id);
      const snap = await ref.get();
      
      // SECURITY: Ensure the ticket exists, is unpaid, AND is actually €0!
      if (snap.exists && snap.data().status === "pending" && snap.data().price === 0) {
        batch.update(ref, {
          status: "active",
          paymentConfirmedAt: new Date().toISOString()
        });
      } else {
        console.warn(`Attempted to illegally activate ticket: ${id}`);
      }
    }
    
    await batch.commit();
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Free Pass Activation Error:", error);
    return NextResponse.json({ error: "Failed to activate passes" }, { status: 500 });
  }
}