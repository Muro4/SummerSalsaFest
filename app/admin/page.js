"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, updateDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { usePopup } from "@/components/PopupProvider";
import Button from "@/components/Button";

// Import the modular Tabs
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import InboxManager from "@/components/admin/InboxManager"; 
import TicketsTab from "@/components/admin/TicketsTab";
import UsersTab from "@/components/admin/UsersTab";

import { BarChart3, Ticket, UserCog, Mail, Undo2, Redo2, Save, Loader2 } from "lucide-react";

export default function AdminDashboard() {
   const [activeTab, setActiveTab] = useState("analytics");
   const [data, setData] = useState({ users: [], tickets: [], requests: [] });
   const [loading, setLoading] = useState(true);
   const [isAdmin, setIsAdmin] = useState(false);
   const [saving, setSaving] = useState(false);
   
   const [unreadInboxCount, setUnreadInboxCount] = useState(0);
   
   const router = useRouter();
   const { showPopup } = usePopup();

   const [history, setHistory] = useState([{}]);
   const [historyIndex, setHistoryIndex] = useState(0);

   // --- INITIAL LISTENER SETUP ---
   useEffect(() => {
      let unsubUsers = () => { };
      let unsubTickets = () => { };
      let unsubMessages = () => { }; 
      let unsubRequests = () => { }; 

      const unsubAuth = auth.onAuthStateChanged(async (user) => {
         if (user) {
            const myDoc = await getDoc(doc(db, "users", user.uid));
            if (myDoc.exists() && myDoc.data().role === "superadmin") {
               setIsAdmin(true);
               unsubUsers = onSnapshot(collection(db, "users"), (uS) => setData(prev => ({ ...prev, users: uS.docs.map(d => ({ id: d.id, ...d.data() })) })));
               unsubTickets = onSnapshot(collection(db, "tickets"), (tS) => { setData(prev => ({ ...prev, tickets: tS.docs.map(d => ({ id: d.id, ...d.data() })) })); setLoading(false); });
               
               // Count Unread Messages
               unsubMessages = onSnapshot(collection(db, "contact_messages"), (mS) => setUnreadInboxCount(mS.docs.filter(d => d.data().status === "unread").length));
               
               // Fetch Pending Requests (Passed down to InboxManager)
               unsubRequests = onSnapshot(collection(db, "ambassador_requests"), (rS) => {
                  setData(prev => ({ ...prev, requests: rS.docs.map(d => ({ id: d.id, ...d.data() })) }));
               });

            } else { router.push("/"); }
         } else { unsubUsers(); unsubTickets(); unsubMessages(); unsubRequests(); router.push("/login"); }
      });
      return () => { unsubAuth(); unsubUsers(); unsubTickets(); unsubMessages(); unsubRequests(); };
   }, [router]);

   // --- BROWSER REFRESH & IN-APP NAVIGATION PROTECTOR ---
   useEffect(() => {
      const handleBeforeUnload = (e) => { if (historyIndex > 0) { e.preventDefault(); e.returnValue = ''; } };
      const handleLinkClick = (e) => {
         if (historyIndex === 0) return; 
         const anchor = e.target.closest('a');
         if (anchor && anchor.href) {
            const targetPath = new URL(anchor.href).pathname;
            if (targetPath && targetPath !== window.location.pathname) {
               e.preventDefault(); e.stopPropagation();
               showPopup({
                  type: "info", title: "Unsaved Changes", message: "You have unsaved edits! If you leave this page now, your changes will be lost.", confirmText: "Discard & Leave", cancelText: "Stay Here",
                  onConfirm: () => { setHistory([{}]); setHistoryIndex(0); router.push(targetPath); }
               });
            }
         }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('click', handleLinkClick, { capture: true });
      return () => { window.removeEventListener('beforeunload', handleBeforeUnload); document.removeEventListener('click', handleLinkClick, { capture: true }); };
   }, [historyIndex, router, showPopup]);

   // --- STAGING ACTIONS (Undo/Redo Logic) ---
   const handleStageChange = (collection, id, updates) => {
      const newStaged = { ...history[historyIndex], [`${collection}_${id}`]: { ...(history[historyIndex][`${collection}_${id}`] || {}), ...updates, _meta: { collection, id } } };
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newStaged); setHistory(newHistory); setHistoryIndex(newHistory.length - 1);
   };

   const handleSaveChanges = async () => {
      if (!history[historyIndex] || Object.keys(history[historyIndex]).length === 0) return;
      setSaving(true);
      try {
         for (const key of Object.keys(history[historyIndex])) {
            const { _meta, _deleted, ...updates } = history[historyIndex][key];
            if (_deleted) await deleteDoc(doc(db, _meta.collection, _meta.id));
            else if (Object.keys(updates).length > 0) await updateDoc(doc(db, _meta.collection, _meta.id), updates);
         }
         setHistory([{}]); setHistoryIndex(0); showPopup({ type: "success", title: "Success", message: "All changes saved to database.", confirmText: "Done" });
      } catch (err) {
         console.error(err); showPopup({ type: "error", title: "Error", message: "Failed to save changes to database." });
      } finally { setSaving(false); }
   };

   // Apply staged changes to the live data for instant preview
   const effectiveTickets = data.tickets.map(t => history[historyIndex]?.[`tickets_${t.id}`] ? { ...t, ...history[historyIndex][`tickets_${t.id}`] } : t).filter(t => !t._deleted);
   const effectiveUsers = data.users.map(u => history[historyIndex]?.[`users_${u.id}`] ? { ...u, ...history[historyIndex][`users_${u.id}`] } : u);

   // Unified Notification Counter
   const totalInboxNotifications = unreadInboxCount + data.requests.length;

   if (!isAdmin || loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>;

   return (
      <main className="min-h-screen bg-salsa-white font-montserrat pt-32 pb-40 select-none relative">
         <Navbar />
         {/* THE FIX: Reverted back to max-w-7xl to restore your grid alignment! */}
         <div className="max-w-7xl mx-auto px-4 md:px-6">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 relative z-30">
               <div>
                  <h1 className="font-bebas text-6xl md:text-7xl leading-none text-slate-900 uppercase">Event Overview</h1>
                  <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] mt-2">Summer Salsa Fest Management</p>
               </div>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6 w-full relative z-20">

               {/* --- MAIN TAB NAVIGATOR --- */}
               <div className="bg-slate-50 border border-gray-100 p-1.5 rounded-2xl w-full lg:w-[680px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] grid grid-cols-2 lg:grid-cols-4 relative gap-1 lg:gap-0">
                  
                  {/* Desktop Sliding Pill */}
                  <div
                     className="hidden lg:block absolute top-1.5 bottom-1.5 bg-slate-900 rounded-xl transition-all duration-300 ease-out shadow-sm"
                     style={{
                        width: 'calc((100% - 0.75rem) / 4)',
                        left: activeTab === 'analytics' ? '0.375rem' :
                           activeTab === 'inbox' ? 'calc(0.375rem + (100% - 0.75rem) / 4)' :
                           activeTab === 'tickets' ? 'calc(0.375rem + ((100% - 0.75rem) / 4) * 2)' :
                              'calc(0.375rem + ((100% - 0.75rem) / 4) * 3)'
                     }}
                  />
                  
                  <Button variant="ghost" size="sliderTab" icon={BarChart3} onClick={() => setActiveTab("analytics")} className={`relative z-10 ${activeTab === 'analytics' ? '!text-white bg-slate-900 lg:bg-transparent shadow-sm lg:shadow-none !cursor-default !active:scale-100' : '!text-slate-400 hover:!text-slate-900 lg:hover:bg-transparent transition-colors'}`}>Analytics</Button>
                  
                  <Button variant="ghost" size="sliderTab" icon={Mail} onClick={() => setActiveTab("inbox")} className={`relative z-10 ${activeTab === 'inbox' ? '!text-white bg-slate-900 lg:bg-transparent shadow-sm lg:shadow-none !cursor-default !active:scale-100' : '!text-slate-400 hover:!text-slate-900 lg:hover:bg-transparent transition-colors'}`}>
                     Inbox
                     {totalInboxNotifications > 0 && <span className="bg-salsa-pink text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none font-bold animate-pulse tracking-normal absolute top-1.5 right-2 lg:right-3">{totalInboxNotifications}</span>}
                  </Button>
                  
                  <Button variant="ghost" size="sliderTab" icon={Ticket} onClick={() => setActiveTab("tickets")} className={`relative z-10 ${activeTab === 'tickets' ? '!text-white bg-slate-900 lg:bg-transparent shadow-sm lg:shadow-none !cursor-default !active:scale-100' : '!text-slate-400 hover:!text-slate-900 lg:hover:bg-transparent transition-colors'}`}>Tickets</Button>
                  
                  <Button variant="ghost" size="sliderTab" icon={UserCog} onClick={() => setActiveTab("users")} className={`relative z-10 ${activeTab === 'users' ? '!text-white bg-slate-900 lg:bg-transparent shadow-sm lg:shadow-none !cursor-default !active:scale-100' : '!text-slate-400 hover:!text-slate-900 lg:hover:bg-transparent transition-colors'}`}>Users</Button>
               </div>

               {/* --- DESKTOP ACTION BUTTONS --- */}
               {['tickets', 'users'].includes(activeTab) && (
                  <div className="hidden lg:flex items-center gap-3 w-full lg:w-auto animate-in fade-in duration-300">
                     <button onClick={() => historyIndex > 0 && setHistoryIndex(historyIndex - 1)} disabled={historyIndex <= 0 || saving} title="Undo Stage" className="h-[52px] w-[52px] flex items-center justify-center bg-white border border-gray-200 text-slate-500 rounded-2xl hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed">
                        <Undo2 size={20} />
                     </button>
                     <button onClick={() => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1)} disabled={historyIndex >= history.length - 1 || saving} title="Redo Stage" className="h-[52px] w-[52px] flex items-center justify-center bg-white border border-gray-200 text-slate-500 rounded-2xl hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed">
                        <Redo2 size={20} />
                     </button>
                     <Button variant="secondary" size="lg" icon={Save} onClick={handleSaveChanges} disabled={historyIndex === 0 || saving}>
                        {saving ? "Saving..." : "Save"}
                     </Button>
                  </div>
               )}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="relative w-full z-10">
               {activeTab === 'analytics' && <AnalyticsTab tickets={effectiveTickets} />}
               {activeTab === 'inbox' && <InboxManager requests={data.requests} />} 
               {activeTab === 'tickets' && <TicketsTab tickets={effectiveTickets} users={effectiveUsers} onStageChange={handleStageChange} historyStagedData={history[historyIndex]} />}
               {activeTab === 'users' && <UsersTab users={effectiveUsers} currentUserId={auth.currentUser?.uid} onStageChange={handleStageChange} historyStagedData={history[historyIndex]} />}
            </div>
         </div>

         {/* ==============================================
             MOBILE FLOATING ACTION BAR
             ============================================== */}
         <div 
            className={`lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-4 z-50 flex items-center justify-between transition-transform duration-500 ease-out ${
               historyIndex > 0 ? "translate-y-0" : "translate-y-full"
            }`}
         >
            <div className="w-full flex items-center justify-between gap-3">
               <div className="flex items-center gap-2">
                  <button onClick={() => historyIndex > 0 && setHistoryIndex(historyIndex - 1)} disabled={historyIndex <= 0 || saving} className="h-12 w-12 flex items-center justify-center bg-gray-100 text-slate-600 rounded-xl hover:bg-gray-200 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed">
                     <Undo2 size={18} />
                  </button>
                  <button onClick={() => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1)} disabled={historyIndex >= history.length - 1 || saving} className="h-12 w-12 flex items-center justify-center bg-gray-100 text-slate-600 rounded-xl hover:bg-gray-200 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed">
                     <Redo2 size={18} />
                  </button>
               </div>
               
               <button onClick={handleSaveChanges} disabled={historyIndex === 0 || saving} className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest h-12 px-6 rounded-xl hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 flex-1 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Saving..." : "Save"}
               </button>
            </div>
         </div>
      </main>
   );
}