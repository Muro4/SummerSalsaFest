"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useTranslations } from 'next-intl';

// 1. Create the Context
const PopupContext = createContext();

// 2. Create the Provider Component
export function PopupProvider({ children }) {
  const t = useTranslations('Popup');
  const [popup, setPopup] = useState(null); 

  // OPTIMIZATION: Lock body scroll when modal is open (Crucial for mobile UX)
  useEffect(() => {
    if (popup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [popup]);

  const showPopup = useCallback(({ 
    type = "info", 
    title, 
    message, 
    confirmText, 
    cancelText, 
    onConfirm = null 
  }) => {
    setPopup({ 
      type, 
      title, 
      message, 
      // TRANSLATION: Fallback to translated defaults if none are provided
      confirmText: confirmText || t('defaultOk'), 
      cancelText: cancelText || t('defaultCancel'), 
      onConfirm 
    });
  }, [t]);

  const closePopup = () => setPopup(null);

  const handleConfirm = () => {
    if (popup.onConfirm) popup.onConfirm();
    closePopup();
  };

  return (
    <PopupContext.Provider value={{ showPopup }}>
      {children}

      {/* THE GLOBAL POPUP MODAL */}
      {popup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 font-montserrat">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer" 
            onClick={closePopup}
          ></div>
          
          <div className="relative bg-white w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300 border border-gray-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-sm
              ${popup.type === 'error' ? 'bg-red-50 text-red-500' : 
                popup.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 
                'bg-salsa-mint/10 text-salsa-mint'}`}
            >
              {popup.type === 'error' && <AlertCircle size={32} />}
              {popup.type === 'success' && <CheckCircle2 size={32} />}
              {popup.type === 'info' && <Info size={32} />}
            </div>

            <h3 className="font-bebas text-4xl text-slate-900 mb-2 uppercase tracking-wide leading-none">
              {popup.title}
            </h3>
            
            <p className="text-slate-500 font-medium text-xs leading-relaxed mb-8">
              {popup.message}
            </p>

            <div className="w-full flex gap-3 relative z-10">
              {popup.onConfirm && (
                <button 
                  type="button"
                  onClick={closePopup}
                  className="flex-1 bg-gray-50 text-slate-600 font-black py-4 rounded-2xl hover:bg-gray-100 transition-all tracking-widest text-[11px] uppercase cursor-pointer"
                >
                  {popup.cancelText}
                </button>
              )}
              
              <button 
                type="button"
                onClick={handleConfirm}
                className={`flex-1 text-white font-black py-4 rounded-2xl hover:scale-105 transition-all tracking-widest text-[11px] uppercase shadow-xl cursor-pointer
                  ${popup.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-slate-900 hover:bg-salsa-pink shadow-slate-900/20'}`}
              >
                {popup.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  );
}

// 3. Export custom hook
export const usePopup = () => useContext(PopupContext);