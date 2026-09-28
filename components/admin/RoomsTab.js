"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { doc, onSnapshot } from "firebase/firestore";
import { Check, Edit2, Lock, MoveRight, Plus, Search, Settings2, Trash2, Unlock } from "lucide-react";
import Button from "@/components/Button";
import RoomModal from "@/components/rooms/RoomModal";
import { usePopup } from "@/components/PopupProvider";
import { db } from "@/lib/firebase";
import { BOARD_OPTIONS, BGN_PER_EUR } from "@/lib/constants";
import { CONFIRMED_TICKET_STATUSES, HOTELS, remainingTime, roomState, roomType } from "@/lib/rooms";
import { hotelSettings, hotelSummary, roomCost } from "@/lib/hotel-financials";
import { roomError, roomRequest } from "@/lib/room-client";
import useRooms from "@/lib/useRooms";

const field = "w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-900 outline-none focus:border-salsa-pink focus:ring-1 focus:ring-salsa-pink disabled:bg-slate-50 disabled:text-slate-500";
const iconStyle = "!rounded-md !p-1.5";

export default function RoomsTab({ tickets = [], users = [] }) {
  const t = useTranslations("RoomSystem");
  const { showPopup } = usePopup();
  const { rooms, loading, error: roomsError, now, retry } = useRooms();
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState("all");
  const [editor, setEditor] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [ticketSearch, setTicketSearch] = useState("");
  const [financials, setFinancials] = useState({});
  const [deposits, setDeposits] = useState({});
  const [financialForm, setFinancialForm] = useState(null);
  const [settingsLoaded, setSettingsLoaded] = useState({});
  const [settingsError, setSettingsError] = useState(false);
  const [settingsRevision, setSettingsRevision] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    setSettingsLoaded({});
    setSettingsError(false);
    const failed = () => setSettingsError(true);
    const unsubRates = onSnapshot(doc(db, "settings", "hotel_financials"), snapshot => { setFinancials(snapshot.data() || {}); setSettingsLoaded(previous => ({ ...previous, rates: true })); }, failed);
    const unsubDeposits = onSnapshot(doc(db, "settings", "hotel_deposits"), snapshot => { setDeposits(snapshot.data() || {}); setSettingsLoaded(previous => ({ ...previous, deposits: true })); }, failed);
    return () => { unsubRates(); unsubDeposits(); };
  }, [settingsRevision]);

  const settingsReady = settingsLoaded.rates && settingsLoaded.deposits && !settingsError;
  const states = rooms.map(room => ({ ...room, ...roomState(room, now) }));
  const hotelName = id => id === "ВСУ" ? t("vfu") : id;
  const settingsFor = id => hotelSettings(id, financials, deposits, rooms);
  const dualCurrency = amount => `€${amount.toFixed(2)} / ${(amount * BGN_PER_EUR).toFixed(2)} ${t("bgn")}`;
  const modalOpen = !!(editor || allocation || financialForm);
  const mutate = async (body, after) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError(""); setNotice("");
    try { await roomRequest("/api/rooms/manage", body); setNotice(t("saved")); after?.(); }
    catch (err) { setError(roomError(t, err)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const confirm = (message, action) => showPopup({ type: "info", title: t("confirmAction"), message, confirmText: t("confirm"), cancelText: t("cancel"), onConfirm: action });
  const openEditor = (hotelId, room) => {
    setError("");
    setEditor({ id: room?.id, hotelId, roomNumber: room?.roomNumber || "", capacity: room?.capacity || 2, board: room?.board || "none", pricePerPersonPerNight: room?.pricePerPersonPerNight ?? settingsFor(hotelId).defaultRate });
  };
  const openFinancials = () => {
    setError("");
    setFinancialForm(HOTELS.map(hotelId => ({ hotelId, ...settingsFor(hotelId) })));
  };
  const changeFinancial = (hotelId, key, value) => setFinancialForm(previous => previous.map(hotel => hotel.hotelId === hotelId ? { ...hotel, [key]: value } : hotel));
  const ticketFor = occupant => tickets.find(ticket => ticket.id === (occupant.ticketId || occupant.id) || ticket.ticketID === occupant.id);
  const openAllocation = (room, ticket) => {
    setError(""); setTicketSearch("");
    setAllocation({ roomId: room.id, ticketId: ticket?.id || "", sourceRoomId: ticket ? room.id : null, days: ticket?.days || 3 });
  };
  const editingState = editor?.id ? states.find(room => room.id === editor.id) : null;
  const allocatedIds = new Set(states.flatMap(room => room.occupants.flatMap(occ => [occ.ticketId, occ.id])));
  const activeTickets = tickets.filter(ticket => ticket.id === allocation?.ticketId || (
    CONFIRMED_TICKET_STATUSES.includes(ticket.status) && !ticket.roomId && !allocatedIds.has(ticket.id) && !allocatedIds.has(ticket.ticketID) &&
    [ticket.userName, ticket.ticketID].join(" ").toLowerCase().includes(ticketSearch.toLowerCase())
  ));
  const matches = room =>
    (availability === "all" || (availability === "blocked" ? room.isBlocked : availability === "full" ? room.used >= room.capacity : room.available > 0)) &&
    [room.roomNumber, ...room.occupants.flatMap(occ => [ticketFor(occ)?.userName || occ.name, occ.ticketID]), ...room.locks.map(lock => lock.name)].join(" ").toLowerCase().includes(search.toLowerCase());
  const errorMessage = error && <p role="alert" className="mb-3 rounded-md bg-rose-50 p-2 text-xs text-rose-700">{error}</p>;

  return <div className="space-y-4 font-montserrat text-xs text-slate-900">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-bebas text-3xl">{t("managerTitle")}</h2>
      <Button size="sm" variant="outline" icon={Settings2} className="rounded-md" disabled={busy || loading || !settingsReady} onClick={openFinancials}>{t("financialsAndRates")}</Button>
    </header>
    {!modalOpen && errorMessage}
    {notice && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-800">{notice}</p>}
    {settingsError && <div role="alert" className="flex items-center gap-2 text-rose-600">{t("loadError")}<Button size="sm" variant="ghost" onClick={() => setSettingsRevision(value => value + 1)}>{t("retry")}</Button></div>}
    <section aria-label={t("filters")} className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-52 flex-1"><Search size={14} className="absolute left-3 top-2.5 text-slate-400" /><input aria-label={t("searchRooms")} className={`${field} pl-9`} value={search} placeholder={t("roomSearchHint")} onChange={event => setSearch(event.target.value)} /></label>
      <select aria-label={t("availability")} className={`${field} w-auto`} value={availability} onChange={event => setAvailability(event.target.value)}>{["all", "available", "full", "blocked"].map(value => <option key={value} value={value}>{t(value)}</option>)}</select>
    </section>
    {roomsError && <div role="alert" className="flex items-center gap-2 text-rose-600">{t("loadError")}<Button size="sm" onClick={retry}>{t("retry")}</Button></div>}

    {HOTELS.map((hotelId, hotelIndex) => {
      const hotelRooms = states.filter(room => room.hotelId === hotelId).sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }));
      const summary = hotelSummary(hotelRooms, settingsFor(hotelId));
      const filtered = hotelRooms.filter(matches);
      return <section key={hotelId} aria-labelledby={`hotel-title-${hotelIndex}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-3 py-2">
          <h3 id={`hotel-title-${hotelIndex}`} className="font-bebas text-2xl">{hotelName(hotelId)}</h3>
          <Button size="sm" variant="ghost" icon={Plus} disabled={busy || loading || roomsError || !settingsReady} onClick={() => openEditor(hotelId)}>{t("addRoom")}</Button>
        </header>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 border-b border-slate-200 px-3 py-2">
          <div className="flex items-baseline gap-2"><dt className="text-slate-500">{t("totalGuests")}</dt><dd className="font-semibold">{loading ? "—" : summary.guests}{!!summary.held && <span className="ml-2 font-normal text-amber-700">{t("heldCount", { count: summary.held })}</span>}</dd></div>
          <div className="flex items-baseline gap-2"><dt className="text-slate-500">{t("depositShort")}</dt><dd className="font-bebas text-lg">{settingsReady ? dualCurrency(settingsFor(hotelId).deposit) : "—"}</dd></div>
          <div className="flex items-baseline gap-2"><dt className="text-slate-500">{t("remaining")}</dt><dd className="font-bebas text-lg">{settingsReady && !loading ? dualCurrency(summary.remaining) : "—"}</dd></div>
        </dl>
        <div className="overflow-x-auto">
          <table aria-label={t("hotelTable", { hotel: hotelName(hotelId) })} className="w-full min-w-[850px] border-collapse text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase text-slate-500">
              <tr>{["roomIndex", "roomNumber", "boardLabel", "occupantNames", "days", "roomTotal", "actions"].map(key => <th key={key} scope="col" className={`p-2 ${key === "roomTotal" ? "text-right" : ""}`}>{t(key)}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(room => {
                const beds = [...room.occupants.map(occupant => ({ kind: "occupied", occupant })), ...room.locks.map(occupant => ({ kind: "held", occupant })), ...Array.from({ length: Math.max(0, room.capacity - room.used) }, () => ({ kind: "empty" }))];
                return <Fragment key={room.id}>{beds.map((bed, bedIndex) => {
                  const ticket = bed.occupant && ticketFor(bed.occupant);
                  const ambassador = users.find(user => user.id === (ticket?.ambassadorId || bed.occupant?.ambassadorId || ticket?.userId));
                  const details = bed.kind === "occupied" ? [ticket?.ticketID || bed.occupant.ticketID || bed.occupant.id, ticket?.passType || bed.occupant.passType, ambassador?.ambassadorDisplayName || ambassador?.displayName || ticket?.ambassadorName || bed.occupant.ambassadorName].filter(Boolean).join(" · ") : "";
                  return <tr key={bed.occupant?.ticketId || bed.occupant?.draftId || bed.occupant?.id || bedIndex} className={`border-b ${bedIndex === beds.length - 1 ? "border-slate-300" : "border-slate-100"} hover:bg-slate-50/70`}>
                    {bedIndex === 0 && <>
                      <td rowSpan={beds.length} className="w-12 border-r border-slate-100 p-2 align-top text-slate-400">{hotelRooms.indexOf(room) + 1}</td>
                      <th scope="rowgroup" rowSpan={beds.length} className="w-24 border-r border-slate-100 p-2 align-top font-semibold">{room.roomNumber}<span className="mt-1 block text-[10px] font-normal text-slate-500">{t("bedCount", { count: room.capacity })}</span>{room.isBlocked && <span className="block text-[10px] text-rose-600">{t("blocked")}</span>}</th>
                      <td rowSpan={beds.length} className="w-28 border-r border-slate-100 p-2 align-top text-slate-600">{t(`board.${BOARD_OPTIONS.includes(room.board) ? room.board : "none"}`)}</td>
                    </>}
                    <td className="min-w-56 p-2">
                      {bed.kind === "empty" ? <span className="inline-block rounded border border-dashed border-slate-300 px-2 py-1 text-[10px] text-slate-400">{t("vacantBed")}</span> : <>
                        <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[10px] ${bed.kind === "occupied" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{t(bed.kind)}</span><span className="font-medium">{ticket?.userName || bed.occupant.name || t("unnamed")}</span>{bed.kind === "held" && <span className="tabular-nums text-slate-400">{remainingTime(bed.occupant.expiresAt, now)}</span>}</div>
                        {details && <p className="mt-0.5 text-[10px] text-slate-400">{details}</p>}
                      </>}
                    </td>
                    <td className="w-24 p-2">
                      {bed.kind === "occupied" && ticket ? <form className="flex items-center gap-1" onSubmit={event => { event.preventDefault(); mutate({ action: "days", ticketId: ticket.id, sourceRoomId: room.id, days: Number(new FormData(event.currentTarget).get("days")) }); }}>
                        <input key={bed.occupant.days} name="days" type="number" aria-label={t("nightsFor", { name: ticket.userName || t("unnamed") })} min="1" max="14" required defaultValue={bed.occupant.days || 3} disabled={busy} className={`${field} w-12 !p-1.5`} /><Button size="icon" type="submit" icon={Check} variant="ghost" className={iconStyle} title={t("save")} disabled={busy} />
                      </form> : bed.occupant ? bed.occupant.days || 3 : "—"}
                    </td>
                    {bedIndex === 0 && <td rowSpan={beds.length} className="w-28 border-x border-slate-100 p-2 text-right align-top"><span className="font-bebas text-xl">€{roomCost(room).toFixed(2)}</span><span className="block text-[10px] text-slate-400">{t("rateShort", { price: Number(room.pricePerPersonPerNight || 0).toFixed(2) })}</span></td>}
                    <td className="w-44 p-2">
                      <div className="flex items-center gap-1">
                        {bed.kind === "empty" && <Button size="sm" variant="ghost" className="!px-2 !py-1.5 !text-[10px]" disabled={busy || room.isBlocked} onClick={() => openAllocation(room)}>{t("assign")}</Button>}
                        {bed.kind === "occupied" && ticket && <Button size="icon" icon={MoveRight} variant="ghost" className={iconStyle} title={t("reassign")} disabled={busy} onClick={() => openAllocation(room, ticket)} />}
                        {bed.kind === "occupied" && <Button size="icon" icon={Trash2} variant="danger" className={iconStyle} title={t("evict")} disabled={busy || (!ticket && !bed.occupant.id)} onClick={() => confirm(t("evictConfirm", { name: ticket?.userName || bed.occupant.name || t("unnamed") }), () => mutate(ticket ? { action: "evict", ticketId: ticket.id, sourceRoomId: room.id } : { action: "evictOrphan", roomId: room.id, occupantId: bed.occupant.id }))} />}
                        {bedIndex === 0 && <span className="ml-1 inline-flex gap-1 border-l border-slate-200 pl-1">
                          <Button size="icon" icon={Edit2} variant="ghost" className={iconStyle} title={t("editRoom")} disabled={busy} onClick={() => openEditor(hotelId, room)} />
                          <Button size="icon" icon={room.isBlocked ? Unlock : Lock} variant="ghost" className={iconStyle} title={t(room.isBlocked ? "unblockRoom" : "blockRoom")} disabled={busy} onClick={() => mutate({ action: "block", roomId: room.id, isBlocked: !room.isBlocked })} />
                          <Button size="icon" icon={Trash2} variant="ghost" className={iconStyle} title={t(room.used ? "cannotDelete" : "deleteRoom")} disabled={busy || !!room.used} onClick={() => confirm(t("deleteRoomConfirm", { number: room.roomNumber }), () => mutate({ action: "delete", roomId: room.id }))} />
                        </span>}
                      </div>
                    </td>
                  </tr>;
                })}</Fragment>;
              })}
              {!filtered.length && <tr><td colSpan={7} className="p-3 text-center text-slate-400">{loading ? t("loading") : hotelRooms.length ? t("noRooms") : t("noHotelRooms")}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>;
    })}

    {financialForm && <RoomModal title={t("financialsAndRates")} wide busy={busy} onClose={() => setFinancialForm(null)}>
      <form className="space-y-3" onSubmit={event => { event.preventDefault(); mutate({ action: "financials", hotels: financialForm.map(hotel => ({ hotelId: hotel.hotelId, defaultRate: Number(hotel.defaultRate), deposit: Number(hotel.deposit), adjustments: Number(hotel.adjustments) })) }, () => setFinancialForm(null)); }}>
        {errorMessage}
        <p className="text-xs text-slate-500">{t("financialHint")}</p>
        <fieldset disabled={busy} className="overflow-x-auto">
          <table className="w-full min-w-[570px] text-left text-xs">
            <thead className="border-y border-slate-200 bg-slate-50 text-slate-500"><tr><th className="p-2">{t("hotel")}</th><th className="p-2">{t("defaultRate")}</th><th className="p-2">{t("deposit")}</th><th className="p-2">{t("adjustments")}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{financialForm.map(hotel => <tr key={hotel.hotelId}><th scope="row" className="p-2 font-semibold">{hotelName(hotel.hotelId)}</th>{["defaultRate", "deposit", "adjustments"].map(key => <td key={key} className="p-2"><input aria-label={t("hotelFinancialField", { hotel: hotelName(hotel.hotelId), field: t(key) })} className={field} type="number" min={key === "adjustments" ? undefined : "0"} step="0.01" required value={hotel[key]} onChange={event => changeFinancial(hotel.hotelId, key, event.target.value)} /></td>)}</tr>)}</tbody>
          </table>
        </fieldset>
        <p className="text-xs text-slate-500">{t("adjustmentHint")}</p>
        <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" disabled={busy} onClick={() => setFinancialForm(null)}>{t("cancel")}</Button><Button size="sm" type="submit" isLoading={busy}>{t("save")}</Button></div>
      </form>
    </RoomModal>}

    {editor && <RoomModal title={`${t(editor.id ? "editRoom" : "addRoom")} · ${hotelName(editor.hotelId)}`} busy={busy} onClose={() => setEditor(null)}>
      <form className="space-y-3" onSubmit={event => { event.preventDefault(); mutate({ ...editor, roomId: editor.id, action: editor.id ? "update" : "create", capacity: Number(editor.capacity), roomType: roomType({ capacity: Number(editor.capacity) }), pricePerPersonPerNight: Number(editor.pricePerPersonPerNight) }, () => setEditor(null)); }}>
        {errorMessage}
        <fieldset disabled={busy} className="grid grid-cols-2 gap-3 text-xs">
          <label>{t("roomNumber")}<input className={`${field} mt-1`} required maxLength={80} value={editor.roomNumber} onChange={event => setEditor({ ...editor, roomNumber: event.target.value })} /></label>
          <label>{t("capacity")}<input className={`${field} mt-1`} type="number" required min={Math.max(1, editingState?.used || 0)} max="20" value={editor.capacity} onChange={event => setEditor({ ...editor, capacity: event.target.value })} /></label>
          <label>{t("boardLabel")}<select className={`${field} mt-1`} value={editor.board} onChange={event => setEditor({ ...editor, board: event.target.value })}>{BOARD_OPTIONS.map(value => <option key={value} value={value}>{t(`board.${value}`)}</option>)}</select></label>
          <label>{t("nightPrice")}<input className={`${field} mt-1`} disabled={!!editingState?.used} type="number" required min="0" step="0.01" value={editor.pricePerPersonPerNight} onChange={event => setEditor({ ...editor, pricePerPersonPerNight: event.target.value })} /></label>
        </fieldset>
        {!!editingState?.used && <p className="text-xs text-slate-500">{t("editOccupiedHint")}</p>}
        <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditor(null)}>{t("cancel")}</Button><Button size="sm" type="submit" isLoading={busy}>{t("saveRoom")}</Button></div>
      </form>
    </RoomModal>}

    {allocation && <RoomModal title={t("manageAllocation")} busy={busy} onClose={() => setAllocation(null)}>
      <form className="space-y-3" onSubmit={event => { event.preventDefault(); mutate({ ...allocation, action: "assign", days: Number(allocation.days) }, () => setAllocation(null)); }}>
        {errorMessage}
        <fieldset disabled={busy} className="grid gap-3 text-xs">
          <label>{t("searchTickets")}<input className={`${field} mt-1`} value={ticketSearch} onChange={event => setTicketSearch(event.target.value)} /></label>
          <label>{t("attendee")}<select className={`${field} mt-1`} required value={allocation.ticketId} onChange={event => setAllocation({ ...allocation, ticketId: event.target.value, sourceRoomId: tickets.find(ticket => ticket.id === event.target.value)?.roomId || null })}><option value="">{t("selectTicket")}</option>{activeTickets.map(ticket => <option key={ticket.id} value={ticket.id}>{ticket.userName} · {ticket.ticketID}</option>)}</select></label>
          <label>{t("destinationRoom")}<select className={`${field} mt-1`} required value={allocation.roomId} onChange={event => setAllocation({ ...allocation, roomId: event.target.value })}>{states.map(room => <option key={room.id} value={room.id} disabled={!room.available && room.id !== allocation.sourceRoomId}>{hotelName(room.hotelId)} · {t("roomName", { number: room.roomNumber })} · {t("availableCount", { available: room.available, capacity: room.capacity })}</option>)}</select></label>
          <label>{t("days")}<input className={`${field} mt-1`} type="number" min="1" max="14" required value={allocation.days} onChange={event => setAllocation({ ...allocation, days: event.target.value })} /></label>
        </fieldset>
        <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" disabled={busy} onClick={() => setAllocation(null)}>{t("cancel")}</Button><Button size="sm" type="submit" disabled={!allocation.ticketId} isLoading={busy}>{t("saveAllocation")}</Button></div>
      </form>
    </RoomModal>}
  </div>;
}
