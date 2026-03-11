"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePopup } from "@/components/PopupProvider"; 
import { Trash2, ShoppingBag, Lock, Loader2, Ticket, ShieldCheck } from "lucide-react";

export default function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const router = useRouter();
  
  const { showPopup } = usePopup(); 

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      const currentID = user ? user.uid : sessionStorage.getItem("guestSessionID");
      if (currentID) {
        const q = query(collection(db, "tickets"), where("userId", "==", currentID), where("status", "==", "pending"));
        const unsub = onSnapshot(q, (snap) => {
          setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        });
        return () => unsub();
      } else { 
        setLoading(false); 
      }
    });
    return () => unsubAuth();
  }, []);

  const total = items.reduce((acc, item) => acc + item.price, 0);

  // --- THE REAL STRIPE LOGIC ---
  const handleCheckout = async () => {
    setIsPaying(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
          throw new Error(data.error || "Server error");
      }

      if (data.url) {
          window.location.href = data.url; 
      } else {
          throw new Error("No URL returned from Stripe.");
      }

    } catch (err) {
      showPopup({
        type: "error",
        title: "Checkout Error",
        message: err.message,
        confirmText: "Close"
      });
      setIsPaying(false);
    }
  };

  // --- CUSTOM POPUP DELETION ---
  const confirmRemoveItem = (id, userName) => {
    showPopup({
      type: "info",
      title: "Remove Pass?",
      message: `Are you sure you want to remove the ticket for ${userName}?`,
      confirmText: "Yes, Remove",
      cancelText: "Keep It",
      onConfirm: async () => {
        await deleteDoc(doc(db, "tickets", id));
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-salsa-white">
        <Loader2 className="animate-spin text-salsa-pink" size={48} />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-salsa-white font-montserrat">
      <Navbar />
      
      <div className="flex-grow max-w-7xl mx-auto px-6 w-full pt-40 pb-24">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <div>
                <h1 className="font-bebas text-6xl md:text-8xl tracking-tight leading-none text-slate-900 uppercase">Your Cart</h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Review your selections</p>
            </div>
            {items.length > 0 && (
              <div className="bg-white px-6 py-3.5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                  <ShoppingBag className="text-salsa-pink" size={18} />
                  <span className="font-black text-[10px] uppercase tracking-widest text-slate-700">{items.length} {items.length === 1 ? 'Item' : 'Items'}</span>
              </div>
            )}
        </div>

        {items.length > 0 ? (
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            
            {/* LEFT COLUMN: ITEMS LIST */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-5">
              {items.map(item => (
                <div key={item.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group">
                  
                  {/* Item Details */}
                  <div className="flex items-center gap-6 mb-4 md:mb-0">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 group-hover:bg-salsa-pink/5 group-hover:border-salsa-pink/20 transition-colors">
                      <Ticket className="text-gray-400 group-hover:text-salsa-pink transition-colors" size={24} />
                    </div>
                    <div>
                      <span className="bg-salsa-pink/10 text-salsa-pink text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">{item.passType}</span>
                      <h3 className="text-2xl font-black mt-3 uppercase text-slate-900 leading-none tracking-wide">{item.userName}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Festival Year: {item.festivalYear}</p>
                    </div>
                  </div>

                  {/* Price & Actions */}
                  <div className="flex items-center justify-between w-full md:w-auto gap-8 pt-4 border-t border-gray-50 md:border-none md:pt-0">
                    <p className="font-bebas text-4xl text-slate-900">€{item.price}</p>
                    <button 
                      onClick={() => confirmRemoveItem(item.id, item.userName)} 
                      className="cursor-pointer w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT COLUMN: SUMMARY BOX */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-gray-100 shadow-2xl sticky top-32">
                <h2 className="font-bebas text-5xl mb-8 uppercase text-slate-900 tracking-wide">Summary</h2>
                
                {/* Breakdown */}
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-500">
                      <span>Subtotal</span>
                      <span className="text-slate-900 text-sm">€{total}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-500">
                      <span>Processing Fees</span>
                      <span className="text-gray-400">Calculated next</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-end border-t border-gray-100 pt-8 mb-8">
                    <span className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-2">Total Due</span>
                    <span className="font-bebas text-6xl text-salsa-pink leading-none">€{total}</span>
                </div>

                {/* Checkout Button */}
                <button 
                    onClick={handleCheckout} 
                    disabled={isPaying} 
                    className="cursor-pointer w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-salsa-pink hover:scale-105 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 disabled:hover:bg-slate-900 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                    {isPaying ? <Loader2 className="animate-spin" /> : <><Lock size={16}/> Proceed to Pay</>}
                </button>

                {/* Secure Checkout Badge */}
                <div className="mt-6 flex items-center justify-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <ShieldCheck size={14} className="text-emerald-500" /> Secure encrypted checkout
                </div>
              </div>
            </div>

          </div>
        ) : (
          
          /* EMPTY STATE */
          <div className="w-full border-2 border-dashed border-salsa-mint/40 bg-[#f4fdfb] rounded-[3rem] py-32 flex flex-col items-center justify-center text-center shadow-sm animate-in fade-in duration-500">
            <div className="mb-6">
              <ShoppingBag size={56} className="text-slate-300 stroke-[1.5]" />
            </div>
            <h3 className="font-bebas text-4xl text-slate-400 tracking-wide uppercase mb-4">Cart is empty</h3>
            <Link href="/tickets" className="text-salsa-pink text-[11px] font-black uppercase tracking-[0.2em] hover:underline transition-all">
              Browse Tickets
            </Link>
          </div>

        )}
      </div>
      
      <Footer />
    </main>
  );
}