"use client";
import React from 'react';
import Button from './Button'; // Adjust this import based on where your Button component lives

export default function TabNavigation({ tabs, activeTab, setActiveTab }) {
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
  const tabCount = tabs.length || 1;

  // --- MOBILE 2D GRID MATH (2 Columns) ---
  const mobileCol = activeIndex % 2;
  const mobileRow = Math.floor(activeIndex / 2);
  const mobileRowCount = Math.ceil(tabCount / 2);

  return (
    <div 
      // Mobile: 2x2 Grid | Desktop: Flex Row
      className="bg-slate-50 border border-gray-100 p-1.5 rounded-2xl w-full shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] grid grid-cols-2 md:flex relative isolate"
    >
      {/* MOBILE SLIDING PILL (Moves in X and Y) */}
      <div
        className="md:hidden absolute bg-slate-900 rounded-xl transition-all duration-300 ease-out shadow-sm z-0"
        style={{
          width: 'calc(50% - 6px)', // Half width minus padding
          height: `calc((100% - 12px) / ${mobileRowCount})`, // Dynamic row height
          left: mobileCol === 0 ? '6px' : '50%',
          top: `calc(6px + ((100% - 12px) / ${mobileRowCount}) * ${mobileRow})`
        }}
      />

      {/* DESKTOP SLIDING PILL (Moves in X only) */}
      <div
        className="hidden md:block absolute top-1.5 bottom-1.5 bg-slate-900 rounded-xl transition-all duration-300 ease-out shadow-sm z-0"
        style={{
          width: `calc((100% - 12px) / ${tabCount})`,
          left: `calc(6px + ((100% - 12px) / ${tabCount}) * ${activeIndex})`
        }}
      />

      {/* Render Tabs */}
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        
        return (
          <Button 
            key={tab.id}
            variant="ghost" 
            size="sliderTab" 
            icon={tab.icon} 
            onClick={() => setActiveTab(tab.id)} 
            className={`relative z-10 w-full md:flex-1 py-3.5 md:py-3 flex items-center justify-center gap-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-colors duration-300 !bg-transparent !shadow-none ${
              isActive 
                ? '!text-white !cursor-default !active:scale-100' 
                : '!text-slate-400 hover:!text-slate-900'
            }`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className="bg-salsa-pink text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none font-bold animate-pulse tracking-normal absolute top-1.5 md:top-2 right-2 lg:right-3 shadow-sm">
                {tab.badge}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}