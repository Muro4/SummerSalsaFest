"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { doc, onSnapshot } from "firebase/firestore";
import { Building, ChevronDown, Edit2, Lock, Plus, Search, Trash2, Unlock, Users, X } from "lucide-react";
import Button from "@/components/Button";
import RoomBeds from "@/components/rooms/RoomBeds";
import { usePopup } from "@/components/PopupProvider";
import { db } from "@/lib/firebase";
import { CONFIRMED_TICKET_STATUSES, HOTELS, ROOM_TYPES, roomState, roomType } from "@/lib/rooms";
import { roomError, roomRequest } from "@/lib/room-client";
import useRooms from "@/lib/useRooms";

const field = "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-salsa-pink focus:ring-2 focus:ring-salsa-pink/15 disabled:bg-slate-100";
const blankRoom = () => ({ hotelId: "ВСУ", roomNumber: "", roomType: "double", capacity: 2, pricePerPersonPerNight: 15.5 });

export default function RoomsTab({ tickets = [], users = [] }) {
  const t = useTranslations("RoomSystem");
  const { showPopup } = usePopup();
  const { rooms, loading, error: roomsError, now, retry } = useRooms();
  const [search, setSearch] = useState("");
  const [hotel, setHotel] = useState("all");
  const [type, setType] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [editor, setEditor] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [ticketSearch, setTicketSearch] = useState("");
  const [deposits, setDeposits] = useState({});
  const [depositError, setDepositError] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const editorRef = useRef(null);
  const allocationRef = useRef(null);

  useEffect(() => onSnapshot(doc(db, "settings", "hotel_deposits"), snapshot => setDeposits(snapshot.data() || {}), () => setDepositError(true)), []);
  useEffect(() => { if (editor) editorRef.current?.focus(); }, [!!editor]);
  useEffect(() => { if (allocation) allocationRef.current?.focus(); }, [!!allocation]);

  const mutate = async (body, after) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError(""); setNotice("");
    try { await roomRequest("/api/rooms/manage", body); setNotice(t("saved")); after?.(); }
    catch (err) { setError(roomError(t, err)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const confirm = (message, action) => showPopup({ type: "info", title: t("confirmAction"), message, confirmText: t("confirm"), cancelText: t("cancel"), onConfirm: action });
  const states = rooms.map(room => ({ ...room, ...roomState(room, now) }));
  const totals = states.reduce((total, room) => ({
    beds: total.beds + room.capacity, occupied: total.occupied + room.occupants.length,
    held: total.held + room.locks.length, available: total.available + room.available,
  }), { beds: 0, occupied: 0, held: 0, available: 0 });
  const rate = totals.beds ? Math.round(totals.occupied / totals.beds * 100) : 0;
  const filtered = states.filter(room =>
    (hotel === "all" || room.hotelId === hotel) &&
    (type === "all" || roomType(room) === type) &&
    (availability === "all" || (availability === "blocked" ? room.isBlocked : availability === "full" ? room.used >= room.capacity : room.available > 0)) &&
    [room.roomNumber, room.hotelId, ...room.occupants.flatMap(occ => [occ.name, occ.ticketID])].join(" ").toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.hotelId.localeCompare(b.hotelId) || String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }));
  const editingState = editor?.id ? states.find(room => room.id === editor.id) : null;
  const ticketFor = occupant => tickets.find(ticket => ticket.id === (occupant.ticketId || occupant.id) || ticket.ticketID === occupant.id);
  const activeTickets = tickets.filter(ticket => CONFIRMED_TICKET_STATUSES.includes(ticket.status) &&
    (!ticket.roomId || ticket.id === allocation?.ticketId) &&
    [ticket.userName, ticket.ticketID].join(" ").toLowerCase().includes(ticketSearch.toLowerCase()));
  const openAllocation = (room, ticket) => {
    setTicketSearch("");
    setAllocation({ roomId: room.id, ticketId: ticket?.id || "", sourceRoomId: ticket?.roomId || room.id, days: ticket?.days || 3 });
  };

  return <div className="space-y-6 font-montserrat text-slate-900">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500"><Building size={16} />{t("accommodation")}</p><h2 className="font-bebas text-4xl sm:text-5xl">{t("managerTitle")}</h2><p className="mt-1 text-sm text-slate-500">{t("managerIntro")}</p></div>
      <Button icon={Plus} disabled={busy} onClick={() => setEditor(blankRoom())}>{t("addRoom")}</Button>
    </header>
    {error && <div role="alert" className="rounded-2xl border border-salsa-pink/30 bg-salsa-pink/10 p-4 text-sm">{error}</div>}
    {notice && <p role="status" className="rounded-2xl bg-salsa-mint/20 p-4 text-sm">{notice}</p>}
    <section aria-label={t("overview")} className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      {[[t("totalRooms"), rooms.length], [t("totalBeds"), totals.beds], [t("occupiedBeds"), totals.occupied], [t("heldBeds"), totals.held], [t("availableBeds"), totals.available], [t("occupancyRate"), `${rate}%`]].map(([label, value], index) => <div key={label} className={`rounded-3xl border p-4 ${index === 5 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"}`}><p className={`text-xs ${index === 5 ? "text-slate-300" : "text-slate-500"}`}>{label}</p><p className="mt-2 font-bebas text-4xl">{loading ? "—" : value}</p></div>)}
    </section>
    <p className="text-xs text-slate-500">{t("availabilityHint")}</p>

    {editor && <form aria-label={t(editor.id ? "editRoom" : "addRoom")} className="space-y-4 rounded-3xl border border-salsa-pink/30 bg-white p-6" onSubmit={event => { event.preventDefault(); mutate({ ...editor, roomId: editor.id, action: editor.id ? "update" : "create", capacity: Number(editor.capacity), pricePerPersonPerNight: Number(editor.pricePerPersonPerNight) }, () => setEditor(null)); }}>
      <div className="flex items-center justify-between"><h3 ref={editorRef} tabIndex={-1} className="font-bebas text-3xl">{t(editor.id ? "editRoom" : "addRoom")}</h3><Button icon={X} size="icon" variant="ghost" title={t("cancel")} disabled={busy} onClick={() => setEditor(null)} /></div>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-bold">{t("hotel")}<select className={field} disabled={!!editingState?.used} value={editor.hotelId} onChange={event => setEditor({ ...editor, hotelId: event.target.value })}>{HOTELS.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="text-xs font-bold">{t("roomNumber")}<input className={field} required maxLength={80} value={editor.roomNumber} onChange={event => setEditor({ ...editor, roomNumber: event.target.value })} /></label>
        <label className="text-xs font-bold">{t("roomType")}<select className={field} value={editor.roomType} onChange={event => setEditor({ ...editor, roomType: event.target.value })}>{ROOM_TYPES.map(value => <option key={value} value={value}>{t(`types.${value}`)}</option>)}</select></label>
        <label className="text-xs font-bold">{t("capacity")}<input className={field} type="number" required min={Math.max(1, editingState?.used || 0)} max="20" value={editor.capacity} onChange={event => setEditor({ ...editor, capacity: event.target.value })} /></label>
        <label className="text-xs font-bold">{t("nightPrice")}<input className={field} disabled={!!editingState?.used} type="number" required min="0" step="0.01" value={editor.pricePerPersonPerNight} onChange={event => setEditor({ ...editor, pricePerPersonPerNight: event.target.value })} /></label>
      </fieldset>
      {!!editingState?.used && <p className="text-xs text-slate-500">{t("editOccupiedHint")}</p>}
      <div className="flex gap-2"><Button type="submit" isLoading={busy}>{t("saveRoom")}</Button><Button variant="ghost" disabled={busy} onClick={() => setEditor(null)}>{t("cancel")}</Button></div>
    </form>}

    {allocation && <form className="space-y-4 rounded-3xl border border-salsa-mint bg-white p-6" onSubmit={event => { event.preventDefault(); mutate({ ...allocation, action: "assign", days: Number(allocation.days) }, () => setAllocation(null)); }}>
      <div className="flex items-center justify-between"><h3 ref={allocationRef} tabIndex={-1} className="font-bebas text-3xl">{t("manageAllocation")}</h3><Button icon={X} size="icon" variant="ghost" title={t("cancel")} disabled={busy} onClick={() => setAllocation(null)} /></div>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-bold">{t("searchTickets")}<input className={field} value={ticketSearch} onChange={event => setTicketSearch(event.target.value)} /></label>
        <label className="text-xs font-bold">{t("attendee")}<select className={field} required value={allocation.ticketId} onChange={event => setAllocation({ ...allocation, ticketId: event.target.value, sourceRoomId: tickets.find(ticket => ticket.id === event.target.value)?.roomId || null })}><option value="">{t("selectTicket")}</option>{[...new Map([...activeTickets, ...tickets.filter(ticket => ticket.id === allocation.ticketId)].map(ticket => [ticket.id, ticket])).values()].map(ticket => <option key={ticket.id} value={ticket.id}>{ticket.userName} · {ticket.ticketID}</option>)}</select></label>
        <label className="text-xs font-bold">{t("destinationRoom")}<select className={field} required value={allocation.roomId} onChange={event => setAllocation({ ...allocation, roomId: event.target.value })}>{states.map(room => <option key={room.id} value={room.id} disabled={(room.available === 0 || room.isBlocked) && room.id !== tickets.find(ticket => ticket.id === allocation.ticketId)?.roomId}>{room.hotelId} · {t("roomName", { number: room.roomNumber })} · {t("availableCount", { available: room.available, capacity: room.capacity })}</option>)}</select></label>
        <label className="text-xs font-bold">{t("days")}<input className={field} type="number" min="1" max="14" required value={allocation.days} onChange={event => setAllocation({ ...allocation, days: event.target.value })} /></label>
      </fieldset>
      <div className="flex gap-2"><Button type="submit" disabled={!allocation.ticketId} isLoading={busy}>{t("saveAllocation")}</Button><Button variant="ghost" disabled={busy} onClick={() => setAllocation(null)}>{t("cancel")}</Button></div>
    </form>}

    <section aria-label={t("filters")} className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs font-bold">{t("searchRooms")}<span className="relative block"><Search size={16} className="absolute left-3 top-4 text-slate-400" /><input className={`${field} pl-10`} value={search} placeholder={t("roomSearchHint")} onChange={event => setSearch(event.target.value)} /></span></label>
      <label className="text-xs font-bold">{t("hotel")}<select className={field} value={hotel} onChange={event => setHotel(event.target.value)}><option value="all">{t("allHotels")}</option>{HOTELS.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="text-xs font-bold">{t("roomType")}<select className={field} value={type} onChange={event => setType(event.target.value)}><option value="all">{t("allTypes")}</option>{ROOM_TYPES.map(value => <option key={value} value={value}>{t(`types.${value}`)}</option>)}</select></label>
      <label className="text-xs font-bold">{t("availability")}<select className={field} value={availability} onChange={event => setAvailability(event.target.value)}>{["all", "available", "full", "blocked"].map(value => <option key={value} value={value}>{t(value)}</option>)}</select></label>
    </section>

    {roomsError ? <div role="alert" className="rounded-3xl bg-white p-6"><p className="mb-3">{t("loadError")}</p><Button onClick={retry}>{t("retry")}</Button></div> : loading ? <p role="status" className="p-12 text-center">{t("loading")}</p> : !filtered.length ? <p className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-500">{t("noRooms")}</p> : <div className="grid items-start gap-5 lg:grid-cols-2">
      {filtered.map(room => <article key={room.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{room.hotelId} · {t(`types.${roomType(room)}`)}</p><h3 className="font-bebas text-3xl">{t("roomName", { number: room.roomNumber })}</h3></div><span className={`rounded-2xl px-3 py-2 text-xs font-bold ${room.isBlocked ? "bg-slate-200" : room.available ? "bg-salsa-mint/25" : "bg-salsa-pink/15"}`}>{t(room.isBlocked ? "blocked" : room.available ? "available" : "full")}</span></div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600"><span className="flex items-center gap-1"><Users size={14} />{t("occupiedCount", { count: room.occupants.length, capacity: room.capacity })}</span><span>{t("heldCount", { count: room.locks.length })}</span><span>{t("availableCount", { available: room.available, capacity: room.capacity })}</span></div>
          <div className="flex h-2 overflow-hidden rounded-full bg-salsa-mint/25" aria-hidden="true"><span className="bg-slate-900 transition-all" style={{ width: `${Math.min(100, room.occupants.length / room.capacity * 100)}%` }} /><span className="bg-salsa-pink transition-all" style={{ width: `${Math.min(100, room.locks.length / room.capacity * 100)}%` }} /></div>
          <RoomBeds room={room} now={now} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" icon={Plus} disabled={busy || !room.available} onClick={() => openAllocation(room)}>{t("addOccupant")}</Button>
            <Button size="icon" variant="ghost" icon={Edit2} title={t("editRoom")} disabled={busy} onClick={() => setEditor({ ...room, roomType: roomType(room) })} />
            <Button size="icon" variant="ghost" icon={room.isBlocked ? Unlock : Lock} title={t(room.isBlocked ? "unblockRoom" : "blockRoom")} disabled={busy} onClick={() => mutate({ action: "block", roomId: room.id, isBlocked: !room.isBlocked })} />
            <Button size="icon" variant="danger" icon={Trash2} title={t(room.used ? "cannotDelete" : "deleteRoom")} disabled={busy || !!room.used} onClick={() => confirm(t("deleteRoomConfirm", { number: room.roomNumber }), () => mutate({ action: "delete", roomId: room.id }))} />
          </div>
        </div>
        <details className="group border-t border-slate-100 bg-slate-50">
          <summary className="flex cursor-pointer list-none items-center justify-between p-5 text-xs font-bold focus-visible:outline-2 focus-visible:outline-salsa-pink">{t("occupantDetails", { count: room.occupants.length })}<ChevronDown size={16} className="transition-transform group-open:rotate-180" /></summary>
          <div className="space-y-3 px-5 pb-5">
            {!room.occupants.length && <p className="text-sm text-slate-500">{t("noOccupants")}</p>}
            {room.occupants.map((occupant, index) => {
              const ticket = ticketFor(occupant);
              const ambassador = users.find(user => user.id === (ticket?.ambassadorId || occupant.ambassadorId || ticket?.userId));
              return <div key={occupant.ticketId || occupant.id || index} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold">{ticket?.userName || occupant.name || t("unnamed")}</p>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div><dt className="text-slate-500">{t("passType")}</dt><dd>{ticket?.passType || occupant.passType || "—"}</dd></div>
                  <div><dt className="text-slate-500">{t("ambassador")}</dt><dd className="break-words">{ambassador?.ambassadorDisplayName || ambassador?.displayName || ticket?.ambassadorName || occupant.ambassadorName || occupant.ambassadorId || "—"}</dd></div>
                  <div className="col-span-2"><dt className="text-slate-500">{t("ticketId")}</dt><dd className="break-all">{ticket?.ticketID || occupant.ticketID || occupant.id}</dd></div>
                </dl>
                {ticket ? <>
                  <form className="flex items-end gap-2" onSubmit={event => { event.preventDefault(); mutate({ action: "days", ticketId: ticket.id, sourceRoomId: room.id, days: Number(new FormData(event.currentTarget).get("days")) }); }}>
                    <label className="text-xs font-bold">{t("days")}<input name="days" key={occupant.days} type="number" required min="1" max="14" defaultValue={occupant.days || 3} className={`${field} max-w-24`} disabled={busy} /></label>
                    <Button size="sm" type="submit" variant="outline" disabled={busy}>{t("save")}</Button>
                  </form>
                  <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => openAllocation(room, ticket)}>{t("reassign")}</Button><Button size="sm" variant="danger" disabled={busy} onClick={() => confirm(t("evictConfirm", { name: ticket.userName || t("unnamed") }), () => mutate({ action: "evict", ticketId: ticket.id, sourceRoomId: room.id }))}>{t("evict")}</Button></div>
                </> : <><p className="text-xs text-slate-500">{t("legacyOccupant")}</p><Button size="sm" variant="danger" disabled={busy || !occupant.id} onClick={() => confirm(t("evictConfirm", { name: occupant.name || String(occupant.id) }), () => mutate({ action: "evictOrphan", roomId: room.id, occupantId: occupant.id }))}>{t("evict")}</Button></>}
              </div>;
            })}
          </div>
        </details>
      </article>)}
    </div>}

    <details className="rounded-3xl border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer font-bebas text-3xl">{t("hotelFinancials")}</summary>
      {depositError && <p role="alert" className="mt-3 text-sm text-salsa-pink">{t("loadError")}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {HOTELS.map(hotelId => {
          const total = states.filter(room => room.hotelId === hotelId).reduce((sum, room) => sum + room.occupants.reduce((days, occupant) => days + (occupant.days || 3), 0) * (room.pricePerPersonPerNight || 0), 0);
          const deposit = Number(deposits[hotelId] || 0);
          return <div key={hotelId} className="rounded-2xl bg-slate-50 p-4"><h4 className="text-sm font-bold">{hotelId}</h4><p className="my-2 text-xs text-slate-600">{t("financialSummary", { total: total.toFixed(2), owed: (total - deposit).toFixed(2) })}</p><form className="flex items-end gap-2" onSubmit={event => { event.preventDefault(); mutate({ action: "deposit", hotelId, amount: Number(new FormData(event.currentTarget).get("amount")) }); }}><label className="text-xs font-bold">{t("deposit")}<input key={deposit} name="amount" type="number" required min="0" step="0.01" defaultValue={deposit} disabled={busy || depositError} className={field} /></label><Button type="submit" size="sm" variant="outline" disabled={busy || depositError}>{t("save")}</Button></form></div>;
        })}
      </div>
    </details>
  </div>;
}
