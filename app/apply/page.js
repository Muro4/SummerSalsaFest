"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { usePopup } from "@/components/PopupProvider";
import { 
  Loader2, ArrowLeft, Send, User, Mail, Tag, Phone, 
  MessageSquare, Music, Star 
} from "lucide-react";
import Link from "next/link";
import CustomDropdown from "@/components/CustomDropdown";

export default function ApplyPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    posterName: "",
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

        // Check if already applied or already an ambassador
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists() && (userDoc.data().role === 'ambassador' || userDoc.data().role === 'superadmin')) {
             router.push("/account"); // Already approved
             return;
          }

          const appDoc = await getDoc(doc(db, "ambassador_requests", currentUser.uid));
          if (appDoc.exists()) {
             showPopup({ type: "info", title: "Pending", message: "You have already applied.", confirmText: "Go Back", onConfirm: () => router.push("/account") });
             router.push("/account");
             return;
          }
        } catch (err) {
          console.error("Fetch error", err);
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.posterName || !formData.promoCode || !formData.phone || !formData.motivation || !formData.mainStyle) {
      showPopup({ type: "error", title: "Missing Info", message: "Please fill out all fields before submitting.", confirmText: "Okay" });
      return;
    }

    setSubmitting(true);
    try {
      // We keep saving it to 'ambassador_requests' so the DB logic doesn't break
      await setDoc(doc(db, "ambassador_requests", user.uid), {
        userId: user.uid,
        name: formData.posterName.trim(),
        email: formData.email.trim(),
        promoCode: formData.promoCode.trim().toUpperCase(),
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
    <main className="min-h-screen bg-salsa-white pt-32 pb-20 font-montserrat">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6">
        
        {/* Back Button */}
        <Link href="/account" className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors mb-8">
          <ArrowLeft size={16} /> Back to Account
        </Link>

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-salsa-pink/10 rounded-full flex items-center justify-center text-salsa-pink mx-auto mb-6 shadow-sm">
            <Star size={32} />
          </div>
          <h1 className="font-bebas text-6xl md:text-7xl uppercase text-slate-900 leading-none">Guest Dancer</h1>
          <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] mt-3">Join the official festival crew</p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.05)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-salsa-pink via-violet-500 to-teal-400"></div>

          <div className="space-y-6">
            
            {/* Poster Name & Email Row */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name (As on Poster)</label>
                <div className="relative flex items-center">
                  <User className="absolute left-4 text-gray-400" size={16} />
                  <input 
                    type="text" name="posterName" placeholder="STAGE NAME" required
                    value={formData.posterName} onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-bold rounded-2xl px-4 py-4 pl-12 outline-none focus:bg-white focus:border-salsa-pink transition-all text-[11px] uppercase tracking-widest"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 text-gray-400" size={16} />
                  <input 
                    type="email" name="email" readOnly
                    value={formData.email}
                    className="w-full bg-gray-100 border border-transparent text-slate-500 font-bold rounded-2xl px-4 py-4 pl-12 outline-none cursor-not-allowed text-[11px] uppercase tracking-widest"
                  />
                </div>
              </div>
            </div>

            {/* Promo Code & Phone Row */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desired Promo Code</label>
                <div className="relative flex items-center">
                  <Tag className="absolute left-4 text-gray-400" size={16} />
                  <input 
                    type="text" name="promoCode" placeholder="E.G. DANCE2026" required
                    value={formData.promoCode} onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-bold rounded-2xl px-4 py-4 pl-12 outline-none focus:bg-white focus:border-salsa-pink transition-all text-[11px] uppercase tracking-widest"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-4 text-gray-400" size={16} />
                  <input 
                    type="tel" name="phone" placeholder="+123 456 789" required
                    value={formData.phone} onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-bold rounded-2xl px-4 py-4 pl-12 outline-none focus:bg-white focus:border-salsa-pink transition-all text-[11px] uppercase tracking-widest"
                  />
                </div>
              </div>
            </div>

            {/* Main Style Dropdown */}
            <div className="space-y-2 relative z-20">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Main Dance Style</label>
              <CustomDropdown
                icon={Music}
                value={formData.mainStyle || "Select Style"}
                onChange={(val) => setFormData(prev => ({ ...prev, mainStyle: val }))}
                options={[
                  { label: "Select Style", value: "" },
                  { label: "Bachata", value: "Bachata", isPill: true, colorClass: "bg-violet-100 text-violet-700" },
                  { label: "Zouk", value: "Zouk", isPill: true, colorClass: "bg-teal-100 text-teal-700" },
                  { label: "Salsa", value: "Salsa", isPill: true, colorClass: "bg-salsa-pink/20 text-salsa-pink" },
                  { label: "Kizomba", value: "Kizomba", isPill: true, colorClass: "bg-amber-100 text-amber-700" }
                ]}
                variant="default"
              />
            </div>

            {/* Motivation Textarea */}
            <div className="space-y-2">
              <div className="flex justify-between items-end ml-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Why do you want to join us?</label>
                <span className={`text-[9px] font-bold ${formData.motivation.length >= 300 ? 'text-red-500' : 'text-slate-300'}`}>
                  {formData.motivation.length} / 300
                </span>
              </div>
              <div className="relative w-full">
                <MessageSquare className="absolute left-4 top-4 text-gray-400" size={16} />
                <textarea 
                  name="motivation" placeholder="TELL US ABOUT YOUR SCENE..." required
                  maxLength={300}
                  value={formData.motivation} onChange={handleInputChange}
                  className="w-full min-h-[150px] max-h-[250px] resize-y bg-gray-50 border border-gray-200 text-slate-900 font-bold rounded-2xl px-4 py-4 pl-12 outline-none focus:bg-white focus:border-salsa-pink transition-all text-[11px] uppercase tracking-widest leading-relaxed"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-salsa-pink hover:shadow-lg hover:shadow-salsa-pink/20 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> Submit Application</>}
            </button>

          </div>
        </form>
      </div>
    </main>
  );
}