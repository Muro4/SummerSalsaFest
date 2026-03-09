"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function SuccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activateTickets = async () => {
      // 1. Give Firebase Auth 1 second to confirm who is logged in
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. Identify the user (Account Holder OR Guest)
      const currentID = auth.currentUser ? auth.currentUser.uid : sessionStorage.getItem("guestSessionID");

      if (currentID) {
        try {
          // 3. Find all "pending" tickets in their cart
          const q = query(
            collection(db, "tickets"), 
            where("userId", "==", currentID), 
            where("status", "==", "pending")
          );
          const snap = await getDocs(q);
          
          // 4. Update all found tickets to "active"
          for (const document of snap.docs) {
            await updateDoc(doc(db, "tickets", document.id), { 
                status: "active",
                paymentConfirmedAt: new Date().toISOString() // Optional: Save exactly when they paid
            });
          }
          
          setLoading(false);
          
          // 5. Wait 3 seconds so they can read the success message, then redirect
          setTimeout(() => {
              if (auth.currentUser) {
                  router.push("/account"); // Registered users go to their hub
              } else {
                  // Guests go home (or you can create a specific guest-success page later)
                  sessionStorage.removeItem("guestSessionID"); // Clear guest memory
                  router.push("/"); 
              }
          }, 3000);

        } catch (error) {
          console.error("Error activating tickets:", error);
          alert("Payment received, but database sync failed. Please contact support.");
        }
      } else {
        // Fallback if no ID is found
        setLoading(false);
        setTimeout(() => router.push("/"), 5000);
      }
    };
    
    activateTickets();
  }, [router]);

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="bg-white p-16 rounded-[4rem] shadow-2xl border-2 border-emerald-100 max-w-lg w-full animate-in zoom-in duration-500">
            {loading ? (
               <div className="flex flex-col items-center">
                  <Loader2 className="animate-spin text-salsa-pink mb-6" size={60} />
                  <h1 className="font-bebas text-5xl text-gray-900 uppercase">Confirming Payment...</h1>
                  <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-4">Please do not close this window</p>
               </div>
            ) : (
               <div className="flex flex-col items-center animate-in fade-in duration-500">
                  <CheckCircle className="text-emerald-500 mb-6" size={80} />
                  <h1 className="font-bebas text-6xl text-gray-900 mb-4 uppercase leading-none">Payment Successful!</h1>
                  <p className="text-gray-500 font-bold text-sm">Your passes are now active and ready.</p>
                  <p className="text-salsa-mint font-black text-[10px] uppercase tracking-widest mt-8 animate-pulse">Redirecting...</p>
               </div>
            )}
        </div>
      </div>
    </main>
  );
}