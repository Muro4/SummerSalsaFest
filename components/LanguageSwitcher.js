"use client";
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/routing'; // Use our custom routing

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
      className={`px-3 py-1.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all duration-300 cursor-pointer flex items-center gap-2
        ${isTransparent 
          ? 'border-white/30 text-white hover:bg-white hover:text-slate-900' 
          : 'border-gray-200 text-slate-800 hover:border-slate-900'}`}
    >
      <span className={locale === 'en' ? 'opacity-100' : 'opacity-40'}>EN</span>
      <div className="w-px h-3 bg-current opacity-20" />
      <span className={locale === 'bg' ? 'opacity-100' : 'opacity-40'}>BG</span>
    </button>
  );
}