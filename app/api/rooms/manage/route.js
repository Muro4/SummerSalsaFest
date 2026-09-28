import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { ApiError, apiError, authenticate, documentId, requireRoom, requestBody } from "@/lib/room-server";
import { CONFIRMED_TICKET_STATUSES, HOTELS, ROOM_TYPES, roomState, roomUpdate } from "@/lib/rooms";
import { BOARD_OPTIONS } from "@/lib/constants";

function roomFields(body) {
  const { hotelId, roomNumber, capacity, pricePerPersonPerNight, roomType, board = "none" } = body;
  if (!HOTELS.includes(hotelId) || typeof roomNumber !== "string" || !roomNumber.trim() || roomNumber.length > 80 ||
      !Number.isInteger(capacity) || capacity < 1 || capacity > 20 ||
      !Number.isFinite(pricePerPersonPerNight) || pricePerPersonPerNight < 0 || !ROOM_TYPES.includes(roomType) || !BOARD_OPTIONS.includes(board)) throw new ApiError("invalidInput");
  return { hotelId, roomNumber: roomNumber.trim(), capacity, pricePerPersonPerNight, roomType, board };
}

export async function POST(req) {
  try {
    await authenticate(req, ["superadmin"]);
    const body = await requestBody(req);
    if (body.action === "financials") {
      if (!Array.isArray(body.hotels) || !body.hotels.length || body.hotels.length > HOTELS.length ||
          new Set(body.hotels.map(hotel => hotel?.hotelId)).size !== body.hotels.length) throw new ApiError("invalidInput");
      const rates = {};
      const deposits = {};
      for (const hotel of body.hotels) {
        if (!hotel || !HOTELS.includes(hotel.hotelId) || !Number.isFinite(hotel.defaultRate) || hotel.defaultRate < 0 ||
            !Number.isFinite(hotel.deposit) || hotel.deposit < 0 || !Number.isFinite(hotel.adjustments)) throw new ApiError("invalidInput");
        rates[hotel.hotelId] = { defaultRate: hotel.defaultRate, adjustments: hotel.adjustments };
        deposits[hotel.hotelId] = hotel.deposit;
      }
      await adminDb.runTransaction(async tx => {
        const ratesRef = adminDb.collection("settings").doc("hotel_financials");
        const depositsRef = adminDb.collection("settings").doc("hotel_deposits");
        const [oldRates, oldDeposits] = await tx.getAll(ratesRef, depositsRef);
        tx.set(ratesRef, { ...oldRates.data(), ...rates });
        tx.set(depositsRef, { ...oldDeposits.data(), ...deposits });
      });
      return NextResponse.json({ success: true });
    }
    if (body.action === "deposit") {
      if (!HOTELS.includes(body.hotelId) || !Number.isFinite(body.amount) || body.amount < 0) throw new ApiError("invalidInput");
      await adminDb.collection("settings").doc("hotel_deposits").set({ [body.hotelId]: body.amount }, { merge: true });
      return NextResponse.json({ success: true });
    }
    if (body.action === "create") {
      const fields = roomFields(body);
      const ref = adminDb.collection("rooms").doc();
      await ref.create({ ...fields, ...roomUpdate(fields, { occupants: [], locks: [] }), isBlocked: false });
      return NextResponse.json({ success: true, roomId: ref.id });
    }
    if (body.action === "evictOrphan") {
      const ref = adminDb.collection("rooms").doc(documentId(body.roomId));
      const id = documentId(body.occupantId);
      await adminDb.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        const room = requireRoom(snapshot);
        const state = roomState(room, Date.now());
        const occupant = state.occupants.find(occ => String(occ.id) === id);
        if (!occupant) throw new ApiError("assignmentMismatch", 409);
        const ticket = await tx.get(adminDb.collection("tickets").doc(documentId(occupant.ticketId || id)));
        const byCode = await tx.get(adminDb.collection("tickets").where("ticketID", "==", occupant.ticketID || id).limit(1));
        if (ticket.exists || !byCode.empty) throw new ApiError("assignmentMismatch", 409);
        state.occupants = state.occupants.filter(occ => occ !== occupant);
        tx.update(ref, roomUpdate(room, state));
      });
    } else if (["assign", "evict", "days"].includes(body.action)) {
      const ticketRef = adminDb.collection("tickets").doc(documentId(body.ticketId));
      await adminDb.runTransaction(async tx => {
        const ticketSnap = await tx.get(ticketRef);
        if (!ticketSnap.exists) throw new ApiError("ticketMissing", 404);
        const ticket = ticketSnap.data();
        const targetId = body.action === "assign" ? documentId(body.roomId) : body.action === "days" ? (ticket.roomId || body.sourceRoomId) : null;
        const sourceId = ticket.roomId || body.sourceRoomId;
        const ids = [...new Set([sourceId, targetId].filter(Boolean).map(documentId))];
        const snaps = ids.length ? await tx.getAll(...ids.map(id => adminDb.collection("rooms").doc(id))) : [];
        const now = Date.now();
        const entries = new Map(snaps.map(snap => {
          const room = requireRoom(snap);
          return [snap.id, { ref: snap.ref, room, state: roomState(room, now) }];
        }));
        const isTicket = occ => occ.ticketId === ticketSnap.id || occ.id === ticketSnap.id || occ.id === ticket.ticketID;
        const source = entries.get(sourceId);
        if (sourceId && !source?.state.occupants.some(isTicket)) throw new ApiError("assignmentMismatch", 409);
        if (body.action === "days" && !source) throw new ApiError("assignmentMismatch", 409);
        const days = body.days ?? (ticket.days || 3);
        if (!Number.isInteger(days) || days < 1 || days > 14) throw new ApiError("invalidInput");
        if (source) source.state.occupants = source.state.occupants.filter(occ => !isTicket(occ));
        const target = entries.get(targetId);
        if (target) {
          if (!CONFIRMED_TICKET_STATUSES.includes(ticket.status)) throw new ApiError("ticketInactive", 409);
          if (target.room.isBlocked && sourceId !== targetId) throw new ApiError("roomBlocked", 409);
          if (target.state.occupants.length + target.state.locks.length >= target.room.capacity) throw new ApiError("roomFull", 409);
          target.state.occupants.push({
            id: ticketSnap.id, ticketId: ticketSnap.id, ticketID: ticket.ticketID || ticketSnap.id,
            name: ticket.userName || "", gender: ticket.gender || "unspecified", passType: ticket.passType || "",
            ambassadorId: ticket.ambassadorId || ticket.userId || null, ambassadorName: ticket.ambassadorName || "", days,
          });
        }
        for (const { ref, room, state } of entries.values()) tx.update(ref, roomUpdate(room, state));
        tx.update(ticketRef, { roomId: targetId || null, accommodation: target?.room.hotelId || "None", days: target ? days : 0, accommodationPrice: target ? days * (target.room.pricePerPersonPerNight || 0) : 0 });
      });
    } else {
      if (!["update", "block", "delete"].includes(body.action)) throw new ApiError("invalidInput");
      const ref = adminDb.collection("rooms").doc(documentId(body.roomId));
      await adminDb.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        const room = requireRoom(snapshot);
        const state = roomState(room, Date.now());
        if (body.action === "delete") {
          if (state.used) throw new ApiError("roomInUse", 409);
          tx.delete(ref);
        } else if (body.action === "block") {
          if (typeof body.isBlocked !== "boolean") throw new ApiError("invalidInput");
          tx.update(ref, { ...roomUpdate(room, state), isBlocked: body.isBlocked });
        } else {
          const fields = roomFields(body);
          if (fields.capacity < state.used) throw new ApiError("capacityInUse", 409);
          // Hotel and tariff changes would invalidate already sold bundles.
          if (state.used && (fields.hotelId !== room.hotelId || fields.pricePerPersonPerNight !== room.pricePerPersonPerNight)) throw new ApiError("roomInUse", 409);
          tx.update(ref, { ...fields, ...roomUpdate(fields, state) });
        }
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
