import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const body = await req.json();
    const { roomId, draftId, action } = body; 

    if (!roomId || !draftId || !action) {
      return NextResponse.json({ error: "Missing parameters." }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roomRef = adminDb.collection("rooms").doc(roomId);

    await adminDb.runTransaction(async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists) throw new Error("Room does not exist.");

      const roomData = roomDoc.data();
      let occupants = roomData.occupants || [];
      let lockExpirations = roomData.lockExpirations || {};

      if (action === "lock") {
        if (occupants.length >= roomData.capacity) {
          throw new Error("This room just filled up!");
        }
        if (occupants.includes(draftId)) {
          throw new Error("Already assigned to this room.");
        }
        
        occupants.push(draftId);
        // Lock for 10 minutes (600,000 ms)
        lockExpirations[draftId] = Date.now() + 600000; 

      } else if (action === "unlock") {
        occupants = occupants.filter(id => id !== draftId);
        delete lockExpirations[draftId];
      }

      transaction.update(roomRef, { 
        occupants: occupants,
        lockExpirations: lockExpirations,
        status: occupants.length === roomData.capacity ? "full" : "available"
      });
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: error.message || "Server error." }, { status: 500 });
  }
}