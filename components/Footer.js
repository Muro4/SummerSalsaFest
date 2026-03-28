import { MapPin, Phone, Mail, Instagram, Facebook, Twitter } from "lucide-react";
import Link from 'next/link';
import Image from "next/image";
import logoImg from "../assets/logo.png"; 

export default function Footer() {
  return (
    <footer className="bg-white pt-20 pb-10 px-6 border-t border-salsa-mint font-montserrat">
      {/* 5-Column Grid on Desktop, 2-Column on Tablets, 1-Column on Mobile */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
        
        {/* 1. BIG LOGO */}
        <div className="sm:col-span-2 lg:col-span-1 flex items-center justify-start lg:justify-center">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity w-full">
            {/* The logo is now massive and fills the available column space */}
            <div className="relative h-32 md:h-40 w-full max-w-[200px] drop-shadow-sm">
              <Image 
                src={logoImg} 
                alt="Summer Salsa Fest Logo" 
                fill
                className="object-contain object-left lg:object-center" 
              />
            </div>
          </Link>
        </div>

        {/* 2. NAVIGATION */}
        <div className="space-y-6">
          <h4 className="font-bold text-[11px] uppercase tracking-[0.4em] text-gray-400">Navigation</h4>
          <div className="flex flex-col gap-4 text-[11px] font-black text-gray-700 tracking-[0.2em] uppercase">
            <Link href="/" className="hover:text-salsa-pink transition">Home</Link>
            <Link href="/tickets" className="hover:text-salsa-pink transition">Prices</Link>
            <Link href="/info" className="hover:text-salsa-pink transition">Info</Link>
            <Link href="/gallery" className="hover:text-salsa-pink transition">Gallery</Link>
            <Link href="/about" className="hover:text-salsa-pink transition">About Us</Link>
            <Link href="/contact" className="hover:text-salsa-pink transition">Contact Us</Link>
          </div>
        </div>
        <div className="space-y-6">
          <h4 className="font-bold text-[11px] uppercase tracking-[0.4em] text-gray-400">Legal</h4>
          <div className="flex flex-col gap-4 text-[11px] font-black text-gray-700 tracking-[0.2em] uppercase">
            <Link href="/privacy" className="hover:text-salsa-pink transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-salsa-pink transition">User Agreement</Link>
            <Link href="/cookies" className="hover:text-salsa-pink transition">Cookie Policy</Link>
          </div>
        </div>

        {/* 3. CONTACT */}
        <div className="space-y-6">
          <h4 className="font-bold text-[11px] uppercase tracking-[0.4em] text-gray-400">Contact</h4>
          <div className="space-y-4 text-xs font-bold text-gray-700 uppercase tracking-widest">
            <div className="flex items-center gap-3"><MapPin size={16} className="text-salsa-pink" /> Varna, BG</div>
            <div className="flex items-center gap-3"><Phone size={16} className="text-salsa-pink" /> +359 888 123 456</div>
            <div className="flex items-center gap-3"><Mail size={16} className="text-salsa-pink" /> info@summersalsa</div>
          </div>
        </div>

        {/* 4. SOCIALS */}
        <div className="space-y-6">
          <h4 className="font-bold text-[11px] uppercase tracking-[0.4em] text-gray-400">Socials</h4>
          <div className="flex gap-4">
            <a href="#" className="p-3 bg-gray-50 rounded-xl hover:bg-salsa-pink hover:text-white transition shadow-sm"><Instagram size={20} /></a>
            <a href="#" className="p-3 bg-gray-50 rounded-xl hover:bg-salsa-pink hover:text-white transition shadow-sm"><Facebook size={20} /></a>
            <a href="#" className="p-3 bg-gray-50 rounded-xl hover:bg-salsa-pink hover:text-white transition shadow-sm"><Twitter size={20} /></a>
          </div>
        </div>

        {/* 5. PRIVACY POLICY & LEGAL */}
        

      </div>
      
      <div className="max-w-7xl mx-auto pt-8 border-t border-black/5 text-center text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em]">
        © {new Date().getFullYear()} Summer Salsa Fest Varna. All rights reserved.
      </div>
    </footer>
  );
}