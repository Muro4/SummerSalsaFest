"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Scale, Ticket, Users, Camera, ShieldAlert, FileText } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function TermsPage() {
  const t = useTranslations('Terms');

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
            <Scale size={32} />
          </div>
          {/* Notice font-modak is here! It will show Modak in EN, and Bebas in BG */}
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
          
          {/* Introduction */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="text-salsa-pink shrink-0" size={24} />
              <h2 className="font-bebas tracking-wide text-3xl sm:text-4xl text-slate-900 uppercase m-0">{t('s1Title')}</h2>
            </div>
            <p className="font-medium text-sm sm:text-base">
              {t('s1Text')}
            </p>
          </div>

          {/* Tickets & Refunds */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Ticket className="text-salsa-pink shrink-0" size={24} />
              <h2 className="font-bebas tracking-wide text-3xl sm:text-4xl text-slate-900 uppercase m-0">{t('s2Title')}</h2>
            </div>
            <p className="font-medium text-sm sm:text-base">
              {t('s2Text')}
            </p>
          </div>

          {/* Code of Conduct */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Users className="text-salsa-pink shrink-0" size={24} />
              <h2 className="font-bebas tracking-wide text-3xl sm:text-4xl text-slate-900 uppercase m-0">{t('s3Title')}</h2>
            </div>
            <p className="font-medium text-sm sm:text-base">
              {t('s3Text')}
            </p>
          </div>

          {/* Guest Dancer Program */}
          <div>
            <h2 className="font-bebas tracking-wide text-3xl sm:text-4xl text-slate-900 mb-4 uppercase">{t('s4Title')}</h2>
            <p className="font-medium text-sm sm:text-base">
              {t('s4Text')}
            </p>
          </div>

          {/* Media Release */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Camera className="text-salsa-pink shrink-0" size={24} />
              <h2 className="font-bebas tracking-wide text-3xl sm:text-4xl text-slate-900 uppercase m-0">{t('s5Title')}</h2>
            </div>
            <p className="font-medium text-sm sm:text-base">
              {t('s5Text')}
            </p>
          </div>

          {/* Liability */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="text-salsa-pink shrink-0" size={24} />
              <h2 className="font-bebas tracking-wide text-3xl sm:text-4xl text-slate-900 uppercase m-0">{t('s6Title')}</h2>
            </div>
            <p className="font-medium text-sm sm:text-base">
              {t('s6Text')}
            </p>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}