"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation"; 
import Navbar from "@/components/Navbar";
import { usePopup } from "@/components/PopupProvider";
import TicketModal from "@/components/TicketModal";
import TabNavigation from "@/components/TabNavigation";
import { Loader2, Info, UserPlus, History, CalendarClock } from "lucide-react";
import { useTranslations } from 'next-intl';
import DraftTab from "@/components/ambassador/DraftTab";
import HistoryTab from "@/components/ambassador/HistoryTab";
import { roomError } from "@/lib/room-client";
import { getActiveFestivalYear } from "@/lib/utils";
import { pricingTable, getPriceAtDate } from "@/lib/pricing";

export default function AmbassadorDashboard() {
   const t = useTranslations('AmbassadorDashboard');
   const roomT = useTranslations('RoomSystem');

   const [activeTab, setActiveTab] = useState("draft");
   const [loading, setLoading] = useState(true);
   const [submitting, setSubmitting] = useState(false);
   const [userData, setUserData] = useState(null);

   const [groupRows, setGroupRows] = useState([]);
   const [paidTickets, setPaidTickets] = useState([]);
   const [selectedYear, setSelectedYear] = useState(() => String(getActiveFestivalYear()));

   const [showInfoModal, setShowInfoModal] = useState(false);
   const [fullScreenTicket, setFullScreenTicket] = useState(null);
   const [fullPassPrice, setFullPassPrice] = useState("...");

   const router = useRouter();
   const { showPopup } = usePopup();

   const dashboardTabs = [
      { id: "draft", label: t('tabDraft'), icon: UserPlus },
      { id: "history", label: t('tabHistory'), icon: History },
   ];

   useEffect(() => {
      setFullPassPrice(getPriceAtDate('Full Pass') + 5);
   }, []);

   useEffect(() => {
      const hasSeenInfo = localStorage.getItem("hasSeenAmbassadorInfo");
      if (!hasSeenInfo) { setShowInfoModal(true); localStorage.setItem("hasSeenAmbassadorInfo", "true"); }

      let unsubTickets = () => { };
      const unsubAuth = auth.onAuthStateChanged(async (user) => {
         if (user) {
            const uDoc = await getDoc(doc(db, "users", user.uid));
            if (uDoc.exists() && (uDoc.data().role === 'ambassador' || uDoc.data().role === 'superadmin')) {
               setUserData(uDoc.data());
               setGroupRows([{ id: crypto.randomUUID(), name: "", type: "Full Pass", accommodation: "None" }]);

               unsubTickets();
               const q = query(collection(db, "tickets"), where("userId", "==", user.uid));
               unsubTickets = onSnapshot(q, (snap) => {
                  setPaidTickets(snap.docs.map(d => ({ ...d.data(), id: d.id })).filter(ticket => ticket.status === "active"));
                  setLoading(false);
               });
            } else { router.push("/"); }
         } else { router.push("/login"); }
      });
      return () => { unsubAuth(); unsubTickets(); };
   }, [router]);

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

   const saveRoster = (newRows) => {
      setGroupRows(newRows);
   };

   const activateDrafts = async () => {
      if (submitting) return;
      setSubmitting(true);
      try {
         const ticketsPayload = groupRows.map(person => {
            const commission = person.type === 'Full Pass' ? 10 : (person.type === 'Performers Pass' ? 5 : 0);
            return {
               userName: person.name,
               passType: person.type,
               accommodation: person.accommodation || "None",
               roomId: person.roomId || null,
               draftId: String(person.id),
               attendeeEmail: (person.email || "").trim(),
               commission: commission
            };
         });

         const token = await auth.currentUser.getIdToken();
         const res = await fetch('/api/tickets/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              isGuest: false,
              isAmbassadorRegistration: true, 
              tickets: ticketsPayload
            })
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Failed to generate tickets");

         setPaidTickets(previous => [...new Map([...previous, ...data.tickets].map(ticket => [ticket.id, ticket])).values()]);
         setSelectedYear(String(data.tickets[0].festivalYear));
         setActiveTab("history");
         saveRoster([{ id: crypto.randomUUID(), name: "", type: "Full Pass", accommodation: "None" }]);
         
         showPopup({ 
            type: "success", 
            title: roomT('registrationComplete'),
            message: roomT('registrationSuccess', { count: groupRows.length }),
            confirmText: t('tabHistory'),
            onConfirm: () => setActiveTab("history") 
         });
      } catch (e) {
         showPopup({ type: "error", title: t('errGenTitle'), message: roomError(roomT, e), confirmText: t('btnClose') });
      } finally {
         setSubmitting(false);
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

            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-30">
               <div>
                  <div className="flex items-center gap-2 mb-2">
                     <button onClick={() => setShowInfoModal(true)} className="flex items-center gap-1.5 bg-white border border-gray-200 text-slate-500 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 hover:text-slate-900 transition-colors cursor-pointer shadow-sm"><Info size={14} /> {t('infoGuideBtn')}</button>
                  </div>
                  <h1 className="font-bebas tracking-wide text-6xl md:text-7xl leading-none text-slate-900 uppercase">
                     {userData?.ambassadorDisplayName ? t('dashTitleUser', { name: userData.ambassadorDisplayName }) : t('dashTitleFallback')}
                  </h1>
               </div>
            </div>

            {/* --- PRICING & POLICIES WIDGET --- */}
            <div className="w-full max-w-2xl mx-auto mb-12 relative z-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <h3 className="font-bebas text-2xl text-slate-400 mb-4 uppercase tracking-widest text-center">{t('pricingTitle')}</h3>
               <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mb-6">
                  <div className="overflow-x-auto">
                     <table className="w-full text-center text-sm min-w-[500px]">
                        <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-[10px] sm:text-xs">
                           <tr>
                              <th className="py-4 px-2 border-b border-gray-200">Until 31.03</th>
                              <th className="py-4 px-2 border-b border-gray-200 border-l">Until 31.05</th>
                              <th className="py-4 px-2 border-b border-gray-200 border-l">Until 29.07</th>
                              <th className="py-4 px-2 border-b border-gray-200 border-l">On spot</th>
                              <th className="py-4 px-2 border-b border-gray-200 border-l">Performers Pass</th>
                           </tr>
                        </thead>
                        <tbody className="text-slate-900 font-bold text-lg sm:text-xl">
                           <tr>
                              <td className="py-5 px-2 border-r border-gray-100">{pricingTable['Full Pass'][0] + 5} €</td>
                              <td className="py-5 px-2 border-r border-gray-100">{pricingTable['Full Pass'][1] + 5} €</td>
                              <td className="py-5 px-2 border-r border-gray-100">{pricingTable['Full Pass'][2] + 5} €</td>
                              <td className="py-5 px-2 border-r border-gray-100">150 €</td>
                              <td className="py-5 px-2 border-r border-gray-100">90 €</td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Policies Box */}
               <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm flex flex-col justify-center">
                  <h3 className="font-bebas tracking-wide text-2xl text-slate-900 uppercase leading-none mb-6">{t('policyTitle')}</h3>
                  <ul className="space-y-3 text-sm font-medium text-slate-500">
                     <li className="flex items-start gap-3">
                        <CalendarClock size={18} className="text-emerald-500 shrink-0" />
                        <span className="leading-snug">{t('transferFree')}</span>
                     </li>
                     <li className="flex items-start gap-3">
                        <CalendarClock size={18} className="text-amber-500 shrink-0" />
                        <span className="leading-snug">{t('transferFee')}</span>
                     </li>
                     <li className="flex items-start gap-3">
                        <CalendarClock size={18} className="text-red-500 shrink-0" />
                        <span className="leading-snug">{t('transferClosed')}</span>
                     </li>
                  </ul>
               </div>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 w-full relative z-20">
               <div className="w-full md:w-[400px]">
                  <TabNavigation
                     tabs={dashboardTabs}
                     activeTab={activeTab}
                     setActiveTab={setActiveTab}
                  />
               </div>
            </div>

            {/* TAB RENDERING */}
            {activeTab === "draft" && <DraftTab groupRows={groupRows} saveRoster={saveRoster} submitGroupToCart={activateDrafts} submitting={submitting} />}
            {activeTab === "history" && <HistoryTab onEmailSaved={(id, email) => setPaidTickets(previous => previous.map(ticket => ticket.id === id ? { ...ticket, guestEmail: email } : ticket))} paidTickets={paidTickets} setFullScreenTicket={setFullScreenTicket} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}
            
         </div>
      </main>
   );
}