"use client";
import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Button from "@/components/Button"; // Imported Global Component
import { Music, Users, Sun, Star, ChevronLeft, ChevronRight } from "lucide-react";

export default function Home() {
  const scrollContainerRef = useRef(null);
  const autoScrollInterval = useRef(null);
  const restartTimeoutRef = useRef(null);

  const [isManuallyScrolling, setIsManuallyScrolling] = useState(false);

  const reviews = [
    { name: "Maria S.", role: "Professional Dancer", text: "The energy in Varna is unmatched. I've been to festivals in Berlin, but the beach workshops here are unique!" },
    { name: "Ivan K.", role: "Salsa Enthusiast", text: "Best organization I've seen in years. The group registration made it so easy for our dance school." },
    { name: "Sofia R.", role: "Student", text: "Sunset parties and high-quality workshops. I learned more in 3 days than in 3 months!" },
    { name: "Luca M.", role: "Instructor", text: "A top-tier event. The venue is spectacular and the music is 10/10." },
    { name: "Elena V.", role: "Beginner", text: "I was nervous to start, but the community here is so welcoming. Can't wait for 2026!" },
    { name: "Alex B.", role: "Advanced Lead", text: "The quality of the leads in Varna is amazing. Great social dancing all night." },
    { name: "Katarina D.", role: "Follower", text: "V University is a great venue. Easy access and beautiful views." },
  ];

  // --- AUTO SCROLL LOGIC ---
  const startAutoScroll = () => {
    if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);

    autoScrollInterval.current = setInterval(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollBy({ left: 1, behavior: 'auto' });

        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 1) {
          scrollContainerRef.current.scrollTo({ left: 0, behavior: 'auto' });
        }
      }
    }, 30);
  };

  const stopAutoScrollAndScheduleRestart = () => {
    if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);
    autoScrollInterval.current = null;
    setIsManuallyScrolling(true);

    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);

    restartTimeoutRef.current = setTimeout(() => {
      setIsManuallyScrolling(false);
      startAutoScroll();
    }, 5000);
  };

  const scrollLeft = () => {
    stopAutoScrollAndScheduleRestart();
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    stopAutoScrollAndScheduleRestart();
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    startAutoScroll();
    return () => {
      if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    };
  }, []);

  return (
    <main className="min-h-screen bg-white font-montserrat overflow-x-hidden">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section
        className="relative flex flex-col items-center overflow-hidden"
        style={{ minHeight: 'calc(100vh + 120px)' }}
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

        <div className="relative z-10 w-full h-screen flex flex-col items-center justify-center">
          <div className="text-salsa-white max-w-6xl mt-12 flex flex-col items-center">
            <span className="animate-fade-in delay-100 bg-salsa-pink/20 text-salsa-pink border border-salsa-pink/30 text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-[0.4em] mb-8 inline-block">
              15th Edition
            </span>

            <h1 className="animate-fade-in delay-300 font-modak text-7xl md:text-[7rem] leading-none mb-8 uppercase flex flex-wrap justify-center gap-4 text-center">
              <span className="ambient-wave-word wave-1">SUMMER</span>
              <span className="ambient-wave-word wave-2">SALSA</span>
              <span className="ambient-wave-word wave-3">FEST</span>
            </h1>

            <div className="animate-fade-in delay-500 flex flex-col md:flex-row items-center justify-center gap-12 mt-12 mb-16">
              <div className="text-center md:text-right">
                <p className="font-bebas text-5xl">1-3 AUG</p>
                <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.3em]">2026</p>
              </div>
              <div className="hidden md:block w-px h-16 bg-white/30" />
              <div className="text-center md:text-left">
                <p className="font-bebas text-5xl uppercase">Varna</p>
                <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.3em]">Varna Free University</p>
              </div>
            </div>

            <div className="animate-fade-in delay-700 flex flex-col sm:flex-row items-center justify-center gap-6">
              {/* COMPONENT UPGRADE: Using Button */}
              <Button href="/tickets" variant="primary" size="lg" className="w-72 shadow-xl shadow-salsa-pink/20">
                BUY PASS
              </Button>
              {/* Custom Hero Glass Button utilizing our interaction base */}
              <Button 
                href="/info" 
                variant="ghost"
                size="lg"
                className="w-72 border-2 border-white/40 text-white hover:bg-white hover:text-slate-900 backdrop-blur-sm"
              >
                LEARN MORE
              </Button>
            </div>
          </div>

          <div className="animate-fade-in delay-900 absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Scroll</span>
            <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center p-1">
              <div className="w-1 h-2 bg-salsa-pink rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-[1px] left-0 w-full z-20 leading-[0]">
          <svg
            className="w-full h-16 md:h-24 block"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,60 C300,120 900,0 1200,60 L1200,120 L0,120 Z"
              className="fill-white"
            ></path>
          </svg>
        </div>
      </section>

      {/* 2. SPECIALTY CARDS */}
      <section id="info" className="py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <span className="text-salsa-pink font-black text-[10px] uppercase tracking-[0.4em]">Experience</span>
          <h2 className="font-modak text-6xl text-slate-900 mt-2">Why Summer Salsa?</h2>
          <div className="w-20 h-1.5 bg-salsa-pink mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { title: "World Class Artists", desc: "Learn from over 50 international champions flying in from Cuba, Spain, and Italy.", icon: <Music className="text-salsa-pink w-10 h-10" /> },
            { title: "Sunrise Beach Parties", desc: "Dance until the sun comes up on the beautiful golden sands of Varna's central beach.", icon: <Sun className="text-salsa-pink w-10 h-10" /> },
            { title: "Inclusive Community", desc: "Whether you are a pro or a beginner, our community welcomes everyone with open arms.", icon: <Users className="text-salsa-pink w-10 h-10" /> }
          ].map((item, i) => (
            <div key={i} className="p-10 bg-salsa-white border border-salsa-mint/20 rounded-[2.5rem] hover:shadow-2xl hover:-translate-y-2 transition-all group cursor-pointer">
              <div className="mb-6 group-hover:scale-110 transition-transform">{item.icon}</div>
              <h3 className="font-bold text-2xl mb-4 text-slate-900">{item.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. FESTIVAL GALLERY */}
      <section id="gallery" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-4 h-auto md:h-[1000px]">
          <div className="md:col-span-2 md:row-span-2 rounded-3xl overflow-hidden bg-slate-100">
            <img src="https://www.doitinparis.com/files/2025/thumbs-1180x525/en/festivals-musique-ete-2025.jpg" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 1" />
          </div>
          <div className="md:col-span-2 rounded-3xl overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 2" />
          </div>
          <div className="rounded-3xl overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 3" />
          </div>
          <div className="rounded-3xl overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 4" />
          </div>
          <div className="md:col-span-2 rounded-3xl overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 5" />
          </div>
          <div className="md:col-span-2 rounded-3xl overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 6" />
          </div>
        </div>
      </section>

      {/* 4. REVIEWS */}
      <section className="py-32 bg-slate-50 relative overflow-hidden">
        <div className="text-center mb-16 px-6 relative z-10">
          <span className="text-salsa-pink font-black text-[10px] uppercase tracking-[0.4em]">Testimonials</span>
          <h2 className="font-modak text-5xl md:text-6xl mt-4 text-slate-900">What Dancers Say</h2>
        </div>

        <div className="relative max-w-[100vw] mx-auto group">
          {/* COMPONENT UPGRADE: Floating Action Buttons */}
          <div className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 z-20 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="actionIcon" 
              size="icon" 
              icon={ChevronLeft} 
              onClick={scrollLeft} 
              className="p-4 bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-900 rounded-full hover:border-salsa-pink hover:text-salsa-pink shadow-xl"
            />
          </div>

          <div className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 z-20 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="actionIcon" 
              size="icon" 
              icon={ChevronRight} 
              onClick={scrollRight} 
              className="p-4 bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-900 rounded-full hover:border-salsa-pink hover:text-salsa-pink shadow-xl"
            />
          </div>

          <div
            ref={scrollContainerRef}
            className="flex gap-8 px-6 md:px-[15vw] overflow-x-auto custom-scrollbar py-10 pb-14 scroll-smooth"
          >
            {[...reviews, ...reviews, ...reviews].map((review, i) => (
              <div
                key={i}
                className="shrink-0 w-[300px] md:w-[400px] bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 transition-transform hover:-translate-y-2 flex flex-col cursor-pointer"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, s) => <Star key={s} size={16} className="fill-salsa-pink text-salsa-pink" />)}
                </div>

                <p className="italic text-slate-600 text-lg mb-8 leading-relaxed font-medium flex-grow">
                  "{review.text}"
                </p>

                <div className="pt-6 border-t border-slate-50 mt-auto">
                  <p className="font-black text-slate-900 text-sm uppercase tracking-widest">{review.name}</p>
                  <p className="text-[10px] text-salsa-pink font-bold mt-1 uppercase tracking-widest">{review.role}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute top-0 left-0 w-[10vw] h-full bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none hidden md:block"></div>
          <div className="absolute top-0 right-0 w-[10vw] h-full bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none hidden md:block"></div>
        </div>
      </section>

      {/* 5. CALL TO ACTION */}
      <section className="py-32 px-6 text-center bg-salsa-white text-slate-900">
        <h2 className="font-modak text-6xl md:text-8xl mb-8 leading-none">DON&apos;T MISS OUT!</h2>
        <p className="max-w-xl mx-auto mb-12 text-xl font-medium opacity-80 leading-relaxed text-slate-700">
          Join thousands of dancers from around the world in Varna. Secure your pass today!
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          {/* COMPONENT UPGRADE: CTA Buttons */}
          <Button href="/tickets" variant="primary" size="lg" className="w-72 shadow-xl shadow-salsa-pink/20">
            BUY PASS
          </Button>
          
          <Button 
            href="/contact" 
            variant="outline" 
            size="lg" 
            className="w-72 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
          >
            CONTACT US
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  );
}