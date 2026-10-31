import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import english from "@/messages/en.json";

const mocks = vi.hoisted(() => ({ popup: vi.fn(), capture: vi.fn(async () => "data:image/png;base64,image"), request: vi.fn() }));
vi.mock("@/lib/room-client", () => ({ roomRequest: mocks.request }));
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: { getIdToken: async () => "token" } } }));
vi.mock("@/components/PopupProvider", () => ({ usePopup: () => ({ showPopup: mocks.popup }) }));
vi.mock("html-to-image", () => ({ toPng: mocks.capture }));
vi.mock("jspdf", () => ({ default: class { addImage() {} output() { return "data:application/pdf;base64,pdf"; } } }));
import HistoryTab from "@/components/ambassador/HistoryTab";
import SendTicketButton from "@/components/ambassador/SendTicketButton";
import EditableEmail from "@/components/ambassador/EditableEmail";

const ticket = { id: "ticket-a", ticketID: "ABC123", userName: "TEST DANCER", passType: "Full Pass", festivalYear: 2027, status: "active", guestEmail: "dancer@example.com" };
const wrap = children => render(<NextIntlClientProvider locale="en" messages={english}>{children}</NextIntlClientProvider>);
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true }))); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("shows next festival year records with Send instead of View, including disabled empty-email actions", () => {
  wrap(<HistoryTab paidTickets={[ticket, { ...ticket, id: "ticket-b", guestEmail: "" }]} selectedYear="2027" setSelectedYear={vi.fn()} setFullScreenTicket={vi.fn()} />);
  const table = screen.getByRole("table");
  const buttons = within(table).getAllByRole("button", { name: "Send" });
  expect(buttons).toHaveLength(2);
  expect(buttons[0].disabled).toBe(false);
  expect(buttons[1].disabled).toBe(true);
  expect(within(table).queryByTitle("View Ticket")).toBeNull();
  expect(table.querySelector("tbody tr").className).toContain("hover:bg-gray-100");
});

it("sends the attached email once without triggering the row action", async () => {
  const rowAction = vi.fn();
  wrap(<div onClick={rowAction}><SendTicketButton roster={{ ...ticket, email: ticket.guestEmail }} /></div>);
  const button = screen.getByRole("button", { name: "Send" });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(mocks.popup).toHaveBeenCalledWith(expect.objectContaining({ type: "success" })));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ email: ticket.guestEmail, ticket: { id: ticket.id }, pdfAttachment: "data:application/pdf;base64,pdf" });
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer token");
  expect(rowAction).not.toHaveBeenCalled();
});

it("reports delivery failures and re-enables Send for retry", async () => {
  fetch.mockResolvedValue({ ok: false });
  wrap(<SendTicketButton roster={{ ...ticket, email: ticket.guestEmail }} />);
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(mocks.popup).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })));
  expect(screen.getByRole("button", { name: "Send" }).disabled).toBe(false);
});

it("does not send when the attached email is missing or whitespace", () => {
  wrap(<SendTicketButton roster={{ ...ticket, email: "  " }} />);
  const button = screen.getByRole("button", { name: "Send" });
  expect(button.disabled).toBe(true);
  fireEvent.click(button);
  expect(fetch).not.toHaveBeenCalled();
});

it("edits on focus, saves on Enter once, and updates Send with the saved recipient", async () => {
  mocks.request.mockImplementation(async (_path, body) => ({ email: body.email }));
  function History() {
    const [tickets, setTickets] = React.useState([{ ...ticket, guestEmail: "" }]);
    return <HistoryTab paidTickets={tickets} selectedYear="2027" setSelectedYear={vi.fn()} setFullScreenTicket={vi.fn()}
      onEmailSaved={(id, email) => setTickets(previous => previous.map(row => row.id === id ? { ...row, guestEmail: email } : row))} />;
  }
  wrap(<History />);
  const table = within(screen.getByRole("table"));
  expect(table.getByRole("columnheader", { name: "Email" })).toBeTruthy();
  expect(table.getByRole("button", { name: "Send" }).disabled).toBe(true);
  fireEvent.focus(table.getByRole("button", { name: "Edit email for TEST DANCER" }));
  const input = table.getByRole("textbox");
  fireEvent.change(input, { target: { value: " NEW@example.com " } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(table.getByRole("button", { name: "Send" }).disabled).toBe(false));
  expect(mocks.request).toHaveBeenCalledTimes(1);
  expect(mocks.request).toHaveBeenCalledWith("/api/tickets/email", { ticketId: ticket.id, email: "new@example.com" });
  expect(table.getByText("new@example.com")).toBeTruthy();
});

it("saves on blur and shows pending feedback until the request completes", async () => {
  let resolve;
  mocks.request.mockReturnValue(new Promise(done => { resolve = done; }));
  const onSaved = vi.fn();
  wrap(<EditableEmail ticket={ticket} onSaved={onSaved} />);
  fireEvent.click(screen.getByRole("button"));
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "edited@example.com" } });
  fireEvent.blur(input);
  expect(input.readOnly).toBe(true);
  expect(screen.getByLabelText("Saving email")).toBeTruthy();
  resolve({ email: "edited@example.com" });
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(ticket.id, "edited@example.com"));
  expect(screen.getByRole("status", { name: "Email saved" })).toBeTruthy();
});

it("keeps failed edits available to retry and rejects invalid addresses", async () => {
  mocks.request.mockRejectedValue(new Error("offline"));
  wrap(<EditableEmail ticket={ticket} />);
  fireEvent.click(screen.getByRole("button"));
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "invalid" } });
  fireEvent.blur(input);
  expect(screen.getByRole("alert").textContent).toBe("Enter a valid email address.");
  expect(mocks.request).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "retry@example.com" } });
  fireEvent.blur(input);
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Could not save"));
  expect(input.value).toBe("retry@example.com");
  expect(input.readOnly).toBe(false);
});

it("cancels edits with Escape without saving", () => {
  wrap(<EditableEmail ticket={ticket} />);
  fireEvent.click(screen.getByRole("button"));
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "cancel@example.com" } });
  fireEvent.keyDown(input, { key: "Escape" });
  expect(mocks.request).not.toHaveBeenCalled();
  expect(screen.getByRole("button").textContent).toBe(ticket.guestEmail);
});
