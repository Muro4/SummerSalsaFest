import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export class ApiError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}

export async function requestBody(req) {
  const body = await req.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError("invalidInput");
  return body;
}

export async function authenticate(req, roles) {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) throw new ApiError("unauthorized", 401);
  if (!adminAuth || !adminDb) throw new ApiError("unavailable", 503);
  let token;
  try { token = await adminAuth.verifyIdToken(header.slice(7)); }
  catch { throw new ApiError("unauthorized", 401); }
  const user = await adminDb.collection("users").doc(token.uid).get();
  const profile = user.data() || {};
  const actor = { uid: token.uid, email: token.email || "", role: profile.role || "user", name: profile.ambassadorDisplayName || profile.displayName || token.email || token.uid };
  if (roles && !roles.includes(actor.role)) throw new ApiError("forbidden", 403);
  return actor;
}

export function documentId(value) {
  if ((typeof value !== "string" && typeof value !== "number") || !String(value).trim() || String(value).includes("/") || String(value).length > 128 || [".", ".."].includes(String(value))) throw new ApiError("invalidInput");
  return String(value);
}

export function draftKey(uid, draftId) {
  return createHash("sha256").update(JSON.stringify([uid, documentId(draftId)])).digest("hex");
}

export function requireRoom(snapshot) {
  if (!snapshot?.exists) throw new ApiError("roomMissing", 404);
  const room = snapshot.data();
  if (!Number.isInteger(room.capacity) || room.capacity < 1) throw new ApiError("invalidCapacity", 409);
  return room;
}

export function apiError(error) {
  if (error instanceof SyntaxError) return NextResponse.json({ error: "invalidInput" }, { status: 400 });
  if (!(error instanceof ApiError)) console.error("Room/ticket operation failed:", error);
  return NextResponse.json({ error: error instanceof ApiError ? error.code : "serverError" }, { status: error instanceof ApiError ? error.status : 500 });
}
