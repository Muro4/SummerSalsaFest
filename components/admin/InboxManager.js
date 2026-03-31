"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase"; // <-- IMPORT AUTH FOR SECURITY TOKEN
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { usePopup } from "@/components/PopupProvider"; 
import Button from "@/components/Button";
import { Trash2, Search, ArrowLeft, Send, CornerUpLeft, Mail, Loader2, X, CheckSquare, CheckCircle2, XCircle, Phone } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function InboxManager({ requests = [] }) {
  const t = useTranslations('Inbox');

  const [view, setView] = useState("questions");
  
  // Messages State
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Filters & Search
  const [filter, setFilter] = useState("all"); 
  const [reqFilter, setReqFilter] = useState("pending"); 
  const [searchQuery, setSearchQuery] = useState("");
  
  // Reply State
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [isReplying, setIsReplying] = useState(false); 
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(true);

  const { showPopup } = usePopup();

  // Helper to translate UI view names for search/empty states
  const getTranslatedView = () => {
      return view === 'questions' ? t('tabQuestions') : t('tabRequests');
  };

  // Helper to translate status tags in UI
  const getTranslatedStatus = (statusStr) => {
      const lower = (statusStr || '').toLowerCase();
      if (lower === 'all') return t('filterAll');
      if (lower === 'unread') return t('filterUnread');
      if (lower === 'replied') return t('filterReplied');
      if (lower === 'pending') return t('filterPending');
      if (lower === 'approved') return t('filterApproved');
      if (lower === 'declined') return t('filterDeclined');
      return statusStr;
  }

  // --- FETCH MESSAGES ---
  useEffect(() => {
    const q = query(collection(db, "contact_messages"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
      if (selectedItem && view === 'questions') {
        const updatedSelected = msgs.find(m => m.id === selectedItem.id);
        if (updatedSelected) setSelectedItem(updatedSelected);
      }
    });
    return () => unsubscribe();
  }, [selectedItem, view]);

  useEffect(() => {
    if (selectedItem && view === "requests") {
      const updatedReq = requests.find(r => r.id === selectedItem.id);
      if (!updatedReq) setSelectedItem(null); 
      else setSelectedItem(updatedReq);
    }
  }, [requests, selectedItem, view]);

  // --- DRAG TO SELECT LOGIC ---
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

  const toggleMobileSelection = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // --- FILTERING DATA ---
  const filteredMessages = messages.filter(msg => {
    const matchesFilter = filter === "all" || msg.status === filter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      msg.name?.toLowerCase().includes(searchLower) || 
      msg.email?.toLowerCase().includes(searchLower) ||
      msg.subject?.toLowerCase().includes(searchLower) ||
      msg.message?.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  const sortedRequests = [...requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const filteredRequests = sortedRequests.filter(req => {
    const matchesFilter = reqFilter === "all" || (req.status || "pending") === reqFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = req.name?.toLowerCase().includes(searchLower) || req.email?.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  const pendingRequestsCount = requests.filter(r => (r.status || "pending") === "pending").length;

  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(view === 'questions' ? filteredMessages.map(m => m.id) : filteredRequests.map(r => r.id));
    else setSelectedIds([]);
  };

  // --- MESSAGE ACTIONS ---
  const markAsRead = async (msg) => {
    if (msg.status === "unread") await updateDoc(doc(db, "contact_messages", msg.id), { status: "read" });
    setSelectedItem({ ...msg, status: "read" });
    setReplyText("");
    setIsReplying(false); 
    setSelectedIds([]); 
  };

  const deleteItem = async (id, e) => {
    e?.stopPropagation();
    const isQuestion = view === 'questions';
    showPopup({
      type: "info", title: isQuestion ? t('delTitleQ') : t('delTitleR'), message: t('delMsgSingle'), confirmText: t('btnDelYes'), cancelText: t('btnCancel'),
      onConfirm: async () => {
        await deleteDoc(doc(db, isQuestion ? "contact_messages" : "ambassador_requests", id));
        if (selectedItem?.id === id) { setSelectedItem(null); setIsReplying(false); }
      }
    });
  };

  const handleMassDelete = () => {
    showPopup({
      type: "info", title: t('massDelTitle'), message: t('massDelMsg', { count: selectedIds.length }), confirmText: t('btnMassDelYes'), cancelText: t('btnCancel'),
      onConfirm: async () => {
        const targetCollection = view === 'questions' ? "contact_messages" : "ambassador_requests";
        await Promise.all(selectedIds.map(id => deleteDoc(doc(db, targetCollection, id))));
        setSelectedIds([]);
        showPopup({ type: "success", title: t('massDelSuccess'), message: t('massDelSuccessMsg', { count: selectedIds.length }) });
      }
    });
  };

  const handleMassMarkRead = async () => {
    const unreadSelected = filteredMessages.filter(m => selectedIds.includes(m.id) && m.status === 'unread');
    if (unreadSelected.length === 0) { setSelectedIds([]); return; }
    await Promise.all(unreadSelected.map(m => updateDoc(doc(db, "contact_messages", m.id), { status: "read" })));
    setSelectedIds([]);
  };

  // --- UNIFIED REPLY ENGINE ---
  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    
    const isQuestion = view === 'questions';
    const emailSubject = isQuestion ? (selectedItem.subject || selectedItem.category) : t('replySubjDefault');
    const originalContent = isQuestion ? selectedItem.message : selectedItem.pitch;
    const targetCollection = isQuestion ? "contact_messages" : "ambassador_requests";

    try {
      // 🔒 SECURITY UPDATE: Fetch the Admin ID Token
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      
      const response = await fetch('/api/send-reply', {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // <-- PASS TOKEN TO BACKEND
        },
        body: JSON.stringify({ 
            email: selectedItem.email, 
            name: selectedItem.name, 
            subject: emailSubject, 
            replyText: replyText, 
            originalMessage: originalContent 
        })
      });

      if (!response.ok) throw new Error(t('replyErrApi'));

      let currentReplies = selectedItem.adminReplies || [];
      if (currentReplies.length === 0 && selectedItem.adminReply) currentReplies.push({ text: selectedItem.adminReply, repliedAt: selectedItem.repliedAt });
      
      const timestamp = new Date().toISOString();
      currentReplies.push({ text: replyText, repliedAt: timestamp });

      const updateData = { adminReplies: currentReplies, repliedAt: timestamp };
      if (isQuestion) updateData.status = "replied"; 

      await updateDoc(doc(db, targetCollection, selectedItem.id), updateData);
      
      setReplyText(""); setIsReplying(false);
      showPopup({ type: "success", title: t('replySuccessTitle'), message: t('replySuccessMsg') });
    } catch (err) {
      console.error(err);
      showPopup({ type: "error", title: t('replyFailTitle'), message: t('replyFailMsg') });
    } finally {
      setSendingReply(false);
    }
  };

  // --- REQUEST ACTIONS ---
  const handleApproveRequest = async (req, e) => {
    e?.stopPropagation();
    showPopup({
       type: "info", title: t('apprTitle'), message: t('apprMsg', { name: req.name }), confirmText: t('btnApproveYes'), cancelText: t('btnCancel'),
       onConfirm: async () => {
          try {
             await updateDoc(doc(db, "users", req.userId), { 
                role: "ambassador", 
                applicationStatus: "approved",
                ambassadorDisplayName: req.name 
             });
             
             await updateDoc(doc(db, "ambassador_requests", req.id), { status: "approved" });
             if (selectedItem?.id === req.id) setSelectedItem(null);
             showPopup({ type: "success", title: t('apprSuccessTitle'), message: t('apprSuccessMsg', { name: req.name }) });
          } catch (err) { 
             showPopup({ type: "error", title: t('apprFailTitle'), message: t('apprFailMsg') }); 
          }
       }
    });
  };

  const handleRejectRequest = (req, e) => {
    e?.stopPropagation();
    showPopup({
       type: "danger", title: t('rejTitle'), message: t('rejMsg', { name: req.name }), confirmText: t('btnDeclineYes'), cancelText: t('btnCancel'),
       onConfirm: async () => {
          try { 
             await updateDoc(doc(db, "users", req.userId), { applicationStatus: "rejected" }); 
             await updateDoc(doc(db, "ambassador_requests", req.id), { status: "declined" }); 
             if (selectedItem?.id === req.id) setSelectedItem(null);
          } catch (err) { showPopup({ type: "error", title: t('apprFailTitle'), message: t('rejFailMsg') }); }
       }
    });
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  if (loading) return <div className="flex justify-center items-center min-h-[600px]"><Loader2 className="animate-spin text-salsa-pink" size={32} /></div>;

  const displayReplies = selectedItem?.adminReplies ? [...selectedItem.adminReplies] : (selectedItem?.adminReply ? [{ text: selectedItem.adminReply, repliedAt: selectedItem.repliedAt }] : []);
  const currentList = view === 'questions' ? filteredMessages : filteredRequests;

  return (
    <div className="bg-white md:rounded-[3rem] rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] min-h-[600px] font-montserrat flex flex-col select-none overflow-hidden animate-in fade-in duration-500">
      
      {!selectedItem ? (
        <div className="flex flex-col animate-in fade-in duration-300 h-full">
          
          {/* HEADER ROW */}
          {selectedIds.length > 0 ? (
            <div className="px-4 md:px-6 py-4 md:h-[135px] border-b border-slate-200 bg-slate-100 flex justify-between items-center transition-all shrink-0">
              <div className="flex items-center gap-2 md:gap-4">
                 <button onClick={() => setSelectedIds([])} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"><X size={20} /></button>
                 <span className="text-xs md:text-sm font-bold text-slate-900">{t('selCount', { count: selectedIds.length })}</span>
              </div>
              <div className="flex gap-2 md:gap-3">
                 {view === 'questions' && (
                    <button onClick={handleMassMarkRead} className="px-3 md:px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer flex items-center gap-2 shadow-sm">
                      <CheckSquare size={14} className="hidden md:block"/> {t('btnRead')}
                    </button>
                 )}
                 <button onClick={handleMassDelete} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 text-slate-400 transition-colors cursor-pointer shadow-sm">
                   <Trash2 size={18} />
                 </button>
              </div>
            </div>
          ) : (
            <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-white flex flex-col gap-4 transition-all shrink-0">
              
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 
                 <div className="relative grid grid-cols-2 bg-slate-50 border border-gray-100 p-1.5 rounded-xl w-full md:w-[320px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] gap-0 shrink-0">
                   <div className="absolute top-1.5 bottom-1.5 bg-slate-900 rounded-[0.7rem] transition-all duration-300 ease-out shadow-sm" style={{ width: 'calc((100% - 0.75rem) / 2)', left: view === 'questions' ? '0.375rem' : 'calc(0.375rem + (100% - 0.75rem) / 2)' }} />
                   
                   <Button variant="ghost" size="subSliderTab" onClick={() => { setView('questions'); setSelectedIds([]); setSearchQuery(""); }} className={`relative z-10 ${view === 'questions' ? '!text-white' : '!text-slate-400 hover:!text-slate-900 transition-colors'}`}>
                      <div className="flex items-center justify-center gap-1.5 w-full">
                         {t('tabQuestions')}
                         {messages.filter(m => m.status === 'unread').length > 0 && <span className="bg-salsa-pink text-white px-1.5 py-0.5 rounded-md text-[9px] leading-none">{messages.filter(m => m.status === 'unread').length}</span>}
                      </div>
                   </Button>
                   
                   <Button variant="ghost" size="subSliderTab" onClick={() => { setView('requests'); setSelectedIds([]); setSearchQuery(""); }} className={`relative z-10 ${view === 'requests' ? '!text-white' : '!text-slate-400 hover:!text-slate-900 transition-colors'}`}>
                      <div className="flex items-center justify-center gap-1.5 w-full">
                         {t('tabRequests')}
                         {pendingRequestsCount > 0 && <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded-md text-[9px] leading-none">{pendingRequestsCount}</span>}
                      </div>
                   </Button>
                 </div>

                 <div className="relative w-full md:w-[400px] flex items-center shrink-0">
                   <Search className="absolute left-4 text-slate-400" size={14} />
                   <input 
                     type="text" placeholder={t('searchPlaceholder', { view: getTranslatedView().toLowerCase() })} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-900 transition-colors uppercase"
                   />
                 </div>
              </div>

              <div className="flex justify-start w-full">
                 {view === 'questions' && (
                    <div className="relative grid grid-cols-3 bg-slate-50 border border-gray-100 p-1 rounded-xl w-full md:w-[340px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] gap-0">
                      <div className="absolute top-1 bottom-1 bg-white border border-gray-200 rounded-[0.5rem] transition-all duration-300 ease-out shadow-sm" style={{ width: 'calc((100% - 0.5rem) / 3)', left: filter === 'all' ? '0.25rem' : filter === 'unread' ? 'calc(0.25rem + (100% - 0.5rem) / 3)' : 'calc(0.25rem + ((100% - 0.5rem) / 3) * 2)' }} />
                      {['all', 'unread', 'replied'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`relative z-10 py-2 px-1 truncate text-[9px] md:text-[10px] font-bold uppercase tracking-wide transition-colors duration-300 cursor-pointer ${filter === f ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>{getTranslatedStatus(f)}</button>
                      ))}
                    </div>
                 )}
                 {view === 'requests' && (
                    <div className="relative grid grid-cols-4 bg-slate-50 border border-gray-100 p-1 rounded-xl w-full md:w-[440px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] gap-0">
                      <div className="absolute top-1 bottom-1 bg-white border border-gray-200 rounded-[0.5rem] transition-all duration-300 ease-out shadow-sm" style={{ width: 'calc((100% - 0.5rem) / 4)', left: reqFilter === 'all' ? '0.25rem' : reqFilter === 'pending' ? 'calc(0.25rem + (100% - 0.5rem) / 4)' : reqFilter === 'approved' ? 'calc(0.25rem + ((100% - 0.5rem) / 4) * 2)' : 'calc(0.25rem + ((100% - 0.5rem) / 4) * 3)' }} />
                      {['all', 'pending', 'approved', 'declined'].map(f => (
                        <button key={f} onClick={() => setReqFilter(f)} className={`relative z-10 py-2 px-1 truncate text-[9px] md:text-[10px] font-bold uppercase tracking-wide transition-colors duration-300 cursor-pointer ${reqFilter === f ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                           {getTranslatedStatus(f)}
                        </button>
                      ))}
                    </div>
                 )}
              </div>

            </div>
          )}

          <div className="bg-white flex-grow">
            {currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
                <Mail size={48} className="mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">{t('emptyMsg', { view: getTranslatedView().toLowerCase() })}</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto w-full pb-10">
                  <div className="min-w-[900px]">
                    <div className="flex items-center px-0 py-4 border-b border-gray-100 bg-white text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <div className="w-16 flex justify-center shrink-0">
                        <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === currentList.length} className="w-4 h-4 rounded border-gray-300 accent-slate-900 cursor-pointer" />
                      </div>
                      <div className="w-48">{view === 'questions' ? t('thSender') : t('thApplicant')}</div>
                      <div className="flex-1">{view === 'questions' ? t('thMessage') : t('thPitch')}</div>
                      <div className="w-32 text-center">{view === 'questions' ? t('thCategory') : t('thStatus')}</div>
                      <div className="w-40 text-right pr-8">{t('thDate')}</div>
                    </div>
                    
                    {currentList.map((item) => {
                      const isSelected = selectedIds.includes(item.id);
                      
                      if (view === 'questions') {
                         const isUnread = item.status === "unread";
                         return (
                           <div key={item.id} onClick={() => markAsRead(item)} className={`flex items-stretch border-b border-gray-50 cursor-pointer transition-colors group ${isSelected ? '!bg-slate-200/60' : isUnread ? 'bg-white hover:bg-slate-50/50' : 'bg-slate-50/30 hover:bg-slate-100/50'}`}>
                             <div className="w-16 flex justify-center items-center shrink-0 cursor-pointer hover:bg-slate-200/50" onMouseDown={(e) => handleMouseDownOnRow(item.id, e)} onMouseEnter={() => handleMouseEnterOnRow(item.id)} onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 rounded border-gray-300 accent-slate-900 pointer-events-none" />
                             </div>
                             <div className={`w-48 pr-4 py-5 flex items-center gap-3 font-bold ${isUnread ? 'text-slate-900' : 'text-slate-500'}`}>
                               {isUnread ? <div className="w-2.5 h-2.5 rounded-full bg-salsa-pink shrink-0"></div> : <div className="w-2.5 h-2.5 shrink-0"></div>}
                               <span className="truncate text-sm tracking-wide">{item.name}</span>
                             </div>
                             <div className="flex-1 truncate pr-6 py-5 flex items-center text-sm">
                               <span className={`${isUnread ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>{item.subject || item.category}</span>
                               <span className="text-slate-400 ml-2 text-xs font-medium">- {item.message}</span>
                             </div>
                             <div className="w-32 py-5 flex justify-center items-center">
                               <span className={`text-[10px] px-3 py-1 rounded-md uppercase font-black tracking-wider ${item.category === "Tickets" ? 'bg-blue-50 text-blue-600' : item.category === "Other" ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-600'}`}>{item.category}</span>
                             </div>
                             <div className={`w-40 pr-8 py-5 flex items-center justify-end text-xs truncate ${isUnread ? 'font-bold text-salsa-pink' : 'font-semibold text-slate-400'}`}>
                               {formatTime(item.createdAt)}
                             </div>
                           </div>
                         );
                      }

                      if (view === 'requests') {
                         const reqStatus = item.status || 'pending';
                         const isPending = reqStatus === 'pending';
                         return (
                           <div key={item.id} onClick={() => setSelectedItem(item)} className={`flex items-stretch border-b border-gray-50 cursor-pointer transition-colors group bg-white hover:bg-slate-50/50 ${isSelected ? '!bg-slate-200/60' : ''}`}>
                             <div className="w-16 flex justify-center items-center shrink-0 cursor-pointer hover:bg-slate-200/50" onMouseDown={(e) => handleMouseDownOnRow(item.id, e)} onMouseEnter={() => handleMouseEnterOnRow(item.id)} onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 rounded border-gray-300 accent-slate-900 pointer-events-none" />
                             </div>
                             <div className={`w-48 pr-4 py-5 flex items-center gap-3 font-bold text-slate-900`}>
                               {isPending ? <div className="w-2.5 h-2.5 rounded-full bg-salsa-pink shrink-0 animate-pulse"></div> : <div className="w-2.5 h-2.5 shrink-0"></div>}
                               <span className="truncate text-sm tracking-wide">{item.name}</span>
                             </div>
                             <div className="flex-1 truncate pr-6 py-5 flex items-center text-sm">
                               <span className="font-bold text-slate-800">{t('lblPitch')}</span>
                               <span className="text-slate-400 ml-2 text-xs font-medium">- "{item.pitch}"</span>
                             </div>
                             <div className="w-32 py-5 flex justify-center items-center">
                               <span className={`text-[10px] px-3 py-1 rounded-md uppercase font-black tracking-wider ${reqStatus === 'approved' ? 'bg-emerald-50 text-emerald-600' : reqStatus === 'declined' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>
                                 {getTranslatedStatus(reqStatus)}
                               </span>
                             </div>
                             <div className={`w-40 pr-8 py-5 flex items-center justify-end text-xs truncate ${isPending ? 'font-bold text-salsa-pink' : 'font-semibold text-slate-400'}`}>
                               {formatTime(item.createdAt)}
                             </div>
                           </div>
                         );
                      }
                    })}
                  </div>
                </div>

                <div className="block md:hidden w-full pb-10">
                  {currentList.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    
                    if (view === 'questions') {
                       const isUnread = item.status === "unread";
                       return (
                         <div key={item.id} onClick={() => markAsRead(item)} className={`flex items-start gap-3 p-4 border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-slate-200/50' : isUnread ? 'bg-white' : 'bg-slate-50/50'}`}>
                           <div onClick={(e) => toggleMobileSelection(item.id, e)} className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-base font-black transition-all cursor-pointer ${isSelected ? 'bg-slate-900 text-white scale-105' : isUnread ? 'bg-salsa-pink/10 text-salsa-pink' : 'bg-slate-100 text-slate-400'}`}>
                              {isSelected ? <CheckSquare size={18} /> : item.name.charAt(0).toUpperCase()}
                           </div>
                           <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                             <div className="flex justify-between items-baseline mb-0.5">
                                <span className={`truncate pr-2 text-[15px] ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>{item.name}</span>
                                <span className={`shrink-0 text-[10px] ${isUnread ? 'font-black text-salsa-pink' : 'font-bold text-slate-400'}`}>{formatTime(item.createdAt)}</span>
                             </div>
                             <div className={`text-sm truncate mb-0.5 pr-2 ${isUnread ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{item.subject || item.category}</div>
                             <div className="text-xs text-slate-400 truncate pr-4">{item.message}</div>
                           </div>
                         </div>
                       )
                    }

                    if (view === 'requests') {
                       const reqStatus = item.status || 'pending';
                       const isPending = reqStatus === 'pending';
                       return (
                         <div key={item.id} onClick={() => setSelectedItem(item)} className={`flex items-start gap-3 p-4 border-b border-gray-100 cursor-pointer transition-colors bg-white ${isSelected ? '!bg-slate-200/50' : ''}`}>
                           <div onClick={(e) => toggleMobileSelection(item.id, e)} className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-base font-black transition-all cursor-pointer ${isSelected ? 'bg-slate-900 text-white scale-105' : isPending ? 'bg-salsa-pink/10 text-salsa-pink' : 'bg-slate-100 text-slate-400'}`}>
                              {isSelected ? <CheckSquare size={18} /> : item.name.charAt(0).toUpperCase()}
                           </div>
                           <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                             <div className="flex justify-between items-baseline mb-0.5">
                                <span className="truncate pr-2 text-[15px] font-black text-slate-900">{item.name}</span>
                                <span className="shrink-0 text-[10px] font-bold text-slate-400">{formatTime(item.createdAt)}</span>
                             </div>
                             <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${reqStatus === 'approved' ? 'bg-emerald-50 text-emerald-600' : reqStatus === 'declined' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>{getTranslatedStatus(reqStatus)}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.mainStyle}</span>
                             </div>
                             <div className="text-xs text-slate-500 truncate pr-4 italic">"{item.pitch}"</div>
                           </div>
                         </div>
                       )
                    }
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col animate-in slide-in-from-right-8 duration-300 h-full">
          
          <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
            <button onClick={() => { setSelectedItem(null); setIsReplying(false); setReplyText(""); }} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
              <ArrowLeft size={16} /> {t('btnBack')}
            </button>
            {view === 'questions' ? (
               <button onClick={(e) => deleteItem(selectedItem.id, e)} className="p-2 md:p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer" title={t('btnDelYes')}>
                 <Trash2 size={18} />
               </button>
            ) : (
               <div className="flex items-center gap-2">
                  <button onClick={(e) => deleteItem(selectedItem.id, e)} className="p-2 md:p-3 mr-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer" title={t('btnDelYes')}><Trash2 size={18}/></button>
                  <button onClick={(e) => handleRejectRequest(selectedItem, e)} className="bg-white border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 p-2 md:p-2.5 rounded-xl transition-all cursor-pointer" title={t('btnCancel')}><XCircle size={18}/></button>
                  <button onClick={(e) => handleApproveRequest(selectedItem, e)} className="bg-slate-900 text-white hover:bg-emerald-500 p-2 md:p-2.5 px-4 md:px-5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm" title={t('btnApprove')}><CheckCircle2 size={16}/> <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline-block">{t('btnApprove')}</span></button>
               </div>
            )}
          </div>

          <div className="bg-white p-5 md:p-14 text-auto select-text flex-grow overflow-y-auto">
            
            {view === 'questions' ? (
               <h2 className="text-3xl md:text-5xl font-bebas text-slate-900 mb-6 md:mb-8 tracking-wide leading-none">{selectedItem.subject || selectedItem.category}</h2>
            ) : (
               <div className="mb-6 md:mb-8">
                  <div className="flex items-center gap-3 mb-3">
                     <h2 className="text-3xl md:text-5xl font-bebas text-slate-900 tracking-wide leading-none">{t('titleApp')}</h2>
                     <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md ${(selectedItem.status || 'pending') === 'approved' ? 'bg-emerald-50 text-emerald-600' : (selectedItem.status || 'pending') === 'declined' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>
                        {getTranslatedStatus(selectedItem.status || 'pending')}
                     </span>
                  </div>
               </div>
            )}
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-8 border-b border-gray-100">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg md:text-xl shrink-0">
                   {selectedItem.name.charAt(0).toUpperCase()}
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-2">
                     <span className="font-bold text-slate-900 text-sm md:text-base tracking-wide truncate">{selectedItem.name}</span>
                     <span className="text-[11px] md:text-xs text-slate-500 font-medium truncate lowercase">&lt;{selectedItem.email}&gt;</span>
                   </div>
                   <div className="text-[10px] md:text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-wider">
                     {new Date(selectedItem.createdAt).toLocaleString()}
                   </div>
                 </div>
              </div>
              {view === 'requests' && (
                 <div className="flex items-center gap-4 mt-2 md:mt-0">
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg"><Phone size={14}/> {selectedItem.phone}</span>
                    <span className="text-[10px] font-black text-salsa-pink bg-salsa-pink/10 uppercase tracking-widest px-3 py-1.5 rounded-lg">{selectedItem.mainStyle}</span>
                 </div>
              )}
            </div>

            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
               {view === 'questions' ? selectedItem.message : (
                  <div className="bg-slate-50 border border-gray-100 p-6 rounded-2xl">
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t('lblPitch')}</p>
                     <p className="italic text-slate-600">"{selectedItem.pitch}"</p>
                  </div>
               )}
            </div>

            {displayReplies.length > 0 && (
              <div className="mt-10 md:mt-14 flex flex-col gap-4 md:gap-6">
                {displayReplies.map((reply, idx) => (
                  <div key={idx} className="bg-slate-50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100 px-5 md:px-8 py-3 md:py-4 border-b border-gray-200 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <div className="flex items-center gap-2"><CornerUpLeft size={14} /> {t('lblYourReply')} {displayReplies.length > 1 ? `#${idx + 1}` : ''}</div>
                    </div>
                    <div className="p-5 md:p-8 text-sm text-slate-700 whitespace-pre-wrap font-medium leading-relaxed">{reply.text}</div>
                    <div className="px-5 md:px-8 pb-5 md:pb-8 pt-0 text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t('lblSentOn', { date: new Date(reply.repliedAt).toLocaleString() })}</div>
                  </div>
               ))}
              </div>
            )}
          </div>

          <div className="p-4 md:p-8 border-t border-gray-100 bg-white shrink-0">
            {!isReplying ? (
               <div className="flex justify-start">
               <button onClick={() => setIsReplying(true)} className="bg-white border border-gray-200 text-slate-700 px-6 md:px-8 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer shadow-sm">
                  <CornerUpLeft size={16} className="text-slate-400" /> {t('btnReply')}
               </button>
               </div>
            ) : (
               <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden focus-within:border-slate-900 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="bg-slate-50 px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex justify-between items-center text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <div className="flex items-center gap-2 truncate"><CornerUpLeft size={14} className="shrink-0" /> {t('lblReplyingTo', { name: selectedItem.name.split(' ')[0] })}</div>
                  <button onClick={() => { setIsReplying(false); setReplyText(""); }} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer" title={t('btnCancel')}><X size={16} /></button>
               </div>
               <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} maxLength={5000} placeholder={t('replyPlaceholder')} className="w-full p-4 md:p-6 min-h-[140px] max-h-[300px] outline-none text-sm text-slate-700 font-medium resize-y" autoFocus />
               <div className="px-4 md:px-6 py-3 md:py-4 bg-white flex justify-between items-center border-t border-gray-50 gap-2">
                  <span className={`text-[9px] md:text-[10px] font-bold tracking-widest uppercase ${replyText.length >= 5000 ? 'text-red-500' : 'text-slate-400'}`}>{replyText.length} / 5000</span>
                  <div className="flex items-center gap-2 md:gap-4">
                  <button onClick={() => { setIsReplying(false); setReplyText(""); }} className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors cursor-pointer px-2">{t('btnCancel')}</button>
                  <button onClick={handleSendReply} disabled={sendingReply || !replyText.trim()} className="bg-slate-900 text-white px-5 md:px-8 py-2.5 md:py-3.5 rounded-xl text-[10px] md:text-[11px] font-bold uppercase tracking-wider hover:bg-salsa-pink disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm">
                     {sendingReply ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />} {t('btnSend')}
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