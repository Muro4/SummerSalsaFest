import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    const { ticket } = await req.json();

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

    const token = jwt.sign(claims, PRIVATE_KEY, { algorithm: "RS256" });
    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

    return NextResponse.json({ url: saveUrl });

  } catch (error) {
    console.error("Google Wallet Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}