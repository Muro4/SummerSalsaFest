"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function CustomDropdown({ value, options, onChange, icon: Icon, customIcon, buttonClassName, dropdownClassName, disabled, title, hideChevron }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || { label: value, value: value };

  return (
    <div className="relative inline-block font-montserrat w-max" ref={dropdownRef} title={title}>
      <button 
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        // FIX: Removed hover:bg-gray-50 and added physical scaling animation instead
        className={`flex items-center justify-between outline-none transition-all duration-200 cursor-pointer disabled:opacity-100 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate justify-center w-full">
          {customIcon ? customIcon : (Icon && <Icon size={14} className="opacity-50 shrink-0" />)}
          <span className="truncate">{selectedOption.label}</span>
        </div>
        {!hideChevron && <ChevronDown size={14} strokeWidth={3} className={`shrink-0 transition-transform duration-200 ml-2 opacity-50 ${isOpen ? 'rotate-180' : ''}`} />}
      </button>
      
      {isOpen && (
        <div className={`absolute z-50 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 min-w-full right-0 animate-in fade-in slide-in-from-top-2 ${dropdownClassName || ''}`}>
          {options.map((opt) => (
            opt.isPill ? (
              <div key={opt.value} className="px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full px-4 py-2.5 rounded-full text-[10px] uppercase font-black tracking-widest shadow-sm transition-transform hover:scale-105 cursor-pointer flex items-center justify-center whitespace-nowrap ${opt.colorClass}`}
                >
                  {opt.label}
                </button>
              </div>
            ) : (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer text-xs uppercase font-black tracking-widest whitespace-nowrap ${value === opt.value ? 'bg-slate-50 text-slate-900' : (opt.textColor || 'text-slate-500')}`}
              >
                {opt.label}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}