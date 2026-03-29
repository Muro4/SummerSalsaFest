"use client";
import { useState } from "react";
import { Search, Filter, Ticket, Users, Trash2, Calendar, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import CustomDropdown from "@/components/CustomDropdown";
import { usePopup } from "@/components/PopupProvider";
import { EVENT_YEARS } from "@/lib/constants";

// --- SHARED PASS STYLING ---
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

const getPassStyle = (type) => {
   return `${getPassBgColor(type)} ${getPassTextColor(type)} border-transparent`;
};

// --- TEXT-BASED STATUS TOGGLE ---
function StatusToggle({ currentStatus, onChange }) {
   if (currentStatus === 'pending') {
     return (
       <div className="flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-500 w-[80px] md:w-24">
         <AlertTriangle size={16} /> Pending
       </div>
     );
   }
   return (
     <button 
       type="button" onClick={() => onChange(currentStatus === 'active' ? 'used' : 'active')}
       className="relative block h-7 w-[80px] md:w-24 overflow-hidden outline-none cursor-pointer hover:opacity-80 active:scale-95 transition-transform rounded-full lg:rounded-none"
     >
       <div className={`absolute inset-0 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-500 transition-all duration-300 ease-in-out ${currentStatus === 'active' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
         <CheckCircle2 size={16} /> Active
       </div>
       <div className={`absolute inset-0 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-orange-500 transition-all duration-300 ease-in-out ${currentStatus === 'used' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
         <XCircle size={16} /> Used
       </div>
     </button>
   );
}

export default function TicketsTab({ tickets = [], users = [], onStageChange, historyStagedData }) {
   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
   const [searchTerm, setSearchTerm] = useState("");
   const [statusFilter, setStatusFilter] = useState("all");
   const [passFilter, setPassFilter] = useState("all");
   
   // --- NEW: Track expanded name on mobile ---
   const [expandedNameId, setExpandedNameId] = useState(null);
   
   const { showPopup } = usePopup();

   const safeTickets = Array.isArray(tickets) ? tickets : [];

   const filteredTickets = safeTickets.filter(t => {
      const matchesYear = t.festivalYear?.toString() === selectedYear;
      const purchaser = users.find(u => u.id === t.userId);
      const ambTag = purchaser?.ambassadorDisplayName || "";
      const displayStatus = historyStagedData?.[`tickets_${t.id}`]?.status || t.status;

      const matchesSearch = t.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.ticketID?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           ambTag.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || displayStatus === statusFilter;
      const matchesPass = passFilter === "all" || t.passType === passFilter;

      return matchesYear && matchesSearch && matchesStatus && matchesPass;
   });

   const confirmDelete = (t) => {
      showPopup({
         type: "info", title: "Stage Deletion?", message: `Delete ${t.userName}'s ticket?`, confirmText: "Yes, Stage Delete", cancelText: "Cancel",
         onConfirm: () => onStageChange('tickets', t.id, { _deleted: true })
      });
   };

   return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
         
         {/* SEARCH & FILTERS */}
         <div className="flex flex-col xl:flex-row gap-4 mb-8 w-full relative z-40 px-0">
            <div className="relative flex-grow group w-full lg:min-w-[400px]">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
               <input type="text" maxLength={50} value={searchTerm} placeholder="SEARCH BY NAME, ID, OR GUEST DANCER..." className="w-full p-5 pl-14 bg-white border border-gray-200 rounded-2xl font-bold text-xs uppercase outline-none focus:border-slate-900 transition-all font-montserrat text-slate-900 shadow-sm" onChange={e => setSearchTerm(e.target.value)} />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto shrink-0">
               <div className="relative w-full sm:w-auto z-40">
                  <CustomDropdown 
                     icon={Ticket} 
                     value={passFilter} 
                     onChange={setPassFilter} 
                     options={[
                        { label: 'All Passes', value: 'all', isPill: true, colorClass: 'bg-slate-100 text-slate-600' }, 
                        { label: 'Full Pass', value: 'Full Pass', isPill: true, colorClass: getPassStyle('Full Pass') }, 
                        { label: 'Party Pass', value: 'Party Pass', isPill: true, colorClass: getPassStyle('Party Pass') }, 
                        { label: 'Day Pass', value: 'Day Pass', isPill: true, colorClass: getPassStyle('Day Pass') }, 
                        { label: 'Free Pass', value: 'Free Pass', isPill: true, colorClass: getPassStyle('Free Pass') }
                     ]} 
                     variant="filter"
                  />
               </div>
               
               <div className="relative w-full sm:w-auto z-30">
                  <CustomDropdown icon={Filter} value={statusFilter} onChange={setStatusFilter} options={[{ label: 'All Statuses', value: 'all' }, { label: 'Active', value: 'active', textColor: 'text-emerald-500' }, { label: 'Used', value: 'used', textColor: 'text-orange-500' }, { label: 'Pending', value: 'pending', textColor: 'text-amber-500' }]} variant="filter"/>
               </div>

               <div className="relative w-full sm:w-auto z-20">
                  <CustomDropdown icon={Calendar} value={selectedYear} onChange={setSelectedYear} options={EVENT_YEARS} variant="filter"/>
               </div>
            </div>
         </div>

         {/* DESKTOP TABLE */}
         <div className="hidden lg:block bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
            <div className="overflow-x-auto w-full pb-40">
               <table className="w-full text-left border-separate border-spacing-0 min-w-[950px] font-montserrat relative">
                  <thead className="bg-white text-[11px] font-bold uppercase text-slate-400 tracking-widest relative z-10">
                     <tr>
                        <th className="p-6 pl-10 font-bold w-48 rounded-tl-[3rem] border-b border-gray-100">Guest Dancer</th>
                        <th className="p-6 font-bold w-1/3 border-b border-gray-100">Attendee Name</th>
                        <th className="p-6 font-bold w-48 border-b border-gray-100">Pass Type</th>
                        <th className="p-6 font-bold text-center w-40 border-b border-gray-100">Status</th>
                        <th className="p-6 font-bold text-center w-32 border-b border-gray-100">Price</th>
                        <th className="p-6 pr-10 text-right font-bold w-32 rounded-tr-[3rem] border-b border-gray-100">Action</th>
                     </tr>
                  </thead>
                  <tbody className="uppercase text-xs">
                     {filteredTickets.map((t) => {
                        const purchaser = users.find(u => u.id === t.userId);
                        const ambTag = purchaser?.ambassadorDisplayName;
                        const displayStatus = historyStagedData?.[`tickets_${t.id}`]?.status || t.status;

                        return (
                           <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="p-6 pl-10 align-middle border-b border-gray-50">
                                 {ambTag ? <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest"><Users size={12} className="text-slate-400" /> {ambTag}</span> : <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Direct</span>}
                              </td>
                              
                              <td className="p-6 align-middle truncate max-w-[300px] xl:max-w-[400px] border-b border-gray-50">
                                 <span title={t.userName} className="block text-base font-bold font-montserrat text-slate-700 tracking-wide truncate">{t.userName}</span>
                              </td>
                              
                              <td className="p-6 align-middle border-b border-gray-50">
                                 <CustomDropdown
                                    value={t.passType} variant="pill"
                                    onChange={(val) => {
                                       const updateData = { passType: val };
                                       if (displayStatus === 'pending') {
                                          if (val === 'Free Pass') updateData.price = 0; else if (val === 'Full Pass') updateData.price = 150; else if (val === 'Party Pass') updateData.price = 80; else if (val === 'Day Pass') updateData.price = 60;
                                       }
                                       onStageChange('tickets', t.id, updateData);
                                    }}
                                    options={[
                                       { label: 'Full Pass', value: 'Full Pass', isPill: true, colorClass: getPassStyle('Full Pass') }, 
                                       { label: 'Party Pass', value: 'Party Pass', isPill: true, colorClass: getPassStyle('Party Pass') }, 
                                       { label: 'Day Pass', value: 'Day Pass', isPill: true, colorClass: getPassStyle('Day Pass') }, 
                                       ...(displayStatus === 'pending' || t.passType === 'Free Pass' ? [{ label: 'Free Pass', value: 'Free Pass', isPill: true, colorClass: getPassStyle('Free Pass') }] : [])
                                    ]}
                                 />
                              </td>
                              <td className="p-6 align-middle border-b border-gray-50">
                                 <div className="flex justify-center">
                                    <StatusToggle currentStatus={displayStatus} onChange={(newStat) => onStageChange('tickets', t.id, { status: newStat })} />
                                 </div>
                              </td>
                              <td className="p-6 align-middle text-center font-bold text-base text-slate-700 border-b border-gray-50">€{t.price}</td>
                              <td className="p-6 pr-10 align-middle text-right border-b border-gray-50">
                                 <div className="flex justify-end gap-2 h-full items-center">
                                    <button onClick={() => confirmDelete(t)} title="Delete Ticket" className="text-gray-400 opacity-40 group-hover:opacity-100 hover:!text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all cursor-pointer"><Trash2 size={18} /></button>
                                 </div>
                              </td>
                           </tr>
                        )
                     })}
                     {filteredTickets.length === 0 && <tr><td colSpan="6" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-gray-50">No tickets match your search.</td></tr>}
                  </tbody>
               </table>
            </div>
         </div>

         {/* MOBILE CARDS (SPACIOUS VERSION) */}
         <div className="lg:hidden flex flex-col gap-4 relative z-10 pb-20">
            {filteredTickets.map((t, index) => {
               const purchaser = users.find(u => u.id === t.userId);
               const ambTag = purchaser?.ambassadorDisplayName;
               const displayStatus = historyStagedData?.[`tickets_${t.id}`]?.status || t.status;
               
               const isExpanded = expandedNameId === t.id;

               return (
                  <div key={t.id} style={{ zIndex: filteredTickets.length - index }} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-visible transition-all">
                     
                     {/* Top Row: Name, ID, Dropdown Pill */}
                     <div className="flex justify-between items-start gap-2">
                        
                        {/* Tap to expand name block */}
                        <div 
                           className="flex-1 min-w-0 pr-2 cursor-pointer"
                           onClick={() => setExpandedNameId(isExpanded ? null : t.id)}
                        >
                           <span 
                              title={t.userName} 
                              className={`block text-lg font-black font-montserrat text-slate-900 uppercase leading-tight tracking-widest transition-all duration-200 ${isExpanded ? 'whitespace-normal break-words' : 'truncate'}`}
                           >
                              {t.userName}
                           </span>
                           <span className="block text-sm font-bold text-slate-500 mt-1.5 uppercase tracking-widest font-mono truncate">
                              ID: {t.ticketID}
                           </span>
                        </div>

                        {/* Dropdown Container */}
                        <div className="shrink-0 relative z-20 scale-[0.80] sm:scale-100 origin-top-right -mt-1 sm:mt-0">
                           <CustomDropdown
                              value={t.passType} variant="pill"
                              onChange={(val) => {
                                 const updateData = { passType: val };
                                 if (displayStatus === 'pending') {
                                    if (val === 'Free Pass') updateData.price = 0; else if (val === 'Full Pass') updateData.price = 150; else if (val === 'Party Pass') updateData.price = 80; else if (val === 'Day Pass') updateData.price = 60;
                                 }
                                 onStageChange('tickets', t.id, updateData);
                              }}
                              options={[
                                 { label: 'Full Pass', value: 'Full Pass', isPill: true, colorClass: getPassStyle('Full Pass') }, 
                                 { label: 'Party Pass', value: 'Party Pass', isPill: true, colorClass: getPassStyle('Party Pass') }, 
                                 { label: 'Day Pass', value: 'Day Pass', isPill: true, colorClass: getPassStyle('Day Pass') }, 
                                 ...(displayStatus === 'pending' || t.passType === 'Free Pass' ? [{ label: 'Free Pass', value: 'Free Pass', isPill: true, colorClass: getPassStyle('Free Pass') }] : [])
                              ]}
                           />
                        </div>
                     </div>

                     {/* Middle Row: Guest Dancer (Dotted Line) */}
                     <div className="flex items-center w-full mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">Guest Dancer</span>
                        <div className="flex-grow border-b-2 border-dotted border-gray-200 mx-3 relative top-[1px]"></div>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 shrink-0">
                           <Users size={12} className="text-slate-400" />
                           {ambTag ? ambTag : <span className="text-slate-300">Direct</span>}
                        </span>
                     </div>
                     
                     {/* Bottom Row: Trash/Price (Left) and Status (Right) */}
                     <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-1 w-full relative z-10">
                        {/* Left Side: Trashcan and optional price */}
                        <div className="flex items-center gap-3">
                           <button onClick={() => confirmDelete(t)} className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2.5 rounded-xl transition-all cursor-pointer">
                              <Trash2 size={16} />
                           </button>
                           {displayStatus === 'pending' && <span className="font-black text-slate-700 text-sm">€{t.price}</span>}
                        </div>
                        {/* Right Side: Just the toggle (no status label text) */}
                        <div className="flex items-center">
                           <StatusToggle currentStatus={displayStatus} onChange={(newStat) => onStageChange('tickets', t.id, { status: newStat })} />
                        </div>
                     </div>

                  </div>
               );
            })}
            {filteredTickets.length === 0 && (
               <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border border-gray-100">
                  No tickets match your search.
               </div>
            )}
         </div>
      </div>
   );
}