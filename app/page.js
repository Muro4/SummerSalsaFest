"use client";
import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import { Music, Users, Sun, Star } from "lucide-react"; 

export default function Home() {
  // All required refs for the smooth scrolling logic
  const scrollContainerRef = useRef(null);
  const animationRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  const isManuallyScrollingRef = useRef(false); // <-- This was missing!
  const scrollAccumulator = useRef(0);
  
  // --- DYNAMIC FESTIVAL DATA ---
  const [festivalYear, setFestivalYear] = useState(2026);
  const [editionText, setEditionText] = useState("15th Edition");

  const reviews = [
    { name: "Maria S.", role: "Professional Dancer", text: "The energy in Varna is unmatched. I've been to festivals in Berlin, but the beach workshops here are unique!" },
    { name: "Ivan K.", role: "Salsa Enthusiast", text: "Best organization I've seen in years. The group registration made it so easy for our dance school." },
    { name: "Sofia R.", role: "Student", text: "Sunset parties and high-quality workshops. I learned more in 3 days than in 3 months!" },
    { name: "Luca M.", role: "Instructor", text: "A top-tier event. The venue is spectacular and the music is 10/10." },
    { name: "Elena V.", role: "Beginner", text: "I was nervous to start, but the community here is so welcoming. Can't wait for the next one!" },
    { name: "Alex B.", role: "Advanced Lead", text: "The quality of the leads in Varna is amazing. Great social dancing all night." },
    { name: "Katarina D.", role: "Follower", text: "V University is a great venue. Easy access and beautiful views." },
  ];

  const features = [
    { title: "World Class Artists", desc: "Learn from over 50 international champions flying in from Cuba, Spain, and Italy.", icon: Music },
    { title: "Sunrise Beach Parties", desc: "Dance until the sun comes up on the beautiful golden sands of Varna's central beach.", icon: Sun },
    { title: "Inclusive Community", desc: "Whether you are a pro or a beginner, our community welcomes everyone with open arms.", icon: Users }
  ];

  useEffect(() => {
    // 1. Calculate Dynamic Year
    const d = new Date();
    const calculatedYear = d.getMonth() > 7 ? d.getFullYear() + 1 : d.getFullYear();
    setFestivalYear(calculatedYear);
    
    // 2. Calculate Edition
    const editionNumber = calculatedYear - 2011;
    const getOrdinal = (n) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    setEditionText(`${getOrdinal(editionNumber)} Edition`);

    // 3. Start Butter-Smooth Auto-Scroll
    startAutoScroll();
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- BUTTERY SMOOTH & SLOWED DOWN AUTO SCROLL ---
  const startAutoScroll = () => {
    const scroll = () => {
      if (scrollContainerRef.current && !isManuallyScrollingRef.current) {
        
        const isMobile = window.innerWidth < 768;
        
        // Very slow speeds for high-refresh-rate monitors
        const speed = isMobile ? 0.4 : 0.15; 
        
        scrollAccumulator.current += speed;
        
        if (scrollAccumulator.current >= 1) {
          scrollContainerRef.current.scrollLeft += Math.floor(scrollAccumulator.current);
          scrollAccumulator.current -= Math.floor(scrollAccumulator.current);
        }

        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        
        // Reset to beginning if we hit the end
        if (scrollLeft + clientWidth >= scrollWidth - 1) {
          scrollContainerRef.current.scrollLeft = 0;
        }
      }
      animationRef.current = requestAnimationFrame(scroll);
    };
    
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(scroll);
  };

  const stopAutoScrollAndScheduleRestart = () => {
    isManuallyScrollingRef.current = true;
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    restartTimeoutRef.current = setTimeout(() => {
      isManuallyScrollingRef.current = false;
    }, 5000); // Wait 5 seconds after manual interaction to resume auto-scroll
  };

  return (
    <main className="min-h-screen bg-white font-montserrat overflow-x-hidden">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section
        className="relative flex flex-col items-center overflow-hidden justify-center min-h-[100svh] md:min-h-[calc(100vh+120px)]"
      >
        <div
          className="absolute inset-0 z-0 bg-slate-900"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0, 14, 36, 0.8), rgba(0, 11, 36, 0.4)), url('/images/background.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        />

        {/* EXACT HERO REVERT */}
        <div className="relative z-10 w-full h-screen flex flex-col items-center justify-center px-4 md:px-0"> 
          <div className="text-salsa-white max-w-6xl mt-12 flex flex-col items-center w-full"> 
            
            {/* DYNAMIC EDITION TEXT */} 
            <span className="animate-fade-in delay-100 bg-salsa-pink/20 text-salsa-pink border border-salsa-pink/30 text-[10px] md:text-[11px] font-black px-5 md:px-6 py-2 rounded-full uppercase tracking-[0.4em] mb-6 md:mb-8 text-center"> 
              {editionText} 
            </span> 

            <h1 className="animate-fade-in delay-300 font-modak text-[4rem] sm:text-7xl md:text-[7rem] leading-none mb-6 md:mb-8 uppercase flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 text-center"> 
              <span className="ambient-wave-word wave-1">SUMMER</span> 
              <span className="ambient-wave-word wave-2">SALSA</span> 
              <span className="ambient-wave-word wave-3">FEST</span> 
            </h1> 

            <div className="animate-fade-in delay-500 flex flex-col md:flex-row items-center justify-center mt-4 md:mt-12 mb-10 md:mb-16 w-full max-w-[300px] md:max-w-none bg-white/10 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border border-white/20 md:border-none rounded-3xl p-6 md:p-0 shadow-2xl md:shadow-none gap-6 md:gap-12"> 
              <div className="text-center md:text-right w-full md:w-auto"> 
                <p className="font-bebas text-4xl md:text-5xl text-white">1-3 AUG</p> 
                {/* DYNAMIC YEAR */} 
                <p className="text-[10px] md:text-[11px] font-black text-white/60 md:opacity-60 uppercase tracking-[0.3em] mt-1 md:mt-0">{festivalYear}</p> 
              </div> 
              <div className="w-16 h-px md:w-px md:h-16 bg-white/30" /> 
              <div className="text-center md:text-left w-full md:w-auto"> 
                <p className="font-bebas text-4xl md:text-5xl uppercase text-white">Varna</p> 
                <p className="text-[10px] md:text-[11px] font-black text-white/60 md:opacity-60 uppercase tracking-[0.3em] mt-1 md:mt-0">Varna Free University</p> 
              </div> 
            </div> 

            <div className="animate-fade-in delay-700 flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 w-full md:w-auto"> 
              <Button href="/tickets" variant="primary" size="lg" className="w-full max-w-[280px] sm:w-72 shadow-xl shadow-salsa-pink/20"> 
                BUY PASS 
              </Button> 

              <Button href="/info" variant="ghost" size="lg" className="w-full max-w-[280px] sm:w-72 border-2 border-white/40 text-white hover:bg-white hover:text-slate-900 backdrop-blur-sm"> 
                LEARN MORE 
              </Button> 
            </div> 
          </div> 
          
          {/* Scroll Indicator - Hidden on mobile to avoid overlap */}
          <div className="hidden md:flex animate-fade-in delay-900 absolute bottom-10 left-1/2 -translate-x-1/2 flex-col items-center gap-2">
            <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em]">Scroll</span>
            <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center p-1">
              <div className="w-1 h-2 bg-salsa-pink rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-[1px] left-0 w-full z-20 leading-[0]">
          <svg className="w-full h-10 sm:h-16 md:h-24 block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,60 C300,120 900,0 1200,60 L1200,120 L0,120 Z" className="fill-white"></path>
          </svg>
        </div>
      </section>

      {/* 2. SPECIALTY CARDS */}
      <section id="info" className="py-20 md:py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-14 md:mb-20">
          <span className="text-salsa-pink font-black text-[10px] md:text-[11px] uppercase tracking-[0.4em]">Experience</span>
          <h2 className="font-modak text-5xl md:text-6xl text-slate-900 mt-2">Why Summer Salsa?</h2>
          <div className="w-20 h-1.5 bg-salsa-pink mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          {features.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="relative p-8 md:p-10 bg-gradient-to-br from-white to-slate-50 border border-slate-100 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-slate-200/40 overflow-hidden">
                <Icon className="absolute -bottom-6 -right-6 w-40 h-40 md:w-48 md:h-48 text-slate-200 opacity-30 pointer-events-none" />
                <div className="relative z-10">
                  <div className="mb-6 md:mb-8 w-14 h-14 md:w-16 md:h-16 bg-salsa-pink/10 rounded-2xl flex items-center justify-center">
                    <Icon className="text-salsa-pink w-7 h-7 md:w-8 md:h-8" />
                  </div>
                  <h3 className="font-bold text-xl md:text-2xl mb-3 md:mb-4 text-slate-900">{item.title}</h3>
                  <p className="text-slate-500 leading-relaxed text-sm">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. FESTIVAL GALLERY */}
      <section id="gallery" className="py-16 md:py-24 px-4 md:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 md:grid-rows-3 gap-3 md:gap-4 h-auto md:h-[1000px]">
          <div className="md:col-span-2 md:row-span-2 rounded-2xl md:rounded-3xl overflow-hidden bg-slate-100 h-64 md:h-auto">
            <img src="https://www.doitinparis.com/files/2025/thumbs-1180x525/en/festivals-musique-ete-2025.jpg" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 1" />
          </div>
          <div className="md:col-span-2 rounded-2xl md:rounded-3xl overflow-hidden bg-slate-100 h-48 md:h-auto">
            <img src="https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 2" />
          </div>
          <div className="rounded-2xl md:rounded-3xl overflow-hidden bg-slate-100 h-48 md:h-auto">
            <img src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 3" />
          </div>
          <div className="rounded-2xl md:rounded-3xl overflow-hidden bg-slate-100 h-48 md:h-auto">
            <img src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 4" />
          </div>
          <div className="md:col-span-2 rounded-2xl md:rounded-3xl overflow-hidden bg-slate-100 h-48 md:h-auto">
            <img src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 5" />
          </div>
          <div className="md:col-span-2 rounded-2xl md:rounded-3xl overflow-hidden bg-slate-100 h-48 md:h-auto">
            <img src="https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 6" />
          </div>
        </div>
      </section>

      {/* 4. REVIEWS */}
      <section className="py-20 md:py-32 bg-slate-50 relative overflow-hidden">
        <div className="text-center mb-10 md:mb-16 px-6 relative z-10">
          <span className="text-salsa-pink font-black text-[10px] md:text-[11px] uppercase tracking-[0.4em]">Testimonials</span>
          <h2 className="font-modak text-4xl md:text-6xl mt-4 text-slate-900">What Dancers Say</h2>
        </div>

        <div 
          className="relative max-w-[100vw] mx-auto group"
          onMouseEnter={stopAutoScrollAndScheduleRestart}
          onTouchStart={stopAutoScrollAndScheduleRestart}
        >
          {/* Snap properties removed entirely to allow butter-smooth JS scrolling */}
          <div ref={scrollContainerRef} className="flex gap-4 md:gap-8 px-4 md:px-[15vw] overflow-x-auto hide-scrollbar py-6 md:py-10 pb-10 md:pb-14">
            {[...reviews, ...reviews, ...reviews].map((review, i) => (
              <div key={i} className="shrink-0 w-[280px] sm:w-[350px] md:w-[400px] bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col cursor-pointer">
                <div className="flex gap-1 mb-4 md:mb-6">
                  {[...Array(5)].map((_, s) => <Star key={s} size={14} className="md:w-4 md:h-4 fill-salsa-pink text-salsa-pink" />)}
                </div>
                <p className="italic text-slate-600 text-base md:text-lg mb-6 md:mb-8 leading-relaxed font-medium flex-grow">"{review.text}"</p>
                <div className="pt-4 md:pt-6 border-t border-slate-50 mt-auto">
                  <p className="font-black text-slate-900 text-xs md:text-sm uppercase tracking-widest">{review.name}</p>
                  <p className="text-[10px] md:text-[11px] text-salsa-pink font-bold mt-1 md:mt-1.5 uppercase tracking-widest">{review.role}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute top-0 left-0 w-[10vw] h-full bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none hidden md:block"></div>
          <div className="absolute top-0 right-0 w-[10vw] h-full bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none hidden md:block"></div>
        </div>
      </section>

      {/* 5. CALL TO ACTION */}
      <section className="py-24 md:py-32 px-4 md:px-6 text-center bg-salsa-white text-slate-900">
        <h2 className="font-modak text-5xl md:text-8xl mb-6 md:mb-8 leading-none">DON&apos;T MISS OUT!</h2>
        <p className="max-w-xl mx-auto mb-10 md:mb-12 text-lg md:text-xl font-medium opacity-80 leading-relaxed text-slate-700 px-4">
          Join thousands of dancers from around the world in Varna. Secure your pass today!
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full">
          <Button href="/tickets" variant="primary" size="lg" className="w-full max-w-[280px] sm:w-72 shadow-xl shadow-salsa-pink/20">
            BUY PASS
          </Button>
          <Button href="/contact" variant="outline" size="lg" className="w-full max-w-[280px] sm:w-72 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white">
            CONTACT US
          </Button>
        </div>
      </section>

      <Footer />
      
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
    </main>
  );
}