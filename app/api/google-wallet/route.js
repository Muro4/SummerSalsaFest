import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { adminAuth } from '@/lib/firebase-admin'; // <-- IMPORT ADMIN SDK

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

    try {
      // Verify the token is real and belongs to an active user
      const decodedToken = await adminAuth.verifyIdToken(token);
      console.log(`✅ Authorized wallet request from user ID: ${decodedToken.uid}`);
    } catch (authError) {
      console.error("❌ Unauthorized: Invalid token", authError.message);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    // =======================================================================

    const { ticket } = await req.json();

    if (!ticket || !ticket.ticketID) {
      return NextResponse.json({ error: 'Missing ticket data' }, { status: 400 });
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

    // Clean the ticket ID
    const cleanTicketID = ticket.ticketID.replace(/[^a-zA-Z0-9]/g, '');
    
    // THE FIX: Append Date.now() so Google NEVER caches a failed attempt
    const objectId = `${ISSUER_ID}.${cleanTicketID}-${Date.now()}`;
    
    const passObject = {
      id: objectId,
      classId: `${ISSUER_ID}.${CLASS_ID}`,
      state: "ACTIVE",
      hexBackgroundColor: ticket.passType.includes("Full") ? "#e11d48" : "#4f46e5",
      barcode: {
        type: "QR_CODE",
        value: ticket.ticketID,
        alternateText: ticket.ticketID,
        renderEncoding: "UTF_8"
      },
      ticketHolderName: ticket.userName,
      ticketType: {
        defaultValue: { language: "en", value: ticket.passType }
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