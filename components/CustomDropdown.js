"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function CustomDropdown({ 
  value, 
  options, 
  onChange, 
  icon: Icon, 
  variant = "filter", 
  disabled, 
  title, 
  hideChevron 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || { label: value, value: value };

  const variants = {
    filter: "p-5 px-6 bg-white border border-gray-200 rounded-2xl font-bold text-xs uppercase shadow-sm text-slate-900 hover:border-slate-900",
    compact: "p-2.5 px-6 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase shadow-sm text-slate-900 hover:border-slate-900",
    pill: `w-44 px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-sm border border-transparent justify-center`
  };

  return (
    <div className={`relative inline-block font-montserrat ${variant === 'pill' ? 'w-44' : 'w-full md:w-max'}`} ref={dropdownRef} title={title}>
      <button 
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between outline-none transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 w-full ${variants[variant]} ${variant === 'pill' ? selectedOption.colorClass : ''}`}
      >
        <div className="flex items-center gap-2 truncate justify-center w-full">
          {Icon && <Icon size={14} className="opacity-50 shrink-0" />}
          <span className={`truncate ${variant === 'pill' ? 'w-full text-center' : ''}`}>{selectedOption.label}</span>
        </div>
        {!hideChevron && <ChevronDown size={14} strokeWidth={3} className={`shrink-0 transition-transform duration-200 ml-2 opacity-50 ${isOpen ? 'rotate-180' : ''}`} />}
      </button>
      
      {isOpen && (
        <div className={`absolute z-50 mt-2 bg-white border border-gray-100 shadow-2xl p-1.5 
          ${variant === 'pill' ? 'w-44 rounded-2xl' : 'min-w-full rounded-xl'} 
          right-0 animate-in fade-in slide-in-from-top-2`}
        >
          <div className="flex flex-col gap-1">
            {options.map((opt) => {
              const isActive = value === opt.value;

              if (variant === 'pill') {
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    // Bumped text-[10px] to text-xs
                    className={`w-full flex items-center justify-center py-3 px-2 transition-all duration-200 cursor-pointer text-xs font-black uppercase tracking-widest whitespace-nowrap rounded-full hover:scale-[1.03] shadow-sm ${opt.colorClass || 'bg-gray-100 text-slate-600'}`}
                  >
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              }

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  // Bumped text-[10px] to text-xs
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors cursor-pointer text-xs font-bold uppercase tracking-widest whitespace-nowrap 
                    ${isActive ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}