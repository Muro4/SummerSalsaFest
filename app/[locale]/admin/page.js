"use client";
import { useEffect, useState, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, updateDoc, onSnapshot, deleteDoc, query, where } from "firebase/firestore";
import { useRouter } from "@/routing"; 
import Navbar from "@/components/Navbar";
import { usePopup } from "@/components/PopupProvider";
import Button from "@/components/Button";
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic'; // <-- 1. IMPORT DYNAMIC
import TabNavigation from "@/components/TabNavigation"; 
import { BarChart3, Ticket, UserCog, Mail, Undo2, Redo2, Save, Loader2 } from "lucide-react";

// ============================================================================
// 🚀 PERFORMANCE OPTIMIZATION: LAZY LOAD HEAVY COMPONENTS
// These tabs will only download to the user's browser WHEN they are clicked!
// ============================================================================
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
               unsubUsers = onSnapshot(collection(db, "users"), (uS) => setData(prev => ({ ...prev, users: uS.docs.map(d => ({ id: d.id, ...d.data() })) })));
               unsubTickets = onSnapshot(collection(db, "tickets"), (tS) => { setData(prev => ({ ...prev, tickets: tS.docs.map(d => ({ id: d.id, ...d.data() })) })); setLoading(false); });
               
               // 🚀 PERFORMANCE OPTIMIZATION: ONLY FETCH UNREAD MESSAGES
               // Prevents double-fetching the entire history of messages before the Inbox is even opened
               const unreadQuery = query(collection(db, "contact_messages"), where("status", "==", "unread"));
               unsubMessages = onSnapshot(unreadQuery, (mS) => setUnreadInboxCount(mS.docs.length));
               
               // Fetch Pending Requests
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

   // 🚀 PERFORMANCE OPTIMIZATION: MEMOIZATION
   // These large array maps will now ONLY run when 'data' or 'history' actually changes, saving massive CPU cycles.
   const effectiveTickets = useMemo(() => {
       return data.tickets.map(ticket => history[historyIndex]?.[`tickets_${ticket.id}`] ? { ...ticket, ...history[historyIndex][`tickets_${ticket.id}`] } : ticket).filter(ticket => !ticket._deleted);
   }, [data.tickets, history, historyIndex]);

   const effectiveUsers = useMemo(() => {
       return data.users.map(u => history[historyIndex]?.[`users_${u.id}`] ? { ...u, ...history[historyIndex][`users_${u.id}`] } : u);
   }, [data.users, history, historyIndex]);

   const pendingRequestsCount = useMemo(() => {
       return data.requests.filter(r => (r.status || 'pending') === 'pending').length;
   }, [data.requests]);
   
   // Unified Notification Counter
   const totalInboxNotifications = unreadInboxCount + pendingRequestsCount;

   // --- DEFINE TABS HERE ---
   const adminTabs = [
      { id: 'analytics', label: t('tabAnalytics'), icon: BarChart3 },
      { id: 'inbox', label: t('tabInbox'), icon: Mail, badge: totalInboxNotifications },
      { id: 'tickets', label: t('tabTickets'), icon: Ticket },
      { id: 'users', label: t('tabUsers'), icon: UserCog }
   ];

   if (!isAdmin || loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>;

   return (
      <main className="min-h-screen bg-salsa-white font-montserrat pt-32 pb-40 select-none relative">
         <Navbar />
         <div className="max-w-7xl mx-auto px-4 md:px-6">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 relative z-30">
               <div>
                  <h1 className="font-bebas tracking-wide text-6xl md:text-7xl leading-none text-slate-900 uppercase">{t('pageTitle')}</h1>
                  <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] mt-2">{t('pageSubtitle')}</p>
               </div>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6 w-full relative z-20">

               {/* --- MAIN TAB NAVIGATOR --- */}
               <div className="w-full lg:w-[680px]">
                  <TabNavigation 
                     tabs={adminTabs} 
                     activeTab={activeTab} 
                     setActiveTab={setActiveTab} 
                  />
               </div>

               {/* --- DESKTOP ACTION BUTTONS --- */}
               {['tickets', 'users'].includes(activeTab) && (
                  <div className="hidden lg:flex items-center gap-3 w-full lg:w-auto animate-in fade-in duration-300">
                     <button onClick={() => historyIndex > 0 && setHistoryIndex(historyIndex - 1)} disabled={historyIndex <= 0 || saving} title={t('btnUndo')} className="h-[52px] w-[52px] flex items-center justify-center bg-white border border-gray-200 text-slate-500 rounded-2xl hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed">
                        <Undo2 size={20} />
                     </button>
                     <button onClick={() => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1)} disabled={historyIndex >= history.length - 1 || saving} title={t('btnRedo')} className="h-[52px] w-[52px] flex items-center justify-center bg-white border border-gray-200 text-slate-500 rounded-2xl hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed">
                        <Redo2 size={20} />
                     </button>
                     <Button variant="secondary" size="lg" icon={Save} onClick={handleSaveChanges} disabled={historyIndex === 0 || saving}>
                        {saving ? t('btnSaving') : t('btnSave')}
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
            className={`lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] pt-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex items-center justify-between transition-transform duration-500 ease-out ${
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