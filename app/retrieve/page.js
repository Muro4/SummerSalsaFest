"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import { Search, Loader2, Download, Mail, AlertCircle, Ticket, Calendar, Clock, CheckCircle, Send } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from 'html-to-image';
import jsPDF from "jspdf";
import Link from "next/link";

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

export default function RetrievePage() {
  const [email, setEmail] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState(null);
  
  const [downloading, setDownloading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTicket(null);
    setEmailSuccess(false);

    try {
      const q = query(
        collection(db, "tickets"), 
        where("ticketID", "==", ticketId.toUpperCase().trim())
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("No ticket found with this ID.");
        setLoading(false);
        return;
      }

      const docData = snap.docs[0].data();

      // Verify the email matches
      if ((docData.guestEmail || "").toLowerCase() !== email.toLowerCase().trim()) {
        setError("The email does not match the records for this Ticket ID.");
        setLoading(false);
        return;
      }

      setTicket({ id: snap.docs[0].id, ...docData });

    } catch (err) {
      if (err.code === "permission-denied" || err.message.includes("Missing or insufficient permissions")) {
        setError("This ticket is linked to a registered account. Please log in to view it.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    const element = document.getElementById("ticket-to-download");
    
    try {
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
      alert("Failed to download. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    setEmailSuccess(false);
    const element = document.getElementById("ticket-to-download");
    
    try {
      const { width, height } = element.getBoundingClientRect();
      const dataUrl = await toPng(element, { quality: 0.9, pixelRatio: 2, backgroundColor: "#ffffff", skipFonts: true, style: { boxShadow: "none" } });
      const pdf = new jsPDF({ orientation: "l", unit: "px", format: [width, height] });
      pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
      const pdfBase64 = pdf.output('datauristring');

      await fetch("/api/send-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, ticket: ticket, pdfAttachment: pdfBase64 })
      });

      await updateDoc(doc(db, "tickets", ticket.id), { emailSentCount: (ticket.emailSentCount || 0) + 1 });
      
      setTicket(prev => ({ ...prev, emailSentCount: (prev.emailSentCount || 0) + 1 }));
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 5000);
    } catch (err) {
      alert("Failed to send email. Please download the PDF directly.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat flex flex-col">
      <Navbar />
      
      <div className="flex-grow flex flex-col items-center justify-center pt-32 pb-24 px-6 w-full max-w-4xl mx-auto">
        
        <div className="text-center mb-10">
          <h1 className="font-bebas text-6xl md:text-7xl text-slate-900 uppercase leading-none mb-2">Find My Pass</h1>
          <p className="text-slate-500 font-bold text-sm">Checked out as a guest? Enter your details to retrieve your ticket.</p>
        </div>

        {/* SEARCH FORM */}
        <form onSubmit={handleSearch} className="bg-white p-8 md:p-10 rounded-[3rem] shadow-xl border border-gray-100 w-full max-w-2xl mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-salsa-mint/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-2">Checkout Email</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-5 text-gray-400" size={18} />
                <input 
                  required 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="input-standard" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-2">Ticket ID</label>
              <div className="relative flex items-center">
                <Search className="absolute left-5 text-gray-400" size={18} />
                <input 
                  required 
                  type="text" 
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  placeholder="e.g. SLS4X9Q"
                  className="input-standard uppercase" 
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-2xl text-xs font-bold uppercase tracking-widest">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full !py-5 mt-2" disabled={loading} isLoading={loading}>
              Search Ticket
            </Button>

            <div className="text-center mt-6">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Have an account? <Link href="/login" className="text-salsa-pink hover:underline">Log In</Link>
              </span>
            </div>
          </div>
        </form>

        {/* TICKET RESULT */}
        {ticket && (
          <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle className="text-emerald-500" size={24} />
              <h3 className="font-bebas text-4xl text-slate-900 uppercase tracking-wide">Ticket Found</h3>
            </div>

            <div 
              id="ticket-to-download" 
              className="w-full max-w-[850px] bg-white rounded-[2.5rem] flex flex-col md:flex-row shadow-2xl relative overflow-hidden border border-gray-100 mb-6" 
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
                  <span className={`text-xs font-sans font-black px-5 py-2 rounded-full uppercase tracking-widest shadow-sm inline-block ${getPassStyle(ticket.passType)}`}>
                    {ticket.passType}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase leading-[1.1] tracking-tight mb-2 pr-12 whitespace-normal break-words relative z-10 w-full">
                  {ticket.userName}
                </h2>
                <p className="font-mono text-gray-400 text-xs font-bold tracking-widest uppercase mb-8 relative z-10">ID: {ticket.ticketID}</p>
                <div className="grid grid-cols-2 gap-3 mt-auto relative z-10">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Event</span>
                    <span className="block text-sm font-black text-slate-900 uppercase">Salsa Fest {ticket.festivalYear}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</span>
                    <span className="block text-sm font-black text-slate-900 uppercase">€{ticket.price || 0}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2 flex justify-between items-center">
                    <div>
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Purchase Date</span>
                      <span className="block text-sm font-bold text-slate-900">{formatDate(ticket.purchaseDate).date}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</span>
                      <span className="block text-sm font-bold text-slate-900">{formatDate(ticket.purchaseDate).time}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-[850px]">
              <button 
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="flex-1 bg-slate-900 text-white font-black px-8 py-5 rounded-2xl shadow-xl hover:bg-slate-800 hover:-translate-y-1 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
              >
                {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                Download PDF
              </button>

              <button 
                onClick={handleSendEmail}
                disabled={sendingEmail || emailSuccess}
                className={`flex-1 font-black px-8 py-5 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer
                  ${emailSuccess ? 'bg-emerald-500 text-white hover:bg-emerald-500 hover:-translate-y-0' : 'bg-salsa-pink text-white hover:bg-pink-600 hover:-translate-y-1'}`}
              >
                {sendingEmail ? <Loader2 size={18} className="animate-spin" /> : emailSuccess ? <CheckCircle size={18} /> : <Send size={18} />}
                {emailSuccess ? "Sent Successfully!" : "Email to Me"}
              </button>
            </div>
          </div>
        )}

      </div>
      <Footer />
    </main>
  );
}