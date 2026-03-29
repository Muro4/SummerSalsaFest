"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { updateProfile, sendPasswordResetEmail, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CustomDropdown from "@/components/CustomDropdown";
import { usePopup } from "@/components/PopupProvider";
import TicketModal from "@/components/TicketModal";
import TabNavigation from "@/components/TabNavigation";
import { EVENT_YEARS } from "@/lib/constants";
import {
  Ticket, Settings, Loader2, Search, Calendar, Clock, ShoppingBag,
  User as UserIcon, Mail, LogOut, Key, Edit2, Save, Users,
  Filter, Sparkles, Shield
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

// --- UTILS ---
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
  
  // Default to the current year dynamically
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const [ticketSearch, setTicketSearch] = useState("");
  const [passFilter, setPassFilter] = useState("all");

  const [fullScreenTicket, setFullScreenTicket] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);

  const router = useRouter();
  const { showPopup } = usePopup();

  // --- TAB DEFINITION ---
  const accountTabs = [
    { id: "tickets", label: "Active Passes", icon: Ticket },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  useEffect(() => {
    let timer;
    if (resetCooldown > 0) {
      timer = setInterval(() => setResetCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resetCooldown]);

  useEffect(() => {
    let unsubTickets = () => { };
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const uDoc = await getDoc(doc(db, "users", user.uid));
        if (uDoc.exists()) {
          const profile = uDoc.data();
          setUserData(profile);
          setEditNameValue(profile.displayName || "");
          setEditAmbNameValue(profile.ambassadorDisplayName || "");
        }

        try {
          const appDoc = await getDoc(doc(db, "ambassador_requests", user.uid));
          if (appDoc.exists()) setHasApplied(true);
        } catch (err) {
          console.warn("Could not fetch request status:", err.message);
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
      showPopup({ type: "success", title: "Saved!", message: "Guest Dancer tag updated.", confirmText: "Done" });
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

  const filteredTickets = tickets.filter(t =>
    t.festivalYear?.toString() === selectedYear &&
    (passFilter === "all" || t.passType === passFilter) &&
    (t.userName?.toLowerCase().includes(ticketSearch.toLowerCase()) || t.ticketID?.toLowerCase().includes(ticketSearch.toLowerCase()))
  );

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>;

  return (
    <main className="min-h-screen bg-salsa-white pt-24 md:pt-32 pb-20 font-montserrat select-none">
      <Navbar />

      {/* --- MODAL: FULL PREVIEW --- */}
      {fullScreenTicket && (
        <TicketModal 
          ticket={fullScreenTicket} 
          ticketsList={filteredTickets} 
          setTicket={setFullScreenTicket} 
          onClose={() => setFullScreenTicket(null)} 
        />
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-6 mb-24">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-10 gap-4 md:gap-6">
          <div>
            <h1 className="font-bebas text-5xl md:text-7xl uppercase leading-none text-slate-900">My Account</h1>
            <p className="text-slate-500 text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] mt-1 md:mt-2">Manage your passes and profile</p>
          </div>
        </div>

        {/* TABS */}
        <div className="w-full md:w-[400px] mb-8 md:mb-12">
          <TabNavigation 
            tabs={accountTabs} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
          />
        </div>

        <div className="relative min-h-[500px] w-full">
          <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full z-0">

            {/* TICKETS TAB */}
            {activeTab === "tickets" && (
              <div>
                {/* Search & Filter Row */}
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
                  <div className="relative flex-grow group">
                    <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-salsa-pink transition-colors" size={16} />
                    <input
                      type="text"
                      placeholder="SEARCH PASSES..."
                      className="input-standard w-full pl-11 md:pl-14"
                      onChange={e => setTicketSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full md:w-auto z-20">
                    {userData?.role !== 'user' && (
                      <div className="relative w-full sm:w-auto">
                        <CustomDropdown
                          icon={Filter}
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
                    )}
                    
                    <div className="relative w-full sm:w-auto">
                      <CustomDropdown
                        icon={Calendar}
                        value={selectedYear}
                        onChange={setSelectedYear}
                        options={EVENT_YEARS} 
                        variant="filter"
                      />
                    </div>
                  </div>
                </div>

                {filteredTickets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4 md:gap-8">
                    {filteredTickets.map(t => (
                      <div key={t.id} onClick={() => setFullScreenTicket(t)} className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-gray-200 flex flex-col sm:flex-row shadow-[0_10px_30px_rgb(0,0,0,0.04)] overflow-hidden hover:border-slate-900 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500 group h-full cursor-pointer relative">
                        <div className="p-5 md:p-8 flex flex-col items-center justify-center bg-salsa-mint/[0.03] border-b-2 sm:border-b-0 sm:border-r-2 border-dashed border-gray-100 shrink-0 group-hover:bg-salsa-mint/[0.07] transition-colors">
                          <div className="bg-white p-2 md:p-3 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 group-hover:scale-105 group-hover:rotate-1 transition-transform duration-500">
                            <QRCodeSVG value={t.ticketID} size={85} level="H" className="w-16 h-16 md:w-[85px] md:h-[85px]" />
                          </div>
                          <span className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3 md:mt-4 text-center group-hover:text-slate-900 transition-colors">Tap to expand</span>
                        </div>
                        <div className="p-5 md:p-8 flex flex-col justify-center flex-grow relative bg-white min-w-0">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-salsa-mint/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-salsa-pink/5 transition-colors"></div>
                          {/* THE FIX: Changed mobile text from [9px] to [10px] for the pass pill */}
                          <div className="mb-2 md:mb-3 relative z-10"><span className={`text-[10px] md:text-[11px] font-sans font-black px-4 md:px-5 py-1.5 md:py-2 rounded-full uppercase tracking-widest shadow-sm inline-block ${getPassStyle(t.passType)}`}>{t.passType}</span></div>
                          <h3 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-[1.1] mb-1 relative z-10 truncate transition-colors">{t.userName}</h3>
                          <p className="font-mono text-gray-500 text-xs md:text-sm font-bold tracking-widest uppercase mb-4 md:mb-6 relative z-10">ID: {t.ticketID}</p>
                          <div className="flex flex-row flex-wrap items-center gap-4 pt-4 border-t border-gray-100 mt-auto relative z-10">
                            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                              <Calendar size={14} className="text-slate-400 transition-colors shrink-0" /> {formatDate(t.purchaseDate).date}
                            </div>
                            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                              <Clock size={14} className="text-slate-400 transition-colors shrink-0" /> {formatDate(t.purchaseDate).time}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full border-2 border-dashed border-gray-200 bg-white/50 rounded-[2rem] md:rounded-[3rem] py-20 md:py-32 flex flex-col items-center justify-center text-center shadow-sm">
                    <ShoppingBag size={40} className="text-gray-300 mb-4 md:mb-6" />
                    <h3 className="font-bebas text-3xl md:text-4xl text-slate-400 uppercase">No Active Passes</h3>
                    <Link href="/tickets" className="mt-4 md:mt-6 text-slate-900 bg-gray-100 px-6 md:px-8 py-2.5 md:py-3 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-pointer">Browse Tickets</Link>
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === "settings" && (
              <div className="grid lg:grid-cols-2 gap-6 md:gap-8 max-w-6xl">
                
                {/* 1. Profile Details */}
                <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-[0_10px_30px_rgb(0,0,0,0.04)] relative overflow-hidden h-fit">
                  <h2 className="font-bebas text-4xl md:text-5xl mb-6 md:mb-8 uppercase text-slate-900">Profile Details</h2>
                  
                  <div className="space-y-3 md:space-y-4 relative z-10">
                    
                    {/* ROW 1: Account Holder */}
                    <div className="p-4 md:p-5 bg-gray-50 rounded-2xl flex flex-row justify-between items-center border border-gray-100 gap-3 md:gap-4 transition-colors hover:border-gray-200">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-900 shrink-0"><UserIcon size={18} /></div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-[10px] md:text-[11px] font-bold text-slate-400 uppercase mb-1 leading-none">Account Holder</span>
                          {isEditingName ? (
                            <input type="text" maxLength={50} value={editNameValue} onChange={e => setEditNameValue(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-slate-900 text-xs font-bold uppercase text-slate-900 w-full transition-all font-montserrat" autoFocus />
                          ) : (
                            <span className="block text-xs font-bold uppercase text-slate-900 truncate">{userData?.displayName}</span>
                          )}
                        </div>
                      </div>
                      {isEditingName ? (
                        <button onClick={handleUpdateName} className="bg-slate-900 text-white text-[10px] md:text-[11px] font-black p-2.5 sm:px-6 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 hover:scale-105 transition-all shadow-md shrink-0">
                          <Save size={14} /> <span className="hidden sm:inline">Save</span>
                        </button>
                      ) : (
                        <button onClick={() => setIsEditingName(true)} className="text-slate-400 hover:text-slate-900 hover:bg-gray-200 p-2.5 sm:px-3 sm:py-2 rounded-lg text-[10px] md:text-[11px] font-black flex items-center justify-center gap-2 transition-all shrink-0">
                          <Edit2 size={14} /> <span className="hidden sm:inline">Edit</span>
                        </button>
                      )}
                    </div>

                    {/* ROW 2: Email Address */}
                    <div className="p-4 md:p-5 bg-gray-50 rounded-2xl flex flex-row justify-between items-center border border-gray-100 gap-3 md:gap-4 transition-colors hover:border-gray-200">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 shrink-0"><Mail size={18} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="block text-[10px] md:text-[11px] font-bold text-slate-400 uppercase leading-none">Email Address</span>
                            {/* THE FIX: Increased mobile text to [10px] and px-2.5 py-1 */}
                            <span className="sm:hidden text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-md uppercase tracking-widest shadow-sm border border-emerald-100 leading-none">Verified</span>
                          </div>
                          <span className="block text-xs font-bold text-slate-900 truncate">{userData?.email}</span>
                        </div>
                      </div>
                      {/* Desktop Only: Right-Aligned Pill */}
                      <span className="hidden sm:inline-block text-[10px] md:text-[11px] font-black text-emerald-500 bg-emerald-50 px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm border border-emerald-100 shrink-0">Verified</span>
                    </div>

                    {/* ROW 3: Account Role */}
                    <div className="p-4 md:p-5 bg-gray-50 rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center border border-gray-100 gap-3 md:gap-4 transition-colors hover:border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-500 shrink-0"><Shield size={18} /></div>
                        <div>
                          <span className="block text-[10px] md:text-[11px] font-bold text-slate-400 uppercase mb-1">Account Role</span>
                          <span className={`inline-block text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${userData?.role === 'ambassador' || userData?.role === 'superadmin' ? 'bg-salsa-pink/10 text-salsa-pink' : 'bg-slate-200 text-slate-600'}`}>
                            {userData?.role === 'ambassador' ? 'Guest Dancer' : userData?.role === 'superadmin' ? 'Super Admin' : 'Attendee'}
                          </span>
                        </div>
                      </div>

                      {userData?.role === 'user' && (
                        hasApplied ? (
                          <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-amber-50 rounded-xl border border-amber-100 self-start sm:self-auto mt-2 sm:mt-0">
                            <Clock size={14} className="text-amber-500" />
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-amber-600">Review Pending</span>
                          </div>
                        ) : (
                          <Link href="/apply" className="bg-slate-900 text-white px-4 md:px-5 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-salsa-pink hover:shadow-lg transition-all flex items-center justify-center gap-2 self-start sm:self-auto w-full sm:w-auto mt-2 sm:mt-0">
                            <Sparkles size={14} /> Apply as Guest Dancer
                          </Link>
                        )
                      )}
                    </div>

                    {/* ROW 4: Guest Dancer Tag */}
                    {(userData?.role === 'ambassador' || userData?.role === 'superadmin') && (
                      <div className="p-4 md:p-5 bg-gray-50 rounded-2xl flex flex-row justify-between items-center border border-gray-100 gap-3 md:gap-4 transition-colors hover:border-gray-200">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-amber-500 shrink-0"><Users size={18} /></div>
                          <div className="flex-1 min-w-0">
                            <span className="block text-[10px] md:text-[11px] font-bold text-slate-400 uppercase mb-1 leading-none">Guest Dancer Tag</span>
                            {isEditingAmbName ? (
                              <input type="text" maxLength={50} value={editAmbNameValue} onChange={e => setEditAmbNameValue(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-slate-900 text-xs font-bold uppercase text-slate-900 w-full transition-all font-montserrat" autoFocus />
                            ) : (
                              <span className="block text-xs font-bold uppercase text-slate-900 truncate">{userData?.ambassadorDisplayName || "Not Set"}</span>
                            )}
                          </div>
                        </div>
                        {isEditingAmbName ? (
                          <button onClick={handleUpdateAmbassadorName} className="bg-slate-900 text-white text-[10px] md:text-[11px] font-black p-2.5 sm:px-6 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 hover:scale-105 transition-all shadow-md shrink-0">
                            <Save size={14} /> <span className="hidden sm:inline">Save</span>
                          </button>
                        ) : (
                          <button onClick={() => setIsEditingAmbName(true)} className="text-slate-400 hover:text-slate-900 hover:bg-gray-200 p-2.5 sm:px-3 sm:py-2 rounded-lg text-[10px] md:text-[11px] font-black flex items-center justify-center gap-2 transition-all shrink-0">
                            <Edit2 size={14} /> <span className="hidden sm:inline">Edit</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Security */}
                <div className="flex flex-col gap-6 md:gap-8">
                  <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-[0_10px_30px_rgb(0,0,0,0.04)] h-fit hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] transition-all duration-500">
                    <h2 className="font-bebas text-4xl md:text-5xl mb-6 md:mb-8 uppercase text-slate-900">Security</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      <button onClick={handleResetPassword} disabled={resetCooldown > 0} className={`flex flex-col items-start p-5 md:p-6 bg-gray-50 rounded-[1.5rem] md:rounded-3xl border border-gray-100 transition-all duration-300 cursor-pointer w-full ${resetCooldown > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-900 hover:shadow-md hover:-translate-y-1'}`}>
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 md:mb-4 text-slate-600 shadow-sm"><Key size={18} /></div>
                        <span className="text-xs font-bold uppercase mb-1 font-montserrat">{resetCooldown > 0 ? `Reset (${resetCooldown}s)` : "Reset Password"}</span>
                        <span className="text-[10px] md:text-[11px] font-medium text-slate-500 text-left font-montserrat">Request recovery link</span>
                      </button>
                      <button onClick={handleSignOut} className="flex flex-col items-start p-5 md:p-6 bg-red-50/50 rounded-[1.5rem] md:rounded-3xl border border-red-100 hover:border-red-500 hover:bg-red-50 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer w-full">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-400 mb-3 md:mb-4 shadow-sm"><LogOut size={18} /></div>
                        <span className="text-xs font-bold uppercase text-red-600 mb-1 font-montserrat">Sign Out</span>
                        <span className="text-[10px] md:text-[11px] font-medium text-red-400/80 font-montserrat">Log out of your device</span>
                      </button>
                    </div>
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