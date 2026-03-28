import React from 'react';
import Button from './Button'; // Adjust this import based on where your Button component lives

export default function TabNavigation({ tabs, activeTab, setActiveTab }) {
  // 1. Find the index of the current active tab to calculate the sliding pill position
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
  const tabCount = tabs.length || 1;

  return (
    <div 
      className="bg-slate-50 border border-gray-100 p-1.5 rounded-2xl w-full shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] grid relative gap-1 lg:gap-0"
      // Force the grid columns to match the exact number of tabs dynamically
      style={{ gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))` }}
    >
      {/* Dynamic Desktop Sliding Pill */}
      <div
        className="hidden lg:block absolute top-1.5 bottom-1.5 bg-slate-900 rounded-xl transition-all duration-300 ease-out shadow-sm"
        style={{
          width: `calc((100% - 0.75rem) / ${tabCount})`,
          left: `calc(0.375rem + ((100% - 0.75rem) / ${tabCount}) * ${activeIndex})`
        }}
      />

      {/* Render Tabs */}
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <Button 
            key={tab.id}
            variant="ghost" 
            size="sliderTab" 
            icon={tab.icon} 
            onClick={() => setActiveTab(tab.id)} 
            className={`relative z-10 ${
              isActive 
                ? '!text-white bg-slate-900 lg:bg-transparent shadow-sm lg:shadow-none !cursor-default !active:scale-100' 
                : '!text-slate-400 hover:!text-slate-900 lg:hover:bg-transparent transition-colors'
            }`}
          >
            {tab.label}
            {/* Optional Badge (perfect for your Inbox notifications) */}
            {tab.badge > 0 && (
              <span className="bg-salsa-pink text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none font-bold animate-pulse tracking-normal absolute top-1.5 right-2 lg:right-3">
                {tab.badge}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}