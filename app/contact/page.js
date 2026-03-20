"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Mail, Phone, MapPin, Send, CheckCircle, Instagram, Facebook, Loader2 } from "lucide-react";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState(null);
  
  // Real-time email validation state
  const [emailError, setEmailError] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "Tickets",
    message: ""
  });
  
  // Custom subject state for "Other" category
  const [customSubject, setCustomSubject] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // If they had an email error, clear it the moment they fix it
    if (name === "email" && emailError) {
      if (emailRegex.test(value.trim()) || value === "") {
        setEmailError("");
      }
    }
  };

  // Validate exactly when they click out of the email box
  const handleEmailBlur = (e) => {
    const val = e.target.value.trim();
    if (val !== "" && !emailRegex.test(val)) {
      setEmailError("Please enter a valid email address.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic empty check
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError("Please fill out all fields.");
      return;
    }

    // Custom Subject check if "Other" is selected
    if (formData.category === "Other" && !customSubject.trim()) {
      setError("Please provide a subject for your message.");
      return;
    }

    // Strict Email Validation block just in case
    if (!emailRegex.test(formData.email.trim())) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setEmailError("");
    
    try {
      // Determine the final subject header
      const finalSubject = formData.category === "Other" ? customSubject.trim() : formData.category;

      // Save directly to Firestore 
      await addDoc(collection(db, "contact_messages"), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        category: formData.category,
        subject: finalSubject, // The header of the email
        message: formData.message.trim(),
        status: "unread", 
        createdAt: new Date().toISOString()
      });
      
      setIsSent(true);
      setFormData({ name: "", email: "", category: "Tickets", message: "" });
      setCustomSubject("");
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat selection:bg-salsa-pink selection:text-white">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="relative pt-32 sm:pt-40 pb-24 sm:pb-32 px-4 sm:px-6 overflow-hidden bg-slate-900">
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
          <h1 className="animate-fade-in delay-300 font-modak text-6xl sm:text-7xl md:text-9xl text-white leading-none uppercase drop-shadow-2xl">
            GET IN <span className="text-salsa-pink">TOUCH</span>
          </h1>
          <p className="animate-fade-in delay-500 mt-6 md:mt-8 text-white/100 text-sm sm:text-lg md:text-xl font-medium max-w-2xl leading-relaxed mx-auto md:mx-0 px-2 sm:px-0">
            Have a question about your pass, or want to join the team? Drop us a line and we'll get back to you within 24 hours.
          </p>
        </div>
      </section>

      {/* 2. STATIC CONTACT TILES */}
      <section className="relative z-20 -mt-10 sm:-mt-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {[
            { label: "Email Us", val: "info@summersalsa.com", icon: <Mail size={24} />, color: "bg-salsa-mint" },
            { label: "Call Us", val: "+359 888 123 456", icon: <Phone size={24} />, color: "bg-salsa-pink" },
            { label: "Location", val: "Varna Free University", icon: <MapPin size={24} />, color: "bg-slate-900" }
          ].map((item, i) => (
            <div key={i} className="bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col items-center text-center">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 ${item.color} text-white rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-sm`}>
                {item.icon}
              </div>
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1 sm:mb-2">{item.label}</p>
              <p className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">{item.val}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. MAIN FORM SECTION */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 lg:gap-16">
        
        {/* Left Side: Text */}
        <div className="lg:w-1/3 space-y-6 sm:space-y-8 text-center lg:text-left">
          <h2 className="font-bebas text-5xl sm:text-6xl text-slate-900 leading-none">We'd love to <br className="hidden lg:block"/>hear from you</h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium max-w-md mx-auto lg:mx-0">
            Whether you're an artist looking to perform, a dance school interested in group discounts, or a first-timer feeling nervous—we're here to help.
          </p>
          
          <div className="pt-4 sm:pt-8 space-y-4 flex flex-col items-center lg:items-start">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-salsa-pink">Socials</p>
            <div className="flex gap-4">
              <a href="#" className="p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl text-slate-900 shadow-md border border-gray-100 hover:bg-salsa-pink hover:text-white hover:border-salsa-pink transition-colors"><Instagram size={20}/></a>
              <a href="#" className="p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl text-slate-900 shadow-md border border-gray-100 hover:bg-salsa-pink hover:text-white hover:border-salsa-pink transition-colors"><Facebook size={20}/></a>
            </div>
          </div>
        </div>

        {/* Right Side: The Form */}
        <div className="lg:w-2/3 bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-8 md:p-12 shadow-2xl border border-gray-100 relative overflow-hidden">
          {isSent ? (
            <div className="h-[300px] sm:h-[400px] flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={32} className="sm:w-10 sm:h-10" />
              </div>
              <h3 className="font-bebas text-4xl sm:text-5xl text-slate-900">Message Sent!</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium px-4">Thank you for reaching out. We will get back to you shortly.</p>
              <button 
                onClick={() => setIsSent(false)}
                className="mt-8 bg-slate-900 text-white font-black text-[10px] sm:text-[11px] uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-salsa-pink transition-colors"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              
              {error && (
                <div className="p-3 sm:p-4 bg-red-50 text-red-600 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center border border-red-100">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    required 
                    name="name" 
                    type="text" 
                    maxLength={50}
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Your name"
                    className="w-full bg-transparent border border-gray-200 text-slate-900 font-medium rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 outline-none focus:border-slate-900 transition-colors text-sm" 
                  />
                </div>
                
                {/* Email (Now with real-time responsive error) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    required 
                    name="email" 
                    type="email" 
                    maxLength={100}
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleEmailBlur}
                    placeholder="email@example.com"
                    className={`w-full bg-transparent border ${emailError ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-slate-900'} text-slate-900 font-medium rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 outline-none transition-colors text-sm`} 
                  />
                  {emailError && (
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1 animate-in fade-in slide-in-from-top-1">
                      {emailError}
                    </p>
                  )}
                </div>
              </div>

              {/* Category (Radio Buttons) */}
              <div className="space-y-2 sm:space-y-3 pt-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">What's this about?</label>
                {/* Flex-col on mobile, Flex-row on larger screens */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
                  {['Tickets', 'Workshops', 'Media', 'Other'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                      className={`flex-1 py-3 sm:py-3.5 px-2 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all duration-300 border cursor-pointer
                        ${formData.category === cat 
                          ? 'border-salsa-pink bg-salsa-pink text-white shadow-md' 
                          : 'border-gray-200 bg-transparent text-slate-400 hover:border-gray-300 hover:text-slate-600'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Header/Subject for "Other" */}
              {formData.category === "Other" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Subject</label>
                  <input 
                    required 
                    type="text" 
                    maxLength={50}
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="What is this regarding?"
                    className="w-full bg-slate-50 border border-gray-200 text-slate-900 font-medium rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 outline-none focus:border-slate-900 focus:bg-white transition-colors text-sm" 
                  />
                </div>
              )}

              {/* Message (With counter) */}
              <div className="space-y-2 pt-1 sm:pt-2">
                <div className="flex justify-between items-end ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Message</label>
                  <span className={`text-[10px] sm:text-[11px] font-bold ${formData.message.length >= 500 ? 'text-red-500' : 'text-slate-400'}`}>
                    {formData.message.length} / 500
                  </span>
                </div>
                <textarea 
                  required 
                  name="message" 
                  rows="4" 
                  maxLength={500}
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="How can we help you?"
                  className="w-full min-h-[120px] sm:min-h-[150px] max-h-[250px] resize-y bg-transparent border border-gray-200 text-slate-900 font-medium rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 outline-none focus:border-slate-900 transition-colors text-sm leading-relaxed"
                />
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={isSubmitting || emailError}
                className="w-full bg-slate-900 text-white p-4 sm:p-5 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest hover:bg-salsa-pink hover:shadow-lg transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 mt-2 sm:mt-4 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /> Send Message</>}
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}