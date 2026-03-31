"use client";
import { useState, useMemo } from "react";
import { Search, ShieldAlert, Users } from "lucide-react";
import CustomDropdown from "@/components/CustomDropdown";
import { useTranslations } from 'next-intl';

const getRoleStyle = (role) => {
   const r = (role || '').toLowerCase();
   if (r === 'superadmin') return 'bg-slate-600 text-white border-transparent';
   if (r === 'admin') return 'bg-salsa-pink text-white border-transparent';
   if (r === 'ambassador') return 'bg-teal-300 text-teal-950 border-transparent';
   if (r === 'user') return 'bg-sky-200 text-sky-900 border-transparent';
   return 'bg-gray-200 text-slate-700 border-transparent'; 
};

export default function UsersTab({ users, currentUserId, onStageChange, historyStagedData }) {
   const t = useTranslations('UsersTab');

   const [searchTerm, setSearchTerm] = useState("");
   const [roleFilter, setRoleFilter] = useState("all");

   // Memoize the standard role options to avoid repeating them in 3 different dropdowns
   const baseRoleOptions = useMemo(() => [
      { label: t('roleUser'), value: 'user', isPill: true, colorClass: getRoleStyle('user') },
      { label: t('roleAmbassador'), value: 'ambassador', isPill: true, colorClass: getRoleStyle('ambassador') },
      { label: t('roleAdmin'), value: 'admin', isPill: true, colorClass: getRoleStyle('admin') },
      { label: t('roleSuperAdmin'), value: 'superadmin', isPill: true, colorClass: getRoleStyle('superadmin') }
   ], [t]);

   // Memoize filtered users for performance
   const filteredUsers = useMemo(() => {
      const lowerSearch = searchTerm.toLowerCase();
      return users.filter(u =>
         (u.displayName?.toLowerCase().includes(lowerSearch) || u.email?.toLowerCase().includes(lowerSearch)) &&
         (roleFilter === "all" || u.role === roleFilter)
      );
   }, [users, searchTerm, roleFilter]);

   return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
         {/* FILTERS */}
         <div className="flex flex-col xl:flex-row gap-4">
            <div className="relative flex-grow group">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
               <input 
                  type="text" 
                  value={searchTerm} 
                  placeholder={t('searchPlaceholder')} 
                  className="input-standard w-full" 
                  onChange={e => setSearchTerm(e.target.value)} 
               />
            </div>
            <div className="relative w-full xl:w-auto">
               <CustomDropdown
                  icon={ShieldAlert} 
                  value={roleFilter} 
                  onChange={setRoleFilter}
                  options={[
                     { label: t('roleAll'), value: 'all', isPill: true, colorClass: getRoleStyle('all') },
                     ...baseRoleOptions
                  ]}
                  variant="filter"
               />
            </div>
         </div>

         {/* DESKTOP TABLE */}
         <div className="hidden lg:block bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="overflow-x-auto w-full pb-40">
               <table className="w-full text-left border-separate border-spacing-0 min-w-[900px] font-montserrat relative">
                  <thead className="bg-white text-[11px] font-bold uppercase text-slate-400 tracking-widest relative z-10">
                     <tr>
                        <th className="p-6 pl-10 font-bold w-1/4 rounded-tl-[3rem] border-b border-gray-100">{t('thName')}</th>
                        <th className="p-6 font-bold w-48 border-b border-gray-100">{t('thTag')}</th>
                        <th className="p-6 font-bold w-1/4 border-b border-gray-100">{t('thEmail')}</th>
                        <th className="p-6 pl-16 text-left font-bold w-56 rounded-tr-[3rem] border-b border-gray-100">{t('thRole')}</th>
                     </tr>
                  </thead>
                  <tbody className="uppercase text-xs">
                     {filteredUsers.map((u) => {
                        const isMySuperAdmin = currentUserId === u.id && u.role === 'superadmin';
                        const displayRole = historyStagedData?.[`users_${u.id}`]?.role || u.role;

                        return (
                           <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="p-6 pl-10 align-middle border-b border-gray-50">
                                 <span className="block text-base font-bold font-montserrat text-slate-700 tracking-wide">
                                    {u.displayName || t('lblUnregistered')}
                                 </span>
                              </td>
                              <td className="p-6 align-middle border-b border-gray-50">
                                 {u.role === 'ambassador' && u.ambassadorDisplayName ? (
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest">
                                       <Users size={12} className="text-slate-400" /> {u.ambassadorDisplayName}
                                    </span>
                                 ) : (
                                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">-</span>
                                 )}
                              </td>
                              <td className="p-6 align-middle text-slate-500 lowercase font-bold text-sm tracking-wide border-b border-gray-50">
                                 {u.email}
                              </td>
                              <td className="p-6 pl-16 pr-12 align-middle border-b border-gray-50">
                                 <div className="flex justify-start">
                                    <CustomDropdown
                                       value={displayRole}
                                       onChange={(val) => onStageChange('users', u.id, { role: val })}
                                       disabled={isMySuperAdmin} 
                                       title={isMySuperAdmin ? t('tooltipCantDemote') : t('tooltipStage')} 
                                       hideChevron={isMySuperAdmin}
                                       options={baseRoleOptions}
                                       variant="pill"
                                    />
                                 </div>
                              </td>
                           </tr>
                        )
                     })}
                     {filteredUsers.length === 0 && (
                        <tr>
                           <td colSpan="4" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-gray-50">
                              {t('emptyMsg')}
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {/* MOBILE CARDS */}
         <div className="lg:hidden flex flex-col gap-4 pb-20">
            {filteredUsers.map((u) => {
               const isMySuperAdmin = currentUserId === u.id && u.role === 'superadmin';
               const displayRole = historyStagedData?.[`users_${u.id}`]?.role || u.role;

               return (
                  <div key={u.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4 relative overflow-visible">
                     <div>
                        <span className="block text-lg font-black font-montserrat text-slate-900 tracking-wide">
                           {u.displayName || t('lblUnregistered')}
                        </span>
                        <span className="block text-sm font-bold text-slate-500 lowercase mt-0.5">{u.email}</span>
                     </div>
                     <div className="flex items-center w-full relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">{t('thTag')}</span>
                        <div className="flex-grow border-b-2 border-dotted border-gray-200 mx-3 relative top-[1px]"></div>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 shrink-0">
                           <Users size={12} className="text-slate-400" />
                           {u.role === 'ambassador' && u.ambassadorDisplayName ? u.ambassadorDisplayName : <span className="text-slate-300">-</span>}
                        </span>
                     </div>
                     <div className="flex items-center justify-between pt-4 border-t border-gray-50 w-full relative z-20">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('thRole')}</span>
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
         </div>
      </div>
   );
}