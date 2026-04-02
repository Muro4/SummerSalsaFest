"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { getNow, getActiveFestivalYear } from "@/lib/utils";
import { getPriceAtDate } from "@/lib/pricing";
import { 
  Clock, RefreshCw, AlertTriangle, FastForward, ShieldAlert, 
  CreditCard, Power, Loader2, ChevronLeft, ChevronRight, 
  Activity, CheckCircle2, XCircle, AlertCircle 
} from "lucide-react";
import { usePopup } from "@/components/PopupProvider";

export default function DevTab() {
  const [appDate, setAppDate] = useState("");
  const [calDate, setCalDate] = useState(new Date()); 
  const [isTimeTraveling, setIsTimeTraveling] = useState(false);
  const { showPopup } = usePopup();

  // --- SYSTEM SETTINGS STATE ---
  const [system, setSystem] = useState(null);
  const [sysLoading, setSysLoading] = useState(true);

  // --- DIAGNOSTICS STATE ---
  const [healthStatus, setHealthStatus] = useState(null);
  const [runningTests, setRunningTests] = useState(false);

  // 1. Time Machine Logic
  useEffect(() => {
    const currentAppTime = getNow();
    setAppDate(currentAppTime.toISOString().split('T')[0]);
    setCalDate(currentAppTime);
    setIsTimeTraveling(!!localStorage.getItem('dev_mock_date'));
  }, []);

  const handleTimeTravel = () => {
    localStorage.setItem('dev_mock_date', appDate);
    setIsTimeTraveling(true);
    showPopup({ type: "success", title: "Time Machine Active", message: `The app now thinks it is ${appDate}.`, confirmText: "Refresh", onConfirm: () => window.location.reload() });
  };

  const handleResetTime = () => {
    localStorage.removeItem('dev_mock_date');
    setIsTimeTraveling(false);
    const now = new Date();
    setAppDate(now.toISOString().split('T')[0]);
    setCalDate(now);
    showPopup({ type: "info", title: "Time Restored", message: "Welcome back to the present.", confirmText: "Refresh", onConfirm: () => window.location.reload() });
  };

  // 2. Global System Settings Logic (Real-time Firestore)
  useEffect(() => {
    const sysRef = doc(db, "settings", "system");
    const unsub = onSnapshot(
      sysRef, 
      (snap) => {
        if (snap.exists()) {
          setSystem(snap.data());
        } else {
          setSystem({ salesEnabled: true, stripeMode: 'test' });
        }
        setSysLoading(false);
      },
      (error) => {
        console.error("Settings Permission Error:", error.message);
        setSystem({ salesEnabled: true, stripeMode: 'test' });
        setSysLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const toggleSales = async () => {
    const newState = !system.salesEnabled;
    const action = newState ? "Enable" : "Disable";
    
    showPopup({
      type: newState ? "info" : "danger",
      title: `${action} Sales?`,
      message: newState ? "Users will be able to buy tickets again." : "This will instantly block all users from purchasing tickets.",
      confirmText: `Yes, ${action}`,
      cancelText: "Cancel",
      onConfirm: async () => {
        await setDoc(doc(db, "settings", "system"), { salesEnabled: newState }, { merge: true });
        showPopup({ type: "success", title: "System Updated", message: `Sales are now ${newState ? 'ONLINE' : 'PAUSED'}.` });
      }
    });
  };

  const toggleStripeMode = async (mode) => {
    if (system.salesEnabled) {
      showPopup({ type: "error", title: "Action Blocked", message: "You must disable ticket sales (Kill Switch) before changing the Stripe environment." });
      return;
    }
    await setDoc(doc(db, "settings", "system"), { stripeMode: mode }, { merge: true });
  };

  // 3. Live Diagnostics Logic
  const runDiagnostics = async () => {
    setRunningTests(true);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const res = await fetch("/api/health", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setHealthStatus(data);
      if (data.success) {
        showPopup({ type: "success", title: "All Systems Go", message: "Live infrastructure tests passed." });
      } else {
        showPopup({ type: "error", title: "Diagnostic Failure", message: "One or more critical systems failed. Check the panel." });
      }
    } catch (err) {
      showPopup({ type: "error", title: "Network Error", message: "Could not reach diagnostic server." });
    } finally {
      setRunningTests(false);
    }
  };

  // --- CUSTOM INLINE CALENDAR LOGIC ---
  const renderCalendarCells = () => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1; 

    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(<div key={`empty-${i}`} className="h-8"></div>);

    for (let d = 1; d <= daysInMonth; d++) {
        const currentStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isSelected = appDate === currentStr;

        cells.push(
            <button
               key={d}
               onClick={() => setAppDate(currentStr)}
               className={`cursor-pointer h-8 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all 
               ${isSelected ? 'bg-slate-900 text-white shadow-md scale-110 z-10' : 'bg-white border border-gray-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
            >
               {d}
            </button>
        );
    }
    return cells;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10 font-montserrat pb-20">
      
      {isTimeTraveling && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-4 text-amber-700 shadow-sm animate-pulse">
          <AlertTriangle size={24} className="shrink-0" />
          <div>
            <p className="font-bold text-sm uppercase tracking-widest">Time Machine Active</p>
            <p className="text-xs font-medium">Logic is currently calculating as if it is {appDate}.</p>
          </div>
        </div>
      )}

      {sysLoading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-salsa-pink" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* --- 1. SYSTEM OPERATION CONTROLS --- */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h2 className="font-bebas text-3xl text-slate-900 uppercase leading-none">System Operations</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mission Critical Controls</p>
              </div>
            </div>

            {/* Global Kill Switch */}
            <div className={`p-5 rounded-2xl border-2 transition-colors flex items-center justify-between ${system.salesEnabled ? 'border-emerald-100 bg-emerald-50/30' : 'border-red-200 bg-red-50'}`}>
              <div>
                <p className={`font-black uppercase tracking-widest text-sm ${system.salesEnabled ? 'text-emerald-600' : 'text-red-600'}`}>
                  Ticket Sales: {system.salesEnabled ? 'ONLINE' : 'PAUSED'}
                </p>
                <p className={`text-[10px] font-bold mt-1 ${system.salesEnabled ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                  {system.salesEnabled ? 'Users can browse and checkout normally.' : 'All checkouts are currently blocked globally.'}
                </p>
              </div>
              <button onClick={toggleSales} className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${system.salesEnabled ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-red-500 shadow-red-500/30 animate-pulse'}`}>
                <Power size={24} />
              </button>
            </div>

            {/* Stripe Environment Toggle */}
            <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50 flex flex-col gap-3 h-full justify-end">
              <div className="flex items-center justify-between">
                <p className="font-black uppercase tracking-widest text-sm text-slate-700 flex items-center gap-2">
                  <CreditCard size={16} /> Stripe Environment
                </p>
                {system.salesEnabled && <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded">Locked</span>}
              </div>
              
              <div className="flex bg-gray-200/50 p-1 rounded-xl relative">
                <button 
                  onClick={() => toggleStripeMode('test')}
                  disabled={system.salesEnabled}
                  className={`flex-1 py-3.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${system.stripeMode === 'test' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'} ${system.salesEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  Sandbox (Test)
                </button>
                <button 
                  onClick={() => toggleStripeMode('live')}
                  disabled={system.salesEnabled}
                  className={`flex-1 py-3.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${system.stripeMode === 'live' ? 'bg-salsa-pink text-white shadow-md' : 'text-slate-400'} ${system.salesEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-slate-700'}`}
                >
                  Live (Production)
                </button>
              </div>
            </div>
          </div>

          {/* --- 2. TIME MACHINE WITH INLINE CALENDAR --- */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-salsa-pink/10 text-salsa-pink flex items-center justify-center shrink-0">
                <FastForward size={20} />
              </div>
              <div>
                <h2 className="font-bebas text-3xl text-slate-900 uppercase leading-none">Time Machine</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Simulate Future Pricing</p>
              </div>
            </div>
            
            <div className="flex flex-col xl:flex-row gap-6 h-full">
              {/* Inline Calendar */}
              <div className="w-full xl:w-[260px] shrink-0 bg-slate-50 rounded-2xl p-4 border border-gray-100 shadow-inner">
                 <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-slate-500 transition-all cursor-pointer"><ChevronLeft size={16}/></button>
                    <span className="font-black text-[11px] uppercase tracking-widest text-slate-800">
                       {calDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-slate-500 transition-all cursor-pointer"><ChevronRight size={16}/></button>
                 </div>
                 <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <div key={d} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{d}</div>)}
                 </div>
                 <div className="grid grid-cols-7 gap-1">
                    {renderCalendarCells()}
                 </div>
              </div>

              {/* Live Preview & Buttons */}
              <div className="flex-1 flex flex-col justify-between gap-6">
                 <div>
                    <div className="flex items-center justify-between mb-3">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                         <Clock size={14} className="text-salsa-pink"/> Preview for {appDate}
                       </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Target Festival</p>
                        <p className="font-black text-lg text-slate-900 leading-none">SSF {getActiveFestivalYear()}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Full Pass</p>
                        <p className="font-black text-lg text-emerald-500 leading-none">€{getPriceAtDate("Full Pass")}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Party Pass</p>
                        <p className="font-black text-lg text-emerald-500 leading-none">€{getPriceAtDate("Party Pass")}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Day Pass</p>
                        <p className="font-black text-lg text-emerald-500 leading-none">€{getPriceAtDate("Day Pass")}</p>
                      </div>
                    </div>
                 </div>

                 <div className="flex gap-2 mt-auto">
                    <button onClick={handleTimeTravel} className="flex-1 bg-slate-900 text-white px-5 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-salsa-pink transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2">
                      <FastForward size={14}/> Travel
                    </button>
                    <button onClick={handleResetTime} disabled={!isTimeTraveling} className="bg-gray-100 text-slate-600 px-5 py-3.5 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center" title="Reset to Present">
                      <RefreshCw size={16} />
                    </button>
                 </div>
              </div>
            </div>
          </div>

          {/* --- 3. LIVE DIAGNOSTICS & TESTS (FULL WIDTH) --- */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 flex flex-col lg:col-span-2">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 shrink-0 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                  <Activity size={20} />
                </div>
                <div>
                  <h2 className="font-bebas text-3xl text-slate-900 uppercase leading-none">System Diagnostics</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Infrastructure Tests</p>
                </div>
              </div>
              <button 
                onClick={runDiagnostics} 
                disabled={runningTests}
                className="w-full md:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {runningTests ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Run Tests
              </button>
            </div>

            <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
              {!healthStatus ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-50 py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                  <Activity size={32} className="mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">Awaiting execution</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(healthStatus.results).map(([key, result]) => (
                    <div key={key} className={`flex items-center justify-between p-4 rounded-xl border ${
                      result.status === 'pass' ? 'bg-emerald-50/50 border-emerald-100' : 
                      result.status === 'warn' ? 'bg-amber-50/50 border-amber-100' : 
                      'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">{key}</span>
                        <span className={`text-[10px] font-bold ${
                          result.status === 'pass' ? 'text-emerald-600' : 
                          result.status === 'warn' ? 'text-amber-600' : 'text-red-600'
                        }`}>{result.message}</span>
                      </div>
                      {result.status === 'pass' ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> : 
                       result.status === 'warn' ? <AlertCircle size={18} className="text-amber-500 shrink-0" /> : 
                       <XCircle size={18} className="text-red-500 shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}