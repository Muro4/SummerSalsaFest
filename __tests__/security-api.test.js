// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryFirestore } from "./helpers/memory-firestore";

const state = vi.hoisted(() => ({ db: null, verify: vi.fn(), custom: vi.fn(), mail: vi.fn(), checkout: vi.fn(), event: vi.fn() }));
vi.mock("@/lib/firebase-admin", () => ({ get adminDb() { return state.db; }, adminAuth: { verifyIdToken: state.verify, createCustomToken: state.custom } }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: state.mail }) } }));
vi.mock("stripe", () => ({ default: class { checkout = { sessions: { create: state.checkout } }; webhooks = { constructEvent: state.event }; } }));
import { POST as activate } from "@/app/api/activate/route";
import { POST as send } from "@/app/api/send-ticket/route";
import { POST as reply } from "@/app/api/send-reply/route";
import { POST as checkout } from "@/app/api/checkout/route";
import { POST as webhook } from "@/app/api/webhooks/stripe/route";
import { POST as transfer } from "@/app/api/tickets/transfer/route";
import { POST as nameLogin } from "@/app/api/auth/name-login/route";
import { POST as contact } from "@/app/api/contact/route";
import { GET as health } from "@/app/api/health/route";
import { POST as wallet } from "@/app/api/google-wallet/route";
import { getActiveFestivalYear } from "@/lib/utils";
import { getPriceAtDate } from "@/lib/pricing";

const request = (body, uid = "owner", headers = {}) => new Request("http://localhost/api/test", { method: "POST", headers: { "Content-Type": "application/json", ...(uid ? { authorization: `Bearer ${uid}` } : {}), ...headers }, body: JSON.stringify(body) });
const seed = (collection, id, value) => state.db.collection(collection).doc(id).set(value);
const read = async (collection, id) => (await state.db.collection(collection).doc(id).get()).data();
const pdf = "data:application/pdf;base64," + Buffer.from("%PDF-1.4\nfixture").toString("base64");
const mailBody = { ticket: { id: "ticket" }, email: "owner@example.com", pdfAttachment: pdf };
const pass = () => ({ userId: "owner", userName: "TEST DANCER", status: "pending", passType: "Full Pass", price: getPriceAtDate("Full Pass"), guestEmail: "owner@example.com", ticketID: "ABC123", festivalYear: getActiveFestivalYear() });

