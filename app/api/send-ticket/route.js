import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET() {
  return NextResponse.json({ message: "Success! The send-ticket API is awake and routing correctly." });
}

export async function POST(request) {
  console.log("📨 POST request received at /api/send-ticket");

  try {
    const body = await request.json();
    const { email, ticket, pdfAttachment } = body;

    // 1. Strict Validation
    if (!email || !ticket || !pdfAttachment) {
      console.error("Missing fields:", { email: !!email, ticket: !!ticket, pdf: !!pdfAttachment });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Transporter Setup
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
      },
    });

    const base64Data = pdfAttachment.split('base64,')[1];

    // 3. Clean English-Only Email Template
    const mailOptions = {
      from: `"Summer Salsa Fest" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER, // Ensures replies go to your inbox
      to: email,
      subject: `🎟️ Your Summer Salsa Fest Pass: ${ticket.passType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
          <h2 style="color: #e11d48; text-transform: uppercase; margin-bottom: 5px;">You're going to Summer Salsa Fest!</h2>
          <p>Hi <strong>${ticket.userName}</strong>,</p>
          <p>Your <strong>${ticket.passType}</strong> has been confirmed. You can find your official pass attached to this email.</p>
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
          filename: `SalsaFest_Pass_${ticket.passType.replace(/\s+/g, '_')}_${ticket.userName.replace(/\s+/g, '_')}.pdf`,
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