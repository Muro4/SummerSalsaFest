"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShieldCheck, Lock, Eye, Cookie } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function PrivacyPage() {
  const t = useTranslations('Privacy');

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
            <ShieldCheck size={32} />
          </div>
          <h1 className="animate-fade-in font-modak text-6xl md:text-8xl text-white leading-none uppercase drop-shadow-xl flex flex-wrap justify-center gap-4">
            {t('heroTitle1')} <span className="text-salsa-pink">{t('heroTitle2')}</span>
          </h1>
          <p className="animate-fade-in mt-6 text-white/90 text-sm md:text-base font-medium tracking-widest uppercase">
            {t('lastUpdated')}
          </p>
        </div>
      </section>

      {/* CONTENT SECTION */}
      <section className="relative z-20 -mt-10 px-6 max-w-4xl mx-auto mb-24">
        <div className="bg-white p-8 md:p-14 rounded-[3rem] shadow-2xl border border-gray-100 text-slate-700 leading-relaxed space-y-12">
          
          {/* Introduction */}
          <div>
            <h2 className="font-bebas tracking-wide text-4xl text-slate-900 mb-4 uppercase">{t('s1Title')}</h2>
            <p className="font-medium">
              {t('s1Text')}
            </p>
          </div>

          {/* What We Collect */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="text-salsa-pink shrink-0" size={24} />
              <h2 className="font-bebas tracking-wide text-4xl text-slate-900 uppercase m-0">{t('s2Title')}</h2>
            </div>
            <ul className="space-y-3 font-medium list-disc list-inside ml-4 marker:text-salsa-pink">
              <li><strong>{t('s2Li1Strong')}</strong> {t('s2Li1Text')}</li>
              <li><strong>{t('s2Li2Strong')}</strong> {t('s2Li2Text')}</li>
              <li><strong>{t('s2Li3Strong')}</strong> {t('s2Li3Text')}</li>
            </ul>
          </div>

          {/* How We Use It */}
          <div>
            <h2 className="font-bebas tracking-wide text-4xl text-slate-900 mb-4 uppercase">{t('s3Title')}</h2>
            <p className="font-medium mb-4">{t('s3Text')}</p>
            <ul className="space-y-3 font-medium list-disc list-inside ml-4 marker:text-salsa-pink">
              <li>{t('s3Li1')}</li>
              <li>{t('s3Li2')}</li>
              <li>{t('s3Li3')}</li>
            </ul>
          </div>

          {/* Cookies */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Cookie className="text-salsa-pink shrink-0" size={24} />
              <h2 className="font-bebas tracking-wide text-4xl text-slate-900 uppercase m-0">{t('s4Title')}</h2>
            </div>
            <p className="font-medium mb-4">
              {t('s4Text')}
            </p>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 space-y-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 block mb-1">{t('s4Box1Title')}</span>
                <p className="text-sm font-medium text-slate-600">{t('s4Box1Text')}</p>
              </div>
              <div className="h-px w-full bg-gray-200"></div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 block mb-1">{t('s4Box2Title')}</span>
                <p className="text-sm font-medium text-slate-600">{t('s4Box2Text')}</p>
              </div>
            </div>
          </div>

          {/* Security */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="text-salsa-pink shrink-0" size={24} />
              <h2 className="font-bebas tracking-wide text-4xl text-slate-900 uppercase m-0">{t('s5Title')}</h2>
            </div>
            <p className="font-medium">
              {t('s5Text')}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h2 className="font-bebas tracking-wide text-4xl text-slate-900 mb-4 uppercase">{t('s6Title')}</h2>
            <p className="font-medium">
              {t('s6Text')}
            </p>
            <a href="mailto:info@summersalsa.com" className="inline-block mt-4 text-salsa-pink font-bold hover:underline text-lg">
              info@summersalsa.com
            </a>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}