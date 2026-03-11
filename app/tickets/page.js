"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import { usePopup } from "@/components/PopupProvider";
import { Check, ArrowRight, Loader2 } from "lucide-react";

const PASSES = [
  { id: 'party', name: 'Party Pass', price: 80, desc: 'Full access to all night parties from Friday to Sunday.' },
  { id: 'full', name: 'Full Pass', price: 150, desc: 'Includes all workshops, bootcamps, and all night parties.' },
  { id: 'day', name: 'Day Pass', price: 60, desc: 'Access to Saturday workshops and the Gala party.' },
];

export default function TicketPage() {
  const [step, setStep] = useState(1); 
  const [selected, setSelected] = useState(null);
  const [realName, setRealName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { showPopup } = usePopup();

  // --- NAME VALIDATION ---
  // Allows letters (including accents), spaces, hyphens, and apostrophes.
  const isValidNameChars = /^[a-zA-Z\u00C0-\u024F\s\-']+$/.test(realName);
  const isWithinWordLimit = realName.trim().split(/\s+/).length <= 5;
  const isNameInvalid = realName.length > 0 && (!isValidNameChars || !isWithinWordLimit);

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const d = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (d.exists()) setUserData(d.data());
      }
    };
    fetchUser();
  }, [auth.currentUser]);

  const handleProceedToDetails = async () => {
    if (!auth.currentUser && !isGuest) { 
      setShowModal(true); 
      return; 
    }
    
    if (auth.currentUser && userData?.role !== 'ambassador') {
      setLoading(true);
      const q = query(
        collection(db, "tickets"), 
        where("userId", "==", auth.currentUser.uid), 
        where("festivalYear", "==", 2026)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        setLoading(false);
        showPopup({
          type: "info",
          title: "Limit Reached",
          message: "Standard users can only purchase one pass per festival year. If you are buying for a group, you must be an Ambassador.",
          confirmText: "View My Passes",
          onConfirm: () => {
            router.push("/account"); 
          }
        });
        return;
      }
      setLoading(false);
    }
    
    setStep(2);
  };

  const handleAddToCart = async () => {
    setLoading(true);
    try {
      let currentID = auth.currentUser ? auth.currentUser.uid : sessionStorage.getItem("guestSessionID");
      if (!currentID) {
          currentID = "guest_" + Math.random().toString(36).substring(2, 12);
          sessionStorage.setItem("guestSessionID", currentID);
      }
      await addDoc(collection(db, "tickets"), {
        userId: currentID,
        userName: realName.trim().toUpperCase(),
        guestEmail: isGuest ? guestEmail.trim().toLowerCase() : (auth.currentUser?.email || ""),
        isGuest, 
        passType: selected.name, 
        price: selected.price, 
        status: "pending", 
        festivalYear: 2026, 
        purchaseDate: new Date().toISOString(), 
        ticketID: "SLS" + Math.random().toString(36).substring(2, 7).toUpperCase()
      });
      router.push("/cart");
    } catch (e) { 
      showPopup({
        type: "error",
        title: "Purchase Error",
        message: e.message,
        confirmText: "Close"
      });
      setLoading(false); 
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-salsa-white font-montserrat">
      <Navbar />
      <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} onGuestContinue={() => { setIsGuest(true); setShowModal(false); setStep(2); }} />
      
      <div className="flex-grow flex flex-col justify-center items-center w-full pt-28 pb-12 px-6">
        
        {/* PROGRESS BAR (Restored with checkpoint dots!) */}
        <div className="w-full max-w-xl mb-8">
          <div className="flex justify-between mb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
              <span className={step >= 1 ? "text-salsa-pink transition-colors duration-500" : ""}>Step 1</span>
              <span className={step >= 2 ? "text-salsa-pink transition-colors duration-500" : ""}>Step 2</span>
              <span className={step >= 3 ? "text-salsa-pink transition-colors duration-500" : ""}>Checkout</span>
          </div>
          <div className="relative h-1 bg-gray-200 rounded-full">
            <div className="absolute top-0 left-0 h-full bg-salsa-pink transition-all duration-700 rounded-full" style={{ width: `${step === 1 ? '0%' : step === 2 ? '50%' : '100%'}` }}></div>
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full flex justify-between">
              {[1, 2, 3].map((num) => (
                <div key={num} className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-700 ${step >= num ? 'bg-white border-salsa-pink' : 'bg-white border-gray-200'}`}></div>
              ))}
            </div>
          </div>
        </div>

        {/* STEP 1: PASS SELECTION */}
        {step === 1 ? (
          <div className="flex flex-col items-center w-full animate-in fade-in duration-500">
            
            <h1 className="font-bebas text-5xl md:text-6xl text-slate-900 leading-none tracking-wide mb-2 uppercase">Select Your Pass</h1>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-8">Choose an experience to continue</p>
            
            <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl mb-8">
              {PASSES.map((p) => (
                <div 
                  key={p.id} 
                  onClick={() => setSelected(p)} 
                  className={`bg-white p-8 rounded-[2.5rem] border-2 transition-all duration-300 cursor-pointer flex flex-col items-center text-center relative hover:-translate-y-1
                  ${selected?.id === p.id 
                    ? 'border-salsa-pink shadow-[0_15px_40px_rgba(232,75,138,0.15)] ring-4 ring-salsa-pink/10' 
                    : 'border-gray-100 hover:border-salsa-mint/40 hover:shadow-lg'
                  }`}
                >
                  <div className={`absolute -top-3 -right-3 bg-salsa-pink text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${selected?.id === p.id ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                    <Check size={16} strokeWidth={4} />
                  </div>
                  
                  <div className={`px-4 py-2 rounded-2xl mb-4 transition-colors duration-300 ${selected?.id === p.id ? 'bg-salsa-pink/10' : 'bg-gray-50'}`}>
                    <h2 className="font-bebas text-3xl text-slate-900 leading-none tracking-wide">{p.name}</h2>
                  </div>
                  
                  <div className="flex items-start justify-center gap-1 mb-4">
                     <span className="text-lg font-bold text-slate-400 mt-1">€</span>
                     <span className="text-5xl font-black text-slate-900 tracking-tighter">{p.price}</span>
                  </div>
                  
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-2 border-t border-gray-100 pt-4">
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
            
            <button 
              onClick={handleProceedToDetails} 
              disabled={!selected || loading} 
              className="cursor-pointer group bg-slate-900 text-white font-black px-16 py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-salsa-pink transition-all shadow-xl tracking-widest text-[10px] uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin" /> : <>NEXT STEP <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </div>
        ) : (
          
          /* STEP 2: VERIFICATION FORM */
          <div className="flex flex-col items-center justify-center w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-salsa-mint/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                
                <h2 className="font-bebas text-5xl mb-6 uppercase leading-none text-center text-slate-900 relative z-10">Verify Details</h2>
                
                <div className="space-y-5 relative z-10">
                  <div className="flex justify-center mb-2">
                      <span className="bg-slate-50 text-slate-600 border border-gray-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
                        Selected: <span className="text-salsa-pink">{selected?.name}</span>
                      </span>
                  </div>

                  {isGuest && (
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Email for Delivery</label>
                        <input type="email" placeholder="YOUR@EMAIL.COM" required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:border-salsa-mint focus:ring-2 ring-salsa-mint/30 font-bold text-sm transition-all text-slate-900" onChange={e => setGuestEmail(e.target.value)} />
                    </div>
                  )}
                  
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Full Name (As per ID)</label>
                      <input 
                        type="text" 
                        placeholder="E.G. IVAN GEORGIEV" 
                        required 
                        className={`w-full p-3.5 bg-gray-50 border rounded-2xl outline-none focus:bg-white focus:ring-2 font-bold uppercase text-sm transition-all text-slate-900
                          ${isNameInvalid ? 'border-red-400 focus:border-red-500 ring-red-500/30' : 'border-gray-200 focus:border-salsa-pink ring-salsa-pink/30'}`} 
                        onChange={e => setRealName(e.target.value)} 
                      />
                      {/* Name Validation Error Message */}
                      {isNameInvalid && (
                        <p className="text-red-500 text-[10px] font-bold mt-1 ml-2 tracking-widest">
                          {!isWithinWordLimit ? "Maximum 5 words allowed." : "Only letters, spaces, hyphens, and apostrophes."}
                        </p>
                      )}
                  </div>
                  
                  <button 
                    onClick={handleAddToCart} 
                    disabled={!realName || isNameInvalid || (isGuest && !guestEmail) || loading} 
                    className="cursor-pointer w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-salsa-pink hover:scale-105 active:scale-95 transition-all tracking-widest flex items-center justify-center gap-3 text-[10px] uppercase disabled:opacity-50 disabled:hover:bg-slate-900 disabled:hover:scale-100 mt-6"
                  >
                      {loading ? <Loader2 className="animate-spin" /> : <>Add to Cart</>}
                  </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}