"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image"; // <-- IMPORT NEXT/IMAGE
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function GalleryPage() {
  const t = useTranslations('Gallery');
  const [selectedIndex, setSelectedIndex] = useState(null);

  // THE FIX: Added width and height properties based on the Unsplash URL parameters.
  // This is required for next/image to prevent layout shifts in a Masonry grid.
  const baseImages = [
    { id: 1, src: "https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=800&h=1200&fit=crop", width: 800, height: 1200, alt: "Couple dancing salsa" },
    { id: 2, src: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&h=700&fit=crop", width: 1000, height: 700, alt: "Festival crowd cheering" },
    { id: 3, src: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=800&h=800&fit=crop", width: 800, height: 800, alt: "Live band playing" },
    { id: 4, src: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800&h=1000&fit=crop", width: 800, height: 1000, alt: "Night beach party" },
    { id: 5, src: "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?q=80&w=1200&h=800&fit=crop", width: 1200, height: 800, alt: "DJ spinning tracks" },
    { id: 6, src: "https://images.unsplash.com/photo-1516997184976-55a0b7791834?q=80&w=800&h=1100&fit=crop", width: 800, height: 1100, alt: "Dancer posing" },
    { id: 7, src: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=900&h=700&fit=crop", width: 900, height: 700, alt: "Concert lights" },
    { id: 8, src: "https://images.unsplash.com/photo-1524117853209-a2fc128ceb66?q=80&w=800&h=1200&fit=crop", width: 800, height: 1200, alt: "Workshop instruction" },
    { id: 9, src: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1000&h=600&fit=crop", width: 1000, height: 600, alt: "Outdoor stage" },
  ];

  // Tripling the images to create a massive masonry wall
  const galleryImages = [...baseImages, ...baseImages, ...baseImages].map((img, i) => ({...img, uniqueKey: i}));

  // --- LIGHTBOX NAVIGATION LOGIC ---
  const closeLightbox = () => setSelectedIndex(null);

  const showNext = (e) => {
    e.stopPropagation(); 
    setSelectedIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const showPrev = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  // Keyboard navigation for the lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedIndex === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") showNext(e);
      if (e.key === "ArrowLeft") showPrev(e);
    };
    window.addEventListener("keydown", handleKeyDown);
    
    // Prevent body scroll when lightbox is open
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

  // Scroll mobile carousel to the clicked image on open
  useEffect(() => {
    if (selectedIndex !== null) {
      const el = document.getElementById(`gallery-slide-${selectedIndex}`);
      if (el) el.scrollIntoView({ behavior: 'instant', inline: 'center' });
    }
  }, [selectedIndex]);

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat selection:bg-salsa-pink selection:text-white">
      <Navbar />

      {/* 1. GALLERY HEADER */}
      <section className="pt-40 pb-16 px-6 text-center">
        <span className="animate-fade-in delay-100 text-salsa-mint font-black text-[11px] uppercase tracking-[0.4em] mb-4 inline-block drop-shadow-sm">
          {t('heroPre')}
        </span>
        <h1 className="animate-fade-in delay-300 font-modak text-6xl md:text-8xl text-gray-900 leading-none uppercase drop-shadow-md flex flex-wrap justify-center gap-3">
          {t('heroTitle1')} <span className="text-salsa-pink">{t('heroTitle2')}</span>
        </h1>
        <p className="animate-fade-in delay-500 max-w-xl mx-auto mt-6 text-gray-600 font-medium">
          {t('heroDesc')}
        </p>
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
              {/* THE FIX: Using next/image with specific width/height prevents masonry layout collapse */}
              <Image 
                src={img.src} 
                alt={img.alt} 
                width={img.width}
                height={img.height}
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                priority={index < 6} // Prioritize loading the first 6 images to boost LCP score
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" 
              />
              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-salsa-pink/20 transition-colors duration-500 flex items-center justify-center">
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
            className="absolute top-4 right-4 md:top-6 md:right-6 text-white hover:text-salsa-pink transition-all bg-white/10 p-2 md:p-3 rounded-full backdrop-blur-md z-[120]"
          >
            <X size={24} className="md:w-8 md:h-8" />
          </button>

          {/* --- DESKTOP VIEW (Classic Lightbox) --- */}
          <div className="hidden md:flex relative items-center justify-center w-full h-full px-24">
            <button 
              onClick={(e) => { e.stopPropagation(); showPrev(e); }}
              className="absolute left-12 text-white/70 hover:text-white hover:scale-110 transition-all z-50 p-4 bg-white/10 hover:bg-salsa-pink rounded-full backdrop-blur-sm"
            >
              <ChevronLeft size={40} />
            </button>

            {/* THE FIX: Use 'fill' and 'object-contain' for the lightbox image so it scales perfectly */}
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
              className="absolute right-12 text-white/70 hover:text-white hover:scale-110 transition-all z-50 p-4 bg-white/10 hover:bg-salsa-pink rounded-full backdrop-blur-sm"
            >
              <ChevronRight size={40} />
            </button>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-black text-xs tracking-[0.3em] bg-black/30 px-4 py-2 rounded-full backdrop-blur-md">
              {selectedIndex + 1} / {galleryImages.length}
            </div>
          </div>

          {/* --- MOBILE VIEW (Swipeable Snap Carousel) --- */}
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
                  
                  {/* Swipe Indicator (Only show on the first image you click) */}
                  {i === selectedIndex && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/50 animate-pulse z-50">
                      <ChevronLeft size={16} />
                      <span className="text-[10px] uppercase tracking-widest font-bold">{t('swipe')}</span>
                      <ChevronRight size={16} />
                    </div>
                  )}

                  {/* THE FIX: Mobile image uses fill and contain */}
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