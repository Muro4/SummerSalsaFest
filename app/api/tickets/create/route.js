import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getPriceAtDate } from "@/lib/pricing";
import { getActiveFestivalYear, generateTicketID } from "@/lib/utils";

export async function POST(req) {
  try {
    const body = await req.json();
    const { tickets, isGuest, guestSessionId } = body;

    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json({ error: "No tickets provided" }, { status: 400 });
    }

    // 1. Authentication & Identification
    const authHeader = req.headers.get('authorization');
    let decodedToken = null;
    let userId = null;
    let userRole = 'user';
    let userEmail = "";

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
      userEmail = decodedToken.email || "";
      
      const userDoc = await adminDb.collection("users").doc(userId).get();
      if (userDoc.exists) userRole = userDoc.data().role || 'user';
    } else if (isGuest && guestSessionId) {
      userId = guestSessionId;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentFestivalYear = getActiveFestivalYear();

    // 2. SERVER-SIDE LIMIT ENFORCEMENT (Fixes Vuln #3)
    if (userRole !== 'ambassador' && userRole !== 'superadmin') {
      const existingTicketsSnap = await adminDb.collection("tickets")
        .where("userId", "==", userId)
        .where("festivalYear", "==", currentFestivalYear)
        .get();
        
      if (existingTicketsSnap.size + tickets.length > 5) {
        return NextResponse.json({ error: "Limit exceeded: Max 5 passes per user." }, { status: 403 });
      }
    }

    // 3. SECURE CREATION & PRICING
    const batch = adminDb.batch();

    for (const t of tickets) {
      // 🔒 SECURITY FIX: The Server dictates the price, ignoring the client!
      const securePrice = getPriceAtDate(t.passType);
      
      // Ensure Unique ID
      let isUnique = false;
      let finalTicketID = "";
      while (!isUnique) {
        finalTicketID = generateTicketID();
        const idSnap = await adminDb.collection("tickets").where("ticketID", "==", finalTicketID).limit(1).get();
        if (idSnap.empty) isUnique = true;
      }

      const ticketRef = adminDb.collection("tickets").doc();
      batch.set(ticketRef, {
        userId: userId,
        userName: t.userName.trim().toUpperCase(),
        guestEmail: isGuest ? (t.guestEmail || "").trim().toLowerCase() : userEmail,
        isGuest: !!isGuest,
        passType: t.passType,
        price: securePrice, // Sever calculated price
        status: "pending",
        festivalYear: currentFestivalYear,
        purchaseDate: new Date().toISOString(),
        emailSentCount: 0,
        ticketID: finalTicketID
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ticket Creation Error:", error);
    return NextResponse.json({ error: "Failed to create tickets" }, { status: 500 });
  }
}