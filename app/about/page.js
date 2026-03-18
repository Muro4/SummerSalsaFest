"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Heart, Globe, Users, Award, Calendar, Music, Sparkles } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white font-montserrat selection:bg-salsa-pink selection:text-white overflow-x-hidden">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="relative pt-40 pb-24 px-6 flex flex-col items-center justify-center text-center overflow-hidden bg-slate-900">
        <div 
          className="absolute inset-0 z-0 opacity-30"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=2000')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'grayscale(100%)'
          }}
        />
        
        <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto">
          <span className="animate-fade-in delay-100 bg-salsa-pink/20 text-salsa-pink border border-salsa-pink/30 text-[11px] font-black px-6 py-2 rounded-full uppercase tracking-[0.4em] mb-6 inline-block">
            Behind The Magic
          </span>
          <h1 className="animate-fade-in delay-300 font-modak text-6xl md:text-8xl text-white leading-none uppercase drop-shadow-2xl mb-6">
            OUR <span className="text-salsa-pink">STORY</span>
          </h1>
          <p className="animate-fade-in delay-500 text-white/80 text-lg md:text-xl font-medium leading-relaxed max-w-2xl">
            For 15 years, we've been turning the golden coast of Varna into the ultimate summer dance destination. This is who we are.
          </p>
        </div>

        {/* Diagonal Cut Bottom */}
        <div className="absolute -bottom-1 left-0 w-full overflow-hidden leading-[0]">
          <svg className="relative block w-full h-[40px] md:h-[80px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0 120L1200 120 1200 0 0 1200z" className="fill-white"></path>
          </svg>
        </div>
      </section>

      {/* 2. THE HISTORY (Split Layout) */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-16">
          
          {/* Left: Text Content */}
          <div className="flex-1 space-y-8 animate-fade-in delay-700">
            <div>
              <span className="text-salsa-mint font-black text-[11px] uppercase tracking-[0.4em]">The Beginning</span>
              <h2 className="font-bebas text-5xl md:text-6xl text-gray-900 mt-2">From a beach party to the biggest in the Balkans</h2>
            </div>
            
            <p className="text-gray-600 leading-relaxed font-medium">
              It all started in 2011 with a simple idea: bringing together passionate dancers, world-class music, and the beautiful summer breeze of the Black Sea. What began as a local gathering quickly exploded into an international phenomenon.
            </p>
            <p className="text-gray-600 leading-relaxed font-medium">
              Today, Summer Salsa Fest Varna welcomes thousands of dancers from over 40 countries. We pride ourselves on blending intensive, high-level workshops at the Varna Free University with unforgettable, sunrise beach socials on the golden sands.
            </p>
            
            <div className="flex items-center gap-4 pt-4">
              <div className="w-12 h-1 bg-salsa-pink rounded-full"></div>
              <span className="font-black text-gray-900 uppercase tracking-widest text-sm">Founded in Varna</span>
            </div>
          </div>

          {/* Right: Overlapping Image Composition */}
          <div className="flex-1 relative w-full h-[500px] animate-fade-in delay-900 hidden md:block">
            {/* Back Image */}
            <img 
              src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800" 
              alt="Beach Party" 
              className="absolute top-0 right-0 w-3/4 h-[350px] object-cover rounded-3xl shadow-2xl z-0 grayscale-[20%]"
            />
            {/* Front Image */}
            <img 
              src="https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=800" 
              alt="Salsa Dancing" 
              className="absolute bottom-0 left-0 w-2/3 h-[300px] object-cover rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-10 border-8 border-white"
            />
            {/* Decorative Element */}
            <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-salsa-mint/20 rounded-full blur-2xl z-0"></div>
          </div>
        </div>
      </section>

      {/* 3. BY THE NUMBERS (Stats Banner) */}
      <section className="py-20 bg-salsa-mint text-white relative overflow-hidden">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {[
            { number: "15", label: "Years of Dance", icon: <Calendar size={24} /> },
            { number: "50+", label: "Global Artists", icon: <Globe size={24} /> },
            { number: "10k", label: "Happy Dancers", icon: <Users size={24} /> },
            { number: "72h", label: "Non-stop Party", icon: <Music size={24} /> },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="mb-4 text-salsa-white/80">{stat.icon}</div>
              <h3 className="font-modak text-5xl md:text-7xl drop-shadow-md mb-2">{stat.number}</h3>
              <p className="font-black text-[11px] uppercase tracking-[0.3em] opacity-90">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. OUR VALUES */}
      <section className="py-32 px-6 max-w-7xl mx-auto bg-white">
        <div className="text-center mb-20">
          <span className="text-salsa-pink font-black text-[11px] uppercase tracking-[0.4em]">The Vibe</span>
          <h2 className="font-bebas text-6xl text-gray-900 mt-2">What we stand for</h2>
          <div className="w-20 h-1.5 bg-salsa-pink mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { title: "Pure Inclusivity", icon: <Heart size={32} />, desc: "Whether you've been dancing for 10 years or 10 minutes, you belong here. No egos, just good vibes and open arms." },
            { title: "World-Class Quality", icon: <Award size={32} />, desc: "We don't compromise on the lineup. We bring the undisputed champions of the world directly to Varna to teach and inspire." },
            { title: "Unforgettable Joy", icon: <Sparkles size={32} />, desc: "It’s not just about steps and timing; it's about the feeling. We engineer every party to make you forget the real world." }
          ].map((value, i) => (
            <div key={i} className="bg-salsa-white rounded-[2.5rem] p-10 border border-salsa-mint/20 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm text-salsa-pink group-hover:scale-110 group-hover:bg-salsa-pink group-hover:text-white transition-all duration-300">
                {value.icon}
              </div>
              <h3 className="font-bold text-2xl mb-4 text-gray-900">{value.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{value.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}