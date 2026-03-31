"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Facebook, Youtube, CalendarHeart, Sun, MoonStar, Music, ArrowUpRight } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function AboutPage() {
  const t = useTranslations('About');

  const mainSocials = [
    { name: t('fbPage'), url: "http://www.facebook.com/SummerSalsaFestVarna?ref=ts&fref=ts", icon: Facebook, color: "text-blue-600", bg: "bg-blue-50" },
    { name: t('ytPage'), url: "https://www.youtube.com/channel/UCDWoOqFh5P9Xxvk0sEDnMZA", icon: Youtube, color: "text-red-600", bg: "bg-red-50" }
  ];

  const festivalEvents = [
    { title: t('preParty'), date: t('prePartyDate'), url: "https://fb.me/e/1UTxOv9fom", icon: MoonStar, color: "text-violet-600", bg: "bg-violet-50" },
    { title: t('mainFest'), date: t('mainFestDate'), url: "https://fb.me/e/abmM9QfwD", icon: Music, color: "text-salsa-pink", bg: "bg-salsa-pink/10" },
    { title: t('beachFiesta'), date: t('beachFiestaDate'), url: "https://fb.me/e/9FjLABU5H", icon: Sun, color: "text-amber-500", bg: "bg-amber-50" },
    { title: t('goodbyeParty'), date: t('goodbyePartyDate'), url: "https://fb.me/e/6tDjcdKuc", icon: CalendarHeart, color: "text-rose-500", bg: "bg-rose-50" },
  ];

  return (
    <main className="min-h-screen bg-white font-montserrat selection:bg-salsa-pink selection:text-white flex flex-col">
      <Navbar />

      <div className="flex flex-col md:flex-row flex-grow">
        
        {/* =========================================
            LEFT COLUMN: IMMERSIVE BACKGROUND
            Sticky on desktop, static header on mobile
        ========================================= */}
        <div className="w-full md:w-5/12 lg:w-1/2 relative">
          <div className="md:sticky md:top-0 h-[50vh] md:h-screen w-full relative overflow-hidden">
            
            {/* Dark gradient overlay so the white text pops */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-slate-900/10 z-10"></div>
            
            {/* High-quality background image */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=2000&fit=crop')` }}
            ></div>
            
            {/* The Title overlays the image */}
            <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 md:p-12 lg:p-20 pb-12 md:pb-24">
              <h1 className="font-modak text-6xl sm:text-7xl lg:text-[8rem] leading-[0.85] text-white uppercase tracking-tight drop-shadow-2xl">
                {t('heroTitle1')} <br />
                <span className="text-salsa-pink">{t('heroTitle2')}</span>
              </h1>
            </div>
            
          </div>
        </div>

        {/* =========================================
            RIGHT COLUMN: STORY & LINKS
            Clean, white, scrollable content area
        ========================================= */}
        <div className="w-full md:w-7/12 lg:w-1/2 bg-white pt-16 md:pt-32 pb-24 px-6 sm:px-12 lg:px-20 z-10">
          
          <h2 className="font-bebas tracking-wide text-5xl sm:text-6xl text-slate-900 mb-8 uppercase leading-none">
            {t('storyTitle')}
          </h2>
          
          <div className="space-y-6 text-slate-600 font-medium text-lg leading-relaxed mb-20">
            <p className="text-xl sm:text-2xl font-semibold text-slate-800 leading-snug">
              {t('storyP1')}
            </p>
            <p>{t('storyP2')}</p>
            <p>{t('storyP3')}</p>
          </div>

          {/* Links Directory - No junk tags, just clean interaction */}
          <div className="pt-16 border-t border-gray-100">
            <h2 className="font-bebas tracking-wide text-4xl sm:text-5xl text-slate-900 mb-4 uppercase">{t('connectTitle')}</h2>
            <p className="text-slate-500 font-medium text-lg mb-12">
              {t('connectDesc')}
            </p>
            
            <div className="space-y-12">
              
              {/* Socials */}
              <div className="flex flex-col">
                {mainSocials.map((social, i) => {
                  const Icon = social.icon;
                  return (
                    <a 
                      key={i} 
                      href={social.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group flex items-center gap-6 py-5 border-b border-gray-100 hover:border-slate-900 transition-colors duration-300"
                    >
                      <div className={`w-12 h-12 ${social.bg} rounded-full flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110`}>
                        <Icon className={social.color} size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-lg sm:text-xl truncate transition-transform duration-300 group-hover:translate-x-2">{social.name}</p>
                      </div>
                      <ArrowUpRight className="text-slate-300 group-hover:text-slate-900 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" size={24} />
                    </a>
                  );
                })}
              </div>

              {/* Events */}
              <div className="flex flex-col">
                {festivalEvents.map((event, i) => {
                  const Icon = event.icon;
                  return (
                    <a 
                      key={i} 
                      href={event.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group flex items-center gap-6 py-5 border-b border-gray-100 hover:border-slate-900 transition-colors duration-300"
                    >
                      <div className={`w-12 h-12 ${event.bg} rounded-full flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110`}>
                        <Icon className={event.color} size={22} />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center transition-transform duration-300 group-hover:translate-x-2">
                        <p className="font-bold text-slate-900 text-lg sm:text-xl truncate">{event.title}</p>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mt-1 truncate">{event.date}</p>
                      </div>
                      <ArrowUpRight className="text-slate-300 group-hover:text-slate-900 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" size={24} />
                    </a>
                  );
                })}
              </div>

            </div>
          </div>
        </div>

      </div>

      <Footer />
    </main>
  );
}