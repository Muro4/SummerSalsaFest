import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTranslations } from 'next-intl';
import { Heart, ExternalLink, CreditCard, Info } from "lucide-react";

export default function CharityPage() {
  const t = useTranslations('Charity');
  const causes = t.raw('causes'); // Safely maps over the array from the JSON

  return (
    <main className="min-h-screen flex flex-col bg-salsa-white font-montserrat">
      <Navbar />
      
      <div className="flex-grow max-w-7xl mx-auto px-4 md:px-6 w-full pt-32 md:pt-40 pb-24">
        
        {/* Header Area */}
        <div className="flex flex-col items-center text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-salsa-pink/10 p-4 rounded-full mb-6 text-salsa-pink">
            <Heart size={48} fill="currentColor" className="animate-pulse" />
          </div>
          <h1 className="font-bebas tracking-wide text-5xl md:text-7xl text-slate-900 uppercase mb-4 leading-none">
            {t('title')}
          </h1>
          <p className="text-salsa-pink text-sm md:text-base font-black uppercase tracking-[0.2em] mb-8">
            {t('subtitle')}
          </p>
          
          <div className="max-w-3xl space-y-6 text-slate-600 font-medium text-sm md:text-base leading-relaxed">
            <p className="text-lg md:text-xl font-bold text-slate-900">{t('p1')}</p>
            <p>{t('p2')}</p>
            <p>{t('p3')}</p>
            <p>{t('p4')}</p>
          </div>
        </div>

        {/* Causes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 animate-in fade-in duration-1000 delay-150">
          {causes.map((cause, idx) => (
            <div key={idx} className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all duration-300 flex flex-col h-full">
              <h3 className="font-bebas text-2xl md:text-3xl tracking-wide text-slate-900 uppercase mb-4 line-clamp-2">
                {cause.name}
              </h3>
              
              <div className="flex-grow">
                {cause.details && (
                  <div className="flex items-start gap-3 mt-2 text-slate-600 bg-gray-50 p-4 rounded-xl text-xs md:text-sm font-semibold break-all">
                    <CreditCard size={18} className="shrink-0 text-slate-400 mt-0.5" />
                    <span>{cause.details}</span>
                  </div>
                )}
              </div>

              {cause.link && (
                <a 
                  href={cause.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-6 flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 text-white font-black text-[10px] md:text-[11px] uppercase tracking-widest rounded-xl hover:bg-salsa-pink transition-colors"
                >
                  {t('viewCampaign')} <ExternalLink size={14} />
                </a>
              )}
            </div>
          ))}
          
          {/* And Many Others Placeholder Card */}
          <div className="bg-salsa-mint/5 p-6 md:p-8 rounded-[2rem] border-2 border-dashed border-salsa-mint/30 flex flex-col items-center justify-center text-center h-full min-h-[220px]">
             <Heart size={32} className="text-salsa-mint mb-4 opacity-50" />
             <h3 className="font-bebas text-2xl tracking-wide text-slate-400 uppercase">
               {t('andManyOthers')}
             </h3>
          </div>
        </div>

        {/* Footer Note */}
        <div className="max-w-2xl mx-auto text-center mt-16 p-8 bg-white border border-gray-100 rounded-[2rem] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-salsa-pink via-salsa-mint to-violet-500"></div>
          <div className="flex justify-center mb-4 text-amber-500">
             <Info size={24} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
            {t('ps')}
          </p>
          <p className="text-slate-900 font-black text-lg md:text-xl mb-2">
            {t('p5')}
          </p>
          <p className="text-salsa-pink font-bold">
            {t('p6')} <Heart size={16} className="inline-block ml-1 animate-pulse" fill="currentColor" />
          </p>
        </div>

      </div>
      <Footer />
    </main>
  );
}