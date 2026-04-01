"use client";
import { useState, useMemo } from "react";
import { Search, Filter, Ticket, Users, Trash2, Calendar, CheckCircle2, AlertTriangle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import CustomDropdown from "@/components/CustomDropdown";
import { usePopup } from "@/components/PopupProvider";
import { EVENT_YEARS } from "@/lib/constants";
import { useTranslations } from 'next-intl';
import { getPriceAtDate } from "@/lib/pricing";

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
function StatusToggle({ currentStatus, onChange, t }) {
   if (currentStatus === 'pending') {
     return (
       <div className="flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-500 w-[90px] md:w-28">
         <AlertTriangle size={16} className="shrink-0" /> 
         <span className="truncate">{t('statusPending')}</span>
       </div>
     );
   }
   return (
     <button 
       type="button" onClick={() => onChange(currentStatus === 'active' ? 'used' : 'active')}
       className="relative block h-7 w-[90px] md:w-28 overflow-hidden outline-none cursor-pointer hover:opacity-80 active:scale-95 transition-transform rounded-full lg:rounded-none"
     >
       <div className={`absolute inset-0 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-500 transition-all duration-300 ease-in-out ${currentStatus === 'active' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
         <CheckCircle2 size={16} className="shrink-0" /> 
         <span className="truncate">{t('statusActive')}</span>
       </div>
       <div className={`absolute inset-0 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-orange-500 transition-all duration-300 ease-in-out ${currentStatus === 'used' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
         <XCircle size={16} className="shrink-0" /> 
         <span className="truncate">{t('statusUsed')}</span>
       </div>
     </button>
   );
}

export default function TicketsTab({ tickets = [], users = [], onStageChange, historyStagedData }) {
   const t = useTranslations('AdminTicketsTab');

   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
   const [searchTerm, setSearchTerm] = useState("");
   const [statusFilter, setStatusFilter] = useState("all");
   const [passFilter, setPassFilter] = useState("all");
   
   // 🚀 PAGINATION STATE (Defaults to rendering Page 1 only)
   const [currentPage, setCurrentPage] = useState(1);
   const itemsPerPage = 20;
   
   const [expandedNameId, setExpandedNameId] = useState(null);
   const { showPopup } = usePopup();

   const safeTickets = Array.isArray(tickets) ? tickets : [];

   // 🚀 PERFORMANCE OPTIMIZATION: Memoize filtering logic
   const filteredTickets = useMemo(() => {
     const results = safeTickets.filter(ticket => {
        const matchesYear = ticket.festivalYear?.toString() === selectedYear;
        const purchaser = users.find(u => u.id === ticket.userId);
        const ambTag = purchaser?.ambassadorDisplayName || "";
        const displayStatus = historyStagedData?.[`tickets_${ticket.id}`]?.status || ticket.status;

        const matchesSearch = ticket.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              ticket.ticketID?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              ambTag.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === "all" || displayStatus === statusFilter;
        const matchesPass = passFilter === "all" || ticket.passType === passFilter;

        return matchesYear && matchesSearch && matchesStatus && matchesPass;
     });
     
     // Reset to page 1 if a filter changes and the current page is now empty
     if (currentPage > Math.ceil(results.length / itemsPerPage) && results.length > 0) {
       setCurrentPage(1);
     }
     return results;
   }, [safeTickets, selectedYear, users, historyStagedData, searchTerm, statusFilter, passFilter, currentPage, itemsPerPage]);

   // 🚀 PAGINATION CALCULATIONS
   const totalPages = Math.ceil(filteredTickets.length / itemsPerPage) || 1;
   const startIndex = (currentPage - 1) * itemsPerPage;
   const paginatedTickets = filteredTickets.slice(startIndex, startIndex + itemsPerPage);

   // Helper to generate the numbered tabs (e.g., 1 2 3 ... 8 9 10)
   const getPageNumbers = () => {
      const pages = [];
      if (totalPages <= 5) {
         for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
         if (currentPage <= 3) {
            pages.push(1, 2, 3, 4, '...', totalPages);
         } else if (currentPage >= totalPages - 2) {
            pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
         } else {
            pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
         }
      }
      return pages;
   };

   // Handle Search Input
   const handleSearch = (e) => {
     setSearchTerm(e.target.value);
     setCurrentPage(1);
   };

   const confirmDelete = (ticket) => {
      showPopup({
         type: "info", title: t('delTitle'), message: t('delMsg', { name: ticket.userName }), confirmText: t('btnDelYes'), cancelText: t('btnCancel'),
         onConfirm: () => onStageChange('tickets', ticket.id, { _deleted: true })
      });
   };

   return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
         
         {/* SEARCH & FILTERS */}
         <div className="flex flex-col xl:flex-row gap-4 mb-8 w-full relative z-40 px-0">
            <div className="relative flex-grow group w-full lg:min-w-[400px]">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
               <input type="text" maxLength={50} value={searchTerm} placeholder={t('searchPlaceholder')} className="w-full p-5 pl-14 bg-white border border-gray-200 rounded-2xl font-bold text-xs uppercase outline-none focus:border-slate-900 transition-all font-montserrat text-slate-900 shadow-sm" onChange={handleSearch} />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto shrink-0">
               <div className="relative w-full sm:w-auto z-40">
                  <CustomDropdown 
                     icon={Ticket} value={passFilter} 
                     onChange={(val) => { setPassFilter(val); setCurrentPage(1); }} 
                     options={[
                        { label: t('filterAll'), value: 'all', isPill: true, colorClass: 'bg-slate-100 text-slate-600' }, 
                        { label: t('passFull'), value: 'Full Pass', isPill: true, colorClass: getPassStyle('Full Pass') }, 
                        { label: t('passParty'), value: 'Party Pass', isPill: true, colorClass: getPassStyle('Party Pass') }, 
                        { label: t('passDay'), value: 'Day Pass', isPill: true, colorClass: getPassStyle('Day Pass') }, 
                        { label: t('passFree'), value: 'Free Pass', isPill: true, colorClass: getPassStyle('Free Pass') }
                     ]} variant="filter"
                  />
               </div>
               
               <div className="relative w-full sm:w-auto z-30">
                  <CustomDropdown 
                     icon={Filter} value={statusFilter} 
                     onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }} 
                     options={[
                        { label: t('statusAll'), value: 'all' }, 
                        { label: t('statusActive'), value: 'active', textColor: 'text-emerald-500' }, 
                        { label: t('statusUsed'), value: 'used', textColor: 'text-orange-500' }, 
                        { label: t('statusPending'), value: 'pending', textColor: 'text-amber-500' }
                     ]} variant="filter"
                  />
               </div>

               <div className="relative w-full sm:w-auto z-20">
                  <CustomDropdown icon={Calendar} value={selectedYear} onChange={(val) => { setSelectedYear(val); setCurrentPage(1); }} options={EVENT_YEARS} variant="filter"/>
               </div>
            </div>
         </div>

         {/* DESKTOP TABLE */}
         <div className="hidden lg:flex flex-col bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
            <div className="overflow-x-auto w-full">
               <table className="w-full text-left border-separate border-spacing-0 min-w-[950px] font-montserrat relative">
                  <thead className="bg-white text-[11px] font-bold uppercase text-slate-400 tracking-widest relative z-10">
                     <tr>
                        <th className="p-6 pl-10 font-bold w-48 border-b border-gray-100">{t('thGuest')}</th>
                        <th className="p-6 font-bold w-1/3 border-b border-gray-100">{t('thName')}</th>
                        <th className="p-6 font-bold w-48 border-b border-gray-100">{t('thPassType')}</th>
                        <th className="p-6 font-bold text-center w-40 border-b border-gray-100">{t('thStatus')}</th>
                        <th className="p-6 font-bold text-center w-32 border-b border-gray-100">{t('thPrice')}</th>
                        <th className="p-6 pr-10 text-right font-bold w-32 border-b border-gray-100">{t('thAction')}</th>
                     </tr>
                  </thead>
                  <tbody className="uppercase text-xs">
                     {paginatedTickets.map((ticket) => {
                        const purchaser = users.find(u => u.id === ticket.userId);
                        const ambTag = purchaser?.ambassadorDisplayName;
                        const displayStatus = historyStagedData?.[`tickets_${ticket.id}`]?.status || ticket.status;

                        return (
                           <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="p-6 pl-10 align-middle border-b border-gray-50">
                                 {ambTag ? <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest"><Users size={12} className="text-slate-400" /> {ambTag}</span> : <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{t('lblDirect')}</span>}
                              </td>
                              
                              <td className="p-6 align-middle truncate max-w-[300px] xl:max-w-[400px] border-b border-gray-50">
                                 <span title={ticket.userName} className="block text-base font-bold font-montserrat text-slate-700 tracking-wide truncate">{ticket.userName}</span>
                              </td>
                              
                              <td className="p-6 align-middle border-b border-gray-50">
                                 <CustomDropdown
                                    value={ticket.passType} variant="pill"
                                    onChange={(val) => {
                                       const updateData = { passType: val };
                                       if (displayStatus === 'pending') {
                                          updateData.price = getPriceAtDate(val);
                                       }
                                       onStageChange('tickets', ticket.id, updateData);
                                    }}
                                    options={[
                                       { label: t('passFull'), value: 'Full Pass', isPill: true, colorClass: getPassStyle('Full Pass') }, 
                                       { label: t('passParty'), value: 'Party Pass', isPill: true, colorClass: getPassStyle('Party Pass') }, 
                                       { label: t('passDay'), value: 'Day Pass', isPill: true, colorClass: getPassStyle('Day Pass') }, 
                                       ...(displayStatus === 'pending' || ticket.passType === 'Free Pass' ? [{ label: t('passFree'), value: 'Free Pass', isPill: true, colorClass: getPassStyle('Free Pass') }] : [])
                                    ]}
                                 />
                              </td>
                              <td className="p-6 align-middle border-b border-gray-50">
                                 <div className="flex justify-center">
                                    <StatusToggle currentStatus={displayStatus} onChange={(newStat) => onStageChange('tickets', ticket.id, { status: newStat })} t={t} />
                                 </div>
                              </td>
                              <td className="p-6 align-middle text-center font-bold text-base text-slate-700 border-b border-gray-50">€{ticket.price}</td>
                              <td className="p-6 pr-10 align-middle text-right border-b border-gray-50">
                                 <div className="flex justify-end gap-2 h-full items-center">
                                    <button onClick={() => confirmDelete(ticket)} title={t('btnDeletePass')} className="text-gray-400 opacity-40 group-hover:opacity-100 hover:!text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all cursor-pointer"><Trash2 size={18} /></button>
                                 </div>
                              </td>
                           </tr>
                        )
                     })}
                     {paginatedTickets.length === 0 && <tr><td colSpan="6" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-gray-50">{t('emptyMsg')}</td></tr>}
                  </tbody>
               </table>
            </div>

            {/* 🚀 NUMBERED PAGE TABS (DESKTOP) */}
            {filteredTickets.length > itemsPerPage && (
              <div className="flex items-center justify-between p-4 md:px-8 border-t border-gray-100 bg-slate-50/50">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                   Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTickets.length)} of {filteredTickets.length}
                </span>
                
                <div className="flex items-center gap-1">
                   <button 
                     onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                     disabled={currentPage === 1}
                     className="p-2 rounded-xl text-slate-600 hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent disabled:cursor-not-allowed transition-all cursor-pointer"
                   >
                     <ChevronLeft size={16} />
                   </button>
                   
                   {/* Numbered Tabs */}
                   {getPageNumbers().map((num, i) => (
                      num === '...' ? (
                         <span key={i} className="px-2 text-slate-400 font-bold">...</span>
                      ) : (
                         <button 
                           key={i} 
                           onClick={() => setCurrentPage(num)} 
                           className={`w-9 h-9 rounded-xl text-[11px] font-black tracking-widest transition-all cursor-pointer ${
                              currentPage === num 
                              ? 'bg-slate-900 text-white shadow-md' 
                              : 'bg-transparent text-slate-600 hover:bg-white border border-transparent hover:border-gray-200'
                           }`}
                         >
                           {num}
                         </button>
                      )
                   ))}

                   <button 
                     onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                     disabled={currentPage === totalPages}
                     className="p-2 rounded-xl text-slate-600 hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent disabled:cursor-not-allowed transition-all cursor-pointer"
                   >
                     <ChevronRight size={16} />
                   </button>
                </div>
              </div>
            )}
         </div>

         {/* MOBILE CARDS */}
         <div className="lg:hidden flex flex-col gap-4 relative z-10 pb-20">
            {paginatedTickets.map((ticket, index) => {
               const purchaser = users.find(u => u.id === ticket.userId);
               const ambTag = purchaser?.ambassadorDisplayName;
               const displayStatus = historyStagedData?.[`tickets_${ticket.id}`]?.status || ticket.status;
               const isExpanded = expandedNameId === ticket.id;

               return (
                  <div key={ticket.id} style={{ zIndex: paginatedTickets.length - index }} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-visible transition-all">
                     <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={() => setExpandedNameId(isExpanded ? null : ticket.id)}>
                           <span title={ticket.userName} className={`block text-lg font-black font-montserrat text-slate-900 uppercase leading-tight tracking-widest transition-all duration-200 ${isExpanded ? 'whitespace-normal break-words' : 'truncate'}`}>
                              {ticket.userName}
                           </span>
                           <span className="block text-sm font-bold text-slate-500 mt-1.5 uppercase tracking-widest font-mono truncate">
                              {t('lblId')}: {ticket.ticketID}
                           </span>
                        </div>
                        <div className="shrink-0 relative z-20 scale-[0.80] sm:scale-100 origin-top-right -mt-1 sm:mt-0">
                           <CustomDropdown
                              value={ticket.passType} variant="pill"
                              onChange={(val) => {
                                 const updateData = { passType: val };
                                 if (displayStatus === 'pending') {
                                    if (val === 'Free Pass') updateData.price = 0; else if (val === 'Full Pass') updateData.price = 150; else if (val === 'Party Pass') updateData.price = 80; else if (val === 'Day Pass') updateData.price = 60;
                                 }
                                 onStageChange('tickets', ticket.id, updateData);
                              }}
                              options={[
                                 { label: t('passFull'), value: 'Full Pass', isPill: true, colorClass: getPassStyle('Full Pass') }, 
                                 { label: t('passParty'), value: 'Party Pass', isPill: true, colorClass: getPassStyle('Party Pass') }, 
                                 { label: t('passDay'), value: 'Day Pass', isPill: true, colorClass: getPassStyle('Day Pass') }, 
                                 ...(displayStatus === 'pending' || ticket.passType === 'Free Pass' ? [{ label: t('passFree'), value: 'Free Pass', isPill: true, colorClass: getPassStyle('Free Pass') }] : [])
                              ]}
                           />
                        </div>
                     </div>
                     <div className="flex items-center w-full mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">{t('thGuest')}</span>
                        <div className="flex-grow border-b-2 border-dotted border-gray-200 mx-3 relative top-[1px]"></div>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 shrink-0">
                           <Users size={12} className="text-slate-400" />
                           {ambTag ? ambTag : <span className="text-slate-300">{t('lblDirect')}</span>}
                        </span>
                     </div>
                     <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-1 w-full relative z-10">
                        <div className="flex items-center gap-3">
                           <button onClick={() => confirmDelete(ticket)} className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2.5 rounded-xl transition-all cursor-pointer">
                              <Trash2 size={16} />
                           </button>
                           {displayStatus === 'pending' && <span className="font-black text-slate-700 text-sm">€{ticket.price}</span>}
                        </div>
                        <div className="flex items-center">
                           <StatusToggle currentStatus={displayStatus} onChange={(newStat) => onStageChange('tickets', ticket.id, { status: newStat })} t={t} />
                        </div>
                     </div>
                  </div>
               );
            })}
            
            {filteredTickets.length === 0 && (
               <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border border-gray-100">
                  {t('emptyMsg')}
               </div>
            )}

            {/* 🚀 NUMBERED PAGE TABS (MOBILE) */}
            {filteredTickets.length > itemsPerPage && (
               <div className="flex flex-col items-center gap-3 mt-4">
                  <div className="flex items-center gap-1">
                     <button 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                        disabled={currentPage === 1}
                        className="p-3 rounded-xl border border-transparent bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                     >
                        <ChevronLeft size={18} />
                     </button>
                     
                     {getPageNumbers().map((num, i) => (
                        num === '...' ? (
                           <span key={i} className="px-1 text-slate-400 font-bold">...</span>
                        ) : (
                           <button 
                              key={i} 
                              onClick={() => setCurrentPage(num)} 
                              className={`w-10 h-10 rounded-xl text-[11px] font-black tracking-widest transition-all ${
                                 currentPage === num 
                                 ? 'bg-slate-900 text-white shadow-md' 
                                 : 'bg-white text-slate-600 shadow-sm'
                              }`}
                           >
                              {num}
                           </button>
                        )
                     ))}

                     <button 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                        disabled={currentPage === totalPages}
                        className="p-3 rounded-xl border border-transparent bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                     >
                        <ChevronRight size={18} />
                     </button>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
}