import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, apiError, authenticate, documentId, draftKey, requireRoom, requestBody } from "@/lib/room-server";
import { GENDERS, ROOM_LOCK_TTL, roomState, roomUpdate } from "@/lib/rooms";

export async function POST(req) {
  try {
    const actor = await authenticate(req, ["ambassador", "superadmin"]);
    const body = await requestBody(req);
    if (!["lock", "unlock", "details"].includes(body.action)) throw new ApiError("invalidInput");
    const ids = body.action === "unlock" ? (body.draftIds || [body.draftId]) : [body.draftId];
    if (!Array.isArray(ids) || !ids.length || ids.length > 100) throw new ApiError("invalidInput");
    const draftIds = [...new Set(ids.map(documentId))];
    const targetId = body.action !== "unlock" ? documentId(body.roomId) : null;
    if (targetId && (typeof body.name !== "string" || !body.name.trim() || body.name.length > 150 || !GENDERS.includes(body.gender || "unspecified"))) throw new ApiError("invalidInput");

    const result = await adminDb.runTransaction(async tx => {
      const refs = draftIds.map(id => adminDb.collection("room_drafts").doc(draftKey(actor.uid, id)));
      const drafts = await tx.getAll(...refs);
      const roomIds = new Set(targetId ? [targetId] : []);
      drafts.forEach(snap => { if (snap.data()?.state === "held" && snap.data().roomId) roomIds.add(snap.data().roomId); });
      const snapshots = roomIds.size ? await tx.getAll(...[...roomIds].map(id => adminDb.collection("rooms").doc(id))) : [];
      const now = Date.now(); // Re-evaluated on every transaction retry.
      const states = new Map(snapshots.filter(s => s.exists).map(s => [s.id, { ref: s.ref, room: s.data(), state: roomState(s.data(), now) }]));
      if (targetId && drafts[0].data()?.state === "finalized") throw new ApiError("alreadyFinalized", 409);
      const target = targetId ? states.get(targetId) : null;
      const currentLock = target?.state.locks.find(lock => lock.ownerId === actor.uid && lock.draftId === draftIds[0]);
      if (body.action === "details" && (!currentLock || drafts[0].data()?.state !== "held" || drafts[0].data().roomId !== targetId)) throw new ApiError("lockExpired", 409);
      if (targetId) {
        requireRoom(snapshots.find(s => s.id === targetId));
        if (target.room.isBlocked) throw new ApiError("roomBlocked", 409);
      }
      // The per-owner draft document serializes moves, unlocks and finalization.
      for (const { state } of states.values()) {
        state.locks = state.locks.filter(lock => !(lock.ownerId === actor.uid && draftIds.includes(lock.draftId)));
      }
      let expiresAt = null;
      if (target) {
        if (target.state.occupants.length + target.state.locks.length >= target.room.capacity) throw new ApiError("roomFull", 409);
        expiresAt = body.action === "details" ? currentLock.expiresAt : now + ROOM_LOCK_TTL;
        target.state.locks.push({ ownerId: actor.uid, draftId: draftIds[0], name: body.name.trim(), gender: body.gender || "unspecified", expiresAt, days: 3 });
      }
      for (const { ref, room, state } of states.values()) tx.update(ref, roomUpdate(room, state));
      drafts.forEach((snap, index) => {
        if (snap.data()?.state === "finalized") return; // Closing a successful draft cannot evict a ticket.
        tx.set(refs[index], { ownerId: actor.uid, draftId: draftIds[index], roomId: targetId, state: targetId ? "held" : "released", expiresAt, updatedAt: now });
      });
      return { expiresAt, roomId: targetId, accommodation: target?.room.hotelId || "None" };
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) { return apiError(error); }
}
