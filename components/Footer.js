import { MapPin, Phone, Mail, Instagram, Facebook, Twitter } from "lucide-react";
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white pt-20 pb-10 px-6 border-t border-salsa-mint">
      {/* Container wrapper for professional grid alignment */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        
        {/* 1. Logo Section */}
        <div className="space-y-4">
          <Link href="/" className="inline-block">
            <img 
              src="/images/logo.png" 
              alt="Summer Salsa Fest Logo" 
              className="h-12 w-auto object-contain" 
            />
          </Link>
          <p className="text-sm text-gray-800 leading-relaxed">
            The biggest salsa event in the Balkans, celebrating 14 years of dance, sun, and friendship.
          </p>
        </div>

        {/* 2. Navigation - NOW MATCHES NAVBAR STYLE */}
        <div className="space-y-6 md:col-span-1">
          <h4 className="font-bold text-[10px] uppercase tracking-[0.4em] text-gray-400">Navigation</h4>
          <div className="flex flex-col gap-4 text-[10px] font-black text-gray-700 tracking-[0.2em] uppercase">
            <Link href="/" className="hover:text-salsa-pink transition">Home</Link>
            <Link href="/tickets" className="hover:text-salsa-pink transition">Prices</Link>
            <Link href="/info" className="hover:text-salsa-pink transition">Info</Link>
            <Link href="/gallery" className="hover:text-salsa-pink transition">Gallery</Link>
            <Link href="/about" className="hover:text-salsa-pink transition">About Us</Link>
          </div>
        </div>

        {/* 3. Contact Us */}
        <div className="space-y-6">
          <h4 className="font-bold text-[10px] uppercase tracking-[0.4em] text-gray-400">Contact</h4>
          <div className="space-y-3 text-xs font-bold text-gray-700 uppercase tracking-widest">
            <div className="flex items-center gap-3"><MapPin size={16} className="text-salsa-pink" /> Varna, Bulgaria</div>
            <div className="flex items-center gap-3"><Phone size={16} className="text-salsa-pink" /> +359 888 123 456</div>
            <div className="flex items-center gap-3"><Mail size={16} className="text-salsa-pink" /> info@summersalsa.com</div>
          </div>
        </div>

        {/* 4. Follow Us */}
        <div className="space-y-6">
          <h4 className="font-bold text-[10px] uppercase tracking-[0.4em] text-gray-400">Socials</h4>
          <div className="flex gap-4">
            <a href="#" className="p-3 bg-gray-50 rounded-xl hover:bg-salsa-pink hover:text-white transition shadow-sm"><Instagram size={20} /></a>
            <a href="#" className="p-3 bg-gray-50 rounded-xl hover:bg-salsa-pink hover:text-white transition shadow-sm"><Facebook size={20} /></a>
            <a href="#" className="p-3 bg-gray-50 rounded-xl hover:bg-salsa-pink hover:text-white transition shadow-sm"><Twitter size={20} /></a>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto pt-8 border-t border-black/5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
        © 2026 Summer Salsa Fest Varna. All rights reserved.
      </div>
    </footer>
  );
}