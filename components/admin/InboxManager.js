"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { usePopup } from "@/components/PopupProvider"; 
import Button from "@/components/Button";
import { Trash2, Search, ArrowLeft, Send, CornerUpLeft, Mail, Loader2, X, CheckSquare } from "lucide-react";


export default function InboxManager() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [isReplying, setIsReplying] = useState(false); 
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(true);

  const { showPopup } = usePopup();

  useEffect(() => {
    const q = query(collection(db, "contact_messages"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
      if (selectedMessage) {
        const updatedSelected = msgs.find(m => m.id === selectedMessage.id);
        if (updatedSelected) setSelectedMessage(updatedSelected);
      }
    });
    return () => unsubscribe();
  }, [selectedMessage]);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleMouseDownOnRow = (id, e) => {
    e.stopPropagation(); 
    setIsDragging(true);
    const isCurrentlySelected = selectedIds.includes(id);
    const newDragMode = !isCurrentlySelected;
    setDragMode(newDragMode);
    if (newDragMode) setSelectedIds(prev => [...new Set([...prev, id])]);
    else setSelectedIds(prev => prev.filter(rowId => rowId !== id));
  };

  const handleMouseEnterOnRow = (id) => {
    if (!isDragging) return;
    if (dragMode) setSelectedIds(prev => [...new Set([...prev, id])]);
    else setSelectedIds(prev => prev.filter(rowId => rowId !== id));
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(filteredMessages.map(m => m.id));
    else setSelectedIds([]);
  };

  // For Gmail Mobile Style Selection
  const toggleMobileSelection = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredMessages = messages.filter(msg => {
    const matchesFilter = filter === "all" || msg.status === filter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      msg.name?.toLowerCase().includes(searchLower) || 
      msg.email?.toLowerCase().includes(searchLower) ||
      msg.subject?.toLowerCase().includes(searchLower) ||
      msg.message?.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  const markAsRead = async (msg) => {
    if (msg.status === "unread") await updateDoc(doc(db, "contact_messages", msg.id), { status: "read" });
    setSelectedMessage({ ...msg, status: "read" });
    setReplyText("");
    setIsReplying(false); 
    setSelectedIds([]); 
  };

  const deleteMessage = async (id, e) => {
    e?.stopPropagation();
    showPopup({
      type: "info", title: "Delete Message?", message: "Are you sure you want to permanently delete this message?", confirmText: "Yes, Delete", cancelText: "Cancel",
      onConfirm: async () => {
        await deleteDoc(doc(db, "contact_messages", id));
        if (selectedMessage?.id === id) { setSelectedMessage(null); setIsReplying(false); }
      }
    });
  };

  const handleMassDelete = () => {
    showPopup({
      type: "info", title: "Mass Delete", message: `Are you sure you want to permanently delete ${selectedIds.length} messages?`, confirmText: "Yes, Delete All", cancelText: "Cancel",
      onConfirm: async () => {
        await Promise.all(selectedIds.map(id => deleteDoc(doc(db, "contact_messages", id))));
        setSelectedIds([]);
        showPopup({ type: "success", title: "Deleted", message: `${selectedIds.length} messages removed.` });
      }
    });
  };

  const handleMassMarkRead = async () => {
    const unreadSelected = filteredMessages.filter(m => selectedIds.includes(m.id) && m.status === 'unread');
    if (unreadSelected.length === 0) { setSelectedIds([]); return; }
    await Promise.all(unreadSelected.map(m => updateDoc(doc(db, "contact_messages", m.id), { status: "read" })));
    setSelectedIds([]);
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const response = await fetch('/api/send-reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedMessage.email, name: selectedMessage.name, subject: selectedMessage.subject || selectedMessage.category, replyText: replyText, originalMessage: selectedMessage.message })
      });
      if (!response.ok) throw new Error("API Route Failed");

      let currentReplies = selectedMessage.adminReplies || [];
      if (currentReplies.length === 0 && selectedMessage.adminReply) currentReplies.push({ text: selectedMessage.adminReply, repliedAt: selectedMessage.repliedAt });
      
      const timestamp = new Date().toISOString();
      currentReplies.push({ text: replyText, repliedAt: timestamp });

      await updateDoc(doc(db, "contact_messages", selectedMessage.id), { status: "replied", adminReplies: currentReplies, repliedAt: timestamp });
      
      setReplyText(""); setIsReplying(false);
      showPopup({ type: "success", title: "Sent!", message: "Your reply has been sent successfully." });
    } catch (err) {
      console.error(err);
      showPopup({ type: "error", title: "Sending Failed", message: "Failed to send email." });
    } finally {
      setSendingReply(false);
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  if (loading) return <div className="flex justify-center items-center min-h-[600px]"><Loader2 className="animate-spin text-salsa-pink" size={32} /></div>;

  const displayReplies = selectedMessage?.adminReplies ? [...selectedMessage.adminReplies] : (selectedMessage?.adminReply ? [{ text: selectedMessage.adminReply, repliedAt: selectedMessage.repliedAt }] : []);

  return (
    <div className="bg-white md:rounded-[3rem] rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] min-h-[600px] font-montserrat flex flex-col select-none overflow-hidden">
      
      {!selectedMessage ? (
        <div className="flex flex-col animate-in fade-in duration-300">
          
          {/* HEADER */}
          {selectedIds.length > 0 ? (
            <div className="px-4 md:px-6 py-4 md:h-[88px] border-b border-slate-200 bg-slate-100 flex justify-between items-center transition-all">
              <div className="flex items-center gap-2 md:gap-4">
                 <button onClick={() => setSelectedIds([])} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"><X size={20} /></button>
                 <span className="text-xs md:text-sm font-bold text-slate-900">{selectedIds.length} selected</span>
              </div>
              <div className="flex gap-2 md:gap-3">
                 <button onClick={handleMassMarkRead} className="px-3 md:px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer flex items-center gap-2 shadow-sm">
                   <CheckSquare size={14} className="hidden md:block"/> Read
                 </button>
                 <button onClick={handleMassDelete} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 text-slate-400 transition-colors cursor-pointer shadow-sm">
                   <Trash2 size={18} />
                 </button>
              </div>
            </div>
          ) : (
            <div className="px-4 md:px-6 py-4 md:h-[88px] border-b border-gray-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4 transition-all">
              <div className="relative flex bg-slate-50 border border-gray-100 p-1 rounded-xl w-full md:w-[320px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)]">
                <div
                  className="absolute top-1 bottom-1 w-[calc((100%-0.5rem)/3)] bg-slate-900 rounded-lg transition-all duration-300 ease-out shadow-sm"
                  style={{ left: filter === 'all' ? '0.25rem' : filter === 'unread' ? 'calc(0.25rem + (100% - 0.5rem) / 3)' : 'calc(0.25rem + ((100% - 0.5rem) / 3) * 2)' }}
                />
                {['all', 'unread', 'replied'].map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`relative z-10 flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 cursor-pointer ${filter === f ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}>{f}</button>
                ))}
              </div>
              <div className="relative w-full md:w-[400px] flex items-center">
                <Search className="absolute left-4 text-slate-800" size={16} />
                <input 
                  type="text" placeholder="Search emails..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-900 transition-colors"
                />
              </div>
            </div>
          )}

          <div className="bg-white">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
                <Mail size={48} className="mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Inbox is empty</p>
              </div>
            ) : (
              <>
                {/* --- DESKTOP TABLE VIEW --- */}
                <div className="hidden md:block overflow-x-auto w-full pb-10">
                  <div className="min-w-[900px]">
                    <div className="flex items-center px-0 py-4 border-b border-gray-100 bg-white text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <div className="w-16 flex justify-center shrink-0">
                        <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === filteredMessages.length} className="w-4 h-4 rounded border-gray-300 accent-slate-900 cursor-pointer" />
                      </div>
                      <div className="w-48">Sender</div>
                      <div className="flex-1">Message</div>
                      <div className="w-32 text-center">Category</div>
                      <div className="w-32 text-right pr-8">Date</div>
                    </div>
                    {filteredMessages.map((msg) => {
                      const isUnread = msg.status === "unread";
                      const isSelected = selectedIds.includes(msg.id);
                      return (
                        <div key={msg.id} onClick={() => markAsRead(msg)} className={`flex items-stretch border-b border-gray-50 cursor-pointer transition-colors group ${isSelected ? '!bg-slate-200/60' : isUnread ? 'bg-white hover:bg-slate-50/50' : 'bg-slate-50/30 hover:bg-slate-100/50'}`}>
                          <div className="w-16 flex justify-center items-center shrink-0 cursor-pointer hover:bg-slate-200/50" onMouseDown={(e) => handleMouseDownOnRow(msg.id, e)} onMouseEnter={() => handleMouseEnterOnRow(msg.id)} onClick={(e) => e.stopPropagation()}>
                             <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 rounded border-gray-300 accent-slate-900 pointer-events-none" />
                          </div>
                          <div className={`w-48 pr-4 py-5 flex items-center gap-3 font-bold ${isUnread ? 'text-slate-900' : 'text-slate-500'}`}>
                            {isUnread ? <div className="w-2.5 h-2.5 rounded-full bg-salsa-pink shrink-0"></div> : <div className="w-2.5 h-2.5 shrink-0"></div>}
                            <span className="truncate text-sm tracking-wide">{msg.name}</span>
                          </div>
                          <div className="flex-1 truncate pr-6 py-5 flex items-center text-sm">
                            <span className={`${isUnread ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>{msg.subject || msg.category}</span>
                            <span className="text-slate-400 ml-2 text-xs font-medium">- {msg.message}</span>
                          </div>
                          <div className="w-32 py-5 flex justify-center items-center">
                            <span className={`text-[11px] px-3 py-1 rounded-md uppercase font-bold tracking-wider ${msg.category === "Tickets" ? 'bg-blue-50 text-blue-600' : msg.category === "Other" ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-600'}`}>{msg.category}</span>
                          </div>
                          <div className={`w-32 pr-8 py-5 flex items-center justify-end text-xs truncate ${isUnread ? 'font-bold text-salsa-pink' : 'font-semibold text-slate-400'}`}>
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* --- MOBILE GMAIL-STYLE LIST VIEW --- */}
                <div className="block md:hidden w-full pb-10">
                  {filteredMessages.map((msg) => {
                    const isUnread = msg.status === "unread";
                    const isSelected = selectedIds.includes(msg.id);
                    return (
                      <div key={msg.id} onClick={() => markAsRead(msg)} className={`flex items-start gap-3 p-4 border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-slate-200/50' : isUnread ? 'bg-white' : 'bg-slate-50/50'}`}>
                        
                        {/* Interactive Avatar / Checkbox */}
                        <div onClick={(e) => toggleMobileSelection(msg.id, e)} className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-base font-black transition-all cursor-pointer ${isSelected ? 'bg-slate-900 text-white scale-105' : isUnread ? 'bg-salsa-pink/10 text-salsa-pink' : 'bg-slate-100 text-slate-400'}`}>
                           {isSelected ? <CheckSquare size={18} /> : msg.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Email Content */}
                        <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                          <div className="flex justify-between items-baseline mb-0.5">
                             <span className={`truncate pr-2 text-[15px] ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>{msg.name}</span>
                             <span className={`shrink-0 text-[10px] ${isUnread ? 'font-black text-salsa-pink' : 'font-bold text-slate-400'}`}>{formatTime(msg.createdAt)}</span>
                          </div>
                          <div className={`text-sm truncate mb-0.5 pr-2 ${isUnread ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                             {msg.subject || msg.category}
                          </div>
                          <div className="text-xs text-slate-400 truncate pr-4">
                             {msg.message}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        
        /* VIEW 2: THE EMAIL DETAIL & REPLY */
        <div className="flex flex-col animate-in slide-in-from-right-8 duration-300">
          
          <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <button onClick={() => { setSelectedMessage(null); setIsReplying(false); setReplyText(""); }} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={(e) => deleteMessage(selectedMessage.id, e)} className="p-2 md:p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer" title="Delete">
              <Trash2 size={18} />
            </button>
          </div>

          <div className="bg-white p-5 md:p-14 text-auto select-text">
            <h2 className="text-3xl md:text-5xl font-bebas text-slate-900 mb-6 md:mb-8 tracking-wide leading-none">{selectedMessage.subject || selectedMessage.category}</h2>
            
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg md:text-xl shrink-0">
                {selectedMessage.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-2">
                  <span className="font-bold text-slate-900 text-sm md:text-base tracking-wide truncate">{selectedMessage.name}</span>
                  <span className="text-[11px] md:text-xs text-slate-500 font-medium truncate">&lt;{selectedMessage.email}&gt;</span>
                </div>
                <div className="text-[10px] md:text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-wider">
                  {new Date(selectedMessage.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
              {selectedMessage.message}
            </div>

            {displayReplies.length > 0 && (
              <div className="mt-10 md:mt-14 flex flex-col gap-4 md:gap-6">
                {displayReplies.map((reply, idx) => (
                  <div key={idx} className="bg-slate-50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100 px-5 md:px-8 py-3 md:py-4 border-b border-gray-200 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <div className="flex items-center gap-2"><CornerUpLeft size={14} /> Your Reply {displayReplies.length > 1 ? `#${idx + 1}` : ''}</div>
                    </div>
                    <div className="p-5 md:p-8 text-sm text-slate-700 whitespace-pre-wrap font-medium leading-relaxed">
                      {reply.text}
                    </div>
                    <div className="px-5 md:px-8 pb-5 md:pb-8 pt-0 text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      Sent on {new Date(reply.repliedAt).toLocaleString()}
                    </div>
                  </div>
               ))}
              </div>
            )}
          </div>

          <div className="p-4 md:p-8 border-t border-gray-100 bg-white">
            {!isReplying ? (
              <div className="flex justify-start">
                <button onClick={() => setIsReplying(true)} className="bg-white border border-gray-200 text-slate-700 px-6 md:px-8 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer shadow-sm">
                  <CornerUpLeft size={16} className="text-slate-400" /> Reply
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden focus-within:border-slate-900 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-slate-50 px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex justify-between items-center text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <div className="flex items-center gap-2 truncate"><CornerUpLeft size={14} className="shrink-0" /> Replying to {selectedMessage.name.split(' ')[0]}</div>
                  <button onClick={() => { setIsReplying(false); setReplyText(""); }} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer" title="Cancel"><X size={16} /></button>
                </div>
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} maxLength={5000} placeholder="Type your reply here..." className="w-full p-4 md:p-6 min-h-[140px] max-h-[300px] outline-none text-sm text-slate-700 font-medium resize-y" autoFocus />
                <div className="px-4 md:px-6 py-3 md:py-4 bg-white flex justify-between items-center border-t border-gray-50 gap-2">
                  <span className={`text-[9px] md:text-[10px] font-bold tracking-widest uppercase ${replyText.length >= 5000 ? 'text-red-500' : 'text-slate-400'}`}>{replyText.length} / 5000</span>
                  <div className="flex items-center gap-2 md:gap-4">
                    <button onClick={() => { setIsReplying(false); setReplyText(""); }} className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors cursor-pointer px-2">Cancel</button>
                    <button onClick={handleSendReply} disabled={sendingReply || !replyText.trim()} className="bg-slate-900 text-white px-5 md:px-8 py-2.5 md:py-3.5 rounded-xl text-[10px] md:text-[11px] font-bold uppercase tracking-wider hover:bg-salsa-pink disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm">
                      {sendingReply ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />} Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}