beforeEach(async () => {
  vi.clearAllMocks();
  state.db = new MemoryFirestore();
  state.verify.mockImplementation(async token => {
    if (token === "invalid") throw new Error("revoked");
    return { uid: token, email: `${token}@example.com`, firebase: { sign_in_provider: token === "guest" ? "anonymous" : "password" } };
  });
  state.mail.mockResolvedValue({});
  state.checkout.mockResolvedValue({ id: "cs_test", url: "https://checkout.stripe.com/test" });
  state.custom.mockResolvedValue("custom-token");
  vi.stubEnv("STRIPE_SECRET_KEY", "test-key");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test-webhook");
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://festival.example");
  for (const [uid, role] of [["owner", "user"], ["other", "user"], ["admin", "admin"], ["root", "superadmin"]]) await seed("users", uid, { role, displayName: "Name " + uid, email: `${uid}@example.com` });
  await seed("tickets", "ticket", pass());
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("authentication precedes sensitive access", () => {
  for (const [name, handler] of Object.entries({ activate, send, reply, checkout, transfer, nameLogin, contact, health, wallet })) {
    it(`${name} rejects absent and revoked tokens`, async () => {
      expect((await handler(request({ guestSessionId: "owner", ...mailBody }, null))).status).toBe(401);
      expect((await handler(request({}, "invalid"))).status).toBe(401);
      expect(state.mail).not.toHaveBeenCalled();
      expect(state.checkout).not.toHaveBeenCalled();
    });
  }
  it("uses database roles and returns 403 for admin-only operations", async () => {
    expect((await reply(request({}))).status).toBe(403);
    expect((await health(request({}))).status).toBe(403);
  });
});

it("activation rejects paid tickets and other owners, and cannot reset a checked-in pass", async () => {
  expect((await activate(request({ ticketIds: ["ticket"] }))).status).toBe(409);
  await seed("tickets", "ticket", { ...pass(), price: 0 });
  expect((await activate(request({ ticketIds: ["ticket"] }, "other"))).status).toBe(403);
  expect((await activate(request({ ticketIds: ["ticket"] }))).status).toBe(200);
  await seed("tickets", "ticket", { ...pass(), price: 0, status: "used" });
  expect((await activate(request({ ticketIds: ["ticket"] }))).status).toBe(409);
});

it("email requires ownership, payment, validated content, and limits duplicate sends", async () => {
  expect((await send(request(mailBody))).status).toBe(409);
  await seed("tickets", "ticket", { ...pass(), status: "active", userName: "<script>bad</script>" });
  expect((await send(request(mailBody, "other"))).status).toBe(403);
  expect((await send(request({ ...mailBody, email: "a@example.com,b@example.com" }))).status).toBe(400);
  expect((await send(request({ ...mailBody, pdfAttachment: "bad" }))).status).toBe(400);
  expect((await send(request(mailBody))).status).toBe(200);
  expect(state.mail.mock.calls[0][0].html).toContain("&lt;script&gt;");
  expect((await read("tickets", "ticket")).emailSentCount).toBe(1);
  expect((await send(request(mailBody))).status).toBe(429);
});

it("does not mark a failed email as sent", async () => {
  await seed("tickets", "ticket", { ...pass(), status: "active" });
  state.mail.mockRejectedValueOnce(new Error("SMTP failed"));
  expect((await send(request(mailBody))).status).toBe(500);
  expect((await read("tickets", "ticket")).emailSentCount).toBeUndefined();
});

it("escapes reply HTML and authorizes profile-based admin roles", async () => {
  const response = await reply(request({ email: "user@example.com", name: "<img>", subject: "Test", replyText: "<script>bad</script>", originalMessage: "<a>link</a>" }, "admin"));
  expect(response.status).toBe(200);
  expect(state.mail.mock.calls[0][0].html).not.toContain("<script>");
});

it("checkout checks ownership, status and duplicate IDs, and ignores untrusted origins", async () => {
  expect((await checkout(request({ items: [{ id: "ticket" }] }, "other"))).status).toBe(403);
  expect((await checkout(request({ items: [{ id: "ticket" }, { id: "ticket" }] }))).status).toBe(400);
  expect((await checkout(request({ items: [{ id: "ticket", price: 0 }] }, "owner", { origin: "https://attacker.example" }))).status).toBe(200);
  const payload = state.checkout.mock.calls[0][0];
  expect(payload.success_url).toMatch(/^https:\/\/festival\.example\//);
  expect(payload.line_items[0].price_data.unit_amount).toBe(getPriceAtDate("Full Pass") * 100);
});

it("webhook verifies payment amount and session binding and does not reactivate used tickets on retry", async () => {
  const event = { id: "evt_test", type: "checkout.session.completed", data: { object: { id: "cs_test", payment_status: "unpaid", amount_total: 100, currency: "eur", metadata: { checkoutSessionId: "session" } } } };
  state.event.mockReturnValue(event);
  await seed("checkout_sessions", "session", { userId: "owner", ticketIds: ["ticket"], status: "pending", stripeSessionId: "cs_test", amountTotal: 200, currency: "eur" });
  expect((await webhook(request({}))).status).toBe(200);
  expect((await read("tickets", "ticket")).status).toBe("pending");
  event.data.object.payment_status = "paid";
  expect((await webhook(request({}))).status).toBe(409);
  event.data.object.amount_total = 200;
  expect((await webhook(request({}))).status).toBe(200);
  await seed("tickets", "ticket", { ...pass(), status: "used" });
  expect((await webhook(request({}))).status).toBe(200);
  expect((await read("tickets", "ticket")).status).toBe("used");
  state.event.mockImplementationOnce(() => { throw new Error("bad signature"); });
  expect((await webhook(request({}))).status).toBe(400);
});

it("transfers guests only with proof of both identities", async () => {
  await seed("tickets", "guest-pass", { ...pass(), userId: "guest", isGuest: true });
  expect((await transfer(request({ guestToken: "other" }))).status).toBe(403);
  expect((await transfer(request({ guestToken: "invalid" }))).status).toBe(401);
  expect((await transfer(request({ guestToken: "guest" }))).status).toBe(200);
  expect((await read("tickets", "guest-pass")).userId).toBe("owner");
});

it("name login returns no account data until Firebase has verified the password", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
  const payload = { name: "Name owner", password: "invalid-password" };
  expect((await nameLogin(request(payload, "guest"))).status).toBe(401);
  expect(state.custom).not.toHaveBeenCalled();
  fetch.mockResolvedValue({ ok: true, json: async () => ({ idToken: "owner" }) });
  const response = await nameLogin(request(payload, "guest"));
  expect(await response.json()).toEqual({ token: "custom-token" });
});

it("contact submissions are authenticated, bounded and throttled", async () => {
  const body = { name: "User", email: "user@example.com", category: "Tickets", subject: "Question", message: "A question" };
  expect((await contact(request({ ...body, message: "x".repeat(10001) }))).status).toBe(400);
  expect((await contact(request(body))).status).toBe(200);
  expect((await contact(request(body))).status).toBe(429);
});
