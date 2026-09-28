"use client";
import { useEffect, useRef, useState } from "react";
import { Clock, Plus, Search, Trash2, Ticket, ChevronDown, Bed, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import Button from "@/components/Button";
import RoomModal from "@/components/rooms/RoomModal";
import CustomDropdown from "@/components/CustomDropdown";
import { usePopup } from "@/components/PopupProvider";
import { auth } from "@/lib/firebase";
import { getPriceAtDate } from "@/lib/pricing";
import { HOTELS, remainingTime, roomState, roomType } from "@/lib/rooms";
import { isOptionalEmail } from "@/lib/validation";
import { roomError, roomRequest } from "@/lib/room-client";
import useRooms from "@/lib/useRooms";

// --- Styling Helpers (from old UI) ---
const getPassBgColor = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('free')) return 'bg-yellow-400';
  if (t.includes('performers')) return 'bg-violet-600';
  return 'bg-salsa-pink'; 
};

const getPassTextColor = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('free')) return 'text-yellow-900';
  return 'text-white';
};

const getPassStyle = (type) => `${getPassBgColor(type)} ${getPassTextColor(type)} border-transparent`;

// --- Core Logic & Helpers (from new UI) ---
const newRow = () => ({ id: crypto.randomUUID(), name: "", email: "", type: "Full Pass", accommodation: "None", roomId: null });
const validName = name => typeof name === "string" && name.trim().length >= 2 && name.length <= 150 && /^[\p{L}\s\-']+$/u.test(name);
const price = type => type === "Free Full Pass" ? 0 : getPriceAtDate(type);
const commissionFor = type => type === "Full Pass" ? 10 : 0;

export default function DraftTab({ groupRows, saveRoster, submitGroupToCart, submitting = false }) {
  const t = useTranslations("DraftTab");
  const r = useTranslations("RoomSystem");
  const { showPopup } = usePopup();
  const { rooms, loading, error: roomsError, now, retry } = useRooms();
  const [search, setSearch] = useState("");
  const [passFilter, setPassFilter] = useState("all");
  const [bulkCount, setBulkCount] = useState(1);
  const [selected, setSelected] = useState([]);
  const [picker, setPicker] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  
  const rowsRef = useRef(groupRows);
  const tokenRef = useRef(null);
  const busyRef = useRef(false);
  rowsRef.current = groupRows;
  
  const uid = auth.currentUser?.uid;
  const active = groupRows.find(row => row.id === picker?.rowId);
  const disabled = busy || submitting;

  useEffect(() => {
    let alive = true;
    const refreshToken = () => auth.currentUser?.getIdToken().then(token => { if (alive) tokenRef.current = token; }).catch(() => {});
    refreshToken();
    const timer = setInterval(refreshToken, 5 * 60 * 1000);
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
  
  const lockFor = row => {
    const room = rooms.find(room => room.id === row.roomId);
    return room && roomState(room, now).locks.find(lock => lock.ownerId === uid && lock.draftId === String(row.id));
  };
  
  const syncName = async id => {
    const row = rowsRef.current.find(row => row.id === id);
    if (!row?.roomId || !validName(row.name) || !lockFor(row)) return;
    try {
      await roomRequest("/api/rooms/lock", { action: "details", roomId: row.roomId, draftId: String(row.id), name: row.name });
    } catch (err) {
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
  
  const chooseHotel = (row, hotelId) => {
    setError("");
    if (hotelId === "None") run(() => releaseRows([row.id]));
    else setPicker({ rowId: row.id, hotelId });
  };
  
  const assign = room => run(async () => {
    if (!active || !validName(active.name)) throw new Error("nameRequired");
    const result = await roomRequest("/api/rooms/lock", { action: "lock", roomId: room.id, draftId: String(active.id), name: active.name });
    updateRows(rowsRef.current.map(row => row.id === active.id ? { ...row, roomId: room.id, accommodation: result.accommodation, lockExpiresAt: result.expiresAt } : row));
    setPicker(null);
  });
  
  const remove = ids => showPopup({
    type: "info", title: t("deleteTitle"), message: t("deleteMsgMass", { count: ids.length }),
    confirmText: t("deleteBtn"), cancelText: t("cancelBtn"),
    onConfirm: () => run(async () => {
      await releaseRows(ids);
      updateRows(rowsRef.current.filter(row => !ids.includes(row.id)));
      setSelected(previous => previous.filter(id => !ids.includes(id)));
    }),
  });
  
  const add = () => {
    const count = Number(bulkCount);
    if (!Number.isInteger(count) || count < 1 || count + groupRows.length > 100) { setError(t("errLimitMsg")); return; }
    updateRows([...rowsRef.current, ...Array.from({ length: count }, newRow)]);
    setBulkCount(1);
  };

  const invalidHold = groupRows.some(row => row.roomId && (!lockFor(row) || rooms.find(room => room.id === row.roomId)?.isBlocked));
  const invalidRoster = !groupRows.length || groupRows.some(row => !validName(row.name) || !isOptionalEmail(row.email)) || invalidHold;
  
  const visibleRows = groupRows.filter(row => (row.name || "").toLowerCase().includes(search.toLowerCase()) && (passFilter === "all" || row.type === passFilter));
  const visibleRooms = rooms.filter(room => {
    const state = roomState(room, now);
    return room.hotelId === picker?.hotelId && !room.isBlocked && (state.available > 0 || state.locks.some(lock => lock.ownerId === uid && lock.draftId === String(active?.id)));
  }).sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }));
  
  const accommodationCost = row => row.roomId ? (rooms.find(room => room.id === row.roomId)?.pricePerPersonPerNight || 0) * 3 : 0;
  const totalSales = groupRows.reduce((sum, row) => sum + price(row.type) + accommodationCost(row), 0);
  const commission = groupRows.reduce((sum, row) => sum + commissionFor(row.type), 0);
  const amountOwed = totalSales - commission;
  
  const passOptions = [["Full Pass", "passFull"], ["Performers Pass", "passPerformers"], ["Free Full Pass", "passFree"]];
  
  const register = () => {
    if (invalidRoster || disabled) return;
    showPopup({
      type: "info", title: t("confirmTitle"),
      message: r("registrationSummary", { count: groupRows.length, total: amountOwed.toFixed(2) }),
      confirmText: t("confirmSubmit"), cancelText: t("cancelBtn"),
      onConfirm: () => run(() => submitGroupToCart()),
    });
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10 font-montserrat">
      
      {/* Search & Filters */}
      <div className="flex flex-col xl:flex-row gap-4 mb-6 w-full relative z-40 px-0">
        <div className="relative flex-grow group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
          <input 
            aria-label={t("searchPlaceholder")}
            type="text" 
            maxLength={50} 
            placeholder={t("searchPlaceholder")} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full p-4 pl-14 bg-white border border-gray-200 rounded-2xl font-bold text-xs uppercase outline-none focus:border-slate-900 transition-all text-slate-900 shadow-sm" 
          />
        </div>
        <div className="relative w-full xl:w-auto z-40">
          <CustomDropdown 
            value={passFilter} 
            onChange={setPassFilter} 
            icon={Ticket} 
            options={[
              { label: t("allPasses") || 'All Passes', value: 'all', isPill: true, colorClass: getPassStyle('all') }, 
              ...passOptions.map(([val, key]) => ({
                label: t(key),
                value: val,
                isPill: true,
                colorClass: getPassStyle(val)
              }))
            ]} 
            variant="filter" 
          />
        </div>
      </div>

      {error && !picker && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-600 uppercase tracking-widest text-center shadow-sm">
          {error}
        </p>
      )}

      {/* Roster Table Container */}
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative z-10">
        <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-6 shrink-0 rounded-t-[2rem] md:rounded-t-[3rem]">
          <div>
            <h2 className="font-bebas tracking-wide text-3xl md:text-4xl text-slate-900 uppercase">{t("title")}</h2>
            <p className="text-[10px] md:text-xs font-bold text-slate-500 mt-1">{t("subtitle")}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">{t("drafted")}</span>
              <span className={`font-bebas text-3xl leading-none ${groupRows.length >= 100 ? 'text-red-500' : 'text-slate-900'}`}>{groupRows.length}/100</span>
            </div>
            <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              <input aria-label={r("addCount")} type="number" min="1" max="100" maxLength={3} value={bulkCount} disabled={disabled} onChange={(e) => setBulkCount(e.target.value)} className="w-16 px-3 py-2 text-xs font-bold text-center outline-none bg-transparent text-slate-900" />
              <button onClick={add} disabled={disabled || groupRows.length >= 100} className="cursor-pointer bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-[11px] uppercase flex items-center justify-center gap-2 hover:bg-salsa-pink hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"><Plus size={14} /> {t("btnAdd")}</button>
            </div>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-visible w-full flex-grow pb-16">
          <table className="w-full text-left border-separate border-spacing-0 min-w-[1100px] relative">
            <thead className="bg-white text-[11px] font-bold uppercase text-slate-500 tracking-widest relative z-10">
              <tr>
                <th className="p-4 pl-8 font-bold w-16 border-b border-gray-100 text-center">
                  <input type="checkbox" aria-label={r("selectAll")} className="w-4 h-4 accent-slate-900 rounded cursor-pointer hover:scale-110 transition-transform" disabled={disabled || !visibleRows.length} checked={!!visibleRows.length && visibleRows.every(row => selected.includes(row.id))} onChange={event => setSelected(event.target.checked ? visibleRows.map(row => row.id) : [])} />
                </th>
                <th className="p-4 font-bold w-[22%] border-b border-gray-100 text-left">{t("thName")}</th>
                <th className="p-4 font-bold w-[22%] border-b border-gray-100 text-left">{t("email")}</th>
                <th className="p-4 font-bold w-48 border-b border-gray-100 text-center">{t("thPass")}</th>
                <th className="p-4 font-bold w-56 border-b border-gray-100 text-center">{t("thAccomm")}</th>
                <th className="p-4 font-bold text-right w-32 border-b border-gray-100">{t("commission")}</th>
                <th className="p-4 font-bold text-right w-32 border-b border-gray-100">{t("thFinal")}</th>
                <th className="p-4 pr-8 text-right font-bold w-16 border-b border-gray-100">
                  {selected.length > 0 && <button onClick={() => remove(selected)} disabled={disabled} title={t('btnDeleteSel')} className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg flex items-center justify-end ml-auto transition-colors cursor-pointer disabled:opacity-50"><Trash2 size={20} /></button>}
                </th>
              </tr>
            </thead>
            <tbody className="uppercase text-xs font-bold text-slate-900 overflow-visible relative">
              {visibleRows.map((row, index) => {
                const lock = lockFor(row);
                const room = rooms.find(rm => rm.id === row.roomId);
                const badName = !!row.name && !validName(row.name);
                const badEmail = !isOptionalEmail(row.email);
                const rowCommission = commissionFor(row.type);
                const rowFinal = price(row.type) + accommodationCost(row) - rowCommission;

                return (
                  <tr key={row.id} style={{ position: 'relative', zIndex: 100 - index }} className={`transition-colors group overflow-visible ${selected.includes(row.id) ? 'bg-slate-100 shadow-inner' : 'hover:bg-slate-50/50'}`}>
                    <td className="p-4 pl-8 align-middle border-b border-gray-50 text-center">
                      <div className="flex items-center justify-center gap-3 h-full">
                        <input type="checkbox" aria-label={r("selectAttendee")} className="w-4 h-4 accent-slate-900 rounded cursor-pointer hover:scale-110 transition-transform" checked={selected.includes(row.id)} disabled={disabled} onChange={event => setSelected(previous => event.target.checked ? [...previous, row.id] : previous.filter(id => id !== row.id))} />
                        <span className={`text-[11px] font-bold w-6 text-right ${selected.includes(row.id) ? 'text-slate-900' : 'text-slate-400'}`}>{index + 1}.</span>
                      </div>
                    </td>
                    
                    {/* Name */}
                    <td className="p-4 align-middle border-b border-gray-50 overflow-visible">
                      <div className="relative w-full">
                        <input aria-label={t("thName")} aria-invalid={badName} type="text" maxLength={150} value={row.name} placeholder={t("namePlaceholder")} disabled={disabled} onChange={e => update(row.id, "name", e.target.value.toUpperCase())} onBlur={() => syncName(row.id)} className={`w-full p-3 bg-white border ${badName ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'} rounded-xl outline-none font-bold uppercase tracking-wide text-sm text-slate-900 transition-all shadow-sm text-left disabled:opacity-50`} />
                        {badName && <span className="absolute -bottom-4 left-2 text-[9px] font-bold uppercase tracking-widest text-red-500 animate-in fade-in zoom-in duration-200">{row.name.trim().length < 2 ? t("errMin") : t("errLetters")}</span>}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="p-4 align-middle border-b border-gray-50 overflow-visible">
                      <div className="relative w-full">
                        <input aria-label={t("email")} aria-invalid={badEmail} type="email" autoComplete="off" maxLength={254} value={row.email || ""} placeholder={t("emailOptional")} disabled={disabled} onChange={e => update(row.id, "email", e.target.value)} className={`w-full p-3 bg-white border ${badEmail ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'} rounded-xl outline-none font-bold lowercase tracking-wide text-sm text-slate-900 transition-all shadow-sm text-left disabled:opacity-50`} />
                        {badEmail && <span className="absolute -bottom-4 left-2 text-[9px] font-bold uppercase tracking-widest text-red-500 animate-in fade-in zoom-in duration-200">{t("invalidEmail")}</span>}
                      </div>
                    </td>
                    
                    {/* Pass Type */}
                    <td className="p-4 align-middle border-b border-gray-50 overflow-visible relative text-center">
                      <CustomDropdown
                        value={row.type} variant="pill" disabled={disabled}
                        onChange={(val) => update(row.id, 'type', val)}
                        options={passOptions.map(([val, key]) => ({ label: t(key), value: val, isPill: true, colorClass: getPassStyle(val) }))}
                      />
                    </td>
                    
                    {/* Accommodation */}
                    <td className="p-4 align-middle border-b border-gray-50 overflow-visible relative text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="relative w-full shrink-0">
                          <select aria-label={t("thAccomm")} value={row.accommodation || "None"} disabled={disabled} onChange={(e) => chooseHotel(row, e.target.value)} className="w-full appearance-none bg-gray-50 border border-gray-200 text-slate-700 text-sm font-bold rounded-xl px-3 py-2.5 pr-8 outline-none focus:border-slate-900 focus:bg-white transition-all cursor-pointer shadow-sm disabled:opacity-50">
                            <option value="None">{t("accNone")}</option>
                            {HOTELS.map(hotel => <option key={hotel} value={hotel}>{hotel}</option>)}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown size={14} />
                          </div>
                        </div>
                        {row.roomId && (
                          <button type="button" disabled={disabled} onClick={() => chooseHotel(row, row.accommodation)} title={r("changeRoom")} className={`w-full flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-salsa-pink ${lock ? "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200" : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"}`}>
                            {r("roomName", { number: room?.roomNumber || "—" })}{" "}
                            <Clock size={12} aria-hidden="true" />
                            {loading ? "…" : lock ? remainingTime(lock.expiresAt, now) : t("expiredHold")}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Commission */}
                    <td className="p-4 text-right font-bold text-lg text-slate-500 align-middle border-b border-gray-50">
                      €{rowCommission.toFixed(2)}
                    </td>
                    
                    {/* Final Price */}
                    <td className="p-4 text-right font-bold text-xl text-slate-900 align-middle border-b border-gray-50">
                      €{rowFinal.toFixed(2)}
                    </td>
                    
                    {/* Actions */}
                    <td className="p-4 pr-8 text-right align-middle border-b border-gray-50">
                      <div className="flex items-center justify-end h-full">
                        {selected.length <= 1 && (
                          <button onClick={() => remove([row.id])} disabled={disabled} title={r("removeNamed", { name: row.name || r("unnamed") })} className="text-gray-400 opacity-40 group-hover:opacity-100 hover:!text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all duration-300 hover:scale-110 cursor-pointer disabled:opacity-50"><Trash2 size={18} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visibleRows.length && <tr><td colSpan="8" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-gray-50">{t("noDrafts")}</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden flex flex-col gap-4 p-4 sm:p-6 bg-slate-50 border-t border-gray-100 flex-grow pb-24 relative z-10">
          {visibleRows.map((row, index) => {
            const lock = lockFor(row);
            const room = rooms.find(rm => rm.id === row.roomId);
            const badName = !!row.name && !validName(row.name);
            const badEmail = !isOptionalEmail(row.email);
            const rowCommission = commissionFor(row.type);
            const rowFinal = price(row.type) + accommodationCost(row) - rowCommission;

            return (
              <div key={row.id} style={{ zIndex: 100 - index }} className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col gap-4 relative overflow-visible transition-colors ${selected.includes(row.id) ? 'bg-slate-100 ring-2 ring-slate-300' : 'border-gray-100'}`}>
                <div className="flex items-start gap-4 w-full">
                  <div className="flex flex-col items-center gap-2 mt-3 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400">{index + 1}.</span>
                    <input aria-label={r("selectAttendee")} type="checkbox" className="w-4 h-4 accent-slate-900 rounded" disabled={disabled} checked={selected.includes(row.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, row.id] : previous.filter(id => id !== row.id))} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-3 relative">
                    {/* Name Input */}
                    <div className="relative">
                      <input type="text" maxLength={150} value={row.name} placeholder={t("namePlaceholder")} disabled={disabled} onChange={e => update(row.id, "name", e.target.value.toUpperCase())} onBlur={() => syncName(row.id)} className={`w-full p-3 pr-10 bg-white border ${badName ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'} rounded-xl outline-none font-bold uppercase text-sm text-slate-900 transition-all shadow-sm disabled:opacity-50`} />
                      {badName && <span className="text-[9px] font-bold uppercase tracking-widest text-red-500 mt-1 block animate-in fade-in zoom-in duration-200">{row.name.trim().length < 2 ? t("errMin") : t("errLetters")}</span>}
                    </div>
                    {/* Email Input */}
                    <div className="relative">
                      <input type="email" autoComplete="off" maxLength={254} value={row.email || ""} placeholder={t("emailOptional")} disabled={disabled} onChange={e => update(row.id, "email", e.target.value)} className={`w-full p-3 pr-10 bg-white border ${badEmail ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'} rounded-xl outline-none font-bold lowercase text-sm text-slate-900 transition-all shadow-sm disabled:opacity-50`} />
                      {badEmail && <span className="text-[9px] font-bold uppercase tracking-widest text-red-500 mt-1 block animate-in fade-in zoom-in duration-200">{t("invalidEmail")}</span>}
                    </div>
                    {selected.length <= 1 && (
                      <button onClick={() => remove([row.id])} disabled={disabled} className="absolute top-3 -right-2 text-gray-400 hover:text-red-500 p-2 rounded-lg transition-all cursor-pointer z-10 bg-gray-50 hover:bg-red-50 disabled:opacity-50"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 w-full pl-8 relative z-20">
                  <div className="w-full">
                    <CustomDropdown
                      value={row.type} variant="pill" disabled={disabled}
                      onChange={(val) => update(row.id, 'type', val)}
                      options={passOptions.map(([val, key]) => ({ label: t(key), value: val, isPill: true, colorClass: getPassStyle(val) }))}
                    />
                  </div>
                  
                  <div className="relative z-10 flex flex-col gap-2">
                    <div className="relative w-full">
                      <select value={row.accommodation || "None"} disabled={disabled} onChange={(e) => chooseHotel(row, e.target.value)} className="w-full appearance-none bg-gray-50 border border-gray-200 text-slate-700 text-sm font-bold rounded-xl px-3 py-2.5 pr-8 outline-none focus:border-slate-900 focus:bg-white transition-all cursor-pointer shadow-sm disabled:opacity-50">
                        <option value="None">{t("accNone")}</option>
                        {HOTELS.map(hotel => <option key={hotel} value={hotel}>{hotel}</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                    {row.roomId && (
                      <button type="button" disabled={disabled} onClick={() => chooseHotel(row, row.accommodation)} title={r("changeRoom")} className={`w-full flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-salsa-pink ${lock ? "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200" : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"}`}>
                        {r("roomName", { number: room?.roomNumber || "—" })}{" "}
                        <Clock size={12} aria-hidden="true" />
                        {loading ? "…" : lock ? remainingTime(lock.expiresAt, now) : t("expiredHold")}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between w-full pl-8 mt-2 pt-3 border-t border-gray-50">
                  <div className="text-left">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{t('commission')}</span>
                    <span className="block text-xl font-bold text-slate-500 leading-none">€{rowCommission.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{t('thFinal')}</span>
                    <span className="block text-3xl font-bold text-slate-900 leading-none">€{rowFinal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {!visibleRows.length && <div className="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border border-gray-100">{t("noDrafts")}</div>}
        </div>

        {/* Footer Totals & Actions */}
        <div className="p-6 md:p-8 bg-slate-50 border-t border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-6 shrink-0 mt-auto md:rounded-b-[3rem] relative z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="w-full lg:w-auto flex justify-center lg:justify-start gap-3">
            {selected.length > 0 ? (
              <button onClick={() => remove(selected)} disabled={disabled} className="text-red-500 hover:text-white hover:bg-red-500 border border-red-500 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm cursor-pointer w-full lg:w-auto disabled:opacity-50">
                {t("btnDeleteSel", { count: selected.length })}
              </button>
            ) : (
              <Button size="sm" variant="ghost" disabled={disabled || !groupRows.length} onClick={() => remove(groupRows.map(row => row.id))}>{r("discardDraft")}</Button>
            )}
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-8 w-full lg:w-auto">
            <div className="flex flex-wrap justify-center lg:justify-end items-end gap-3 md:gap-4 w-full lg:w-auto">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t("sumSales")}</span>
                <span className="text-xl font-bold text-slate-700">€{totalSales.toFixed(2)}</span>
              </div>
              <span className="text-2xl font-bold text-slate-300 mb-0.5">-</span>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">{t("commission")}</span>
                <span className="text-xl font-bold text-emerald-500">€{commission.toFixed(2)}</span>
              </div>
              <span className="text-2xl font-bold text-slate-300 mb-0.5">=</span>
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t("amountOwed")}</span>
                <span className="text-4xl font-black text-slate-900 leading-none">€{amountOwed.toFixed(2)}</span>
              </div>
            </div>

            <button 
              onClick={register} 
              disabled={disabled || invalidRoster || (groupRows.some(row => row.roomId) && (loading || roomsError))} 
              className="w-full lg:w-auto cursor-pointer bg-slate-900 text-white font-bold px-8 py-4 rounded-2xl shadow-xl hover:bg-emerald-500 hover:shadow-emerald-500/20 transition-all duration-300 tracking-widest text-[11px] uppercase flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-900 shrink-0"
            >
              <ShieldCheck size={18} /> {submitting ? "..." : t("confirmSubmit")}
            </button>
          </div>
        </div>
      </div>
      
      {invalidHold && !loading && <p className="text-xs font-bold text-rose-600 uppercase tracking-widest text-center mt-6">{r("renewBeforeSubmit")}</p>}

      {/* Room Selection Modal */}
      {picker && (
        <RoomModal title={t("roomPickerTitle", { hotel: picker.hotelId })} busy={disabled} wide onClose={() => { setPicker(null); setError(""); }}>
          <p className="mb-4 text-xs font-bold text-slate-500 font-montserrat">{r("assigningFor", { name: active?.name || r("unnamed") })} · <span className="text-salsa-pink">{t("lockHint")}</span></p>
          
          {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-bold uppercase tracking-widest text-red-600 text-center shadow-sm">{error}</p>}
          {!validName(active?.name) && <p className="mb-4 text-xs font-bold uppercase tracking-widest text-red-600 text-center">{r("errors.nameRequired")}</p>}
          
          {roomsError ? (
            <div role="alert" className="space-y-4 text-center py-10"><p className="text-xs font-bold uppercase tracking-widest text-red-500">{r("loadError")}</p><Button size="sm" onClick={retry}>{r("retry")}</Button></div>
          ) : loading ? (
            <div className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest py-10 animate-pulse">{r("loading")}</div>
          ) : visibleRooms.length === 0 ? (
            <div className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest py-10">{t("noAvailableRooms")}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {visibleRooms.map(room => {
                const state = roomState(room, now);
                const heldHere = state.locks.some(lock => lock.ownerId === uid && lock.draftId === String(active?.id));
                const occupantCount = state.occupants.length + state.locks.length;
                
                return (
                  <button 
                    key={room.id}
                    disabled={disabled || !validName(active?.name)}
                    onClick={() => assign(room)}
                    className="text-left cursor-pointer bg-white border border-gray-200 hover:border-emerald-500 hover:ring-2 ring-emerald-500/20 p-5 rounded-2xl transition-all shadow-sm group flex flex-col gap-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:ring-0"
                  >
                    <div className="flex justify-between items-start">
                      <span className="block text-2xl font-black text-slate-900">{r("roomName", { number: room.roomNumber })}</span>
                      <span className="bg-slate-100 text-slate-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg">{r(`types.${roomType(room)}`)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        {r("availableCount", { available: state.available, capacity: room.capacity })}
                      </span>
                      <span className="text-lg font-bold text-slate-900">€{((room.pricePerPersonPerNight || 0) * 3).toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2">
                      {Array.from({ length: room.capacity }).map((_, idx) => (
                        <div key={idx} className={`w-8 h-8 rounded-lg flex items-center justify-center ${idx < occupantCount ? 'bg-slate-200 text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                          <Bed size={14} />
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-auto truncate w-full">
                      {[...state.occupants, ...state.locks].map(occupant => occupant.name || r("unnamed")).join(", ") || "—"}
                    </div>
                    <div className="w-full mt-2 pt-4 border-t border-gray-100 flex items-center justify-center font-bold text-[10px] uppercase tracking-widest text-slate-500 group-hover:text-emerald-600 transition-colors">
                      {r(heldHere ? "renewHold" : "assign")}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </RoomModal>
      )}
    </div>
  );
}