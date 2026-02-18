"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { Check, ArrowRight, User, Mail, Info, Loader2, ShieldCheck } from "lucide-react";

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
    if (!auth.currentUser && !isGuest) { setShowModal(true); return; }
    if (auth.currentUser && userData?.role !== 'ambassador') {
      setLoading(true);
      const q = query(collection(db, "tickets"), where("userId", "==", auth.currentUser.uid), where("festivalYear", "==", 2025));
      const snap = await getDocs(q);
      if (!snap.empty) {
        alert("LIMIT: Standard users can buy 1 ticket per year. Ambassadors can buy multiple.");
        router.push("/account"); return;
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
        userName: realName.toUpperCase(),
        guestEmail: isGuest ? guestEmail.toLowerCase() : (auth.currentUser?.email || ""),
        isGuest, passType: selected.name, price: selected.price, status: "pending", festivalYear: 2025, purchaseDate: new Date().toISOString(), ticketID: "SLS" + Math.random().toString(36).substring(2, 7).toUpperCase()
      });
      router.push("/cart");
    } catch (e) { alert(e.message); setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat">
      <Navbar />
      <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} onGuestContinue={() => { setIsGuest(true); setShowModal(false); setStep(2); }} />
      
      <div className="pt-32 max-w-xl mx-auto px-6">
        <div className="flex justify-between mb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
            <span className={step >= 1 ? "text-salsa-pink" : ""}>Step 1</span>
            <span className={step >= 2 ? "text-salsa-pink" : ""}>Step 2</span>
            <span className={step >= 3 ? "text-salsa-pink" : ""}>Checkout</span>
        </div>
        <div className="relative h-1 bg-gray-200 rounded-full">
          <div className="absolute top-0 left-0 h-full bg-salsa-pink transition-all duration-700 rounded-full" style={{ width: `${step === 1 ? '0%' : step === 2 ? '50%' : '100%'}` }}></div>
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full flex justify-between">
            {[1, 2, 3].map((num) => (<div key={num} className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${step >= num ? 'bg-white border-salsa-pink' : 'bg-white border-gray-200'}`}></div>))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {step === 1 ? (
          <div className="mt-16 flex flex-col items-center pb-48">
            <h1 className="font-bebas text-6xl mb-4 text-center uppercase tracking-tight leading-none text-gray-900">Select Your Experience</h1>
            <p className="text-gray-400 mb-16 text-center max-w-sm font-medium text-xs uppercase tracking-widest">Choose a pass to continue</p>
            <div className="grid md:grid-cols-3 gap-8 w-full max-w-6xl mb-24">
              {PASSES.map((p) => (
                <div key={p.id} onClick={() => setSelected(p)} className={`bg-white p-10 rounded-[3rem] border-2 transition-all cursor-pointer flex flex-col items-center text-center relative ${selected?.id === p.id ? 'border-salsa-pink shadow-2xl scale-105 ring-8 ring-salsa-pink/5' : 'border-salsa-mint/20 hover:border-salsa-mint'}`}>
                  {selected?.id === p.id && <div className="absolute top-6 right-6 bg-salsa-pink text-white p-1.5 rounded-full"><Check size={12} strokeWidth={4} /></div>}
                  <h2 className="font-bebas text-4xl mb-2 text-gray-900 leading-none">{p.name}</h2>
                  <p className="text-5xl font-black text-salsa-pink mb-6">€{p.price}</p>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
            <button onClick={handleProceedToDetails} disabled={!selected || loading} className="bg-gray-900 text-white font-black px-20 py-5 rounded-2xl flex items-center gap-4 hover:bg-salsa-pink transition-all shadow-xl tracking-widest text-[10px] uppercase">
                {loading ? <Loader2 className="animate-spin" /> : <>NEXT STEP <ArrowRight size={18} /></>}
            </button>
          </div>
        ) : (
          <div className="min-h-[60vh] flex flex-col items-center justify-center py-10 pb-48">
             <div className="w-full max-w-xl">
                <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-2 border-salsa-mint/10">
                    <h2 className="font-bebas text-5xl mb-10 uppercase leading-none text-center">Verification</h2>
                    <div className="space-y-6">
                      {isGuest && (
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email for Delivery</label>
                           <input type="email" placeholder="YOUR@EMAIL.COM" required className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-8 ring-salsa-mint/5 font-bold" onChange={e => setGuestEmail(e.target.value)} />
                        </div>
                      )}
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name (As per ID)</label>
                          <input type="text" placeholder="E.G. IVAN GEORGIEV" required className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-8 ring-salsa-pink/5 font-bold uppercase transition-all" onChange={e => setRealName(e.target.value)} />
                      </div>
                      <button onClick={handleAddToCart} disabled={!realName || (isGuest && !guestEmail) || loading} className="w-full bg-salsa-pink text-white font-black py-5 rounded-2xl shadow-xl hover:opacity-90 transition-all tracking-widest flex items-center justify-center gap-3 text-xs uppercase disabled:opacity-30 mt-4">
                          {loading ? <Loader2 className="animate-spin" /> : <>Add to Cart</>}
                      </button>
                    </div>
                </div>
             </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}