import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminAuth } from '@/lib/firebase-admin'; // <-- IMPORT ADMIN SDK

// VERCEL FIX: Tell Vercel to allow this function to run for up to 60 seconds
export const maxDuration = 60;

export async function POST(request) {
  console.log("📨 POST request received at /api/send-reply");

  try {
    // =======================================================================
    // 🔒 SECURITY CHECK: VERIFY FIREBASE TOKEN & ADMIN ROLE
    // =======================================================================
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("❌ Unauthorized: No token provided");
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      // Verify the token is real and not forged
      const decodedToken = await adminAuth.verifyIdToken(token);
      console.log(`✅ Authorized request from user ID: ${decodedToken.uid}`);
      
      // STRICT ROLE CHECK: Only Admins can send replies
      if (decodedToken.role !== 'admin' && decodedToken.role !== 'superadmin') {
         console.error(`❌ Forbidden: User ${decodedToken.uid} is not an admin.`);
         return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
      }

    } catch (authError) {
      console.error("❌ Unauthorized: Invalid token", authError.message);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    // =======================================================================

    const { email, name, subject, replyText, originalMessage } = await request.json();

    if (!email || !replyText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, // NOTE: MUST BE A GOOGLE APP PASSWORD IN VERCEL
      },
    });

    const mailOptions = {
      from: `"Summer Salsa Fest" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Re: ${subject} - Summer Salsa Fest`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <p>Hi <strong>${name}</strong>,</p>
          <p style="white-space: pre-wrap; line-height: 1.6;">${replyText}</p>
          <br/>
          <p><strong>- The Summer Salsa Fest Team</strong></p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0 20px 0;" />
          
          <p style="font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px;">On ${new Date().toLocaleDateString()}, you wrote:</p>
          <blockquote style="border-left: 3px solid #e11d48; margin: 0; padding-left: 15px; font-size: 13px; color: #666; white-space: pre-wrap; background: #f9f9f9; padding: 15px;">
            ${originalMessage}
          </blockquote>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Reply email sent successfully to:", email);
    
    return NextResponse.json({ success: true, message: 'Email sent successfully' }, { status: 200 });

  } catch (error) {
    console.error('❌ Email sending error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}