"use client";
import { useEffect, useState, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, updateDoc, onSnapshot, deleteDoc, query, where } from "firebase/firestore";
import { useRouter } from "@/routing"; 
import Navbar from "@/components/Navbar";
import { usePopup } from "@/components/PopupProvider";
import Button from "@/components/Button";
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic'; 
import { BarChart3, Ticket, UserCog, Mail, Undo2, Redo2, Save, Loader2, Settings2 } from "lucide-react";


const AnalyticsTab = dynamic(() => import("@/components/admin/AnalyticsTab"), { 
   loading: () => <div className="flex justify-center p-20"><Loader2 className="animate-spin text-salsa-pink" size={32} /></div> 
});
const InboxManager = dynamic(() => import("@/components/admin/InboxManager"), { 
   loading: () => <div className="flex justify-center p-20"><Loader2 className="animate-spin text-salsa-pink" size={32} /></div> 
});
const TicketsTab = dynamic(() => import("@/components/admin/TicketsTab"), { 
   loading: () => <div className="flex justify-center p-20"><Loader2 className="animate-spin text-salsa-pink" size={32} /></div> 
});
const UsersTab = dynamic(() => import("@/components/admin/UsersTab"), { 
   loading: () => <div className="flex justify-center p-20"><Loader2 className="animate-spin text-salsa-pink" size={32} /></div> 
});
const DevTab = dynamic(() => import("@/components/admin/DevTab"), { 
   loading: () => <div className="flex justify-center p-20"><Loader2 className="animate-spin text-salsa-pink" size={32} /></div> 
});

