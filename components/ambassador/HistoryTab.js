"use client";
import { useState } from "react";
import { Search, Ticket, Calendar, CheckCircle, Clock, Mail, Eye } from "lucide-react";
import CustomDropdown from "@/components/CustomDropdown";
import { EVENT_YEARS } from "@/lib/constants";
import { useTranslations } from 'next-intl';

// Shared Styling Helpers
const getPassBgColor = (type) => {
   const t = (type || '').toLowerCase();
   if (t.includes('free')) return 'bg-yellow-400';
   if (t.includes('performers')) return 'bg-violet-600';
   return 'bg-salsa-pink'; 
};

const getPassTextColor = (type) => {
   const t = (type || '').toLowerCase();
   if (t.includes('free')) return 'text-yellow-900';
   return 'text-white';
};

const getPassStyle = (type) => `${getPassBgColor(type)} ${getPassTextColor(type)} border-transparent`;

// Hotel Pricing Logic for History Displays
const getHotelPrice = (hotel) => {
   if (hotel === 'Detelina') return 180;
   if (hotel === 'Toro Negro') return 130;
   if (hotel === 'Kabakum') return 150;
   if (hotel === 'ВСУ') return 70;
   return 0;
};

export default function HistoryTab({ paidTickets, setFullScreenTicket, selectedYear, setSelectedYear }) {
   const t = useTranslations('HistoryTab');

   const [searchQuery, setSearchQuery] = useState("");
   const [passFilter, setPassFilter] = useState("All");

   // Helper to translate internal DB pass names for the UI
   const translatePassDisplay = (type) => {
      const typeLower = (type || '').toLowerCase();
      if (typeLower.includes('full')) return t('passFull') || 'Full Pass';
      if (typeLower.includes('performers')) return t('passPerformers') || 'Performers Pass';
      if (typeLower.includes('free')) return t('passFree') || 'Free Full Pass';
      return type;
   };

   const filteredHistory = paidTickets.filter(ticket => {
      const matchesYear = ticket.festivalYear?.toString() === selectedYear;
      const matchesSearch = (ticket.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || ticket.ticketID?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPass = passFilter === "All" || (ticket.passType || "").toLowerCase() === passFilter.toLowerCase();
      return matchesYear && matchesSearch && matchesPass;
   });

   // Calculate Math Breakdown
   let totalSales = 0;
   let totalCommission = 0;

   filteredHistory.forEach(ticket => {
      const hotelPrice = getHotelPrice(ticket.accommodation);
      totalSales += (ticket.price || 0) + hotelPrice;
      totalCommission += (ticket.commission || 0);
   });

   const totalPaidRevenue = totalSales - totalCommission;

   return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
         
         {/* SEARCH & FILTERS */}
         <div className="flex flex-col xl:flex-row gap-4 mb-8 w-full relative z-40 px-0">
            <div className="relative flex-grow group w-full">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
               <input 
                  type="text" 
                  maxLength={50} 
                  placeholder={t('searchPlaceholder') || "Search records..."} 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="w-full p-4 pl-14 bg-white border border-gray-200 rounded-2xl font-bold text-xs uppercase outline-none focus:border-slate-900 transition-all font-montserrat text-slate-900 shadow-sm" 
               />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto shrink-0">
               <div className="relative w-full sm:w-auto z-40">
                  <CustomDropdown 
                     value={passFilter} 
                     onChange={setPassFilter} 
                     icon={Ticket} 
                     options={[
                        { label: t('filterAll') || 'All Passes', value: 'All', isPill: true, colorClass: getPassStyle('All') }, 
                        { label: t('passFull') || 'Full Pass', value: 'Full Pass', isPill: true, colorClass: getPassStyle('Full Pass') }, 
                        { label: t('passPerformers') || 'Performers Pass', value: 'Performers Pass', isPill: true, colorClass: getPassStyle('Performers Pass') }, 
                        { label: t('passFree') || 'Free Full Pass', value: 'Free Full Pass', isPill: true, colorClass: getPassStyle('Free Full Pass') }
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
            
            <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-50/50 shrink-0 gap-6 rounded-t-[3rem]">
               <div>
                  <h2 className="font-bebas tracking-wide text-3xl md:text-4xl text-slate-900 uppercase tracking-wide">{t('title') || 'Registration History'}</h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-500 mt-1 font-montserrat">{t('subtitle') || 'View all tickets you have registered.'}</p>
               </div>
               <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-6 md:gap-8">
                  <div className="flex flex-col">
                     <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest font-montserrat mb-1">{t('registered') || 'Registered'}</span>
                     <span className="font-bebas text-3xl leading-none text-slate-900">{filteredHistory.length}</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">{t('sumSales') || 'Sum of Sales'}</span>
                     <span className="text-xl font-bold text-slate-700">€{totalSales}</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest mb-1">{t('commission') || 'Commission'}</span>
                     <span className="text-xl font-bold text-emerald-500">€{totalCommission}</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[11px] font-bold uppercase text-slate-500 tracking-widest font-montserrat mb-1">{t('totalPaid') || 'Total Paid'}</span>
                     <span className="font-bebas text-4xl leading-none text-slate-900">€{totalPaidRevenue}</span>
                  </div>
               </div>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block overflow-x-auto w-full flex-grow pb-16">
               <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px] font-montserrat relative">
                  <thead className="bg-white text-[11px] font-bold uppercase text-slate-500 tracking-widest relative z-10">
                     <tr>
                        <th className="p-4 pl-8 font-bold w-12 border-b border-gray-100">#</th>
                        <th className="p-4 font-bold w-[30%] border-b border-gray-100">{t('thName') || 'Dancer Name'}</th>
                        <th className="p-4 font-bold w-48 border-b border-gray-100">{t('thPassType') || 'Pass Type'}</th>
                        <th className="p-4 font-bold w-56 border-b border-gray-100">{t('thAccomm') || 'Accommodation'}</th>
                        <th className="p-4 font-bold text-right w-32 border-b border-gray-100">{t('thFinal') || 'Final Price'}</th>
                        <th className="p-4 font-bold text-center w-32 border-b border-gray-100">{t('thEmailed') || 'Emailed'}</th>
                        <th className="p-4 pr-8 text-right font-bold w-32 border-b border-gray-100">{t('thStatus') || 'Status'}</th>
                     </tr>
                  </thead>
                  <tbody className="uppercase text-xs font-bold text-slate-900">
                     {filteredHistory.map((ticket, i) => {
                        const hotelPrice = getHotelPrice(ticket.accommodation);
                        const finalPrice = (ticket.price || 0) + hotelPrice - (ticket.commission || 0);

                        return (
                           <tr key={ticket.id} onClick={() => setFullScreenTicket(ticket)} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                              
                              <td className="p-4 pl-8 align-middle border-b border-gray-50">
                                 <span className="text-[11px] font-bold text-slate-400 group-hover:text-salsa-pink transition-colors">{i + 1}.</span>
                              </td>
                              
                              {/* 1. Name */}
                              <td className="p-4 align-middle border-b border-gray-50 max-w-[300px]">
                                 <span title={ticket.userName} className="block text-sm font-bold font-montserrat text-slate-900 tracking-wide group-hover:text-salsa-pink transition-colors truncate uppercase">{ticket.userName}</span>
                              </td>
                              
                              {/* 2. Pass Type */}
                              <td className="p-4 align-middle border-b border-gray-50">
                                 <span className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-sm ${getPassStyle(ticket.passType)}`}>
                                    {translatePassDisplay(ticket.passType)}
                                 </span>
                              </td>

                              {/* 3. Accommodation */}
                              <td className="p-4 align-middle border-b border-gray-50">
                                 <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-slate-700">{ticket.accommodation === 'None' || !ticket.accommodation ? (t('accNone') || 'Без нощувка') : ticket.accommodation}</span>
                                    {hotelPrice > 0 && (
                                       <span className="text-[12px] font-bold bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">+€{hotelPrice}</span>
                                    )}
                                 </div>
                              </td>

                              {/* 4. Final Price */}
                              <td className="p-4 text-right font-bold text-xl text-slate-900 align-middle border-b border-gray-50">€{finalPrice}</td>
                              
                              {/* Emailed Tag */}
                              <td className="p-4 text-center align-middle font-montserrat border-b border-gray-50">
                                 <div className="flex justify-center h-full items-center">
                                    {ticket.emailSentCount > 0 ? (
                                       <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-md tracking-widest shadow-sm border border-emerald-100"><Mail size={12} /> {ticket.emailSentCount}</span>
                                    ) : (
                                       <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-300 px-3 py-1.5 tracking-widest"><Mail size={12} /> 0</span>
                                    )}
                                 </div>
                              </td>

                              {/* Status & Actions */}
                              <td className="p-4 pr-8 align-middle font-montserrat border-b border-gray-50">
                                 <div className="flex items-center justify-end gap-4 h-full">
                                    <div className={`flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase ${ticket.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                       {ticket.status === 'active' ? <CheckCircle size={14} /> : <Clock size={14} />} {ticket.status === 'active' ? t('statusActive') : t('statusPending')}
                                    </div>
                                    <div className="bg-white p-2 rounded-xl text-slate-400 group-hover:bg-salsa-pink group-hover:text-white transition-all duration-300 shadow-sm border border-gray-200 group-hover:border-salsa-pink group-hover:scale-110" title={t('viewTicket') || 'View Ticket'}>
                                       <Eye size={16} />
                                    </div>
                                 </div>
                              </td>

                           </tr>
                        );
                     })}
                     {filteredHistory.length === 0 && <tr><td colSpan="7" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest font-montserrat border-b border-gray-50">{t('noPaidFound') || 'No records found'}</td></tr>}
                  </tbody>
               </table>
            </div>

            {/* ==============================================
                MOBILE VIEW: CARDS (Visible only on small screens)
                ============================================== */}
            <div className="lg:hidden flex flex-col gap-4 p-4 bg-slate-50 border-t border-gray-100 flex-grow pb-24">
               {filteredHistory.map((ticket, i) => {
                  const hotelPrice = getHotelPrice(ticket.accommodation);
                  const finalPrice = (ticket.price || 0) + hotelPrice - (ticket.commission || 0);

                  return (
                     <div key={ticket.id} onClick={() => setFullScreenTicket(ticket)} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4 relative cursor-pointer hover:ring-2 ring-salsa-pink/50 transition-all">
                        
                        {/* Top Row: Index, Name, Status */}
                        <div className="flex items-start justify-between gap-4 w-full">
                           <div className="flex flex-1 items-start gap-3 min-w-0">
                              <span className="text-[10px] font-bold text-slate-400 mt-1.5">{i + 1}.</span>
                              <div className="flex-1 min-w-0">
                                 <span className="block text-base font-bold text-slate-900 uppercase leading-tight tracking-wide truncate">{ticket.userName}</span>
                                 <span className="block text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest font-mono truncate">ID: {ticket.ticketID}</span>
                              </div>
                           </div>
                           <div className={`shrink-0 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mt-1.5 ${ticket.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {ticket.status === 'active' ? <CheckCircle size={14} /> : <Clock size={14} />}
                           </div>
                        </div>
                        
                        {/* Middle Row: Pass Type & Accommodation */}
                        <div className="flex flex-col gap-3 pl-6">
                           <div>
                              <span className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-sm ${getPassStyle(ticket.passType)}`}>
                                 {translatePassDisplay(ticket.passType)}
                              </span>
                           </div>
                           <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-700">{ticket.accommodation === 'None' || !ticket.accommodation ? (t('accNone') || 'Без нощувка') : ticket.accommodation}</span>
                              {hotelPrice > 0 && <span className="text-[12px] font-bold bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">+€{hotelPrice}</span>}
                           </div>
                        </div>

                        {/* Bottom Row: Emailed Badge & Final Price */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-1 w-full pl-6">
                           {ticket.emailSentCount > 0 ? (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1.5 rounded-md tracking-widest border border-emerald-100 shadow-sm"><Mail size={12} /> {ticket.emailSentCount}</span>
                           ) : (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-300 px-2 py-1.5"><Mail size={12} /> 0</span>
                           )}
                           <div className="text-right">
                              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('thFinal') || 'Final Price'}</span>
                              <span className="block text-3xl font-bold text-slate-900 leading-none">€{finalPrice}</span>
                           </div>
                        </div>

                     </div>
                  );
               })}
               {filteredHistory.length === 0 && (
                  <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border border-gray-100">
                     {t('noPaidMobile') || 'No records found'}
                  </div>
               )}
            </div>

         </div>
      </div>
   );
}