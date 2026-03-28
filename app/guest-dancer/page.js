"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { usePopup } from "@/components/PopupProvider";
import Button from "@/components/Button";
import TicketModal from "@/components/TicketModal";
import TabNavigation from "@/components/TabNavigation"; 
import { Loader2, Info, X, ChevronLeft, ChevronRight, Download, Send, UserPlus, History, Mail } from "lucide-react";
import { toPng } from 'html-to-image';
import jsPDF from "jspdf";

// Modular Tabs
import DraftTab from "@/components/ambassador/DraftTab";
import HistoryTab from "@/components/ambassador/HistoryTab";

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
const getPassStyle = (type) => `${getPassBgColor(type)} ${getPassTextColor(type)} border-transparent`;
const getPrice = (type) => {
   const t = (type || '').toLowerCase();
   if (t.includes('full')) return 150;
   if (t.includes('party')) return 80;
   if (t.includes('day')) return 60;
   return 0;
};
const formatDate = (isoString) => {
   if (!isoString) return { date: "Valid", time: "Pass" };
   const d = new Date(isoString);
   if (isNaN(d)) return { date: "Valid", time: "Pass" };
   return { date: d.toLocaleDateString('en-GB'), time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) };
};

export default function AmbassadorDashboard() {
   const [activeTab, setActiveTab] = useState("draft");
   const [loading, setLoading] = useState(true);
   const [userData, setUserData] = useState(null);

   const [groupRows, setGroupRows] = useState([]);
   const [paidTickets, setPaidTickets] = useState([]);
   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

   const [showInfoModal, setShowInfoModal] = useState(false);
   const [fullScreenTicket, setFullScreenTicket] = useState(null);
   const [recipientEmail, setRecipientEmail] = useState("");
   const [sendingEmail, setSendingEmail] = useState(false);

   const router = useRouter();
   const { showPopup } = usePopup();

   // --- TAB DEFINITION ---
   const dashboardTabs = [
     { id: "draft", label: "Draft Roster", icon: UserPlus },
     { id: "history", label: "Paid History", icon: History }
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
         const currentIndex = paidTickets.findIndex(t => t.id === fullScreenTicket.id);
         if (e.key === "ArrowRight" && currentIndex < paidTickets.length - 1) setFullScreenTicket(paidTickets[currentIndex + 1]);
         else if (e.key === "ArrowLeft" && currentIndex > 0) setFullScreenTicket(paidTickets[currentIndex - 1]);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
   }, [fullScreenTicket, paidTickets]);

   const handleNextTicket = () => {
      const currentIndex = paidTickets.findIndex(t => t.id === fullScreenTicket.id);
      if (currentIndex < paidTickets.length - 1) setFullScreenTicket(paidTickets[currentIndex + 1]);
   };
   const handlePrevTicket = () => {
      const currentIndex = paidTickets.findIndex(t => t.id === fullScreenTicket.id);
      if (currentIndex > 0) setFullScreenTicket(paidTickets[currentIndex - 1]);
   };

   // Keep saveRoster entirely local, don't write to Firestore
   const saveRoster = (newRows) => {
      setGroupRows(newRows);
   };

   const submitGroupToCart = async () => {
      if (groupRows.filter(r => !r.name.trim()).length > 0) {
         showPopup({ type: "error", title: "Missing Names", message: "Please fill in all names or delete empty rows.", confirmText: "Fix It" });
         return;
      }
      const nameRegex = /^[\p{L}\s\-']+$/u;
      for (let i = 0; i < groupRows.length; i++) {
         const row = groupRows[i];
         if (row.name.trim().length < 2 || !nameRegex.test(row.name.trim())) {
            showPopup({ type: "error", title: "Invalid Name", message: `Row ${i + 1} contains an invalid name.`, confirmText: "Fix It" });
            return;
         }
      }
      setLoading(true);
      try {
         for (const person of groupRows) {
            await addDoc(collection(db, "tickets"), {
               userId: auth.currentUser.uid, userName: person.name.trim().toUpperCase(), passType: person.type, price: getPrice(person.type),
               status: "pending", festivalYear: 2026, purchaseDate: new Date().toISOString(), emailSentCount: 0,
               ticketID: "GRP" + Math.random().toString(36).substring(2, 7).toUpperCase()
            });
         }
         // Reset the local state back to one empty row after successful add to cart
         saveRoster([{ id: Date.now(), name: "", type: "Full Pass" }]);
         showPopup({ type: "success", title: "Sent to Cart!", message: "Your drafted group has been moved to your cart.", confirmText: "Go to Cart", onConfirm: () => router.push("/cart") });
      } catch (e) {
         showPopup({ type: "error", title: "Error", message: e.message, confirmText: "Close" });
      } finally { setLoading(false); }
   };

   const handleDownloadPDF = async () => {
      const element = document.getElementById("ticket-to-download");
      const controls = document.getElementById("ticket-controls");
      const dlIcon = document.getElementById("download-icon-btn");
      if (!element) return;
      if (controls) controls.style.display = 'none';
      if (dlIcon) dlIcon.style.display = 'none';
      try {
         const { width, height } = element.getBoundingClientRect();
         const dataUrl = await toPng(element, { quality: 1, pixelRatio: 3, backgroundColor: "#ffffff", skipFonts: true, style: { boxShadow: "none" } });
         const pdf = new jsPDF({ orientation: "l", unit: "px", format: [width, height] });
         pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
         pdf.save(`SalsaFest_Ticket_${fullScreenTicket.userName.replace(/\s+/g, '_')}.pdf`);
      } catch (err) { showPopup({ type: "error", title: "Export Error", message: err.message, confirmText: "Close" }); }
      finally { if (controls) controls.style.display = ''; if (dlIcon) dlIcon.style.display = ''; }
   };

   const handleSendTicketEmail = async () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!recipientEmail || !emailRegex.test(recipientEmail)) { showPopup({ type: "error", title: "Invalid Email", message: "Please enter a valid email address.", confirmText: "Try Again" }); return; }
      setSendingEmail(true);
      const element = document.getElementById("ticket-to-download");
      const controls = document.getElementById("ticket-controls");
      const dlIcon = document.getElementById("download-icon-btn");
      if (controls) controls.style.display = 'none';
      if (dlIcon) dlIcon.style.display = 'none';
      let pdfBase64 = "";
      try {
         const { width, height } = element.getBoundingClientRect();
         const dataUrl = await toPng(element, { quality: 0.9, pixelRatio: 2, backgroundColor: "#ffffff", skipFonts: true, style: { boxShadow: "none" } });
         const pdf = new jsPDF({ orientation: "l", unit: "px", format: [width, height] });
         pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
         pdfBase64 = pdf.output('datauristring');
      } catch (err) {
         showPopup({ type: "error", title: "PDF Error", message: "Failed to generate ticket attachment.", confirmText: "Close" });
         setSendingEmail(false);
         if (controls) controls.style.display = ''; if (dlIcon) dlIcon.style.display = ''; return;
      }
      if (controls) controls.style.display = ''; if (dlIcon) dlIcon.style.display = '';
      fetch("/api/send-ticket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: recipientEmail, ticket: fullScreenTicket, pdfAttachment: pdfBase64 }) }).catch(console.error);
      updateDoc(doc(db, "tickets", fullScreenTicket.id), { emailSentCount: (fullScreenTicket.emailSentCount || 0) + 1 }).catch(console.error);
      setFullScreenTicket(prev => ({ ...prev, emailSentCount: (prev.emailSentCount || 0) + 1 }));
      showPopup({ type: "success", title: "Sent!", message: `The ticket to ${recipientEmail} has been queued.`, confirmText: "Done" });
      setRecipientEmail(""); setSendingEmail(false);
   };

   const getTicketNameSize = (name) => {
      if (!name) return "text-3xl md:text-4xl";
      if (name.length > 25) return "text-xl md:text-2xl";
      if (name.length > 15) return "text-2xl md:text-3xl";
      return "text-3xl md:text-4xl";
   };

   if (loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>;
   const currentTicketIndex = fullScreenTicket ? paidTickets.findIndex(t => t.id === fullScreenTicket.id) : -1;

   return (
      <main className="min-h-screen flex flex-col bg-salsa-white font-montserrat select-none">
         <Navbar />

         {/* --- INFO MODAL --- */}
         {showInfoModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowInfoModal(false)}></div>
               <div className="relative bg-white w-full max-w-lg rounded-[2rem] p-8 md:p-10 shadow-2xl animate-in zoom-in-95 duration-200">
                  <h2 className="font-bebas text-4xl text-slate-900 uppercase mb-2">How to use your Dashboard</h2>
                  <p className="text-sm text-slate-500 font-medium mb-6">Welcome to the Ambassador Portal! Here is a quick guide to managing your attendees.</p>
                  <div className="space-y-4 mb-8">
                     <div className="flex gap-4 items-start"><div className="w-8 h-8 rounded-full bg-salsa-mint/10 text-salsa-mint flex items-center justify-center font-black shrink-0">1</div><div><span className="font-bold text-slate-900 block text-sm font-montserrat">Draft Your Roster</span><span className="text-xs text-slate-500 font-montserrat">Add rows, input legal names, and select pass types. Changes save automatically.</span></div></div>
                     <div className="flex gap-4 items-start"><div className="w-8 h-8 rounded-full bg-salsa-mint/10 text-salsa-mint flex items-center justify-center font-black shrink-0">2</div><div><span className="font-bold text-slate-900 block text-sm font-montserrat">Fast Deletion</span><span className="text-xs text-slate-500 font-montserrat">Click and drag your mouse across the checkboxes to rapidly select multiple rows to delete.</span></div></div>
                     <div className="flex gap-4 items-start"><div className="w-8 h-8 rounded-full bg-salsa-mint/10 text-salsa-mint flex items-center justify-center font-black shrink-0">3</div><div><span className="font-bold text-slate-900 block text-sm font-montserrat">Send to Cart & Pay</span><span className="text-xs text-slate-500 font-montserrat">When your draft is ready, send it to the cart to checkout securely via Stripe.</span></div></div>
                     <div className="flex gap-4 items-start"><div className="w-8 h-8 rounded-full bg-salsa-mint/10 text-salsa-mint flex items-center justify-center font-black shrink-0">4</div><div><span className="font-bold text-slate-900 block text-sm font-montserrat">Send Tickets</span><span className="text-xs text-slate-500 font-montserrat">Go to the "Paid History" tab to open confirmed tickets and email them to your attendees.</span></div></div>
                  </div>
                  <button onClick={() => setShowInfoModal(false)} className="w-full cursor-pointer bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-salsa-pink transition-colors text-xs uppercase tracking-widest font-montserrat">Got it</button>
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
                     <button onClick={() => setShowInfoModal(true)} className="flex items-center gap-1.5 bg-white border border-gray-200 text-slate-500 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 hover:text-slate-900 transition-colors cursor-pointer shadow-sm"><Info size={14} /> Dashboard Guide</button>
                  </div>
                  
                  <h1 className="font-bebas text-6xl md:text-7xl leading-none text-slate-900 uppercase">
                     {userData?.ambassadorDisplayName ? `${userData.ambassadorDisplayName}'s Dashboard` : "Dashboard"}
                  </h1>

               </div>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6 w-full relative z-20">
               
               {/* UPDATED: TAB NAVIGATION COMPONENT */}
               <div className="w-full md:w-[400px]">
                  <TabNavigation 
                     tabs={dashboardTabs} 
                     activeTab={activeTab} 
                     setActiveTab={setActiveTab} 
                  />
               </div>
               
               {/* Note: In your Account page, we put the "selectedYear" state in the History Tab so it renders near the table. The Ambassador History Tab will need the same! */}
               
            </div>

            {/* TAB RENDERING */}
            {activeTab === "draft" && <DraftTab groupRows={groupRows} saveRoster={saveRoster} submitGroupToCart={submitGroupToCart} />}
            {activeTab === "history" && <HistoryTab paidTickets={paidTickets} setFullScreenTicket={setFullScreenTicket} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}

         </div>
      </main>
   );
}