export default function AdminDashboard() {
   const t = useTranslations('AdminDashboard');
   const router = useRouter();
   const { showPopup } = usePopup();

   const [activeTab, setActiveTab] = useState("analytics");
   const [data, setData] = useState({ users: [], tickets: [], requests: [] });
   const [loading, setLoading] = useState(true);
   const [isAdmin, setIsAdmin] = useState(false);
   const [saving, setSaving] = useState(false);
   
   const [unreadInboxCount, setUnreadInboxCount] = useState(0);
   
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
               
               unsubUsers = onSnapshot(collection(db, "users"), 
                  (uS) => setData(prev => ({ ...prev, users: uS.docs.map(d => ({ id: d.id, ...d.data() })) })),
                  (err) => console.error("Users sync error:", err)
               );
               
               unsubTickets = onSnapshot(collection(db, "tickets"), 
                  (tS) => { setData(prev => ({ ...prev, tickets: tS.docs.map(d => ({ id: d.id, ...d.data() })) })); setLoading(false); },
                  (err) => console.error("Tickets sync error:", err)
               );
               
               const unreadQuery = query(collection(db, "contact_messages"), where("status", "==", "unread"));
               unsubMessages = onSnapshot(unreadQuery, 
                  (mS) => setUnreadInboxCount(mS.docs.length),
                  (err) => console.error("Messages sync error:", err)
               );
               
               unsubRequests = onSnapshot(collection(db, "ambassador_requests"), 
                  (rS) => setData(prev => ({ ...prev, requests: rS.docs.map(d => ({ id: d.id, ...d.data() })) })),
                  (err) => console.error("Requests sync error:", err)
               );

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
                  type: "info", title: t('popupUnsavedTitle'), message: t('popupUnsavedMsg'), confirmText: t('btnLeave'), cancelText: t('btnStay'),
                  onConfirm: () => { setHistory([{}]); setHistoryIndex(0); router.push(targetPath); }
               });
            }
         }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('click', handleLinkClick, { capture: true });
      return () => { window.removeEventListener('beforeunload', handleBeforeUnload); document.removeEventListener('click', handleLinkClick, { capture: true }); };
   }, [historyIndex, router, showPopup, t]);

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
         setHistory([{}]); setHistoryIndex(0); showPopup({ type: "success", title: t('popupSaveTitle'), message: t('popupSaveMsg'), confirmText: t('btnDone') });
      } catch (err) {
         console.error(err); showPopup({ type: "error", title: t('popupErrTitle'), message: t('popupErrMsg') });
      } finally { setSaving(false); }
   };

   const effectiveTickets = useMemo(() => {
       return data.tickets.map(ticket => history[historyIndex]?.[`tickets_${ticket.id}`] ? { ...ticket, ...history[historyIndex][`tickets_${ticket.id}`] } : ticket).filter(ticket => !ticket._deleted);
   }, [data.tickets, history, historyIndex]);

   const effectiveUsers = useMemo(() => {
       return data.users.map(u => history[historyIndex]?.[`users_${u.id}`] ? { ...u, ...history[historyIndex][`users_${u.id}`] } : u);
   }, [data.users, history, historyIndex]);

   const pendingRequestsCount = useMemo(() => {
       return data.requests.filter(r => (r.status || 'pending') === 'pending').length;
   }, [data.requests]);
   
   const totalInboxNotifications = unreadInboxCount + pendingRequestsCount;

   const adminTabs = [
      { id: 'analytics', label: t('tabAnalytics'), icon: BarChart3 },
      { id: 'inbox', label: t('tabInbox'), icon: Mail, badge: totalInboxNotifications },
      { id: 'tickets', label: t('tabTickets'), icon: Ticket },
      { id: 'users', label: t('tabUsers'), icon: UserCog },
      { id: 'dev', label: 'Dev Panel', icon: Settings2 }
   ];

   if (!isAdmin || loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>;

   return (
      <main className="min-h-screen bg-salsa-white font-montserrat pt-28 md:pt-32 pb-20 select-none overflow-x-hidden flex flex-col">
         <Navbar />
         
         {/* MAIN WRAPPER: Full width (no max-w), tight padding */}
         <div className="flex-1 w-full px-4 md:px-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start relative z-20">
            
            {/* --- STRICTLY VERTICAL SIDEBAR --- */}
            <aside className="w-full md:w-[240px] xl:w-[280px] shrink-0 flex flex-col gap-4 md:sticky md:top-32 z-30 md:h-[calc(100vh-12rem)]">
                  
                  {/* Clean Sidebar Header on Desktop */}
                  <div className="hidden md:block mb-4 px-2 shrink-0">
                     <h1 className="font-bebas tracking-wide text-5xl text-slate-900 uppercase leading-none">Admin Panel</h1>
                     <p className="text-[10px] md:text-[11px] font-black uppercase text-slate-400 tracking-widest mt-1.5">Summer Salsa Fest Management</p>
                  </div>

                  {/* Navigation Links - flex-col md:flex-col forces the column direction! */}
                  <div className="flex flex-col md:flex-col gap-2 w-full pb-4 md:pb-0 shrink-0">
                     {adminTabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                           <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`relative flex items-center gap-4 px-5 py-4 rounded-2xl font-bold uppercase tracking-widest text-[11px] transition-all duration-200 cursor-pointer md:w-full text-left border ${
                                 isActive
                                    ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/20 scale-100"
                                    : "bg-white text-slate-500 border-gray-100 hover:bg-slate-50 hover:text-slate-900 hover:border-gray-200 hover:scale-[1.02] shadow-sm"
                              }`}
                           >
                              <Icon size={18} className={isActive ? "text-white" : "text-slate-400"} />
                              <span className="truncate flex-1">{tab.label}</span>
                              {tab.badge > 0 && (
                                 <span className={`ml-auto px-2 py-0.5 rounded-md text-[10px] font-black leading-none shadow-sm ${isActive ? "bg-slate-600 text-white" : "bg-slate-400 text-white"}`}>
                                    {tab.badge}
                                 </span>
                              )}
                           </button>
                        );
                     })}
                  </div>
               </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 w-full min-w-0 relative z-10 pb-20 md:pb-0 flex flex-col gap-6">
               
               {/* 🚀 THE FIX: ACTION BAR RELOCATED ABOVE TABLES & ALIGNED LEFT */}
               {['tickets', 'users'].includes(activeTab) && (
                  <div className="hidden md:flex justify-start items-center gap-4 animate-in fade-in duration-300 mb-2">
                     <div className="flex gap-3">
                        <button onClick={() => historyIndex > 0 && setHistoryIndex(historyIndex - 1)} disabled={historyIndex <= 0 || saving} title={t('btnUndo')} className="h-11 w-12 flex items-center justify-center bg-white border border-gray-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed">
                           <Undo2 size={14} />
                        </button>
                        <button onClick={() => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1)} disabled={historyIndex >= history.length - 1 || saving} title={t('btnRedo')} className="h-11 w-12 flex items-center justify-center bg-white border border-gray-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed">
                           <Redo2 size={14} />
                        </button>
                     </div>

                     <div className="flex items-center gap-4">
                        <Button variant="secondary" size="md" icon={Save} onClick={handleSaveChanges} disabled={historyIndex === 0 || saving} className="shadow-lg px-8">
                           {saving ? t('btnSaving') : t('btnSave')}
                        </Button>
                        {historyIndex > 0 && (
                           <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest animate-pulse">
                              Unsaved Changes
                           </span>
                        )}
                     </div>
                  </div>
               )}

               {/* TAB CONTENT */}
               {activeTab === 'analytics' && <AnalyticsTab tickets={effectiveTickets} />}
               {activeTab === 'inbox' && <InboxManager requests={data.requests} />} 
               {activeTab === 'tickets' && <TicketsTab tickets={effectiveTickets} users={effectiveUsers} onStageChange={handleStageChange} historyStagedData={history[historyIndex]} />}
               {activeTab === 'users' && <UsersTab users={effectiveUsers} currentUserId={auth.currentUser?.uid} onStageChange={handleStageChange} historyStagedData={history[historyIndex]} />}
               {activeTab === 'dev' && <DevTab />}
            </div>

         </div>

         {/* ==============================================
             MOBILE FLOATING ACTION BAR
             ============================================== */}
          <div 
            className={`md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] pt-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-[100] flex items-center justify-between transition-transform duration-500 ease-out ${
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
                  {saving ? t('btnSaving') : t('btnSave')}
               </button>
            </div>
         </div>
      </main>
   );
}