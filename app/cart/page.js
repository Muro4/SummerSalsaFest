"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Trash2, ShoppingBag, Lock, Loader2, ArrowRight } from "lucide-react";

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

  const handleCheckout = async () => {
    setIsPaying(true);
    await new Promise(r => setTimeout(r, 2000));
    for (const item of items) { await updateDoc(doc(db, "tickets", item.id), { status: "active" }); }
    router.push(auth.currentUser ? "/account" : "/"); 
    alert("Payment Successful! Guests will receive tickets via email.");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bebas text-5xl">Loading...</div>;

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat">
      <Navbar />
      <div className="pt-40 pb-40 max-w-7xl mx-auto px-6">
        <h1 className="font-bebas text-7xl mb-12">Your Cart</h1>
        {items.length > 0 ? (
          <div className="grid lg:grid-cols-12 gap-16">
            <div className="lg:col-span-8 space-y-6">
              {items.map(item => (
                <div key={item.id} className="bg-white p-8 rounded-[3rem] border-2 border-salsa-mint/10 flex justify-between items-center shadow-xl group">
                  <div>
                    <span className="bg-salsa-pink/10 text-salsa-pink text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{item.passType}</span>
                    <h3 className="text-2xl font-bold mt-2 uppercase">{item.userName}</h3>
                  </div>
                  <div className="flex items-center gap-8">
                    <p className="font-bebas text-4xl text-gray-900">€{item.price}</p>
                    <button onClick={() => deleteDoc(doc(db, "tickets", item.id))} className="p-3 text-gray-300 hover:text-red-500 transition"><Trash2 /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-4">
              <div className="bg-white p-10 rounded-[3rem] border-2 border-salsa-mint/20 shadow-2xl sticky top-32">
                <h2 className="font-bebas text-5xl mb-6">Summary</h2>
                <div className="flex justify-between items-end border-t pt-6 mb-8"><span className="font-black text-xs uppercase text-gray-400">Total</span><span className="font-bebas text-6xl text-salsa-pink">€{total}</span></div>
                <button onClick={handleCheckout} disabled={isPaying} className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl hover:bg-salsa-pink transition flex items-center justify-center gap-3 text-xs uppercase tracking-widest">{isPaying ? <Loader2 className="animate-spin" /> : <><Lock size={18}/> Pay Securely</>}</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-salsa-mint/20"><ShoppingBag className="mx-auto text-gray-200 mb-4" size={64}/><p className="font-bebas text-3xl text-gray-400 uppercase">Cart is empty</p><Link href="/tickets" className="text-salsa-pink font-bold underline mt-4 inline-block tracking-widest uppercase text-xs">Browse Tickets</Link></div>
        )}
      </div>
      <Footer />
    </main>
  );
}