// Shared by the server and the live room views. Expired holds never consume capacity.
export const ROOM_LOCK_TTL = 10 * 60 * 1000;
export { FESTIVAL_HOTELS as HOTELS } from "./constants";
export const GENDERS = ["unspecified", "female", "male", "other"];
export const ROOM_TYPES = ["single", "double", "triple", "quad", "shared"];
export const CONFIRMED_TICKET_STATUSES = ["active", "used", "checked-in", "paid"];

export function roomType(room) {
  return ROOM_TYPES.includes(room.roomType) ? room.roomType : ({ 1: "single", 2: "double", 3: "triple", 4: "quad" }[room.capacity] || "shared");
}

export function roomState(room, now = Date.now()) {
  const legacyLocks = room.lockExpirations || {};
  const locks = [...(room.locks || [])];
  const occupants = [];
  for (const entry of room.occupants || []) {
    if (!entry) continue;
    const occupant = typeof entry === "string" ? { id: entry, days: 3 } : entry;
    // Only legacy entries explicitly marked temporary are migrated. Never expire a ticket.
    if (!occupant.ticketId && Object.hasOwn(legacyLocks, String(occupant.id))) {
      locks.push({ ...occupant, draftId: String(occupant.id), ownerId: null, expiresAt: legacyLocks[occupant.id] });
    } else {
      occupants.push(occupant);
    }
  }
  const activeLocks = locks.filter(lock => Number(lock.expiresAt) > now);
  const used = occupants.length + activeLocks.length;
  return { occupants, locks: activeLocks, used, available: room.isBlocked ? 0 : Math.max(0, room.capacity - used) };
}

export function roomUpdate(room, state) {
  return {
    schemaVersion: 2,
    occupants: state.occupants,
    locks: state.locks,
    lockExpirations: {},
    status: state.occupants.length + state.locks.length >= room.capacity ? "full" : "available",
  };
}

export function remainingTime(expiresAt, now) {
  const seconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
