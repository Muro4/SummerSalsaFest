"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

// 1. Create the Context
const PopupContext = createContext();

// 2. Create the Provider Component
export function PopupProvider({ children }) {
  const [popup, setPopup] = useState(null); 

  const showPopup = useCallback(({ type = "info", title, message, confirmText = "OK", cancelText = "Cancel", onConfirm = null }) => {
    setPopup({ type, title, message, confirmText, cancelText, onConfirm });
  }, []);

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
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={closePopup}
          ></div>
          
          <div className="relative bg-white w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300 border border-gray-100">
            
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

            <div className="w-full flex gap-3">
              {popup.onConfirm && (
                <button 
                  onClick={closePopup}
                  className="flex-1 bg-gray-50 text-slate-600 font-black py-4 rounded-2xl hover:bg-gray-100 transition-all tracking-widest text-[10px] uppercase"
                >
                  {popup.cancelText}
                </button>
              )}
              
              <button 
                onClick={handleConfirm}
                className={`flex-1 text-white font-black py-4 rounded-2xl hover:scale-105 transition-all tracking-widest text-[10px] uppercase shadow-xl
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

// 3. THIS IS THE LINE IT WAS LOOKING FOR!
// Export a custom hook to easily use this context
export const usePopup = () => useContext(PopupContext);