"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
// THE FIX: Use our custom language-aware router
import { useRouter } from "@/routing";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import { usePopup } from "@/components/PopupProvider";
import { Check, ArrowRight, Loader2, ChevronLeft } from "lucide-react";
import { useTranslations } from 'next-intl';
import { getPriceAtDate } from "@/lib/pricing";

export default function TicketPage() {
  const t = useTranslations('Tickets');

  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(null);
  const [realName, setRealName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // --- SYSTEM SETTINGS STATE ---
  const [salesEnabled, setSalesEnabled] = useState(true);

  const router = useRouter();
  const { showPopup } = usePopup();

  const PASSES = [
    { id: 'party', name: t('passes.partyName'), rawName: 'Party Pass', price: getPriceAtDate('Party Pass'), desc: t('passes.partyDesc'), color: 'bg-violet-600', text: 'text-white' },
    { id: 'full', name: t('passes.fullName'), rawName: 'Full Pass', price: getPriceAtDate('Full Pass'), desc: t('passes.fullDesc'), color: 'bg-salsa-pink', text: 'text-white' },
    { id: 'day', name: t('passes.dayName'), rawName: 'Day Pass', price: getPriceAtDate('Day Pass'), desc: t('passes.dayDesc'), color: 'bg-teal-300', text: 'text-teal-950' },
  ];

  // --- NAME VALIDATION ---
  const isValidNameChars = /^[a-zA-Z\u00C0-\u024F\s\-']+$/.test(realName);
  const isWithinWordLimit = realName.trim().split(/\s+/).length <= 5;
  const isNameInvalid = realName.length > 0 && (!isValidNameChars || !isWithinWordLimit);

  // --- FETCH USER ---
  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const d = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (d.exists()) setUserData(d.data());
      }
    };
    fetchUser();
  }, [auth.currentUser]);

  // --- LISTEN FOR GLOBAL KILL SWITCH ---
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "system"), 
      (snap) => {
        if (snap.exists()) {
          setSalesEnabled(snap.data().salesEnabled);
        }
      },
      (err) => {
        console.error("Kill switch sync error:", err.message);
        setSalesEnabled(true); 
      }
    );
    return () => unsub();
  }, []);

  const handleProceedToDetails = async () => {
    if (!auth.currentUser && !isGuest) {
      setShowModal(true);
      return;
    }

    // --- CHECK SIGNED-IN USER LIMIT ---
    if (auth.currentUser && userData?.role !== 'ambassador' && userData?.role !== 'superadmin') {
      setLoading(true);
      const q = query(
        collection(db, "tickets"),
        where("userId", "==", auth.currentUser.uid),
        where("festivalYear", "==", 2026)
      );
      const snap = await getDocs(q);

      if (snap.size >= 5) {
        setLoading(false);
        showPopup({
          type: "info",
          title: t('limitTitle'),
          message: t('limitMsgUser'),
          confirmText: t('applyBtn'),
          cancelText: t('cancelBtn'),
          onConfirm: () => router.push("/apply")
        });
        return;
      }
      setLoading(false);
    }

    // --- CHECK GUEST USER LIMIT ---
    if (!auth.currentUser && isGuest) {
      const guestSession = sessionStorage.getItem("guestSessionID");
      if (guestSession) {
        setLoading(true);
        const q = query(
          collection(db, "tickets"),
          where("userId", "==", guestSession),
          where("festivalYear", "==", 2026)
        );
        const snap = await getDocs(q);

        if (snap.size >= 5) {
          setLoading(false);
          showPopup({
            type: "info",
            title: t('limitTitle'),
            message: t('limitMsgGuest'),
            confirmText: t('createAccountBtn'),
            cancelText: t('cancelBtn'),
            onConfirm: () => router.push("/login")
          });
          return;
        }
        setLoading(false);
      }
    }

    setStep(2);
  };

  // THE FIX: Unified Cart Logic
  const handleAddToCart = async () => {
    setLoading(true);
    try {
      // 1. Generate ONE absolute ID for this item
      const itemID = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      
      const cartItem = {
        id: itemID,
        passType: selected.rawName,
        price: selected.price,
        userName: realName,
        guestEmail: guestEmail || (auth.currentUser ? auth.currentUser.email : ""),
        quantity: 1,
        addedAt: new Date().toISOString()
      };

      if (auth.currentUser) {
        // ==========================================
        // LOGGED IN USERS: Force Firebase to use our itemID
        // ==========================================
        const cartRef = doc(db, "users", auth.currentUser.uid, "cart", itemID);
        await setDoc(cartRef, cartItem);
      } else {
        // ==========================================
        // GUEST USERS: Save to Local Storage
        // ==========================================
        const existingCart = JSON.parse(localStorage.getItem("cart")) || [];
        existingCart.push(cartItem);
        localStorage.setItem("cart", JSON.stringify(existingCart));
        
        window.dispatchEvent(new Event("cartUpdated"));
      }

      router.push("/cart");
      
    } catch (e) {
      console.error("Cart Error:", e);
      showPopup({ type: "error", title: "Error", message: e.message || "Failed to add to cart.", confirmText: "Close" });
    } finally {
      setLoading(false); 
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-salsa-white font-montserrat">
      <Navbar />
      <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} onGuestContinue={() => { setIsGuest(true); setShowModal(false); setStep(2); }} />

      <div className="flex-grow flex flex-col justify-center items-center w-full pt-28 pb-12 px-6">

        {/* ENHANCED PROGRESS BAR */}
        <div className="w-full max-w-xl mb-12">
          <div className="grid grid-cols-3 mb-4 text-[11px] font-black uppercase tracking-widest text-center">
            <span className={`text-left transition-colors duration-500 ${step >= 1 ? "text-salsa-pink" : "text-gray-400"}`}>{t('step1')}</span>
            <span className={`transition-colors duration-500 ${step >= 2 ? "text-salsa-pink" : "text-gray-400"}`}>{t('step2')}</span>
            <span className={`text-right transition-colors duration-500 ${step >= 3 ? "text-salsa-pink" : "text-gray-400"}`}>{t('step3')}</span>
          </div>
          <div className="relative h-1.5 bg-gray-100 rounded-full">
            <div className="absolute top-0 left-0 h-full bg-salsa-pink transition-all duration-700 rounded-full" style={{ width: `${step === 1 ? '0%' : step === 2 ? '50%' : '100%'}` }}></div>
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full flex justify-between">
              {[1, 2, 3].map((num) => (
                <div key={num} className={`w-4 h-4 rounded-full border-2 shadow-sm transition-all duration-700 ${step >= num ? 'bg-white border-salsa-pink scale-110' : 'bg-white border-gray-200'}`}></div>
              ))}
            </div>
          </div>
        </div>

        {step === 1 ? (
          <div className="flex flex-col items-center w-full animate-in fade-in duration-500">
            <h1 className="font-bebas text-5xl md:text-6xl text-slate-900 mb-2 uppercase tracking-normal">{t('title')}</h1>
            <p className="text-gray-400 font-bold text-[11px] uppercase tracking-widest mb-8">{t('subtitle')}</p>

            <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl mb-12">
              {PASSES.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`bg-white p-8 rounded-[2.5rem] border-2 transition-all duration-300 cursor-pointer flex flex-col items-center text-center relative hover:-translate-y-1
                  ${selected?.id === p.id
                      ? 'border-slate-900 shadow-2xl scale-[1.02]'
                      : 'border-gray-100 hover:border-slate-200 shadow-sm'
                    }`}
                >
                  <div className={`absolute -top-3 -right-3 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${selected?.id === p.id ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                    <Check size={16} strokeWidth={4} />
                  </div>

                  <div className={`px-6 py-2 rounded-full mb-4 ${p.color} ${p.text}`}>
                    <h2 className="font-bebas text-3xl leading-none tracking-wide">{p.name}</h2>
                  </div>

                  <div className="flex items-start justify-center gap-1 mb-4">
                    <span className="text-lg font-bold text-slate-400 mt-1">€</span>
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">{p.price}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-2 border-t border-gray-100 pt-4">{p.desc}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleProceedToDetails}
              disabled={!selected || loading}
              className="cursor-pointer group bg-slate-900 text-white font-black px-16 py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-salsa-pink transition-all shadow-xl tracking-widest text-[11px] uppercase disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>{t('nextBtn')} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-500">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 mb-6 text-slate-400 hover:text-slate-900 transition-colors font-black text-[11px] uppercase tracking-[0.2em] cursor-pointer self-start ml-2"
            >
              <ChevronLeft size={16} strokeWidth={3} /> {t('changePass')}
            </button>

            <div className="w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-salsa-mint/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <h2 className="font-bebas text-5xl mb-6 uppercase leading-none text-center text-slate-900 relative z-10 tracking-normal">{t('verifyTitle')}</h2>

              <div className="space-y-5 relative z-10">
                <div className="flex flex-col items-center gap-2 mb-2">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('selected')}</span>
                  <span className={`border border-transparent px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${selected?.color} ${selected?.text}`}>
                    {selected?.name}
                  </span>
                </div>

                {isGuest && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('emailLabel')}</label>
                    <input
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      required
                      maxLength={100}
                      className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:border-slate-900 font-bold text-sm transition-all text-slate-900"
                      onChange={e => setGuestEmail(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('nameLabel')}</label>
                  <input
                    type="text"
                    placeholder={t('namePlaceholder')}
                    required
                    maxLength={50}
                    className={`w-full p-3.5 bg-gray-50 border rounded-2xl outline-none focus:bg-white font-bold uppercase text-sm transition-all text-slate-900 ${isNameInvalid ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'}`}
                    onChange={e => setRealName(e.target.value)}
                  />
                  {isNameInvalid && (
                    <p className="text-red-500 text-[11px] font-bold mt-1 ml-2 tracking-widest leading-relaxed">
                      {!isWithinWordLimit ? t('nameErrorWords') : t('nameErrorChars')}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={!realName || isNameInvalid || (isGuest && !guestEmail) || loading || !salesEnabled}
                  className="cursor-pointer w-full h-[52px] bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-salsa-pink hover:scale-105 active:scale-95 transition-all tracking-widest flex items-center justify-center gap-3 text-[11px] uppercase disabled:opacity-50 disabled:hover:bg-slate-900 disabled:hover:scale-100 mt-6"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : !salesEnabled ? (
                    "Sales Temporarily Paused"
                  ) : (
                    t('addBtn')
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}