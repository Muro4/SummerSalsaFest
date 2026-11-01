"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTranslations } from 'next-intl';

export default function PrivacyPage() {
  const t = useTranslations('Privacy');

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat selection:bg-slate-900 selection:text-white">
      <Navbar />

      {/* CLEAN HEADER SECTION */}
      <section className="pt-36 pb-12 px-6 max-w-4xl mx-auto text-center">
        <h1 className="font-bebas text-5xl sm:text-6xl md:text-7xl text-slate-900 uppercase tracking-wide">
          {t('heroTitle1')} {t('heroTitle2')}
        </h1>
      </section>

      {/* PROFESSIONAL DOCUMENT SECTION */}
      <section className="px-4 sm:px-6 max-w-4xl mx-auto mb-24">
        <div className="bg-white p-8 sm:p-12 md:p-16 rounded-2xl shadow-sm border border-gray-200 text-slate-700 leading-relaxed space-y-12">
          
          {/* 1. Introduction */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t('s1Title')}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t('s1Text')}
            </p>
          </div>

          {/* 2. What We Collect */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t('s2Title')}
            </h2>
            <ul className="space-y-3 font-medium text-sm sm:text-base text-slate-600 list-disc list-outside ml-5 text-justify">
              <li><strong className="text-slate-900">{t('s2Li1Strong')}</strong> {t('s2Li1Text')}</li>
              <li><strong className="text-slate-900">{t('s2Li2Strong')}</strong> {t('s2Li2Text')}</li>
              <li><strong className="text-slate-900">{t('s2Li3Strong')}</strong> {t('s2Li3Text')}</li>
            </ul>
          </div>

          {/* 3. How We Use It */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t('s3Title')}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify mb-4">
              {t('s3Text')}
            </p>
            <ul className="space-y-3 font-medium text-sm sm:text-base text-slate-600 list-disc list-outside ml-5 text-justify">
              <li>{t('s3Li1')}</li>
              <li>{t('s3Li2')}</li>
              <li>{t('s3Li3')}</li>
            </ul>
          </div>

          {/* 4. Cookies */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t('s4Title')}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify mb-6">
              {t('s4Text')}
            </p>
            <div className="space-y-4 pl-4 border-l-2 border-slate-200">
              <div>
                <span className="font-bold text-slate-900 block mb-1">{t('s4Box1Title')}</span>
                <p className="text-sm font-medium text-slate-600 text-justify">{t('s4Box1Text')}</p>
              </div>
              <div>
                <span className="font-bold text-slate-900 block mb-1">{t('s4Box2Title')}</span>
                <p className="text-sm font-medium text-slate-600 text-justify">{t('s4Box2Text')}</p>
              </div>
            </div>
          </div>

          {/* 5. Security */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t('s5Title')}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t('s5Text')}
            </p>
          </div>

          {/* 6. Contact */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t('s6Title')}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify mb-2">
              {t('s6Text')}
            </p>
            <a href="mailto:ssf.varna@gmail.com" className="font-bold text-slate-900 hover:text-slate-600 underline transition-colors">
              ssf.varna@gmail.com
            </a>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}