"use client";
import { useEffect, useRef, useState } from "react";
import { Bed, Clock, Plus, Search, Trash2, Ticket, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Button from "@/components/Button";
import RoomBeds from "@/components/rooms/RoomBeds";
import { usePopup } from "@/components/PopupProvider";
import { auth } from "@/lib/firebase";
import { getPriceAtDate } from "@/lib/pricing";
import { GENDERS, HOTELS, remainingTime, roomState, roomType } from "@/lib/rooms";
import { roomError, roomRequest } from "@/lib/room-client";
import useRooms from "@/lib/useRooms";

const field = "w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-salsa-pink focus:ring-2 focus:ring-salsa-pink/15 disabled:opacity-50";
const newRow = () => ({ id: crypto.randomUUID(), name: "", type: "Full Pass", gender: "unspecified", accommodation: "None", roomId: null });
const validName = name => typeof name === "string" && name.trim().length >= 2 && name.length <= 150 && /^[\p{L}\s\-']+$/u.test(name);
const price = type => type === "Free Full Pass" ? 0 : getPriceAtDate(type);

export default function DraftTab({ groupRows, saveRoster, submitGroupToCart, submitting = false }) {
  const t = useTranslations("DraftTab");
  const r = useTranslations("RoomSystem");
  const { showPopup } = usePopup();
  const { rooms, loading, error: roomsError, now, retry } = useRooms();
  const [search, setSearch] = useState("");
  const [passFilter, setPassFilter] = useState("all");
  const [hotel, setHotel] = useState("all");
  const [roomSearch, setRoomSearch] = useState("");
  const [bulkCount, setBulkCount] = useState(1);
  const [selected, setSelected] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rowsRef = useRef(groupRows);
  const tokenRef = useRef(null);
  const busyRef = useRef(false);
  rowsRef.current = groupRows;
  const uid = auth.currentUser?.uid;
  const active = groupRows.find(row => row.id === activeId);
  const disabled = busy || submitting;

  useEffect(() => {
    let alive = true;
    const refreshToken = () => auth.currentUser?.getIdToken().then(token => { if (alive) tokenRef.current = token; }).catch(() => {});
    refreshToken();
    const timer = setInterval(refreshToken, 5 * 60 * 1000);
    // Best effort on navigation/closing the tab; server TTL covers interrupted networks.
    const release = () => {
      const draftIds = rowsRef.current.filter(row => row.roomId).map(row => String(row.id));
      if (!draftIds.length || !tokenRef.current) return;
      fetch("/api/rooms/lock", {
        method: "POST", keepalive: true,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
        body: JSON.stringify({ action: "unlock", draftIds }),
      }).catch(() => {});
    };
    window.addEventListener("pagehide", release);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("pagehide", release);
      release();
    };
  }, []);

  const updateRows = rows => { rowsRef.current = rows; saveRoster(rows); };
  const update = (id, key, value) => updateRows(rowsRef.current.map(row => row.id === id ? { ...row, [key]: value } : row));
  const syncDetails = async id => {
    const row = rowsRef.current.find(row => row.id === id);
    if (!row?.roomId || !validName(row.name) || !lockFor(row)) return;
    try {
      await roomRequest("/api/rooms/lock", { action: "details", roomId: row.roomId, draftId: String(row.id), name: row.name, gender: row.gender || "unspecified" });
    } catch (err) {
      // A concurrent move/confirmation already carries the latest attendee details.
      if (!["lockExpired", "alreadyFinalized"].includes(err.message)) setError(roomError(r, err));
    }
  };
  const run = async operation => {
    if (busyRef.current || submitting) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try { await operation(); }
    catch (err) { setError(roomError(r, err)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const releaseRows = async ids => {
    await roomRequest("/api/rooms/lock", { action: "unlock", draftIds: ids.map(String) });
    updateRows(rowsRef.current.map(row => ids.includes(row.id) ? { ...row, roomId: null, accommodation: "None", lockExpiresAt: null } : row));
  };
  const unassign = id => {
    const row = rowsRef.current.find(row => String(row.id) === String(id));
    if (row) run(() => releaseRows([row.id]));
  };
  const assign = room => run(async () => {
    if (!active || !validName(active.name)) throw new Error("nameRequired");
    const result = await roomRequest("/api/rooms/lock", { action: "lock", roomId: room.id, draftId: String(active.id), name: active.name, gender: active.gender || "unspecified" });
    updateRows(rowsRef.current.map(row => row.id === active.id ? { ...row, roomId: room.id, accommodation: result.accommodation, lockExpiresAt: result.expiresAt } : row));
  });
  const remove = ids => showPopup({
    type: "info", title: t("deleteTitle"), message: t("deleteMsgMass", { count: ids.length }),
    confirmText: t("deleteBtn"), cancelText: t("cancelBtn"),
    onConfirm: () => run(async () => {
      await releaseRows(ids);
      updateRows(rowsRef.current.filter(row => !ids.includes(row.id)));
      setSelected(previous => previous.filter(id => !ids.includes(id)));
      if (ids.includes(activeId)) setActiveId(null);
    }),
  });
  const add = () => {
    const count = Number(bulkCount);
    if (!Number.isInteger(count) || count < 1 || count + groupRows.length > 100) { setError(t("errLimitMsg")); return; }
    updateRows([...rowsRef.current, ...Array.from({ length: count }, newRow)]);
    setBulkCount(1);
  };
  const lockFor = row => {
    const room = rooms.find(room => room.id === row.roomId);
    return room && roomState(room, now).locks.find(lock => lock.ownerId === uid && lock.draftId === String(row.id));
  };
  const invalidHold = groupRows.some(row => row.roomId && (!lockFor(row) || rooms.find(room => room.id === row.roomId)?.isBlocked));
  const invalidRoster = !groupRows.length || groupRows.some(row => !validName(row.name)) || invalidHold;
  const visibleRows = groupRows.filter(row => row.name.toLowerCase().includes(search.toLowerCase()) && (passFilter === "all" || row.type === passFilter));
  const visibleRooms = rooms.filter(room => (hotel === "all" || room.hotelId === hotel) && !room.isBlocked && String(room.roomNumber).toLowerCase().includes(roomSearch.toLowerCase())).sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }));
  const passTotal = groupRows.reduce((sum, row) => sum + price(row.type), 0);
  const hotelTotal = groupRows.reduce((sum, row) => sum + (row.roomId ? (rooms.find(room => room.id === row.roomId)?.pricePerPersonPerNight || 0) * 3 : 0), 0);
  const commission = groupRows.filter(row => row.type === "Full Pass").length * 10;
  const passOptions = [["Full Pass", "passFull"], ["Performers Pass", "passPerformers"], ["Free Full Pass", "passFree"]];
  const register = () => {
    if (invalidRoster || disabled) return;
    showPopup({
      type: "info", title: t("confirmTitle"),
      message: r("registrationSummary", { count: groupRows.length, total: (passTotal + hotelTotal - commission).toFixed(2) }),
      confirmText: t("confirmSubmit"), cancelText: t("cancelBtn"),
      onConfirm: () => run(async () => { await submitGroupToCart(); }),
    });
  };

  return <div className="space-y-6 font-montserrat text-slate-900">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6">
      <div><h2 className="font-bebas text-4xl">{t("title")}</h2><p className="text-sm text-slate-500">{r("draftIntro")}</p></div>
      <div className="flex items-end gap-2">
        <label className="text-xs font-bold">{r("addCount")}<input aria-label={r("addCount")} className={`${field} mt-1 w-20`} type="number" min="1" max={Math.max(1, 100 - groupRows.length)} value={bulkCount} onChange={event => setBulkCount(event.target.value)} disabled={disabled} /></label>
        <Button icon={Plus} onClick={add} disabled={disabled || groupRows.length >= 100}>{t("btnAdd")}</Button>
        <span className="pb-2 font-bebas text-2xl">{groupRows.length}/100</span>
      </div>
    </header>

    {error && <div role="alert" className="rounded-2xl border border-salsa-pink/30 bg-salsa-pink/10 p-4 text-sm">{error}</div>}
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative min-w-48 flex-1"><Search size={16} className="absolute left-3 top-4 text-slate-400" /><input aria-label={t("searchPlaceholder")} className={`${field} pl-10`} placeholder={t("searchPlaceholder")} value={search} onChange={event => setSearch(event.target.value)} /></label>
      <select aria-label={t("thPass")} className={`${field} sm:w-48`} value={passFilter} onChange={event => setPassFilter(event.target.value)}><option value="all">{t("allPasses")}</option>{passOptions.map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}</select>
      {!!selected.length && <Button variant="danger" icon={Trash2} disabled={disabled} onClick={() => remove(selected)}>{t("btnDeleteSel", { count: selected.length })}</Button>}
      <Button variant="ghost" disabled={disabled || !groupRows.length} onClick={() => remove(groupRows.map(row => row.id))}>{r("discardDraft")}</Button>
    </div>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
      <section aria-label={t("title")} className="space-y-3">
        {!!visibleRows.length && <label className="flex items-center gap-2 px-2 text-xs text-slate-600"><input type="checkbox" disabled={disabled} checked={visibleRows.every(row => selected.includes(row.id))} onChange={event => setSelected(event.target.checked ? visibleRows.map(row => row.id) : [])} className="accent-salsa-pink" />{r("selectAll")}</label>}
        {visibleRows.map(row => {
          const lock = lockFor(row);
          const room = rooms.find(room => room.id === row.roomId);
          return <article key={row.id} className={`rounded-3xl border bg-white p-4 transition-colors sm:p-5 ${activeId === row.id ? "border-salsa-pink ring-2 ring-salsa-pink/10" : "border-slate-200"}`}>
            <div className="mb-3 flex items-center gap-3">
              <input type="checkbox" aria-label={r("selectAttendee", { name: row.name || r("unnamed") })} checked={selected.includes(row.id)} disabled={disabled} onChange={event => setSelected(previous => event.target.checked ? [...previous, row.id] : previous.filter(id => id !== row.id))} className="accent-salsa-pink" />
              <label className="min-w-0 flex-1 text-xs font-bold">{t("thName")}<input className={`${field} mt-1`} placeholder={t("namePlaceholder")} value={row.name} maxLength={150} disabled={disabled} onChange={event => update(row.id, "name", event.target.value.toUpperCase())} onBlur={() => syncDetails(row.id)} /></label>
              <Button size="icon" variant="ghost" icon={Trash2} title={r("removeNamed", { name: row.name || r("unnamed") })} disabled={disabled} onClick={() => remove([row.id])} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold">{t("thPass")}<select className={`${field} mt-1`} value={row.type} disabled={disabled} onChange={event => update(row.id, "type", event.target.value)}>{passOptions.map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}</select></label>
              <label className="text-xs font-bold">{r("genderLabel")}<select className={`${field} mt-1`} value={row.gender || "unspecified"} disabled={disabled} onChange={event => { update(row.id, "gender", event.target.value); syncDetails(row.id); }}>{GENDERS.map(value => <option key={value} value={value}>{r(`gender.${value}`)}</option>)}</select></label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <div className="text-xs">
                <p className="font-bold">{row.roomId ? `${row.accommodation} · ${r("roomName", { number: room?.roomNumber || "—" })}` : r("noAccommodation")}</p>
                {row.roomId && <p className={`mt-1 flex items-center gap-1 ${lock ? "text-slate-600" : "text-salsa-pink"}`}><Clock size={12} />{loading ? r("loading") : lock ? r("expiresIn", { time: remainingTime(lock.expiresAt, now) }) : r("holdExpired")}</p>}
                <p className="mt-1 text-slate-500">{r("passPrice", { price: price(row.type).toFixed(2) })}</p>
              </div>
              <div className="flex gap-1">
                {row.roomId && <Button size="icon" variant="ghost" icon={X} title={r("unassign")} disabled={disabled} onClick={() => unassign(row.id)} />}
                <Button size="sm" variant={activeId === row.id ? "primary" : "outline"} icon={Bed} disabled={disabled} onClick={() => setActiveId(row.id)}>{r(row.roomId ? "changeRoom" : "chooseRoom")}</Button>
              </div>
            </div>
          </article>;
        })}
        {!visibleRows.length && <p className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{t("noDrafts")}</p>}
      </section>

      <section aria-label={r("roomSelector")} className="space-y-4 rounded-3xl bg-slate-50 p-4 sm:p-6">
        <div><h3 className="font-bebas text-3xl">{r("roomSelector")}</h3><p className="mt-1 text-sm text-slate-600">{active ? r("assigningFor", { name: active.name || r("unnamed") }) : r("selectAttendeeHint")}</p><p className="mt-2 text-xs text-slate-500">{r("holdHint")}</p></div>
        <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-salsa-mint/25 px-3 py-1">{r("empty")}</span><span className="rounded-full bg-salsa-pink/15 px-3 py-1">{r("held")}</span><span className="rounded-full bg-slate-200 px-3 py-1">{r("occupied")}</span></div>
        <div className="grid grid-cols-2 gap-2"><select aria-label={r("hotel")} className={field} value={hotel} onChange={event => setHotel(event.target.value)}><option value="all">{r("allHotels")}</option>{HOTELS.map(value => <option key={value}>{value}</option>)}</select><input aria-label={r("searchRooms")} className={field} placeholder={r("searchRooms")} value={roomSearch} onChange={event => setRoomSearch(event.target.value)} /></div>
        {roomsError ? <div role="alert" className="space-y-2 text-sm"><p>{r("loadError")}</p><Button onClick={retry} size="sm">{r("retry")}</Button></div> : loading ? <p role="status">{r("loading")}</p> : visibleRooms.length ? visibleRooms.map(room => {
          const state = roomState(room, now);
          const heldHere = active && state.locks.some(lock => lock.ownerId === uid && lock.draftId === String(active.id));
          return <article key={room.id} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2"><div><p className="text-xs text-slate-500">{room.hotelId} · {r(`types.${roomType(room)}`)}</p><h4 className="font-bebas text-3xl">{r("roomName", { number: room.roomNumber })}</h4></div><span className="rounded-2xl bg-salsa-mint/20 px-3 py-2 text-xs font-bold">{r("availableCount", { available: state.available, capacity: room.capacity })}</span></div>
            <RoomBeds room={room} now={now} ownerId={uid} onAssign={active && validName(active.name) ? () => assign(room) : null} onUnassign={unassign} disabled={disabled} />
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-500">{r("stayPrice", { price: ((room.pricePerPersonPerNight || 0) * 3).toFixed(2) })}</span><Button size="sm" variant={heldHere ? "outline" : "primary"} disabled={disabled || !active || !validName(active.name) || (!state.available && !heldHere)} onClick={() => assign(room)}>{r(heldHere ? "renewHold" : state.available ? "assign" : "full")}</Button></div>
          </article>;
        }) : <p className="py-8 text-center text-sm text-slate-500">{r("noRooms")}</p>}
      </section>
    </div>

    <footer className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-slate-900 p-6 text-white">
      <div className="flex flex-wrap gap-6">
        {[[t("sumSales"), passTotal + hotelTotal], [t("commission"), commission], [t("amountOwed"), passTotal + hotelTotal - commission]].map(([label, value]) => <div key={label}><p className="text-xs text-slate-300">{label}</p><p className="font-bebas text-3xl">€{value.toFixed(2)}</p></div>)}
      </div>
      <div className="space-y-2"><Button icon={Ticket} disabled={disabled || invalidRoster || (groupRows.some(row => row.roomId) && (loading || roomsError))} isLoading={submitting} onClick={register}>{t("confirmSubmit")}</Button>{invalidHold && !loading && <p className="max-w-xs text-xs text-salsa-mint">{r("renewBeforeSubmit")}</p>}</div>
    </footer>
  </div>;
}
