"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Trash2, ShoppingBag, Lock, Loader2, ArrowRight, CreditCard } from "lucide-react";

export default function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const router = useRouter();

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
      } else { setLoading(false); }
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
          // Teleport the user to Stripe's secure page
          window.location.href = data.url; 
      } else {
          throw new Error("No URL returned from Stripe.");
      }

    } catch (err) {
      alert("Checkout Error: " + err.message);
      setIsPaying(false);
    }
  };

  const removeItem = async (id) => {
    if(confirm("Remove this ticket from your cart?")) {
        await deleteDoc(doc(db, "tickets", id));
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bebas text-5xl">Loading...</div>;

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat">
      <Navbar />
      <div className="pt-40 pb-40 max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
                <h1 className="font-bebas text-7xl md:text-8xl tracking-tighter leading-none text-gray-900 uppercase">Your Cart</h1>
                <p className="text-gray-400 text-sm font-bold uppercase tracking-[0.2em] mt-2">Review your selections</p>
            </div>
            <div className="bg-white px-6 py-3 rounded-2xl border border-salsa-mint/30 shadow-sm flex items-center gap-3">
                <ShoppingBag className="text-salsa-pink" size={20} />
                <span className="font-black text-[10px] uppercase tracking-widest text-gray-600">{items.length} Items</span>
            </div>
        </div>

        {items.length > 0 ? (
          <div className="grid lg:grid-cols-12 gap-16">
            {/* Items List */}
            <div className="lg:col-span-8 space-y-6">
              {items.map(item => (
                <div key={item.id} className="bg-white p-8 rounded-[3rem] border-2 border-salsa-mint/10 flex justify-between items-center shadow-xl group">
                  <div>
                    <span className="bg-salsa-pink/10 text-salsa-pink text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{item.passType}</span>
                    <h3 className="text-2xl font-bold mt-2 uppercase">{item.userName}</h3>
                  </div>
                  <div className="flex items-center gap-8">
                    <p className="font-bebas text-4xl text-gray-900">€{item.price}</p>
                    <button onClick={() => removeItem(item.id)} className="p-3 text-gray-300 hover:text-red-500 transition"><Trash2 /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Box */}
            <div className="lg:col-span-4">
              <div className="bg-white p-10 rounded-[3rem] border-2 border-salsa-mint/20 shadow-2xl sticky top-32">
                <h2 className="font-bebas text-5xl mb-6 uppercase">Summary</h2>
                <div className="flex justify-between items-end border-t pt-6 mb-8">
                    <span className="font-black text-xs uppercase text-gray-400">Total</span>
                    <span className="font-bebas text-6xl text-salsa-pink">€{total}</span>
                </div>
                <button 
                    onClick={handleCheckout} 
                    disabled={isPaying} 
                    className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl hover:bg-salsa-pink transition flex items-center justify-center gap-3 text-xs uppercase tracking-widest disabled:opacity-50"
                >
                    {isPaying ? <Loader2 className="animate-spin" /> : <><Lock size={18}/> Pay Securely</>}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-salsa-mint/20">
              <ShoppingBag className="mx-auto text-gray-200 mb-4" size={64}/>
              <p className="font-bebas text-3xl text-gray-400 uppercase">Cart is empty</p>
              <Link href="/tickets" className="text-salsa-pink font-bold underline mt-4 inline-block tracking-widest uppercase text-xs">Browse Tickets</Link>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}