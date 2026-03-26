import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    const { ticket } = await req.json();

    // 1. Pulling your secure keys from .env.local
    const ISSUER_EMAIL = process.env.GOOGLE_CLIENT_EMAIL; 
    // We replace string literal \n with actual line breaks so the crypto library can read the key
    const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const ISSUER_ID = process.env.GOOGLE_ISSUER_ID;
    const CLASS_ID = process.env.GOOGLE_CLASS_ID;

    // 2. Define the specific Event Ticket Object
    const objectId = `${ISSUER_ID}.${ticket.ticketID}`;
    
    const passObject = {
      id: objectId,
      classId: `${ISSUER_ID}.${CLASS_ID}`,
      state: "ACTIVE",
      barcode: {
        type: "QR_CODE",
        value: ticket.ticketID, // Your Gate Scanner will read this!
        alternateText: ticket.ticketID
      },
      ticketHolderName: ticket.userName,
      ticketType: {
        defaultValue: { language: "en", value: ticket.passType }
      }
    };

    // 3. Create the claims payload
    const claims = {
      iss: ISSUER_EMAIL,
      aud: "google",
      typ: "savetowallet",
      origins: [], // You can add your live domain here later for extra security
      payload: {
        eventTicketObjects: [passObject] // Crucial: This matches your Event Ticket Class
      }
    };

    // 4. Sign the token
    const token = jwt.sign(claims, PRIVATE_KEY, { algorithm: "RS256" });

    // 5. Generate the official Google Pay save link
    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

    return NextResponse.json({ url: saveUrl });

  } catch (error) {
    console.error("Google Wallet Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate wallet pass" }, { status: 500 });
  }
}