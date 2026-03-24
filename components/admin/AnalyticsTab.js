"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import Button from "@/components/Button";

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const formatDateDMY = (date) => {
   const d = date.getDate().toString().padStart(2, '0');
   const m = (date.getMonth() + 1).toString().padStart(2, '0');
   const y = date.getFullYear();
   return `${d}.${m}.${y}`;
};

export default function AnalyticsTab({ tickets }) {
   // --- SET TO DAY BY DEFAULT ---
   const [timeRange, setTimeRange] = useState("day"); 
   const [timeOffset, setTimeOffset] = useState(0); 
   const [chartMetric, setChartMetric] = useState("revenue"); 
   const [manualDateInput, setManualDateInput] = useState("");

   // --- CUSTOM CALENDAR STATE ---
   const [showCalendar, setShowCalendar] = useState(false);
   const [calDate, setCalDate] = useState(new Date());

   const getBaseDate = useCallback(() => {
      const d = startOfDay(new Date());
      if (timeRange === 'day') { d.setDate(d.getDate() + timeOffset); } 
      else if (timeRange === 'week') { d.setDate(d.getDate() - (d.getDay() || 7) + 1 + (timeOffset * 7)); } 
      else if (timeRange === 'year') { d.setFullYear(d.getFullYear() + timeOffset); }
      return d;
   }, [timeRange, timeOffset]);

   const getPeriodBounds = useCallback(() => {
      const base = getBaseDate();
      if (timeRange === 'year') { return { start: new Date(base.getFullYear(), 0, 1), end: new Date(base.getFullYear(), 11, 31, 23, 59, 59, 999) }; } 
      else if (timeRange === 'week') { const end = new Date(base); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999); return { start: base, end }; } 
      else { const end = new Date(base); end.setHours(23, 59, 59, 999); return { start: base, end }; }
   }, [timeRange, getBaseDate]);

   const getPeriodLabel = useCallback(() => {
      const base = getBaseDate();
      if (timeRange === 'year') return base.getFullYear().toString();
      if (timeRange === 'week') { const e = new Date(base); e.setDate(e.getDate() + 6); return `${formatDateDMY(base)} - ${formatDateDMY(e)}`; }
      return formatDateDMY(base);
   }, [timeRange, getBaseDate]);

   useEffect(() => { setManualDateInput(getPeriodLabel()); }, [timeRange, timeOffset, getPeriodLabel]);

   const jumpToDate = (targetDate) => {
      if (isNaN(targetDate)) return;
      const now = startOfDay(new Date());
      if (timeRange === 'day') { setTimeOffset(Math.round((targetDate - now) / 86400000)); } 
      else if (timeRange === 'week') {
          const tm = new Date(targetDate); tm.setDate(tm.getDate() - (tm.getDay() || 7) + 1);
          const nm = new Date(now); nm.setDate(nm.getDate() - (nm.getDay() || 7) + 1);
          setTimeOffset(Math.round((tm - nm) / (86400000 * 7)));
      } else if (timeRange === 'year') { setTimeOffset(targetDate.getFullYear() - now.getFullYear()); }
   };

   const handleManualDateSubmit = () => {
      const parts = manualDateInput.split('.');
      if (parts.length === 3) { jumpToDate(new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10))); } 
      else if (parts.length === 1 && manualDateInput.length === 4) { jumpToDate(new Date(parseInt(manualDateInput, 10), 0, 1)); } 
      else { setManualDateInput(getPeriodLabel()); }
   };

   // --- HEATMAP CALENDAR LOGIC ---
   const salesByDate = useMemo(() => {
      const map = {};
      tickets.forEach(t => {
          if (t.status === 'active' || t.status === 'used') {
              const d = new Date(t.purchaseDate);
              if (!isNaN(d)) {
                  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                  map[key] = (map[key] || 0) + 1;
              }
          }
      });
      return map;
   }, [tickets]);

   const getHeatmapColor = (count) => {
      if (!count) return 'bg-slate-50 text-slate-400 hover:bg-slate-200';
      if (count <= 2) return 'bg-salsa-pink/20 text-salsa-pink hover:bg-salsa-pink/30';
      if (count <= 5) return 'bg-salsa-pink/50 text-white hover:bg-salsa-pink/60';
      if (count <= 10) return 'bg-salsa-pink/80 text-white hover:bg-salsa-pink/90';
      return 'bg-salsa-pink text-white shadow-md shadow-salsa-pink/30 hover:bg-[#d03a78]';
   };

   const renderCalendarCells = () => {
      const year = calDate.getFullYear();
      const month = calDate.getMonth();
      const firstDay = new Date(year, month, 1).getDay(); 
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const offset = firstDay === 0 ? 6 : firstDay - 1; 

      const cells = [];
      for (let i = 0; i < offset; i++) cells.push(<div key={`empty-${i}`} className="h-8"></div>);

      for (let d = 1; d <= daysInMonth; d++) {
          const current = new Date(year, month, d);
          const key = `${year}-${month}-${d}`;
          const sales = salesByDate[key] || 0;

          cells.push(
              <button
                 key={d}
                 onClick={() => {
                     jumpToDate(current);
                     setTimeRange('day');
                     setShowCalendar(false);
                 }}
                 className={`h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${getHeatmapColor(sales)}`}
                 title={`${sales} passes sold`}
              >
                 {d}
              </button>
          );
      }
      return cells;
   };

   const bounds = getPeriodBounds();
   const periodTickets = tickets.filter(t => {
      if (t.status !== 'active' && t.status !== 'used') return false;
      const d = new Date(t.purchaseDate);
      return d >= bounds.start && d <= bounds.end;
   });

   const getChartData = () => {
      if (timeRange === 'day') {
         const hours = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);
         const chartData = Object.fromEntries(hours.map(h => [h, 0]));
         periodTickets.forEach(t => { chartData[`${new Date(t.purchaseDate).getHours().toString().padStart(2, '0')}:00`] += chartMetric === 'revenue' ? (t.price || 0) : 1; });
         return hours.map(name => ({ name, value: chartData[name] }));
      }
      if (timeRange === 'week') {
         const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
         const chartData = Object.fromEntries(days.map(d => [d, 0]));
         periodTickets.forEach(t => { let idx = new Date(t.purchaseDate).getDay() - 1; chartData[days[idx === -1 ? 6 : idx]] += chartMetric === 'revenue' ? (t.price || 0) : 1; });
         return days.map(name => ({ name, value: chartData[name] }));
      }
      if (timeRange === 'year') {
         const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
         const chartData = Object.fromEntries(months.map(m => [m, 0]));
         periodTickets.forEach(t => { if (new Date(t.purchaseDate).getFullYear() === getBaseDate().getFullYear()) chartData[months[new Date(t.purchaseDate).getMonth()]] += chartMetric === 'revenue' ? (t.price || 0) : 1; });
         return months.map(name => ({ name, value: chartData[name] }));
      }
      return [];
   };

   const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
         return (
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl font-montserrat border-none text-xs z-50 relative">
               <p className="font-bold mb-1 text-slate-400">{label}</p>
               <p className="font-black text-lg flex items-baseline">
                  {chartMetric === 'revenue' && <span className="font-medium text-sm mr-1">€</span>}
                  {payload[0].value}
                  {chartMetric === 'tickets' && <span className="font-bold text-xs ml-1 text-slate-400 uppercase tracking-widest">Tickets</span>}
               </p>
            </div>
         );
      }
      return null;
   };

   return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
         
         {/* COMPACT TIME CONTROL BAR */}
         <div className="bg-white p-2 rounded-[1.5rem] border border-gray-200 shadow-sm flex flex-col md:flex-row items-center w-full md:w-max gap-2 md:gap-4 mx-0">
            
            <div className="relative grid grid-cols-3 bg-slate-50 border border-gray-100 p-1.5 rounded-xl w-full md:w-[260px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] gap-0">
               <div className="absolute top-1.5 bottom-1.5 bg-slate-900 rounded-[0.7rem] transition-all duration-300 ease-out shadow-sm" style={{ width: 'calc((100% - 0.75rem) / 3)', left: timeRange === 'day' ? '0.375rem' : timeRange === 'week' ? 'calc(0.375rem + (100% - 0.75rem) / 3)' : 'calc(0.375rem + ((100% - 0.75rem) / 3) * 2)' }} />
               {['day', 'week', 'year'].map(r => ( 
                  <Button 
                     key={r} variant="ghost" size="subSliderTab" onClick={() => {setTimeRange(r); setTimeOffset(0);}} 
                     className={`relative z-10 ${timeRange === r ? '!text-white !cursor-default !active:scale-100' : '!text-slate-400 hover:!text-slate-900 transition-colors'}`}
                  >
                     {r}
                  </Button> 
               ))}
            </div>
            
            <div className="hidden md:block w-px h-8 bg-gray-100"></div>

            <div className="flex items-center gap-1 w-full md:w-auto justify-between px-2 relative">
               <button onClick={() => setTimeOffset(p => p - 1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-all cursor-pointer"><ChevronLeft size={16} /></button>
               <div className="relative flex items-center justify-center min-w-[130px] px-1 group">
                  <input type="text" value={manualDateInput} onChange={(e) => setManualDateInput(e.target.value)} onBlur={handleManualDateSubmit} onKeyDown={(e) => e.key === 'Enter' && handleManualDateSubmit()} className="w-full text-center text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none bg-transparent selection:bg-salsa-pink selection:text-white" placeholder="DD.MM.YYYY" />
               </div>
               
               {/* Custom Calendar Toggle */}
               <button onClick={() => { setCalDate(getBaseDate()); setShowCalendar(!showCalendar); }} className={`p-2 rounded-xl transition-all cursor-pointer ${showCalendar ? 'bg-pink-50 text-salsa-pink' : 'text-slate-400 hover:text-salsa-pink hover:bg-pink-50'}`}>
                  <Calendar size={16} />
               </button>

               <button onClick={() => setTimeOffset(p => p + 1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-all cursor-pointer"><ChevronRight size={16} /></button>

               {/* CUSTOM HEATMAP CALENDAR POPUP */}
               {showCalendar && (
                  <>
                     <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)} />
                     <div className="absolute top-full mt-4 right-0 md:left-1/2 md:-translate-x-1/2 w-72 bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-gray-100 z-50 p-5 font-montserrat animate-in fade-in slide-in-from-top-2 duration-200">
                        
                        <div className="flex justify-between items-center mb-5">
                           <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-500"><ChevronLeft size={14}/></button>
                           <span className="font-black text-xs uppercase tracking-widest text-slate-800">
                              {calDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                           </span>
                           <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-500"><ChevronRight size={14}/></button>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                           {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <div key={d} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{d}</div>)}
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1">
                           {renderCalendarCells()}
                        </div>

                        <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                           <span>Less</span>
                           <div className="w-3 h-3 rounded-sm bg-slate-50 border border-gray-100"></div>
                           <div className="w-3 h-3 rounded-sm bg-salsa-pink/20"></div>
                           <div className="w-3 h-3 rounded-sm bg-salsa-pink/50"></div>
                           <div className="w-3 h-3 rounded-sm bg-salsa-pink/80"></div>
                           <div className="w-3 h-3 rounded-sm bg-salsa-pink"></div>
                           <span>More</span>
                        </div>
                     </div>
                  </>
               )}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-[3rem] border border-gray-200 shadow-xl flex flex-col justify-center">
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Total Revenue</p>
               <p className="font-bebas text-5xl xl:text-6xl text-emerald-500 leading-none">€{periodTickets.reduce((a, b) => a + (b.price || 0), 0)}</p>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border border-gray-200 shadow-xl flex flex-col justify-center">
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Tickets Sold</p>
               <p className="font-bebas text-5xl xl:text-6xl text-slate-900 leading-none">{periodTickets.length}</p>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border border-gray-200 shadow-xl flex flex-col justify-center">
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Ticket Breakdown</p>
               <div className="space-y-4 font-montserrat">
                  <div className="flex justify-between items-center"><span className="flex items-center gap-3 text-sm font-bold uppercase text-slate-500"><div className="w-4 h-4 rounded-full bg-salsa-pink"></div> Full Pass</span> <span className="text-slate-900 text-2xl font-black leading-none">{periodTickets.filter(t => t.passType === "Full Pass").length}</span></div>
                  <div className="flex justify-between items-center"><span className="flex items-center gap-3 text-sm font-bold uppercase text-slate-500"><div className="w-4 h-4 rounded-full bg-violet-600"></div> Party Pass</span> <span className="text-slate-900 text-2xl font-black leading-none">{periodTickets.filter(t => t.passType === "Party Pass").length}</span></div>
                  <div className="flex justify-between items-center"><span className="flex items-center gap-3 text-sm font-bold uppercase text-slate-500"><div className="w-4 h-4 rounded-full bg-teal-300"></div> Day Pass</span> <span className="text-slate-900 text-2xl font-black leading-none">{periodTickets.filter(t => t.passType === "Day Pass").length}</span></div>
               </div>
            </div>
         </div>

         <div className="bg-white p-6 md:p-12 rounded-[3rem] md:rounded-[3.5rem] border border-gray-200 shadow-xl relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
               <div>
                  <h2 className="font-bebas text-4xl md:text-5xl text-slate-900 uppercase tracking-tight leading-none">Performance</h2>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-2">Displaying metrics for {getPeriodLabel()}</p>
               </div>
               <div className="relative grid grid-cols-2 bg-slate-50 border border-gray-100 p-1.5 rounded-xl w-full md:w-[240px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] gap-0">
                  <div className="absolute top-1.5 bottom-1.5 bg-slate-900 rounded-[0.7rem] transition-all duration-300 ease-out shadow-sm" style={{ width: 'calc((100% - 0.75rem) / 2)', left: chartMetric === 'revenue' ? '0.375rem' : 'calc(0.375rem + (100% - 0.75rem) / 2)' }} />
                  <Button variant="ghost" size="subSliderTab" onClick={() => setChartMetric('revenue')} className={`relative z-10 ${chartMetric === 'revenue' ? '!text-white !cursor-default !active:scale-100' : '!text-slate-400 hover:!text-slate-900 transition-colors'}`}>Revenue</Button>
                  <Button variant="ghost" size="subSliderTab" onClick={() => setChartMetric('tickets')} className={`relative z-10 ${chartMetric === 'tickets' ? '!text-white !cursor-default !active:scale-100' : '!text-slate-400 hover:!text-slate-900 transition-colors'}`}>Tickets</Button>
               </div>
            </div>

            <div className="w-full overflow-x-auto pb-4">
               <div className="h-[400px] min-w-[800px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={getChartData()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                           <linearGradient id="cs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chartMetric === 'revenue' ? "#10b981" : "#e84b8a"} stopOpacity={0.2} /><stop offset="95%" stopColor={chartMetric === 'revenue' ? "#10b981" : "#e84b8a"} stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8', fontFamily: 'Montserrat' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8', fontFamily: 'Montserrat' }} dx={-10} label={{ value: chartMetric === 'revenue' ? 'Revenue (EUR)' : 'Tickets Sold', angle: -90, position: 'insideLeft', offset: 10, fill: '#94a3b8', dy: -10, fontSize: 10, fontWeight: 700, fontFamily: 'Montserrat' }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }} />
                        <Area type="monotone" dataKey="value" stroke={chartMetric === 'revenue' ? "#10b981" : "#e84b8a"} strokeWidth={4} fill="url(#cs)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>
      </div>
   );
}