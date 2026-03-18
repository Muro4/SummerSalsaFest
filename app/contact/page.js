"use client";
import { useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import emailjs from '@emailjs/browser';
import { Mail, Phone, MapPin, Send, CheckCircle, MessageSquare, Instagram, Facebook } from "lucide-react";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const formRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await emailjs.sendForm(
        'service_gzmsoie',     // Replace with your Service ID
        'template_dk6x9ef',    // Replace with your Template ID
        formRef.current,
        'uNYV7axQ_HemSanvK'      // Replace with your Public Key
      );
      
      setIsSubmitting(false);
      setIsSent(true);
    } catch (error) {
      console.error("Failed to send email:", error);
      setIsSubmitting(false);
      alert("Something went wrong. Please try again.");
    }
    
    // Simulate a database save or API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat selection:bg-salsa-pink selection:text-white">
      <Navbar />

      {/* 1. HERO SECTION WITH GREEN HUE */}
      <section className="relative pt-40 pb-32 px-6 overflow-hidden bg-slate-900">
        <div 
          className="absolute inset-0 z-0 opacity-60"
          style={{ 
            backgroundImage: `linear-gradient(to bottom, rgba(125, 211, 192, 0.8), rgba(10, 0, 36, 0.9)), url('/images/background.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        />
        
        <div className="relative z-10 max-w-7xl mx-auto text-center md:text-left">
          
          <h1 className="animate-fade-in delay-300 font-modak text-7xl md:text-9xl text-white leading-none uppercase drop-shadow-2xl">
            GET IN <span className="text-salsa-pink">TOUCH</span>
          </h1>
          <p className="animate-fade-in delay-500 mt-8 text-white/100 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
            Have a question about your pass, or want to join the team? Drop us a line and we'll get back to you within 24 hours.
          </p>
        </div>
      </section>

      {/* 2. INTERACTIVE CONTACT TILES */}
      <section className="relative z-20 -mt-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Email Us", val: "info@summersalsa.com", icon: <Mail />, color: "bg-salsa-mint" },
            { label: "Call Us", val: "+359 888 123 456", icon: <Phone />, color: "bg-salsa-pink" },
            { label: "Location", val: "Varna Free University", icon: <MapPin />, color: "bg-slate-900" }
          ].map((item, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col items-center text-center group hover:-translate-y-2 transition-all duration-500">
              <div className={`w-14 h-14 ${item.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                {item.icon}
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">{item.label}</p>
              <p className="font-bold text-slate-900 tracking-tight">{item.val}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. MAIN FORM SECTION */}
      <section className="py-24 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-16">
        
        {/* Left Side: Text */}
        <div className="lg:w-1/3 space-y-8">
          <h2 className="font-bebas text-6xl text-slate-900 leading-none">We'd love to <br/>hear from you</h2>
          <p className="text-slate-700 leading-relaxed font-medium">
            Whether you're an artist looking to perform, a dance school interested in group discounts, or a first-timer feeling nervous—we're here to help.
          </p>
          
          <div className="pt-8 space-y-4">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-salsa-pink">Socials</p>
            <div className="flex gap-4">
              <a href="#" className="p-4 bg-white rounded-2xl text-slate-900 shadow-md hover:bg-salsa-pink hover:text-white transition-all"><Instagram size={24}/></a>
              <a href="#" className="p-4 bg-white rounded-2xl text-slate-900 shadow-md hover:bg-salsa-pink hover:text-white transition-all"><Facebook size={24}/></a>
            </div>
          </div>
        </div>

        {/* Right Side: The Form */}
        <div className="lg:w-2/3 bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-salsa-mint/10 relative overflow-hidden">
          {isSent ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-salsa-mint/20 text-salsa-mint rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={40} />
              </div>
              <h3 className="font-bebas text-5xl text-slate-900">Message Sent!</h3>
              <p className="text-slate-600 mt-2 font-medium">Thank you for reaching out. Check your inbox soon.</p>
              <button 
                onClick={() => setIsSent(false)}
                className="mt-8 text-salsa-pink font-black text-xs uppercase tracking-widest hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-600 ml-2">Full Name</label>
                  <input required name="user_name" type="text" className="w-full bg-gray-50 border border-salsa-mint/40 text-gray-900 font-medium rounded-2xl px-6 py-4 focus:bg-white focus:border-slate-900 focus:shadow-md focus:ring-0 transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-600 ml-2">Email</label>
                  <input required name="user_email" type="email" className="w-full bg-gray-50 border border-salsa-mint/40 text-gray-900 font-medium rounded-2xl px-6 py-4 focus:bg-white focus:border-slate-900 focus:shadow-md focus:ring-0 transition-all outline-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-600 ml-2">What's this about?</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Tickets', 'Workshops', 'Media', 'Other'].map((cat) => (
                    <label key={cat} className="relative cursor-pointer group">
                      <input type="radio" name="category" value={cat} className="peer sr-only" defaultChecked={cat === 'Tickets'} />
                      <div className="text-center py-3 rounded-xl border-2 border-salsa-mint/30 text-xs font-bold text-slate-600 peer-checked:border-salsa-pink peer-checked:text-salsa-pink peer-checked:bg-salsa-pink/5 transition-all">
                        {cat}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-600 ml-2">Your Message</label>
                <textarea required name="message" rows="5" className="w-full bg-gray-50 border border-salsa-mint/40 text-gray-900 font-medium rounded-2xl px-6 py-4 focus:bg-white focus:border-slate-900 focus:shadow-md focus:ring-0 transition-all outline-none resize-none"></textarea>
              </div>

              <button 
                disabled={isSubmitting}
                className="group w-full md:w-auto bg-slate-900 text-white font-black px-10 py-5 rounded-2xl hover:bg-salsa-pink transition-all duration-300 flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="text-xs uppercase tracking-[0.2em]">Send Message</span>
                    <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}