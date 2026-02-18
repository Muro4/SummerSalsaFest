"use client";
import { useState } from "react";
import Link from 'next/link';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { 
  Music, Users, Sun, Star, ChevronLeft, 
  ChevronRight, MapPin, Calendar, ArrowRight, PlayCircle 
} from "lucide-react";

export default function Home() {
  const [currentReview, setCurrentReview] = useState(0);

  const reviews = [
    { name: "Maria S.", role: "Professional Dancer", text: "The energy in Varna is unmatched. I&apos;ve been to festivals in Berlin, but the beach workshops here are unique!" },
    { name: "Ivan K.", role: "Salsa Enthusiast", text: "Best organization I&apos;ve seen in years. The group registration made it so easy for our dance school." },
    { name: "Sofia R.", role: "Student", text: "Sunset parties and high-quality workshops. I learned more in 3 days than in 3 months!" },
    { name: "Luca M.", role: "Instructor", text: "A top-tier event. The venue is spectacular and the music is 10/10." },
    { name: "Elena V.", role: "Beginner", text: "I was nervous to start, but the community here is so welcoming. Can&apos;t wait for 2026!" },
  ];

  const nextReview = () => setCurrentReview((prev) => (prev + 1) % (reviews.length - 2));
  const prevReview = () => setCurrentReview((prev) => (prev - 1 + (reviews.length - 2)) % (reviews.length - 2));

  return (
    <main className="min-h-screen bg-white font-montserrat overflow-x-hidden">
      <Navbar />
      
      {/* 1. HERO SECTION */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
  {/* Background Image with Rich Tint and Gradient */}
  <div
  // 1. Changed to 'bg-blend-overlay' and used a slightly lighter slate
  className="absolute inset-0 z-0 bg-slate-800 bg-blend-overlay bg-cover bg-center bg-no-repeat bg-fixed"
  style={{
    // 2. Lightened the gradient: 10% dark at top to 60% dark at bottom
    backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.01) 0%, rgba(0,0,0,0.6) 100%), url('/images/background.png')",
    // 3. A little brightness boost to counteract the slate background
    filter: 'brightness(1.1) contrast(1.1)'
  }}
/>

        {/* Hero Content */}
        <div className="relative z-10 text-salsa-white max-w-6xl mt-12">
          {/* Badge */}
          <span className="bg-salsa-pink/20 text-salsa-pink border border-salsa-pink/30 text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-[0.4em] mb-8 inline-block">
            15th Edition
          </span>

          {/* Main Title (Bebas Neue - Normal Spacing) */}
          <h1 className="font-bebas text-7xl md:text-[8rem] leading-none mb-8 uppercase drop-shadow-lg">
            <b>SUMMER SALSA FEST</b>
          </h1>

          {/* Sub-section: Date & Location */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 mt-12 mb-16">
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

          {/* Hero Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/tickets">
              <button className="bg-salsa-pink text-white font-black px-12 py-5 rounded-xl hover:scale-105 transition-all w-72 tracking-[0.2em] text-xs shadow-xl shadow-salsa-pink/20 uppercase">
                BUY PASS NOW
              </button>
            </Link>
            <button className="border-2 border-white/40 text-white font-black px-12 py-5 rounded-xl hover:bg-white hover:text-black transition-all w-72 tracking-[0.2em] text-xs backdrop-blur-sm uppercase">
              LEARN MORE
            </button>
          </div>
        </div>

        {/* ANIMATED SCROLL INDICATOR */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Scroll</span>
            <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center p-1">
                <div className="w-1 h-2 bg-salsa-pink rounded-full animate-bounce"></div>
            </div>
        </div>
      </section>

      {/* 2. SPECIALTY CARDS (Added spacing as requested) */}
      <section id="info" className="py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <span className="text-salsa-pink font-black text-[10px] uppercase tracking-[0.4em]">Experience</span>
          <h2 className="font-bebas text-6xl text-gray-900 mt-2">Why Summer Salsa?</h2>
          <div className="w-20 h-1.5 bg-salsa-pink mx-auto mt-4 rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { title: "World Class Artists", desc: "Learn from over 50 international champions flying in from Cuba, Spain, and Italy.", icon: <Music className="text-salsa-pink w-10 h-10" /> },
            { title: "Sunrise Beach Parties", desc: "Dance until the sun comes up on the beautiful golden sands of Varna's central beach.", icon: <Sun className="text-salsa-pink w-10 h-10" /> },
            { title: "Inclusive Community", desc: "Whether you are a pro or a beginner, our community welcomes everyone with open arms.", icon: <Users className="text-salsa-pink w-10 h-10" /> }
          ].map((item, i) => (
            <div key={i} className="p-10 bg-salsa-white border border-salsa-mint/20 rounded-[2.5rem] hover:shadow-2xl hover:-translate-y-2 transition-all group">
              <div className="mb-6 group-hover:scale-110 transition-transform">{item.icon}</div>
              <h3 className="font-bold text-2xl mb-4 text-gray-900">{item.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. FESTIVAL GALLERY (Bento Box Expanded) */}
      <section id="gallery" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-4 h-auto md:h-[1000px]">
          <div className="md:col-span-2 md:row-span-2 rounded-3xl overflow-hidden bg-gray-100">
            <img src="https://images.unsplash.com/photo-1524153353073-3ebb8d031426?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 1" />
          </div>
          <div className="md:col-span-2 rounded-3xl overflow-hidden bg-gray-100">
            <img src="https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 2" />
          </div>
          <div className="rounded-3xl overflow-hidden bg-gray-100">
            <img src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 3" />
          </div>
          <div className="rounded-3xl overflow-hidden bg-gray-100">
            <img src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 4" />
          </div>
          <div className="md:col-span-2 rounded-3xl overflow-hidden bg-gray-100">
            <img src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 5" />
          </div>
          <div className="md:col-span-2 rounded-3xl overflow-hidden bg-gray-100">
            <img src="https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?q=80&w=1000" className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition duration-700" alt="Salsa 6" />
          </div>
        </div>
      </section>

      {/* 4. REVIEWS (With arrows and state) */}
      <section className="py-32 bg-slate-950 text-white overflow-hidden relative">
        <div className="px-6 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <span className="text-salsa-pink font-black text-[10px] uppercase tracking-[0.4em]">Testimonials</span>
            <h2 className="font-bebas text-6xl mt-2 uppercase">What Dancers Say</h2>
          </div>
          <div className="flex gap-4">
            <button onClick={prevReview} className="p-4 border border-white/10 rounded-full hover:bg-white/10 transition group">
              <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <button onClick={nextReview} className="p-4 border border-white/10 rounded-full hover:bg-white/10 transition group">
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
        
        <div className="flex gap-8 px-6 max-w-7xl mx-auto">
          {reviews.slice(currentReview, currentReview + 3).map((review, i) => (
            <div key={i} className="flex-1 min-w-[320px] bg-white/5 p-10 rounded-[2.5rem] border border-white/5 backdrop-blur-sm animate-in fade-in slide-in-from-right-10 duration-500">
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, s) => <Star key={s} size={14} className="fill-salsa-pink text-salsa-pink" />)}
              </div>
              <p className="italic text-gray-300 text-lg mb-8 leading-relaxed font-medium">
                &quot;{review.text}&quot;
              </p>
              <div>
                <p className="font-black text-salsa-pink text-sm uppercase tracking-widest">{review.name}</p>
                <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-tighter">{review.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CALL TO ACTION (Mint Background) */}
      <section className="py-32 px-6 text-center bg-salsa-white text-gray-900">
        <h2 className="font-bebas text-7xl md:text-9xl mb-8 leading-none">DON&apos;T MISS OUT!</h2>
        <p className="max-w-xl mx-auto mb-12 text-xl font-medium opacity-80 leading-relaxed">
          Join thousands of dancers from around the world in Varna. Secure your pass today!
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <Link href="/tickets">
            <button className="bg-salsa-pink text-white font-black px-12 py-5 rounded-xl hover:scale-105 transition-all w-72 tracking-widest text-xs uppercase shadow-xl shadow-salsa-pink/20">
              BUY PASS NOW
            </button>
          </Link>
          <button className="border-2 border-gray-900 font-black px-12 py-5 rounded-xl hover:bg-gray-900 hover:text-white transition-all w-72 tracking-widest text-xs uppercase">
            CONTACT US
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}