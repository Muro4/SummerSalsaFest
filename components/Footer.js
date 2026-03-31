"use client";
import { MapPin, Phone, Mail, Instagram, Facebook, Twitter } from "lucide-react";
import { Link } from '@/routing'; // THE FIX: Custom routing
import Image from "next/image";
import logoImg from "../assets/logo.png"; 
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('Footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white pt-20 pb-10 px-6 border-t border-salsa-mint font-montserrat select-none">
      {/* 5-Column Grid on Desktop, 2-Column on Tablets, 1-Column on Mobile */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
        
        {/* 1. BIG LOGO */}
        <div className="sm:col-span-2 lg:col-span-1 flex items-center justify-start lg:justify-center">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity w-full">
            <div className="relative h-32 md:h-40 w-full max-w-[200px] drop-shadow-sm">
              <Image 
                src={logoImg} 
                alt={t('logoAlt')} 
                fill
                className="object-contain object-left lg:object-center" 
              />
            </div>
          </Link>
        </div>

        {/* 2. NAVIGATION */}
        <div className="space-y-6">
          <h4 className="font-bold text-[11px] uppercase tracking-[0.4em] text-gray-400">{t('navHeading')}</h4>
          <div className="flex flex-col gap-4 text-[11px] font-black text-gray-700 tracking-[0.2em] uppercase">
            <Link href="/" className="hover:text-salsa-pink transition">{t('navHome')}</Link>
            <Link href="/tickets" className="hover:text-salsa-pink transition">{t('navPrices')}</Link>
            <Link href="/info" className="hover:text-salsa-pink transition">{t('navInfo')}</Link>
            <Link href="/gallery" className="hover:text-salsa-pink transition">{t('navGallery')}</Link>
            <Link href="/about" className="hover:text-salsa-pink transition">{t('navAbout')}</Link>
            <Link href="/contact" className="hover:text-salsa-pink transition">{t('navContact')}</Link>
          </div>
        </div>

        {/* 3. LEGAL */}
        <div className="space-y-6">
          <h4 className="font-bold text-[11px] uppercase tracking-[0.4em] text-gray-400">{t('legalHeading')}</h4>
          <div className="flex flex-col gap-4 text-[11px] font-black text-gray-700 tracking-[0.2em] uppercase">
            <Link href="/privacy" className="hover:text-salsa-pink transition">{t('legalPrivacy')}</Link>
            <Link href="/terms" className="hover:text-salsa-pink transition">{t('legalTerms')}</Link>
            <Link href="/cookies" className="hover:text-salsa-pink transition">{t('legalCookies')}</Link>
          </div>
        </div>

        {/* 4. CONTACT */}
        <div className="space-y-6">
          <h4 className="font-bold text-[11px] uppercase tracking-[0.4em] text-gray-400">{t('contactHeading')}</h4>
          <div className="space-y-4 text-xs font-bold text-gray-700 uppercase tracking-widest">
            <div className="flex items-center gap-3"><MapPin size={16} className="text-salsa-pink shrink-0" /> <span className="truncate">{t('contactLocation')}</span></div>
            <div className="flex items-center gap-3"><Phone size={16} className="text-salsa-pink shrink-0" /> <span className="truncate">+359 888 123 456</span></div>
            <div className="flex items-center gap-3"><Mail size={16} className="text-salsa-pink shrink-0" /> <span className="truncate">info@summersalsa.com</span></div>
          </div>
        </div>

        {/* 5. SOCIALS */}
        <div className="space-y-6">
          <h4 className="font-bold text-[11px] uppercase tracking-[0.4em] text-gray-400">{t('socialsHeading')}</h4>
          <div className="flex gap-4">
            <a href="#" className="p-3 bg-gray-50 rounded-xl hover:bg-salsa-pink hover:text-white transition shadow-sm"><Instagram size={20} /></a>
            <a href="#" className="p-3 bg-gray-50 rounded-xl hover:bg-salsa-pink hover:text-white transition shadow-sm"><Facebook size={20} /></a>
            <a href="#" className="p-3 bg-gray-50 rounded-xl hover:bg-salsa-pink hover:text-white transition shadow-sm"><Twitter size={20} /></a>
          </div>
        </div>

      </div>
      
      {/* COPYRIGHT */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-black/5 text-center text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em]">
        {t('copyright', { year: currentYear })}
      </div>
    </footer>
  );
}