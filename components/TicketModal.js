"use client";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase"; 
import { usePopup } from "@/components/PopupProvider"; 
import { Send, Mail, Loader2, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from 'next-intl';

// Utility functions for ticket styling
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

// Formats ISO date strings into readable UI text
const formatDate = (isoString) => {
  if (!isoString) return { date: "Valid", time: "Pass" };
  const d = new Date(isoString);
  if (isNaN(d)) return { date: "Valid", time: "Pass" };
  return { date: d.toLocaleDateString('en-GB'), time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) };
};

// Dynamically scales the font size based on the character length of the user's name
const getTicketNameSize = (name) => {
  if (!name) return "text-2xl md:text-4xl";
  if (name.length > 25) return "text-lg md:text-2xl";
  if (name.length > 15) return "text-xl md:text-3xl";
  return "text-2xl md:text-4xl";
};

// Reusable component that renders individual ticket data and actions
function TicketView({ ticket, index, totalTickets, onUpdateDesktopTicket, isMobile, t }) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [addingToWallet, setAddingToWallet] = useState(false);
  const { showPopup } = usePopup();

  const translatePassDisplay = (type) => {
      const typeLower = (type || '').toLowerCase();
      if (typeLower.includes('full')) return t('passFull');
      if (typeLower.includes('party')) return t('passParty');
      if (typeLower.includes('day')) return t('passDay');
      if (typeLower.includes('free')) return t('passFree');
      return type;
  };

  // Captures the DOM element using html-to-image with dynamic compression
  const captureTicketImage = async (forEmail = false) => {
    const { toPng, toJpeg } = await import('html-to-image');

    const targetId = `phantom-ticket-${ticket.id}`;
    const element = document.getElementById(targetId);
    
    if (!element) return null;
    
    try {
      if (forEmail) {
        // VERCEL FIX: Heavily compress to JPEG for email payloads to bypass the 4.5MB limit
        return await toJpeg(element, { 
          quality: 0.7, 
          pixelRatio: 1.5, 
          backgroundColor: "#ffffff", 
          skipFonts: true,
          fontEmbedCSS: '',
          filter: (node) => !node.classList?.contains('export-ignore'),
          style: { boxShadow: "none", margin: "0", padding: "0" } 
        });
      } else {
        // MAXIMUM QUALITY: Uncompressed PNG for direct device downloads
        return await toPng(element, { 
          quality: 1, 
          pixelRatio: 3, 
          backgroundColor: "#ffffff", 
          skipFonts: true,
          fontEmbedCSS: '',
          filter: (node) => !node.classList?.contains('export-ignore'),
          style: { boxShadow: "none", margin: "0", padding: "0" } 
        });
      }
    } catch (e) {
      console.error("Capture error:", e);
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const dataUrl = await captureTicketImage(false); // False = Max Quality
      if (!dataUrl) throw new Error(t('errCapture'));

      const { default: jsPDF } = await import('jspdf');

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const pdfW = 360;
      const pdfH = (img.height * pdfW) / img.width;

      const pdf = new jsPDF({ orientation: "p", unit: "px", format: [pdfW, pdfH] });
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`SalsaFest_Pass_${ticket.userName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) { 
      showPopup({ type: "error", title: t('errExportTitle'), message: t('errExportMsg'), confirmText: t('btnClose') });
    }
  };

  const handleAddToWallet = async () => {
    setAddingToWallet(true);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const res = await fetch("/api/google-wallet", {
        method: "POST", 
        headers, 
        body: JSON.stringify({ ticket })
      });
      
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank"); 
      else throw new Error(data.error || "No URL returned");
      
    } catch (err) {
      showPopup({ type: "error", title: t('errWalletTitle'), message: t('errWalletMsg'), confirmText: t('btnClose') });
    } finally {
      setAddingToWallet(false);
    }
  };

  const handleSendTicketEmail = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail)) { 
      showPopup({ type: "error", title: t('errEmailValidTitle'), message: t('errEmailValidMsg'), confirmText: t('btnTryAgain') });
      return; 
    }
    
    setSendingEmail(true);
    try {
      // True = Compress to bypass Vercel limits
      const dataUrl = await captureTicketImage(true); 
      
      const { default: jsPDF } = await import('jspdf');
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      
      const pdfW = 360;
      const pdfH = (img.height * pdfW) / img.width;
      
      const pdf = new jsPDF({ orientation: "p", unit: "px", format: [pdfW, pdfH] });
      // Tell jsPDF to compress the image internally as well
      pdf.addImage(dataUrl, "JPEG", 0, 0, pdfW, pdfH, undefined, 'FAST');
      const pdfBase64 = pdf.output('datauristring');

      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const res = await fetch("/api/send-ticket", { 
        method: "POST", 
        headers, 
        body: JSON.stringify({ email: recipientEmail.toLowerCase(), ticket, pdfAttachment: pdfBase64 }) 
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to send email");
      }

      // Safe client-side UI update (prevents Firestore permission errors)
      if (onUpdateDesktopTicket) {
        onUpdateDesktopTicket(prev => ({ ...prev, emailSentCount: (prev.emailSentCount || 0) + 1 }));
      }
      
      showPopup({ type: "success", title: t('successSentTitle'), message: t('successSentMsg', { email: recipientEmail }), confirmText: t('btnDone') });
      setRecipientEmail(""); 
    } catch (err) {
      console.error("Send email error:", err);
      showPopup({ type: "error", title: t('errPdfTitle'), message: t('errPdfMsg'), confirmText: t('btnClose') });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 md:gap-4 w-full h-full justify-end md:justify-start items-center pb-2 md:pb-0 relative z-10" onClick={(e) => e.stopPropagation()}>
        
        {isMobile && totalTickets > 1 && (
          <div className="flex items-center gap-2 mb-1 text-white/70 animate-pulse shrink-0">
            <ChevronLeft size={16} />
            <span className="text-[11px] uppercase tracking-widest font-bold">{t('swipeToView')}</span>
            <ChevronRight size={16} />
          </div>
        )}

        {/* Display Container: Locked to 520px on mobile for consistency */}
        <div id={`ticket-card-${ticket.id}`} className="w-full max-w-[340px] md:max-w-none md:w-[850px] mx-auto bg-white rounded-[2rem] md:rounded-[2.5rem] flex flex-col md:flex-row shadow-2xl relative overflow-hidden shrink-0 h-[520px] md:h-[400px]" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          
          <button onClick={handleDownloadPDF} title={t('btnDownloadPdf')} className="export-ignore absolute top-4 right-4 md:top-8 md:right-8 z-50 p-3 bg-gray-50 hover:bg-salsa-pink hover:text-white rounded-full transition-all duration-300 cursor-pointer shadow-sm border border-gray-100">
            <Download size={20} />
          </button>
          
          <div className="p-4 md:p-12 flex items-center justify-center bg-salsa-mint/5 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-gray-200 relative shrink-0 min-h-[210px] md:h-full w-full md:w-auto">
            <div className="w-[170px] h-[170px] md:w-60 md:h-60 bg-white p-3 md:p-4 rounded-[1.5rem] shadow-sm border border-gray-100 flex items-center justify-center">
              <QRCodeSVG value={ticket.ticketID} size={256} style={{ width: "100%", height: "100%" }} level="H" />
            </div>
          </div>
          
          <div className="px-6 py-5 md:p-10 flex flex-col justify-start md:justify-center flex-1 relative bg-white w-full overflow-hidden">
            <div className="mb-2 relative z-10 shrink-0">
              <span className={`inline-flex items-center justify-center px-6 py-2 rounded-full text-xs md:text-[11px] font-black uppercase tracking-widest shadow-sm ${getPassStyle(ticket.passType)}`}>
                {translatePassDisplay(ticket.passType)}
              </span>
            </div>
            
            <h2 
              className={`${getTicketNameSize(ticket.userName)} font-black text-slate-900 uppercase leading-tight mb-1 pr-10 relative z-10 w-full transition-all duration-300 shrink-0`}
              style={{ wordBreak: 'normal', overflowWrap: 'break-word', hyphens: 'none' }}
            >
              {ticket.userName}
            </h2>
            <p className="font-mono text-gray-500 text-sm font-bold tracking-widest uppercase mb-3 md:mb-8 relative z-10 shrink-0">{t('lblId')}: {ticket.ticketID}</p>
 
            <div className="grid grid-cols-2 gap-2 md:gap-3 mt-auto relative z-10 shrink-0">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('lblEvent')}</span>
                <span className="block text-xs md:text-sm font-black text-slate-900 uppercase truncate">
                  <span className="md:hidden">SSF</span>
                  <span className="hidden md:inline">Salsa Fest</span> {ticket.festivalYear}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('lblPrice')}</span>
                <span className="block text-xs md:text-sm font-black text-slate-900 uppercase">€{ticket.price}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2 flex justify-between items-center">
                <div>
                  <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('lblDate')}</span>
                  <span className="block text-xs md:text-sm font-bold text-slate-900">{formatDate(ticket.purchaseDate).date}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('lblTime')}</span>
                  <span className="block text-xs md:text-sm font-bold text-slate-900">{formatDate(ticket.purchaseDate).time}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="w-full max-w-[340px] md:max-w-[700px] mx-auto bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl flex flex-col justify-center gap-2 shrink-0 h-auto">
          <button onClick={handleAddToWallet} disabled={addingToWallet} className="flex md:hidden w-full bg-black text-white font-black px-4 py-3 rounded-xl shadow-md hover:bg-slate-800 transition-all uppercase tracking-widest text-xs items-center justify-center gap-2 disabled:opacity-50 shrink-0">
            {addingToWallet ? <Loader2 size={16} className="animate-spin" /> : (
              <svg viewBox="0 0 48 48" width="18" height="18"><path fill="#fff" d="M37 13H11c-2.2 0-4 1.8-4 4v14c0 2.2 1.8 4 4 4h26c2.2 0 4-1.8 4-4V17c0-2.2-1.8-4-4-4zm-4 15c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/></svg>
            )}
            {t('btnSaveWallet')}
          </button>
          
          <div className="flex justify-between items-center px-1 shrink-0 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat">{t('lblEmailStatus')}</span>
              <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full font-montserrat ${ticket.emailSentCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {ticket.emailSentCount > 0 ? t('statusSent', { count: ticket.emailSentCount }) : t('statusNotSent')}
              </span>
            </div>
            <span className="hidden md:block text-[11px] font-black text-slate-300 font-montserrat">{t('countOfTotal', { current: index + 1, total: totalTickets })}</span>
          </div>
          
          <div className="border-t border-gray-50 pt-2 shrink-0 mt-1">
             <div className="relative flex items-center w-full">
              <Mail className="absolute left-3 md:left-4 text-gray-400" size={18} />
              {/* CSS FIX: Removed uppercase and tracking-widest so emails type normally */}
              <input type="email" maxLength={50} placeholder={t('placeholderEmail')} value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-bold rounded-xl px-4 py-3 pl-10 md:pl-12 pr-24 outline-none focus:bg-white focus:border-slate-900 transition-all text-sm font-montserrat" />
              <button onClick={handleSendTicketEmail} disabled={sendingEmail} className="cursor-pointer absolute right-1.5 md:right-2 bg-salsa-pink text-white px-4 py-2 rounded-lg font-black text-xs md:text-[11px] uppercase hover:bg-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm font-montserrat">
                {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> {t('btnSend')}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Main Modal Wrapper Component
export default function TicketModal({ ticket: activeTicket, ticketsList, setTicket, onClose }) {
  const t = useTranslations('TicketModal');
  const currentIndex = ticketsList.findIndex(t => t.id === activeTicket.id);

  const translatePassDisplay = (type) => {
      const typeLower = (type || '').toLowerCase();
      if (typeLower.includes('full')) return t('passFull');
      if (typeLower.includes('party')) return t('passParty');
      if (typeLower.includes('day')) return t('passDay');
      if (typeLower.includes('free')) return t('passFree');
      return type;
  };

  // Body Scroll Lock Logic to prevent background scrolling when modal is open
  useEffect(() => {
    const originalOverflow = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow || 'unset';
    };
  }, []);

  // Keyboard Navigation Logic
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" && currentIndex < ticketsList.length - 1) setTicket(ticketsList[currentIndex + 1]);
      else if (e.key === "ArrowLeft" && currentIndex > 0) setTicket(ticketsList[currentIndex - 1]);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, ticketsList, setTicket, onClose]);

  // Center the active ticket in mobile view
  useEffect(() => {
    const el = document.getElementById(`mobile-slide-${activeTicket.id}`);
    if (el) el.scrollIntoView({ behavior: 'instant', inline: 'center' });
  }, [activeTicket.id]);

  return (
    <div className="fixed inset-0 z-[100] flex font-montserrat items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300 cursor-pointer" onClick={onClose} />
      
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />

      {/* Phantom Tickets: Rendered out of view to preserve high-fidelity rendering for html-to-image */}
      <div className="fixed top-0 left-0 pointer-events-none" style={{ opacity: 0.001, zIndex: -10 }}>
        {ticketsList.map((ticketObj) => (
          <div id={`phantom-ticket-${ticketObj.id}`} key={`phantom-${ticketObj.id}`} className="w-[360px] h-[820px] bg-white flex flex-col overflow-hidden" style={{ fontFamily: 'Arial, sans-serif' }}>
              <div className="p-8 flex items-center justify-center bg-gray-50 border-b-2 border-dashed border-gray-200 shrink-0 min-h-[340px]">
                  <div className="w-[260px] h-[260px] bg-white p-4 rounded-[1.5rem] border border-gray-100 flex items-center justify-center shadow-sm">
                      <QRCodeSVG value={ticketObj.ticketID} size={256} style={{ width: "100%", height: "100%" }} level="H" />
                  </div>
              </div>
              <div className="p-8 flex flex-col flex-1 bg-white">
                  <div className="mb-4">
                      <span className={`inline-flex items-center justify-center px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest ${getPassStyle(ticketObj.passType)}`}>
                          {translatePassDisplay(ticketObj.passType)}
                      </span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 uppercase leading-tight mb-2 break-words">{ticketObj.userName}</h2>
                  <p className="font-mono text-gray-500 text-sm font-bold tracking-widest uppercase mb-8">{t('lblId')}: {ticketObj.ticketID}</p>
                  
                  <div className="grid grid-cols-2 gap-3 mt-auto">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('lblEvent')}</span>
                          <span className="block text-sm font-black text-slate-900 uppercase">SSF {ticketObj.festivalYear}</span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('lblPrice')}</span>
                          <span className="block text-sm font-black text-slate-900 uppercase">€{ticketObj.price}</span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 col-span-2 flex justify-between items-center">
                          <div>
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('lblDate')}</span>
                              <span className="block text-sm font-bold text-slate-900">{formatDate(ticketObj.purchaseDate).date}</span>
                          </div>
                          <div className="text-right">
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('lblTime')}</span>
                              <span className="block text-sm font-bold text-slate-900">{formatDate(ticketObj.purchaseDate).time}</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
        ))}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex relative flex-col items-center justify-center p-8 z-[105]" onClick={onClose}>
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
            
            <TicketView ticket={activeTicket} index={currentIndex} totalTickets={ticketsList.length} onUpdateDesktopTicket={setTicket} isMobile={false} t={t} />

            <button 
              onClick={(e) => { e.stopPropagation(); setTicket(ticketsList[currentIndex + 1]); }} 
              disabled={currentIndex >= ticketsList.length - 1} 
              className="p-4 bg-white/10 rounded-full text-white hover:bg-white/30 hover:scale-110 transition-all disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer backdrop-blur-md shrink-0"
            >
              <ChevronRight size={32} />
            </button>
        </div>
      </div>

      {/* Mobile Layout */}
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="md:hidden fixed top-4 right-4 text-white hover:text-salsa-pink transition-all bg-white/10 p-2 rounded-full backdrop-blur-md z-[120]">
          <X size={24} />
      </button>

      <div className="flex md:hidden absolute inset-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory hide-scrollbar z-[105] h-[100dvh] items-center" onClick={onClose}>
        {ticketsList.map((ticketObj, i) => (
          <div id={`mobile-slide-${ticketObj.id}`} key={ticketObj.id} className="min-w-full w-full h-full px-4 snap-center snap-always shrink-0 flex flex-col items-center justify-end pb-8 pt-10 relative">
            <TicketView ticket={ticketObj} index={i} totalTickets={ticketsList.length} isMobile={true} t={t} />
          </div>
        ))}
      </div>
    </div>
  );
}