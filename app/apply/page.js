"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { usePopup } from "@/components/PopupProvider";
import { 
  Loader2, ArrowLeft, Send, Tag, Phone, 
  MessageSquare, Star, AtSign
} from "lucide-react";
import Link from "next/link";

export default function ApplyPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    guestDancerTag: "",
    email: "",
    promoCode: "",
    phone: "",
    motivation: "",
    mainStyle: ""
  });

  const router = useRouter();
  const { showPopup } = usePopup();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Auto-fill email
        setFormData(prev => ({ ...prev, email: currentUser.email || "" }));

        try {
          // Check if already an approved ambassador
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists() && (userDoc.data().role === 'ambassador' || userDoc.data().role === 'superadmin')) {
             router.push("/account"); 
             return;
          }

          // Check if already applied (Wrapped in try/catch to fix the Firebase Permission Error)
          const appDoc = await getDoc(doc(db, "ambassador_requests", currentUser.uid));
          if (appDoc.exists()) {
             showPopup({ type: "info", title: "Pending", message: "You have already applied.", confirmText: "Go Back", onConfirm: () => router.push("/account") });
             router.push("/account");
             return;
          }
        } catch (err) {
          console.warn("Permission restricted for checking requests, bypassing...", err.message);
        }
        
        setLoading(false);
      } else {
        router.push("/login");
      }
    });
    return () => unsub();
  }, [router, showPopup]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Real-time validation formatting
    if (name === "promoCode") {
      // Only alphanumeric, forced to uppercase
      const cleaned = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      setFormData(prev => ({ ...prev, [name]: cleaned }));
      return;
    }

    if (name === "phone") {
      // Only numbers, spaces, plus, and hyphens
      const cleaned = value.replace(/[^0-9+\s\-]/g, "");
      setFormData(prev => ({ ...prev, [name]: cleaned }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Final Validation Checks
    if (!formData.guestDancerTag.trim() || !formData.promoCode.trim() || !formData.phone.trim() || !formData.motivation.trim() || !formData.mainStyle) {
      showPopup({ type: "error", title: "Missing Info", message: "Please fill out all fields before submitting.", confirmText: "Okay" });
      return;
    }

    if (formData.guestDancerTag.length > 20) {
      showPopup({ type: "error", title: "Tag Too Long", message: "Your Guest Dancer Tag cannot exceed 20 characters.", confirmText: "Okay" });
      return;
    }

    setSubmitting(true);
    try {
      // Save directly to ambassador_requests
      await setDoc(doc(db, "ambassador_requests", user.uid), {
        userId: user.uid,
        name: formData.guestDancerTag.trim(),
        email: formData.email.trim(),
        promoCode: formData.promoCode.trim(),
        phone: formData.phone.trim(),
        pitch: formData.motivation.trim(),
        mainStyle: formData.mainStyle,
        status: "pending",
        createdAt: new Date().toISOString()
      });
      
      showPopup({ 
        type: "success", 
        title: "Application Sent!", 
        message: "Your Guest Dancer application is under review. We will contact you soon!", 
        confirmText: "Back to Account",
        onConfirm: () => router.push("/account")
      });
    } catch (err) {
      showPopup({ type: "error", title: "Error", message: err.message, confirmText: "Close" });
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>;

  return (
    <main className="min-h-screen bg-salsa-white pt-32 pb-20 font-montserrat select-none">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6">
        
        {/* Back Button */}
        <Link href="/account" className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors mb-8">
          <ArrowLeft size={16} /> Back to Account
        </Link>

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="font-bebas text-6xl md:text-7xl uppercase text-slate-900 leading-none">Guest Dancer Request Form</h1>
          <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] mt-3">Join the official festival crew</p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.05)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-salsa-pink via-violet-500 to-teal-400"></div>

          <div className="space-y-6">
            
            {/* Tag & Email Row */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Guest Dancer Tag</label>
                <div className="relative flex items-center">
                  <AtSign className="absolute left-4 text-slate-400" size={16} />
                  <input 
                    type="text" name="guestDancerTag" placeholder="E.G. SALSA KING" required
                    maxLength={20}
                    value={formData.guestDancerTag} onChange={handleInputChange}
                    className="w-full bg-transparent border-2 border-gray-200 text-slate-900 font-bold rounded-2xl px-4 py-4 pl-12 outline-none focus:border-slate-900 transition-colors text-[11px] uppercase tracking-widest"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative flex items-center">
                  <input 
                    type="email" name="email" readOnly
                    value={formData.email}
                    className="w-full bg-gray-50 border-2 border-transparent text-slate-400 font-bold rounded-2xl px-4 py-4 outline-none cursor-not-allowed text-[11px] uppercase tracking-widest"
                  />
                </div>
              </div>
            </div>

            {/* Promo Code & Phone Row */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desired Promo Code</label>
                <div className="relative flex items-center">
                  <Tag className="absolute left-4 text-slate-400" size={16} />
                  <input 
                    type="text" name="promoCode" placeholder="E.G. DANCE2026" required
                    maxLength={15}
                    value={formData.promoCode} onChange={handleInputChange}
                    className="w-full bg-transparent border-2 border-gray-200 text-slate-900 font-bold rounded-2xl px-4 py-4 pl-12 outline-none focus:border-slate-900 transition-colors text-[11px] uppercase tracking-widest"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-4 text-slate-400" size={16} />
                  <input 
                    type="tel" name="phone" placeholder="+123 456 789" required
                    maxLength={20}
                    value={formData.phone} onChange={handleInputChange}
                    className="w-full bg-transparent border-2 border-gray-200 text-slate-900 font-bold rounded-2xl px-4 py-4 pl-12 outline-none focus:border-slate-900 transition-colors text-[11px] uppercase tracking-widest"
                  />
                </div>
              </div>
            </div>

            {/* Dance Style - Vertical on mobile, horizontal on desktop */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Main Dance Style</label>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                {["Bachata", "Zouk", "Salsa", "Kizomba"].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, mainStyle: style }))}
                    className={`flex-1 py-3.5 px-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border-2 cursor-pointer
                      ${formData.mainStyle === style 
                        ? 'border-salsa-pink bg-salsa-pink text-white shadow-md' 
                        : 'border-gray-200 bg-transparent text-slate-400 hover:border-gray-300 hover:text-slate-600'
                      }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Motivation Textarea with larger counter */}
            <div className="space-y-2">
              <div className="flex justify-between items-end ml-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Why do you want to join us?</label>
                <span className={`text-[11px] font-bold ${formData.motivation.length >= 300 ? 'text-red-500' : 'text-slate-400'}`}>
                  {formData.motivation.length} / 300
                </span>
              </div>
              <div className="relative w-full">
                <MessageSquare className="absolute left-4 top-4 text-slate-400" size={16} />
                <textarea 
                  name="motivation" placeholder="TELL US ABOUT YOUR SCENE..." required
                  maxLength={300}
                  value={formData.motivation} onChange={handleInputChange}
                  className="w-full min-h-[150px] max-h-[250px] resize-y bg-transparent border-2 border-gray-200 text-slate-900 font-bold rounded-2xl px-4 py-4 pl-12 outline-none focus:border-slate-900 transition-colors text-[11px] uppercase tracking-widest leading-relaxed"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-salsa-pink hover:shadow-lg hover:shadow-salsa-pink/20 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> Submit Application</>}
            </button>

          </div>
        </form>
      </div>
    </main>
  );
}