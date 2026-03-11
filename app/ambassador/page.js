"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, setDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { usePopup } from "@/components/PopupProvider";
import { 
  Users, Plus, Trash2, Search, Loader2, CheckCircle, CreditCard, 
  ShieldAlert, History, UserPlus, ArrowRight, Download, Send, X, Mail,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from 'html-to-image';
import jsPDF from "jspdf";

const getPassStyle = (type) => {
  switch(type) {
    case 'Full Pass': return 'bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-500/30';
    case 'Party Pass': return 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200 focus:ring-fuchsia-500/30';
    case 'Day Pass': return 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500/30';
    default: return 'bg-gray-50 text-slate-900 border-gray-200';
  }
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
  const [searchQuery, setSearchQuery] = useState("");
  
  const [fullScreenTicket, setFullScreenTicket] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const router = useRouter();
  const { showPopup } = usePopup();

  const prices = { "Full Pass": 150, "Party Pass": 80, "Day Pass": 60 };

  const filteredHistory = paidTickets.filter(t => 
    t.festivalYear?.toString() === selectedYear &&
    (t.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || t.ticketID?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // --- KEYBOARD NAVIGATION ---
  useEffect(() => {
    if (!fullScreenTicket) return;
    const handleKeyDown = (e) => {
      const currentIndex = filteredHistory.findIndex(t => t.id === fullScreenTicket.id);
      if (e.key === "ArrowRight" && currentIndex < filteredHistory.length - 1) {
        setFullScreenTicket(filteredHistory[currentIndex + 1]);
      } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        setFullScreenTicket(filteredHistory[currentIndex - 1]);
      }
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

  useEffect(() => {
    let unsubTickets = () => {};
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
        router.push("/login");
      }
    });
    return () => { unsubAuth(); unsubTickets(); };
  }, [router]);

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

  const removeRow = (id) => saveRoster(groupRows.filter(row => row.id !== id));
  const updateRow = (id, field, value) => saveRoster(groupRows.map(row => row.id === id ? { ...row, [field]: value } : row));

  const submitGroupToCart = async () => {
    if (groupRows.filter(r => !r.name.trim()).length > 0) {
      showPopup({ type: "error", title: "Missing Names", message: "Please fill in all names or delete empty rows.", confirmText: "Fix It" });
      return;
    }
    setLoading(true);
    try {
      for (const person of groupRows) {
        await addDoc(collection(db, "tickets"), {
          userId: auth.currentUser.uid,
          userName: person.name.trim().toUpperCase(),
          passType: person.type,
          price: prices[person.type],
          status: "pending",
          festivalYear: parseInt(selectedYear),
          purchaseDate: new Date().toISOString(),
          emailSentCount: 0, 
          ticketID: "GRP" + Math.random().toString(36).substring(2, 7).toUpperCase()
        });
      }
      await saveRoster([{ id: Date.now(), name: "", type: "Full Pass" }]);
      showPopup({ type: "success", title: "Sent to Cart!", message: "Your drafted group has been moved to your cart.", confirmText: "Go to Cart", onConfirm: () => router.push("/cart") });
    } catch (e) { 
      showPopup({ type: "error", title: "Error", message: e.message, confirmText: "Close" });
    } finally { setLoading(false); }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("ticket-to-download");
    if (!element) return;
    const controls = document.getElementById("ticket-controls");
    if (controls) controls.style.display = 'none';

    try {
      const dataUrl = await toPng(element, { quality: 1, pixelRatio: 3, backgroundColor: "#ffffff", skipFonts: true, style: { boxShadow: "none" } });
      const pdf = new jsPDF("l", "mm", "a4");
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SalsaFest_Ticket_${fullScreenTicket.userName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      showPopup({ type: "error", title: "Export Error", message: err.message, confirmText: "Close" });
    } finally {
      if (controls) controls.style.display = 'block'; 
    }
  };

  const handleSendTicketEmail = async () => {
    if (!recipientEmail || !/^\S+@\S+\.\S+$/.test(recipientEmail)) {
      showPopup({ type: "error", title: "Invalid Email", message: "Please enter a valid email address.", confirmText: "Try Again" });
      return;
    }
    setSendingEmail(true);
    try {
      const response = await fetch("/api/send-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recipientEmail, ticket: fullScreenTicket })
      });
      if (!response.ok) throw new Error("Failed to send email");

      await updateDoc(doc(db, "tickets", fullScreenTicket.id), { emailSentCount: (fullScreenTicket.emailSentCount || 0) + 1 });
      setFullScreenTicket(prev => ({ ...prev, emailSentCount: (prev.emailSentCount || 0) + 1 }));

      showPopup({ type: "success", title: "Sent!", message: `The ticket was successfully sent to ${recipientEmail}.`, confirmText: "Awesome" });
      setRecipientEmail(""); 
    } catch (error) {
      showPopup({ type: "error", title: "Delivery Failed", message: "We're setting up the email server. This feature will work once the backend route is active.", confirmText: "Close" });
    } finally { setSendingEmail(false); }
  };

  const filteredDrafts = groupRows.filter(r => r.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48}/></div>;
  const currentTicketIndex = fullScreenTicket ? filteredHistory.findIndex(t => t.id === fullScreenTicket.id) : -1;

  return (
    <main className="min-h-screen flex flex-col bg-salsa-white font-montserrat">
      <Navbar />

      {/* --- MODAL: HORIZONTAL TICKET & ACTIONS --- */}
      {fullScreenTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setFullScreenTicket(null)}></div>
          
          <div className="relative w-full max-w-3xl flex flex-col items-center gap-4 animate-in zoom-in duration-300 my-10">
            
            {/* CLOSE BUTTON */}
            <button onClick={() => setFullScreenTicket(null)} className="cursor-pointer absolute -top-12 right-0 md:-right-4 text-white hover:text-salsa-pink transition bg-white/10 p-2 rounded-full backdrop-blur-md z-50">
              <X size={24} />
            </button>

            {/* FLOATING NAVIGATION ARROWS (Desktop) */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-12 md:-left-20 hidden md:flex z-50">
               <button onClick={handlePrevTicket} disabled={currentTicketIndex <= 0} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"><ChevronLeft size={32}/></button>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -right-12 md:-right-20 hidden md:flex z-50">
               <button onClick={handleNextTicket} disabled={currentTicketIndex >= filteredHistory.length - 1} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"><ChevronRight size={32}/></button>
            </div>
            
            {/* HORIZONTAL TICKET TO DOWNLOAD */}
            <div 
              id="ticket-to-download" 
              className="w-full bg-white rounded-[2.5rem] flex flex-col md:flex-row shadow-2xl relative overflow-hidden"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }} 
            >
              
              {/* LEFT SIDE: QR CODE */}
              <div className="p-8 md:p-12 flex items-center justify-center bg-salsa-mint/5 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-gray-200 relative">
                 <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                   <QRCodeSVG value={fullScreenTicket.ticketID} size={200} level="H" />
                 </div>
                 {/* Removed the black quarter-circle cutouts */}
              </div>
              
              {/* RIGHT SIDE: TICKET INFO */}
              <div className="p-8 md:p-10 flex flex-col justify-center flex-1 relative bg-white">
                <div className="absolute top-0 right-0 w-32 h-32 bg-salsa-mint/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                
                <div className="mb-4 relative z-10">
                  <span className={`text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border-2 ${getPassStyle(fullScreenTicket.passType)}`}>
                    {fullScreenTicket.passType}
                  </span>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase leading-[1.1] tracking-tight mb-2 pr-4 break-words relative z-10">
                  {fullScreenTicket.userName}
                </h2>
                
                <p className="font-mono text-gray-400 text-[11px] font-bold tracking-widest uppercase mb-8 relative z-10">
                  REF: {fullScreenTicket.ticketID}
                </p>
                
                {/* INFO GRID */}
                <div className="grid grid-cols-2 gap-3 mt-auto relative z-10">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Event Access</span>
                    <span className="block text-xs font-black text-slate-900 uppercase">Salsa Fest {fullScreenTicket.festivalYear}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Price Paid</span>
                    <span className="block text-xs font-black text-slate-900 uppercase">€{fullScreenTicket.price}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2 flex justify-between items-center">
                    <div>
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Purchase Date</span>
                      <span className="block text-xs font-bold text-slate-900">{formatDate(fullScreenTicket.purchaseDate).date}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</span>
                      <span className="block text-xs font-bold text-slate-900">{formatDate(fullScreenTicket.purchaseDate).time}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* CONTROLS */}
            <div id="ticket-controls" className="w-full bg-white p-6 rounded-[2rem] shadow-2xl flex flex-col gap-4">
              
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email Status:</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md ${fullScreenTicket.emailSentCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {fullScreenTicket.emailSentCount > 0 ? `Sent ${fullScreenTicket.emailSentCount} Times` : 'Not Sent'}
                  </span>
                </div>
                
                {/* Mobile-only counter (since arrows are hidden on mobile) */}
                <span className="text-[10px] font-black text-slate-300 md:hidden">{currentTicketIndex + 1} of {filteredHistory.length}</span>
              </div>

              {/* Action Buttons */}
              <div className="grid md:grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                <button onClick={handleDownloadPDF} className="cursor-pointer w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-md hover:bg-slate-800 transition-all tracking-widest flex items-center justify-center gap-2 text-[10px] uppercase">
                  <Download size={16}/> Download PDF
                </button>

                <div className="relative flex items-center">
                  <Mail className="absolute left-4 text-gray-400" size={16} />
                  <input 
                    type="email" placeholder="SEND TO EMAIL..." value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-bold rounded-xl px-4 py-4 pl-12 pr-24 outline-none focus:bg-white focus:ring-2 ring-salsa-pink/30 transition-all text-[10px] uppercase tracking-widest" 
                  />
                  <button onClick={handleSendTicketEmail} disabled={sendingEmail} className="cursor-pointer absolute right-2 bg-salsa-pink text-white px-5 py-2.5 rounded-lg font-black text-[10px] uppercase hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14}/> Send</>}
                  </button>
                </div>
              </div>
              
              {/* Mobile Arrow Navigation */}
              <div className="flex md:hidden justify-between pt-3 border-t border-gray-100 mt-2">
                 <button onClick={handlePrevTicket} disabled={currentTicketIndex <= 0} className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 disabled:opacity-30"><ChevronLeft size={14}/> Prev</button>
                 <button onClick={handleNextTicket} disabled={currentTicketIndex >= filteredHistory.length - 1} className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 disabled:opacity-30">Next <ChevronRight size={14}/></button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- MAIN DASHBOARD UI --- */}
      <div className="flex-grow max-w-7xl mx-auto px-6 w-full pt-32 pb-24">
        
        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="text-salsa-pink" size={24} />
              <span className="text-[10px] font-black text-salsa-pink uppercase tracking-widest bg-salsa-pink/10 px-3 py-1 rounded-full">Ambassador Portal</span>
            </div>
            <h1 className="font-bebas text-6xl md:text-7xl tracking-tighter leading-none text-slate-900 uppercase">Group Dashboard</h1>
          </div>
          <div className="flex flex-col items-end">
            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Festival Year</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-white border-2 border-slate-200 p-2.5 px-6 rounded-xl text-xs font-black uppercase outline-none shadow-sm cursor-pointer hover:border-salsa-pink transition-all text-slate-900">
                <option value="2026">Varna 2026</option>
                <option value="2025">Archive 2025</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-full md:w-auto">
             <button onClick={() => setActiveTab("draft")} className={`cursor-pointer flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'draft' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-gray-50'}`}><UserPlus size={14}/> Draft Roster</button>
             <button onClick={() => setActiveTab("history")} className={`cursor-pointer flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-gray-50'}`}><History size={14}/> Paid History</button>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
            <input type="text" placeholder={`Search ${activeTab === 'draft' ? 'draft' : 'paid'} names...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full p-3.5 pl-12 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 ring-salsa-pink/20 font-bold text-xs uppercase text-slate-900 transition-all shadow-sm" />
          </div>
        </div>

        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden animate-in fade-in duration-500">
          
          {activeTab === "draft" && (
            <div className="flex flex-col h-full">
              <div className="p-8 md:p-10 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-6">
                <div>
                  <h2 className="font-bebas text-4xl text-slate-900 uppercase tracking-wide">Pending Group</h2>
                  <p className="text-xs font-medium text-slate-500 mt-1">Draft names and select passes. Changes save automatically.</p>
                </div>
                
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Drafted:</span>
                    <span className={`font-bebas text-3xl leading-none ${groupRows.length >= 100 ? 'text-red-500' : 'text-slate-900'}`}>{groupRows.length}/100</span>
                  </div>

                  <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                    <input type="number" min="1" max="100" value={bulkAddCount} onChange={(e) => setBulkAddCount(e.target.value)} className="w-16 px-3 py-2 text-xs font-bold text-center outline-none bg-transparent text-slate-900" />
                    <button onClick={handleBulkAdd} className="cursor-pointer bg-slate-900 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-salsa-pink transition-all"><Plus size={14}/> Add Rows</button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto w-full min-h-[400px]">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-white text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-gray-100">
                    <tr>
                      <th className="p-6 pl-10 font-bold">Legal Name (As Per ID)</th>
                      <th className="p-6 font-bold w-1/3">Pass Selection</th>
                      <th className="p-6 pr-10 text-right font-bold w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredDrafts.map((row, index) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4 pl-10">
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-slate-300 w-6 text-right">{index + 1}.</span>
                            <input type="text" value={row.name} placeholder="E.G. IVAN GEORGIEV" onChange={(e) => updateRow(row.id, 'name', e.target.value)} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 ring-salsa-pink/20 font-bold uppercase text-xs text-slate-900 transition-all" />
                          </div>
                        </td>
                        <td className="p-4">
                          <select value={row.type} onChange={(e) => updateRow(row.id, 'type', e.target.value)} className={`w-full p-3.5 border rounded-xl font-bold text-xs uppercase outline-none cursor-pointer transition-all ${getPassStyle(row.type)}`}>
                            <option value="Full Pass" className="bg-white text-slate-900">Full Pass - €150</option>
                            <option value="Party Pass" className="bg-white text-slate-900">Party Pass - €80</option>
                            <option value="Day Pass" className="bg-white text-slate-900">Day Pass - €60</option>
                          </select>
                        </td>
                        <td className="p-4 pr-10 text-right">
                          <button onClick={() => removeRow(row.id)} className="cursor-pointer text-gray-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-all"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    ))}
                    {filteredDrafts.length === 0 && (
                      <tr><td colSpan="3" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No drafts found. Add rows to begin.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-8 bg-slate-50 border-t border-gray-100 flex justify-end sticky bottom-0 z-10">
                <button onClick={submitGroupToCart} disabled={groupRows.length === 0 || groupRows.some(r => !r.name)} className="cursor-pointer bg-salsa-pink text-white font-black px-10 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all tracking-widest text-[10px] uppercase flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed">
                  Send to Cart <ArrowRight size={16}/>
                </button>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="flex flex-col h-full">
              <div className="p-8 md:p-10 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="font-bebas text-4xl text-slate-900 uppercase tracking-wide">Paid Roster</h2>
                  <p className="text-xs font-medium text-slate-500 mt-1">Confirmed attendees. Click any row to view and send the ticket.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Paid:</span>
                    <span className="font-bebas text-4xl leading-none text-emerald-500">{filteredHistory.length}</span>
                </div>
              </div>
              
              <div className="overflow-x-auto w-full min-h-[400px]">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-white text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-gray-100">
                    <tr>
                      <th className="p-6 pl-10 font-bold">Attendee Name</th>
                      <th className="p-6 font-bold">Pass Type</th>
                      <th className="p-6 font-bold text-center">Emailed</th>
                      <th className="p-6 pr-10 text-right font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 uppercase text-xs font-bold text-slate-900">
                    {filteredHistory.map((t, i) => (
                      <tr key={t.id} onClick={() => setFullScreenTicket(t)} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                        <td className="p-6 pl-10 flex items-center gap-4">
                          <span className="text-[10px] font-black text-slate-300 w-6 text-right group-hover:text-salsa-pink transition-colors">{i + 1}.</span>
                          <span className="group-hover:text-salsa-pink transition-colors">{t.userName}</span>
                        </td>
                        <td className="p-6">
                           <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest border ${getPassStyle(t.passType)}`}>{t.passType}</span>
                        </td>
                        <td className="p-6 text-center">
                          {t.emailSentCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-md tracking-widest"><Mail size={12}/> {t.emailSentCount}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-gray-300 px-2.5 py-1 tracking-widest"><Mail size={12}/> 0</span>
                          )}
                        </td>
                        <td className="p-6 pr-10 text-right">
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest group-hover:bg-emerald-100 transition-colors">
                            <CheckCircle size={12}/> PAID
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredHistory.length === 0 && (
                      <tr><td colSpan="4" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No paid attendees found for {selectedYear}.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}