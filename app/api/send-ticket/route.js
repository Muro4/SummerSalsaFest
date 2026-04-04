import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminAuth, adminDb } from '@/lib/firebase-admin'; // <-- IMPORT adminDb

export async function GET() {
  return NextResponse.json({ message: "Success! The send-ticket API is awake and routing correctly." });
}

export async function POST(request) {
  console.log("📨 POST request received at /api/send-ticket");

  try {
    const body = await request.json();
    const { email, ticket, pdfAttachment } = body;

    // 1. Strict Validation
    if (!email || !ticket || !ticket.id || !pdfAttachment) {
      console.error("Missing fields:", { email: !!email, ticket: !!ticket, pdf: !!pdfAttachment });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Fetch the REAL ticket from the database to prevent spoofing
    const ticketDoc = await adminDb.collection("tickets").doc(ticket.id).get();
    
    if (!ticketDoc.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticketData = ticketDoc.data();

    // 3. 🔒 SECURITY CHECK
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // --- LOGGED IN USER FLOW ---
      let decodedToken;
      try {
        const token = authHeader.split('Bearer ')[1];
        decodedToken = await adminAuth.verifyIdToken(token);
      } catch (authError) {
        return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
      }
      
      const isOwner = ticketData.userId === decodedToken.uid;
      const isAdmin = decodedToken.role === 'admin' || decodedToken.role === 'superadmin';

      if (!isOwner && !isAdmin) {
         return NextResponse.json({ error: 'Forbidden: You do not own this ticket' }, { status: 403 });
      }
    } else {
      // --- GUEST FLOW ---
      // Guests do not have an auth header. We only allow this if the ticket is specifically marked as a guest ticket
      // AND the requested email matches the guest email on file in the database.
      if (!ticketData.isGuest || ticketData.guestEmail !== email.toLowerCase()) {
         return NextResponse.json({ error: 'Unauthorized: Missing token or email mismatch' }, { status: 401 });
      }
    }

    // 4. Transporter Setup
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
      },
    });

    const base64Data = pdfAttachment.split('base64,')[1];

    // 5. Use REAL DATABASE DATA (ticketData) for the email, not the client's payload
    const mailOptions = {
      from: `"Summer Salsa Fest" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER, 
      to: email,
      subject: `🎟️ Your Summer Salsa Fest Pass: ${ticketData.passType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
          <h2 style="color: #e11d48; text-transform: uppercase; margin-bottom: 5px;">You're going to Summer Salsa Fest!</h2>
          <p>Hi <strong>${ticketData.userName}</strong>,</p>
          <p>Your <strong>${ticketData.passType}</strong> has been confirmed. You can find your official pass attached to this email.</p>
          <p>Make sure to download the PDF and have the QR code ready on your phone when you arrive at the registration desk.</p>
          <br/>
          <p style="font-size: 16px; margin-top: 10px;">
            💃🕺 See you on the dance floor!
          </p>
          <p style="color: #888; font-size: 12px;">
            <strong>- The Summer Salsa Fest Team</strong>
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `SalsaFest_Pass_${ticketData.passType.replace(/\s+/g, '_')}_${ticketData.userName.replace(/\s+/g, '_')}.pdf`,
          content: base64Data,
          encoding: 'base64',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully to:", email);
    
    return NextResponse.json({ success: true, message: 'Email sent successfully' }, { status: 200 });

  } catch (error) {
    console.error('❌ Email sending error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}