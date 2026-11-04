"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ZoomIn, Facebook, ExternalLink } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function GalleryPage() {
  const t = useTranslations('Gallery');
  const [selectedIndex, setSelectedIndex] = useState(null);

  const galleryImages = Array.from({ length: 25 }, (_, i) => {
    const id = i + 1;
    const calculatedHeight = 800 + ((i % 3) * 200); 
    
    return {
      id,
      src: `/images/${id}.jpg`,
      width: 800,
      height: calculatedHeight,
      alt: `Gallery photo ${id}`,
      uniqueKey: i
    };
  });

  const closeLightbox = () => setSelectedIndex(null);

  const showNext = (e) => {
    e.stopPropagation(); 
    setSelectedIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const showPrev = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedIndex === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") showNext(e);
      if (e.key === "ArrowLeft") showPrev(e);
    };
    window.addEventListener("keydown", handleKeyDown);
    
    if (selectedIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [selectedIndex, galleryImages.length]);

  useEffect(() => {
    if (selectedIndex !== null) {
      const el = document.getElementById(`gallery-slide-${selectedIndex}`);
      if (el) el.scrollIntoView({ behavior: 'instant', inline: 'center' });
    }
  }, [selectedIndex]);

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat selection: selection:text-white">
      <Navbar />

      {/* 1. GALLERY HEADER */}
      <section className="pt-40 pb-12 px-6 text-center">
        <h1 className="animate-fade-in delay-300 font-modak text-6xl md:text-8xl text-gray-900 leading-none uppercase drop-shadow-md flex flex-wrap justify-center gap-3">
          {t('heroTitle1')}
        </h1>
        
        {/* FACEBOOK MAIN ALBUM SECTION */}
        <div className="mt-10 mb-4 animate-fade-in delay-500 flex justify-center">
          <a 
            href="https://www.facebook.com/SummerSalsaFestVarna/photos_albums" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-5 bg-white px-8 py-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 hover:border-blue-100 transition-all duration-300 group max-w-lg w-full md:w-auto"
          >
            <div className="bg-blue-50 text-blue-600 p-4 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shrink-0">
              <Facebook size={28} />
            </div>
            <div className="text-left flex-grow">
              <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-500 transition-colors">
                {t('fbTitle')}
              </p>
              <p className="font-bebas text-3xl md:text-4xl tracking-wide text-slate-900 leading-none mt-1">
                {t('fbAlbum')}
              </p>
            </div>
            <ExternalLink size={20} className="text-slate-200 group-hover:text-blue-400 shrink-0 transition-colors" />
          </a>
        </div>
      </section>

      {/* 2. MASONRY GRID */}
      <section className="animate-fade-in delay-700 px-6 pb-32 max-w-7xl mx-auto">
        <div className="columns-1 sm:columns-2 md:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6">
          {galleryImages.map((img, index) => (
            <div 
              key={img.uniqueKey} 
              onClick={() => setSelectedIndex(index)}
              className="relative group overflow-hidden rounded-3xl cursor-pointer break-inside-avoid shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 bg-slate-100"
            >
              <Image 
                src={img.src} 
                alt={img.alt} 
                width={img.width}
                height={img.height}
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                priority={index < 6}
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" 
              />
              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-violet-600/20 transition-colors duration-500 flex items-center justify-center">
                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-50 group-hover:scale-100 transform drop-shadow-lg" size={48} strokeWidth={2} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. FULLSCREEN LIGHTBOX OVERLAY */}
      {selectedIndex !== null && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300"
          onClick={closeLightbox}
        >
          <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />

          {/* Global Close Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-4 right-4 md:top-6 md:right-6 text-white hover:text-violet-400 transition-all bg-white/10 p-2 md:p-3 rounded-full backdrop-blur-md z-[120]"
          >
            <X size={24} className="md:w-8 md:h-8" />
          </button>

          {/* --- DESKTOP VIEW --- */}
          <div className="hidden md:flex relative items-center justify-center w-full h-full px-24">
            <button 
              onClick={(e) => { e.stopPropagation(); showPrev(e); }}
              className="absolute left-12 text-white/70 hover:text-white hover:scale-110 transition-all z-50 p-4 bg-white/10 hover:bg-violet-600 rounded-full backdrop-blur-sm"
            >
              <ChevronLeft size={40} />
            </button>

            <div className="relative w-full h-[85vh]" onClick={(e) => e.stopPropagation()}>
              <Image 
                src={galleryImages[selectedIndex].src} 
                alt={galleryImages[selectedIndex].alt} 
                fill
                sizes="100vw"
                quality={100}
                priority
                className="object-contain animate-in zoom-in-95 duration-300 drop-shadow-2xl"
              />
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); showNext(e); }}
              className="absolute right-12 text-white/70 hover:text-white hover:scale-110 transition-all z-50 p-4 bg-white/10 hover:bg-violet-600 rounded-full backdrop-blur-sm"
            >
              <ChevronRight size={40} />
            </button>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-black text-xs tracking-[0.3em] bg-black/30 px-4 py-2 rounded-full backdrop-blur-md">
              {selectedIndex + 1} / {galleryImages.length}
            </div>
          </div>

          {/* --- MOBILE VIEW --- */}
          <div 
            className="flex md:hidden absolute inset-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory hide-scrollbar z-[105]" 
            onClick={closeLightbox}
          >
            {galleryImages.map((img, i) => (
              <div 
                id={`gallery-slide-${i}`} 
                key={img.uniqueKey} 
                className="min-w-full h-full px-4 snap-center snap-always flex flex-col items-center justify-center"
              >
                <div className="relative w-full h-[80vh] flex flex-col items-center justify-center">
                  
                  {i === selectedIndex && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/50 animate-pulse z-50">
                      <ChevronLeft size={16} />
                      <span className="text-[10px] uppercase tracking-widest font-bold">{t('swipe')}</span>
                      <ChevronRight size={16} />
                    </div>
                  )}

                  <Image 
                    src={img.src} 
                    alt={img.alt} 
                    fill
                    sizes="100vw"
                    className="object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()} 
                  />
                  
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white font-black text-[10px] tracking-[0.3em] bg-black/30 px-4 py-1.5 rounded-full backdrop-blur-md">
                    {i + 1} / {galleryImages.length}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      <Footer />
    </main>
  );
}