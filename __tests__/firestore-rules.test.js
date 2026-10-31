// @vitest-environment node
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";

const suite = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;
suite("Firestore authorization (real emulator)", () => {
  let env;
  const db = (uid, claims = {}) => env.authenticatedContext(uid, { email: `${uid}@example.com`, ...claims }).firestore();
  const ticket = { userId: "owner", userName: "TEST DANCER", guestEmail: "owner@example.com", status: "active", roomId: null, price: 100, festivalYear: new Date().getFullYear() };
  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: "demo-salsafest-audit", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
  });
  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async context => {
      const store = context.firestore();
      for (const [uid, role] of [["owner", "user"], ["other", "user"], ["amb", "ambassador"], ["scanner", "scanner"], ["admin", "admin"], ["root", "superadmin"]]) {
        await setDoc(doc(store, "users", uid), { uid, role, displayName: "Test User", email: `${uid}@example.com` });
      }
      await setDoc(doc(store, "tickets", "paid"), ticket);
      await setDoc(doc(store, "tickets", "pending"), { ...ticket, status: "pending" });
      await setDoc(doc(store, "rooms", "room-a"), { capacity: 2, occupants: [], locks: [] });
      await setDoc(doc(store, "settings", "system"), { salesEnabled: true });
      await setDoc(doc(store, "contact_messages", "message"), { email: "private@example.com" });
    });
  });
  afterAll(async () => { await env?.cleanup(); });

  it("prevents public and cross-owner ticket/profile reads while allowing owner queries", async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "tickets", "paid")));
    await assertFails(getDoc(doc(db("other"), "tickets", "paid")));
    await assertFails(getDoc(doc(db("other"), "users", "owner")));
    await assertFails(getDocs(collection(db("owner"), "users")));
    await assertSucceeds(getDocs(query(collection(db("owner"), "tickets"), where("userId", "==", "owner"))));
    await assertSucceeds(getDocs(collection(db("admin"), "tickets")));
  });
  it("prevents privilege escalation and accepts a legitimate signup/profile edit", async () => {
    await assertFails(updateDoc(doc(db("owner"), "users", "owner"), { role: "superadmin" }));
    await assertFails(setDoc(doc(db("new"), "users", "new"), { uid: "new", role: "superadmin", email: "new@example.com", displayName: "New User", createdAt: new Date().toISOString() }));
    await assertSucceeds(setDoc(doc(db("new"), "users", "new"), { uid: "new", role: "user", email: "new@example.com", displayName: "New User", createdAt: new Date().toISOString() }));
    await assertSucceeds(updateDoc(doc(db("owner"), "users", "owner"), { displayName: "Updated Name" }));
    await assertSucceeds(updateDoc(doc(db("root"), "users", "owner"), { role: "ambassador" }));
  });
  it("blocks forged tickets, free payments, ownership transfers and paid deletions", async () => {
    await assertFails(setDoc(doc(db("owner"), "tickets", "forged"), ticket));
    for (const data of [{ status: "active" }, { price: 0 }, { userId: "other" }, { emailSentCount: 20 }]) {
      await assertFails(updateDoc(doc(db("owner"), "tickets", "pending"), data));
    }
    await assertFails(deleteDoc(doc(db("owner"), "tickets", "paid")));
    await assertSucceeds(deleteDoc(doc(db("owner"), "tickets", "pending")));
  });
  it("permits scanner check-in only for active passes and protects allocations from admins", async () => {
    await assertFails(updateDoc(doc(db("scanner"), "tickets", "pending"), { status: "used", checkInTime: new Date().toISOString() }));
    await assertSucceeds(updateDoc(doc(db("scanner"), "tickets", "paid"), { status: "used", checkInTime: new Date().toISOString() }));
    await assertFails(updateDoc(doc(db("scanner"), "tickets", "paid"), { status: "active" }));
    await assertSucceeds(updateDoc(doc(db("admin"), "tickets", "paid"), { status: "active" }));
    await assertFails(updateDoc(doc(db("root"), "tickets", "paid"), { roomId: "room-a" }));
  });
  it("protects room capacity, internal guards, hotel financials and system settings", async () => {
    await assertSucceeds(getDoc(doc(db("amb"), "rooms", "room-a")));
    await assertFails(getDoc(doc(db("owner"), "rooms", "room-a")));
    await assertFails(updateDoc(doc(db("root"), "rooms", "room-a"), { capacity: 100 }));
    for (const name of ["room_drafts", "checkout_sessions", "ticket_codes", "login_guards", "ticket_email_guards", "ticket_purchase_guards"]) {
      await assertFails(setDoc(doc(db("root"), name, "attack"), { status: "completed" }));
    }
    await assertFails(getDoc(doc(db("amb"), "settings", "hotel_deposits")));
    await assertFails(updateDoc(doc(db("owner"), "settings", "system"), { salesEnabled: false }));
    await assertSucceeds(updateDoc(doc(db("root"), "settings", "system"), { salesEnabled: false }));
  });
  it("keeps contact messages private and cannot approve one's own ambassador application", async () => {
    await assertFails(getDoc(doc(db("owner"), "contact_messages", "message")));
    await assertFails(setDoc(doc(db("owner"), "contact_messages", "spam"), { message: "spam" }));
    const application = { userId: "owner", name: "Test Dancer", email: "owner@example.com", phone: "", pitch: "Festival dancer", mainStyle: "salsa", status: "pending", createdAt: new Date().toISOString() };
    await assertSucceeds(setDoc(doc(db("owner"), "ambassador_requests", "owner"), application));
    await assertFails(updateDoc(doc(db("owner"), "ambassador_requests", "owner"), { status: "approved" }));
    await assertSucceeds(updateDoc(doc(db("root"), "ambassador_requests", "owner"), { status: "approved" }));
  });
});
