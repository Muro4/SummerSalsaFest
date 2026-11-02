"use client";
import { getActiveFestivalYear } from "@/lib/utils";
import { useEffect, useState, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useSearchParams } from "next/navigation"; 
import { useRouter, Link } from "@/routing";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Footer from "@/components/Footer";
import { CheckCircle, Loader2, Download, ArrowRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from 'next-intl';

/* --- SHARED TICKET STYLING UTILS --- */
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

function SuccessContent() {
  const t = useTranslations('Success');
  const searchParams = useSearchParams();
  
  /* Component State */
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);

  const isFreePass = searchParams.get("session_id") === "free_pass_bypass";

  /* UI formatting mapping */
  const translatePassDisplay = (type) => {
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('full')) return t('passFull');
    if (typeLower.includes('party')) return t('passParty');
    if (typeLower.includes('day')) return t('passDay');
    if (typeLower.includes('free')) return t('passFree');
    return type;
  };

  /* Strict real-time sync listener ensuring auth state is initialized and tickets are active */
  /* Strict real-time sync listener ensuring auth state is initialized and tickets are active */
  useEffect(() => {
    let unsubscribeSnapshot = null;
    let fallbackTimeout = null;

    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      // FIX 1: Stop loading immediately if the user is somehow not authenticated
      if (!currentUser || currentUser.isAnonymous) {
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "tickets"), 
        where("userId", "==", currentUser.uid),
        where("status", "==", "active"),
        where("festivalYear", "==", getActiveFestivalYear())
      );

      unsubscribeSnapshot = onSnapshot(q, (snap) => {
        const fetchedTickets = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedTickets.sort((a, b) => new Date(b.paymentConfirmedAt) - new Date(a.paymentConfirmedAt));
        setTickets(fetchedTickets);
        
        // Only turn off loading immediately if tickets are actually found
        if (!snap.empty) {
          setLoading(false);
          if (fallbackTimeout) clearTimeout(fallbackTimeout);
        }
      });

      // FIX 2: If the Stripe webhook takes longer than 8 seconds, force the loading screen to end
      fallbackTimeout = setTimeout(() => {
        setLoading(false);
      }, 8000);

    });

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      unsubscribeAuth();
    };
  }, []);

  /* Client-side PDF Generation */
  const handleDownloadPDF = async (ticket) => {
    if (ticket.status !== 'active') return;

    setDownloadingId(ticket.id);
    const element = document.getElementById(`phantom-ticket-${ticket.id}`);
    
    if (!element) {
      setDownloadingId(null);
      return;
    }

    try {
      const { toPng } = await import('html-to-image');
      const { default: jsPDF } = await import('jspdf');

      const dataUrl = await toPng(element, { 
        quality: 1, 
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
    <>
      {/* PHANTOM TICKETS: Rendered strictly outside the view for pure PDF extraction */}
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
                  <p className="font-mono text-gray-500 text-sm font-bold tracking-widest uppercase mb-8">{t('lblId')} {ticketObj.ticketID}</p>
                  
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

      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-20">
        <div className="w-full max-w-4xl animate-in zoom-in duration-500 flex flex-col items-center">
            
            {loading ? (
               <div className="w-full flex flex-col items-center animate-in fade-in duration-500 bg-white p-16 rounded-[4rem] shadow-2xl border border-gray-100">
                  <CheckCircle className="text-slate-300 mb-6" size={80} />
                  <h1 className="font-bebas tracking-wide text-5xl text-gray-900 uppercase text-center mb-4">
                    Payment Received
                  </h1>
                  <p className="font-medium text-slate-500 text-sm text-center mb-8 max-w-md">
                    Your payment was successful, but we are still generating your digital passes. They will appear in your account dashboard shortly.
                  </p>
                  <Button href="/account" variant="primary" className="shadow-salsa-pink/20 !px-10 !py-4">
                    {t('btnAccount')}
                  </Button>
               </div>
            ) : (
               <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
                  <CheckCircle className="text-emerald-500 mb-6" size={80} />
                  <h1 className="font-bebas tracking-wide text-6xl md:text-7xl text-gray-900 mb-4 uppercase leading-none text-center">
                    {isFreePass ? t('activatedTitle') : t('successTitle')}
                  </h1>
                  
                  <p className="font-bold text-slate-500 text-sm text-center mb-12">
                    {t('savedMsg')}
                  </p>

                  <div className="grid grid-cols-1 gap-8 w-full mb-16">
                    {tickets.map(ticket => (
                      <div key={ticket.id} className="flex flex-col items-center w-full">
                        
                        {/* VISIBLE UI: Mirrored exactly from TicketModal.js */}
                        <div className="w-full max-w-[340px] md:max-w-none md:w-[850px] mx-auto bg-white rounded-[2rem] md:rounded-[2.5rem] flex flex-col md:flex-row shadow-2xl relative overflow-hidden shrink-0 h-[520px] md:h-[400px]" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                          
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
                            <p className="font-mono text-gray-500 text-sm font-bold tracking-widest uppercase mb-3 md:mb-8 relative z-10 shrink-0">{t('lblId')} {ticket.ticketID}</p>
                            
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

                        <button 
                          onClick={() => handleDownloadPDF(ticket)}
                          disabled={downloadingId === ticket.id || ticket.status !== 'active'}
                          className="mt-6 bg-slate-900 text-white font-black px-8 py-4 rounded-2xl shadow-lg hover:bg-salsa-pink hover:-translate-y-1 transition-all uppercase tracking-widest text-[11px] flex items-center gap-3 disabled:opacity-50 cursor-pointer"
                        >
                          {downloadingId === ticket.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                          {t('btnDownload')}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <Button href="/account" variant="primary" className="shadow-salsa-pink/20 !px-10 !py-4">
                      {t('btnAccount')}
                    </Button>
                    <Button href="/" variant="outline" className="!px-10 !py-4 border-gray-200 bg-white">
                      {t('btnHome')}
                    </Button>
                  </div>

               </div>
            )}
        </div>
      </div>
    </>
  );
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-salsa-white font-montserrat overflow-x-hidden">
      <Navbar />
      <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>}>
        <SuccessContent />
      </Suspense>
      <Footer />
    </main>
  );
}