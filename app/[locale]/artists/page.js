"use client";
import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import { Instagram, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import Emoji from "@/components/Emoji";

export default function ArtistsPage() {
  const t = useTranslations('Artists');
  const locale = useLocale();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("stars");

  // Define categories and their corresponding translation keys
  const categories = [
    { id: "stars", label: t('catStars') },
    { id: "artists", label: t('catArtists') },
    { id: "djs", label: t('catDjs') },
    { id: "media", label: t('catMedia') }
  ];

  useEffect(() => {
    // Option A: Fetching from a single settings document to save reads
    const unsub = onSnapshot(doc(db, "settings", "artists"), (docSnap) => {
      if (docSnap.exists()) {
        const fetchedArtists = docSnap.data().list || [];
        fetchedArtists.sort((a, b) => a.name.localeCompare(b.name));
        setArtists(fetchedArtists);
      } else {
        setArtists([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredArtists = useMemo(() => {
    return artists.filter(artist => (artist.category || 'stars') === activeCategory);
  }, [artists, activeCategory]);

  const gridClass = activeCategory === "stars" 
    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
    : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat selection:bg-salsa-pink selection:text-white flex flex-col">
      <Navbar />

      <section className="pt-40 pb-8 px-6 text-center">
        <h1 className="animate-fade-in delay-300 font-modak text-6xl md:text-8xl text-slate-900 leading-none uppercase drop-shadow-md flex flex-wrap justify-center gap-3">
          {t('heroTitle1')}
        </h1>

        {/* CATEGORY FILTER TABS */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-12 animate-fade-in delay-700">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-3 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest transition-all duration-300 shadow-sm ${
                activeCategory === cat.id 
                  ? "bg-slate-900 text-white shadow-md scale-105" 
                  : "bg-white text-slate-500 border border-gray-100 hover:border-slate-300 hover:text-slate-800 hover:shadow-md"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      <section className="px-6 pb-32 max-w-7xl mx-auto w-full flex-grow">
        {loading ? (
          <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>
        ) : filteredArtists.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">{t('empty')}</p>
          </div>
        ) : (
          <div className={`grid gap-8 md:gap-10 mt-8 ${gridClass}`}>
            {filteredArtists.map((artist, index) => (
              <div 
                key={artist.id} 
                className="relative w-full aspect-[3/4] rounded-[2rem] overflow-hidden shadow-xl bg-slate-100 animate-in fade-in zoom-in duration-500"
                style={{ animationDelay: `${(index % 6) * 100}ms` }}
              >
                {artist.imageUrl && (
                  <Image 
                    src={artist.imageUrl} 
                    alt={artist.name}
                    fill
                    sizes={activeCategory === 'stars' 
                      ? "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      : "(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    }
                    className="object-cover"
                  />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />

                <div className="absolute bottom-4 left-4 right-4 bg-white p-5 rounded-2xl flex items-center justify-between shadow-lg">
                  <Emoji className="flex flex-col text-left pr-4 min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-salsa-pink mb-1 block truncate">
                      {artist.genre?.[locale] || artist.genre?.en}
                    </span>
                    <h3 className={`font-bebas text-slate-900 tracking-wide leading-none mb-1.5 truncate ${activeCategory === 'stars' ? 'text-4xl' : 'text-3xl'}`}>
                      {artist.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      <span className="text-sm shadow-sm leading-none">{artist.flag}</span>
                      <span className="truncate">{artist.country?.[locale] || artist.country?.en}</span>
                    </div>
                  </Emoji>

                  <div className="shrink-0 pl-4 border-l border-gray-100">
                    {artist.instagramUrl ? (
                      <a 
                        href={artist.instagramUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center bg-gray-50 hover:bg-salsa-pink text-slate-400 hover:text-white p-3.5 rounded-xl transition-colors duration-300"
                      >
                        <Instagram size={22} strokeWidth={2.5} />
                      </a>
                    ) : (
                      <div className="flex items-center justify-center bg-gray-50 text-gray-300 p-3.5 rounded-xl">
                        <Instagram size={22} strokeWidth={2.5} />
                      </div>
                    )}
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