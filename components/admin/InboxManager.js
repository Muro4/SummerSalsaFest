"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { usePopup } from "@/components/PopupProvider"; 
import { Trash2, Search, ArrowLeft, Send, CornerUpLeft, Mail, Loader2 } from "lucide-react";

export default function InboxManager() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  
  const { showPopup } = usePopup();

  // 1. REAL-TIME LISTENER
  useEffect(() => {
    const q = query(collection(db, "contact_messages"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoading(false);
      
      if (selectedMessage) {
        const updatedSelected = msgs.find(m => m.id === selectedMessage.id);
        if (updatedSelected) setSelectedMessage(updatedSelected);
      }
    });

    return () => unsubscribe();
  }, [selectedMessage]);

  // 2. ACTIONS
  const markAsRead = async (msg) => {
    if (msg.status === "unread") {
      await updateDoc(doc(db, "contact_messages", msg.id), { status: "read" });
    }
    setSelectedMessage({ ...msg, status: "read" });
    setReplyText("");
  };

  const deleteMessage = async (id, e) => {
    e?.stopPropagation();
    showPopup({
      type: "info",
      title: "Delete Message?",
      message: "Are you sure you want to permanently delete this message?",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        await deleteDoc(doc(db, "contact_messages", id));
        if (selectedMessage?.id === id) setSelectedMessage(null);
      }
    });
  };

  // --- THE NEW NODEMAILER LOGIC ---
  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSendingReply(true);

    try {
      const response = await fetch('/api/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedMessage.email,
          name: selectedMessage.name,
          subject: selectedMessage.subject || selectedMessage.category,
          replyText: replyText,
          originalMessage: selectedMessage.message
        })
      });

      if (!response.ok) throw new Error("API Route Failed");

      // Update Firestore to show it was replied to
      await updateDoc(doc(db, "contact_messages", selectedMessage.id), { 
        status: "replied",
        adminReply: replyText,
        repliedAt: new Date().toISOString()
      });
      
      setReplyText("");
      showPopup({ type: "success", title: "Sent!", message: "Your reply has been sent successfully." });
      setSelectedMessage(null); 
    } catch (err) {
      console.error("Failed to send reply:", err);
      showPopup({ type: "error", title: "Sending Failed", message: "Failed to send email. Check server logs." });
    } finally {
      setSendingReply(false);
    }
  };

  // 3. FILTERING
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

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) return <div className="flex justify-center items-center h-[600px]"><Loader2 className="animate-spin text-salsa-pink" size={32} /></div>;

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 h-[700px] overflow-hidden font-montserrat flex flex-col">
      
      {/* VIEW 1: THE INBOX LIST */}
      {!selectedMessage ? (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
          <div className="p-4 border-b border-gray-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
            <div className="flex gap-2 w-full md:w-auto">
              {['all', 'unread', 'replied'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)} 
                  className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${filter === f ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-500 border border-gray-200 hover:border-slate-400'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-80 flex items-center">
              <Search className="absolute left-4 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search emails..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-salsa-pink transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Mail size={48} className="mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Inbox is empty</p>
              </div>
            ) : (
              <div className="min-w-[800px]">
                <div className="flex items-center px-6 py-3 border-b border-gray-100 bg-white text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <div className="w-48">Sender</div>
                  <div className="flex-1">Message</div>
                  <div className="w-32 text-center">Category</div>
                  <div className="w-24 text-right">Date</div>
                </div>

                {filteredMessages.map((msg) => {
                  const isUnread = msg.status === "unread";
                  return (
                    <div 
                      key={msg.id} 
                      onClick={() => markAsRead(msg)}
                      className={`flex items-center px-6 py-4 border-b border-gray-50 cursor-pointer transition-colors hover:shadow-md hover:z-10 relative
                        ${isUnread ? 'bg-white' : 'bg-slate-50/30'}
                      `}
                    >
                      <div className={`w-48 pr-4 flex items-center gap-2 ${isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                        {isUnread ? <div className="w-2 h-2 rounded-full bg-salsa-pink shrink-0"></div> : <div className="w-2 h-2 shrink-0"></div>}
                        <span className="truncate">{msg.name}</span>
                      </div>

                      <div className="flex-1 truncate pr-4 text-sm">
                        <span className={`${isUnread ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
                          {msg.subject || msg.category}
                        </span>
                        <span className="text-slate-400 ml-2 text-xs">
                          - {msg.message}
                        </span>
                      </div>

                      <div className="w-32 flex justify-center">
                        <span className={`text-[9px] px-2.5 py-1 rounded-md uppercase font-black tracking-widest ${msg.category === "Tickets" ? 'bg-blue-50 text-blue-600' : msg.category === "Other" ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {msg.category}
                        </span>
                      </div>

                      <div className={`w-24 text-right text-xs truncate ${isUnread ? 'font-bold text-salsa-pink' : 'font-medium text-slate-400'}`}>
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        
        /* VIEW 2: THE EMAIL DETAIL & REPLY */
        <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
          
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
            <button 
              onClick={() => setSelectedMessage(null)} 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:border-slate-400 transition-colors"
            >
              <ArrowLeft size={16} /> Back to Inbox
            </button>
            <button onClick={(e) => deleteMessage(selectedMessage.id, e)} className="p-2 text-gray-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors" title="Delete">
              <Trash2 size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-white p-8 md:p-12">
            <h2 className="text-3xl font-bebas text-slate-900 mb-8 tracking-wide">{selectedMessage.subject || selectedMessage.category}</h2>
            
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg shrink-0">
                {selectedMessage.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{selectedMessage.name}</span>
                  <span className="text-xs text-slate-500 font-medium">&lt;{selectedMessage.email}&gt;</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 font-medium">
                  {new Date(selectedMessage.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
              {selectedMessage.message}
            </div>

            {/* THE FIXED "YOUR REPLY" BLOCK (No Absolute Positioning Overlaps!) */}
            {selectedMessage.adminReply && (
              <div className="mt-12 bg-slate-50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-100 px-6 py-3 border-b border-gray-200 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <CornerUpLeft size={14} /> Your Reply
                </div>
                <div className="p-6 md:p-8 text-sm text-slate-700 whitespace-pre-wrap font-medium leading-relaxed">
                  {selectedMessage.adminReply}
                </div>
                <div className="px-6 pb-6 pt-0 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Sent on {new Date(selectedMessage.repliedAt).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 md:p-8 border-t border-gray-100 bg-slate-50 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm focus-within:border-salsa-pink focus-within:ring-4 ring-salsa-pink/10 transition-all">
              <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
                <CornerUpLeft size={14} /> Replying to {selectedMessage.name}
              </div>
              <textarea 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
                className="w-full p-5 min-h-[120px] outline-none text-sm text-slate-700 font-medium resize-none"
              />
              <div className="px-5 py-4 bg-white flex justify-end items-center border-t border-gray-50">
                <button 
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="bg-slate-900 text-white px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-salsa-pink disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {sendingReply ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
                  Send Reply
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}