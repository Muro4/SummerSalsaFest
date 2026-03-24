"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, onSnapshot, writeBatch } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import CustomDropdown from "@/components/CustomDropdown";
import Button from "@/components/Button";
import { usePopup } from "@/components/PopupProvider";
import { 
  Users, Ticket, Search, Filter, 
  Loader2, Save, Undo2, Redo2, XCircle, CheckCircle2, AlertTriangle
} from "lucide-react";

// --- SHARED PASS STYLING ---
const getPassBgColor = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('full')) return 'bg-salsa-pink';
  if (t.includes('party')) return 'bg-violet-600';
  if (t.includes('day')) return 'bg-teal-300';
  if (t.includes('free')) return 'bg-yellow-400';
  return 'bg-gray-200';
};

const getPassTextColor = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('day')) return 'text-teal-950';
  if (t.includes('free')) return 'text-yellow-900';
  if (t.includes('full') || t.includes('party')) return 'text-white';
  return 'text-slate-900';
};

const getPassStyle = (type) => {
  return `${getPassBgColor(type)} ${getPassTextColor(type)} border-transparent`;
};

// --- TEXT-BASED STATUS TOGGLE (Slot Machine Animation) ---
function StatusToggle({ originalStatus, currentStatus, onChange }) {
  const isPending = originalStatus === 'pending';
  const isAlreadyUsed = originalStatus === 'used';

  // 1. Locked: Pending Payment (Gray)
  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 opacity-60 w-24">
        <AlertTriangle size={16} /> Pending
      </div>
    );
  }

  // 2. Locked: Already Used / Committed (Gray)
  if (isAlreadyUsed) {
    return (
      <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 opacity-60 w-24">
        <XCircle size={16} /> Used
      </div>
    );
  }

  // 3. Interactive: Active / Staged as Used
  return (
    <button 
      type="button"
      onClick={() => onChange(currentStatus === 'active' ? 'used' : 'active')}
      className="relative block h-6 w-24 overflow-hidden outline-none cursor-pointer hover:opacity-80 active:scale-95 transition-transform"
    >
      {/* Active State (Emerald) */}
      <div className={`absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-500 transition-all duration-300 ease-in-out ${currentStatus === 'active' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <CheckCircle2 size={16} /> Active
      </div>

      {/* Staged 'Used' State (Orange with X) */}
      <div className={`absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest text-orange-500 transition-all duration-300 ease-in-out ${currentStatus === 'used' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <XCircle size={16} /> Used
      </div>
    </button>
  );
}

export default function AdminTicketsReadOnly() {
  const [data, setData] = useState({ users: [], tickets: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const router = useRouter();
  const { showPopup } = usePopup();

  // Filters & Search State
  const [selectedYear, setSelectedYear] = useState("2026");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [passFilter, setPassFilter] = useState("all");

  // --- STAGING ENGINE (Undo / Redo) ---
  const [stagedChanges, setStagedChanges] = useState({});
  const [history, setHistory] = useState([{}]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    let unsubUsers = () => { };
    let unsubTickets = () => { };

    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const myDoc = await getDoc(doc(db, "users", user.uid));

        if (myDoc.exists() && (myDoc.data().role === "admin" || myDoc.data().role === "superadmin")) {
          setHasAccess(true);

          unsubUsers = onSnapshot(collection(db, "users"), (uS) => {
            setData(prev => ({ ...prev, users: uS.docs.map(d => ({ id: d.id, ...d.data() })) }));
          });

          unsubTickets = onSnapshot(collection(db, "tickets"), (tS) => {
            setData(prev => ({ ...prev, tickets: tS.docs.map(d => ({ id: d.id, ...d.data() })) }));
            setLoading(false);
          });
        } else {
          router.push("/");
        }
      } else {
        unsubUsers();
        unsubTickets();
        router.push("/login");
      }
    });

    return () => {
      unsubAuth();
      unsubUsers();
      unsubTickets();
    };
  }, [router]);

  // --- STAGING LOGIC ---
  const updateStagedChanges = (newChanges) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newChanges);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setStagedChanges(newChanges);
  };

  const handleStatusChange = (ticketId, newStatus) => {
    const originalTicket = data.tickets.find(t => t.id === ticketId);
    if (!originalTicket || originalTicket.status === 'used' || originalTicket.status === 'pending') return;

    const newChanges = { ...stagedChanges };
    
    if (originalTicket.status === newStatus) {
      delete newChanges[ticketId];
    } else {
      newChanges[ticketId] = newStatus;
    }
    
    updateStagedChanges(newChanges);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setStagedChanges(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setStagedChanges(history[historyIndex + 1]);
    }
  };

  const discardChanges = () => {
    setStagedChanges({});
    setHistory([{}]);
    setHistoryIndex(0);
  };

  // --- CONFIRMATION POPUP ---
  const confirmSave = () => {
    const changesCount = Object.keys(stagedChanges).length;
    let details = [];
    
    Object.entries(stagedChanges).forEach(([id, status]) => {
      const t = data.tickets.find(ticket => ticket.id === id);
      if (t) details.push(`• ${t.userName}: ${status.toUpperCase()}`);
    });

    let detailsStr = details.slice(0, 5).join('\n');
    if (details.length > 5) {
      detailsStr += `\n...and ${details.length - 5} more`;
    }

    showPopup({
      type: "info",
      title: "Confirm Changes",
      message: `You are modifying ${changesCount} ticket${changesCount > 1 ? 's' : ''}.\n\nChanges:\n${detailsStr}`,
      confirmText: "Save Changes",
      cancelText: "Cancel",
      onConfirm: saveChanges
    });
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      Object.entries(stagedChanges).forEach(([ticketId, newStatus]) => {
        batch.update(doc(db, "tickets", ticketId), { status: newStatus });
      });
      await batch.commit();
      discardChanges(); 
      showPopup({ type: "success", title: "Success", message: "Check-ins updated securely.", confirmText: "Done" });
    } catch (err) {
      console.error("Error saving tickets:", err);
      showPopup({ type: "error", title: "Error", message: "Failed to save changes." });
    } finally {
      setSaving(false);
    }
  };

  // --- FILTERED LIST ---
  const filteredTickets = data.tickets.filter(t => {
    const matchesYear = t.festivalYear?.toString() === selectedYear;
    const purchaser = data.users.find(u => u.id === t.userId);
    const ambTag = purchaser?.ambassadorDisplayName || "";
    
    const displayStatus = stagedChanges[t.id] || t.status;

    const matchesSearch = 
      t.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.ticketID?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ambTag.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || displayStatus === statusFilter;
    const matchesPass = passFilter === "all" || t.passType === passFilter;

    return matchesYear && matchesSearch && matchesStatus && matchesPass;
  });

  const hasStagedChanges = Object.keys(stagedChanges).length > 0;

  if (!hasAccess || loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>;

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat pt-32 pb-40 select-none relative">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 relative z-50">
          <div>
            <h1 className="font-bebas text-5xl md:text-7xl leading-none text-slate-900 uppercase">Tickets Overview</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Staff Check-in Portal</p>
          </div>
          <div className="flex flex-col items-start md:items-end z-50 w-full md:w-auto">
            <label className="text-[12px] font-black text-slate-400 uppercase mb-2 tracking-widest hidden md:block">Event Archive</label>
            <div className="w-full md:w-auto">
              <CustomDropdown
                value={selectedYear}
                onChange={setSelectedYear}
                options={[
                  { label: 'SSF 2026', value: '2026' },
                  { label: 'SSF 2025', value: '2025' },
                  { label: 'SSF 2024', value: '2024' }
                ]}
                variant="compact"
              />
            </div>
          </div>
        </div>

        {/* CONTROLS AREA */}
        
        {/* ROW 1: DESKTOP ACTION BUTTONS ON TOP */}
        <div className="hidden md:flex justify-end items-center gap-3 w-full mb-4 z-40 relative">
          <Button
            variant="outline"
            size="icon"
            icon={Undo2}
            onClick={undo}
            disabled={historyIndex <= 0 || saving}
            title="Undo Stage"
            className="border-gray-200 bg-white p-3.5"
          />
          <Button
            variant="outline"
            size="icon"
            icon={Redo2}
            onClick={redo}
            disabled={historyIndex >= history.length - 1 || saving}
            title="Redo Stage"
            className="border-gray-200 bg-white p-3.5"
          />
          <Button
            variant="secondary"
            size="lg"
            icon={Save}
            onClick={confirmSave}
            disabled={!hasStagedChanges || saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        {/* ROW 2: SEARCH BAR + FILTERS */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8 z-30 relative w-full">
          
          {/* SEARCH BAR */}
          <div className="relative flex-grow group w-full lg:min-w-[400px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
            <input 
              type="text" 
              value={searchTerm || ""}
              placeholder="SEARCH BY NAME, ID, OR AMBASSADOR..." 
              className="input-standard w-full" 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          
          {/* FILTERS */}
          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto shrink-0">
            <div className="relative w-full sm:w-auto z-40">
              <CustomDropdown
                icon={Filter}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Active', value: 'active', textColor: 'text-emerald-500' },
                  { label: 'Used', value: 'used', textColor: 'text-orange-500' },
                  { label: 'Pending', value: 'pending', textColor: 'text-slate-400' }
                ]}
                variant="filter"
              />
            </div>
            
            <div className="relative w-full sm:w-auto z-30">
              <CustomDropdown
                icon={Ticket}
                value={passFilter}
                onChange={setPassFilter}
                options={[
                  { label: 'All Passes', value: 'all', isPill: true, colorClass: 'bg-slate-100 text-slate-600' },
                  { label: 'Full Pass', value: 'Full Pass', isPill: true, colorClass: 'bg-salsa-pink text-white' },
                  { label: 'Party Pass', value: 'Party Pass', isPill: true, colorClass: 'bg-violet-600 text-white' },
                  { label: 'Day Pass', value: 'Day Pass', isPill: true, colorClass: 'bg-teal-300 text-teal-950' },
                  { label: 'Free Pass', value: 'Free Pass', isPill: true, colorClass: 'bg-yellow-400 text-yellow-900' }
                ]}
                variant="filter"
              />
            </div>
          </div>
        </div>

        {/* ==============================================
            MOBILE VIEW: CARDS (Visible only on small screens)
            ============================================== */}
        <div className="md:hidden flex flex-col gap-4">
          {filteredTickets.map((t) => {
            const purchaser = data.users.find(u => u.id === t.userId);
            const ambTag = purchaser?.ambassadorDisplayName;
            const displayStatus = stagedChanges[t.id] || t.status;

            return (
              <div key={t.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                
                {/* Header Info */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <span title={t.userName} className="block text-lg font-black font-montserrat text-slate-900 uppercase leading-tight tracking-widest truncate">{t.userName}</span>
                    <span className="block text-sm font-bold text-slate-500 mt-1.5 uppercase tracking-widest font-mono truncate">ID: {t.ticketID}</span>
                  </div>
                  {/* Pass Pill (Fixed Width) */}
                  <span className={`shrink-0 inline-flex items-center justify-center w-24 py-1.5 rounded-full text-[10px] shadow-sm font-black uppercase tracking-widest mt-1 ${getPassStyle(t.passType)}`}>
                    {t.passType}
                  </span>
                </div>

                {/* Left-Aligned Ambassador Row (Dotted Line Design) */}
                <div className="flex items-center w-full mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">Ambassador</span>
                  <div className="flex-grow border-b-2 border-dotted border-gray-200 mx-3 relative top-[1px]"></div>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 shrink-0">
                    <Users size={12} className="text-slate-400" />
                    {ambTag ? ambTag : <span className="text-slate-300">Direct</span>}
                  </span>
                </div>
                
                {/* The Interactive Status Toggle */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-1 w-full">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</span>
                  <StatusToggle 
                    originalStatus={t.status}
                    currentStatus={displayStatus}
                    onChange={(newStat) => handleStatusChange(t.id, newStat)}
                  />
                </div>

              </div>
            );
          })}
          {filteredTickets.length === 0 && (
            <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border border-gray-100">
              No tickets match your search.
            </div>
          )}
        </div>

        {/* ==============================================
            DESKTOP VIEW: TABLE (Hidden on phones)
            ============================================== */}
        <div className="hidden md:block bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="overflow-x-auto w-full pb-20">
            <table className="w-full text-left border-separate border-spacing-0 min-w-[1050px] font-montserrat relative">
              <thead className="bg-white text-[10px] font-bold uppercase text-slate-400 tracking-widest relative z-10">
                <tr>
                  <th className="p-6 pl-10 font-bold w-48 rounded-tl-[3rem] border-b border-gray-100">Ambassador</th>
                  <th className="p-6 font-bold w-1/3 border-b border-gray-100">Attendee Name</th>
                  <th className="p-6 font-bold w-40 border-b border-gray-100">Ticket ID</th>
                  <th className="p-6 font-bold text-center w-48 border-b border-gray-100">Pass Type</th>
                  {/* Centered Check-in Status Column */}
                  <th className="p-6 font-bold text-center w-64 rounded-tr-[3rem] border-b border-gray-100">Status</th>
                </tr>
              </thead>
              <tbody className="uppercase text-xs">
                {filteredTickets.map((t) => {
                  const purchaser = data.users.find(u => u.id === t.userId);
                  const ambTag = purchaser?.ambassadorDisplayName;
                  const displayStatus = stagedChanges[t.id] || t.status;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                      
                      <td className="p-6 pl-10 align-middle border-b border-gray-50">
                        {ambTag ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest"><Users size={12} className="text-slate-400" /> {ambTag}</span>
                        ) : (
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Direct</span>
                        )}
                      </td>
                      
                      <td className="p-6 align-middle border-b border-gray-50 max-w-[250px] xl:max-w-[350px]">
                        <span title={t.userName} className="block text-base font-bold font-montserrat text-slate-900 tracking-wider leading-snug truncate">{t.userName}</span>
                      </td>

                      <td className="p-6 align-middle border-b border-gray-50">
                        <span className="block text-sm font-bold text-slate-500 uppercase tracking-widest font-mono">{t.ticketID}</span>
                      </td>

                      {/* Centered Pass Type Column with Fixed Width Pill */}
                      <td className="p-6 align-middle text-center border-b border-gray-50">
                        <span className={`inline-flex items-center justify-center w-32 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${getPassStyle(t.passType)}`}>
                          {t.passType}
                        </span>
                      </td>
                      
                      {/* Centered Desktop Toggle */}
                      <td className="p-6 align-middle border-b border-gray-50">
                        <div className="flex justify-center">
                          <StatusToggle 
                            originalStatus={t.status}
                            currentStatus={displayStatus}
                            onChange={(newStat) => handleStatusChange(t.id, newStat)}
                          />
                        </div>
                      </td>

                    </tr>
                  )
                })}
                {filteredTickets.length === 0 && (
                  <tr><td colSpan="5" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest font-montserrat border-b border-gray-50">No tickets match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ==============================================
          MOBILE FLOATING ACTION BAR (Hidden on Desktop)
          ============================================== */}
      <div 
        className={`md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-4 z-50 flex items-center justify-between transition-transform duration-500 ease-out ${
          hasStagedChanges ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center justify-center sm:justify-start gap-3 w-full sm:w-auto text-center sm:text-left">
            <div className="bg-amber-100 text-amber-600 p-2.5 rounded-2xl shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="font-bebas text-2xl text-slate-900 leading-none">Unsaved Changes</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                {Object.keys(stagedChanges).length} ready to commit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={undo} 
              disabled={historyIndex === 0 || saving}
              className="p-3 bg-gray-100 text-slate-600 rounded-xl hover:bg-gray-200 disabled:opacity-30 transition-colors"
            >
              <Undo2 size={18} />
            </button>
            <button 
              onClick={redo} 
              disabled={historyIndex === history.length - 1 || saving}
              className="p-3 bg-gray-100 text-slate-600 rounded-xl hover:bg-gray-200 disabled:opacity-30 transition-colors mr-1"
            >
              <Redo2 size={18} />
            </button>
            <button 
              onClick={discardChanges}
              disabled={saving}
              className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
            >
              <XCircle size={18} />
            </button>
            
            <button 
              onClick={confirmSave}
              disabled={saving}
              className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest px-6 py-3.5 rounded-xl hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2 flex-1 justify-center disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

    </main>
  );
}