"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { updateProfile, sendPasswordResetEmail, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { usePopup } from "@/components/PopupProvider";
import { 
  Ticket, Settings, Loader2, Search, Calendar, Clock, X, ShoppingBag, 
  User as UserIcon, Mail, Shield, LogOut, Key, Edit2, Save
} from "lucide-react"; 
import { QRCodeSVG } from "qrcode.react";

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState("tickets");
  const [userData, setUserData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Settings State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [resetCooldown, setResetCooldown] = useState(0); // <-- New state for the 60s timer
  
  const [selectedYear, setSelectedYear] = useState("2026");
  const [ticketSearch, setTicketSearch] = useState("");
  const [fullScreenTicket, setFullScreenTicket] = useState(null);

  const router = useRouter();
  const { showPopup } = usePopup();

  // --- COOLDOWN TIMER LOGIC ---
  useEffect(() => {
    let timer;
    if (resetCooldown > 0) {
      timer = setInterval(() => {
        setResetCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resetCooldown]);

  useEffect(() => {
    let unsubTickets = () => {};

    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const uDoc = await getDoc(doc(db, "users", user.uid));
        if (uDoc.exists()) {
            const profile = uDoc.data();
            setUserData(profile);
            setEditNameValue(profile.displayName || "");
        }
        
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

  // --- SETTINGS ACTIONS ---
  const handleUpdateName = async () => {
    if (!editNameValue.trim()) return;
    setLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName: editNameValue });
      await setDoc(doc(db, "users", auth.currentUser.uid), { displayName: editNameValue }, { merge: true });
      setUserData(prev => ({ ...prev, displayName: editNameValue }));
      setIsEditingName(false);
      showPopup({ type: "success", title: "Saved!", message: "Your profile name has been updated.", confirmText: "Awesome" });
    } catch (e) {
      showPopup({ type: "error", title: "Error", message: e.message, confirmText: "Close" });
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, userData.email);
      setResetCooldown(60); // Start the 60-second countdown
      showPopup({ 
        type: "success", 
        title: "Email Sent", 
        message: "Check your inbox (and your Spam/Junk folder) for a secure link to reset your password. If you didn't receive it, you can request a new one in 60 seconds.", 
        confirmText: "Got It" 
      });
    } catch (e) {
      showPopup({ type: "error", title: "Error", message: e.message, confirmText: "Close" });
    }
  };

  const handleSignOut = () => {
    showPopup({
      type: "info",
      title: "Sign Out?",
      message: "Are you sure you want to log out of your account?",
      confirmText: "Yes, Sign Out",
      cancelText: "Cancel",
      onConfirm: async () => {
        await signOut(auth);
        router.push("/");
      }
    });
  };

  const filteredTickets = tickets.filter(t => 
    t.festivalYear?.toString() === selectedYear && 
    (t.userName?.toLowerCase().includes(ticketSearch.toLowerCase()) || t.ticketID?.toLowerCase().includes(ticketSearch.toLowerCase()))
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48}/></div>;

  return (
    <main className="min-h-screen bg-salsa-white pt-32 pb-20 font-montserrat">
      <Navbar />

      {/* --- MODAL: FULL SCREEN QR --- */}
      {fullScreenTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setFullScreenTicket(null)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl animate-in zoom-in duration-300">
            <button onClick={() => setFullScreenTicket(null)} className="cursor-pointer absolute -top-14 right-0 text-white hover:text-salsa-pink transition"><X size={32} /></button>
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
              <h1 className="font-bebas text-7xl uppercase tracking-tighter leading-none text-slate-900">My Account</h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Manage your passes and profile</p>
           </div>
           {activeTab === 'tickets' && (
              <div className="flex flex-col items-end">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Event Archive</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-white border-2 border-salsa-mint/30 p-2.5 px-6 rounded-xl text-xs font-black uppercase outline-none shadow-sm cursor-pointer hover:border-salsa-pink transition-all">
                    <option value="2026">Varna 2026</option>
                    <option value="2025">Archive 2025</option>
                    <option value="2024">Archive 2024</option>
                </select>
              </div>
           )}
        </div>

        {/* TABS */}
        <div className="flex gap-3 mb-12 bg-white p-2 rounded-2xl w-fit border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
           <button onClick={() => setActiveTab("tickets")} className={`cursor-pointer flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'tickets' ? 'bg-salsa-pink text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'}`}><Ticket size={14}/> Active Passes</button>
           <button onClick={() => setActiveTab("settings")} className={`cursor-pointer flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-salsa-pink text-white shadow-lg' : 'text-slate-500 hover:bg-gray-50'}`}><Settings size={14}/> Settings</button>
        </div>

        {/* TAB 1: TICKETS GRID */}
        {activeTab === "tickets" && (
          <div className="animate-in fade-in duration-500">
             {filteredTickets.length > 0 ? (
               <div className="space-y-6">
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
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pass {t.festivalYear}</span>
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-8 leading-none">{t.userName}</h3>
                            <div className="flex gap-6 pt-6 border-t border-gray-50">
                               <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest"><Calendar size={14} className="text-salsa-mint" /> {t.purchaseFormatted?.split(' at ')[0] || "Valid"}</div>
                               <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest"><Clock size={14} className="text-salsa-mint" /> {t.purchaseFormatted?.split(' at ')[1] || "Pass"}</div>
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
             ) : (
               <div className="w-full border-2 border-dashed border-gray-200 bg-white/50 rounded-[3rem] py-32 flex flex-col items-center justify-center text-center shadow-sm">
                 <div className="w-24 h-24 bg-gray-50 border border-gray-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm">
                   <ShoppingBag size={40} className="text-gray-300 stroke-[1.5]" />
                 </div>
                 <h3 className="font-bebas text-4xl text-slate-400 tracking-wide uppercase mb-2">No Active Passes</h3>
                 <p className="text-slate-400 text-xs font-medium mb-6 max-w-sm">
                   It looks like you haven't secured any passes for {selectedYear} yet.
                 </p>
                 <Link href="/tickets" className="text-salsa-pink text-[11px] font-black uppercase tracking-[0.2em] hover:underline transition-all">
                   Browse Tickets
                 </Link>
               </div>
             )}
          </div>
        )}

        {/* TAB 2: SETTINGS (UPGRADED TO SIDE-BY-SIDE GRID) */}
        {activeTab === "settings" && (
           <div className="grid lg:grid-cols-2 gap-8 max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Left Column: Profile Details */}
              <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-gray-100 shadow-xl relative overflow-hidden h-fit">
                <div className="absolute top-0 right-0 w-32 h-32 bg-salsa-mint/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <h2 className="font-bebas text-4xl md:text-5xl mb-8 uppercase text-slate-900 tracking-wide">Profile Details</h2>
                
                <div className="space-y-4">
                  
                  {/* Name Row */}
                  <div className="p-4 bg-gray-50 rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center border border-gray-100 gap-4 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-salsa-mint"><UserIcon size={18}/></div>
                      <div>
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Holder</span>
                        {isEditingName ? (
                          <input type="text" value={editNameValue} onChange={e => setEditNameValue(e.target.value)} className="bg-white border border-salsa-mint/30 rounded-lg px-3 py-1 outline-none focus:ring-2 ring-salsa-mint/20 text-xs font-bold uppercase text-slate-900 w-full max-w-[200px]" autoFocus />
                        ) : (
                          <span className="text-xs font-bold uppercase text-slate-900">{userData?.displayName}</span>
                        )}
                      </div>
                    </div>
                    {isEditingName ? (
                      <button onClick={handleUpdateName} className="cursor-pointer bg-salsa-mint text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl hover:bg-teal-500 transition-colors shadow-md flex items-center gap-2 justify-center"><Save size={14}/> Save</button>
                    ) : (
                      <button onClick={() => setIsEditingName(true)} className="cursor-pointer text-slate-400 hover:text-salsa-mint text-[10px] font-black uppercase tracking-widest px-4 py-2 flex items-center gap-2 justify-center transition-colors"><Edit2 size={14}/> Edit</button>
                    )}
                  </div>

                  {/* Email Row (Read Only) */}
                  <div className="p-4 bg-gray-50 rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center border border-gray-100 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400"><Mail size={18}/></div>
                      <div>
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</span>
                        <span className="text-xs font-bold text-slate-900">{userData?.email}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest self-start sm:self-auto">Verified</span>
                  </div>

                  {/* Role Row */}
                  <div className="p-4 bg-gray-50 rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center border border-gray-100 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-salsa-pink"><Shield size={18}/></div>
                      <div>
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Role</span>
                        <span className="text-xs font-bold uppercase text-salsa-pink">{userData?.role}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column: Security & Danger Zone */}
              <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-gray-100 shadow-xl h-fit">
                <h2 className="font-bebas text-4xl md:text-5xl mb-8 uppercase text-slate-900 tracking-wide">Security</h2>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <button 
                    onClick={handleResetPassword} 
                    disabled={resetCooldown > 0}
                    className={`cursor-pointer flex flex-col items-start p-6 bg-gray-50 rounded-3xl border border-gray-100 transition-all group
                      ${resetCooldown > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-300 hover:bg-white'}`}
                  >
                    <div className={`w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 transition-colors
                      ${resetCooldown > 0 ? 'text-gray-400' : 'text-slate-600 group-hover:text-slate-900'}`}
                    >
                      <Key size={18}/>
                    </div>
                    <span className={`text-xs font-bold uppercase mb-1 ${resetCooldown > 0 ? 'text-gray-500' : 'text-slate-900'}`}>
                      {resetCooldown > 0 ? `Send Again (${resetCooldown}s)` : "Reset Password"}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 text-left">Send a recovery link to your email</span>
                  </button>

                  <button onClick={handleSignOut} className="cursor-pointer flex flex-col items-start p-6 bg-red-50/50 rounded-3xl border border-red-100 hover:bg-red-50 hover:border-red-200 transition-all group">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-red-400 group-hover:text-red-500 mb-4 transition-colors"><LogOut size={18}/></div>
                    <span className="text-xs font-bold uppercase text-red-600 mb-1">Sign Out</span>
                    <span className="text-[10px] font-medium text-red-400/80">Log out of your device</span>
                  </button>
                </div>
              </div>

           </div>
        )}

      </div>
    </main>
  );
}