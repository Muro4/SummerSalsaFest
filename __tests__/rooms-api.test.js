// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryFirestore } from "./helpers/memory-firestore";

const mocked = vi.hoisted(() => ({ db: null, verify: vi.fn() }));
vi.mock("@/lib/firebase-admin", () => ({ get adminDb() { return mocked.db; }, adminAuth: { verifyIdToken: mocked.verify } }));
import { POST as lock } from "@/app/api/rooms/lock/route";
import { POST as createTickets } from "@/app/api/tickets/create/route";
import { GET as sweep } from "@/app/api/rooms/sweep/route";
import { POST as manage } from "@/app/api/rooms/manage/route";
import { draftKey } from "@/lib/room-server";
import { roomState } from "@/lib/rooms";

const req = (body, owner = "amb-a") => new Request("http://localhost/api/test", { method: "POST", headers: { authorization: "Bearer " + owner, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const reserve = (owner = "amb-a", draftId = "draft-a", roomId = "room-a") => lock(req({ action: "lock", roomId, draftId, name: "Test Dancer", gender: "female" }, owner));
const ticket = (draftId = "draft-a", roomId = "room-a") => ({ draftId, roomId, userName: "Test Dancer", passType: "Full Pass", accommodation: roomId ? "Detelina" : "None" });
const finalize = (tickets = [ticket()], owner = "amb-a") => createTickets(req({ tickets, isAmbassadorRegistration: true }, owner));
const read = async (collection, id) => (await mocked.db.collection(collection).doc(id).get()).data();
const seed = (collection, id, data) => mocked.db.collection(collection).doc(id).set(data);
const sweepReq = () => new Request("http://localhost/api/rooms/sweep", { headers: { authorization: "Bearer admin" } });

beforeEach(async () => {
  mocked.db = new MemoryFirestore();
  mocked.verify.mockImplementation(async token => {
    if (token === "invalid") throw new Error("Invalid token");
    return { uid: token, email: token + "@example.com" };
  });
  await Promise.all(["amb-a", "amb-b", "admin", "attendee"].map(uid => seed("users", uid, { role: uid === "admin" ? "superadmin" : uid === "attendee" ? "user" : "ambassador", displayName: uid })));
  await seed("rooms", "room-a", { hotelId: "Detelina", roomNumber: "101", capacity: 1, pricePerPersonPerNight: 60, occupants: [], locks: [], isBlocked: false });
});

describe("room authorization and concurrent allocation", () => {
  it("rejects malformed payloads without an internal error", async () => {
    expect((await lock(req(null))).status).toBe(400);
    expect((await createTickets(req(null))).status).toBe(400);
    expect((await manage(req(null, "admin"))).status).toBe(400);
    expect((await lock(req({ action: "lock", roomId: "../room", draftId: "a", name: "Name" }))).status).toBe(400);
  });
  it("updates hold names and genders without extending their expiry", async () => {
    await reserve();
    const before = (await read("rooms", "room-a")).locks[0];
    expect((await lock(req({ action: "details", roomId: "room-a", draftId: "draft-a", name: "Updated Name", gender: "other" }))).status).toBe(200);
    expect((await read("rooms", "room-a")).locks[0]).toMatchObject({ name: "Updated Name", gender: "other", expiresAt: before.expiresAt });
  });
  it("verifies tokens and roles and rejects arbitrary actions", async () => {
    expect((await reserve("invalid")).status).toBe(401);
    expect((await reserve("attendee")).status).toBe(403);
    expect((await lock(req({ action: "anything", roomId: "room-a", draftId: "a" }))).status).toBe(400);
    expect((await manage(req({ action: "delete", roomId: "room-a" }))).status).toBe(403);
    expect((await sweep(new Request("http://localhost/api/rooms/sweep"))).status).toBe(401);
  });
  it("allows only one of two simultaneous ambassadors to take the last bed", async () => {
    const responses = await Promise.all([reserve(), reserve("amb-b", "draft-b")]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    expect((await read("rooms", "room-a")).locks).toHaveLength(1);
    expect(mocked.db.conflicts).toBeGreaterThan(0);
  });
  it("makes retries/renewals idempotent even when a room is full", async () => {
    await reserve();
    expect((await reserve()).status).toBe(200);
    expect((await read("rooms", "room-a")).locks).toHaveLength(1);
  });
  it("prevents one owner from releasing another owner's hold", async () => {
    await reserve();
    expect((await lock(req({ action: "unlock", draftId: "draft-a" }, "amb-b"))).status).toBe(200);
    expect((await read("rooms", "room-a")).locks).toHaveLength(1);
  });
  it("moves atomically and retains the original bed when a target is full", async () => {
    await seed("rooms", "room-b", { ...(await read("rooms", "room-a")), roomNumber: "102" });
    await reserve();
    await reserve("amb-b", "draft-b", "room-b");
    expect((await reserve("amb-a", "draft-a", "room-b")).status).toBe(409);
    expect((await read("rooms", "room-a")).locks).toHaveLength(1);
    await lock(req({ action: "unlock", draftId: "draft-b" }, "amb-b"));
    expect((await reserve("amb-a", "draft-a", "room-b")).status).toBe(200);
    expect((await read("rooms", "room-a")).locks).toHaveLength(0);
    expect((await read("rooms", "room-b")).locks).toHaveLength(1);
  });
  it("serializes simultaneous moves of the same draft", async () => {
    await seed("rooms", "room-b", { ...(await read("rooms", "room-a")), roomNumber: "102" });
    await Promise.all([reserve(), reserve("amb-a", "draft-a", "room-b")]);
    const states = await Promise.all(["room-a", "room-b"].map(id => read("rooms", id)));
    expect(states.reduce((sum, room) => sum + room.locks.length, 0)).toBe(1);
  });
  it("reclaims expired capacity without requiring the sweeper", async () => {
    await reserve();
    const room = await read("rooms", "room-a");
    await seed("rooms", "room-a", { ...room, locks: room.locks.map(l => ({ ...l, expiresAt: Date.now() - 1 })) });
    expect((await reserve("amb-b", "draft-b")).status).toBe(200);
    expect((await read("rooms", "room-a")).locks[0].ownerId).toBe("amb-b");
  });
});

describe("atomic ticket confirmation and cleanup", () => {
  it("converts a hold to a permanent occupant and is safe to retry concurrently", async () => {
    await reserve();
    const results = await Promise.all([finalize(), finalize()]);
    expect(results.map(r => r.status)).toEqual([200, 200]);
    const room = await read("rooms", "room-a");
    expect(room.locks).toHaveLength(0);
    expect(room.occupants).toHaveLength(1);
    const issued = await mocked.db.collection("tickets").get();
    expect(issued.size).toBe(1);
    expect(room.occupants[0].ticketId).toBe(issued.docs[0].id);
    expect(issued.docs[0].data()).toMatchObject({ roomId: "room-a", accommodation: "Detelina", status: "active", accommodationPrice: 180 });
    await lock(req({ action: "unlock", draftIds: ["draft-a"] }));
    expect((await read("rooms", "room-a")).occupants).toHaveLength(1);
  });
  it("rejects the entire group if even one hold is missing or expired", async () => {
    await reserve();
    expect((await finalize([ticket(), ticket("missing")])).status).toBe(409);
    expect((await mocked.db.collection("tickets").get()).size).toBe(0);
    expect((await read("rooms", "room-a")).locks).toHaveLength(1);
    await seed("room_drafts", draftKey("amb-a", "draft-a"), { ownerId: "amb-a", state: "held", roomId: "room-a", expiresAt: Date.now() - 1 });
    expect((await finalize()).status).toBe(409);
  });
  it("cannot confirm another owner's reservation", async () => {
    await reserve();
    expect((await finalize([ticket()], "amb-b")).status).toBe(409);
    expect((await mocked.db.collection("tickets").get()).size).toBe(0);
  });
  it("supports pass-only drafts and disallows attendee accommodation requests", async () => {
    expect((await finalize([ticket("pass-only", null)])).status).toBe(200);
    const tickets = await mocked.db.collection("tickets").get();
    expect(tickets.docs[0].data()).toMatchObject({ accommodation: "None", roomId: null });
    expect((await createTickets(req({ tickets: [ticket()] }, "attendee"))).status).toBe(403);
  });
  it("serializes cancellation against finalization without leaving orphaned occupancy", async () => {
    await reserve();
    const [created] = await Promise.all([finalize(), lock(req({ action: "unlock", draftId: "draft-a" }))]);
    const room = await read("rooms", "room-a");
    const tickets = await mocked.db.collection("tickets").get();
    expect(room.locks).toHaveLength(0);
    expect(room.occupants.length).toBe(tickets.size);
    expect([200, 409]).toContain(created.status);
  });
  it("sweeps only expired holds, including legacy locks, and preserves confirmed tickets", async () => {
    const past = Date.now() - 100;
    await seed("rooms", "room-a", { capacity: 4, occupants: [{ id: "confirmed", ticketId: "confirmed" }, { id: "legacy-draft" }, "legacy-confirmed"], locks: [{ ownerId: "a", draftId: "old", expiresAt: past }], lockExpirations: { "legacy-draft": past, confirmed: past } });
    expect((await sweep(sweepReq())).status).toBe(200);
    const room = await read("rooms", "room-a");
    expect(room.occupants.map(o => o.id)).toEqual(["confirmed", "legacy-confirmed"]);
    expect(room.locks).toEqual([]);
    expect(room.lockExpirations).toEqual({});
  });
  it("re-reads a room when a new hold arrives during sweeping", async () => {
    await seed("rooms", "room-a", { ...(await read("rooms", "room-a")), locks: [{ draftId: "old", expiresAt: Date.now() - 1 }] });
    mocked.db.beforeCommit = () => reserve("amb-b", "new-draft");
    await sweep(sweepReq());
    expect((await read("rooms", "room-a")).locks.map(l => l.draftId)).toEqual(["new-draft"]);
    expect(mocked.db.conflicts).toBeGreaterThan(0);
  });
  it("preserves confirmation that races with sweeping", async () => {
    await seed("rooms", "room-a", { ...(await read("rooms", "room-a")), capacity: 2 });
    await reserve();
    const room = await read("rooms", "room-a");
    await seed("rooms", "room-a", { ...room, locks: [...room.locks, { draftId: "expired", expiresAt: Date.now() - 1 }] });
    mocked.db.beforeCommit = () => finalize();
    await sweep(sweepReq());
    const after = await read("rooms", "room-a");
    expect(after.occupants).toHaveLength(1);
    expect(after.locks).toHaveLength(0);
  });
});

describe("admin capacity and allocation", () => {
  it("serializes capacity reduction against a second hold", async () => {
    await seed("rooms", "room-a", { ...(await read("rooms", "room-a")), capacity: 2 });
    await reserve();
    const results = await Promise.all([
      reserve("amb-b", "draft-b"),
      manage(req({ action: "update", roomId: "room-a", hotelId: "Detelina", roomNumber: "101", roomType: "single", capacity: 1, pricePerPersonPerNight: 60 }, "admin")),
    ]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    const after = await read("rooms", "room-a");
    expect(roomState(after).used).toBeLessThanOrEqual(after.capacity);
  });
  it("counts ambassador holds when admins allocate the last bed", async () => {
    await seed("tickets", "manual", { userName: "Manual Guest", ticketID: "MANUAL", passType: "Full Pass", status: "used", roomId: null, days: 0 });
    const results = await Promise.all([reserve(), manage(req({ action: "assign", ticketId: "manual", roomId: "room-a" }, "admin"))]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect(roomState(await read("rooms", "room-a")).used).toBe(1);
  });
  it("can allocate a checked-in pass with no previous accommodation", async () => {
    await seed("tickets", "used", { userName: "Checked In", ticketID: "USED12", passType: "Full Pass", status: "used", roomId: null, days: 0 });
    expect((await manage(req({ action: "assign", ticketId: "used", roomId: "room-a" }, "admin"))).status).toBe(200);
    expect(await read("tickets", "used")).toMatchObject({ roomId: "room-a", days: 3 });
  });
  it("only evicts an orphan after verifying there is no matching ticket", async () => {
    await seed("rooms", "room-a", { ...(await read("rooms", "room-a")), occupants: [{ id: "legacy-code" }] });
    await seed("tickets", "legacy-ticket", { ticketID: "legacy-code" });
    expect((await manage(req({ action: "evictOrphan", roomId: "room-a", occupantId: "legacy-code" }, "admin"))).status).toBe(409);
    mocked.db.write(mocked.db.collection("tickets").doc("legacy-ticket"), null, "delete");
    expect((await manage(req({ action: "evictOrphan", roomId: "room-a", occupantId: "legacy-code" }, "admin"))).status).toBe(200);
    expect((await read("rooms", "room-a")).occupants).toHaveLength(0);
  });
  it("counts held beds when reducing capacity or deleting", async () => {
    await reserve();
    expect((await manage(req({ action: "delete", roomId: "room-a" }, "admin"))).status).toBe(409);
    await seed("rooms", "room-a", { ...(await read("rooms", "room-a")), capacity: 2 });
    await reserve("amb-b", "draft-b");
    expect((await manage(req({ action: "update", roomId: "room-a", hotelId: "Detelina", roomNumber: "101", roomType: "double", capacity: 1, pricePerPersonPerNight: 60 }, "admin"))).status).toBe(409);
  });
  it("reassigns and evicts while keeping the ticket and both rooms consistent", async () => {
    await reserve(); await finalize();
    const issued = (await mocked.db.collection("tickets").get()).docs[0];
    await seed("rooms", "room-b", { capacity: 2, hotelId: "Kabakum", roomNumber: "202", pricePerPersonPerNight: 50, occupants: [], locks: [] });
    expect((await manage(req({ action: "assign", ticketId: issued.id, roomId: "room-b", days: 4 }, "admin"))).status).toBe(200);
    expect((await read("rooms", "room-a")).occupants).toHaveLength(0);
    expect((await read("rooms", "room-b")).occupants[0].days).toBe(4);
    expect(await read("tickets", issued.id)).toMatchObject({ roomId: "room-b", accommodation: "Kabakum", accommodationPrice: 200 });
    expect((await manage(req({ action: "evict", ticketId: issued.id }, "admin"))).status).toBe(200);
    expect(await read("tickets", issued.id)).toMatchObject({ roomId: null, accommodation: "None", status: "active" });
  });
  it("blocks attendee holds for administratively blocked rooms", async () => {
    await manage(req({ action: "block", roomId: "room-a", isBlocked: true }, "admin"));
    expect((await reserve()).status).toBe(409);
    expect(roomState(await read("rooms", "room-a")).available).toBe(0);
  });
  it("enforces the public purchase limit under simultaneous requests", async () => {
    const payload = { tickets: Array.from({ length: 3 }, () => ({ userName: "Public Guest", passType: "Full Pass" })) };
    const results = await Promise.all([createTickets(req(payload, "attendee")), createTickets(req(payload, "attendee"))]);
    expect(results.map(r => r.status).sort()).toEqual([200, 403]);
    expect((await mocked.db.collection("tickets").get()).size).toBe(3);
  });
});
