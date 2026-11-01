"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTranslations } from 'next-intl';

export default function CookiesPage() {
  const t = useTranslations('Cookies');

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
          
          {/* 1. What are Cookies */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t('s1Title')}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t('s1Text')}
            </p>
          </div>

          {/* 2. How We Use Cookies */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t('s2Title')}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t('s2Text')}
            </p>
          </div>

          {/* 3. Types of Cookies We Use */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t('s3Title')}
            </h2>
            <div className="space-y-4 pl-4 border-l-2 border-slate-200 mt-4">
              <div>
                <span className="font-bold text-slate-900 block mb-1">{t('s3Box1Title')}</span>
                <p className="text-sm font-medium text-slate-600 text-justify">{t('s3Box1Text')}</p>
              </div>
              <div>
                <span className="font-bold text-slate-900 block mb-1">{t('s3Box2Title')}</span>
                <p className="text-sm font-medium text-slate-600 text-justify">{t('s3Box2Text')}</p>
              </div>
            </div>
          </div>

          {/* 4. Managing Preferences */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t('s4Title')}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t('s4Text')}
            </p>
          </div>

          {/* 5. Contact */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t('s5Title')}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify mb-2">
              {t('s5Text')}
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