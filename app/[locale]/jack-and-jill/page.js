"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTranslations } from 'next-intl';
import { Users, Music, HeartHandshake, Trophy, Star, Sparkles } from "lucide-react";

export default function JackAndJillPage() {
  const t = useTranslations('JackJill');

  const steps = [
    { icon: Users, title: t('step1Title'), desc: t('step1Desc'), color: "text-blue-500", bg: "bg-blue-50" },
    { icon: Music, title: t('step2Title'), desc: t('step2Desc'), color: "text-violet-500", bg: "bg-violet-50" },
    { icon: HeartHandshake, title: t('step3Title'), desc: t('step3Desc'), color: "text-salsa-pink", bg: "bg-salsa-pink/10" }
  ];

  return (
    <main className="min-h-screen flex flex-col bg-salsa-white font-montserrat selection:bg-violet-600 selection:text-white">
      <Navbar />
      
      <div className="flex-grow w-full pt-32 md:pt-40 pb-24">
        
        {/* HEADER AREA */}
        <section className="px-4 md:px-6 text-center max-w-4xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <span className="text-violet-600 font-black text-[11px] md:text-xs uppercase tracking-[0.4em] mb-4 inline-block drop-shadow-sm">
            {t('heroPre')}
          </span>
          <h1 className="font-modak text-6xl md:text-8xl text-slate-900 leading-none uppercase drop-shadow-md flex flex-wrap justify-center gap-3 mb-6">
            {t('heroTitle1')} <span className="text-salsa-pink">{t('heroTitle2')}</span>
          </h1>
          <p className="text-slate-600 font-medium text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
            {t('heroDesc')}
          </p>
        </section>

        {/* HOW IT WORKS (3 Columns) */}
        <section className="px-4 md:px-6 max-w-7xl mx-auto mb-24">
          <div className="text-center mb-12 animate-in fade-in duration-700 delay-200">
            <h2 className="font-bebas tracking-wide text-4xl md:text-5xl text-slate-900 uppercase">{t('howItWorks')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div 
                  key={idx} 
                  className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-2 transition-all duration-500 flex flex-col items-center text-center animate-in zoom-in-95 duration-500"
                  style={{ animationDelay: `${(idx + 2) * 150}ms` }}
                >
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${step.bg} ${step.color}`}>
                    <Icon size={36} strokeWidth={2} />
                  </div>
                  <h3 className="font-bebas text-2xl md:text-3xl tracking-wide text-slate-900 uppercase mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* RULES, CATEGORIES & PRIZES (2 Columns) */}
        <section className="px-4 md:px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 animate-in fade-in duration-1000 delay-700">
            
            {/* Categories Card */}
            <div className="bg-slate-900 text-white p-8 md:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col justify-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
              
              <h3 className="font-bebas text-4xl md:text-5xl uppercase tracking-wide mb-8 relative z-10">
                {t('rulesTitle')}
              </h3>
              
              <div className="space-y-8 relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Star size={24} className="text-salsa-pink" />
                    <h4 className="font-black text-xl uppercase tracking-widest text-white">{t('catNovice')}</h4>
                  </div>
                  <p className="text-slate-400 font-medium text-sm md:text-base leading-relaxed pl-9">
                    {t('catNoviceDesc')}
                  </p>
                </div>
                
                <div className="h-px bg-slate-800 w-full"></div>
                
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Sparkles size={24} className="text-salsa-mint" />
                    <h4 className="font-black text-xl uppercase tracking-widest text-white">{t('catAdvanced')}</h4>
                  </div>
                  <p className="text-slate-400 font-medium text-sm md:text-base leading-relaxed pl-9">
                    {t('catAdvancedDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Prizes & CTA Card */}
            <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.05)] flex flex-col justify-center text-center items-center">
              <div className="w-24 h-24 bg-gradient-to-tr from-salsa-pink to-violet-500 rounded-full flex items-center justify-center shadow-lg mb-8">
                <Trophy size={40} className="text-white" />
              </div>
              
              <h3 className="font-bebas text-4xl md:text-5xl uppercase text-slate-900 tracking-wide mb-4">
                {t('prizesTitle')}
              </h3>
              
              <p className="text-slate-500 font-medium text-base md:text-lg leading-relaxed mb-10 max-w-sm mx-auto">
                {t('prizesDesc')}
              </p>
              
              <div className="w-full flex justify-center">
                <button className="cursor-default bg-gray-100 text-slate-400 font-black rounded-2xl py-4 px-10 text-xs md:text-sm uppercase tracking-[0.2em] w-full max-w-xs transition-colors border border-gray-200">
                  {t('registerBtn')}
                </button>
              </div>
            </div>

          </div>
        </section>

      </div>
      <Footer />
    </main>
  );
}