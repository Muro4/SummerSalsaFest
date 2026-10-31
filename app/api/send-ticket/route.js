import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, apiError, authenticate, documentId, requestBody } from "@/lib/room-server";
import { emailAddress, escapeHtml } from "@/lib/server-validation";

export async function POST(req) {
  try {
    const actor = await authenticate(req);
    const body = await requestBody(req);
    const email = emailAddress(body.email);
    const id = documentId(body.ticket?.id);
    const pdf = body.pdfAttachment;
    if (typeof pdf !== "string" || pdf.length > 8_000_000 || !/^data:application\/pdf(?:;[^,]*)?;base64,[A-Za-z0-9+/=\r\n]+$/.test(pdf)) throw new ApiError("invalidAttachment");
    const buffer = Buffer.from(pdf.slice(pdf.indexOf("base64,") + 7), "base64");
    if (buffer.subarray(0, 5).toString() !== "%PDF-") throw new ApiError("invalidAttachment");
    const ref = adminDb.collection("tickets").doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new ApiError("ticketMissing", 404);
    const ticket = snapshot.data();
    const admin = ["admin", "superadmin"].includes(actor.role);
    if (ticket.userId !== actor.uid && !admin) throw new ApiError("forbidden", 403);
    if (!["active", "used"].includes(ticket.status)) throw new ApiError("paymentRequired", 409);
    if (actor.anonymous && email !== ticket.guestEmail?.toLowerCase()) throw new ApiError("forbidden", 403);

    // A transactional lease bounds retries and concurrent sends for a ticket.
    const guard = adminDb.collection("ticket_email_guards").doc(id);
    await adminDb.runTransaction(async tx => {
      const previous = await tx.get(guard);
      if ((previous.data()?.nextAllowedAt || 0) > Date.now()) throw new ApiError("rateLimited", 429);
      tx.set(guard, { nextAllowedAt: Date.now() + 30_000 });
    });
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    await transporter.sendMail({
      from: `"Summer Salsa Fest" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER, to: email,
      subject: `Your Summer Salsa Fest Pass: ${ticket.passType}`,
      html: `<p>Hi <strong>${escapeHtml(ticket.userName)}</strong>,</p><p>Your <strong>${escapeHtml(ticket.passType)}</strong> pass is attached. Keep the QR code ready at registration.</p><p>Summer Salsa Fest</p>`,
      attachments: [{ filename: `SalsaFest_Pass_${ticket.ticketID}.pdf`, content: buffer, contentType: "application/pdf" }],
    });
    await adminDb.runTransaction(async tx => {
      const current = await tx.get(ref);
      if (current.exists) tx.update(ref, { emailSentCount: (current.data().emailSentCount || 0) + 1, guestEmail: email, ...(Object.hasOwn(current.data(), "email") ? { email } : {}) });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
