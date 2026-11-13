"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth } from "@/lib/firebase";
import { signInAnonymously } from "firebase/auth";
import { roomRequest } from "@/lib/room-client";
import { Mail, Phone, Send, CheckCircle, Loader2, ShieldCheck, Facebook, Instagram, Youtube, Calendar, ArrowUpRight } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function ContactPage() {
  const t = useTranslations('Contact');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState(null);
  
  const [cooldown, setCooldown] = useState(0);
  const [emailError, setEmailError] = useState("");
  
  const [captchaAuth, setCaptchaAuth] = useState({ num1: 0, num2: 0 });
  const [userCaptcha, setUserCaptcha] = useState("");
  const [captchaError, setCaptchaError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "Tickets",
    message: ""
  });
  
  const [customSubject, setCustomSubject] = useState("");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const categories = [
    { id: "Tickets", label: t('catTickets') },
    { id: "Workshops", label: t('catWorkshops') },
    { id: "Media", label: t('catMedia') },
    { id: "Other", label: t('catOther') }
  ];

  const contactLinks = [
    { name: "ssf.varna@gmail.com", sub: t('subEmail'), icon: Mail, url: "mailto:ssf.varna@gmail.com" },
    { name: "+359 888 539 188", sub: t('subCall'), icon: Phone, url: "tel:+359888539188" },
    { name: "+359 877 377 294", sub: t('subCall'), icon: Phone, url: "tel:+359877377294" }
  ];

  const festivalEvents = [
    { title: t('eventPreParty'), date: t('datePreParty'), icon: Calendar, url: "#" },
    { title: t('eventBeachFiesta'), date: t('dateBeachFiesta'), icon: Calendar, url: "#" },
    { title: t('eventGoodbyeParty'), date: t('dateGoodbyeParty'), icon: Calendar, url: "#" }
  ];

  const mainSocials = [
    { name: "Facebook", icon: Facebook, url: "https://www.facebook.com/SummerSalsaFestVarna/", baseBg: "bg-blue-50", baseColor: "text-blue-500", hoverClass: "hover:bg-blue-500 hover:text-white hover:shadow-blue-500/30" },
    { name: "Instagram", icon: Instagram, url: "https://www.instagram.com/summersalsafest/", baseBg: "bg-pink-50", baseColor: "text-pink-500", hoverClass: "hover:bg-pink-500 hover:text-white hover:shadow-pink-500/30" },
    { name: "YouTube", icon: Youtube, url: "https://www.youtube.com/@marialilianova4405", baseBg: "bg-red-50", baseColor: "text-red-500", hoverClass: "hover:bg-red-500 hover:text-white hover:shadow-red-500/30" }
  ];

  const generateCaptcha = () => {
    setCaptchaAuth({
      num1: Math.floor(Math.random() * 10) + 1,
      num2: Math.floor(Math.random() * 10) + 1 
    });
    setUserCaptcha("");
  };

  useEffect(() => { generateCaptcha(); }, []);

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
    if (val !== "" && !emailRegex.test(val)) setEmailError(t('errEmail'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cooldown > 0) return setError(t('errSpam', { cooldown }));
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return setError(t('errEmpty'));
    if (formData.category === "Other" && !customSubject.trim()) return setError(t('errSubject'));
    if (!emailRegex.test(formData.email.trim())) return setEmailError(t('errEmail'));
    if (parseInt(userCaptcha) !== captchaAuth.num1 + captchaAuth.num2) {
      setCaptchaError(t('errCaptcha'));
      return generateCaptcha(); 
    }

    setIsSubmitting(true);
    setError(null);
    setEmailError("");
    setCaptchaError("");
    
    try {
      const finalSubject = formData.category === "Other" ? customSubject.trim() : formData.category;
      if (!auth.currentUser) await signInAnonymously(auth);
      await roomRequest("/api/contact", {
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
      generateCaptcha();
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(t('errFail'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat selection:bg-salsa-pink selection:text-white flex flex-col relative">
      <Navbar />

      <section className="relative z-20 pt-32 sm:pt-40 pb-16 sm:pb-24 px-4 sm:px-6 max-w-7xl mx-auto flex-1 w-full flex flex-col">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 lg:items-start">
          
          {/* LEFT COLUMN: Title & Info Card */}
          <div className="lg:w-5/12 flex flex-col">
            
            {/* Title and Description moved here so the right column can shift up */}
            <div className="w-full mb-8 sm:mb-12">
              <h1 className="font-bebas text-6xl sm:text-7xl lg:text-8xl text-slate-900 uppercase leading-none drop-shadow-sm">
                {t('pageTitle')}
              </h1>
              <p className="hidden sm:block text-slate-600 font-medium text-lg mt-3 max-w-xl">
                {t('pageDesc')}
              </p>
            </div>

            {/* Contact Info Card */}
            <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-8 md:p-10 shadow-xl border border-gray-100 flex flex-col justify-between">
              <div className="flex flex-col h-full">
                <div className="flex flex-col gap-2">
                  {contactLinks.map((link, i) => (
                    <a 
                      key={i} 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group flex items-center gap-5 py-4 border-b border-gray-50 hover:border-slate-200 transition-colors duration-300 cursor-pointer"
                    >
                      <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:bg-slate-100 group-hover:text-slate-900">
                        <link.icon size={22} />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center transition-transform duration-300 group-hover:translate-x-1">
                        <p className="font-bold text-slate-900 text-lg md:text-xl truncate">{link.name}</p>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mt-0.5 truncate">{link.sub}</p>
                      </div>
                      <ArrowUpRight className="text-slate-300 group-hover:text-slate-900 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" size={24} />
                    </a>
                  ))}
                </div>

                
              </div>

              <div className="flex justify-center gap-6 mt-10 pt-8 border-t border-gray-100">
                {mainSocials.map((social, i) => (
                  <a 
                    key={`social-${i}`} 
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={social.name}
                    className={`w-14 h-14 ${social.baseBg} ${social.baseColor} rounded-full flex items-center justify-center ${social.hoverClass} hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}
                  >
                    <social.icon size={24} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Image & Form */}
          <div className="lg:w-7/12 flex flex-col relative">
            
            {/* Organizers Image Placeholder */}
            <div className="w-full flex justify-center -mb-8 sm:-mb-10 lg:-mt-4 relative z-10 pointer-events-none">
              <img 
                src="/images/organizers.png" 
                alt="Organizers placeholder" 
                className="h-64 sm:h-80 lg:h-[26rem] w-auto object-contain drop-shadow-xl"
              />
            </div>

            {/* Form Container */}
            <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-8 md:p-10 shadow-xl border border-gray-100 relative z-20 overflow-hidden h-fit">
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

                  <div className="bg-slate-50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="text-salsa-pink shrink-0" size={24} />
                      <div>
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-0.5">
                          {t('captchaLabel', { num1: captchaAuth.num1, num2: captchaAuth.num2 })}
                        </p>
                        <p className="text-xs font-medium text-slate-500">{t('securityCheck')}</p>
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
            
          </div>
          
        </div>
      </section>

      <Footer />
    </main>
  );
}