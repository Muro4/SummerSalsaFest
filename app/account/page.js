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
  User as UserIcon, Mail, Shield, LogOut, Key, Edit2, Save, Download, Users,
  ChevronLeft, ChevronRight
} from "lucide-react"; 
import { QRCodeSVG } from "qrcode.react";
import { toPng } from 'html-to-image';
import jsPDF from "jspdf";

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

const formatDate = (isoString) => {
  if (!isoString) return { date: "Valid", time: "Pass" };
  const d = new Date(isoString);
  if (isNaN(d)) return { date: "Valid", time: "Pass" };
  return {
    date: d.toLocaleDateString('en-GB'),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  };
};

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState("tickets");
  const [userData, setUserData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  
  const [isEditingAmbName, setIsEditingAmbName] = useState(false);
  const [editAmbNameValue, setEditAmbNameValue] = useState("");

  const [resetCooldown, setResetCooldown] = useState(0); 
  const [selectedYear, setSelectedYear] = useState("2026");
  const [ticketSearch, setTicketSearch] = useState("");
  const [fullScreenTicket, setFullScreenTicket] = useState(null);

  const router = useRouter();
  const { showPopup } = usePopup();

  useEffect(() => {
    let timer;
    if (resetCooldown > 0) {
      timer = setInterval(() => setResetCooldown((prev) => prev - 1), 1000);
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
            setEditAmbNameValue(profile.ambassadorDisplayName || "");
        }
        const q = query(collection(db, "tickets"), where("userId", "==", user.uid), where("status", "==", "active"));
        unsubTickets = onSnapshot(q, (snap) => {
          setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        });
      } else {
        router.push("/login");
      }
    });
    return () => { unsubAuth(); unsubTickets(); };
  }, [router]);

  const handleUpdateName = async () => {
    if (!editNameValue.trim()) return;
    setLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName: editNameValue });
      await setDoc(doc(db, "users", auth.currentUser.uid), { displayName: editNameValue }, { merge: true });
      setUserData(prev => ({ ...prev, displayName: editNameValue }));
      setIsEditingName(false);
      showPopup({ type: "success", title: "Saved!", message: "Profile name updated.", confirmText: "Done" });
    } catch (e) { showPopup({ type: "error", title: "Error", message: e.message, confirmText: "Close" }); }
    setLoading(false);
  };

  const handleUpdateAmbassadorName = async () => {
    if (!editAmbNameValue.trim()) return;
    setLoading(true);
    try {
      await setDoc(doc(db, "users", auth.currentUser.uid), { ambassadorDisplayName: editAmbNameValue }, { merge: true });
      setUserData(prev => ({ ...prev, ambassadorDisplayName: editAmbNameValue }));
      setIsEditingAmbName(false);
      showPopup({ type: "success", title: "Saved!", message: "Ambassador display name updated.", confirmText: "Done" });
    } catch (e) { showPopup({ type: "error", title: "Error", message: e.message, confirmText: "Close" }); }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, userData.email);
      setResetCooldown(60);
      showPopup({ type: "success", title: "Email Sent", message: "Check your inbox for the reset link.", confirmText: "Got It" });
    } catch (e) { showPopup({ type: "error", title: "Error", message: e.message, confirmText: "Close" }); }
  };

  const handleSignOut = () => {
    showPopup({
      type: "info", title: "Sign Out?", message: "Are you sure you want to log out?", confirmText: "Yes, Sign Out", cancelText: "Cancel",
      onConfirm: async () => { await signOut(auth); router.push("/"); }
    });
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("ticket-to-download");
    if (!element) return;
    const dlIcon = document.getElementById("download-icon-btn");
    if (dlIcon) dlIcon.style.display = 'none';
    try {
      const { width, height } = element.getBoundingClientRect();
      const dataUrl = await toPng(element, { quality: 1, pixelRatio: 3, backgroundColor: "#ffffff", skipFonts: true, style: { boxShadow: "none" } });
      const pdf = new jsPDF({ orientation: "l", unit: "px", format: [width, height] }); 
      pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
      pdf.save(`SalsaFest_Ticket_${fullScreenTicket.userName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) { showPopup({ type: "error", title: "Export Error", message: err.message, confirmText: "Close" }); }
    finally { if (dlIcon) dlIcon.style.display = ''; }
  };

  const getTicketNameSize = (name) => {
    if (!name) return "text-3xl md:text-4xl";
    if (name.length > 25) return "text-xl md:text-2xl";
    if (name.length > 15) return "text-2xl md:text-3xl";
    return "text-3xl md:text-4xl";
  };

  const filteredTickets = tickets.filter(t => 
    t.festivalYear?.toString() === selectedYear && 
    (t.userName?.toLowerCase().includes(ticketSearch.toLowerCase()) || t.ticketID?.toLowerCase().includes(ticketSearch.toLowerCase()))
  );

  const currentTicketIndex = fullScreenTicket ? filteredTickets.findIndex(t => t.id === fullScreenTicket.id) : -1;

  // KEYBOARD NAVIGATION
  useEffect(() => {
    if (!fullScreenTicket) return;
    const handleKeyDown = (e) => {
      const currentIndex = filteredTickets.findIndex(t => t.id === fullScreenTicket.id);
      if (e.key === "ArrowRight" && currentIndex < filteredTickets.length - 1) setFullScreenTicket(filteredTickets[currentIndex + 1]);
      else if (e.key === "ArrowLeft" && currentIndex > 0) setFullScreenTicket(filteredTickets[currentIndex - 1]);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullScreenTicket, filteredTickets]);

  const handleNextTicket = () => {
    if (currentTicketIndex < filteredTickets.length - 1) setFullScreenTicket(filteredTickets[currentTicketIndex + 1]);
  };
  const handlePrevTicket = () => {
    if (currentTicketIndex > 0) setFullScreenTicket(filteredTickets[currentTicketIndex - 1]);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48}/></div>;

  return (
    <main className="min-h-screen bg-salsa-white pt-32 pb-20 font-montserrat select-none">
      <Navbar />

      {/* --- MODAL: FULL PREVIEW --- */}
      {fullScreenTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setFullScreenTicket(null)}></div>
          <div className="relative w-fit max-w-[95vw] flex flex-col items-center gap-4 animate-in zoom-in duration-300 my-10 mx-auto">
            
            <button onClick={() => setFullScreenTicket(null)} className="cursor-pointer absolute -top-12 right-0 md:-right-4 text-white hover:text-salsa-pink transition bg-white/10 p-2 rounded-full backdrop-blur-md z-50"><X size={24} /></button>
            
            <div className="absolute top-1/2 -translate-y-1/2 -left-12 md:-left-20 hidden md:flex z-50">
               <button onClick={handlePrevTicket} disabled={currentTicketIndex <= 0} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"><ChevronLeft size={32}/></button>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -right-12 md:-right-20 hidden md:flex z-50">
               <button onClick={handleNextTicket} disabled={currentTicketIndex >= filteredTickets.length - 1} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"><ChevronRight size={32}/></button>
            </div>

            <div id="ticket-to-download" className="w-[320px] md:w-[850px] flex-none bg-white rounded-[2.5rem] flex flex-col md:flex-row shadow-2xl relative overflow-hidden" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <button id="download-icon-btn" onClick={handleDownloadPDF} title="Download PDF" className="absolute top-6 right-6 md:top-8 md:right-8 z-50 p-3 bg-gray-50 hover:bg-salsa-mint/10 text-gray-400 hover:text-salsa-mint rounded-full transition-all cursor-pointer shadow-sm border border-gray-100"><Download size={20} /></button>
              <div className="p-8 md:p-12 flex items-center justify-center bg-salsa-mint/5 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-gray-200 relative shrink-0">
                 <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100"><QRCodeSVG value={fullScreenTicket.ticketID} size={200} level="H" /></div>
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-center flex-1 relative bg-white min-w-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-salsa-mint/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="mb-4 relative z-10"><span className={`text-[11px] font-sans font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm inline-block ${getPassStyle(fullScreenTicket.passType)}`}>{fullScreenTicket.passType}</span></div>
                <h2 className={`${getTicketNameSize(fullScreenTicket.userName)} font-black text-slate-900 uppercase leading-[1.1] tracking-tight mb-2 pr-12 whitespace-normal break-words relative z-10 w-full transition-all duration-300`}>{fullScreenTicket.userName}</h2>
                <p className="font-mono text-gray-400 text-[11px] font-bold tracking-widest uppercase mb-8 relative z-10">ID: {fullScreenTicket.ticketID}</p>
                <div className="grid grid-cols-2 gap-3 mt-auto relative z-10">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Event Access</span><span className="block text-xs font-black text-slate-900 uppercase">Salsa Fest {fullScreenTicket.festivalYear}</span></div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Price Paid</span><span className="block text-xs font-black text-slate-900 uppercase">€{fullScreenTicket.price || 0}</span></div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2 flex justify-between items-center">
                    <div><span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Purchase Date</span><span className="block text-xs font-bold text-slate-900">{formatDate(fullScreenTicket.purchaseDate).date}</span></div>
                    <div className="text-right"><span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</span><span className="block text-xs font-bold text-slate-900">{formatDate(fullScreenTicket.purchaseDate).time}</span></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex md:hidden justify-between w-full max-w-[320px] px-4 mt-2">
               <button onClick={handlePrevTicket} disabled={currentTicketIndex <= 0} className="flex items-center gap-1 text-[9px] font-black uppercase text-white/70 disabled:opacity-30"><ChevronLeft size={14}/> Prev</button>
               <button onClick={handleNextTicket} disabled={currentTicketIndex >= filteredTickets.length - 1} className="flex items-center gap-1 text-[9px] font-black uppercase text-white/70 disabled:opacity-30">Next <ChevronRight size={14}/></button>
            </div>
            
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 mb-24">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
           <div><h1 className="font-bebas text-7xl uppercase leading-none text-slate-900">My Account</h1><p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Manage your passes and profile</p></div>
           {activeTab === 'tickets' && (
              <div className="flex flex-col items-end">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Event Archive</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-white border border-gray-200 p-2.5 px-6 rounded-xl text-xs font-black uppercase outline-none focus:border-slate-900 shadow-sm cursor-pointer transition-all font-montserrat">
                    <option value="2026">Varna 2026</option>
                    <option value="2025">Archive 2025</option>
                </select>
              </div>
           )}
        </div>

        {/* TABS */}
        <div className="relative flex bg-gray-100 p-1.5 rounded-2xl w-full lg:w-80 shadow-inner mb-12">
          <div className="absolute top-1.5 bottom-1.5 w-[calc((100%-0.75rem)/2)] bg-slate-900 rounded-xl transition-all duration-300 ease-out shadow-sm" style={{ left: activeTab === 'tickets' ? '0.375rem' : 'calc(0.375rem + (100% - 0.75rem) / 2)' }} />
          <button onClick={() => setActiveTab("tickets")} className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3.5 text-[10px] font-black uppercase transition-colors duration-300 cursor-pointer font-montserrat ${activeTab === 'tickets' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}><Ticket size={14}/> Active Passes</button>
          <button onClick={() => setActiveTab("settings")} className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3.5 text-[10px] font-black uppercase transition-colors duration-300 cursor-pointer font-montserrat ${activeTab === 'settings' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}><Settings size={14}/> Settings</button>
        </div>

        <div className="relative min-h-[500px] w-full">
          <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            
            {activeTab === "tickets" && (
              <div>
                 <div className="relative max-w-sm mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input type="text" placeholder="SEARCH PASSES..." className="w-full p-3.5 pl-12 bg-white border border-gray-200 rounded-xl outline-none focus:border-slate-900 transition-all shadow-sm font-bold text-[10px] uppercase font-montserrat" onChange={e => setTicketSearch(e.target.value)} />
                 </div>
                 {filteredTickets.length > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-8">
                      {filteredTickets.map(t => (
                        <div key={t.id} onClick={() => setFullScreenTicket(t)} className="bg-white rounded-[2.5rem] border border-gray-200 flex flex-col sm:flex-row shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden hover:border-slate-900 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 group h-full cursor-pointer relative">
                          <div className="p-6 md:p-8 flex flex-col items-center justify-center bg-salsa-mint/[0.03] border-b-2 sm:border-b-0 sm:border-r-2 border-dashed border-gray-100 shrink-0 group-hover:bg-salsa-mint/[0.07] transition-colors">
                              <div className="bg-white p-3 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 group-hover:scale-105 group-hover:rotate-1 transition-transform duration-500"><QRCodeSVG value={t.ticketID} size={85} level="H" /></div>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4 text-center group-hover:text-slate-900 transition-colors">Tap to expand</span>
                          </div>
                          <div className="p-6 md:p-8 flex flex-col justify-center flex-grow relative bg-white min-w-0">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-salsa-mint/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-salsa-pink/5 transition-colors"></div>
                              <div className="mb-3 relative z-10"><span className={`text-[9px] font-sans font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm inline-block ${getPassStyle(t.passType)}`}>{t.passType}</span></div>
                              <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-[1.1] mb-1 relative z-10 truncate transition-colors">{t.userName}</h3>
                              <p className="font-mono text-gray-400 text-[10px] font-bold tracking-widest uppercase mb-6 relative z-10">ID: {t.ticketID}</p>
                              <div className="flex flex-col xl:flex-row gap-3 xl:gap-6 pt-5 border-t border-gray-100 mt-auto relative z-10">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest"><Calendar size={14} className="text-slate-400 transition-colors" /> {formatDate(t.purchaseDate).date}</div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest"><Clock size={14} className="text-slate-400 transition-colors" /> {formatDate(t.purchaseDate).time}</div>
                              </div>
                          </div>
                        </div>
                      ))}
                   </div>
                 ) : (
                   <div className="w-full border-2 border-dashed border-gray-200 bg-white/50 rounded-[3rem] py-32 flex flex-col items-center justify-center text-center shadow-sm">
                     <ShoppingBag size={40} className="text-gray-300 mb-6" /><h3 className="font-bebas text-4xl text-slate-400 uppercase">No Active Passes</h3>
                     <Link href="/tickets" className="mt-6 text-slate-900 bg-gray-100 px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm">Browse Tickets</Link>
                   </div>
                 )}
              </div>
            )}

            {activeTab === "settings" && (
               <div className="grid lg:grid-cols-2 gap-8 max-w-6xl">
                 <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden h-fit">
                   <h2 className="font-bebas text-4xl md:text-5xl mb-8 uppercase text-slate-900">Profile Details</h2>
                   <div className="space-y-4 relative z-10">
                     <div className="p-4 bg-gray-50 rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center border border-gray-100 gap-4">
                       <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-900"><UserIcon size={18}/></div>
                         <div><span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Account Holder</span>
                           {isEditingName ? <input type="text" value={editNameValue} onChange={e => setEditNameValue(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1 outline-none focus:border-slate-900 text-xs font-bold uppercase text-slate-900 w-full transition-all font-montserrat" autoFocus />
                           : <span className="text-xs font-bold uppercase text-slate-900">{userData?.displayName}</span>}
                         </div>
                       </div>
                       {isEditingName ? <button onClick={handleUpdateName} className="bg-slate-900 text-white text-[10px] font-black px-6 py-2.5 rounded-xl flex items-center gap-2 font-montserrat"><Save size={14}/> Save</button>
                       : <button onClick={() => setIsEditingName(true)} className="text-slate-400 hover:text-slate-900 text-[10px] font-black flex items-center gap-2 font-montserrat"><Edit2 size={14}/> Edit</button>}
                     </div>

                     {userData?.role === 'ambassador' && (
                       <div className="p-4 bg-gray-50 rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center border border-gray-100 gap-4">
                         <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-amber-500"><Users size={18}/></div>
                           <div><span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Ambassador Tag</span>
                             {isEditingAmbName ? <input type="text" value={editAmbNameValue} onChange={e => setEditAmbNameValue(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1 outline-none focus:border-slate-900 text-xs font-bold uppercase text-slate-900 w-full transition-all font-montserrat" autoFocus />
                             : <span className="text-xs font-bold uppercase text-slate-900">{userData?.ambassadorDisplayName || "Not Set"}</span>}
                           </div>
                         </div>
                         {isEditingAmbName ? <button onClick={handleUpdateAmbassadorName} className="bg-slate-900 text-white text-[10px] font-black px-6 py-2.5 rounded-xl flex items-center gap-2 font-montserrat"><Save size={14}/> Save</button>
                         : <button onClick={() => setIsEditingAmbName(true)} className="text-slate-400 hover:text-slate-900 text-[10px] font-black flex items-center gap-2 font-montserrat"><Edit2 size={14}/> Edit</button>}
                       </div>
                     )}

                     <div className="p-4 bg-gray-50 rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center border border-gray-100 gap-4">
                       <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400"><Mail size={18}/></div>
                         <div><span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Email Address</span><span className="text-xs font-bold text-slate-900">{userData?.email}</span></div>
                       </div>
                       <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase shadow-sm">Verified</span>
                     </div>
                   </div>
                 </div>

                 <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-fit">
                   <h2 className="font-bebas text-4xl md:text-5xl mb-8 uppercase text-slate-900">Security</h2>
                   <div className="grid sm:grid-cols-2 gap-4">
                     <button onClick={handleResetPassword} disabled={resetCooldown > 0} className={`flex flex-col items-start p-6 bg-gray-50 rounded-3xl border border-gray-100 transition-all ${resetCooldown > 0 ? 'opacity-50' : 'hover:border-slate-900 shadow-sm'}`}>
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-4 text-slate-600"><Key size={18}/></div>
                       <span className="text-xs font-bold uppercase mb-1 font-montserrat">{resetCooldown > 0 ? `Reset (${resetCooldown}s)` : "Reset Password"}</span>
                       <span className="text-[10px] font-medium text-slate-500 text-left font-montserrat">Request recovery link</span>
                     </button>
                     <button onClick={handleSignOut} className="flex flex-col items-start p-6 bg-red-50/50 rounded-3xl border border-red-100 hover:border-red-600 transition-all shadow-sm">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-400 mb-4"><LogOut size={18}/></div>
                       <span className="text-xs font-bold uppercase text-red-600 mb-1 font-montserrat">Sign Out</span>
                       <span className="text-[10px] font-medium text-red-400/80 font-montserrat">Log out of your device</span>
                     </button>
                   </div>
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}