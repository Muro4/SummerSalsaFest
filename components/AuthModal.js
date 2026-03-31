"use client";
import { UserPlus, Mail, X, ShieldCheck } from "lucide-react";
import { Link } from "@/routing"; // THE FIX: Custom routing
import { useTranslations } from 'next-intl';

export default function AuthModal({ isOpen, onClose, onGuestContinue }) {
  const t = useTranslations('AuthModal');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] border-2 border-salsa-mint/30 shadow-2xl p-8 md:p-10 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-salsa-pink transition cursor-pointer"><X size={24} /></button>
        
        <div className="text-center mb-10">
            <h2 className="font-bebas tracking-wide text-5xl text-gray-900 uppercase leading-none">{t('title')}</h2>
            <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.2em] mt-3">{t('subtitle')}</p>
        </div>
        
        <div className="space-y-4">
            {/* Added ?mode=signup to explicitly open the signup tab when clicking from the modal */}
            <Link href="/login?mode=signup" className="flex items-center gap-6 p-6 rounded-[2rem] border-2 border-gray-50 hover:border-salsa-pink hover:bg-salsa-pink/5 transition-all group cursor-pointer">
                <div className="w-12 h-12 bg-salsa-pink/10 rounded-2xl flex items-center justify-center text-salsa-pink group-hover:bg-salsa-pink group-hover:text-white transition-colors shrink-0"><UserPlus size={24} /></div>
                <div className="text-left">
                    <p className="font-black text-xs uppercase tracking-widest text-gray-900">{t('createAccount')}</p>
                    <p className="text-[11px] text-gray-400 font-medium uppercase mt-1 leading-relaxed">{t('createAccountDesc')}</p>
                </div>
            </Link>
            
            <button onClick={onGuestContinue} className="w-full flex items-center gap-6 p-6 rounded-[2rem] border-2 border-gray-50 hover:border-salsa-mint hover:bg-salsa-mint/5 transition-all group text-left cursor-pointer">
                <div className="w-12 h-12 bg-salsa-mint/10 rounded-2xl flex items-center justify-center text-salsa-mint group-hover:bg-salsa-mint group-hover:text-white transition-colors shrink-0"><Mail size={24} /></div>
                <div>
                    <p className="font-black text-xs uppercase tracking-widest text-gray-900">{t('guestCheckout')}</p>
                    <p className="text-[11px] text-gray-400 font-medium uppercase mt-1 leading-relaxed">{t('guestCheckoutDesc')}</p>
                </div>
            </button>
        </div>
      </div>
    </div>
  );
}