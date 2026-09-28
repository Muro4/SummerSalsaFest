import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getPriceAtDate } from "@/lib/pricing";
import { getActiveFestivalYear, generateTicketID } from "@/lib/utils";
import { ApiError, apiError, authenticate, documentId, draftKey, requireRoom, requestBody } from "@/lib/room-server";
import { GENDERS, roomState, roomUpdate } from "@/lib/rooms";

const PUBLIC_PASSES = ["Full Pass", "Party Pass", "Day Pass"];
const STAFF_PASSES = [...PUBLIC_PASSES, "Performers Pass", "Free Full Pass", "Free Pass"];

export async function POST(req) {
  try {
    const actor = await authenticate(req);
    const { tickets, isGuest, isAmbassadorRegistration } = await requestBody(req);
    const staff = ["ambassador", "superadmin"].includes(actor.role);
    if (isAmbassadorRegistration && !staff) throw new ApiError("forbidden", 403);
    const registration = !!isAmbassadorRegistration && staff;
    if (!Array.isArray(tickets) || !tickets.length || tickets.length > (staff ? 100 : 5)) throw new ApiError("invalidInput");
    const year = getActiveFestivalYear();
    const seenDrafts = new Set();
    const prepared = tickets.map(ticket => {
      if (!ticket || typeof ticket.userName !== "string" || ticket.userName.trim().length < 2 || ticket.userName.length > 150 ||
          !/^[\p{L}\s\-']+$/u.test(ticket.userName) || !(staff ? STAFF_PASSES : PUBLIC_PASSES).includes(ticket.passType) ||
          !GENDERS.includes(ticket.gender || "unspecified")) throw new ApiError("invalidInput");
      if ((ticket.roomId || (ticket.accommodation && ticket.accommodation !== "None")) && !registration) throw new ApiError("forbidden", 403);
      if (ticket.accommodation && ticket.accommodation !== "None" && !ticket.roomId) throw new ApiError("assignmentMismatch", 409);
      const draftId = registration ? documentId(ticket.draftId) : null;
      if (draftId && seenDrafts.has(draftId)) throw new ApiError("invalidInput");
      if (draftId) seenDrafts.add(draftId);
      const key = draftId ? draftKey(actor.uid, draftId) : null;
      return {
        input: ticket, draftId,
        roomId: ticket.roomId ? documentId(ticket.roomId) : null,
        draftRef: key ? adminDb.collection("room_drafts").doc(key) : null,
        ticketRef: key ? adminDb.collection("tickets").doc(`draft_${key}`) : adminDb.collection("tickets").doc(),
      };
    });

    const result = await adminDb.runTransaction(async tx => {
      // All reads precede all writes, including ID collision checks and room reads.
      const drafts = registration ? await tx.getAll(...prepared.map(item => item.draftRef)) : [];
      const existingTickets = await tx.getAll(...prepared.map(item => item.ticketRef));
      if (existingTickets.every(s => s.exists)) return existingTickets.map(s => ({ id: s.id, ticketID: s.data().ticketID }));
      if (existingTickets.some(s => s.exists) || drafts.some(s => s.data()?.state === "finalized")) throw new ApiError("alreadyFinalized", 409);

      let guard;
      if (!staff) {
        guard = adminDb.collection("ticket_purchase_guards").doc(`${actor.uid}_${year}`);
        await tx.get(guard);
        const owned = await tx.get(adminDb.collection("tickets").where("userId", "==", actor.uid).where("festivalYear", "==", year));
        if (owned.size + tickets.length > 5) throw new ApiError("purchaseLimit", 403);
      }

      const roomIds = [...new Set(prepared.map(item => item.roomId).filter(Boolean))];
      const roomSnapshots = roomIds.length ? await tx.getAll(...roomIds.map(id => adminDb.collection("rooms").doc(id))) : [];
      const states = new Map(roomSnapshots.map(snapshot => {
        const room = requireRoom(snapshot);
        return [snapshot.id, { ref: snapshot.ref, room }];
      }));

      const codes = new Set();
      for (const item of prepared) {
        // Reserve the display ID as well as checking pre-migration tickets.
        let code;
        let unique = false;
        for (let attempt = 0; attempt < 20 && !unique; attempt++) {
          code = generateTicketID();
          if (codes.has(code)) continue;
          const ref = adminDb.collection("ticket_codes").doc(code);
          const reservation = await tx.get(ref);
          const legacy = await tx.get(adminDb.collection("tickets").where("ticketID", "==", code).limit(1));
          if (!reservation.exists && legacy.empty) { unique = true; item.codeRef = ref; }
        }
        if (!unique) throw new ApiError("serverError", 503);
        item.code = code;
        codes.add(code);
      }

      const now = Date.now();
      const timestamp = new Date(now).toISOString();
      for (const entry of states.values()) entry.state = roomState(entry.room, now);
      const documents = prepared.map((item, index) => {
        const input = item.input;
        const draft = drafts[index]?.data();
        const entry = item.roomId ? states.get(item.roomId) : null;
        if (entry) {
          if (entry.room.isBlocked) throw new ApiError("roomBlocked", 409);
          const lock = entry.state.locks.find(l => l.ownerId === actor.uid && l.draftId === item.draftId);
          if (!lock || draft?.state !== "held" || draft.roomId !== item.roomId || draft.expiresAt <= now) throw new ApiError("lockExpired", 409);
          if (entry.state.occupants.length + entry.state.locks.length > entry.room.capacity) throw new ApiError("roomFull", 409);
          entry.state.locks = entry.state.locks.filter(l => l !== lock);
        } else if (draft?.state === "held") {
          throw new ApiError("assignmentMismatch", 409);
        }
        const price = input.passType === "Free Full Pass" ? 0 : getPriceAtDate(input.passType);
        const status = price === 0 || registration ? "active" : "pending";
        const ticket = {
          userId: actor.uid, userName: input.userName.trim().toUpperCase(),
          guestEmail: isGuest ? String(input.guestEmail || "").trim().toLowerCase() : actor.email,
          isGuest: !!isGuest, passType: input.passType, price,
          commission: registration && input.passType === "Full Pass" ? 10 : 0,
          accommodation: entry?.room.hotelId || "None", roomId: item.roomId,
          accommodationPrice: entry ? 3 * (entry.room.pricePerPersonPerNight || 0) : 0,
          days: entry ? 3 : 0, gender: input.gender || "unspecified",
          ambassadorId: registration ? actor.uid : null, ambassadorName: registration ? actor.name : null,
          draftId: item.draftId, status, festivalYear: year,
          purchaseDate: timestamp, paymentConfirmedAt: status === "active" ? timestamp : null,
          emailSentCount: 0, ticketID: item.code,
        };
        if (entry) entry.state.occupants.push({
          id: item.ticketRef.id, ticketId: item.ticketRef.id, ticketID: item.code,
          name: ticket.userName, gender: ticket.gender, passType: ticket.passType,
          ambassadorId: actor.uid, ambassadorName: actor.name, days: 3,
        });
        return ticket;
      });

      for (const { ref, room, state } of states.values()) tx.update(ref, roomUpdate(room, state));
      prepared.forEach((item, index) => {
        tx.create(item.ticketRef, documents[index]);
        tx.create(item.codeRef, { ticketId: item.ticketRef.id });
        if (item.draftRef) tx.set(item.draftRef, { ownerId: actor.uid, draftId: item.draftId, state: "finalized", roomId: item.roomId, ticketId: item.ticketRef.id, expiresAt: null, updatedAt: now });
      });
      if (guard) tx.set(guard, { updatedAt: now });
      return prepared.map(item => ({ id: item.ticketRef.id, ticketID: item.code }));
    });
    return NextResponse.json({ success: true, tickets: result });
  } catch (error) { return apiError(error); }
}
