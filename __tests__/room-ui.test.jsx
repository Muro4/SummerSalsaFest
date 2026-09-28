import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import english from "@/messages/en.json";
import bulgarian from "@/messages/bg.json";

const state = vi.hoisted(() => ({ rooms: [], now: 1000000, financials: {}, deposits: {}, request: vi.fn(), popup: vi.fn() }));
vi.mock("@/lib/useRooms", () => ({ default: () => ({ rooms: state.rooms, now: state.now, loading: false, error: false, retry: vi.fn() }) }));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: { uid: "amb-a", getIdToken: async () => "token" } }, db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db, ...parts) => parts.join("/"),
  onSnapshot: (ref, callback) => { callback({ data: () => ref.endsWith("hotel_financials") ? state.financials : state.deposits }); return () => {}; },
}));
vi.mock("@/lib/room-client", () => ({ roomRequest: state.request, roomError: (_t, error) => error.message }));
vi.mock("@/components/PopupProvider", () => ({ usePopup: () => ({ showPopup: state.popup }) }));

import DraftTab from "@/components/ambassador/DraftTab";
import RoomsTab from "@/components/admin/RoomsTab";

const row = { id: "draft-a", name: "ANNA IVANOVA", email: "", type: "Full Pass", accommodation: "None" };
const room = { id: "room-a", roomNumber: "101", hotelId: "Detelina", roomType: "double", board: "breakfast", capacity: 2, pricePerPersonPerNight: 60, occupants: [], locks: [] };
function Roster({ initial = [row], submit = vi.fn() }) {
  const [rows, save] = useState(initial);
  return <DraftTab groupRows={rows} saveRoster={save} submitGroupToCart={submit} />;
}
const wrap = (children, messages = english, locale = "en") => <NextIntlClientProvider locale={locale} messages={messages}>{children}</NextIntlClientProvider>;
const openRoomPicker = () => fireEvent.change(screen.getByLabelText("Accommodation"), { target: { value: "Detelina" } });

