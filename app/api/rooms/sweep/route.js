import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { apiError, authenticate } from "@/lib/room-server";
import { roomState, roomUpdate } from "@/lib/rooms";

export async function GET(req) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) await authenticate(req, ["superadmin"]);
    let sweptCount = 0;
    let cursor;
    // Bounded pages and per-room transactions avoid stale batch writes and the write limit.
    do {
      let query = adminDb.collection("rooms").orderBy("__name__").limit(100);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      for (const candidate of page.docs) {
        const changed = await adminDb.runTransaction(async tx => {
          const snapshot = await tx.get(candidate.ref);
          if (!snapshot.exists) return false;
          const room = snapshot.data();
          const state = roomState(room, Date.now());
          if (!(Object.keys(room.lockExpirations || {}).length || state.locks.length !== (room.locks || []).length)) return false;
          tx.update(snapshot.ref, roomUpdate(room, state));
          return true;
        });
        if (changed) sweptCount++;
      }
      cursor = page.size === 100 ? page.docs.at(-1) : null;
    } while (cursor);
    return NextResponse.json({ success: true, sweptCount });
  } catch (error) { return apiError(error); }
}
