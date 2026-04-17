import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getPriceAtDate } from "@/lib/pricing";
import { getActiveFestivalYear, generateTicketID } from "@/lib/utils";

export async function POST(req) {
  try {
    const body = await req.json();
    const { tickets, isGuest } = body;

    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json({ error: "No tickets provided" }, { status: 400 });
    }

    /* Authentication and Role Verification */
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
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentFestivalYear = getActiveFestivalYear();

    /* Server-Side Purchase Limit Enforcement */
    if (userRole !== 'ambassador' && userRole !== 'superadmin') {
      const existingTicketsSnap = await adminDb.collection("tickets")
        .where("userId", "==", userId)
        .where("festivalYear", "==", currentFestivalYear)
        .get();
        
      if (existingTicketsSnap.size + tickets.length > 5) {
        return NextResponse.json({ error: "Limit exceeded: Max 5 passes per user." }, { status: 403 });
      }
    }

    /* Ticket Generation and Database Insertion */
    const batch = adminDb.batch();

    for (const t of tickets) {
      const securePrice = getPriceAtDate(t.passType);
      
      let isUnique = false;
      let finalTicketID = "";
      while (!isUnique) {
        finalTicketID = generateTicketID();
        const idSnap = await adminDb.collection("tickets").where("ticketID", "==", finalTicketID).limit(1).get();
        if (idSnap.empty) isUnique = true;
      }

      /* Free passes bypass the payment gateway and are activated immediately */
      const initialStatus = securePrice === 0 ? "active" : "pending";
      const timestamp = new Date().toISOString();

      const ticketRef = adminDb.collection("tickets").doc();
      batch.set(ticketRef, {
        userId: userId,
        userName: t.userName.trim().toUpperCase(),
        guestEmail: isGuest ? (t.guestEmail || "").trim().toLowerCase() : userEmail,
        isGuest: !!isGuest,
        passType: t.passType,
        price: securePrice,
        status: initialStatus,
        festivalYear: currentFestivalYear,
        purchaseDate: timestamp,
        paymentConfirmedAt: initialStatus === "active" ? timestamp : null,
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