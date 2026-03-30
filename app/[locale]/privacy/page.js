"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShieldCheck, Lock, Eye, Cookie } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-salsa-white font-montserrat selection:bg-salsa-pink selection:text-white">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden bg-slate-900">
        <div 
          className="absolute inset-0 z-0 opacity-60"
          style={{ 
            backgroundImage: `linear-gradient(to bottom, rgba(125, 211, 192, 0.8), rgba(10, 0, 36, 0.9)), url('/images/background.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 bg-salsa-pink/20 rounded-full flex items-center justify-center text-salsa-pink mx-auto mb-6 shadow-sm border border-salsa-pink/30">
            <ShieldCheck size={32} />
          </div>
          <h1 className="animate-fade-in font-modak text-6xl md:text-8xl text-white leading-none uppercase drop-shadow-xl">
            PRIVACY <span className="text-salsa-pink">POLICY</span>
          </h1>
          <p className="animate-fade-in mt-6 text-white/90 text-sm md:text-base font-medium tracking-widest uppercase">
            Last Updated: March 2026 • Varna, Bulgaria
          </p>
        </div>
      </section>

      {/* CONTENT SECTION */}
      <section className="relative z-20 -mt-10 px-6 max-w-4xl mx-auto mb-24">
        <div className="bg-white p-8 md:p-14 rounded-[3rem] shadow-2xl border border-gray-100 text-slate-700 leading-relaxed space-y-12">
          
          {/* Introduction */}
          <div>
            <h2 className="font-bebas text-4xl text-slate-900 mb-4 uppercase">1. Introduction</h2>
            <p className="font-medium">
              Welcome to the Summer Salsa Festival. We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website, purchase tickets, or apply to be a Guest Dancer.
            </p>
          </div>

          {/* What We Collect */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="text-salsa-pink" size={24} />
              <h2 className="font-bebas text-4xl text-slate-900 uppercase m-0">2. Information We Collect</h2>
            </div>
            <ul className="space-y-3 font-medium list-disc list-inside ml-4 marker:text-salsa-pink">
              <li><strong>Account Data:</strong> When you register, we collect your name, email address, and securely store your authentication credentials via Google Firebase.</li>
              <li><strong>Transactions:</strong> When you purchase a pass, we record your ticket ID, pass type, and purchase history. (Payment details are handled securely by our payment processors and are not stored on our servers).</li>
              <li><strong>Communications:</strong> Information provided through our Contact Form or Guest Dancer applications (including phone numbers, social handles, and personal pitches).</li>
            </ul>
          </div>

          {/* How We Use It */}
          <div>
            <h2 className="font-bebas text-4xl text-slate-900 mb-4 uppercase">3. How We Use Your Data</h2>
            <p className="font-medium mb-4">We use your information strictly to provide and improve our festival experience:</p>
            <ul className="space-y-3 font-medium list-disc list-inside ml-4 marker:text-salsa-pink">
              <li>To generate, manage, and verify your event tickets.</li>
              <li>To respond to your inquiries and evaluate Guest Dancer applications.</li>
              <li>To send you important updates regarding the festival schedule or your account.</li>
            </ul>
          </div>

          {/* Cookies */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Cookie className="text-salsa-pink" size={24} />
              <h2 className="font-bebas text-4xl text-slate-900 uppercase m-0">4. Cookies & Tracking</h2>
            </div>
            <p className="font-medium mb-4">
              We use local storage and cookies to ensure our website functions properly and to understand how visitors interact with our platform.
            </p>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 space-y-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 block mb-1">Strictly Necessary (Essential)</span>
                <p className="text-sm font-medium text-slate-600">These are required for the website to function (e.g., keeping you logged securely into your account). They cannot be switched off.</p>
              </div>
              <div className="h-px w-full bg-gray-200"></div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 block mb-1">Analytics & Marketing (Optional)</span>
                <p className="text-sm font-medium text-slate-600">If you click "Accept All" on our cookie banner, we load third-party scripts (like Google Analytics and Meta Pixel) to help us measure site traffic and deliver relevant ads. You can opt-out by selecting "Essential Only".</p>
              </div>
            </div>
          </div>

          {/* Security */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="text-salsa-pink" size={24} />
              <h2 className="font-bebas text-4xl text-slate-900 uppercase m-0">5. Data Security</h2>
            </div>
            <p className="font-medium">
              Your security is our priority. Our database is powered by Google Firebase, utilizing industry-standard encryption and strict security rules. Only authorized administrators can access sensitive festival data. We will never sell your personal data to third parties.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h2 className="font-bebas text-4xl text-slate-900 mb-4 uppercase">6. Contact Us</h2>
            <p className="font-medium">
              If you have any questions about this Privacy Policy or wish to request the deletion of your account data, please reach out to us at:
            </p>
            <a href="mailto:info@summersalsa.com" className="inline-block mt-4 text-salsa-pink font-bold hover:underline text-lg">
              info@summersalsa.com
            </a>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}