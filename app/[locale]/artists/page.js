"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import { Instagram, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import Emoji from "@/components/Emoji"; // <-- IMPORT YOUR EMOJI COMPONENT

export default function ArtistsPage() {
  const t = useTranslations('Artists');
  const locale = useLocale();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "artists"), (snap) => {
      const fetchedArtists = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedArtists.sort((a, b) => a.name.localeCompare(b.name));
      setArtists(fetchedArtists);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat selection:bg-salsa-pink selection:text-white flex flex-col">
      <Navbar />

      <section className="pt-40 pb-12 px-6 text-center">
        <span className="animate-fade-in delay-100 text-salsa-mint font-black text-[11px] md:text-xs uppercase tracking-[0.4em] mb-4 inline-block drop-shadow-sm">
          {t('heroPre')}
        </span>
        <h1 className="animate-fade-in delay-300 font-modak text-6xl md:text-8xl text-slate-900 leading-none uppercase drop-shadow-md flex flex-wrap justify-center gap-3">
          {t('heroTitle1')} <span className="text-salsa-pink">{t('heroTitle2')}</span>
        </h1>
        <p className="animate-fade-in delay-500 max-w-xl mx-auto mt-6 text-slate-600 font-medium text-lg leading-relaxed">
          {t('heroDesc')}
        </p>
      </section>

      <section className="px-6 pb-32 max-w-7xl mx-auto w-full flex-grow">
        {loading ? (
          <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 mt-8">
            {artists.map((artist, index) => (
              <div 
                key={artist.id} 
                className="relative w-full aspect-[3/4] rounded-[2rem] overflow-hidden shadow-xl bg-slate-100 animate-in fade-in zoom-in duration-500"
                style={{ animationDelay: `${(index % 6) * 150}ms` }}
              >
                {artist.imageUrl && (
                  <Image 
                    src={artist.imageUrl} 
                    alt={artist.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />

                <div className="absolute bottom-4 left-4 right-4 bg-white p-5 rounded-2xl flex items-center justify-between shadow-lg">
                  
                  {/* WRAP THE TEXT CONTAINER IN <Emoji> */}
                  <Emoji className="flex flex-col text-left pr-4 min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-salsa-pink mb-1 block truncate">
                      {artist.genre?.[locale] || artist.genre?.en}
                    </span>
                    <h3 className="font-bebas text-4xl text-slate-900 tracking-wide leading-none mb-1.5 truncate">
                      {artist.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      <span className="text-sm shadow-sm leading-none">{artist.flag}</span>
                      <span className="truncate">{artist.country?.[locale] || artist.country?.en}</span>
                    </div>
                  </Emoji>

                  <div className="shrink-0 pl-4 border-l border-gray-100">
                    <a 
                      href={artist.instagramUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center bg-gray-50 hover:bg-salsa-pink text-slate-400 hover:text-white p-3.5 rounded-xl transition-colors duration-300"
                    >
                      <Instagram size={22} strokeWidth={2.5} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}