import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    const { ticket } = await req.json();

    const ISSUER_EMAIL = process.env.GOOGLE_CLIENT_EMAIL; 
    const ISSUER_ID = process.env.GOOGLE_ISSUER_ID;
    const CLASS_ID = process.env.GOOGLE_CLASS_ID;
    let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

    // 1. SAFETY CHECK
    if (!PRIVATE_KEY || !ISSUER_EMAIL || !ISSUER_ID || !CLASS_ID) {
      throw new Error("Missing Google Wallet environment variables in Vercel.");
    }

    // 2. VERCEL KEY FIX: Strip accidental quotes and fix line breaks
    PRIVATE_KEY = PRIVATE_KEY.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

    // Clean the ticket ID to ensure no hidden spaces break the Google URL
    const cleanTicketID = ticket.ticketID.replace(/[^a-zA-Z0-9]/g, '');
    
    // We add "-V2" just to force Google to create a fresh ticket, bypassing any cached broken ones
    const objectId = `${ISSUER_ID}.${cleanTicketID}-V2`;
    
    // 3. THE TICKET PAYLOAD
    const passObject = {
      id: objectId,
      classId: `${ISSUER_ID}.${CLASS_ID}`,
      state: "ACTIVE",
      hexBackgroundColor: ticket.passType.includes("Full") ? "#e11d48" : "#4f46e5", // Pink or Violet!
      barcode: {
        type: "QR_CODE",
        value: ticket.ticketID,
        alternateText: ticket.ticketID,
        renderEncoding: "UTF_8" // Forces the QR code to render
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

    // 4. SIGN AND SEND
    const token = jwt.sign(claims, PRIVATE_KEY, { algorithm: "RS256" });
    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

    return NextResponse.json({ url: saveUrl });

  } catch (error) {
    console.error("Google Wallet Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}