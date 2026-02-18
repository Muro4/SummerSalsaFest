"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { 
  Ticket, QrCode, Settings, Plus, Trash2, Users, 
  Loader2, Search, Calendar, Clock, X, Maximize2, History, CheckCircle, CreditCard
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState("tickets");
  const [userData, setUserData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("2025");
  
  // Search States
  const [ticketSearch, setTicketSearch] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  // Full Screen Modal State
  const [fullScreenTicket, setFullScreenTicket] = useState(null);

  // Ambassador Group Persistence State
  const [groupRows, setGroupRows] = useState([{ id: Date.now(), name: "", type: "Full Pass" }]);
  const router = useRouter();

  useEffect(() => {
    let unsubTickets = () => {};

    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // 1. Fetch User Data
        const uDoc = await getDoc(doc(db, "users", user.uid));
        const profile = uDoc.data();
        setUserData(profile);
        
        // 2. If Ambassador, fetch persistent roster
        if (profile?.role === 'ambassador') {
            const rosterDoc = await getDoc(doc(db, "rosters", user.uid));
            if (rosterDoc.exists()) setGroupRows(rosterDoc.data().members || []);
        }

        // 3. Listen to Active Tickets
        const q = query(collection(db, "tickets"), where("userId", "==", user.uid), where("status", "==", "active"));
        unsubTickets = onSnapshot(q, (snap) => {
          setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        }, (err) => {
          console.error("Listener error:", err);
          setLoading(false);
        });
      } else {
        router.push("/login");
      }
    });
    return () => { unsubAuth(); unsubTickets(); };
  }, [router]);

  // --- AMBASSADOR LOGIC (ID-BASED) ---
  const saveRoster = async (newRows) => {
    setGroupRows(newRows);
    if (auth.currentUser) {
        await setDoc(doc(db, "rosters", auth.currentUser.uid), { members: newRows });
    }
  };

  const addRow = () => saveRoster([...groupRows, { id: Date.now(), name: "", type: "Full Pass" }]);
  const removeRow = (id) => saveRoster(groupRows.filter(row => row.id !== id));
  const updateRow = (id, field, value) => {
    const updatedRows = groupRows.map(row => row.id === id ? { ...row, [field]: value } : row);
    saveRoster(updatedRows);
  };

  const submitGroupToCart = async () => {
    setLoading(true);
    const prices = { "Full Pass": 150, "Party Pass": 80, "Day Pass": 60 };
    try {
      for (const person of groupRows) {
        if (!person.name) continue;
        await addDoc(collection(db, "tickets"), {
          userId: auth.currentUser.uid,
          userName: person.name.toUpperCase(),
          passType: person.type,
          price: prices[person.type],
          status: "pending",
          festivalYear: 2025,
          purchaseDate: new Date().toISOString(),
          purchaseFormatted: `${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
          ticketID: "GRP" + Math.random().toString(36).substring(2, 7).toUpperCase()
        });
      }
      router.push("/cart");
    } catch (e) { alert(e.message); setLoading(false); }
  };

  // --- FILTERING ---
  const filteredTickets = tickets.filter(t => 
    t.festivalYear?.toString() === selectedYear && 
    (t.userName?.toLowerCase().includes(ticketSearch.toLowerCase()) || t.ticketID?.toLowerCase().includes(ticketSearch.toLowerCase()))
  );

  const filteredHistory = tickets.filter(t => 
    t.festivalYear?.toString() === selectedYear &&
    (t.userName?.toLowerCase().includes(historySearch.toLowerCase()) || t.ticketID?.toLowerCase().includes(historySearch.toLowerCase()))
  );

  const filteredGroupRows = groupRows.filter(r => r.name?.toLowerCase().includes(rosterSearch.toLowerCase()));

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-salsa-pink" size={48}/></div>;

  return (
    <main className="min-h-screen bg-salsa-white pt-32 pb-20 font-montserrat">
      <Navbar />

      {/* --- MODAL: FULL SCREEN QR --- */}
      {fullScreenTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setFullScreenTicket(null)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl animate-in zoom-in duration-300">
            <button onClick={() => setFullScreenTicket(null)} className="absolute -top-14 right-0 text-white hover:text-salsa-pink transition"><X size={32} /></button>
            <div className="bg-salsa-white p-6 rounded-[2rem] mb-8 shadow-inner border border-gray-100">
               <QRCodeSVG value={fullScreenTicket.ticketID} size={200} level="H" />
            </div>
            <span className="bg-salsa-pink text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest">{fullScreenTicket.passType}</span>
            <h2 className="font-bebas text-5xl text-gray-900 uppercase leading-none mt-4">{fullScreenTicket.userName}</h2>
            <p className="font-mono text-gray-400 text-xs mt-2 font-bold tracking-widest uppercase">REF: {fullScreenTicket.ticketID}</p>
            <div className="w-full pt-6 mt-6 border-t border-gray-100 flex justify-center gap-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
               <div><span>Date</span><p className="text-gray-900">{fullScreenTicket.purchaseFormatted?.split(' at ')[0]}</p></div>
               <div><span>Time</span><p className="text-gray-900">{fullScreenTicket.purchaseFormatted?.split(' at ')[1]}</p></div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 mb-24">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
           <div>
              <h1 className="font-bebas text-7xl uppercase tracking-tighter leading-none text-gray-900">My Account</h1>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Manage your passes and group</p>
           </div>
           {activeTab !== 'settings' && (
              <div className="flex flex-col items-end">
                <label className="text-[9px] font-black text-gray-500 uppercase mb-2 tracking-widest">Event Archive</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-white border-2 border-salsa-mint/30 p-2.5 px-6 rounded-xl text-xs font-black uppercase outline-none shadow-sm cursor-pointer hover:border-salsa-pink transition-all">
                    <option value="2025">Varna 2025</option>
                    <option value="2024">Archive 2024</option>
                </select>
              </div>
           )}
        </div>

        {/* TABS */}
        <div className="flex gap-3 mb-12 bg-white p-2 rounded-2xl w-fit border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
           <button onClick={() => setActiveTab("tickets")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'tickets' ? 'bg-salsa-pink text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Ticket size={14}/> Active Passes</button>
           {userData?.role === 'ambassador' && (
             <>
               <button onClick={() => setActiveTab("group")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'group' ? 'bg-salsa-mint text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Users size={14}/> Manage Group</button>
               <button onClick={() => setActiveTab("history")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><History size={14}/> Paid Roster</button>
             </>
           )}
           <button onClick={() => setActiveTab("settings")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-salsa-pink text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Settings size={14}/> Settings</button>
        </div>

        {/* TAB 1: TICKETS GRID */}
        {activeTab === "tickets" && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="relative max-w-sm mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input type="text" placeholder="SEARCH PASSES..." className="w-full p-3.5 pl-12 bg-white border-2 border-salsa-mint/20 rounded-xl outline-none focus:border-salsa-pink font-bold text-[10px] uppercase" onChange={e => setTicketSearch(e.target.value)} />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTickets.map(t => (
                  <div key={t.id} className="bg-white rounded-[2.5rem] border-2 border-salsa-mint/10 flex flex-col sm:flex-row shadow-xl overflow-hidden hover:border-salsa-pink/40 transition-all group h-full">
                     <div className="p-8 flex-grow">
                        <div className="flex justify-between items-start mb-4">
                           <span className="bg-salsa-pink/10 text-salsa-pink text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{t.passType}</span>
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pass 2025</span>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-8 leading-none">{t.userName}</h3>
                        <div className="flex gap-6 pt-6 border-t border-gray-50">
                           <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest"><Calendar size={14} className="text-salsa-mint" /> {t.purchaseFormatted?.split(' at ')[0] || "Valid"}</div>
                           <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest"><Clock size={14} className="text-salsa-mint" /> {t.purchaseFormatted?.split(' at ')[1] || "Pass"}</div>
                        </div>
                     </div>
                     <div onClick={() => setFullScreenTicket(t)} className="bg-slate-900 sm:w-44 w-full p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-black transition-colors border-l border-dashed border-white/10">
                        <div className="bg-white p-1.5 rounded-xl shadow-2xl group-hover:scale-105 transition-transform"><QRCodeSVG value={t.ticketID} size={65} level="H" /></div>
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] text-center">Tap to expand</span>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* TAB 2: MANAGE GROUP */}
        {activeTab === "group" && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] border-2 border-salsa-mint/20 gap-4">
                <div className="relative w-full md:w-80">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16}/>
                   <input type="text" placeholder="FILTER DRAFT..." className="w-full p-3.5 pl-12 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 ring-salsa-mint font-bold text-[10px] uppercase" onChange={e => setRosterSearch(e.target.value)} />
                </div>
                <button onClick={addRow} className="w-full md:w-auto bg-gray-900 text-white px-8 py-3.5 rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-2 hover:bg-salsa-pink transition-all shadow-lg tracking-widest">
                   <Plus size={16}/> Add New Row
                </button>
              </div>
              <div className="bg-white rounded-[2.5rem] border-2 border-salsa-mint/10 overflow-hidden shadow-2xl">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">
                       <tr><th className="p-8">Legal Name (As Per ID)</th><th className="p-8">Pass Selection</th><th className="p-8 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {filteredGroupRows.map((row) => (
                         <tr key={row.id} className="hover:bg-salsa-mint/5 transition-colors">
                            <td className="p-4"><input type="text" value={row.name} placeholder="E.G. IVAN GEORGIEV" onChange={(e) => updateRow(row.id, 'name', e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-4 ring-salsa-mint/10 font-bold uppercase text-[10px]" /></td>
                            <td className="p-4"><select value={row.type} onChange={(e) => updateRow(row.id, 'type', e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-black text-[9px] uppercase outline-none cursor-pointer"><option value="Full Pass">Full Pass - €150</option><option value="Party Pass">Party Pass - €80</option><option value="Day Pass">Day Pass - €60</option></select></td>
                            <td className="p-8 text-right"><button onClick={() => removeRow(row.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={18}/></button></td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
                 <div className="p-10 bg-gray-50/50 text-center border-t border-gray-100">
                    <button onClick={submitGroupToCart} disabled={groupRows.some(r => !r.name)} className="bg-salsa-pink text-white font-black px-12 py-5 rounded-2xl shadow-xl hover:scale-105 transition-all tracking-[0.2em] text-[10px] uppercase flex items-center justify-center gap-4 mx-auto disabled:opacity-20">Send Group to Cart <CreditCard size={18}/></button>
                 </div>
              </div>
           </div>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === "history" && (
           <div className="space-y-6 animate-in fade-in duration-500">
              <div className="relative max-w-sm"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} /><input type="text" placeholder="FIND PAID ATTENDEES..." className="w-full p-3.5 pl-12 bg-white border-2 border-salsa-mint rounded-xl font-bold text-[10px] uppercase" onChange={e => setHistorySearch(e.target.value)} /></div>
              <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                       <tr><th className="p-6">Name</th><th className="p-6">ID Ref</th><th className="p-6">Pass Type</th><th className="p-6 text-right">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 uppercase text-[10px] font-bold">
                       {filteredHistory.map(t => (
                         <tr key={t.id}><td className="p-6">{t.userName}</td><td className="p-6 font-mono text-salsa-pink">{t.ticketID}</td><td className="p-6 text-gray-400">{t.passType}</td><td className="p-6 text-right flex items-center justify-end gap-2 text-emerald-600"><CheckCircle size={14}/> PAID</td></tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === "settings" && (
           <div className="max-w-xl bg-white p-10 rounded-[3rem] border-2 border-salsa-mint/20 shadow-xl animate-in zoom-in duration-500">
              <h2 className="font-bebas text-5xl mb-8 uppercase">Profile</h2>
              <div className="space-y-3 font-bold text-[10px] uppercase text-gray-600">
                 <div className="p-5 bg-gray-50 rounded-2xl flex justify-between items-center border border-gray-100"><span className="text-gray-400">Account Holder</span><span>{userData?.displayName}</span></div>
                 <div className="p-5 bg-gray-50 rounded-2xl flex justify-between items-center border border-gray-100"><span className="text-gray-400">Role</span><span className="text-salsa-pink">{userData?.role}</span></div>
              </div>
           </div>
        )}

      </div>
      <Footer />
    </main>
  );
}