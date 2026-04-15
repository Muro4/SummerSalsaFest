"use client";
import { useState, useMemo } from "react";
import { Search, ShieldAlert, Users, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import CustomDropdown from "@/components/CustomDropdown";
import { useTranslations } from 'next-intl';

const getRoleStyle = (role) => {
   const r = (role || '').toLowerCase();
   if (r === 'superadmin') return 'bg-slate-600 text-white border-transparent';
   if (r === 'admin') return 'bg-salsa-pink text-white border-transparent';
   if (r === 'scanner') return 'bg-amber-400 text-amber-950 border-transparent';
   if (r === 'ambassador') return 'bg-teal-300 text-teal-950 border-transparent';
   if (r === 'user') return 'bg-sky-200 text-sky-900 border-transparent';
   return 'bg-gray-200 text-slate-700 border-transparent'; 
};

export default function UsersTab({ users = [], currentUserId, onStageChange, historyStagedData }) {
   const t = useTranslations('UsersTab');

   const [searchTerm, setSearchTerm] = useState("");
   const [roleFilter, setRoleFilter] = useState("all");
   
   // Pagination state setup
   const [currentPage, setCurrentPage] = useState(1);
   const itemsPerPage = 20;

   // Memoize the standard role options to avoid repeating them
   const baseRoleOptions = useMemo(() => [
      { label: t('roleUser') || 'User', value: 'user', isPill: true, colorClass: getRoleStyle('user') },
      { label: t('roleAmbassador') || 'Ambassador', value: 'ambassador', isPill: true, colorClass: getRoleStyle('ambassador') },
      { label: t('roleScanner') || 'Scanner', value: 'scanner', isPill: true, colorClass: getRoleStyle('scanner') },
      { label: t('roleAdmin') || 'Admin', value: 'admin', isPill: true, colorClass: getRoleStyle('admin') },
      { label: t('roleSuperAdmin') || 'Super Admin', value: 'superadmin', isPill: true, colorClass: getRoleStyle('superadmin') }
   ], [t]);

   const safeUsers = Array.isArray(users) ? users : [];

   // Memoize filtering, searching, and pagination reset
   const filteredUsers = useMemo(() => {
      const results = safeUsers.filter(u => {
         const displayRole = historyStagedData?.[`users_${u.id}`]?.role || u.role || 'user';
         
         const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                               (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
         
         const matchesRole = roleFilter === "all" || displayRole === roleFilter;

         return matchesSearch && matchesRole;
      });

      // Sort alphabetically by name
      results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      // Reset to page 1 if a filter changes and the current page is now empty
      if (currentPage > Math.ceil(results.length / itemsPerPage) && results.length > 0) {
        setCurrentPage(1);
      }
      return results;
   }, [safeUsers, historyStagedData, searchTerm, roleFilter, currentPage, itemsPerPage]);

   // Pagination calculations
   const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
   const startIndex = (currentPage - 1) * itemsPerPage;
   const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

   // Helper to generate the numbered tabs for pagination
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

   // Reset pagination when searching
   const handleSearch = (e) => {
     setSearchTerm(e.target.value);
     setCurrentPage(1);
   };

   return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
         
         {/* Search and Filters Section */}
         <div className="flex flex-col xl:flex-row gap-4 mb-8 w-full relative z-40 px-0">
            <div className="relative flex-grow group w-full lg:min-w-[400px]">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
               <input 
                 type="text" 
                 value={searchTerm} 
                 placeholder={t('searchPlaceholder') || "Search by name or email..."} 
                 className="w-full p-5 pl-14 bg-white border border-gray-200 rounded-2xl font-bold text-xs uppercase outline-none focus:border-slate-900 transition-all font-montserrat text-slate-900 shadow-sm" 
                 onChange={handleSearch} 
               />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto shrink-0 z-40">
               <div className="relative w-full sm:w-auto">
                  <CustomDropdown 
                     icon={Filter} 
                     value={roleFilter} 
                     onChange={(val) => { setRoleFilter(val); setCurrentPage(1); }} 
                     options={[
                        { label: t('filterAll') || 'All Roles', value: 'all' }, 
                        ...baseRoleOptions
                     ]} 
                     variant="filter"
                  />
               </div>
            </div>
         </div>

         {/* Desktop Table View */}
         <div className="hidden lg:flex flex-col bg-white rounded-[3rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10 overflow-hidden">
            <div 
               className="w-full overflow-x-auto"
               style={{ minHeight: paginatedUsers.length > 0 && paginatedUsers.length < 4 ? '420px' : 'auto' }}
            >
               <table className="w-full text-left border-separate border-spacing-0 font-montserrat relative">
                  <thead className="bg-white text-[11px] font-bold uppercase text-slate-400 tracking-widest relative z-10">
                     <tr>
                        <th className="p-6 pl-10 font-bold w-1/3 border-b border-gray-100">{t('thUser') || 'User'}</th>
                        <th className="p-6 font-bold w-1/3 border-b border-gray-100">{t('thEmail') || 'Email'}</th>
                        <th className="p-6 font-bold w-48 border-b border-gray-100">{t('thAmbassador') || 'Ambassador Tag'}</th>
                        <th className="p-6 pr-10 font-bold text-right w-48 border-b border-gray-100">{t('thRole') || 'System Role'}</th>
                     </tr>
                  </thead>
                  <tbody className="uppercase text-xs">
                     {paginatedUsers.map((u) => {
                        const displayRole = historyStagedData?.[`users_${u.id}`]?.role || u.role || 'user';
                        const isMySuperAdmin = displayRole === 'superadmin' && u.id === currentUserId;

                        return (
                           <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="p-6 pl-10 align-middle border-b border-gray-50">
                                 <span className="block text-base font-bold font-montserrat text-slate-700 tracking-wide truncate">{u.name}</span>
                              </td>
                              <td className="p-6 align-middle border-b border-gray-50">
                                 <span className="text-[11px] font-bold text-slate-400 tracking-widest lowercase">{u.email}</span>
                              </td>
                              <td className="p-6 align-middle border-b border-gray-50">
                                 {displayRole === 'ambassador' && u.ambassadorDisplayName ? (
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest">
                                       <Users size={12} className="text-slate-400" /> {u.ambassadorDisplayName}
                                    </span>
                                 ) : (
                                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">-</span>
                                 )}
                              </td>
                              <td className="p-6 pr-10 align-middle text-right border-b border-gray-50">
                                 <div className="flex justify-end relative">
                                    {isMySuperAdmin && <ShieldAlert size={16} className="absolute -left-6 top-1/2 -translate-y-1/2 text-slate-300" title="You cannot change your own superadmin role" />}
                                    <CustomDropdown
                                       value={displayRole} 
                                       onChange={(val) => onStageChange('users', u.id, { role: val })} 
                                       disabled={isMySuperAdmin} 
                                       hideChevron={isMySuperAdmin}
                                       options={baseRoleOptions}
                                       variant="pill"
                                    />
                                 </div>
                              </td>
                           </tr>
                        )
                     })}
                     {paginatedUsers.length === 0 && <tr><td colSpan="4" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-gray-50">{t('emptyMsg')}</td></tr>}
                  </tbody>
               </table>
            </div>

            {/* Pagination controls for desktop */}
            {filteredUsers.length > itemsPerPage && (
              <div className="flex items-center justify-between p-4 md:px-8 border-t border-gray-100 bg-slate-50/50">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                   Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
                </span>
                
                <div className="flex items-center gap-1">
                   <button 
                     onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                     disabled={currentPage === 1}
                     className="p-2 rounded-xl text-slate-600 hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent disabled:cursor-not-allowed transition-all cursor-pointer"
                   >
                     <ChevronLeft size={16} />
                   </button>
                   
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

         {/* Mobile Card View */}
         <div className="lg:hidden flex flex-col gap-4 relative z-10 pb-20">
            {paginatedUsers.map((u, index) => {
               const displayRole = historyStagedData?.[`users_${u.id}`]?.role || u.role || 'user';
               const isMySuperAdmin = displayRole === 'superadmin' && u.id === currentUserId;

               return (
                  <div key={u.id} style={{ zIndex: paginatedUsers.length - index }} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-visible">
                     <div className="flex flex-col gap-1">
                        <span className="block text-lg font-black font-montserrat text-slate-900 uppercase leading-tight tracking-widest break-words">
                           {u.name}
                        </span>
                        <span className="block text-[11px] font-bold text-slate-400 tracking-widest lowercase break-words">
                           {u.email}
                        </span>
                     </div>
                     <div className="flex items-center w-full mt-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">{t('thAmbassador') || 'Ambassador'}</span>
                        <div className="flex-grow border-b-2 border-dotted border-gray-200 mx-3 relative top-[1px]"></div>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 shrink-0">
                           <Users size={12} className="text-slate-400" />
                           {displayRole === 'ambassador' && u.ambassadorDisplayName ? u.ambassadorDisplayName : <span className="text-slate-300">-</span>}
                        </span>
                     </div>
                     <div className="flex items-center justify-between pt-4 border-t border-gray-50 w-full relative z-20">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                           {t('thRole') || 'Role'}
                           {isMySuperAdmin && <ShieldAlert size={14} className="text-slate-300" />}
                        </span>
                        <div className="scale-[0.85] origin-right">
                           <CustomDropdown
                              value={displayRole} 
                              onChange={(val) => onStageChange('users', u.id, { role: val })} 
                              disabled={isMySuperAdmin} 
                              hideChevron={isMySuperAdmin}
                              options={baseRoleOptions}
                              variant="pill"
                           />
                        </div>
                     </div>
                  </div>
               );
            })}
            
            {filteredUsers.length === 0 && (
               <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border border-gray-100">
                  {t('emptyMsg')}
               </div>
            )}

            {/* Pagination controls for mobile */}
            {filteredUsers.length > itemsPerPage && (
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