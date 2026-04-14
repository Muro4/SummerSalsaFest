"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { useRouter } from "@/routing"; // THE FIX: Custom routing
import Navbar from "@/components/Navbar";
import { usePopup } from "@/components/PopupProvider";
import TicketModal from "@/components/TicketModal";
import TabNavigation from "@/components/TabNavigation";
import { Loader2, Info, UserPlus, History } from "lucide-react";
import { useTranslations } from 'next-intl';
import { generateTicketID, getActiveFestivalYear } from "@/lib/utils";
import { getPriceAtDate as getPrice } from "@/lib/pricing";



// Modular Tabs
import DraftTab from "@/components/ambassador/DraftTab";
import HistoryTab from "@/components/ambassador/HistoryTab";


export default function AmbassadorDashboard() {
   const t = useTranslations('AmbassadorDashboard');

   const [activeTab, setActiveTab] = useState("draft");
   const [loading, setLoading] = useState(true);
   const [userData, setUserData] = useState(null);

   const [groupRows, setGroupRows] = useState([]);
   const [paidTickets, setPaidTickets] = useState([]);
   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

   const [showInfoModal, setShowInfoModal] = useState(false);
   const [fullScreenTicket, setFullScreenTicket] = useState(null);

   const router = useRouter();
   const { showPopup } = usePopup();

   // --- TAB DEFINITION ---
   const dashboardTabs = [
      { id: "draft", label: t('tabDraft'), icon: UserPlus },
      { id: "history", label: t('tabHistory'), icon: History }
   ];

   useEffect(() => {
      const hasSeenInfo = localStorage.getItem("hasSeenAmbassadorInfo");
      if (!hasSeenInfo) { setShowInfoModal(true); localStorage.setItem("hasSeenAmbassadorInfo", "true"); }

      let unsubTickets = () => { };
      const unsubAuth = auth.onAuthStateChanged(async (user) => {
         if (user) {
            const uDoc = await getDoc(doc(db, "users", user.uid));
            if (uDoc.exists() && (uDoc.data().role === 'ambassador' || uDoc.data().role === 'superadmin')) {
               setUserData(uDoc.data());

               // DECOUPLED FROM ROSTERS TABLE: Initialize an empty row in local state
               setGroupRows([{ id: Date.now(), name: "", type: "Full Pass" }]);

               const q = query(collection(db, "tickets"), where("userId", "==", user.uid), where("status", "==", "active"));
               unsubTickets = onSnapshot(q, (snap) => {
                  setPaidTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                  setLoading(false);
               });
            } else { router.push("/"); }
         } else { router.push("/login"); }
      });
      return () => { unsubAuth(); unsubTickets(); };
   }, [router]);

   // KEYBOARD NAVIGATION
   useEffect(() => {
      if (!fullScreenTicket) return;
      const handleKeyDown = (e) => {
         const currentIndex = paidTickets.findIndex(ticket => ticket.id === fullScreenTicket.id);
         if (e.key === "ArrowRight" && currentIndex < paidTickets.length - 1) setFullScreenTicket(paidTickets[currentIndex + 1]);
         else if (e.key === "ArrowLeft" && currentIndex > 0) setFullScreenTicket(paidTickets[currentIndex - 1]);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
   }, [fullScreenTicket, paidTickets]);

   // Keep saveRoster entirely local, don't write to Firestore
   const saveRoster = (newRows) => {
      setGroupRows(newRows);
   };

   const submitGroupToCart = async () => {
      // (Keep your existing validation checks here...)
      if (groupRows.filter(r => !r.name.trim()).length > 0) {
         showPopup({ type: "error", title: t('errMissingTitle'), message: t('errMissingMsg'), confirmText: t('errFixIt') });
         return;
      }
      const nameRegex = /^[\p{L}\s\-']+$/u;
      for (let i = 0; i < groupRows.length; i++) {
         const row = groupRows[i];
         if (row.name.trim().length < 2 || !nameRegex.test(row.name.trim())) {
            showPopup({ type: "error", title: t('errNameTitle'), message: t('errNameMsg', { rowNum: i + 1 }), confirmText: t('errFixIt') });
            return;
         }
      }
      
      setLoading(true);
      try {
         // Prepare the payload
         const ticketsPayload = groupRows.map(person => ({
           userName: person.name,
           passType: person.type
         }));

         // Grab Auth token
         const token = await auth.currentUser.getIdToken();

         // Send to secure API
         const res = await fetch('/api/tickets/create', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${token}`
           },
           body: JSON.stringify({
             isGuest: false,
             tickets: ticketsPayload
           })
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Failed to create group tickets");

         // Reset the local state back to one empty row after successful add to cart
         saveRoster([{ id: Date.now(), name: "", type: "Full Pass" }]);
         showPopup({ type: "success", title: t('errCartTitle'), message: t('errCartMsg'), confirmText: t('btnGoCart'), onConfirm: () => router.push("/cart") });
      } catch (e) {
         showPopup({ type: "error", title: t('errGenTitle'), message: e.message, confirmText: t('btnClose') });
      } finally {
         setLoading(false);
      }
   };

   if (loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>;

   return (
      <main className="min-h-screen flex flex-col bg-salsa-white font-montserrat select-none">
         <Navbar />

         {/* --- INFO MODAL --- */}
         {showInfoModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowInfoModal(false)}></div>
               <div className="relative bg-white w-full max-w-lg rounded-[2rem] p-8 md:p-10 shadow-2xl animate-in zoom-in-95 duration-200">
                  <h2 className="font-bebas tracking-wide text-4xl text-slate-900 uppercase mb-2">{t('infoTitle')}</h2>
                  <p className="text-sm text-slate-500 font-medium mb-6">{t('infoDesc')}</p>
                  <div className="space-y-4 mb-8">
                     <div className="flex gap-4 items-start"><div className="w-8 h-8 rounded-full bg-salsa-mint/10 text-salsa-mint flex items-center justify-center font-black shrink-0">1</div><div><span className="font-bold text-slate-900 block text-sm font-montserrat">{t('infoStep1')}</span><span className="text-xs text-slate-500 font-montserrat">{t('infoDesc1')}</span></div></div>
                     <div className="flex gap-4 items-start"><div className="w-8 h-8 rounded-full bg-salsa-mint/10 text-salsa-mint flex items-center justify-center font-black shrink-0">2</div><div><span className="font-bold text-slate-900 block text-sm font-montserrat">{t('infoStep2')}</span><span className="text-xs text-slate-500 font-montserrat">{t('infoDesc2')}</span></div></div>
                     <div className="flex gap-4 items-start"><div className="w-8 h-8 rounded-full bg-salsa-mint/10 text-salsa-mint flex items-center justify-center font-black shrink-0">3</div><div><span className="font-bold text-slate-900 block text-sm font-montserrat">{t('infoStep3')}</span><span className="text-xs text-slate-500 font-montserrat">{t('infoDesc3')}</span></div></div>
                     <div className="flex gap-4 items-start"><div className="w-8 h-8 rounded-full bg-salsa-mint/10 text-salsa-mint flex items-center justify-center font-black shrink-0">4</div><div><span className="font-bold text-slate-900 block text-sm font-montserrat">{t('infoStep4')}</span><span className="text-xs text-slate-500 font-montserrat">{t('infoDesc4')}</span></div></div>
                  </div>
                  <button onClick={() => setShowInfoModal(false)} className="w-full cursor-pointer bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-salsa-pink transition-colors text-xs uppercase tracking-widest font-montserrat">{t('infoGotIt')}</button>
               </div>
            </div>
         )}

         {/* --- FULLSCREEN TICKET MODAL --- */}
         {fullScreenTicket && (
            <TicketModal
               ticket={fullScreenTicket}
               ticketsList={paidTickets}
               setTicket={setFullScreenTicket}
               onClose={() => setFullScreenTicket(null)}
            />
         )}

         {/* --- MAIN DASHBOARD UI --- */}
         <div className="flex-grow max-w-7xl mx-auto px-4 md:px-6 w-full pt-32 pb-40">

            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-30">
               <div>
                  <div className="flex items-center gap-2 mb-2">
                     <button onClick={() => setShowInfoModal(true)} className="flex items-center gap-1.5 bg-white border border-gray-200 text-slate-500 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 hover:text-slate-900 transition-colors cursor-pointer shadow-sm"><Info size={14} /> {t('infoGuideBtn')}</button>
                  </div>

                  <h1 className="font-bebas tracking-wide text-6xl md:text-7xl leading-none text-slate-900 uppercase">
                     {userData?.ambassadorDisplayName ? t('dashTitleUser', { name: userData.ambassadorDisplayName }) : t('dashTitleFallback')}
                  </h1>

               </div>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6 w-full relative z-20">

               <div className="w-full md:w-[400px]">
                  <TabNavigation
                     tabs={dashboardTabs}
                     activeTab={activeTab}
                     setActiveTab={setActiveTab}
                  />
               </div>

            </div>

            {/* TAB RENDERING */}
            {activeTab === "draft" && <DraftTab groupRows={groupRows} saveRoster={saveRoster} submitGroupToCart={submitGroupToCart} />}
            {activeTab === "history" && <HistoryTab paidTickets={paidTickets} setFullScreenTicket={setFullScreenTicket} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}

         </div>
      </main>
   );
}