beforeEach(() => {
  state.rooms = [structuredClone(room)];
  state.now = 1000000;
  state.financials = { Detelina: { defaultRate: 65, adjustments: 20 } };
  state.deposits = { Detelina: 100 };
  state.request.mockReset().mockResolvedValue({ success: true });
  state.popup.mockReset();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("compact draft table and room modal", () => {
  it("keeps email and read-only commission in the row with no gender or inline rooms", () => {
    render(wrap(<Roster />));
    const table = screen.getByRole("table");
    const attendeeRow = within(table).getAllByRole("row")[1];
    expect(within(attendeeRow).getByRole("textbox", { name: "Attendee email" })).toBeTruthy();
    expect(within(attendeeRow).getByText("€10.00")).toBeTruthy();
    expect(screen.queryByLabelText(/Gender/)).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Room 101")).toBeNull();
    fireEvent.change(within(attendeeRow).getByLabelText("Pass Type"), { target: { value: "Performers Pass" } });
    expect(within(attendeeRow).getByText("€0.00")).toBeTruthy();
  });
  it("opens only the selected hotel's available rooms and closes after assignment", async () => {
    state.rooms.push({ ...room, id: "elsewhere", hotelId: "Kabakum", roomNumber: "202" }, { ...room, id: "full", roomNumber: "303", capacity: 1, occupants: [{ id: "occupied", name: "Other Guest" }] });
    state.request.mockResolvedValue({ roomId: "room-a", accommodation: "Detelina", expiresAt: state.now + 600000 });
    render(wrap(<Roster />));
    openRoomPicker();
    const modal = screen.getByRole("dialog", { name: "Rooms · Detelina" });
    expect(within(modal).getByText("Room 101")).toBeTruthy();
    expect(within(modal).queryByText("Room 202")).toBeNull();
    expect(within(modal).queryByText("Room 303")).toBeNull();
    fireEvent.click(within(modal).getByRole("button", { name: "Assign bed" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(state.request).toHaveBeenCalledWith("/api/rooms/lock", { action: "lock", roomId: "room-a", draftId: "draft-a", name: row.name });
    expect(screen.getByRole("button", { name: /Room 101/ })).toBeTruthy();
  });
  it("preserves the existing hold when cancelling a different hotel's picker", () => {
    render(wrap(<Roster initial={[{ ...row, roomId: "room-a", accommodation: "Detelina" }]} />));
    fireEvent.change(screen.getByLabelText("Accommodation"), { target: { value: "Kabakum" } });
    expect(screen.getByRole("dialog", { name: "Rooms · Kabakum" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByLabelText("Accommodation").value).toBe("Detelina");
    expect(state.request).not.toHaveBeenCalled();
  });
  it("retains the modal and original assignment when the last bed is taken", async () => {
    state.request.mockRejectedValue(new Error("roomFull"));
    render(wrap(<Roster />));
    openRoomPicker();
    fireEvent.click(screen.getByRole("button", { name: "Assign bed" }));
    await waitFor(() => expect(within(screen.getByRole("dialog")).getByRole("alert").textContent).toBe("roomFull"));
    expect(screen.getByLabelText("Accommodation").value).toBe("None");
  });
  it("keeps a draft row when immediate unlock fails", async () => {
    state.request.mockRejectedValue(new Error("Network unavailable"));
    render(wrap(<Roster initial={[{ ...row, roomId: "room-a", accommodation: "Detelina" }]} />));
    fireEvent.click(screen.getByRole("button", { name: "Remove ANNA IVANOVA" }));
    await state.popup.mock.calls[0][0].onConfirm();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Network unavailable"));
    expect(screen.getByDisplayValue("ANNA IVANOVA")).toBeTruthy();
  });
  it("allows optional email but disables registration for an invalid address", () => {
    render(wrap(<Roster />));
    const register = screen.getByRole("button", { name: "Submit & Activate" });
    expect(register.disabled).toBe(false);
    fireEvent.change(screen.getByLabelText("Attendee email"), { target: { value: "invalid@" } });
    expect(register.disabled).toBe(true);
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Attendee email"), { target: { value: "anna@example.com" } });
    expect(register.disabled).toBe(false);
  });
  it("keeps other countdowns when one attendee's hold expires", () => {
    state.rooms[0].locks = [
      { draftId: "draft-a", ownerId: "amb-a", name: row.name, expiresAt: state.now - 1 },
      { draftId: "draft-b", ownerId: "amb-a", name: "MARIA PETROVA", expiresAt: state.now + 120000 },
    ];
    render(wrap(<Roster initial={[{ ...row, roomId: "room-a", accommodation: "Detelina" }, { ...row, id: "draft-b", name: "MARIA PETROVA", roomId: "room-a", accommodation: "Detelina" }]} />));
    expect(screen.getByRole("button", { name: /Room 101 2:00/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Room 101 Expired/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit & Activate" }).disabled).toBe(true);
  });
  it("releases holds when the draft view closes", async () => {
    const { unmount } = render(wrap(<Roster initial={[{ ...row, roomId: "room-a" }]} />));
    await Promise.resolve();
    unmount();
    expect(fetch).toHaveBeenCalledWith("/api/rooms/lock", expect.objectContaining({ keepalive: true, body: JSON.stringify({ action: "unlock", draftIds: ["draft-a"] }) }));
  });
  it("renders the Bulgarian table and modal", () => {
    render(wrap(<Roster />, bulgarian, "bg"));
    expect(screen.getByRole("columnheader", { name: "Имейл на участника" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(bulgarian.DraftTab.thAccomm), { target: { value: "Detelina" } });
    expect(screen.getByRole("dialog", { name: "Стаи · Detelina" })).toBeTruthy();
  });
});

describe("hotel allocation spreadsheets", () => {
  it("always shows all four hotel sections and empty tables", () => {
    state.rooms = [];
    render(wrap(<RoomsTab />));
    expect(screen.getAllByRole("table")).toHaveLength(4);
    for (const hotel of ["VFU", "Detelina", "Toro Negro", "Kabakum"]) {
      const section = screen.getByRole("region", { name: hotel });
      expect(within(section).getByRole("button", { name: "Add room" })).toBeTruthy();
      expect(within(section).getByText("No rooms added yet.")).toBeTruthy();
    }
  });
  it("renders one row per bed, shared room cells, and balances excluding held beds", () => {
    state.rooms[0] = { ...room, capacity: 3, occupants: [{ id: "ticket-a", name: "ANNA", days: 3 }], locks: [{ draftId: "held", name: "BORIS", expiresAt: state.now + 60000 }] };
    render(wrap(<RoomsTab />));
    const section = screen.getByRole("region", { name: "Detelina" });
    const table = within(section).getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByText("101").getAttribute("rowspan")).toBe("3");
    expect(within(table).getByText("Vacant bed")).toBeTruthy();
    expect(within(table).getByText("Confirmed")).toBeTruthy();
    expect(within(table).getByText("Held")).toBeTruthy();
    expect(within(table).getByText("€180.00")).toBeTruthy();
    expect(within(section).getByText("Remaining (€ / BGN)").nextElementSibling.textContent).toBe("€100.00 / 195.58 BGN");
  });
  it("prefills a new room's hotel rate and saves a negotiated rate and board", async () => {
    render(wrap(<RoomsTab />));
    fireEvent.click(within(screen.getByRole("region", { name: "Detelina" })).getByRole("button", { name: "Add room" }));
    const modal = screen.getByRole("dialog", { name: "Add room · Detelina" });
    const rate = within(modal).getByLabelText("Price per person / night (€)");
    expect(rate.value).toBe("65");
    fireEvent.change(rate, { target: { value: "61.5" } });
    fireEvent.change(within(modal).getByLabelText("Room number / name"), { target: { value: "413" } });
    fireEvent.change(within(modal).getByLabelText("Capacity"), { target: { value: "3" } });
    fireEvent.change(within(modal).getByLabelText("Board / Meals"), { target: { value: "breakfast" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Save room" }));
    await waitFor(() => expect(state.request).toHaveBeenCalledWith("/api/rooms/manage", expect.objectContaining({ action: "create", hotelId: "Detelina", roomNumber: "413", capacity: 3, roomType: "triple", board: "breakfast", pricePerPersonPerNight: 61.5 })));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("persists signed adjustments and deposits from the financial modal", async () => {
    render(wrap(<RoomsTab />));
    fireEvent.click(screen.getByRole("button", { name: "Hotel Financials & Rates" }));
    const modal = screen.getByRole("dialog");
    fireEvent.change(within(modal).getByLabelText("Detelina · Adjustments (€)"), { target: { value: "-25" } });
    fireEvent.change(within(modal).getByLabelText("Detelina · Deposit (€)"), { target: { value: "80" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.request).toHaveBeenCalledWith("/api/rooms/manage", { action: "financials", hotels: expect.arrayContaining([{ hotelId: "Detelina", defaultRate: 65, deposit: 80, adjustments: -25 }]) }));
  });
  it("filters table rows while keeping the four hotel headers", () => {
    state.rooms.push({ ...room, id: "room-b", roomNumber: "202", hotelId: "Kabakum" });
    render(wrap(<RoomsTab />));
    fireEvent.change(screen.getByLabelText("Search rooms"), { target: { value: "101" } });
    expect(screen.getByText("101")).toBeTruthy();
    expect(screen.queryByText("202")).toBeNull();
    expect(screen.getAllByRole("table")).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "Kabakum" })).toBeTruthy();
  });
  it("renders Bulgarian spreadsheet labels and financial fields", () => {
    render(wrap(<RoomsTab />, bulgarian, "bg"));
    expect(screen.getByRole("region", { name: "ВСУ" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader", { name: "Изхранване" })).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Финанси и цени на хотелите" }));
    expect(within(screen.getByRole("dialog")).getByLabelText("Detelina · Корекции (€)")).toBeTruthy();
  });
});
