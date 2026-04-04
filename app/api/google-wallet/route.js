import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { adminAuth, adminDb } from '@/lib/firebase-admin'; // <-- IMPORT adminDb

export async function POST(req) {
  console.log("💳 POST request received at /api/google-wallet");

  try {
    // =======================================================================
    // 🔒 SECURITY CHECK: VERIFY FIREBASE TOKEN
    // =======================================================================
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("❌ Unauthorized: No token provided");
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      // Verify the token is real and belongs to an active user
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log(`✅ Authorized wallet request from user ID: ${decodedToken.uid}`);
    } catch (authError) {
      console.error("❌ Unauthorized: Invalid token", authError.message);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    // =======================================================================

    const { ticket } = await req.json();

    // 1. Strict Validation
    if (!ticket || !ticket.id) {
      return NextResponse.json({ error: 'Missing ticket data' }, { status: 400 });
    }

    // 2. Fetch the REAL ticket from the database to prevent spoofing
    const ticketDoc = await adminDb.collection("tickets").doc(ticket.id).get();
    
    if (!ticketDoc.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticketData = ticketDoc.data();

    // 3. Verify ownership (or allow if the user is an admin)
    const isOwner = ticketData.userId === decodedToken.uid;
    const isAdmin = decodedToken.role === 'admin' || decodedToken.role === 'superadmin';

    if (!isOwner && !isAdmin) {
      console.error(`❌ Forbidden: User ${decodedToken.uid} attempted to add ticket owned by ${ticketData.userId} to wallet`);
      return NextResponse.json({ error: 'Forbidden: You do not own this ticket' }, { status: 403 });
    }

    const ISSUER_EMAIL = process.env.GOOGLE_CLIENT_EMAIL; 
    const ISSUER_ID = process.env.GOOGLE_ISSUER_ID;
    const CLASS_ID = process.env.GOOGLE_CLASS_ID;
    let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

    if (!PRIVATE_KEY || !ISSUER_EMAIL || !ISSUER_ID || !CLASS_ID) {
      throw new Error("Missing Google Wallet environment variables.");
    }

    // Fix Vercel's environment variable formatting
    PRIVATE_KEY = PRIVATE_KEY.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

    // Clean the ticket ID using VERIFIED ticket data
    const cleanTicketID = ticketData.ticketID.replace(/[^a-zA-Z0-9]/g, '');
    
    // THE FIX: Append Date.now() so Google NEVER caches a failed attempt
    const objectId = `${ISSUER_ID}.${cleanTicketID}-${Date.now()}`;
    
    // Use REAL DATABASE DATA (ticketData) for the pass, NOT the client's payload
    const passObject = {
      id: objectId,
      classId: `${ISSUER_ID}.${CLASS_ID}`,
      state: "ACTIVE",
      hexBackgroundColor: ticketData.passType.includes("Full") ? "#e11d48" : "#4f46e5",
      barcode: {
        type: "QR_CODE",
        value: ticketData.ticketID,
        alternateText: ticketData.ticketID,
        renderEncoding: "UTF_8"
      },
      ticketHolderName: ticketData.userName,
      ticketType: {
        defaultValue: { language: "en", value: ticketData.passType }
      }
    };

    const claims = {
      iss: ISSUER_EMAIL,
      aud: "google",
      typ: "savetowallet",
      origins: [],
      payload: {
        eventTicketObjects: [passObject]
      }
    };

    const jwtToken = jwt.sign(claims, PRIVATE_KEY, { algorithm: "RS256" });
    const saveUrl = `https://pay.google.com/gp/v/save/${jwtToken}`;

    return NextResponse.json({ url: saveUrl });

  } catch (error) {
    console.error("❌ Google Wallet Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}