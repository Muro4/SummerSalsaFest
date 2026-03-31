"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MapPin, Sun, Moon, Music, Map } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function InfoPage() {
  const t = useTranslations('Info');
  const [openFaq, setOpenFaq] = useState(null);
  
  // State to track which map is clicked/expanded on mobile
  const [activeMap, setActiveMap] = useState(null); 

  // Moved inside component to dynamically translate
  const faqs = [
    { q: t('faq1q'), a: t('faq1a') },
    { q: t('faq2q'), a: t('faq2a') },
    { q: t('faq3q'), a: t('faq3a') },
    { q: t('faq4q'), a: t('faq4a') },
  ];

  return (
    <main className="min-h-screen bg-gray-50 font-montserrat selection:bg-salsa-pink selection:text-white">
      <Navbar />

      {/* 1. COMPACT HERO SECTION */}
      <section className="relative pt-40 pb-20 px-6 flex flex-col items-center justify-center text-center overflow-hidden bg-slate-900">
        <div 
          className="absolute inset-0 z-0 opacity-40"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=2000')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'grayscale(50%) contrast(120%)'
          }}
        />
        <div className="relative z-10 flex flex-col items-center animate-fade-in">
          <span className="bg-salsa-mint/20 text-salsa-mint border border-salsa-mint/30 text-[11px] font-black px-6 py-2 rounded-full uppercase tracking-[0.4em] mb-6 inline-block">
            {t('heroPre')}
          </span>
          <h1 className="font-modak text-6xl md:text-8xl text-white leading-none uppercase drop-shadow-2xl flex flex-wrap justify-center gap-3">
            {t('heroTitle1')} <span className="text-salsa-pink">{t('heroTitle2')}</span>
          </h1>
        </div>
        {/* Diagonal Cut Bottom Removed Here */}
      </section>

      {/* 3. THE DAILY RHYTHM (Vertical Timeline) */}
      <section className="py-24 px-6 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-salsa-pink font-black text-[11px] uppercase tracking-[0.4em]">{t('schedulePre')}</span>
            <h2 className="font-bebas tracking-wide text-6xl text-gray-900 mt-2">{t('scheduleTitle')}</h2>
          </div>

          <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-salsa-mint before:via-salsa-pink before:to-transparent">
            
            {/* Timeline Item 1 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border-4 border-salsa-mint shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 shadow-lg">
                <Sun size={16} className="text-salsa-mint" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="font-bold text-lg text-gray-900 uppercase tracking-widest mb-2">{t('sch1Time')}</h4>
                <p className="text-sm text-gray-600">{t('sch1Desc')}</p>
              </div>
            </div>

            {/* Timeline Item 2 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border-4 border-salsa-pink shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 shadow-lg">
                <Music size={16} className="text-salsa-pink" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="font-bold text-lg text-gray-900 uppercase tracking-widest mb-2">{t('sch2Time')}</h4>
                <p className="text-sm text-gray-600">{t('sch2Desc')}</p>
              </div>
            </div>

            {/* Timeline Item 3 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 border-4 border-slate-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 shadow-lg">
                <Moon size={16} className="text-white" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="font-bold text-lg text-gray-900 uppercase tracking-widest mb-2">{t('sch3Time')}</h4>
                <p className="text-sm text-gray-600">{t('sch3Desc')}</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. LOCATIONS: THE DUAL VENUE SYSTEM */}
       <section className="relative w-full h-[600px] md:h-[500px] flex flex-col md:flex-row bg-slate-900 overflow-hidden border-t border-gray-100 selection:bg-transparent">
        
        {/* VENUE 1: DAY (Workshops) */}
        <div className={`relative group transition-all duration-700 md:hover:flex-[1.5] border-b md:border-b-0 md:border-r border-white/10 z-10 ${activeMap === 0 ? 'flex-[2] md:flex-1' : 'flex-1'}`}>
          
          <div 
            className={`absolute inset-0 z-20 md:hidden ${activeMap === 0 ? 'pointer-events-none' : 'cursor-pointer'}`}
            onClick={() => setActiveMap(0)}
          />

          <div className="absolute inset-0 z-0 bg-slate-800 md:grayscale md:group-hover:grayscale-0 transition-all duration-700">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3455.4723564554483!2d28.024766005037964!3d43.25782794375787!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40a4f925ce066ce1%3A0x2656e289c2bed1b9!2z0JLQsNGA0L3QtdC90YHQutC4INGB0LLQvtCx0L7QtNC10L0g0YPQvdC40LLQtdGA0YHQuNGC0LXRgiAi0KfQtdGA0L3QvtGA0LjQt9C10YYg0KXRgNCw0LHRitGAIg!5e0!3m2!1sen!2sbg!4v1773153290390!5m2!1sen!2sbg" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen="" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <div className={`absolute inset-0 transition-colors duration-700 pointer-events-none md:group-hover:bg-transparent ${activeMap === 0 ? 'bg-transparent md:bg-slate-900/60' : 'bg-slate-900/30 md:bg-slate-900/60'}`}></div>
          </div>
          
          <div className="relative z-10 h-full p-6 md:p-10 flex flex-col justify-end pointer-events-none">
            <span className="text-salsa-mint font-black text-[11px] uppercase tracking-[0.4em] mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t('venue1Pre')}</span>
            <h3 className="font-bebas tracking-wide text-4xl md:text-5xl text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">{t('venue1Title')}</h3>
            <div className="mt-2 flex items-center gap-2 text-white/90 text-xs md:text-sm font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <MapPin size={16} className="text-salsa-mint shrink-0" /> 
              <span className="truncate">{t('venue1Addr')}</span>
            </div>
          </div>

          <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-12 h-12 bg-white rounded-full z-30 flex items-center justify-center shadow-2xl hidden md:flex pointer-events-none border-4 border-slate-900 transition-transform duration-700">
            <Map size={20} className="text-gray-900" />
          </div>
        </div>

        {/* VENUE 2: NIGHT (Parties) */}
        <div className={`relative group transition-all duration-700 md:hover:flex-[1.5] z-0 ${activeMap === 1 ? 'flex-[2] md:flex-1' : 'flex-1'}`}>
          
          <div 
            className={`absolute inset-0 z-20 md:hidden ${activeMap === 1 ? 'pointer-events-none' : 'cursor-pointer'}`}
            onClick={() => setActiveMap(1)}
          />

          <div className="absolute inset-0 z-0 bg-slate-800 md:grayscale md:group-hover:grayscale-0 transition-all duration-700">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5811.7809627260085!2d28.025413763345963!3d43.25371705881104!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40a457d237f7bce5%3A0x65a5d7cae03ff040!2sKabakum%20Public%20Beach!5e0!3m2!1sen!2sbg!4v1773153369460!5m2!1sen!2sbg" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen="" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <div className={`absolute inset-0 transition-colors duration-700 pointer-events-none md:group-hover:bg-transparent ${activeMap === 1 ? 'bg-transparent md:bg-slate-900/60' : 'bg-slate-900/30 md:bg-slate-900/60'}`}></div>
          </div>
          
          <div className="relative z-10 h-full p-6 md:p-10 flex flex-col justify-end pointer-events-none">
            <span className="text-salsa-pink font-black text-[11px] uppercase tracking-[0.4em] mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t('venue2Pre')}</span>
            <h3 className="font-bebas tracking-wide text-4xl md:text-5xl text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">{t('venue2Title')}</h3>
            <div className="mt-2 flex items-center gap-2 text-white/90 text-xs md:text-sm font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <MapPin size={16} className="text-salsa-pink shrink-0" /> {t('venue2Addr')}
            </div>
          </div>
        </div>

      </section>

      {/* 4. FAQ ACCORDION */}
      <section className="py-24 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-salsa-mint font-black text-[11px] uppercase tracking-[0.4em]">{t('faqPre')}</span>
          <h2 className="font-bebas tracking-wide text-6xl text-gray-900 mt-2">{t('faqTitle')}</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className={`border rounded-3xl overflow-hidden transition-all duration-300 ${openFaq === i ? 'bg-white shadow-xl border-slate-900 ring-1 ring-slate-900' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
            >
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full px-8 py-6 flex items-center justify-between font-bold text-left text-gray-900"
              >
                {faq.q}
                <ChevronDown size={20} className={`text-salsa-pink transition-transform duration-300 shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`px-8 overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-60 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}