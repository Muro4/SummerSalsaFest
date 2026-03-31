"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Mail, Phone, MapPin, Send, CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function ContactPage() {
  const t = useTranslations('Contact');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState(null);
  
  // Cooldown state for spam prevention (in seconds)
  const [cooldown, setCooldown] = useState(0);
  
  // Real-time validation states
  const [emailError, setEmailError] = useState("");
  
  // CAPTCHA States
  const [captchaAuth, setCaptchaAuth] = useState({ num1: 0, num2: 0 });
  const [userCaptcha, setUserCaptcha] = useState("");
  const [captchaError, setCaptchaError] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "Tickets",
    message: ""
  });
  
  // Custom subject state for "Other" category
  const [customSubject, setCustomSubject] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Categories mapping (Internal DB value vs UI translated label)
  const categories = [
    { id: "Tickets", label: t('catTickets') },
    { id: "Workshops", label: t('catWorkshops') },
    { id: "Media", label: t('catMedia') },
    { id: "Other", label: t('catOther') }
  ];

  // Generate a new math problem on load and after submission
  const generateCaptcha = () => {
    setCaptchaAuth({
      num1: Math.floor(Math.random() * 10) + 1, // 1 to 10
      num2: Math.floor(Math.random() * 10) + 1  // 1 to 10
    });
    setUserCaptcha("");
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  // Cooldown Timer Effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === "email" && emailError) {
      if (emailRegex.test(value.trim()) || value === "") setEmailError("");
    }
  };

  const handleEmailBlur = (e) => {
    const val = e.target.value.trim();
    if (val !== "" && !emailRegex.test(val)) {
      setEmailError(t('errEmail'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Spam prevention check
    if (cooldown > 0) {
      setError(t('errSpam', { cooldown }));
      return;
    }

    // Basic empty check
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError(t('errEmpty'));
      return;
    }

    // Custom Subject check
    if (formData.category === "Other" && !customSubject.trim()) {
      setError(t('errSubject'));
      return;
    }

    // Strict Email Validation
    if (!emailRegex.test(formData.email.trim())) {
      setEmailError(t('errEmail'));
      return;
    }

    // CAPTCHA Validation
    if (parseInt(userCaptcha) !== captchaAuth.num1 + captchaAuth.num2) {
      setCaptchaError(t('errCaptcha'));
      generateCaptcha(); // Reset the math problem so bots can't brute force the same one
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setEmailError("");
    setCaptchaError("");
    
    try {
      const finalSubject = formData.category === "Other" ? customSubject.trim() : formData.category;

      await addDoc(collection(db, "contact_messages"), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        category: formData.category,
        subject: finalSubject,
        message: formData.message.trim(),
        status: "unread", 
        createdAt: new Date().toISOString()
      });
      
      setIsSent(true);
      setCooldown(60); 
      setFormData({ name: "", email: "", category: "Tickets", message: "" });
      setCustomSubject("");
      generateCaptcha(); // Prep for next message
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(t('errFail'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat selection:bg-salsa-pink selection:text-white">
      <Navbar />

      <section className="relative pt-32 sm:pt-40 pb-24 sm:pb-32 px-4 sm:px-6 overflow-hidden bg-slate-900">
        <div 
          className="absolute inset-0 z-0 opacity-60"
          style={{ 
            backgroundImage: `linear-gradient(to bottom, rgba(125, 211, 192, 0.8), rgba(10, 0, 36, 0.9)), url('/images/background.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        />
        
        <div className="relative z-10 max-w-7xl mx-auto text-center md:text-left">
          <h1 className="animate-fade-in delay-300 font-modak text-6xl sm:text-7xl md:text-9xl text-white leading-none uppercase drop-shadow-2xl flex flex-wrap justify-center md:justify-start gap-3">
            {t('heroTitle1')} <span className="text-salsa-pink">{t('heroTitle2')}</span>
          </h1>
          <p className="animate-fade-in delay-500 mt-6 md:mt-8 text-white/100 text-sm sm:text-lg md:text-xl font-medium max-w-2xl leading-relaxed mx-auto md:mx-0 px-2 sm:px-0">
            {t('heroDesc')}
          </p>
        </div>
      </section>

      <section className="relative z-20 -mt-10 sm:-mt-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {[
            { label: t('tileEmail'), val: "ssf.varna@gmail.com", icon: <Mail size={24} />, color: "bg-salsa-mint", href: "mailto:ssf.varna@gmail.com", target: "_blank" },
            { label: t('tileCall'), val: "+359 888 123 456", icon: <Phone size={24} />, color: "bg-salsa-pink", href: "tel:+359888123456", target: "_self" },
            { label: t('tileLocation'), val: "Varna Free University", icon: <MapPin size={24} />, color: "bg-slate-900", href: "https://maps.google.com/?q=Varna+Free+University,+Varna", target: "_blank" }
          ].map((item, i) => (
            <a 
              key={i} 
              href={item.href}
              target={item.target}
              rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
              onClick={(e) => {
                if (item.target === "_blank") {
                  e.preventDefault();
                  window.open(item.href, '_blank');
                }
              }}
              className="bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col items-center text-center hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 cursor-pointer group"
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 ${item.color} text-white rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                {item.icon}
              </div>
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1 sm:mb-2">{item.label}</p>
              <p className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">{item.val}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 lg:gap-16">
        
        <div className="lg:w-1/3 space-y-6 sm:space-y-8 text-center lg:text-left">
          <h2 className="font-bebas tracking-wide text-5xl sm:text-6xl text-slate-900 leading-none">{t('leftTitle1')} <br className="hidden lg:block"/>{t('leftTitle2')}</h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium max-w-md mx-auto lg:mx-0">
            {t('leftDesc')}
          </p>
        </div>

        <div className="lg:w-2/3 bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-8 md:p-12 shadow-2xl border border-gray-100 relative overflow-hidden">
          {isSent ? (
            <div className="h-[300px] sm:h-[400px] flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={32} className="sm:w-10 sm:h-10" />
              </div>
              <h3 className="font-bebas tracking-wide text-4xl sm:text-5xl text-slate-900">{t('successTitle')}</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium px-4">{t('successDesc')}</p>
              <button 
                onClick={() => setIsSent(false)}
                className="mt-8 bg-slate-900 text-white font-black text-[10px] sm:text-[11px] uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-salsa-pink transition-colors"
              >
                {t('sendAnother')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              
              {error && (
                <div className="p-3 sm:p-4 bg-red-50 text-red-600 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center border border-red-100">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {/* NAME: Mobile-optimized */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('nameLabel')}</label>
                  <input 
                    required 
                    name="name" 
                    type="text" 
                    maxLength={50}
                    autoComplete="name"
                    autoCapitalize="words"
                    spellCheck="false"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={t('namePlaceholder')}
                    className="w-full bg-transparent border border-gray-200 text-slate-900 font-medium rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 outline-none focus:border-slate-900 transition-colors text-sm" 
                  />
                </div>
                
                {/* EMAIL: Mobile-optimized */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('emailLabel')}</label>
                  <input 
                    required 
                    name="email" 
                    type="email" 
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    maxLength={100}
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleEmailBlur}
                    placeholder={t('emailPlaceholder')}
                    className={`w-full bg-transparent border ${emailError ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-slate-900'} text-slate-900 font-medium rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 outline-none transition-colors text-sm`} 
                  />
                  {emailError && (
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1 animate-in fade-in slide-in-from-top-1">
                      {emailError}
                    </p>
                  )}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2 sm:space-y-3 pt-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('catLabel')}</label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                      className={`flex-1 py-3 sm:py-3.5 px-2 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all duration-300 border cursor-pointer
                        ${formData.category === cat.id 
                          ? 'border-salsa-pink bg-salsa-pink text-white shadow-md' 
                          : 'border-gray-200 bg-transparent text-slate-400 hover:border-gray-300 hover:text-slate-600'
                        }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Header for "Other" */}
              {formData.category === "Other" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('subLabel')}</label>
                  <input 
                    required 
                    type="text" 
                    maxLength={50}
                    autoCapitalize="sentences"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder={t('subPlaceholder')}
                    className="w-full bg-slate-50 border border-gray-200 text-slate-900 font-medium rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 outline-none focus:border-slate-900 focus:bg-white transition-colors text-sm" 
                  />
                </div>
              )}

              {/* MESSAGE: Mobile-optimized */}
              <div className="space-y-2 pt-1 sm:pt-2">
                <div className="flex justify-between items-end ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('msgLabel')}</label>
                  <span className={`text-[10px] sm:text-[11px] font-bold ${formData.message.length >= 500 ? 'text-red-500' : 'text-slate-400'}`}>
                    {formData.message.length} / 500
                  </span>
                </div>
                <textarea 
                  required 
                  name="message" 
                  rows="4" 
                  maxLength={500}
                  inputMode="text"
                  autoCapitalize="sentences"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder={t('msgPlaceholder')}
                  className="w-full min-h-[120px] sm:min-h-[150px] max-h-[250px] resize-y bg-transparent border border-gray-200 text-slate-900 font-medium rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 outline-none focus:border-slate-900 transition-colors text-sm leading-relaxed"
                />
              </div>

              {/* NEW: MATH CAPTCHA */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-salsa-pink shrink-0" size={24} />
                  <div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-0.5">
                      {t('captchaLabel', { num1: captchaAuth.num1, num2: captchaAuth.num2 })}
                    </p>
                    <p className="text-xs font-medium text-slate-500">Security check</p>
                  </div>
                </div>
                <div className="w-full sm:w-auto">
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={3}
                    value={userCaptcha}
                    onChange={(e) => {
                      setUserCaptcha(e.target.value);
                      if (captchaError) setCaptchaError("");
                    }}
                    placeholder={t('captchaPlaceholder')}
                    className={`w-full sm:w-32 text-center bg-white border ${captchaError ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-slate-900'} text-slate-900 font-black text-lg rounded-xl px-4 py-2 outline-none transition-colors shadow-sm`}
                  />
                  {captchaError && (
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-center mt-2 animate-in fade-in slide-in-from-top-1">
                      {captchaError}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={isSubmitting || emailError || cooldown > 0}
                className="w-full bg-slate-900 text-white p-4 sm:p-5 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest hover:bg-salsa-pink hover:shadow-lg transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 mt-2 sm:mt-4 disabled:opacity-50 disabled:hover:bg-slate-900 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : cooldown > 0 ? (
                  t('waitBtn', { cooldown })
                ) : (
                  <><Send size={16} /> {t('sendBtn')}</>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}