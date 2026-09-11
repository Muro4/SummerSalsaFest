import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req) {
  try {
    // Note: In production, secure this endpoint so only your Cron provider (Vercel Cron / Google Cloud Scheduler) can trigger it.
    const now = Date.now();
    const roomsSnapshot = await adminDb.collection("rooms").get();

    const batch = adminDb.batch();
    let sweptCount = 0;

    roomsSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.lockExpirations) return;

      let needsUpdate = false;
      let newOccupants = [...(data.occupants || [])];
      let newLocks = { ...data.lockExpirations };

      // Check all locks in the room
      for (const [draftId, expiresAt] of Object.entries(newLocks)) {
        if (now > expiresAt) {
          // Lock expired! Remove it.
          newOccupants = newOccupants.filter(id => id !== draftId);
          delete newLocks[draftId];
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        batch.update(doc.ref, {
          occupants: newOccupants,
          lockExpirations: newLocks,
          status: newOccupants.length === data.capacity ? "full" : "available"
        });
        sweptCount++;
      }
    });

    if (sweptCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, sweptCount });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}