"use client";
import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import { Music, Users, Sun, Star, Moon, CalendarDays, MapPin, Ticket as TicketIcon, Clock } from "lucide-react"; 
import { QRCodeSVG } from "qrcode.react";

export default function Home() {
  const scrollContainerRef = useRef(null);
  const autoScrollRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  const isManuallyScrollingRef = useRef(false); 
  const scrollAccumulator = useRef(0);
  
  // --- HYBRID DATA ---
  const [festivalYear, setFestivalYear] = useState(2026);
  const [editionText, setEditionText] = useState("15th Edition");
  
  // 1. THE SWITCH STATE
  const [isNightMode, setIsNightMode] = useState(false);

  // 2. THE 3D TICKET ENGINE REFS
  const ticketRef = useRef(null);
  const engineRef = useRef(null);
  // x: vw, y: vh, s: scale, rx: rotateX, ry: rotateY, rz: rotateZ
  const ticketState = useRef({ x: 50, y: 50, s: 1, rx: 0, ry: 0, rz: 0 });
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const reviews = [
    { name: "Maria S.", role: "Professional Dancer", text: "The energy in Varna is unmatched. I've been to festivals in Berlin, but the beach workshops here are unique!" },
    { name: "Ivan K.", role: "Salsa Enthusiast", text: "Best organization I've seen in years. The group registration made it so easy for our dance school." },
    { name: "Sofia R.", role: "Student", text: "Sunset parties and high-quality workshops. I learned more in 3 days than in 3 months!" },
    { name: "Luca M.", role: "Instructor", text: "A top-tier event. The venue is spectacular and the music is 10/10." },
  ];

  const features = [
    { title: "World Class Artists", desc: "Learn from over 50 international champions flying in from Cuba, Spain, and Italy.", icon: Music },
    { title: "Sunrise Beach Parties", desc: "Dance until the sun comes up on the beautiful golden sands of Varna's central beach.", icon: Sun },
    { title: "Inclusive Community", desc: "Whether you are a pro or a beginner, our community welcomes everyone with open arms.", icon: Users }
  ];

  useEffect(() => {
    const d = new Date();
    const calculatedYear = d.getMonth() > 7 ? d.getFullYear() + 1 : d.getFullYear();
    setFestivalYear(calculatedYear);
    
    const editionNumber = calculatedYear - 2011;
    const getOrdinal = (n) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    setEditionText(`${getOrdinal(editionNumber)} Edition`);

    startAutoScroll();
    startTicketEngine();
    
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
      if (engineRef.current) cancelAnimationFrame(engineRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // --- THE HIGH-PERFORMANCE LERP ENGINE FOR THE SCROLLING TICKET ---
  const startTicketEngine = () => {
    const renderLoop = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollP = Math.max(0, Math.min(1, window.scrollY / (maxScroll || 1)));
      const isMobile = window.innerWidth < 768;

      let target = { x: 50, y: 50, s: 1, rx: 0, ry: 0, rz: 0 };

      // Phase calculation based on scroll depth
      if (scrollP < 0.15) {
        // HERO: Right side desktop, center mobile
        target = { 
          x: isMobile ? 50 : 75, 
          y: isMobile ? 60 : 50, 
          s: isMobile ? 0.8 : 1, 
          rx: (mousePos.y - 50) * 0.3, // 3D mouse tracking
          ry: (mousePos.x - 50) * 0.3, 
          rz: -2 + (Math.sin(Date.now() / 2000) * 2) // Gentle float
        };
      } else if (scrollP >= 0.15 && scrollP < 0.45) {
        // FEATURES: Slide to right margin
        target = { x: isMobile ? 85 : 85, y: isMobile ? 75 : 50, s: isMobile ? 0.4 : 0.6, rx: 15, ry: -25, rz: 5 };
      } else if (scrollP >= 0.45 && scrollP < 0.75) {
        // GALLERY/REVIEWS: Slide to left margin
        target = { x: isMobile ? 15 : 15, y: isMobile ? 75 : 50, s: isMobile ? 0.4 : 0.6, rx: 15, ry: 25, rz: -5 };
      } else if (scrollP >= 0.75) {
        // CTA: Drop into center slot just above button
        target = { x: 50, y: isMobile ? 35 : 45, s: isMobile ? 0.7 : 0.9, rx: 0, ry: 0, rz: 0 };
      }

      // Linear Interpolation
      ticketState.current.x += (target.x - ticketState.current.x) * 0.08;
      ticketState.current.y += (target.y - ticketState.current.y) * 0.08;
      ticketState.current.s += (target.s - ticketState.current.s) * 0.08;
      ticketState.current.rx += (target.rx - ticketState.current.rx) * 0.08;
      ticketState.current.ry += (target.ry - ticketState.current.ry) * 0.08;
      ticketState.current.rz += (target.rz - ticketState.current.rz) * 0.08;

      if (ticketRef.current) {
        ticketRef.current.style.transform = `translate(-50%, -50%) translate(${ticketState.current.x}vw, ${ticketState.current.y}vh) scale(${ticketState.current.s}) rotateX(${ticketState.current.rx}deg) rotateY(${ticketState.current.ry}deg) rotateZ(${ticketState.current.rz}deg)`;
      }

      engineRef.current = requestAnimationFrame(renderLoop);
    };
    renderLoop();
  };

  const startAutoScroll = () => {
    const scroll = () => {
      if (scrollContainerRef.current && !isManuallyScrollingRef.current) {
        const isMobile = window.innerWidth < 768;
        const speed = isMobile ? 0.4 : 0.15; 
        scrollAccumulator.current += speed;
        if (scrollAccumulator.current >= 1) {
          scrollContainerRef.current.scrollLeft += Math.floor(scrollAccumulator.current);
          scrollAccumulator.current -= Math.floor(scrollAccumulator.current);
        }
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 1) {
          scrollContainerRef.current.scrollLeft = 0;
        }
      }
      autoScrollRef.current = requestAnimationFrame(scroll);
    };
    if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
    autoScrollRef.current = requestAnimationFrame(scroll);
  };

  const stopAutoScrollAndScheduleRestart = () => {
    isManuallyScrollingRef.current = true;
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    restartTimeoutRef.current = setTimeout(() => {
      isManuallyScrollingRef.current = false;
    }, 5000); 
  };

  return (
    <>
      {/* ========================================================= */}
      {/* THE 3D APP TICKET (FIXED LAYER OUTSIDE MAIN TAG TO PREVENT CLIPPING) */}
      {/* ========================================================= */}
      <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden" style={{ perspective: '1200px' }}>
        <div 
          ref={ticketRef}
          className="absolute top-0 left-0 transition-colors duration-1000 pointer-events-auto"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* THE PREMIUM TICKET UI */}
          <div className={`w-[280px] md:w-[320px] h-[520px] md:h-[580px] rounded-[2rem] flex flex-col shadow-[0_30px_60px_rgba(0,0,0,0.4)] relative overflow-hidden transition-all duration-1000 backdrop-blur-2xl border ${
            isNightMode ? 'bg-slate-900/60 border-white/20' : 'bg-white/70 border-white shadow-teal-900/10'
          }`}>
            
            {/* Holographic Glare */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay transition-all duration-300 z-0"
              style={{
                background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,0.8), transparent 60%)`
              }}
            />

            {/* TOP HALF: QR CODE */}
            <div className={`p-6 flex flex-col items-center justify-center border-b-2 border-dashed transition-colors duration-1000 relative z-10 shrink-0 ${
              isNightMode ? 'bg-salsa-pink/5 border-white/20' : 'bg-salsa-mint/10 border-slate-200'
            }`}>
              <div 
                className="w-40 h-40 bg-white p-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center justify-center transition-transform"
                style={{ transform: 'translateZ(30px)' }}
              >
                <QRCodeSVG value="SSF2026-PREMIUM" size={256} style={{ width: "100%", height: "100%" }} level="H" />
              </div>
              <p className={`mt-4 text-[10px] font-black uppercase tracking-[0.3em] ${isNightMode ? 'text-white/50' : 'text-slate-400'}`} style={{ transform: 'translateZ(20px)' }}>
                Scan at Entrance
              </p>
            </div>

            {/* BOTTOM HALF: DETAILS */}
            <div className="p-6 flex flex-col flex-1 relative z-10">
              <div className="mb-4" style={{ transform: 'translateZ(20px)' }}>
                <span className="inline-flex items-center justify-center px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm bg-salsa-pink text-white">
                  Full Pass
                </span>
              </div>
              
              <h2 className={`font-black uppercase leading-tight mb-1 truncate text-3xl transition-colors duration-1000 ${isNightMode ? 'text-white' : 'text-slate-900'}`} style={{ transform: 'translateZ(40px)' }}>
                Alex Georgiev
              </h2>
              <p className="font-mono text-gray-500 text-[11px] font-bold tracking-widest uppercase mb-4" style={{ transform: 'translateZ(20px)' }}>
                ID: SLS4X9Q
              </p>
              
              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-2 mt-auto" style={{ transform: 'translateZ(10px)' }}>
                <div className={`p-3 rounded-xl border transition-colors duration-1000 ${isNightMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`block text-[9px] font-black uppercase tracking-widest mb-0.5 ${isNightMode ? 'text-white/40' : 'text-slate-400'}`}>Event</span>
                  <span className={`block text-xs font-black uppercase truncate ${isNightMode ? 'text-white' : 'text-slate-900'}`}>SSF {festivalYear}</span>
                </div>
                <div className={`p-3 rounded-xl border transition-colors duration-1000 ${isNightMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`block text-[9px] font-black uppercase tracking-widest mb-0.5 ${isNightMode ? 'text-white/40' : 'text-slate-400'}`}>Price</span>
                  <span className={`block text-xs font-black uppercase ${isNightMode ? 'text-white' : 'text-slate-900'}`}>€150</span>
                </div>
                <div className={`col-span-2 p-3 rounded-xl border flex justify-between items-center transition-colors duration-1000 ${isNightMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                  <div>
                    <span className={`block text-[9px] font-black uppercase tracking-widest mb-0.5 ${isNightMode ? 'text-white/40' : 'text-slate-400'}`}>Date</span>
                    <span className={`block text-xs font-bold ${isNightMode ? 'text-white' : 'text-slate-900'}`}>1-3 Aug</span>
                  </div>
                  <div className="text-right">
                    <span className={`block text-[9px] font-black uppercase tracking-widest mb-0.5 ${isNightMode ? 'text-white/40' : 'text-slate-400'}`}>Location</span>
                    <span className={`block text-xs font-bold ${isNightMode ? 'text-white' : 'text-slate-900'}`}>Varna, BG</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* THE MAIN PAGE CONTENT (Now with overflow-x-hidden safely contained) */}
      {/* ========================================================= */}
      <main className="min-h-screen font-montserrat overflow-x-hidden relative bg-slate-950 transition-colors duration-1000">
        <Navbar />

        {/* DAY BACKGROUND (Summer / Beach) */}
        <div
          className="fixed inset-0 z-0 transition-opacity duration-1000 ease-in-out pointer-events-none"
          style={{
            opacity: isNightMode ? 0 : 1,
            backgroundImage: `linear-gradient(to bottom, rgba(240, 255, 255, 0.7), rgba(125, 211, 192, 0.5)), url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2000')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* NIGHT BACKGROUND (Salsa / Neon) */}
        <div
          className="fixed inset-0 z-0 transition-opacity duration-1000 ease-in-out pointer-events-none"
          style={{
            opacity: isNightMode ? 1 : 0,
            backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.9), rgba(232, 75, 138, 0.3)), url('https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=2000')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* --- 1. HERO SECTION --- */}
        <section className="relative min-h-[100svh] z-10 flex items-center justify-center pt-24 md:pt-0">
          <div className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center relative z-20">
            
            {/* LEFT SIDE: Content & Controls */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1 pb-20 lg:pb-0 z-20">
              
              {/* THE VIBE SWITCH */}
              <div className="animate-fade-in delay-100 mb-8 flex flex-col items-center lg:items-start gap-3">
                <span className={`text-[10px] font-black uppercase tracking-[0.4em] transition-colors duration-1000 ${isNightMode ? 'text-white/80' : 'text-slate-600'}`}>
                  Choose Your Vibe
                </span>
                
                <div 
                  onClick={() => setIsNightMode(!isNightMode)}
                  className={`w-36 h-14 rounded-full p-1.5 cursor-pointer flex items-center relative transition-all duration-700 shadow-xl backdrop-blur-md border ${
                    isNightMode ? 'bg-slate-900/80 border-salsa-pink/50' : 'bg-white/80 border-white'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-700 transform ${
                    isNightMode ? 'translate-x-20 bg-salsa-pink text-white shadow-[0_0_20px_#e84b8a]' : 'translate-x-0 bg-yellow-400 text-yellow-900 shadow-md'
                  }`}>
                    {isNightMode ? <Moon size={22} /> : <Sun size={22} />}
                  </div>
                  <div className="absolute inset-0 flex justify-between items-center px-5 pointer-events-none">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isNightMode ? 'opacity-0' : 'text-slate-400 ml-8'}`}>Day</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isNightMode ? 'text-white/50 mr-8' : 'opacity-0'}`}>Night</span>
                  </div>
                </div>
              </div>

              {/* MAIN HEADLINE */}
              <h1 className={`animate-fade-in delay-300 font-modak text-[4.5rem] sm:text-6xl md:text-[7.5rem] leading-[0.9] mb-6 uppercase flex flex-col transition-colors duration-1000 ${isNightMode ? 'text-white drop-shadow-2xl' : 'text-slate-900 drop-shadow-md'}`}> 
                <span>SUMMER</span> 
                <span className={`transition-colors duration-1000 ${isNightMode ? 'text-salsa-pink drop-shadow-[0_0_20px_#e84b8a]' : 'text-teal-600'}`}>SALSA</span> 
                <span>FEST</span> 
              </h1> 

              <p className={`animate-fade-in delay-500 max-w-md text-sm md:text-base font-bold mb-10 transition-colors duration-1000 ${isNightMode ? 'text-white/80' : 'text-slate-600'}`}>
                {isNightMode 
                  ? "When the sun goes down, the real party begins. Gala nights, neon lights, and dancing until sunrise." 
                  : "Feel the breeze, dance on the sand, and learn from world champions at our daytime beach socials."}
              </p>

              <div className="animate-fade-in delay-700 flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto"> 
                <Button href="/tickets" variant="primary" size="lg" className={`w-full sm:w-64 shadow-xl transition-all hover:scale-105 ${isNightMode ? 'shadow-salsa-pink/40' : 'shadow-teal-600/20'}`}> 
                  GET YOUR PASS
                </Button> 
              </div> 
            </div> 
            
            {/* RIGHT SIDE: Empty space for the floating fixed ticket to exist */}
            <div className="hidden lg:block h-[600px] w-full order-1 lg:order-2 pointer-events-none"></div>

          </div>

          {/* Diagonal Cut Bottom */}
          <div className="absolute -bottom-[1px] left-0 w-full z-20 leading-[0] transition-colors duration-1000">
            <svg className="w-full h-10 sm:h-16 md:h-24 block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M0,60 C300,120 900,0 1200,60 L1200,120 L0,120 Z" className={`transition-colors duration-1000 ${isNightMode ? 'fill-slate-950' : 'fill-slate-50'}`}></path>
            </svg>
          </div>
        </section>

        {/* --- 2. SPECIALTY CARDS --- */}
        <section id="info" className={`py-20 md:py-32 px-6 max-w-7xl mx-auto relative z-10 transition-colors duration-1000 ${isNightMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
          <div className="text-center mb-14 md:mb-20 md:w-1/2 md:mx-auto md:pr-12">
            <span className={`font-black text-[10px] md:text-[11px] uppercase tracking-[0.4em] transition-colors duration-1000 ${isNightMode ? 'text-salsa-pink' : 'text-teal-600'}`}>Experience</span>
            <h2 className={`font-modak text-5xl md:text-6xl mt-2 transition-colors duration-1000 ${isNightMode ? 'text-white' : 'text-slate-900'}`}>Why Summer Salsa?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            {features.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className={`relative p-8 md:p-10 rounded-[2rem] shadow-xl overflow-hidden hover:-translate-y-2 transition-all duration-500 backdrop-blur-xl border ${
                  isNightMode ? 'bg-slate-900/60 border-white/10 shadow-black/50' : 'bg-white border-slate-100 shadow-slate-200/50'
                }`}>
                  <Icon className={`absolute -bottom-6 -right-6 w-40 h-40 md:w-48 md:h-48 opacity-[0.05] pointer-events-none transition-colors duration-1000 ${isNightMode ? 'text-white' : 'text-slate-900'}`} />
                  <div className="relative z-10">
                    <div className={`mb-6 w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-1000 ${isNightMode ? 'bg-salsa-pink/20 text-salsa-pink' : 'bg-teal-50 text-teal-600'}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className={`font-bold text-xl mb-3 transition-colors duration-1000 ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h3>
                    <p className={`leading-relaxed text-sm transition-colors duration-1000 ${isNightMode ? 'text-white/60' : 'text-slate-500'}`}>{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* --- 3. FESTIVAL GALLERY --- */}
        <section id="gallery" className="py-16 md:py-24 px-4 md:px-6 max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 md:grid-rows-3 gap-3 md:gap-4 h-auto md:h-[1000px]">
            <div className="md:col-span-2 md:row-span-2 rounded-2xl md:rounded-3xl overflow-hidden bg-slate-800 h-64 md:h-auto border border-white/10 group">
              <img src="https://www.doitinparis.com/files/2025/thumbs-1180x525/en/festivals-musique-ete-2025.jpg" className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition duration-700" alt="Salsa" />
            </div>
            <div className="md:col-span-2 rounded-2xl md:rounded-3xl overflow-hidden bg-slate-800 h-48 md:h-auto border border-white/10 group">
              <img src="https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=1000" className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition duration-700" alt="Salsa" />
            </div>
            <div className="rounded-2xl md:rounded-3xl overflow-hidden bg-slate-800 h-48 md:h-auto border border-white/10 group">
              <img src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000" className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition duration-700" alt="Salsa" />
            </div>
            <div className="rounded-2xl md:rounded-3xl overflow-hidden bg-slate-800 h-48 md:h-auto border border-white/10 group">
              <img src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1000" className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition duration-700" alt="Salsa" />
            </div>
            <div className="md:col-span-2 rounded-2xl md:rounded-3xl overflow-hidden bg-slate-800 h-48 md:h-auto border border-white/10 group">
              <img src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1000" className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition duration-700" alt="Salsa" />
            </div>
            <div className="md:col-span-2 rounded-2xl md:rounded-3xl overflow-hidden bg-slate-800 h-48 md:h-auto border border-white/10 group">
              <img src="https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?q=80&w=1000" className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition duration-700" alt="Salsa" />
            </div>
          </div>
        </section>

        {/* --- 4. CTA SLOT --- */}
        <section className={`py-32 md:py-48 px-4 md:px-6 text-center relative z-20 transition-colors duration-1000 ${isNightMode ? 'bg-slate-900' : 'bg-salsa-white'}`}>
          <div className={`relative z-30 max-w-4xl mx-auto p-12 md:p-20 rounded-[3rem] shadow-2xl mt-32 flex flex-col items-center transition-colors duration-1000 backdrop-blur-xl border ${
            isNightMode ? 'bg-slate-950/80 border-t-8 border-salsa-pink/50' : 'bg-white border-t-8 border-teal-500/50'
          }`}>
            <h2 className={`font-modak text-5xl md:text-7xl mb-6 md:mb-8 leading-none transition-colors duration-1000 ${isNightMode ? 'text-white drop-shadow-lg' : 'text-slate-900'}`}>
              SECURE YOUR SPOT
            </h2>
            <p className={`max-w-xl mx-auto mb-10 md:mb-12 text-lg font-medium leading-relaxed px-4 transition-colors duration-1000 ${isNightMode ? 'text-white/80' : 'text-slate-600'}`}>
              The music is playing. The floor is packed. Grab your pass and meet us in Varna.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full pointer-events-auto">
              <Button href="/tickets" variant="primary" size="lg" className="w-full sm:w-72 shadow-xl hover:scale-105">
                CHECKOUT NOW
              </Button>
            </div>
          </div>
        </section>

        <Footer />
        
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; } 
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />
      </main>
    </>
  );
}