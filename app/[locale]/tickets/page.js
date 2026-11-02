"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
import { useRouter } from "@/routing";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import { usePopup } from "@/components/PopupProvider";
import { Loader2 } from "lucide-react";
import { useTranslations } from 'next-intl';
import { getPriceAtDate, pricingTable, isSalesOpen } from "@/lib/pricing";

export default function TicketPage() {
  const t = useTranslations('Tickets');
  const autoSalesOpen = isSalesOpen();
  
  /* Component State */
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [realName, setRealName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [salesEnabled, setSalesEnabled] = useState(true);
  
  // NEW: State to hold the dynamically calculated price for hydration safety
  const [fullPassPrice, setFullPassPrice] = useState("...");

  const router = useRouter();
  const { showPopup } = usePopup();

  /* Input validation criteria */
  const isValidNameChars = /^[a-zA-Z\u00C0-\u024F\s\-']+$/.test(realName);
  const isWithinWordLimit = realName.trim().split(/\s+/).length <= 5;
  const isNameInvalid = realName.length > 0 && (!isValidNameChars || !isWithinWordLimit);

  /* Track Firebase Auth Initialization */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  /* Calculate dynamic pricing exclusively on the client to prevent hydration errors */
  useEffect(() => {
    // Add 5€ markup for direct website purchases
    setFullPassPrice(getPriceAtDate('Full Pass') + 5);
  }, []);

  /* User profile data synchronization */
  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const d = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (d.exists()) setUserData(d.data());
      }
    };
    fetchUser();
  }, [auth.currentUser]);

  /* System sales configuration listener */
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

  /* Check limits and submit the ticket payload */
  const executeCheckout = async () => {
    setLoading(true);
    try {
      // 1. Check purchase limits for authenticated users
      if (auth.currentUser) {
        if (userData?.role !== 'ambassador' && userData?.role !== 'superadmin') {
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
        }
      }

      // 2. Build request and submit
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch('/api/tickets/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tickets: [{
            userName: realName,
            passType: 'Full Pass'
          }]
        })
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server experienced an unexpected crash. Please check server logs.");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add ticket");

      router.push("/cart");
    } catch (e) {
      showPopup({ type: "error", title: "Error", message: e.message, confirmText: "Close" });
    } finally {
      setLoading(false); 
    }
  };

  /* Checkout Entry Point */
  const handleAddToCart = async () => {
    if (!auth.currentUser) {
      setShowModal(true);
      return;
    }
    await executeCheckout();
  };

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat">
      <Navbar />
      <AuthModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />

      <div className="flex-grow flex flex-col justify-center items-center w-full pt-32 pb-16 px-4 sm:px-6">
        
        <div className="w-full max-w-5xl animate-in fade-in duration-500">
          <h1 className="font-modak text-5xl sm:text-6xl text-slate-900 mb-10 uppercase tracking-wide text-center drop-shadow-sm">
            {t('buyPassTitle')}
          </h1>

          
          <div className="w-full max-w-2xl mx-auto mb-12 text-center">
            <h3 className="font-bebas text-2xl text-slate-400 mb-4 uppercase tracking-widest">{t('pricingScheduleHeading')}</h3>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-md">
              <table className="w-full text-center text-sm">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-[10px] sm:text-xs">
                  <tr>
                    <th className="py-4 px-2 border-b border-gray-200">Until 31.03</th>
                    <th className="py-4 px-2 border-b border-gray-200 border-l">Until 31.05</th>
                    <th className="py-4 px-2 border-b border-gray-200 border-l">Until 29.07</th>
                    <th className="py-4 px-2 border-b border-gray-200 border-l">On spot</th>
                    <th className="py-4 px-2 border-b border-gray-200 border-l">From your promoter</th>
                  </tr>
                </thead>
                <tbody className="text-slate-900 font-bold text-lg sm:text-xl">
                  <tr>
                    <td className="py-5 px-2 border-r border-gray-100">{pricingTable['Full Pass'][0] + 5} €</td>
                    <td className="py-5 px-2 border-r border-gray-100">{pricingTable['Full Pass'][1] + 5} €</td>
                    <td className="py-5 px-2 border-r border-gray-100">{pricingTable['Full Pass'][2] + 5} €</td>
                    <td className="py-5 px-2 border-r border-gray-100">150 €</td>
                    <td className="py-5 px-2">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm sm:text-base text-slate-400 line-through font-semibold">
                          {fullPassPrice} €
                        </span>
                        <span>
                          {typeof fullPassPrice === 'number' ? fullPassPrice - 5 : '...'} €
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 bg-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 md:p-12 shadow-2xl border border-gray-100">
            
            {/* LEFT COLUMN: Pass Details */}
            <div className="flex flex-col justify-center">
              <div className="inline-flex px-6 py-2.5 rounded-full mb-6 bg-salsa-pink text-white self-start shadow-sm">
                <h2 className="font-bebas text-3xl sm:text-4xl leading-none tracking-wide">{t('passes.fullName')}</h2>
              </div>
              
              <div className="flex items-start gap-1 mb-6">
                <span className="text-xl sm:text-2xl font-bold text-slate-400 mt-2">€</span>
                <span className="text-6xl sm:text-7xl font-black text-slate-900 tracking-tight">{fullPassPrice}</span>
              </div>

              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {t('passes.fullDesc')}
              </p>
            </div>

            {/* RIGHT COLUMN: Attendee Form */}
            <div className="flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-gray-100 pt-10 lg:pt-0 lg:pl-12 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-salsa-mint/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              
              <h3 className="font-bebas text-4xl sm:text-5xl mb-8 uppercase leading-none text-slate-900 tracking-wide">{t('verifyTitle')}</h3>

              <div className="space-y-5 relative z-10">

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('nameLabel')}</label>
                  <input
                    type="text"
                    placeholder={t('namePlaceholder')}
                    required
                    maxLength={50}
                    className={`w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:bg-white font-bold uppercase text-sm transition-all text-slate-900 ${isNameInvalid ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'}`}
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
                  disabled={isAuthLoading || !realName || isNameInvalid || loading || !salesEnabled || !autoSalesOpen}
                  className="cursor-pointer w-full h-14 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-salsa-pink hover:-translate-y-1 active:translate-y-0 transition-all tracking-widest flex items-center justify-center gap-3 text-[11px] uppercase disabled:opacity-50 disabled:hover:bg-slate-900 disabled:hover:translate-y-0 mt-8"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : !autoSalesOpen ? (
                    t('salesClosedMsg')
                  ) : !salesEnabled ? (
                    t('salesPausedMsg')
                  ) : (
                    t('addBtn')
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}