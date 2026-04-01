"use client";
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/routing'; 

export default function LanguageSwitcher({ isTransparent }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = () => {
    const nextLocale = locale === 'en' ? 'bg' : 'en';
    // This safely redirects to the exact same page, just in the new language
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <button
      onClick={toggleLanguage}
      aria-label="Toggle Language"
      className={`relative flex items-center p-1 rounded-full border transition-all duration-300 cursor-pointer select-none
        ${isTransparent 
          ? 'border-white/30 bg-black/10 hover:bg-black/20' 
          : 'border-gray-200 bg-gray-100 hover:bg-gray-200'}`}
    >
      {/* Sliding Background Thumb */}
      <div 
        className={`absolute left-1 w-6 h-6 rounded-full transition-transform duration-300 ease-out
          ${isTransparent ? 'bg-white/30 backdrop-blur-sm' : 'bg-white shadow-sm'} 
          ${locale === 'bg' ? 'translate-x-6' : 'translate-x-0'}`}
      />
      
      {/* EN Flag */}
      <span 
        className={`relative z-10 flex items-center justify-center w-6 h-6 text-sm transition-all duration-300 
          ${locale === 'en' ? 'opacity-100 grayscale-0 scale-110 drop-shadow-md' : 'opacity-40 grayscale scale-90'}`}
      >
        🇬🇧
      </span>

      {/* BG Flag */}
      <span 
        className={`relative z-10 flex items-center justify-center w-6 h-6 text-sm transition-all duration-300 
          ${locale === 'bg' ? 'opacity-100 grayscale-0 scale-110 drop-shadow-md' : 'opacity-40 grayscale scale-90'}`}
      >
        🇧🇬
      </span>
    </button>
  );
}