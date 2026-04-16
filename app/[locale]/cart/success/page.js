"use client";
import { useEffect, useState, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { useSearchParams } from "next/navigation"; 
import { useRouter, Link } from "@/routing";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import { CheckCircle, Loader2, Download, AlertTriangle, ArrowRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from 'next-intl';

// --- UTILS ---
const getPassBgColor = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('full')) return 'bg-salsa-pink';
  if (t.includes('party')) return 'bg-violet-600';
  if (t.includes('day')) return 'bg-teal-300';
  return 'bg-gray-200';
};

const getPassTextColor = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('day')) return 'text-teal-950';
  if (t.includes('full') || t.includes('party')) return 'text-white';
  return 'text-slate-900';
};

const getPassStyle = (type) => `${getPassBgColor(type)} ${getPassTextColor(type)} border-transparent`;

// Formats ISO date strings into readable UI text (For the Phantom Tickets)
const formatDate = (isoString) => {
  if (!isoString) return { date: "Valid", time: "Pass" };
  const d = new Date(isoString);
  if (isNaN(d)) return { date: "Valid", time: "Pass" };
  return { date: d.toLocaleDateString('en-GB'), time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) };
};

// 1. THE MAIN CONTENT COMPONENT
function SuccessContent() {
  const t = useTranslations('Success');
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [isGuest, setIsGuest] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  
  const [emailsSent, setEmailsSent] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState(t('prepEmail'));

  const isFreePass = searchParams.get("session_id") === "free_pass_bypass";

  const translatePassDisplay = (type) => {
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('full')) return t('passFull');
    if (typeLower.includes('party')) return t('passParty');
    if (typeLower.includes('day')) return t('passDay');
    if (typeLower.includes('free')) return t('passFree');
    return type;
  };

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!isMounted) return;
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const currentID = user ? user.uid : sessionStorage.getItem("guestSessionID");
      setIsGuest(!user);

      if (user) {
        try {
          const q = query(collection(db, "tickets"), where("userId", "==", currentID));
          const snap = await getDocs(q);
          
          const fetchedTickets = snap.docs.map(document => ({ 
            ...document.data(), 
            id: document.id,
            purchaseDate: new Date().toISOString() 
          }));
          
          setTickets(fetchedTickets);
          setLoading(false);
        } catch (error) {
          console.error("Error fetching logged-in tickets:", error);
          alert(t('errSync'));
          setLoading(false);
        }
      } else if (currentID) {
        try {
          let guestTicketIds = JSON.parse(sessionStorage.getItem("guestTicketIds") || "[]");
          const localCart = JSON.parse(localStorage.getItem("cart") || "[]");
          
          if (localCart.length > 0) {
            guestTicketIds = localCart.map(item => item.id);
            sessionStorage.setItem("guestTicketIds", JSON.stringify(guestTicketIds));
            localStorage.removeItem("cart");
            window.dispatchEvent(new Event("cartUpdated")); 
          }

          const fetchedTickets = [];
          for (const ticketId of guestTicketIds) {
            const docSnap = await getDoc(doc(db, "tickets", ticketId));
            if (docSnap.exists()) {
              fetchedTickets.push({ 
                ...docSnap.data(), 
                id: docSnap.id, 
                purchaseDate: new Date().toISOString() 
              });
            }
          }
          
          setTickets(fetchedTickets);
          setLoading(false);
        } catch (error) {
          console.error("Error fetching guest tickets:", error);
          alert(t('errSync'));
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [searchParams, t]);

  // AUTO-SEND EMAILS IN THE BACKGROUND (ONLY FOR GUESTS)
  useEffect(() => {
    if (isGuest && tickets.length > 0 && !emailsSent) {
      const dispatchEmails = async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Use toJpeg instead of toPng to compress the file and bypass the Vercel limit
        const { toJpeg } = await import('html-to-image');
        const { default: jsPDF } = await import('jspdf');

        for (const ticket of tickets) {
          const targetEmail = ticket.guestEmail;
          if (!targetEmail) continue;

          // TARGET THE PHANTOM TICKET (Vertical) instead of the UI ticket (Horizontal)
          const element = document.getElementById(`phantom-ticket-${ticket.id}`);
          if (element) {
            try {
              // High Quality Settings (Stays under 4.5MB Vercel limit)
              const dataUrl = await toJpeg(element, { 
                quality: 0.85, 
                pixelRatio: 2, 
                backgroundColor: "#ffffff", 
                skipFonts: true, 
                fontEmbedCSS: '',
                filter: (node) => !node.classList?.contains('export-ignore'),
                style: { boxShadow: "none", margin: "0", padding: "0" } 
              });
              
              const img = new Image();
              img.src = dataUrl;
              await new Promise((resolve) => { img.onload = resolve; });

              // Enforce portrait format
              const pdfW = 360;
              const pdfH = (img.height * pdfW) / img.width;

              const pdf = new jsPDF({ orientation: "p", unit: "px", format: [pdfW, pdfH] });
              pdf.addImage(dataUrl, "JPEG", 0, 0, pdfW, pdfH, undefined, 'FAST');
              const pdfBase64 = pdf.output('datauristring');

              await fetch("/api/send-ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: targetEmail, ticket: ticket, pdfAttachment: pdfBase64 })
              });
            } catch (err) {
              console.error("Auto-email failed for ticket", ticket.id, err);
            }
          }
        }
        setEmailsSent(true);
        setEmailStatusMessage(t('sentEmail'));
      };
      
      dispatchEmails();
    }
  }, [tickets, isGuest, emailsSent, t]);

  const handleDownloadPDF = async (ticket) => {
    setDownloadingId(ticket.id);
    
    // Target the phantom ticket for the local download too!
    const element = document.getElementById(`phantom-ticket-${ticket.id}`);
    if (!element) {
      setDownloadingId(null);
      return;
    }

    try {
      const { toPng } = await import('html-to-image');
      const { default: jsPDF } = await import('jspdf');

      // Uncompressed max-quality PNG for direct local downloads
      const dataUrl = await toPng(element, { 
        quality: 1, 
        pixelRatio: 3, 
        backgroundColor: "#ffffff", 
        skipFonts: true, 
        fontEmbedCSS: '',
        filter: (node) => !node.classList?.contains('export-ignore'),
        style: { boxShadow: "none", margin: "0", padding: "0" } 
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const pdfW = 360;
      const pdfH = (img.height * pdfW) / img.width;

      const pdf = new jsPDF({ orientation: "p", unit: "px", format: [pdfW, pdfH] });
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`SalsaFest_Pass_${ticket.userName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      alert(t('errDownload'));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full px-6 py-20 mt-16 md:mt-20 relative">
      
      {/* --------------------------------------------------------------------- */}
      {/* PHANTOM TICKETS: Hidden from UI but used for high-quality PDF generation */}
      {/* --------------------------------------------------------------------- */}
      <div className="fixed top-0 left-0 pointer-events-none" style={{ opacity: 0.001, zIndex: -10 }}>
        {tickets.map((ticketObj) => (
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

      {/* --------------------------------------------------------------------- */}
      {/* UI RENDER CONTENT                                                     */}
      {/* --------------------------------------------------------------------- */}
      <div className="w-full max-w-4xl animate-in zoom-in duration-500 flex flex-col items-center">
          {loading ? (
             <div className="flex flex-col items-center bg-white p-16 rounded-[4rem] shadow-2xl border-2 border-emerald-100 w-full max-w-lg">
                <Loader2 className="animate-spin text-salsa-pink mb-6" size={60} />
                <h1 className="font-bebas tracking-wide text-5xl text-gray-900 uppercase text-center">
                  {isFreePass ? t('activating') : t('confirming')}
                </h1>
                <p className="text-gray-400 font-bold text-[11px] uppercase tracking-widest mt-4">
                  {t('doNotClose')}
                </p>
             </div>
          ) : (
             <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
                <CheckCircle className="text-emerald-500 mb-6" size={80} />
                <h1 className="font-bebas tracking-wide text-6xl md:text-7xl text-gray-900 mb-4 uppercase leading-none text-center">
                  {isFreePass ? t('activatedTitle') : t('successTitle')}
                </h1>
                
                {isGuest ? (
                  <>
                    <p className={`font-bold text-sm text-center mb-12 flex items-center justify-center gap-2 ${emailsSent ? 'text-emerald-600' : 'text-slate-500 animate-pulse'}`}>
                      {!emailsSent && <Loader2 size={16} className="animate-spin" />}
                      {emailStatusMessage}
                    </p>

                    <div className="grid grid-cols-1 gap-8 w-full mb-16">
                      {tickets.map(ticket => (
                        <div key={ticket.id} className="flex flex-col items-center w-full">
                          {/* The UI Horizontal Ticket Block */}
                          <div 
                            className="w-full max-w-[850px] bg-white rounded-[2.5rem] flex flex-col md:flex-row shadow-xl relative overflow-hidden border border-gray-100" 
                            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                          >
                            <div className="p-8 md:p-12 flex items-center justify-center bg-salsa-mint/5 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-gray-200 relative shrink-0">
                              <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                                <QRCodeSVG value={ticket.ticketID} size={160} level="H" />
                              </div>
                            </div>
                            <div className="p-8 md:p-10 flex flex-col justify-center flex-1 relative bg-white min-w-0">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-salsa-mint/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                              <div className="mb-4 relative z-10">
                                <span className={`text-xs font-sans font-black px-5 py-2 rounded-full uppercase tracking-widest shadow-sm inline-block ${getPassBgColor(ticket.passType)} ${getPassTextColor(ticket.passType)}`}>
                                  {translatePassDisplay(ticket.passType)}
                                </span>
                              </div>
                              <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase leading-[1.1] tracking-tight mb-2 pr-12 whitespace-normal break-words relative z-10 w-full">
                                {ticket.userName}
                              </h2>
                              <p className="font-mono text-gray-400 text-xs font-bold tracking-widest uppercase mb-8 relative z-10">{t('lblId')} {ticket.ticketID}</p>
                              
                              <div className="grid grid-cols-2 gap-3 mt-auto relative z-10">
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('lblEvent')}</span>
                                  <span className="block text-sm font-black text-slate-900 uppercase">{t('eventVal', { year: ticket.festivalYear })}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('lblPrice')}</span>
                                  <span className="block text-sm font-black text-slate-900 uppercase">€{ticket.price || 0}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleDownloadPDF(ticket)}
                            disabled={downloadingId === ticket.id}
                            className="mt-6 bg-slate-900 text-white font-black px-8 py-4 rounded-2xl shadow-lg hover:bg-salsa-pink hover:-translate-y-1 transition-all uppercase tracking-widest text-[11px] flex items-center gap-3 disabled:opacity-50 cursor-pointer"
                          >
                            {downloadingId === ticket.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            {t('btnDownload')}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-8 rounded-[3rem] w-full max-w-3xl flex flex-col md:flex-row items-center gap-6 shadow-md text-center md:text-left mb-8">
                      <div className="bg-white p-4 rounded-full shadow-sm text-amber-500 shrink-0">
                        <AlertTriangle size={32} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bebas tracking-wide text-3xl text-amber-900 uppercase mb-1">{t('warnTitle')}</h3>
                        <p className="text-amber-700 font-medium text-sm leading-relaxed">
                          {t('warnText1')} <strong>{t('warnText2')}</strong> {t('warnText3')}
                        </p>
                      </div>
                      <Button href="/login" variant="primary" className="shrink-0 bg-amber-500 hover:bg-amber-600 shadow-amber-500/20">
                        {t('btnCreateAccount')}
                      </Button>
                    </div>

                    <Link href="/" className="text-slate-400 hover:text-slate-900 font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-colors">
                      {t('linkHomePdf')} <ArrowRight size={14} />
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-slate-500 text-sm text-center mb-12">
                      {t('savedMsg')}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                      <Button href="/account" variant="primary" className="shadow-salsa-pink/20 !px-10 !py-4">
                        {t('btnAccount')}
                      </Button>
                      <Button href="/" variant="outline" className="!px-10 !py-4 border-gray-200 bg-white">
                        {t('btnHome')}
                      </Button>
                    </div>
                  </>
                )}
             </div>
          )}
      </div>
    </div>
  );
}

// 2. THE REQUIRED DEFAULT EXPORT 
export default function SuccessPage() {
  return (
    <main className="min-h-screen flex flex-col bg-salsa-white font-montserrat">
      <Navbar />
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center w-full">
          <Loader2 className="animate-spin text-salsa-pink" size={48} />
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </main>
  );
}