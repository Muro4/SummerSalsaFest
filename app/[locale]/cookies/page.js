"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Cookie, Info, Activity, Settings, Mail } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function CookiesPage() {
  const t = useTranslations('Cookies');

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat selection:bg-salsa-pink selection:text-white">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden bg-slate-900">
        <div 
          className="absolute inset-0 z-0 opacity-60"
          style={{ 
            backgroundImage: `linear-gradient(to bottom, rgba(125, 211, 192, 0.8), rgba(10, 0, 36, 0.9)), url('/images/background.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 bg-salsa-pink/20 rounded-full flex items-center justify-center text-salsa-pink mx-auto mb-6 shadow-sm border border-salsa-pink/30">
            <Cookie size={32} />
          </div>
          {/* font-modak automatically swaps to Bebas in BG via our CSS override */}
          <h1 className="animate-fade-in font-modak text-5xl sm:text-6xl md:text-8xl text-white leading-none uppercase drop-shadow-xl flex flex-wrap justify-center gap-3 sm:gap-4">
            {t('heroTitle1')} <span className="text-salsa-pink">{t('heroTitle2')}</span>
          </h1>
          <p className="animate-fade-in mt-6 text-white/90 text-xs sm:text-sm md:text-base font-medium tracking-widest uppercase">
            {t('lastUpdated')}
          </p>
        </div>
      </section>

      {/* CONTENT SECTION */}
      <section className="relative z-20 -mt-10 px-4 sm:px-6 max-w-4xl mx-auto mb-24">
        <div className="bg-white p-6 sm:p-8 md:p-14 rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-gray-100 text-slate-700 leading-relaxed space-y-10 sm:space-y-12">
          
          {/* What are Cookies */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Info className="text-salsa-pink shrink-0" size={24} />
              <h2 className="font-bebas tracking-wide text-3xl sm:text-4xl text-slate-900 uppercase m-0">{t('s1Title')}</h2>
            </div>
            <p className="font-medium text-sm sm:text-base">
              {t('s1Text')}
            </p>
          </div>

          {/* How We Use Cookies */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Activity className="text-salsa-pink shrink-0" size={24} />
              <h2 className="font-bebas tracking-wide text-3xl sm:text-4xl text-slate-900 uppercase m-0">{t('s2Title')}</h2>
            </div>
            <p className="font-medium text-sm sm:text-base">
              {t('s2Text')}
            </p>
          </div>

          {/* Types of Cookies We Use */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Cookie className="text-salsa-pink shrink-0" size={24} />
              <h2 className="font-bebas tracking-wide text-3xl sm:text-4xl text-slate-900 uppercase m-0">{t('s3Title')}</h2>
            </div>
            <div className="bg-gray-50 p-5 sm:p-6 rounded-2xl border border-gray-200 space-y-4 mt-4">
              <div>
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-slate-900 block mb-1">{t('s3Box1Title')}</span>
                <p className="text-xs sm:text-sm font-medium text-slate-600">{t('s3Box1Text')}</p>
              </div>
              <div className="h-px w-full bg-gray-200"></div>
              <div>
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-slate-900 block mb-1">{t('s3Box2Title')}</span>
                <p className="text-xs sm:text-sm font-medium text-slate-600">{t('s3Box2Text')}</p>
              </div>
            </div>
          </div>

          {/* Managing Preferences */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Settings className="text-salsa-pink shrink-0" size={24} />
              <h2 className="font-bebas tracking-wide text-3xl sm:text-4xl text-slate-900 uppercase m-0">{t('s4Title')}</h2>
            </div>
            <p className="font-medium text-sm sm:text-base">
              {t('s4Text')}
            </p>
          </div>

          {/* Contact */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Mail className="text-salsa-pink shrink-0" size={24} />
              <h2 className="font-bebas tracking-wide text-3xl sm:text-4xl text-slate-900 uppercase m-0">{t('s5Title')}</h2>
            </div>
            <p className="font-medium text-sm sm:text-base">
              {t('s5Text')}
            </p>
            <a href="mailto:ssf.varna@gmail.com" className="inline-block mt-4 text-salsa-pink font-bold hover:underline text-lg">
              ssf.varna@gmail.com
            </a>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}