"use client";
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/routing'; 

export default function LanguageSwitcher({ isTransparent }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = () => {
    const nextLocale = locale === 'en' ? 'bg' : 'en';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <button
      onClick={toggleLanguage}
      aria-label="Toggle Language"
      className={`relative flex items-center w-[76px] h-10 p-1 rounded-full transition-all duration-300 cursor-pointer overflow-hidden outline-none border bg-transparent
        ${isTransparent 
          ? 'border-white/30 hover:border-white/50' 
          : 'border-slate-300 hover:border-slate-400'}`}
    >
      {/* Flex container ensuring perfect vertical and horizontal centering */}
      <div className="relative z-10 flex w-full h-full">
        
        {/* EN / UK Flag */}
        <div className="flex-1 flex justify-center items-center">
          <img 
            src="https://flagcdn.com/gb.svg" 
            alt="EN" 
            className={`rounded-full object-cover transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              locale === 'en' 
                ? 'w-6 h-6 scale-100 opacity-100 drop-shadow-sm' 
                : 'w-5 h-5 scale-90 opacity-40'
            }`} 
          />
        </div>

        {/* BG / Bulgaria Flag */}
        <div className="flex-1 flex justify-center items-center">
          <img 
            src="https://flagcdn.com/bg.svg" 
            alt="BG" 
            className={`rounded-full object-cover transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              locale === 'bg' 
                ? 'w-6 h-6 scale-100 opacity-100 drop-shadow-sm' 
                : 'w-5 h-5 scale-90 opacity-40'
            }`} 
          />
        </div>

      </div>
    </button>
  );
}