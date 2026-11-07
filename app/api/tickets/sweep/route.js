import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { apiError } from "@/lib/room-server";

export async function GET(req) {
  try {
    // Only allow sweeping via cron or authorized request
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate time 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Find pending tickets older than 2 hours
    const staleTicketsSnap = await adminDb.collection("tickets")
      .where("status", "==", "pending")
      .where("purchaseDate", "<", twoHoursAgo)
      .get();

    if (staleTicketsSnap.empty) {
      return NextResponse.json({ success: true, deleted: 0, message: "No stale tickets found." });
    }

    const batch = adminDb.batch();
    staleTicketsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      deleted: staleTicketsSnap.size,
      message: `Cleaned up ${staleTicketsSnap.size} stale pending tickets.` 
    });

  } catch (error) {
    return apiError(error);
  }
}