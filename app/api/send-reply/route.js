import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { apiError, authenticate, requestBody } from "@/lib/room-server";
import { emailAddress, boundedText, escapeHtml } from "@/lib/server-validation";

export async function POST(req) {
  try {
    await authenticate(req, ["admin", "superadmin"]);
    const body = await requestBody(req);
    const email = emailAddress(body.email);
    const name = boundedText(body.name, 150, true);
    const subject = boundedText(body.subject, 200, true);
    const reply = boundedText(body.replyText, 10_000);
    const original = boundedText(body.originalMessage, 10_000, true);
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    await transporter.sendMail({
      from: `"Summer Salsa Fest" <${process.env.EMAIL_USER}>`, to: email,
      subject: `Re: ${subject.replace(/[\r\n]/g, " ")} - Summer Salsa Fest`,
      html: `<p>Hi <strong>${escapeHtml(name)}</strong>,</p><p style="white-space:pre-wrap">${escapeHtml(reply)}</p><p>Summer Salsa Fest</p><hr><blockquote style="white-space:pre-wrap">${escapeHtml(original)}</blockquote>`,
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
