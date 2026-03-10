import { MapPin, Phone, Mail, Instagram, Facebook, Twitter } from "lucide-react";
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white pt-20 pb-10 px-6 border-t border-salsa-mint">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        
        {/* 1. Logo */}
        <div className="space-y-4">
          <Link href="/" className="inline-block">
            <img 
              src="/images/logo.png" 
              alt="Summer Salsa Fest Logo" 
              className="h-20 w-auto object-contain [filter:drop-shadow(1px_1px_1px_#2e0d1d)]" 
            />
          </Link>
          <p className="text-sm text-gray-800 leading-relaxed">
            The biggest salsa event in the Balkans, celebrating 14 years of dance, sun, and friendship.
          </p>
        </div>

        {/* 2. Navigation */}
        <div className="space-y-4">
          <h4 className="font-bold text-sm uppercase tracking-widest text-gray-900">Navigation</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li><Link href="/" className="hover:text-salsa-pink transition font-medium">Home</Link></li>
            <li><Link href="#artists" className="hover:text-salsa-pink transition font-medium">Artists</Link></li>
            <li><Link href="#schedule" className="hover:text-salsa-pink transition font-medium">Schedule</Link></li>
            <li><Link href="#prices" className="hover:text-salsa-pink transition font-medium">Prices</Link></li>
          </ul>
        </div>

        {/* 3. Contact Us */}
        <div className="space-y-4">
          <h4 className="font-bold text-sm uppercase tracking-widest text-gray-900">Contact Us</h4>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-center gap-2 font-medium"><MapPin size={16} /> Varna, Bulgaria</div>
            <div className="flex items-center gap-2 font-medium"><Phone size={16} /> +359 888 123 456</div>
            <div className="flex items-center gap-2 font-medium"><Mail size={16} /> info@summersalsa.com</div>
          </div>
        </div>

        {/* 4. Follow Us */}
        <div className="space-y-4">
          <h4 className="font-bold text-sm uppercase tracking-widest text-gray-900">Follow Us</h4>
          <div className="flex gap-4">
            <a href="#" className="p-2 bg-white/50 rounded-full hover:bg-salsa-pink hover:text-white transition"><Instagram size={20} /></a>
            <a href="#" className="p-2 bg-white/50 rounded-full hover:bg-salsa-pink hover:text-white transition"><Facebook size={20} /></a>
            <a href="#" className="p-2 bg-white/50 rounded-full hover:bg-salsa-pink hover:text-white transition"><Twitter size={20} /></a>
            <a href="#" className="p-2 bg-white/50 rounded-full hover:bg-salsa-pink hover:text-white transition flex items-center justify-center font-bold text-xs">🎵</a>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto pt-8 border-t border-black/10 text-center text-xs text-gray-700">
        © 2025 Summer Salsa Fest Varna. All rights reserved.
      </div>
    </footer>
  );
}