// components/TicketModal.js
"use client";
import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Download, Send, Loader2, Mail } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from 'html-to-image';
import jsPDF from "jspdf";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { usePopup } from "@/components/PopupProvider";

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
const getPassStyle = (type) => `${getPassBgColor(type)} ${getPassTextColor(type)} border-transparent`;

const formatDate = (isoString) => {
  if (!isoString) return { date: "Valid", time: "Pass" };
  const d = new Date(isoString);
  if (isNaN(d)) return { date: "Valid", time: "Pass" };
  return {
    date: d.toLocaleDateString('en-GB'),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  };
};

const getTicketNameSize = (name) => {
  if (!name) return "text-3xl md:text-4xl";
  if (name.length > 25) return "text-xl md:text-2xl";
  if (name.length > 15) return "text-2xl md:text-3xl";
  return "text-3xl md:text-4xl";
};

export default function TicketModal({ ticket, ticketsList, setTicket, onClose }) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const { showPopup } = usePopup();

  const currentIndex = ticketsList.findIndex(t => t.id === ticket.id);

  // KEYBOARD NAVIGATION
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && currentIndex < ticketsList.length - 1) setTicket(ticketsList[currentIndex + 1]);
      if (e.key === "ArrowLeft" && currentIndex > 0) setTicket(ticketsList[currentIndex - 1]);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, ticketsList, setTicket, onClose]);

  const handleNext = () => { if (currentIndex < ticketsList.length - 1) setTicket(ticketsList[currentIndex + 1]); };
  const handlePrev = () => { if (currentIndex > 0) setTicket(ticketsList[currentIndex - 1]); };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("ticket-to-download");
    const dlIcon = document.getElementById("download-icon-btn");
    if (!element) return;
    if (dlIcon) dlIcon.style.display = 'none';
    try {
      const { width, height } = element.getBoundingClientRect();
      const dataUrl = await toPng(element, { quality: 1, pixelRatio: 3, backgroundColor: "#ffffff", skipFonts: true, style: { boxShadow: "none" } });
      const pdf = new jsPDF({ orientation: "l", unit: "px", format: [width, height] });
      pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
      pdf.save(`SalsaFest_Ticket_${ticket.userName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      showPopup({ type: "error", title: "Export Error", message: err.message, confirmText: "Close" });
    } finally {
      if (dlIcon) dlIcon.style.display = '';
    }
  };

  const handleSendEmail = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail)) {
      showPopup({ type: "error", title: "Invalid Email", message: "Please enter a valid email address.", confirmText: "Try Again" });
      return;
    }

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
      if (controls) controls.style.display = '';
      if (dlIcon) dlIcon.style.display = '';
      return;
    }

    if (controls) controls.style.display = '';
    if (dlIcon) dlIcon.style.display = '';

    fetch("/api/send-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: recipientEmail, ticket: ticket, pdfAttachment: pdfBase64 })
    }).catch(console.error);

    updateDoc(doc(db, "tickets", ticket.id), { emailSentCount: (ticket.emailSentCount || 0) + 1 }).catch(console.error);
    setTicket(prev => ({ ...prev, emailSentCount: (prev.emailSentCount || 0) + 1 }));

    showPopup({ type: "success", title: "Sent!", message: `The ticket to ${recipientEmail} has been queued.`, confirmText: "Done" });
    setRecipientEmail("");
    setSendingEmail(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pt-20 overflow-x-hidden overflow-y-auto">
      <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="relative w-fit max-w-[95vw] flex flex-col items-center gap-4 animate-in zoom-in duration-300 mb-10 mt-auto mx-auto">
        
        <button onClick={onClose} className="cursor-pointer fixed top-4 right-4 md:top-8 md:right-8 text-white hover:text-salsa-pink hover:scale-110 hover:rotate-90 transition-all duration-300 bg-white/10 p-3 rounded-full backdrop-blur-md z-[110] shadow-lg"><X size={24} /></button>

        <div className="absolute top-1/2 -translate-y-1/2 -left-12 md:-left-20 hidden md:flex z-50">
          <button onClick={handlePrev} disabled={currentIndex <= 0} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/30 hover:scale-110 transition-all disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"><ChevronLeft size={32} /></button>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 -right-12 md:-right-20 hidden md:flex z-50">
          <button onClick={handleNext} disabled={currentIndex >= ticketsList.length - 1} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/30 hover:scale-110 transition-all disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"><ChevronRight size={32} /></button>
        </div>

        <div id="ticket-to-download" className="w-[320px] md:w-[850px] flex-none bg-white rounded-[2.5rem] flex flex-col md:flex-row shadow-2xl relative overflow-hidden" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <button id="download-icon-btn" onClick={handleDownloadPDF} title="Download PDF" className="absolute top-6 right-6 md:top-8 md:right-8 z-50 p-3 bg-gray-50 hover:bg-salsa-mint hover:-translate-y-1 hover:shadow-lg text-gray-400 hover:text-white rounded-full transition-all duration-300 cursor-pointer shadow-sm border border-gray-100"><Download size={20} /></button>
          
          <div className="p-8 md:p-12 flex items-center justify-center bg-salsa-mint/5 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-gray-200 relative shrink-0">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100"><QRCodeSVG value={ticket.ticketID} size={200} level="H" /></div>
          </div>
          
          <div className="p-8 md:p-10 flex flex-col justify-center flex-1 relative bg-white min-w-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-salsa-mint/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="mb-4 relative z-10">
              <span className={`inline-flex items-center justify-center w-32 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${getPassStyle(ticket.passType)}`}>
                {ticket.passType}
              </span>
            </div>
            <h2 className={`${getTicketNameSize(ticket.userName)} font-black text-slate-900 uppercase leading-[1.1] tracking-tight mb-2 pr-12 whitespace-normal break-words relative z-10 w-full transition-all duration-300`}>{ticket.userName}</h2>
            <p className="font-mono text-gray-500 text-[14px] font-bold tracking-widest uppercase mb-8 relative z-10">ID: {ticket.ticketID}</p>
            
            <div className="grid grid-cols-2 gap-3 mt-auto relative z-10">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Event Access</span><span className="block text-xs font-black text-slate-900 uppercase">Salsa Fest {ticket.festivalYear}</span></div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Price Paid</span><span className="block text-xs font-black text-slate-900 uppercase">€{ticket.price || 0}</span></div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2 flex justify-between items-center">
                <div><span className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Purchase Date</span><span className="block text-xs font-bold text-slate-900">{formatDate(ticket.purchaseDate).date}</span></div>
                <div className="text-right"><span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</span><span className="block text-xs font-bold text-slate-900">{formatDate(ticket.purchaseDate).time}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div id="ticket-controls" className="w-full md:w-[700px] bg-white p-6 rounded-[2rem] shadow-2xl flex flex-col gap-4 mt-2">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat">Email Status:</span>
              <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full font-montserrat ${ticket.emailSentCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {ticket.emailSentCount > 0 ? `Sent ${ticket.emailSentCount} Times` : 'Not Sent'}
              </span>
            </div>
            <span className="text-[11px] font-black text-slate-300 md:hidden">{currentIndex + 1} of {ticketsList.length}</span>
          </div>
          <div className="border-t border-gray-50 pt-4">
            <label className="block text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat mb-2 px-1">Attendee Email</label>
            <div className="relative flex items-center w-full">
              <Mail className="absolute left-4 text-gray-400" size={16} />
              <input type="email" maxLength={50} placeholder="EMAIL" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-bold rounded-xl px-4 py-4 pl-12 pr-28 outline-none focus:bg-white focus:border-slate-900 transition-all text-[11px] uppercase tracking-widest font-montserrat" />
              <button onClick={handleSendEmail} disabled={sendingEmail} className="cursor-pointer absolute right-2 bg-salsa-pink text-white px-5 py-2.5 rounded-lg font-black text-[11px] uppercase hover:bg-pink-600 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-montserrat shadow-sm">
                {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Send</>}
              </button>
            </div>
          </div>
        </div>

        <div className="flex md:hidden justify-between w-full max-w-[320px] px-4 mt-2">
          <button onClick={handlePrev} disabled={currentIndex <= 0} className="flex items-center gap-1 text-[11px] font-black uppercase text-white/70 hover:text-white transition-colors cursor-pointer disabled:opacity-30"><ChevronLeft size={14} /> Prev</button>
          <button onClick={handleNext} disabled={currentIndex >= ticketsList.length - 1} className="flex items-center gap-1 text-[11px] font-black uppercase text-white/70 hover:text-white transition-colors cursor-pointer disabled:opacity-30">Next <ChevronRight size={14} /></button>
        </div>

      </div>
    </div>
  );
}