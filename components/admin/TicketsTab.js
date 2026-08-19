"use client";
import { useState, useMemo } from "react";
import { Search, Filter, Ticket, Users, Trash2, Calendar, CheckCircle2, AlertTriangle, XCircle, Mail } from "lucide-react";
import CustomDropdown from "@/components/CustomDropdown";
import { usePopup } from "@/components/PopupProvider";
import { EVENT_YEARS } from "@/lib/constants";
import { useTranslations } from 'next-intl';
import { getPriceAtDate } from "@/lib/pricing";
import TicketModal from "@/components/TicketModal";

// Shared styling helpers for pass types
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

// Text-based status toggle component
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
   
   const [expandedNameId, setExpandedNameId] = useState(null);
   const [fullScreenTicket, setFullScreenTicket] = useState(null);
   const { showPopup } = usePopup();

   const safeTickets = Array.isArray(tickets) ? tickets : [];

   // --- SPREADSHEET GROUPING & SORTING LOGIC ---
   const { grouped, flatList } = useMemo(() => {
     // 1. Filter Tickets
     const filtered = safeTickets.filter(ticket => {
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

     // 2. Group by Ambassador
     const groupsObj = {};
     filtered.forEach(ticket => {
        const purchaser = users.find(u => u.id === ticket.userId);
        const ambTag = purchaser?.ambassadorDisplayName || "Direct";
        
        if (!groupsObj[ambTag]) {
           groupsObj[ambTag] = {
              name: ambTag,
              tickets: [],
              stats: { total: 0, revenue: 0, full: 0, party: 0, day: 0, free: 0 }
           };
        }
        groupsObj[ambTag].tickets.push(ticket);
        
        // Update Summary Stats
        groupsObj[ambTag].stats.total += 1;
        groupsObj[ambTag].stats.revenue += (ticket.price || 0);
        
        const pt = (ticket.passType || '').toLowerCase();
        if (pt.includes('full')) groupsObj[ambTag].stats.full += 1;
        else if (pt.includes('party')) groupsObj[ambTag].stats.party += 1;
        else if (pt.includes('day')) groupsObj[ambTag].stats.day += 1;
        else if (pt.includes('free')) groupsObj[ambTag].stats.free += 1;
     });

     // 3. Sort Groups (Alphabetical, but put "Direct" at the bottom)
     const sortedGroups = Object.values(groupsObj).sort((a, b) => {
        if (a.name === "Direct" && b.name !== "Direct") return 1;
        if (b.name === "Direct" && a.name !== "Direct") return -1;
        return a.name.localeCompare(b.name);
     });

     // 4. Sort Tickets within groups (Chronological: oldest to newest so newest is at the bottom)
     sortedGroups.forEach(g => {
        g.tickets.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
     });

     // 5. Flatten the list for the modal arrows to work seamlessly
     const flat = sortedGroups.flatMap(g => g.tickets);

     return { grouped: sortedGroups, flatList: flat };
   }, [safeTickets, selectedYear, users, historyStagedData, searchTerm, statusFilter, passFilter]);

   const handleSearch = (e) => {
     setSearchTerm(e.target.value);
   };

   const confirmDelete = (ticket) => {
      showPopup({
         type: "info", title: t('delTitle'), message: t('delMsg', { name: ticket.userName }), confirmText: t('btnDelYes'), cancelText: t('btnCancel'),
         onConfirm: () => onStageChange('tickets', ticket.id, { _deleted: true })
      });
   };

   return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
         
         {/* THE MODAL OVERLAY */}
         {fullScreenTicket && (
            <TicketModal
               ticket={fullScreenTicket}
               ticketsList={flatList} 
               setTicket={setFullScreenTicket}
               onClose={() => setFullScreenTicket(null)}
            />
         )}

         {/* Search and Filters Section */}
         <div className="flex flex-col xl:flex-row gap-4 mb-8 w-full relative z-40 px-0">
            <div className="relative flex-grow group w-full lg:min-w-[400px]">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
               <input type="text" maxLength={50} value={searchTerm} placeholder={t('searchPlaceholder')} className="w-full p-5 pl-14 bg-white border border-gray-200 rounded-2xl font-bold text-xs uppercase outline-none focus:border-slate-900 transition-all font-montserrat text-slate-900 shadow-sm" onChange={handleSearch} />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto shrink-0">
               <div className="relative w-full sm:w-auto z-40">
                  <CustomDropdown 
                     icon={Ticket} value={passFilter} 
                     onChange={setPassFilter} 
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
                     onChange={setStatusFilter} 
                     options={[
                        { label: t('statusAll'), value: 'all' }, 
                        { label: t('statusActive'), value: 'active', textColor: 'text-emerald-500' }, 
                        { label: t('statusUsed'), value: 'used', textColor: 'text-orange-500' }, 
                        { label: t('statusPending'), value: 'pending', textColor: 'text-amber-500' }
                     ]} variant="filter"
                  />
               </div>

               <div className="relative w-full sm:w-auto z-20">
                  <CustomDropdown icon={Calendar} value={selectedYear} onChange={setSelectedYear} options={EVENT_YEARS} variant="filter"/>
               </div>
            </div>
         </div>

         {/* ============================== */}
         {/* DESKTOP SPREADSHEET TABLE VIEW */}
         {/* ============================== */}
         <div className="hidden lg:flex flex-col bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
            <div className="w-full pb-40 overflow-x-auto">
               <table className="w-full text-left border-separate border-spacing-0 font-montserrat relative">
                  <thead className="bg-white text-[11px] font-bold uppercase text-slate-400 tracking-widest relative z-10">
                     <tr>
                        <th className="p-6 pl-10 font-bold text-left w-32 border-b border-gray-100">Date</th>
                        <th className="p-6 font-bold w-48 border-b border-gray-100">{t('thGuest')}</th>
                        <th className="p-6 font-bold w-1/3 border-b border-gray-100">{t('thName')}</th>
                        <th className="p-6 font-bold w-48 border-b border-gray-100">{t('thPassType')}</th>
                        <th className="p-6 font-bold text-center w-40 border-b border-gray-100">{t('thStatus')}</th>
                        <th className="p-6 font-bold text-center w-32 border-b border-gray-100">{t('thPrice')}</th>
                        <th className="p-6 pr-10 text-right font-bold w-32 border-b border-gray-100">{t('thAction')}</th>
                     </tr>
                  </thead>
                  
                  {grouped.map((group) => (
                     <tbody key={group.name} className="uppercase text-xs group/tbody">
                        
                        {/* THE GROUP HEADER ROW */}
                        <tr className="bg-salsa-pink/5 border-b border-gray-100">
                           <td colSpan="7" className="p-4 pl-10 border-y border-salsa-pink/20">
                              <div className="flex justify-between items-center pr-4">
                                 <div className="flex items-center gap-3">
                                    <span className="font-bebas text-2xl text-salsa-pink tracking-wide translate-y-0.5">
                                       {group.name === 'Direct' ? t('lblDirect') : group.name}
                                    </span>
                                 </div>
                                 <div className="flex gap-4 font-black text-[10px] text-slate-500 tracking-widest uppercase">
                                    <span className="bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                                       {group.stats.total} TIX
                                    </span>
                                    <span className="bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100 text-slate-700">
                                       €{group.stats.revenue} REV
                                    </span>
                                 </div>
                              </div>
                           </td>
                        </tr>

                        {/* THE TICKETS INSIDE THE GROUP */}
                        {group.tickets.map((ticket) => {
                           const purchaser = users.find(u => u.id === ticket.userId);
                           const ambTag = purchaser?.ambassadorDisplayName;
                           const displayStatus = historyStagedData?.[`tickets_${ticket.id}`]?.status || ticket.status;

                           return (
                              <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors group/row">
                                 <td className="p-6 pl-10 align-middle text-left font-bold text-xs text-slate-400 tracking-widest uppercase border-b border-gray-50">
                                    {new Date(ticket.purchaseDate).toLocaleDateString('en-GB')}
                                 </td>
                                 
                                 <td className="p-6 align-middle border-b border-gray-50">
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
                                          if (displayStatus === 'pending') updateData.price = getPriceAtDate(val);
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
                                       <button onClick={() => setFullScreenTicket(ticket)} title="View / Support" className="text-gray-400 opacity-40 group-hover/row:opacity-100 hover:!text-salsa-pink hover:bg-pink-50 p-2 rounded-xl transition-all cursor-pointer"><Mail size={18} /></button>
                                       <button onClick={() => confirmDelete(ticket)} title={t('btnDeletePass')} className="text-gray-400 opacity-40 group-hover/row:opacity-100 hover:!text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all cursor-pointer"><Trash2 size={18} /></button>
                                    </div>
                                 </td>
                              </tr>
                           )
                        })}
                     </tbody>
                  ))}

                  {grouped.length === 0 && (
                     <tbody>
                        <tr><td colSpan="7" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-gray-50">{t('emptyMsg')}</td></tr>
                     </tbody>
                  )}
               </table>
            </div>
         </div>

         {/* ============================== */}
         {/* MOBILE GROUPED CARD VIEW */}
         {/* ============================== */}
         <div className="lg:hidden flex flex-col gap-10 relative z-10 pb-20">
            {grouped.map((group) => (
               <div key={group.name} className="flex flex-col gap-4">
                  
                  {/* MOBILE GROUP HEADER */}
                  <div className="bg-salsa-pink/10 border border-salsa-pink/20 rounded-3xl p-5 flex flex-col gap-3 shadow-sm">
                     <span className="font-bebas text-3xl text-salsa-pink leading-none tracking-wide">
                        {group.name === 'Direct' ? t('lblDirect') : group.name}
                     </span>
                     <div className="flex gap-2 font-black text-[10px] text-slate-600 tracking-widest uppercase">
                        <span className="bg-white px-3 py-1.5 rounded-full shadow-sm">TIX: {group.stats.total}</span>
                        <span className="bg-white px-3 py-1.5 rounded-full shadow-sm text-slate-700">REV: €{group.stats.revenue}</span>
                     </div>
                  </div>

                  {/* MOBILE TICKETS */}
                  {group.tickets.map((ticket, index) => {
                     const purchaser = users.find(u => u.id === ticket.userId);
                     const ambTag = purchaser?.ambassadorDisplayName;
                     const displayStatus = historyStagedData?.[`tickets_${ticket.id}`]?.status || ticket.status;
                     const isExpanded = expandedNameId === ticket.id;

                     return (
                        <div key={ticket.id} style={{ zIndex: group.tickets.length - index }} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-visible transition-all">
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
                              <div className="flex items-center gap-2">
                                 <button onClick={() => setFullScreenTicket(ticket)} className="text-slate-400 hover:text-salsa-pink bg-gray-50 hover:bg-pink-50 p-2.5 rounded-xl transition-all cursor-pointer">
                                    <Mail size={16} />
                                 </button>
                                 <button onClick={() => confirmDelete(ticket)} className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2.5 rounded-xl transition-all cursor-pointer">
                                    <Trash2 size={16} />
                                 </button>
                                 <div className="flex flex-col ml-1">
                                    {displayStatus === 'pending' && <span className="font-black text-slate-700 text-sm">€{ticket.price}</span>}
                                    <span className="text-[10px] font-bold text-slate-400 tracking-widest">{new Date(ticket.purchaseDate).toLocaleDateString('en-GB')}</span>
                                 </div>
                              </div>
                              <div className="flex items-center">
                                 <StatusToggle currentStatus={displayStatus} onChange={(newStat) => onStageChange('tickets', ticket.id, { status: newStat })} t={t} />
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>
            ))}

            {grouped.length === 0 && (
               <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border border-gray-100">
                  {t('emptyMsg')}
               </div>
            )}
         </div>
      </div>
   );
}