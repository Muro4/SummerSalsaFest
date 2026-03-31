"use client";
import { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";
import { Link } from "@/routing"; // THE FIX: Custom routing
import { useTranslations } from 'next-intl';

export default function CookieBanner() {
  const t = useTranslations('CookieBanner');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already made a choice when the component loads
    const consent = localStorage.getItem("ssf_cookie_consent");
    if (!consent) {
      // Add a slight delay so it doesn't aggressively pop up the millisecond the page loads
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("ssf_cookie_consent", "all");
    
    // Dispatch a custom event to wake up the Analytics component
    window.dispatchEvent(new Event("cookieConsentChanged"));
    
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem("ssf_cookie_consent", "essential");
    // Here you strictly ONLY load things required for the site to function (like login sessions)
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed left-4 right-4 md:left-8 md:right-auto md:bottom-8 bottom-[calc(1rem+env(safe-area-inset-bottom))] md:max-w-[420px] z-[999] animate-in slide-in-from-bottom-8 fade-in duration-700 font-montserrat select-none">
      <div className="bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 relative overflow-hidden group">
        
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-salsa-pink/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-salsa-pink/20 transition-colors duration-500"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-salsa-pink/10 rounded-2xl flex items-center justify-center text-salsa-pink shrink-0">
              <Cookie size={24} />
            </div>
            <div>
              <h3 className="font-bebas tracking-wide text-3xl uppercase text-white leading-none">{t('title')}</h3>
            </div>
          </div>
          
          <p className="text-[11px] font-medium text-slate-400 leading-relaxed mb-6">
            {t('desc1')}
            <Link href="/privacy" className="text-salsa-pink hover:underline font-bold">{t('privacyLink')}</Link>
            {t('desc2')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleAcceptAll}
              className="flex-1 bg-salsa-pink text-white px-5 py-3.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest hover:bg-pink-500 hover:shadow-lg hover:shadow-salsa-pink/20 transition-all duration-300 cursor-pointer"
            >
              {t('btnAcceptAll')}
            </button>
            <button 
              onClick={handleAcceptEssential}
              className="flex-1 bg-white/5 text-slate-300 px-5 py-3.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all duration-300 cursor-pointer"
            >
              {t('btnEssential')}
            </button>
          </div>
        </div>

        {/* Close Icon (Acts as "Essential Only") */}
        <button 
          onClick={handleAcceptEssential} 
          className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors cursor-pointer p-1"
          aria-label={t('ariaClose')}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}