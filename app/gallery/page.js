"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

export default function GalleryPage() {
  const [selectedIndex, setSelectedIndex] = useState(null);

  // The base 9 images
  const baseImages = [
    { src: "https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=800&h=1200&fit=crop", alt: "Couple dancing salsa" },
    { src: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&h=700&fit=crop", alt: "Festival crowd cheering" },
    { src: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=800&h=800&fit=crop", alt: "Live band playing" },
    { src: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800&h=1000&fit=crop", alt: "Night beach party" },
    { src: "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?q=80&w=1200&h=800&fit=crop", alt: "DJ spinning tracks" },
    { src: "https://images.unsplash.com/photo-1516997184976-55a0b7791834?q=80&w=800&h=1100&fit=crop", alt: "Dancer posing" },
    { src: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=900&h=700&fit=crop", alt: "Concert lights" },
    { src: "https://images.unsplash.com/photo-1524117853209-a2fc128ceb66?q=80&w=800&h=1200&fit=crop", alt: "Workshop instruction" },
    { src: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1000&h=600&fit=crop", alt: "Outdoor stage" },
  ];

  // Tripling the images to create a massive masonry wall!
  const galleryImages = [...baseImages, ...baseImages, ...baseImages];

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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex]);

  return (
    // Swapped bg-white for bg-salsa-white to get that fresh minty tint
    <main className="min-h-screen bg-salsa-white font-montserrat selection:bg-salsa-pink selection:text-white">
      <Navbar />

      {/* 1. GALLERY HEADER (With Staggered Fade-ins) */}
      <section className="pt-40 pb-16 px-6 text-center">
        <span className="animate-fade-in delay-100 text-salsa-mint font-black text-[11px] uppercase tracking-[0.4em] mb-4 inline-block drop-shadow-sm">
          Memories
        </span>
        
        {/* Changed to Modak font, uppercase, with Pink "GALLERY" */}
        <h1 className="animate-fade-in delay-300 font-modak text-6xl md:text-8xl text-gray-900 leading-none uppercase drop-shadow-md">
          The <span className="text-salsa-pink">Gallery</span>
        </h1>
        
        <p className="animate-fade-in delay-500 max-w-xl mx-auto mt-6 text-gray-600 font-medium">
          Relive the energy, the music, and the beautiful moments from our previous editions.
        </p>
      </section>

      {/* 2. MASONRY GRID (Fades in last) */}
      <section className="animate-fade-in delay-700 px-6 pb-32 max-w-7xl mx-auto">
        <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
          {galleryImages.map((img, index) => (
            <div 
              key={index} 
              onClick={() => setSelectedIndex(index)}
              className="relative group overflow-hidden rounded-3xl cursor-pointer break-inside-avoid shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 bg-white"
            >
              <img 
                src={img.src} 
                alt={img.alt} 
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" 
                loading="lazy"
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
          className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button 
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-white/70 hover:text-salsa-pink transition-colors z-50 p-2"
          >
            <X size={36} />
          </button>

          {/* Left Arrow */}
          <button 
            onClick={showPrev}
            className="absolute left-4 md:left-12 text-white/50 hover:text-white hover:scale-110 transition-all z-50 p-4 bg-white/10 hover:bg-salsa-pink rounded-full backdrop-blur-sm"
          >
            <ChevronLeft size={40} />
          </button>

          {/* Main Display Image */}
          <img 
            src={galleryImages[selectedIndex].src} 
            alt={galleryImages[selectedIndex].alt} 
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()} 
          />

          {/* Right Arrow */}
          <button 
            onClick={showNext}
            className="absolute right-4 md:right-12 text-white/50 hover:text-white hover:scale-110 transition-all z-50 p-4 bg-white/10 hover:bg-salsa-pink rounded-full backdrop-blur-sm"
          >
            <ChevronRight size={40} />
          </button>
          
          {/* Image Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-black text-xs tracking-[0.3em] bg-black/30 px-4 py-2 rounded-full backdrop-blur-md">
            {selectedIndex + 1} / {galleryImages.length}
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}