"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { useRouter } from "@/routing"; // THE FIX: Custom routing for i18n
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePopup } from "@/components/PopupProvider";
import { Trash2, ShoppingBag, Lock, Loader2, Ticket, ShieldCheck, CheckCircle, Clock, XCircle, Plus } from "lucide-react";
import { useTranslations } from 'next-intl';

// --- STYLING HELPERS ---
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

const getPassIconStyle = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('full')) return 'bg-salsa-pink/10 text-salsa-pink';
  if (t.includes('party')) return 'bg-violet-600/10 text-violet-600';
  if (t.includes('day')) return 'bg-teal-300/20 text-teal-700';
  if (t.includes('free')) return 'bg-yellow-400/20 text-yellow-700';
  return 'bg-gray-200/50 text-gray-500';
};

export default function Cart() {
  const t = useTranslations('Cart');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  const { showPopup } = usePopup();

  // Helper to translate internal DB pass names for the UI
  const translatePassDisplay = (type) => {
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('full')) return t('passFull');
    if (typeLower.includes('party')) return t('passParty');
    if (typeLower.includes('day')) return t('passDay');
    if (typeLower.includes('free')) return t('passFree');
    return type;
  };

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      const currentID = user ? user.uid : sessionStorage.getItem("guestSessionID");
      if (currentID) {
        const q = query(collection(db, "tickets"), where("userId", "==", currentID), where("status", "==", "pending"));
        
        // THE FIX: Added an error callback to stop the loading spinner if Firebase blocks the read
        const unsub = onSnapshot(q, 
          (snap) => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
          },
          (error) => {
            console.error("Cart fetch error:", error);
            setLoading(false); // Stop the spinner so the user isn't trapped
          }
        );
        return () => unsub();
      } else { 
        setLoading(false); 
      }
    });
    return () => unsubAuth();
  }, []);

  const handleClearCart = () => {
    showPopup({
      type: "error",
      title: t('popupClearTitle'),
      message: t('popupClearMsg'),
      confirmText: t('popupClearBtn'),
      cancelText: t('popupCancelBtn'),
      onConfirm: async () => {
        const batch = writeBatch(db);
        items.forEach(item => { batch.delete(doc(db, "tickets", item.id)); });
        await batch.commit();
      }
    });
  };

  const confirmRemoveItem = (id, userName) => {
    showPopup({
      type: "info", 
      title: t('popupRemoveTitle'), 
      message: t('popupRemoveMsg', { name: userName }), 
      confirmText: t('popupRemoveBtn'), 
      cancelText: t('popupKeepBtn'),
      onConfirm: async () => await deleteDoc(doc(db, "tickets", id))
    });
  };

  const handleCheckout = async () => {
    setIsPaying(true);
    
    // 🔒 THE FIX: Route Free Passes through the secure API instead of client-side updates
    if (total === 0) {
      try {
        const ticketIds = items.map(item => item.id);
        const response = await fetch("/api/activate-free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketIds })
        });
        
        if (!response.ok) {
          throw new Error("Failed to activate free passes securely.");
        }

        setIsSuccess(true);
        setTimeout(() => { 
          if (auth.currentUser) router.push("/account"); 
          else { sessionStorage.removeItem("guestSessionID"); router.push("/"); } 
        }, 3000);
        return;
      } catch (err) {
        showPopup({ type: "error", title: t('popupActErrTitle'), message: err.message || t('popupActErrMsg'), confirmText: t('popupCloseBtn') });
        setIsPaying(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || "Server error");
    } catch (err) {
      showPopup({ type: "error", title: t('popupChkErrTitle'), message: err.message, confirmText: t('popupCloseBtn') });
      setIsPaying(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>;

  if (isSuccess) {
    return (
      <main className="min-h-screen flex flex-col bg-salsa-white font-montserrat">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 text-center w-full">
          <div className="bg-white p-10 md:p-16 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl border-2 border-emerald-100 max-w-lg w-full animate-in zoom-in duration-500">
            <div className="flex flex-col items-center">
              <CheckCircle className="text-emerald-500 mb-6" size={80} />
              <h1 className="font-bebas tracking-wide text-5xl md:text-6xl text-gray-900 mb-4 uppercase leading-none">{t('successTitle')}</h1>
              <p className="text-gray-500 font-bold text-xs md:text-sm">{t('successDesc')}</p>
              <p className="text-salsa-mint font-black text-[10px] md:text-[11px] uppercase tracking-widest mt-8 animate-pulse">{t('redirecting')}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-salsa-white font-montserrat">
      <Navbar />
      <div className="flex-grow max-w-7xl mx-auto px-4 md:px-6 w-full pt-32 md:pt-40 pb-24">

        {/* HEADER AREA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4 md:gap-6">
          <div className="flex flex-col gap-1 md:gap-2">
            <h1 className="font-bebas tracking-wide text-5xl md:text-8xl tracking-tight leading-none text-slate-900 uppercase">{t('headerTitle')}</h1>
            <p className="text-slate-500 text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] mt-1 md:mt-2">{t('headerSubtitle')}</p>
          </div>
          {items.length > 0 && (
            <div className="bg-white px-5 md:px-6 py-2 md:py-3 rounded-full border border-gray-100 shadow-sm flex items-center gap-2 md:gap-3 h-[40px] md:h-[46px]">
              <ShoppingBag className="text-salsa-pink" size={16} />
              <span className="font-black text-[10px] md:text-[11px] uppercase tracking-widest text-slate-700">
                {items.length} {items.length === 1 ? t('itemSingle') : t('itemPlural')}
              </span>
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-16">
            <div className="lg:col-span-7 xl:col-span-8">
              <div className="flex justify-between items-center mb-6">
                <Link href="/tickets" className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-slate-900 bg-white px-4 md:px-5 py-2.5 rounded-full border border-slate-200 shadow-sm hover:border-slate-900 hover:shadow-md transition-all active:scale-95 cursor-pointer">
                  <Plus size={14} /> {t('getMoreBtn')}
                </Link>
                <button onClick={handleClearCart} className="group flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-all cursor-pointer bg-white px-4 md:px-5 py-2.5 rounded-full border border-gray-100 shadow-sm hover:shadow-md active:scale-95">
                  <XCircle size={14} className="group-hover:rotate-90 transition-transform duration-300" /> {t('clearBtn')}
                </button>
              </div>

              <div className="space-y-4 md:space-y-6">
                {items.map(item => (
                  <div key={item.id} className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center shadow-[0_10px_30px_rgba(0,0,0,0.03)] gap-5 md:gap-0">
                    <div className="flex items-center gap-4 md:gap-8 w-full md:flex-1 min-w-0">
                      <div className={`w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center border border-transparent shrink-0 shadow-inner ${getPassIconStyle(item.passType)}`}>
                        <Ticket size={28} className="md:w-8 md:h-8" strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col gap-1 min-w-0 flex-1 pr-0 md:pr-4">
                        <div className="mb-1">
                          <span className={`text-[9px] md:text-[11px] font-black px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase tracking-[0.15em] shadow-sm ${getPassStyle(item.passType)}`}>
                            {translatePassDisplay(item.passType)}
                          </span>
                        </div>
                        <h3 title={item.userName} className="text-2xl md:text-3xl font-black uppercase text-slate-900 leading-tight truncate">
                          {item.userName}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 min-w-0">
                          <span className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5 truncate">
                            <Clock size={12} className="opacity-50 shrink-0" /> <span className="truncate">{item.festivalYear} {t('edition')}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full md:w-auto gap-12 pt-4 md:pt-0 border-t border-slate-50 md:border-none shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{t('priceLbl')}</p>
                        <p className="font-bebas tracking-wide text-4xl md:text-5xl text-slate-900 leading-none">€{item.price}</p>
                      </div>
                      <button onClick={() => confirmRemoveItem(item.id, item.userName)} className="group/btn cursor-pointer w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center bg-gray-50 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all duration-300">
                        <Trash2 size={20} className="md:w-[22px] md:h-[22px] group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 xl:col-span-4 mt-4 lg:mt-0">
              <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-2xl sticky top-32 w-full">
                <h2 className="font-bebas tracking-wide text-3xl md:text-4xl mb-5 md:mb-6 uppercase text-slate-900">{t('summaryTitle')}</h2>
                <div className="space-y-0 mb-6 border-y border-slate-100">
                  {Object.entries(counts).map(([type, count], index) => (
                    <div key={type} className={`flex justify-between items-center py-3 ${index !== Object.entries(counts).length - 1 ? 'border-b border-slate-100' : ''}`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${getPassBgColor(type)}`}></div>
                        <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500">{translatePassDisplay(type)}</span>
                      </div>
                      <span className="text-slate-900 font-black text-xs md:text-sm">{count}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-end pt-2 mb-6">
                  <span className="font-black text-[10px] md:text-[11px] uppercase tracking-widest text-slate-400 mb-1">{t('totalDue')}</span>
                  <span className="font-bebas text-4xl md:text-5xl text-salsa-pink leading-none">€{total}</span>
                </div>
                <button onClick={handleCheckout} disabled={isPaying} className="cursor-pointer w-full h-[52px] md:h-[56px] bg-slate-900 text-white font-black rounded-xl md:rounded-2xl hover:bg-salsa-pink hover:scale-105 transition-all flex items-center justify-center gap-2 md:gap-3 text-[10px] md:text-[11px] uppercase tracking-widest shadow-xl disabled:opacity-50 mt-4">
                  {isPaying ? <Loader2 className="animate-spin" size={18} /> : (total === 0 ? <><CheckCircle size={16} /> {t('activateBtn')}</> : <><Lock size={16} /> {t('proceedBtn')}</>)}
                </button>
                <div className="mt-5 flex items-center justify-center gap-2 text-[9px] md:text-[11px] font-black text-slate-300 uppercase tracking-widest">
                  <ShieldCheck size={12} className="text-emerald-400" /> {total > 0 ? t('secureChk') : t('freeProc')}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full border-2 border-dashed border-salsa-mint/40 bg-[#f4fdfb] rounded-[2rem] md:rounded-[3rem] py-20 md:py-32 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
            <ShoppingBag size={48} className="md:w-14 md:h-14 text-slate-300 mb-4 md:mb-6" />
            <h3 className="font-bebas tracking-wide text-3xl md:text-4xl text-slate-400 uppercase mb-3 md:mb-4">{t('emptyTitle')}</h3>
            <Link href="/tickets" className="text-salsa-pink text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] hover:underline transition-all">{t('browseBtn')}</Link>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}