"use client";
import { useState, useEffect } from "react";
import { getNow, getActiveFestivalYear } from "@/lib/utils";
import { getPriceAtDate } from "@/lib/pricing";
import { Clock, RefreshCw, AlertTriangle, FastForward } from "lucide-react";
import { usePopup } from "@/components/PopupProvider";

export default function DevTab() {
  const [appDate, setAppDate] = useState(new Date().toISOString().split('T')[0]);
  const [isTimeTraveling, setIsTimeTraveling] = useState(false);
  const { showPopup } = usePopup();

  // Load the current app time on mount
  useEffect(() => {
    const currentAppTime = getNow();
    setAppDate(currentAppTime.toISOString().split('T')[0]);
    setIsTimeTraveling(!!localStorage.getItem('dev_mock_date'));
  }, []);

  const handleTimeTravel = () => {
    localStorage.setItem('dev_mock_date', appDate);
    setIsTimeTraveling(true);
    showPopup({ 
      type: "success", 
      title: "Time Machine Active", 
      message: `The app now thinks it is ${appDate}. Refreshing the page to apply changes.`,
      confirmText: "Refresh",
      onConfirm: () => window.location.reload()
    });
  };

  const handleResetTime = () => {
    localStorage.removeItem('dev_mock_date');
    setIsTimeTraveling(false);
    setAppDate(new Date().toISOString().split('T')[0]);
    showPopup({ 
      type: "info", 
      title: "Time Restored", 
      message: "Welcome back to the present. Refreshing the page.",
      confirmText: "Refresh",
      onConfirm: () => window.location.reload()
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
      
      {isTimeTraveling && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-4 text-amber-700">
          <AlertTriangle size={24} className="shrink-0" />
          <div>
            <p className="font-bold text-sm uppercase tracking-widest">Time Machine Active</p>
            <p className="text-xs font-medium">All prices and logic are currently calculating as if it is {appDate}. Real users are not affected.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-8 md:p-12">
        <h2 className="font-bebas text-4xl text-slate-900 uppercase mb-6 flex items-center gap-3">
          <FastForward className="text-salsa-pink" /> The Time Machine
        </h2>
        
        <div className="flex flex-col md:flex-row items-end gap-4 mb-10">
          <div className="w-full md:w-auto space-y-2 flex-grow">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Date</label>
            <input 
              type="date" 
              value={appDate}
              onChange={(e) => setAppDate(e.target.value)}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-slate-900 font-bold text-slate-700"
            />
          </div>
          <button 
            onClick={handleTimeTravel}
            className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-salsa-pink transition-all shadow-md"
          >
            Travel to Date
          </button>
          <button 
            onClick={handleResetTime}
            disabled={!isTimeTraveling}
            className="w-full md:w-auto bg-gray-100 text-slate-600 px-8 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} /> Reset to Real Time
          </button>
        </div>

        {/* Live Preview of System Logic */}
        <div className="border-t border-gray-100 pt-8">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Live System Preview (For Date: {appDate})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Target Festival</p>
              <p className="font-black text-lg text-slate-900">{getActiveFestivalYear()}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Full Pass Price</p>
              <p className="font-black text-lg text-emerald-500">€{getPriceAtDate("Full Pass")}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Party Pass Price</p>
              <p className="font-black text-lg text-emerald-500">€{getPriceAtDate("Party Pass")}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Day Pass Price</p>
              <p className="font-black text-lg text-emerald-500">€{getPriceAtDate("Day Pass")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}