"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { usePopup } from "@/components/PopupProvider";
import Button from "@/components/Button";
import { Loader2, Info, X, ChevronLeft, ChevronRight, Download, Send, UserPlus, History, Mail } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
               <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setFullScreenTicket(null)}></div>
               <div className="relative w-fit max-w-[95vw] flex flex-col items-center gap-4 animate-in zoom-in duration-300 my-10 mx-auto">
                  <button onClick={() => setFullScreenTicket(null)} className="cursor-pointer absolute -top-12 right-0 md:-right-4 text-white hover:text-salsa-pink hover:scale-110 hover:rotate-90 transition-all duration-300 bg-white/10 p-2 rounded-full backdrop-blur-md z-50"><X size={24} /></button>
                  <div className="absolute top-1/2 -translate-y-1/2 -left-12 md:-left-20 hidden md:flex z-50">
                     <button onClick={handlePrevTicket} disabled={currentTicketIndex <= 0} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/30 hover:scale-110 transition-all disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"><ChevronLeft size={32} /></button>
                  </div>
                  <div className="absolute top-1/2 -translate-y-1/2 -right-12 md:-right-20 hidden md:flex z-50">
                     <button onClick={handleNextTicket} disabled={currentTicketIndex >= paidTickets.length - 1} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/30 hover:scale-110 transition-all disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"><ChevronRight size={32} /></button>
                  </div>

                  <div id="ticket-to-download" className="w-[320px] md:w-[850px] flex-none bg-white rounded-[2.5rem] flex flex-col md:flex-row shadow-2xl relative overflow-hidden" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                     <button id="download-icon-btn" onClick={handleDownloadPDF} title="Download PDF" className="absolute top-6 right-6 md:top-8 md:right-8 z-50 p-3 bg-gray-50 hover:bg-salsa-mint hover:-translate-y-1 hover:shadow-lg text-gray-400 hover:text-white rounded-full transition-all duration-300 cursor-pointer shadow-sm border border-gray-100">
                        <Download size={20} />
                     </button>
                     <div className="p-8 md:p-12 flex items-center justify-center bg-salsa-mint/5 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-gray-200 relative shrink-0">
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100"><QRCodeSVG value={fullScreenTicket.ticketID} size={200} level="H" /></div>
                     </div>
                     <div className="p-8 md:p-10 flex flex-col justify-center flex-1 relative bg-white min-w-0">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-salsa-mint/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div className="mb-4 relative z-10">
                           {/* UPDATED: PILL IS NOW FIXED-WIDTH TO MATCH TABLES */}
                           <span className={`inline-flex items-center justify-center w-32 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${getPassStyle(fullScreenTicket.passType)}`}>
                              {fullScreenTicket.passType}
                           </span>
                        </div>
                        <h2 className={`${getTicketNameSize(fullScreenTicket.userName)} font-black text-slate-900 uppercase leading-[1.1] tracking-tight mb-2 pr-12 whitespace-normal break-words relative z-10 w-full transition-all duration-300`}>{fullScreenTicket.userName}</h2>
                        
                        {/* UPDATED: ID IS LARGER */}
                        <p className="font-mono text-gray-500 text-sm font-bold tracking-widest uppercase mb-8 relative z-10">ID: {fullScreenTicket.ticketID}</p>
                        
                        <div className="grid grid-cols-2 gap-3 mt-auto relative z-10">
                           <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Event Access</span>
                              {/* UPDATED: EVENT NAME LARGER */}
                              <span className="block text-sm font-black text-slate-900 uppercase">Salsa Fest {fullScreenTicket.festivalYear}</span>
                           </div>
                           <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Price Paid</span>
                              {/* UPDATED: PRICE LARGER */}
                              <span className="block text-sm font-black text-slate-900 uppercase">€{fullScreenTicket.price}</span>
                           </div>
                           <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2 flex justify-between items-center">
                              <div>
                                 <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Purchase Date</span>
                                 {/* UPDATED: DATE LARGER */}
                                 <span className="block text-sm font-bold text-slate-900">{formatDate(fullScreenTicket.purchaseDate).date}</span>
                              </div>
                              <div className="text-right">
                                 <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</span>
                                 {/* UPDATED: TIME LARGER */}
                                 <span className="block text-sm font-bold text-slate-900">{formatDate(fullScreenTicket.purchaseDate).time}</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div id="ticket-controls" className="w-full md:w-[700px] bg-white p-6 rounded-[2rem] shadow-2xl flex flex-col gap-4 mt-2">
                     <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
                        <div className="flex items-center gap-2"><span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat">Email Status:</span><span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full font-montserrat ${fullScreenTicket.emailSentCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{fullScreenTicket.emailSentCount > 0 ? `Sent ${fullScreenTicket.emailSentCount} Times` : 'Not Sent'}</span></div>
                        <span className="text-[11px] font-black text-slate-300 md:hidden">{currentTicketIndex + 1} of {paidTickets.length}</span>
                     </div>
                     <div className="border-t border-gray-50 pt-4">
                        <label className="block text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat mb-2 px-1">Attendee Email</label>
                        <div className="relative flex items-center w-full">
                           <Mail className="absolute left-4 text-gray-400" size={16} />
                           <input type="email" maxLength={50} placeholder="EMAIL" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-bold rounded-xl px-4 py-4 pl-12 pr-28 outline-none focus:bg-white focus:border-slate-900 transition-all text-[11px] uppercase tracking-widest font-montserrat" />
                           <button onClick={handleSendTicketEmail} disabled={sendingEmail} className="cursor-pointer absolute right-2 bg-salsa-pink text-white px-5 py-2.5 rounded-lg font-black text-[11px] uppercase hover:bg-pink-600 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2 font-montserrat shadow-sm">{sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Send</>}</button>
                        </div>
                     </div>
                     <div className="flex md:hidden justify-between pt-3 border-t border-gray-100 mt-2">
                        <button onClick={handlePrevTicket} disabled={currentTicketIndex <= 0} className="flex items-center gap-1 text-[11px] font-black uppercase text-slate-500 disabled:opacity-30"><ChevronLeft size={14} /> Prev</button>
                        <button onClick={handleNextTicket} disabled={currentTicketIndex >= paidTickets.length - 1} className="flex items-center gap-1 text-[11px] font-black uppercase text-slate-500 disabled:opacity-30">Next <ChevronRight size={14} /></button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* --- MAIN DASHBOARD UI --- */}
         <div className="flex-grow max-w-7xl mx-auto px-4 md:px-6 w-full pt-32 pb-40">
            
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-30">
               <div>
                  <div className="flex items-center gap-2 mb-2">
                     <button onClick={() => setShowInfoModal(true)} className="flex items-center gap-1.5 bg-white border border-gray-200 text-slate-500 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 hover:text-slate-900 transition-colors cursor-pointer shadow-sm"><Info size={14} /> Dashboard Guide</button>
                  </div>
                  
                  {/* UPDATED: DYNAMIC HEADER TEXT */}
                  <h1 className="font-bebas text-6xl md:text-7xl leading-none text-slate-900 uppercase">
                     {userData?.ambassadorDisplayName ? `${userData.ambassadorDisplayName}'s Dashboard` : "Dashboard"}
                  </h1>

               </div>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6 w-full relative z-20">
               
               {/* EXACT 1-TO-1 THICK ADMIN GRID NAVIGATOR */}
               <div className="bg-slate-50 border border-gray-100 p-1.5 rounded-2xl w-full lg:w-[380px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] grid grid-cols-2 relative gap-1 lg:gap-0">
                  <div
                     className="hidden lg:block absolute top-1.5 bottom-1.5 bg-slate-900 rounded-xl transition-all duration-300 ease-out shadow-sm"
                     style={{ width: 'calc((100% - 0.75rem) / 2)', left: activeTab === 'draft' ? '0.375rem' : 'calc(0.375rem + (100% - 0.75rem) / 2)' }}
                  />
                  <Button variant="ghost" size="sliderTab" icon={UserPlus} onClick={() => setActiveTab("draft")} className={`relative z-10 ${activeTab === 'draft' ? '!text-white bg-slate-900 lg:bg-transparent shadow-sm lg:shadow-none' : '!text-slate-400 hover:!text-slate-900 lg:hover:bg-transparent transition-colors'}`}>Draft Roster</Button>
                  <Button variant="ghost" size="sliderTab" icon={History} onClick={() => setActiveTab("history")} className={`relative z-10 ${activeTab === 'history' ? '!text-white bg-slate-900 lg:bg-transparent shadow-sm lg:shadow-none' : '!text-slate-400 hover:!text-slate-900 lg:hover:bg-transparent transition-colors'}`}>Paid History</Button>
               </div>
               
               {/* Only show Year on History tab, aligned identically to the admin panel action buttons */}
               {activeTab === 'history' && (
                  <div className="hidden lg:flex items-center gap-3 w-full lg:w-auto animate-in fade-in duration-300">
                     <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest mr-2">Festival Year</span>
                     <span className="font-bebas text-4xl text-slate-900 leading-none pt-1">{selectedYear}</span>
                  </div>
               )}
            </div>

            {/* TAB RENDERING */}
            {activeTab === "draft" && <DraftTab groupRows={groupRows} saveRoster={saveRoster} submitGroupToCart={submitGroupToCart} />}
            {activeTab === "history" && <HistoryTab paidTickets={paidTickets} setFullScreenTicket={setFullScreenTicket} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}

         </div>
      </main>
   );
}