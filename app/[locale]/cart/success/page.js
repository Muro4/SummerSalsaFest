"use client";
import { useEffect, useState, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
// THE FIX: Use standard next/navigation for search params, but custom routing for Link/useRouter
import { useSearchParams } from "next/navigation"; 
import { useRouter, Link } from "@/routing";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Footer from "@/components/Footer";
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

// 1. THE MAIN CONTENT COMPONENT
function SuccessContent() {
  const t = useTranslations('Success');
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [isGuest, setIsGuest] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  
  // State to track if the background emails have fired (Guest Only)
  const [emailsSent, setEmailsSent] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState(t('prepEmail'));

  const isFreePass = searchParams.get("session_id") === "free_pass_bypass";

  // Helper to translate internal DB pass names for the UI
  const translatePassDisplay = (type) => {
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('full')) return t('passFull');
    if (typeLower.includes('party')) return t('passParty');
    if (typeLower.includes('day')) return t('passDay');
    if (typeLower.includes('free')) return t('passFree');
    return type;
  };

  // ACTIVATE TICKETS ON LOAD
  useEffect(() => {
    const activateTickets = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const currentUser = auth.currentUser;
      const currentID = currentUser ? currentUser.uid : sessionStorage.getItem("guestSessionID");
      
      setIsGuest(!currentUser);

      if (currentID) {
        try {
          const q = query(
            collection(db, "tickets"), 
            where("userId", "==", currentID), 
            where("status", "==", "pending")
          );
          const snap = await getDocs(q);
          
          const activated = [];
          
          for (const document of snap.docs) {
            const ticketData = { ...document.data(), id: document.id };
            await updateDoc(doc(db, "tickets", document.id), { 
                status: "active",
                paymentConfirmedAt: new Date().toISOString()
            });
            activated.push({ ...ticketData, status: "active", purchaseDate: new Date().toISOString() });
          }
          
          setTickets(activated);
          setLoading(false);

        } catch (error) {
          console.error("Error activating tickets:", error);
          alert(t('errSync'));
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    activateTickets();
  }, [searchParams, t]);

  // AUTO-SEND EMAILS IN THE BACKGROUND (ONLY FOR GUESTS)
  useEffect(() => {
    if (isGuest && tickets.length > 0 && !emailsSent) {
      const dispatchEmails = async () => {
        // Wait 1.5 seconds to ensure the QR codes and fonts are fully painted
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // PERFORMANCE OPTIMIZATION: Dynamically import massive PDF libraries only when guests need them!
        const { toPng } = await import('html-to-image');
        const { default: jsPDF } = await import('jspdf');

        for (const ticket of tickets) {
          const targetEmail = ticket.guestEmail;
          if (!targetEmail) continue;

          const element = document.getElementById(`ticket-${ticket.id}`);
          if (element) {
            try {
              const { width, height } = element.getBoundingClientRect();
              const dataUrl = await toPng(element, { 
                quality: 0.8, 
                pixelRatio: 2, 
                backgroundColor: "#ffffff", 
                skipFonts: true, 
                style: { boxShadow: "none" } 
              });
              
              const pdf = new jsPDF({ orientation: "l", unit: "px", format: [width, height] });
              pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
              const pdfBase64 = pdf.output('datauristring');

              await fetch("/api/send-ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: targetEmail, ticket: ticket, pdfAttachment: pdfBase64 })
              });
              
              await updateDoc(doc(db, "tickets", ticket.id), { 
                emailSentCount: (ticket.emailSentCount || 0) + 1 
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
    const element = document.getElementById(`ticket-${ticket.id}`);
    if (!element) {
      setDownloadingId(null);
      return;
    }

    try {
      // PERFORMANCE OPTIMIZATION: Dynamically import massive PDF libraries only when clicked!
      const { toPng } = await import('html-to-image');
      const { default: jsPDF } = await import('jspdf');

      const { width, height } = element.getBoundingClientRect();
      const dataUrl = await toPng(element, { 
        quality: 1, 
        pixelRatio: 3, 
        backgroundColor: "#ffffff", 
        skipFonts: true, 
        style: { boxShadow: "none" } 
      });
      const pdf = new jsPDF({ orientation: "l", unit: "px", format: [width, height] });
      pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
      pdf.save(`SalsaFest_Ticket_${ticket.userName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      alert(t('errDownload'));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-20">
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
                    {/* GUEST VIEW: Shows Email Status, Tickets, and Warnings */}
                    <p className={`font-bold text-sm text-center mb-12 flex items-center justify-center gap-2 ${emailsSent ? 'text-emerald-600' : 'text-slate-500 animate-pulse'}`}>
                      {!emailsSent && <Loader2 size={16} className="animate-spin" />}
                      {emailStatusMessage}
                    </p>

                    <div className="grid grid-cols-1 gap-8 w-full mb-16">
                      {tickets.map(ticket => (
                        <div key={ticket.id} className="flex flex-col items-center w-full">
                          <div 
                            id={`ticket-${ticket.id}`} 
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
                    {/* SIGNED IN VIEW: Simple Confirmation & Redirect Links */}
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

// 2. THE REQUIRED DEFAULT EXPORT (Wrapped in Suspense for useSearchParams)
export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-salsa-white font-montserrat">
      <Navbar />
      <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>}>
        <SuccessContent />
      </Suspense>
      <Footer />
    </main>
  );
}