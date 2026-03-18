"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, setDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import CustomDropdown from "@/components/CustomDropdown";
import { usePopup } from "@/components/PopupProvider";
import Button from "@/components/Button";
import {
  Users, Plus, Trash2, Search, Loader2, CheckCircle, CreditCard,
  ShieldAlert, History, UserPlus, ArrowRight, Download, Send, X, Mail,
  ChevronLeft, ChevronRight, Info, Eye, Filter, Ticket, Clock
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from 'html-to-image';
import jsPDF from "jspdf";

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
  return {
    date: d.toLocaleDateString('en-GB'),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  };
};

export default function AmbassadorDashboard() {
  const [activeTab, setActiveTab] = useState("draft");
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  const [groupRows, setGroupRows] = useState([]);
  const [paidTickets, setPaidTickets] = useState([]);
  const [bulkAddCount, setBulkAddCount] = useState(1);
  const [selectedYear, setSelectedYear] = useState("2026");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [passFilter, setPassFilter] = useState("All");

  // Modals & Navigation
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [fullScreenTicket, setFullScreenTicket] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Drag-to-Select States
  const [selectedDrafts, setSelectedDrafts] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(true);

  const router = useRouter();
  const { showPopup } = usePopup();

  const draftPassTypes = ["Full Pass", "Party Pass", "Day Pass"];

  // --- INITIAL LOAD & AUTH ---
  useEffect(() => {
    const hasSeenInfo = localStorage.getItem("hasSeenAmbassadorInfo");
    if (!hasSeenInfo) {
      setShowInfoModal(true);
      localStorage.setItem("hasSeenAmbassadorInfo", "true");
    }

    let unsubTickets = () => { };
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const uDoc = await getDoc(doc(db, "users", user.uid));
        const profile = uDoc.data();
        if (profile?.role !== 'ambassador') { router.push("/account"); return; }

        setUserData(profile);
        const rosterDoc = await getDoc(doc(db, "rosters", user.uid));
        if (rosterDoc.exists() && rosterDoc.data().members) setGroupRows(rosterDoc.data().members);
        else setGroupRows([{ id: Date.now(), name: "", type: "Full Pass" }]);

        const q = query(collection(db, "tickets"), where("userId", "==", user.uid), where("status", "==", "active"));
        unsubTickets = onSnapshot(q, (snap) => {
          setPaidTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        });
      } else {
        unsubTickets();
        router.push("/login");
      }
    });
    return () => { unsubAuth(); unsubTickets(); };
  }, [router]);

  // --- FILTERS & STATS ---
  const filteredHistory = paidTickets.filter(t => {
    const matchesYear = t.festivalYear?.toString() === selectedYear;
    const matchesSearch = (t.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || t.ticketID?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPass = passFilter === "All" || (t.passType || "").toLowerCase() === passFilter.toLowerCase();
    return matchesYear && matchesSearch && matchesPass;
  });

  const filteredDrafts = groupRows.filter(r => {
    const matchesSearch = r.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPass = passFilter === "All" || (r.type || "").toLowerCase() === passFilter.toLowerCase();
    return matchesSearch && matchesPass;
  });

  const totalPaidRevenue = filteredHistory.reduce((acc, ticket) => acc + getPrice(ticket.passType), 0);
  const draftTotal = groupRows.reduce((acc, row) => acc + getPrice(row.type), 0);

  // --- KEYBOARD NAVIGATION ---
  useEffect(() => {
    if (!fullScreenTicket) return;
    const handleKeyDown = (e) => {
      const currentIndex = filteredHistory.findIndex(t => t.id === fullScreenTicket.id);
      if (e.key === "ArrowRight" && currentIndex < filteredHistory.length - 1) setFullScreenTicket(filteredHistory[currentIndex + 1]);
      else if (e.key === "ArrowLeft" && currentIndex > 0) setFullScreenTicket(filteredHistory[currentIndex - 1]);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullScreenTicket, filteredHistory]);

  const handleNextTicket = () => {
    const currentIndex = filteredHistory.findIndex(t => t.id === fullScreenTicket.id);
    if (currentIndex < filteredHistory.length - 1) setFullScreenTicket(filteredHistory[currentIndex + 1]);
  };
  const handlePrevTicket = () => {
    const currentIndex = filteredHistory.findIndex(t => t.id === fullScreenTicket.id);
    if (currentIndex > 0) setFullScreenTicket(filteredHistory[currentIndex - 1]);
  };

  // --- DRAG TO SELECT LOGIC ---
  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleMouseDownOnRow = (id) => {
    setIsDragging(true);
    const isCurrentlySelected = selectedDrafts.includes(id);
    const newDragMode = !isCurrentlySelected;
    setDragMode(newDragMode);

    if (newDragMode) setSelectedDrafts(prev => [...new Set([...prev, id])]);
    else setSelectedDrafts(prev => prev.filter(rowId => rowId !== id));
  };

  const handleMouseEnterOnRow = (id) => {
    if (!isDragging) return;
    if (dragMode) setSelectedDrafts(prev => [...new Set([...prev, id])]);
    else setSelectedDrafts(prev => prev.filter(rowId => rowId !== id));
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedDrafts(filteredDrafts.map(r => r.id));
    else setSelectedDrafts([]);
  };

  // --- ROSTER MANAGEMENT ---
  const saveRoster = async (newRows) => {
    setGroupRows(newRows);
    if (auth.currentUser) await setDoc(doc(db, "rosters", auth.currentUser.uid), { members: newRows }, { merge: true });
  };

  const handleBulkAdd = () => {
    const count = parseInt(bulkAddCount) || 1;
    if (count < 1) { showPopup({ type: "error", title: "Invalid Amount", message: "You must add at least 1 row.", confirmText: "OK" }); return; }
    if (groupRows.length + count > 100) { showPopup({ type: "error", title: "Limit Reached", message: "The maximum draft size is 100 passes.", confirmText: "Got It" }); return; }
    const newRows = Array.from({ length: count }).map((_, i) => ({ id: Date.now() + i, name: "", type: "Full Pass" }));
    saveRoster([...groupRows, ...newRows]);
    setBulkAddCount(1);
  };

  const confirmMassDelete = () => {
    showPopup({
      type: "info", title: "Delete Rows?", message: `Are you sure you want to delete ${selectedDrafts.length} selected row(s)?`, confirmText: "Yes, Delete", cancelText: "Cancel",
      onConfirm: () => {
        saveRoster(groupRows.filter(row => !selectedDrafts.includes(row.id)));
        setSelectedDrafts([]);
      }
    });
  };

  const confirmRemoveRow = (id, name) => {
    showPopup({
      type: "info",
      title: "Delete Row?",
      message: `Are you sure you want to remove ${name ? `'${name.toUpperCase()}'` : "this empty row"}?`,
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      onConfirm: () => {
        saveRoster(groupRows.filter(row => row.id !== id));
        setSelectedDrafts(prev => prev.filter(rowId => rowId !== id));
      }
    });
  };

  const updateRow = (id, field, value) => saveRoster(groupRows.map(row => row.id === id ? { ...row, [field]: value } : row));

  const submitGroupToCart = async () => {
    if (groupRows.filter(r => !r.name.trim()).length > 0) {
      showPopup({ type: "error", title: "Missing Names", message: "Please fill in all names or delete empty rows.", confirmText: "Fix It" });
      return;
    }

    const nameRegex = /^[\p{L}\s\-']+$/u;
    for (let i = 0; i < groupRows.length; i++) {
      const row = groupRows[i];
      const trimmedName = row.name.trim();

      if (trimmedName.length < 2 || !nameRegex.test(trimmedName)) {
        showPopup({
          type: "error",
          title: "Invalid Name",
          message: `Row ${i + 1} contains an invalid name: "${row.name}". Please use only real names (letters, spaces, hyphens).`,
          confirmText: "Fix It"
        });
        return;
      }
    }

    setLoading(true);
    try {
      for (const person of groupRows) {
        await addDoc(collection(db, "tickets"), {
          userId: auth.currentUser.uid,
          userName: person.name.trim().toUpperCase(),
          passType: person.type,
          price: getPrice(person.type),
          status: "pending",
          festivalYear: parseInt(selectedYear),
          purchaseDate: new Date().toISOString(),
          emailSentCount: 0,
          ticketID: "GRP" + Math.random().toString(36).substring(2, 7).toUpperCase()
        });
      }
      await saveRoster([{ id: Date.now(), name: "", type: "Full Pass" }]);
      setSelectedDrafts([]);
      showPopup({ type: "success", title: "Sent to Cart!", message: "Your drafted group has been moved to your cart.", confirmText: "Go to Cart", onConfirm: () => router.push("/cart") });
    } catch (e) {
      showPopup({ type: "error", title: "Error", message: e.message, confirmText: "Close" });
    } finally { setLoading(false); }
  };

  // --- PDF & EMAIL ---
  const handleDownloadPDF = async () => {
    const element = document.getElementById("ticket-to-download");
    if (!element) return;

    const controls = document.getElementById("ticket-controls");
    const dlIcon = document.getElementById("download-icon-btn");

    if (controls) controls.style.display = 'none';
    if (dlIcon) dlIcon.style.display = 'none';

    try {
      const { width, height } = element.getBoundingClientRect();

      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        skipFonts: true,
        style: { boxShadow: "none" }
      });

      const pdf = new jsPDF({
        orientation: "l",
        unit: "px",
        format: [width, height]
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
      pdf.save(`SalsaFest_Ticket_${fullScreenTicket.userName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      showPopup({ type: "error", title: "Export Error", message: err.message, confirmText: "Close" });
    } finally {
      if (controls) controls.style.display = '';
      if (dlIcon) dlIcon.style.display = '';
    }
  };

  const handleSendTicketEmail = async () => {
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

      const dataUrl = await toPng(element, {
        quality: 0.9,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        skipFonts: true,
        style: { boxShadow: "none" }
      });

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
      body: JSON.stringify({
        email: recipientEmail,
        ticket: fullScreenTicket,
        pdfAttachment: pdfBase64
      })
    }).catch(error => {
      console.error("🚨 BACKGROUND EMAIL ERROR:", error);
    });

    updateDoc(doc(db, "tickets", fullScreenTicket.id), { emailSentCount: (fullScreenTicket.emailSentCount || 0) + 1 }).catch(console.error);

    setFullScreenTicket(prev => ({ ...prev, emailSentCount: (prev.emailSentCount || 0) + 1 }));

    showPopup({
      type: "success",
      title: "Sent!",
      message: `The ticket to ${recipientEmail} has been queued and will arrive shortly.`,
      confirmText: "Done"
    });

    setRecipientEmail("");
    setSendingEmail(false);
  };

  const getTicketNameSize = (name) => {
    if (!name) return "text-3xl md:text-4xl";
    if (name.length > 25) return "text-xl md:text-2xl";
    if (name.length > 15) return "text-2xl md:text-3xl";
    return "text-3xl md:text-4xl";
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>;
  const currentTicketIndex = fullScreenTicket ? filteredHistory.findIndex(t => t.id === fullScreenTicket.id) : -1;

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
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-salsa-mint/10 text-salsa-mint flex items-center justify-center font-black shrink-0">1</div>
                <div><span className="font-bold text-slate-900 block text-sm font-montserrat">Draft Your Roster</span><span className="text-xs text-slate-500 font-montserrat">Add rows, input legal names, and select pass types. Changes are saved automatically.</span></div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-salsa-mint/10 text-salsa-mint flex items-center justify-center font-black shrink-0">2</div>
                <div><span className="font-bold text-slate-900 block text-sm font-montserrat">Fast Deletion (Drag to Select)</span><span className="text-xs text-slate-500 font-montserrat">Click and drag your mouse across the checkboxes to rapidly select multiple rows to delete.</span></div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-salsa-mint/10 text-salsa-mint flex items-center justify-center font-black shrink-0">3</div>
                <div><span className="font-bold text-slate-900 block text-sm font-montserrat">Send to Cart & Pay</span><span className="text-xs text-slate-500 font-montserrat">When your draft is ready, send it to the cart to checkout securely via Stripe.</span></div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-salsa-mint/10 text-salsa-mint flex items-center justify-center font-black shrink-0">4</div>
                <div><span className="font-bold text-slate-900 block text-sm font-montserrat">Send Tickets</span><span className="text-xs text-slate-500 font-montserrat">Go to the "Paid History" tab to open confirmed tickets and email them to your attendees.</span></div>
              </div>
            </div>
            <button onClick={() => setShowInfoModal(false)} className="w-full cursor-pointer bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-salsa-pink transition-colors text-xs uppercase tracking-widest font-montserrat">Got it</button>
          </div>
        </div>
      )}

      {/* --- MODAL: HORIZONTAL TICKET & ACTIONS --- */}
      {fullScreenTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setFullScreenTicket(null)}></div>

          <div className="relative w-fit max-w-[95vw] flex flex-col items-center gap-4 animate-in zoom-in duration-300 my-10 mx-auto">

            <button onClick={() => setFullScreenTicket(null)} className="cursor-pointer absolute -top-12 right-0 md:-right-4 text-white hover:text-salsa-pink hover:scale-110 hover:rotate-90 transition-all duration-300 bg-white/10 p-2 rounded-full backdrop-blur-md z-50">
              <X size={24} />
            </button>

            <div className="absolute top-1/2 -translate-y-1/2 -left-12 md:-left-20 hidden md:flex z-50">
              <button onClick={handlePrevTicket} disabled={currentTicketIndex <= 0} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/30 hover:scale-110 transition-all disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"><ChevronLeft size={32} /></button>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -right-12 md:-right-20 hidden md:flex z-50">
              <button onClick={handleNextTicket} disabled={currentTicketIndex >= filteredHistory.length - 1} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/30 hover:scale-110 transition-all disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"><ChevronRight size={32} /></button>
            </div>

            {/* TICKET CONTAINER */}
            <div
              id="ticket-to-download"
              className="w-[320px] md:w-[850px] flex-none bg-white rounded-[2.5rem] flex flex-col md:flex-row shadow-2xl relative overflow-hidden"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            >

              <button
                id="download-icon-btn"
                onClick={handleDownloadPDF}
                title="Download PDF"
                className="absolute top-6 right-6 md:top-8 md:right-8 z-50 p-3 bg-gray-50 hover:bg-salsa-mint hover:-translate-y-1 hover:shadow-lg text-gray-400 hover:text-white rounded-full transition-all duration-300 cursor-pointer shadow-sm border border-gray-100"
              >
                <Download size={20} />
              </button>

              <div className="p-8 md:p-12 flex items-center justify-center bg-salsa-mint/5 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-gray-200 relative shrink-0">
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                  <QRCodeSVG value={fullScreenTicket.ticketID} size={200} level="H" />
                </div>
              </div>

              <div className="p-8 md:p-10 flex flex-col justify-center flex-1 relative bg-white min-w-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-salsa-mint/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                <div className="mb-4 relative z-10">
                  <span className={`text-[12px] font-sans font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm inline-block ${getPassStyle(fullScreenTicket.passType)}`}>
                    {fullScreenTicket.passType}
                  </span>
                </div>

                <h2 className={`${getTicketNameSize(fullScreenTicket.userName)} font-black text-slate-900 uppercase leading-[1.1] tracking-tight mb-2 pr-12 whitespace-normal break-words relative z-10 w-full transition-all duration-300`}>
                  {fullScreenTicket.userName}
                </h2>

                <p className="font-mono text-gray-400 text-[11px] font-bold tracking-widest uppercase mb-8 relative z-10">
                  ID: {fullScreenTicket.ticketID}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-auto relative z-10">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Event Access</span>
                    <span className="block text-xs font-black text-slate-900 uppercase">Salsa Fest {fullScreenTicket.festivalYear}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Price Paid</span>
                    <span className="block text-xs font-black text-slate-900 uppercase">€{fullScreenTicket.price}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2 flex justify-between items-center">
                    <div>
                      <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Purchase Date</span>
                      <span className="block text-xs font-bold text-slate-900">{formatDate(fullScreenTicket.purchaseDate).date}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</span>
                      <span className="block text-xs font-bold text-slate-900">{formatDate(fullScreenTicket.purchaseDate).time}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* CONTROLS */}
            <div id="ticket-controls" className="w-full md:w-[700px] bg-white p-6 rounded-[2rem] shadow-2xl flex flex-col gap-4 mt-2">

              <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat">Email Status:</span>
                  <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full font-montserrat ${fullScreenTicket.emailSentCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {fullScreenTicket.emailSentCount > 0 ? `Sent ${fullScreenTicket.emailSentCount} Times` : 'Not Sent'}
                  </span>
                </div>
                <span className="text-[11px] font-black text-slate-300 md:hidden">{currentTicketIndex + 1} of {filteredHistory.length}</span>
              </div>

              <div className="border-t border-gray-50 pt-4">
                <label className="block text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat mb-2 px-1">
                  Attendee Email
                </label>
                <div className="relative flex items-center w-full">
                  <Mail className="absolute left-4 text-gray-400" size={16} />
                  <input
                    type="email"
                    maxLength={50}
                    placeholder="EMAIL"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-bold rounded-xl px-4 py-4 pl-12 pr-28 outline-none focus:bg-white focus:border-slate-900 transition-all text-[11px] uppercase tracking-widest font-montserrat"
                  />
                  <button
                    onClick={handleSendTicketEmail}
                    disabled={sendingEmail}
                    className="cursor-pointer absolute right-2 bg-salsa-pink text-white px-5 py-2.5 rounded-lg font-black text-[11px] uppercase hover:bg-pink-600 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2 font-montserrat shadow-sm"
                  >
                    {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Send</>}
                  </button>
                </div>
              </div>

              <div className="flex md:hidden justify-between pt-3 border-t border-gray-100 mt-2">
                <button onClick={handlePrevTicket} disabled={currentTicketIndex <= 0} className="flex items-center gap-1 text-[11px] font-black uppercase text-slate-500 disabled:opacity-30"><ChevronLeft size={14} /> Prev</button>
                <button onClick={handleNextTicket} disabled={currentTicketIndex >= filteredHistory.length - 1} className="flex items-center gap-1 text-[11px] font-black uppercase text-slate-500 disabled:opacity-30">Next <ChevronRight size={14} /></button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- MAIN DASHBOARD UI --- */}
      <div className="flex-grow max-w-7xl mx-auto px-6 w-full pt-32 pb-24">

        {/* HEADER */}
        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-30">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setShowInfoModal(true)} className="flex items-center gap-1.5 bg-white border border-gray-200 text-slate-500 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 hover:text-slate-900 transition-colors cursor-pointer shadow-sm">
                <Info size={14} /> Dashboard Guide
              </button>
            </div>
            <h1 className="font-bebas text-6xl md:text-7xl leading-none text-slate-900 uppercase">Dashboard</h1>
          </div>
          <div className="flex flex-col items-end w-full md:w-auto z-20">
            <label className="text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest">Festival Archive</label>
            <CustomDropdown
              value={selectedYear}
              onChange={setSelectedYear}
              options={[
                { label: 'SSF 2026', value: '2026' },
                { label: 'SSF 2025', value: '2025' },
                { label: 'SSF 2024', value: '2024' }
              ]}
              variant="compact"
            />
          </div>
        </div>

        {/* CONTROLS LEVEL 1: TABS */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-6 w-full">
          <div className="relative flex bg-slate-50 border border-gray-100 p-1.5 rounded-2xl w-full lg:w-80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)]">
            <div
              className="absolute top-1.5 bottom-1.5 w-[calc((100%-0.75rem)/2)] bg-slate-900 rounded-xl transition-all duration-300 ease-out shadow-sm"
              style={{ left: activeTab === 'draft' ? '0.375rem' : 'calc(0.375rem + (100% - 0.75rem) / 2)' }}
            />
            <button
              onClick={() => {
                setActiveTab("draft");
                setPassFilter("All");
                setSearchQuery("");
              }}
              className={`tab-button cursor-pointer ${activeTab === 'draft' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <UserPlus size={14} /> Draft Roster
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                setPassFilter("All");
                setSearchQuery("");
              }}
              className={`tab-button cursor-pointer ${activeTab === 'history' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <History size={14} /> Paid History
            </button>
          </div>
        </div>

        {/* CONTROLS LEVEL 2: SEARCH & FILTERS (Matches Admin Dashboard Layout) */}
        <div className="flex flex-col xl:flex-row gap-4 mb-8 w-full relative z-10">
          <div className="relative flex-grow group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
            <input
              type="text"
              maxLength={50}
              placeholder={`Search ${activeTab === 'draft' ? 'draft' : 'paid'} names...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full p-5 pl-14 bg-white border border-gray-200 rounded-2xl font-bold text-xs uppercase outline-none focus:border-slate-900 focus:shadow-md transition-all font-montserrat text-slate-900 shadow-sm"
            />
          </div>
          <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
            <div className="relative w-full md:w-auto">
              <CustomDropdown
                value={passFilter}
                onChange={setPassFilter}
                icon={Ticket}
                options={[
                  { label: 'All Passes', value: 'All', isPill: true, colorClass: getPassStyle('All') },
                  { label: 'Full Pass', value: 'Full Pass', isPill: true, colorClass: getPassStyle('Full Pass') },
                  { label: 'Party Pass', value: 'Party Pass', isPill: true, colorClass: getPassStyle('Party Pass') },
                  { label: 'Day Pass', value: 'Day Pass', isPill: true, colorClass: getPassStyle('Day Pass') },
                  ...(activeTab === 'history' ? [{ label: 'Free Pass', value: 'Free Pass', isPill: true, colorClass: getPassStyle('Free Pass') }] : [])
                ]}
                variant="filter"
              />
            </div>
          </div>
        </div>

        {/* DATA CONTAINER */}
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden min-h-[500px] flex flex-col z-0 relative">

          <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex flex-col flex-grow">

            {/* --- DRAFT TAB --- */}
            {activeTab === "draft" && (
              <div className="flex flex-col h-full">
                <div className="p-8 md:p-10 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-6 shrink-0 rounded-t-[3rem]">
                  <div>
                    <h2 className="font-bebas text-4xl text-slate-900 uppercase tracking-wide">Pending Group</h2>
                    <p className="text-xs font-medium text-slate-500 mt-1 font-montserrat">Draft names and select passes. Changes save automatically.</p>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat">Drafted:</span>
                      <span className={`font-bebas text-3xl leading-none ${groupRows.length >= 100 ? 'text-red-500' : 'text-slate-900'}`}>{groupRows.length}/100</span>
                    </div>

                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                      <input type="number" min="1" max="100" maxLength={3} value={bulkAddCount} onChange={(e) => setBulkAddCount(e.target.value)} className="w-16 px-3 py-2 text-xs font-bold text-center outline-none bg-transparent text-slate-900 font-montserrat" />
                      <button onClick={handleBulkAdd} className="cursor-pointer bg-slate-900 text-white px-4 py-2 rounded-lg font-black text-[11px] uppercase flex items-center justify-center gap-2 hover:bg-salsa-pink hover:scale-105 transition-all duration-300 font-montserrat"><Plus size={14} /> Add Rows</button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto w-full flex-grow pb-40">
                  <table className="w-full text-left border-separate border-spacing-0 min-w-[800px] font-montserrat relative">
                    <thead className="bg-white text-[11px] font-bold uppercase text-slate-400 tracking-widest relative z-10">
                      <tr>
                        <th className="p-6 pl-10 font-bold w-20 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-slate-900 rounded cursor-pointer hover:scale-110 transition-transform"
                              checked={selectedDrafts.length > 0 && selectedDrafts.length === filteredDrafts.length}
                              onChange={handleSelectAll}
                            />
                            {selectedDrafts.length > 0 && (
                              <span className="text-salsa-pink font-bold absolute ml-6 whitespace-nowrap">{selectedDrafts.length} Selected</span>
                            )}
                          </div>
                        </th>
                        <th className="p-6 font-bold w-1/3 border-b border-gray-100">Legal Name (As Per ID)</th>
                        <th className="p-6 font-bold text-center border-b border-gray-100">Pass Selection</th>
                        <th className="p-6 font-bold text-right w-32 border-b border-gray-100">Price</th>
                        <th className="p-6 pr-10 text-right font-bold w-24 border-b border-gray-100">
                          {selectedDrafts.length > 0 && (
                            <button onClick={confirmMassDelete} title="Delete Selected" className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg flex items-center justify-end ml-auto transition-colors cursor-pointer animate-in zoom-in">
                              <Trash2 size={24} />
                            </button>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="uppercase text-xs font-bold text-slate-900">
                      {filteredDrafts.map((row, index) => (
                        <tr
                          key={row.id}
                          className={`transition-colors group ${selectedDrafts.includes(row.id) ? 'bg-pink-100/50' : 'hover:bg-slate-50/50'}`}
                        >
                          <td
                            className="p-6 pl-10 cursor-pointer align-middle border-b border-gray-50"
                            onMouseDown={() => handleMouseDownOnRow(row.id)}
                            onMouseEnter={() => handleMouseEnterOnRow(row.id)}
                          >
                            <div className="flex items-center gap-4 pointer-events-none h-full mt-1">
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-slate-900 rounded cursor-pointer pointer-events-auto hover:scale-110 transition-transform"
                                checked={selectedDrafts.includes(row.id)}
                                readOnly
                              />
                              <span className={`text-[11px] font-black w-6 text-right ${selectedDrafts.includes(row.id) ? 'text-pink-600' : 'text-slate-500'}`}>{index + 1}.</span>
                            </div>
                          </td>
                          <td className="p-6 align-middle border-b border-gray-50">
                            <input
                              type="text"
                              maxLength={50}
                              value={row.name}
                              placeholder="FULL NAME"
                              onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:border-slate-900 font-bold uppercase text-xs text-slate-900 transition-all shadow-sm text-left font-montserrat"
                            />
                          </td>
                          <td className="p-6 align-middle border-b border-gray-50">
                            <div className="flex justify-center w-full">
                              <div className="relative flex items-center bg-gray-100 p-1.5 rounded-full w-full min-w-[320px] shadow-inner">
                                <div
                                  className={`absolute top-1.5 bottom-1.5 w-[calc((100%-0.75rem)/3)] rounded-full transition-all duration-300 ease-out shadow-sm ${getPassBgColor(row.type)}`}
                                  style={{ left: `calc(0.375rem + ${draftPassTypes.indexOf(row.type)} * ((100% - 0.75rem) / 3))` }}
                                />
                                {draftPassTypes.map((type) => (
                                  <button
                                    key={type}
                                    onClick={() => updateRow(row.id, 'type', type)}
                                    className={`relative z-10 flex-1 py-2 text-[11px] font-sans font-black uppercase tracking-widest transition-colors duration-300 cursor-pointer ${row.type === type ? getPassTextColor(type) : 'text-gray-400 hover:text-gray-700'
                                      }`}
                                  >
                                    {type}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="p-6 text-right font-bold text-base text-slate-700 align-middle border-b border-gray-50">
                            €{getPrice(row.type)}
                          </td>
                          <td className="p-6 pr-10 text-right align-middle border-b border-gray-50">
                            <div className="flex items-center justify-end h-full mt-1">
                              <button
                                onClick={() => confirmRemoveRow(row.id, row.name)}
                                title="Delete Row"
                                className="text-gray-400 opacity-40 group-hover:opacity-100 hover:!text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all duration-300 hover:scale-110"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredDrafts.length === 0 && (
                        <tr><td colSpan="5" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest font-montserrat border-b border-gray-50">No drafts found. Try adding rows or clearing filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-8 bg-slate-50 border-t border-gray-100 flex justify-end items-center gap-8 shrink-0 mt-auto rounded-b-[3rem] relative z-10">
                  <div className="text-right">
                    <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest font-montserrat">Total Amount</span>
                    <span className="block font-montserrat text-2xl font-black text-slate-900">€{draftTotal}</span>
                  </div>
                  <button onClick={submitGroupToCart} disabled={groupRows.length === 0 || groupRows.some(r => !r.name)} className="cursor-pointer bg-salsa-pink text-white font-black px-10 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all duration-300 tracking-widest text-[11px] uppercase flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed font-montserrat">
                    Send to Cart <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* --- HISTORY TAB --- */}
            {activeTab === "history" && (
              <div className="flex flex-col h-full">
                <div className="p-8 md:p-10 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 shrink-0 gap-6 rounded-t-[3rem]">
                  <div>
                    <h2 className="font-bebas text-4xl text-slate-900 uppercase tracking-wide">Paid Roster</h2>
                    <p className="text-xs font-medium text-slate-500 mt-1 font-montserrat">Confirmed attendees. Click any row to view and send the ticket.</p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-2">
                      <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat">Registered:</span>
                      <span className="font-bebas text-4xl leading-none text-slate-900">{filteredHistory.length}</span>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-2">
                      <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat">Total Paid:</span>
                      <span className="font-bebas text-4xl leading-none text-emerald-500">€{totalPaidRevenue}</span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto w-full flex-grow pb-40">
                  <table className="w-full text-left border-separate border-spacing-0 min-w-[950px] font-montserrat relative">
                    <thead className="bg-white text-[11px] font-bold uppercase text-slate-400 tracking-widest relative z-10">
                      <tr>
                        <th className="p-6 pl-10 font-bold w-1/4 border-b border-gray-100">Attendee Name</th>
                        <th className="p-6 font-bold w-56 border-b border-gray-100">Pass Type</th>
                        <th className="p-6 font-bold text-right w-32 border-b border-gray-100">Price</th>
                        {/* Increased width and added pl-16 to center Emailed perfectly without changing column order */}
                        <th className="p-6 pl-16 font-bold text-center w-56 border-b border-gray-100">Emailed</th>
                        <th className="p-6 pr-10 text-right font-bold w-40 border-b border-gray-100">Status</th>
                      </tr>
                    </thead>
                    <tbody className="uppercase text-xs font-bold text-slate-900">
                      {filteredHistory.map((t, i) => (
                        <tr key={t.id} onClick={() => setFullScreenTicket(t)} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                          <td className="p-6 pl-10 align-middle border-b border-gray-50">
                            <div className="flex items-center gap-4 h-full">
                              <span className="text-[11px] font-black text-slate-500 w-6 text-right group-hover:text-salsa-pink transition-colors">{i + 1}.</span>
                              <span className="block text-base font-bold font-montserrat text-slate-700 tracking-wide group-hover:text-salsa-pink transition-colors">{t.userName}</span>
                            </div>
                          </td>
                          <td className="p-6 align-middle border-b border-gray-50">
                            <span className={`px-5 py-2 rounded-full font-sans text-xs font-black tracking-widest shadow-sm inline-block ${getPassStyle(t.passType)}`}>
                              {t.passType}
                            </span>
                          </td>
                          <td className="p-6 text-base font-montserrat font-bold text-slate-700 tracking-wide text-right align-middle border-b border-gray-50">
                            €{t.price}
                          </td>
                          {/* Centers the content within its newly widened cell block */}
                          <td className="p-6 pl-16 text-center align-middle font-montserrat border-b border-gray-50">
                            <div className="flex items-center justify-center h-full">
                              {t.emailSentCount > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-full tracking-widest"><Mail size={12} /> {t.emailSentCount}</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black text-gray-300 px-3 py-1.5 tracking-widest"><Mail size={12} /> 0</span>
                              )}
                            </div>
                          </td>
                          <td className="p-6 pr-10 align-middle font-montserrat border-b border-gray-50">
                            <div className="flex items-center justify-end gap-4 h-full">
                              <div className={`flex items-center gap-1.5 text-xs font-black tracking-widest uppercase ${t.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {t.status === 'active' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                {t.status}
                              </div>
                              <div className="bg-white p-2 rounded-xl text-gray-400 group-hover:bg-salsa-pink group-hover:text-white transition-colors duration-300 shadow-sm border border-gray-200 group-hover:border-salsa-pink group-hover:scale-110" title="View Ticket">
                                <Eye size={16} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredHistory.length === 0 && (
                        <tr><td colSpan="5" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest font-montserrat border-b border-gray-50">No paid attendees found. Try clearing filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}