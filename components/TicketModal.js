"use client";
import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Download, Send, Mail, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
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
  return { date: d.toLocaleDateString('en-GB'), time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) };
};

const getTicketNameSize = (name) => {
  if (!name) return "text-2xl md:text-4xl";
  if (name.length > 25) return "text-lg md:text-2xl";
  if (name.length > 15) return "text-xl md:text-3xl";
  return "text-2xl md:text-4xl";
};

// --- REUSABLE TICKET VIEW ---
function TicketView({ ticket, index, totalTickets, onUpdateDesktopTicket }) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [addingToWallet, setAddingToWallet] = useState(false);
  const { showPopup } = usePopup();

  const captureTicketImage = async () => {
    const isDesktop = window.innerWidth >= 768;
    const targetId = isDesktop ? `phantom-ticket-${ticket.id}` : `ticket-card-${ticket.id}`;
    const element = document.getElementById(targetId);
    
    if (!element) return null;

    try {
      return await toPng(element, { 
        quality: 1, 
        pixelRatio: 2, 
        backgroundColor: "#ffffff", 
        skipFonts: true,
        fontEmbedCSS: '',
        filter: (node) => !node.classList?.contains('export-ignore'),
        style: { boxShadow: "none", margin: "0", padding: "0" } 
      });
    } catch (e) {
      console.error("Capture error:", e);
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const dataUrl = await captureTicketImage();
      if (!dataUrl) throw new Error("Capture failed");

      const pdfW = 340;
      const pdfH = 600;
      const pdf = new jsPDF({ orientation: "p", unit: "px", format: [pdfW, pdfH] });
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`SalsaFest_Ticket_${ticket.userName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) { 
      showPopup({ type: "error", title: "Export Error", message: "Download failed. Please try again.", confirmText: "Close" }); 
    }
  };

  const handleAddToWallet = async () => {
    setAddingToWallet(true);
    try {
      const res = await fetch("/api/google-wallet", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket })
      });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank"); 
      else throw new Error(data.error || "No URL returned");
    } catch (err) {
      showPopup({ type: "error", title: "Wallet Error", message: "Could not generate Google Wallet pass at this time.", confirmText: "Close" });
    } finally {
      setAddingToWallet(false);
    }
  };

  const handleSendTicketEmail = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail)) { 
      showPopup({ type: "error", title: "Invalid Email", message: "Please enter a valid email address.", confirmText: "Try Again" }); 
      return; 
    }
    
    setSendingEmail(true);
    try {
      const dataUrl = await captureTicketImage();
      const pdfW = 340;
      const pdfH = 600;
      const pdf = new jsPDF({ orientation: "p", unit: "px", format: [pdfW, pdfH] });
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfW, pdfH);
      const pdfBase64 = pdf.output('datauristring');

      await fetch("/api/send-ticket", { 
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: recipientEmail, ticket, pdfAttachment: pdfBase64 }) 
      });
      
      updateDoc(doc(db, "tickets", ticket.id), { emailSentCount: (ticket.emailSentCount || 0) + 1 }).catch(console.error);
      if (onUpdateDesktopTicket) {
        onUpdateDesktopTicket(prev => ({ ...prev, emailSentCount: (prev.emailSentCount || 0) + 1 }));
      }
      
      showPopup({ type: "success", title: "Sent!", message: `The ticket to ${recipientEmail} has been queued.`, confirmText: "Done" });
      setRecipientEmail(""); 
    } catch (err) {
      showPopup({ type: "error", title: "PDF Error", message: "Failed to generate attachment.", confirmText: "Close" });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <>
      {/* 1. PHANTOM (Desktop Export) */}
      <div className="hidden md:block fixed top-0 left-0 opacity-0 pointer-events-none z-[-1]">
        <div id={`phantom-ticket-${ticket.id}`} className="w-[340px] h-[600px] bg-white flex flex-col overflow-hidden" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="p-8 flex items-center justify-center bg-gray-50 border-b-2 border-dashed border-gray-200">
                <div className="w-52 aspect-square bg-white p-4 rounded-3xl border border-gray-100 flex items-center justify-center">
                    <QRCodeSVG value={ticket.ticketID} size={256} style={{ width: "100%", height: "100%" }} level="H" />
                </div>
            </div>
            <div className="p-8 flex flex-col flex-1 bg-white">
                <div className="mb-4">
                    <span className={`inline-flex items-center justify-center px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest ${getPassStyle(ticket.passType)}`}>
                        {ticket.passType}
                    </span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 uppercase leading-tight mb-2 break-words">{ticket.userName}</h2>
                <p className="font-mono text-gray-500 text-sm font-bold tracking-widest uppercase mb-8">ID: {ticket.ticketID}</p>
                <div className="grid grid-cols-2 gap-3 mt-auto">
                    <div className="bg-gray-50 p-3 rounded-xl">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Event</span>
                        <span className="block text-xs font-black text-slate-900 uppercase">SSF {ticket.festivalYear}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</span>
                        <span className="block text-xs font-black text-slate-900 uppercase">€{ticket.price}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* 2. VISIBLE UI */}
      <div className="flex flex-col gap-4 w-full" onClick={(e) => e.stopPropagation()}>
        <div id={`ticket-card-${ticket.id}`} className="w-full max-w-[340px] md:max-w-none md:w-[850px] mx-auto bg-white rounded-[2rem] md:rounded-[2.5rem] flex flex-col md:flex-row shadow-2xl relative overflow-hidden shrink-0" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          
          <button onClick={handleDownloadPDF} title="Download PDF" className="export-ignore absolute top-4 right-4 md:top-8 md:right-8 z-50 p-3 bg-gray-50 hover:bg-salsa-pink hover:text-white rounded-full transition-all duration-300 cursor-pointer shadow-sm border border-gray-100">
            <Download size={20} />
          </button>
          
          <div className="p-6 md:p-12 flex items-center justify-center bg-salsa-mint/5 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-gray-200 relative shrink-0">
            <div className="w-48 sm:w-52 md:w-60 aspect-square bg-white p-3 md:p-4 rounded-[1.5rem] shadow-sm border border-gray-100 flex items-center justify-center">
              <QRCodeSVG value={ticket.ticketID} size={256} style={{ width: "100%", height: "100%" }} level="H" />
            </div>
          </div>
          
          <div className="p-6 md:p-10 flex flex-col justify-center flex-1 relative bg-white w-full">
            <div className="mb-4 relative z-10">
              <span className={`inline-flex items-center justify-center px-6 py-2 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest shadow-sm ${getPassStyle(ticket.passType)}`}>
                {ticket.passType}
              </span>
            </div>
            <h2 className={`${getTicketNameSize(ticket.userName)} font-black text-slate-900 uppercase leading-[1.1] tracking-tight mb-2 pr-10 break-words relative z-10 w-full transition-all duration-300`}>
              {ticket.userName}
            </h2>
            <p className="font-mono text-gray-500 text-xs md:text-sm font-bold tracking-widest uppercase mb-6 md:mb-8 relative z-10">ID: {ticket.ticketID}</p>
            <div className="grid grid-cols-2 gap-2 md:gap-3 mt-auto relative z-10">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="block text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Event</span>
                <span className="block text-xs md:text-sm font-black text-slate-900 uppercase truncate">
                  <span className="md:hidden">SSF</span>
                  <span className="hidden md:inline">Salsa Fest</span> {ticket.festivalYear}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="block text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</span>
                <span className="block text-xs md:text-sm font-black text-slate-900 uppercase">€{ticket.price}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2 flex justify-between items-center">
                <div>
                  <span className="block text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</span>
                  <span className="block text-xs md:text-sm font-bold text-slate-900">{formatDate(ticket.purchaseDate).date}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</span>
                  <span className="block text-xs md:text-sm font-bold text-slate-900">{formatDate(ticket.purchaseDate).time}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="w-full max-w-[340px] md:max-w-[700px] mx-auto bg-white p-5 md:p-6 rounded-[2rem] shadow-2xl flex flex-col gap-4">
          <button onClick={handleAddToWallet} disabled={addingToWallet} className="flex md:hidden w-full bg-black text-white font-black px-4 py-3.5 rounded-xl shadow-md hover:bg-slate-800 transition-all uppercase tracking-widest text-[10px] items-center justify-center gap-2 disabled:opacity-50">
            {addingToWallet ? <Loader2 size={14} className="animate-spin" /> : (
              <svg viewBox="0 0 48 48" width="16" height="16"><path fill="#fff" d="M37 13H11c-2.2 0-4 1.8-4 4v14c0 2.2 1.8 4 4 4h26c2.2 0 4-1.8 4-4V17c0-2.2-1.8-4-4-4zm-4 15c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/></svg>
            )}
            Save to Google Wallet
          </button>
          <div className="flex justify-between items-center gap-3 px-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] md:text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat">Email Status:</span>
              <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full font-montserrat ${ticket.emailSentCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {ticket.emailSentCount > 0 ? `Sent ${ticket.emailSentCount}` : 'Not Sent'}
              </span>
            </div>
            <span className="hidden md:block text-[11px] font-black text-slate-300 font-montserrat">{index + 1} of {totalTickets}</span>
          </div>
          <div className="border-t border-gray-50 pt-4">
            <label className="block text-[10px] md:text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-2 px-1 font-montserrat">Attendee Email</label>
            <div className="relative flex items-center w-full">
              <Mail className="absolute left-3 md:left-4 text-gray-400" size={16} />
              <input type="email" maxLength={50} placeholder="EMAIL" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-bold rounded-xl px-4 py-3 pl-10 md:pl-12 pr-24 outline-none focus:bg-white focus:border-slate-900 transition-all text-[11px] uppercase tracking-widest font-montserrat" />
              <button onClick={handleSendTicketEmail} disabled={sendingEmail} className="cursor-pointer absolute right-1.5 md:right-2 bg-salsa-pink text-white px-4 py-2 md:py-2.5 rounded-lg font-black text-[10px] md:text-[11px] uppercase hover:bg-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm font-montserrat">
                {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <><Send size={12} /> Send</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// --- MAIN WRAPPER ---
export default function TicketModal({ ticket: activeTicket, ticketsList, setTicket, onClose }) {
  const currentIndex = ticketsList.findIndex(t => t.id === activeTicket.id);

  // BODY SCROLL LOCK Logic
  useEffect(() => {
    const originalOverflow = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow || 'unset';
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" && currentIndex < ticketsList.length - 1) setTicket(ticketsList[currentIndex + 1]);
      else if (e.key === "ArrowLeft" && currentIndex > 0) setTicket(ticketsList[currentIndex - 1]);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, ticketsList, setTicket, onClose]);

  useEffect(() => {
    const el = document.getElementById(`mobile-slide-${activeTicket.id}`);
    if (el) el.scrollIntoView({ behavior: 'instant', inline: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex font-montserrat items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300 cursor-pointer" onClick={onClose} />
      
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />

      {/* ======================= */}
      {/* DESKTOP VIEW */}
      {/* ======================= */}
      <div className="hidden md:flex relative flex-col items-center justify-center p-8 z-[105]" onClick={onClose}>
        
        {/* CLOSE BUTTON - MOVED ABOVE TICKET */}
        <div className="w-full flex justify-end mb-4 pr-16">
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="cursor-pointer text-white hover:text-salsa-pink hover:scale-110 hover:rotate-90 transition-all duration-300 bg-white/10 p-2 rounded-full backdrop-blur-md">
                <X size={24} />
            </button>
        </div>

        <div className="flex items-center gap-6">
            <button 
              onClick={(e) => { e.stopPropagation(); setTicket(ticketsList[currentIndex - 1]); }} 
              disabled={currentIndex <= 0} 
              className="p-4 bg-white/10 rounded-full text-white hover:bg-white/30 hover:scale-110 transition-all disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer backdrop-blur-md shrink-0"
            >
              <ChevronLeft size={32} />
            </button>
            
            <TicketView ticket={activeTicket} index={currentIndex} totalTickets={ticketsList.length} onUpdateDesktopTicket={setTicket} />

            <button 
              onClick={(e) => { e.stopPropagation(); setTicket(ticketsList[currentIndex + 1]); }} 
              disabled={currentIndex >= ticketsList.length - 1} 
              className="p-4 bg-white/10 rounded-full text-white hover:bg-white/30 hover:scale-110 transition-all disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer backdrop-blur-md shrink-0"
            >
              <ChevronRight size={32} />
            </button>
        </div>
      </div>

      {/* ======================= */}
      {/* MOBILE VIEW */}
      {/* ======================= */}
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="md:hidden fixed top-4 right-4 text-white hover:text-salsa-pink transition-all bg-white/10 p-2 rounded-full backdrop-blur-md z-[120]">
          <X size={24} />
      </button>

      <div className="flex md:hidden absolute inset-0 overflow-x-auto overflow-y-auto snap-x snap-mandatory hide-scrollbar z-[105] pt-16 pb-6" onClick={onClose}>
        {ticketsList.map((t, i) => (
          <div id={`mobile-slide-${t.id}`} key={t.id} className="min-w-full px-4 snap-center snap-always flex flex-col items-center justify-start min-h-max pb-12 pt-4">
            
            {ticketsList.length > 1 && (
              <div className="flex items-center gap-2 mb-4 text-white/70 animate-pulse">
                <ChevronLeft size={16} />
                <span className="text-[10px] uppercase tracking-widest font-bold">Swipe to view more</span>
                <ChevronRight size={16} />
              </div>
            )}
            
            <TicketView ticket={t} index={i} totalTickets={ticketsList.length} />
          </div>
        ))}
      </div>
    </div>
  );
}