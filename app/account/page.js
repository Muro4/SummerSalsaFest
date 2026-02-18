"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Ticket, QrCode, Settings, Plus, Trash2, Users, Loader2, Search, Calendar, Clock, Tag } from "lucide-react";

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState("tickets");
  const [userData, setUserData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("2025");
  
  // Search States
  const [ticketSearch, setTicketSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");

  // Ambassador Group Persistence
  const [groupRows, setGroupRows] = useState([{ name: "", type: "Full Pass" }]);
  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // 1. Fetch User Data
        const uDoc = await getDoc(doc(db, "users", user.uid));
        setUserData(uDoc.data());
        
        // 2. Sync Ambassador Roster (Persistent Table Data)
        if (uDoc.data()?.role === 'ambassador') {
            const rosterDoc = await getDoc(doc(db, "rosters", user.uid));
            if (rosterDoc.exists()) setGroupRows(rosterDoc.data().members);
        }

        // 3. Fetch Active Tickets
        const q = query(collection(db, "tickets"), where("userId", "==", user.uid), where("status", "==", "active"));
        const unsubT = onSnapshot(q, (snap) => {
          setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        });
        return () => unsubT();
      } else { router.push("/login"); }
    });
    return () => unsub();
  }, [router]);

  // --- PERSISTENCE LOGIC ---
  const saveRoster = async (newRows) => {
    setGroupRows(newRows);
    if (auth.currentUser) {
        await setDoc(doc(db, "rosters", auth.currentUser.uid), { members: newRows });
    }
  };

  const addRow = () => saveRoster([...groupRows, { name: "", type: "Full Pass" }]);
  const removeRow = (index) => saveRoster(groupRows.filter((_, i) => i !== index));
  const updateRow = (index, field, value) => {
    const newRows = [...groupRows];
    newRows[index][field] = value;
    saveRoster(newRows);
  };

  const submitGroupToCart = async () => {
    const prices = { "Full Pass": 150, "Party Pass": 80, "Day Pass": 60 };
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
  };

  // --- FILTERING LOGIC ---
  const filteredTickets = tickets.filter(t => 
    t.festivalYear.toString() === selectedYear && 
    (t.userName.toLowerCase().includes(ticketSearch.toLowerCase()) || t.ticketID.toLowerCase().includes(ticketSearch.toLowerCase()))
  );

  const filteredGroupRows = groupRows.map((row, originalIndex) => ({ ...row, originalIndex }))
    .filter(row => row.name.toLowerCase().includes(groupSearch.toLowerCase()));

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-salsa-pink" size={48}/></div>;

  return (
    <main className="min-h-screen bg-salsa-white pt-32 pb-20 font-montserrat">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6">
        
        {/* TABS SELECTOR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div className="flex gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                <button onClick={() => setActiveTab("tickets")} className={`flex items-center gap-3 px-8 py-3 rounded-xl text-xs font-black uppercase transition ${activeTab === 'tickets' ? 'bg-salsa-pink text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Ticket size={16}/> Active Passes</button>
                {userData?.role === 'ambassador' && (
                    <button onClick={() => setActiveTab("group")} className={`flex items-center gap-3 px-8 py-3 rounded-xl text-xs font-black uppercase transition ${activeTab === 'group' ? 'bg-salsa-mint text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Users size={16}/> Manage Group</button>
                )}
            </div>
            {activeTab === 'tickets' && (
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-white border-2 border-salsa-mint/30 p-3 px-6 rounded-xl text-xs font-black uppercase outline-none shadow-sm">
                <option value="2025">Varna 2025</option>
                <option value="2024">Varna 2024</option>
              </select>
            )}
        </div>

        {/* TAB 1: REDESIGNED TICKETS */}
        {activeTab === "tickets" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input type="text" placeholder="Search passes..." className="w-full p-4 pl-12 bg-white border-2 border-salsa-mint/20 rounded-2xl outline-none focus:border-salsa-pink transition-all font-bold text-xs" onChange={e => setTicketSearch(e.target.value)} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTickets.map(t => (
                <div key={t.id} className="bg-white rounded-[2.5rem] border-2 border-salsa-mint/10 flex flex-col shadow-xl overflow-hidden hover:border-salsa-pink/40 transition-all group">
                    <div className="p-8 flex-grow">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-salsa-pink text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">{t.passType}</div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-gray-300 uppercase">Ticket ID</p>
                                <p className="text-xs font-mono font-bold text-gray-900">{t.ticketID}</p>
                            </div>
                        </div>
                        
                        <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-6">{t.userName}</h3>
                        
                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-50">
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-salsa-mint" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase">{t.purchaseFormatted?.split(' at ')[0]}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-salsa-mint" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase">{t.purchaseFormatted?.split(' at ')[1]}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900 p-6 flex items-center justify-between px-10">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Official Entry Pass</span>
                        <QrCode size={40} className="text-white" />
                    </div>
                </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 2: AMBASSADOR TABLE WITH SEARCH */}
        {activeTab === "group" && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] border-2 border-salsa-mint/20 gap-6">
               <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input type="text" placeholder="Search group members..." className="w-full p-4 pl-12 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 ring-salsa-mint font-bold text-xs" onChange={e => setGroupSearch(e.target.value)} />
               </div>
               <button onClick={addRow} className="w-full md:w-auto bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-3 hover:bg-salsa-pink transition-all shadow-lg">
                  <Plus size={18}/> Add New Member
               </button>
            </div>

            <div className="bg-white rounded-[3rem] border-2 border-salsa-mint/10 overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        <tr><th className="p-8">Name</th><th className="p-8">Pass Type</th><th className="p-8 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredGroupRows.map((row) => (
                            <tr key={row.originalIndex} className="hover:bg-salsa-mint/5 transition-colors">
                                <td className="p-6">
                                    <input type="text" value={row.name} placeholder="FULL NAME" onChange={(e) => updateRow(row.originalIndex, 'name', e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 ring-salsa-mint font-bold uppercase text-xs" />
                                </td>
                                <td className="p-6">
                                    <select value={row.type} onChange={(e) => updateRow(row.originalIndex, 'type', e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-black text-[10px] uppercase outline-none">
                                        <option value="Full Pass">Full Pass</option>
                                        <option value="Party Pass">Party Pass</option>
                                        <option value="Day Pass">Day Pass</option>
                                    </select>
                                </td>
                                <td className="p-8 text-right">
                                    <button onClick={() => removeRow(row.originalIndex)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={20}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-10 bg-gray-50/50 flex flex-col items-center">
                    <button onClick={submitGroupToCart} disabled={groupRows.some(r => !r.name)} className="bg-salsa-pink text-white font-black px-16 py-5 rounded-[1.5rem] shadow-xl hover:scale-105 transition-all tracking-widest text-xs uppercase disabled:opacity-20">
                        Send to Cart & Checkout
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}