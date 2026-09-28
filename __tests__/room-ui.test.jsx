import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import english from "@/messages/en.json";
import bulgarian from "@/messages/bg.json";

const state = vi.hoisted(() => ({ rooms: [], now: 1000000, request: vi.fn(), popup: vi.fn() }));
vi.mock("@/lib/useRooms", () => ({ default: () => ({ rooms: state.rooms, now: state.now, loading: false, error: false, retry: vi.fn() }) }));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: { uid: "amb-a", getIdToken: async () => "token" } }, db: {} }));
vi.mock("firebase/firestore", () => ({ doc: vi.fn(), onSnapshot: (_ref, callback) => { callback({ data: () => ({}) }); return () => {}; } }));
vi.mock("@/lib/room-client", () => ({ roomRequest: state.request, roomError: (_t, error) => error.message }));
vi.mock("@/components/PopupProvider", () => ({ usePopup: () => ({ showPopup: state.popup }) }));

import DraftTab from "@/components/ambassador/DraftTab";
import RoomsTab from "@/components/admin/RoomsTab";
import RoomBeds from "@/components/rooms/RoomBeds";

const row = { id: "draft-a", name: "ANNA IVANOVA", type: "Full Pass", gender: "female", accommodation: "None" };
const room = { id: "room-a", roomNumber: "101", hotelId: "Detelina", roomType: "double", capacity: 2, pricePerPersonPerNight: 60, occupants: [], locks: [] };
function Roster({ initial = [row], submit = vi.fn() }) {
  const [rows, save] = useState(initial);
  return <DraftTab groupRows={rows} saveRoster={save} submitGroupToCart={submit} />;
}
const wrap = (children, messages = english, locale = "en") => <NextIntlClientProvider locale={locale} messages={messages}>{children}</NextIntlClientProvider>;

beforeEach(() => {
  state.rooms = [structuredClone(room)];
  state.now = 1000000;
  state.request.mockReset();
  state.popup.mockReset();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("ambassador room selection", () => {
  it("assigns the selected attendee by clicking an empty bed", async () => {
    state.request.mockResolvedValue({ roomId: "room-a", accommodation: "Detelina", expiresAt: state.now + 600000 });
    render(wrap(<Roster />));
    fireEvent.click(screen.getByRole("button", { name: "Choose room" }));
    fireEvent.click(screen.getByRole("button", { name: "Assign selected attendee to bed 1" }));
    await waitFor(() => expect(state.request).toHaveBeenCalledWith("/api/rooms/lock", expect.objectContaining({ action: "lock", roomId: "room-a", draftId: "draft-a", name: row.name, gender: "female" })));
    expect(screen.getByText("Detelina · Room 101")).toBeTruthy();
  });
  it("does not remove a row when immediate unlock fails", async () => {
    state.request.mockRejectedValue(new Error("Network unavailable"));
    render(wrap(<Roster initial={[{ ...row, roomId: "room-a", accommodation: "Detelina" }]} />));
    fireEvent.click(screen.getByRole("button", { name: "Remove ANNA IVANOVA" }));
    const popup = state.popup.mock.calls[0][0];
    await popup.onConfirm();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Network unavailable"));
    expect(screen.getByDisplayValue("ANNA IVANOVA")).toBeTruthy();
  });
  it("keeps other holds visible when one attendee's hold expires", () => {
    state.rooms[0].locks = [
      { draftId: "draft-a", ownerId: "amb-a", name: row.name, expiresAt: state.now - 1 },
      { draftId: "draft-b", ownerId: "amb-a", name: "MARIA PETROVA", expiresAt: state.now + 120000 },
    ];
    render(wrap(<Roster initial={[{ ...row, roomId: "room-a", accommodation: "Detelina" }, { ...row, id: "draft-b", name: "MARIA PETROVA", roomId: "room-a", accommodation: "Detelina" }]} />));
    expect(screen.getByText("Held for 2:00")).toBeTruthy();
    expect(screen.getByText(/Hold expired or released/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit & Activate" }).disabled).toBe(true);
    expect(screen.getByDisplayValue("MARIA PETROVA")).toBeTruthy();
  });
  it("releases holds when a draft view closes", async () => {
    const { unmount } = render(wrap(<Roster initial={[{ ...row, roomId: "room-a" }]} />));
    await waitFor(() => expect(screen.getByText("Rooms & roommates")).toBeTruthy());
    await Promise.resolve();
    unmount();
    expect(fetch).toHaveBeenCalledWith("/api/rooms/lock", expect.objectContaining({ keepalive: true, body: JSON.stringify({ action: "unlock", draftIds: ["draft-a"] }) }));
  });
  it("renders Bulgarian controls from translations", () => {
    render(wrap(<Roster />, bulgarian, "bg"));
    expect(screen.getByRole("button", { name: "Избери стая" })).toBeTruthy();
    expect(screen.getByText("Стаи и съквартиранти")).toBeTruthy();
  });
});

describe("admin overview and bed indicators", () => {
  it("distinguishes confirmed, held, and available beds without color alone", () => {
    const sample = { ...room, capacity: 3, occupants: [{ ticketId: "ticket-a", name: "ANNA", gender: "female" }], locks: [{ draftId: "b", name: "BORIS", gender: "male", expiresAt: state.now + 300000 }] };
    render(wrap(<RoomBeds room={sample} now={state.now} />));
    expect(screen.getByText("Confirmed · Woman")).toBeTruthy();
    expect(screen.getByText("Held · Man")).toBeTruthy();
    expect(screen.getByText("Available bed")).toBeTruthy();
  });
  it("filters rooms and exposes occupant details", () => {
    state.rooms = [
      { ...room, occupants: [{ id: "ticket-a", ticketId: "ticket-a", ticketID: "ABC123", name: "ANNA", passType: "Full Pass", ambassadorName: "Promoter A" }] },
      { ...room, id: "room-b", roomNumber: "202", hotelId: "Kabakum" },
    ];
    render(wrap(<RoomsTab tickets={[{ id: "ticket-a", ticketID: "ABC123", userName: "ANNA", roomId: "room-a", passType: "Full Pass", status: "active" }]} />));
    const filters = screen.getByRole("region", { name: "Room filters" });
    fireEvent.change(within(filters).getByLabelText("Hotel"), { target: { value: "Detelina" } });
    expect(screen.getByText("Room 101")).toBeTruthy();
    expect(screen.queryByText("Room 202")).toBeNull();
    expect(screen.getByText("ABC123")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reassign" })).toBeTruthy();
  });
});
