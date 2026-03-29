"use client";
import { useState } from "react";
import { Search, Filter, Ticket, Calendar, CheckCircle, Clock, Mail, Eye } from "lucide-react";
import CustomDropdown from "@/components/CustomDropdown";
import { EVENT_YEARS } from "@/lib/constants";

const getPassBgColor = (type) => {
   const t = (type || '').toLowerCase();
   if (t.includes('full')) return 'bg-salsa-pink';
   if (t.includes('party')) return 'bg-violet-600';
   if (t.includes('day')) return 'bg-teal-300';
   if (t.includes('free')) return 'bg-yellow-400';
   return 'bg-gray-200';
};
const getPassTextColor = (type) => {
   const t = (type || '').toLowerCase();
   if (t.includes('day')) return 'text-teal-950';
   if (t.includes('free')) return 'text-yellow-900';
   if (t.includes('full') || t.includes('party')) return 'text-white';
   return 'text-slate-900';
};
const getPassStyle = (type) => `${getPassBgColor(type)} ${getPassTextColor(type)} border-transparent`;

export default function HistoryTab({ paidTickets, setFullScreenTicket, selectedYear, setSelectedYear }) {
   const [searchQuery, setSearchQuery] = useState("");
   const [passFilter, setPassFilter] = useState("All");

   const filteredHistory = paidTickets.filter(t => {
      const matchesYear = t.festivalYear?.toString() === selectedYear;
      const matchesSearch = (t.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || t.ticketID?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPass = passFilter === "All" || (t.passType || "").toLowerCase() === passFilter.toLowerCase();
      return matchesYear && matchesSearch && matchesPass;
   });

   const totalPaidRevenue = filteredHistory.reduce((acc, ticket) => acc + (ticket.price || 0), 0);

   return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
         
         {/* SEARCH & FILTERS */}
         <div className="flex flex-col xl:flex-row gap-4 mb-8 w-full relative z-40 px-0">
            <div className="relative flex-grow group w-full">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
               <input 
                  type="text" 
                  maxLength={50} 
                  placeholder="SEARCH PAID NAMES OR IDs..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="w-full p-5 pl-14 bg-white border border-gray-200 rounded-2xl font-bold text-xs uppercase outline-none focus:border-slate-900 transition-all font-montserrat text-slate-900 shadow-sm" 
               />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto shrink-0">
               <div className="relative w-full sm:w-auto z-40">
                  <CustomDropdown 
                     value={passFilter} 
                     onChange={setPassFilter} 
                     icon={Ticket} 
                     options={[
                        { label: 'All Passes', value: 'All', isPill: true, colorClass: getPassStyle('All') }, 
                        { label: 'Full Pass', value: 'Full Pass', isPill: true, colorClass: getPassStyle('Full Pass') }, 
                        { label: 'Party Pass', value: 'Party Pass', isPill: true, colorClass: getPassStyle('Party Pass') }, 
                        { label: 'Day Pass', value: 'Day Pass', isPill: true, colorClass: getPassStyle('Day Pass') }, 
                        { label: 'Free Pass', value: 'Free Pass', isPill: true, colorClass: getPassStyle('Free Pass') }
                     ]} 
                     variant="filter" 
                  />
               </div>
               <div className="relative w-full sm:w-auto z-30">
                  <CustomDropdown icon={Calendar} value={selectedYear} onChange={setSelectedYear} options={EVENT_YEARS} variant="filter"/>
               </div>
            </div>
         </div>

         {/* DATA CONTAINER */}
         <div className="bg-white rounded-[3rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col relative z-10">
            
            <div className="p-8 md:p-10 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 shrink-0 gap-6 rounded-t-[3rem]">
               <div>
                  <h2 className="font-bebas text-4xl text-slate-900 uppercase tracking-wide">Paid Roster</h2>
                  <p className="text-xs font-medium text-slate-500 mt-1 font-montserrat">Confirmed attendees. Click any row to view and send the ticket.</p>
               </div>
               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2">
                     <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat">Registered:</span>
                     <span className="font-bebas text-4xl leading-none text-slate-900">{filteredHistory.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat">Total Paid:</span>
                     <span className="font-bebas text-4xl leading-none text-emerald-500">€{totalPaidRevenue}</span>
                  </div>
               </div>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block overflow-x-auto w-full flex-grow pb-40">
               <table className="w-full text-left border-separate border-spacing-0 min-w-[950px] font-montserrat relative">
                  <thead className="bg-white text-[11px] font-bold uppercase text-slate-400 tracking-widest relative z-10">
                     <tr>
                        <th className="p-6 pl-10 font-bold w-1/3 border-b border-gray-100">Attendee Name</th>
                        <th className="p-6 font-bold text-center w-48 border-b border-gray-100">Pass Type</th>
                        <th className="p-6 font-bold text-right w-32 border-b border-gray-100">Price</th>
                        <th className="p-6 pl-16 font-bold text-center w-56 border-b border-gray-100">Emailed</th>
                        <th className="p-6 pr-10 text-right font-bold w-40 border-b border-gray-100">Status</th>
                     </tr>
                  </thead>
                  <tbody className="uppercase text-xs font-bold text-slate-900">
                     {filteredHistory.map((t, i) => (
                        <tr key={t.id} onClick={() => setFullScreenTicket(t)} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                           <td className="p-6 pl-10 align-middle border-b border-gray-50 max-w-[300px] xl:max-w-[400px]">
                              <div className="flex items-center gap-4 h-full mt-1">
                                 <span className="text-[11px] font-black text-slate-400 w-6 text-right group-hover:text-salsa-pink transition-colors shrink-0">{i + 1}.</span>
                                 <div className="min-w-0 flex-1">
                                    <span title={t.userName} className="block text-base font-bold font-montserrat text-slate-700 tracking-wide group-hover:text-salsa-pink transition-colors leading-tight truncate">{t.userName}</span>
                                 </div>
                              </div>
                           </td>
                           <td className="p-6 align-middle text-center border-b border-gray-50">
                              <span className={`inline-flex items-center justify-center w-32 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${getPassStyle(t.passType)}`}>
                                 {t.passType}
                              </span>
                           </td>
                           <td className="p-6 text-base font-montserrat font-bold text-slate-700 tracking-wide text-right align-middle border-b border-gray-50">€{t.price}</td>
                           <td className="p-6 pl-16 text-center align-middle font-montserrat border-b border-gray-50">
                              <div className="flex items-center justify-center h-full mt-1">
                                 {t.emailSentCount > 0 ? (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-md tracking-widest"><Mail size={12} /> {t.emailSentCount}</span>
                                 ) : (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-300 px-3 py-1.5 tracking-widest"><Mail size={12} /> 0</span>
                                 )}
                              </div>
                           </td>
                           <td className="p-6 pr-10 align-middle font-montserrat border-b border-gray-50">
                              <div className="flex items-center justify-end gap-4 h-full mt-1">
                                 <div className={`flex items-center gap-1.5 text-[11px] font-black tracking-widest uppercase ${t.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {t.status === 'active' ? <CheckCircle size={14} /> : <Clock size={14} />} {t.status}
                                 </div>
                                 <div className="bg-white p-2 rounded-xl text-slate-400 group-hover:bg-salsa-pink group-hover:text-white transition-all duration-300 shadow-sm border border-gray-200 group-hover:border-salsa-pink group-hover:scale-110" title="View Ticket">
                                    <Eye size={16} />
                                 </div>
                              </div>
                           </td>
                        </tr>
                     ))}
                     {filteredHistory.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest font-montserrat border-b border-gray-50">No paid attendees found. Try clearing filters.</td></tr>}
                  </tbody>
               </table>
            </div>

            {/* ==============================================
                MOBILE VIEW: CARDS (Visible only on small screens)
                ============================================== */}
            <div className="lg:hidden flex flex-col gap-4 p-4 bg-slate-50 border-t border-gray-100 flex-grow pb-24">
               {filteredHistory.map((t) => (
                  <div key={t.id} onClick={() => setFullScreenTicket(t)} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3 relative cursor-pointer hover:ring-2 ring-salsa-pink/50 transition-all">
                     
                     {/* Header Info */}
                     <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0 pr-2">
                           <span title={t.userName} className="block text-lg font-black font-montserrat text-slate-900 uppercase leading-tight tracking-widest truncate">{t.userName}</span>
                           <span className="block text-sm font-bold text-slate-500 mt-1.5 uppercase tracking-widest font-mono truncate">ID: {t.ticketID}</span>
                        </div>
                        {/* Pass Pill (Fixed Width) */}
                        <span className={`shrink-0 inline-flex items-center justify-center w-24 py-1.5 rounded-full text-[10px] shadow-sm font-black uppercase tracking-widest mt-1 ${getPassStyle(t.passType)}`}>
                           {t.passType}
                        </span>
                     </div>

                     {/* Bottom Row (Status, Email Count, Price) */}
                     <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-1 w-full">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                           {t.status === 'active' ? <CheckCircle size={14} className="text-emerald-500"/> : <Clock size={14} className="text-amber-500"/>}
                           <span className={t.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}>{t.status}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                           {t.emailSentCount > 0 && <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md text-[10px] font-bold tracking-widest flex items-center gap-1"><Mail size={12}/> {t.emailSentCount}</span>}
                           <span className="font-bold text-slate-700 text-sm">€{t.price}</span>
                        </div>
                     </div>

                  </div>
               ))}
               {filteredHistory.length === 0 && (
                  <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border border-gray-100">
                     No paid attendees found.
                  </div>
               )}
            </div>

         </div>
      </div>
   );
}