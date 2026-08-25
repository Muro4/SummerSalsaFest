"use client";
import { useState, useEffect } from "react";
import { Search, Trash2, Plus, Ticket, ShieldCheck, ChevronDown } from "lucide-react";
import CustomDropdown from "@/components/CustomDropdown";
import { usePopup } from "@/components/PopupProvider";
import { useTranslations } from 'next-intl';

// Styling helpers
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

// Pricing & Commission Logic
const getPrice = (type) => {
   if (type === 'Full Pass') return 150;
   if (type === 'Performers Pass') return 85;
   return 0; // Free Full Pass
};

const getCommission = (type) => {
   if (type === 'Full Pass') return 10;
   return 0;
};

const getHotelPrice = (hotel) => {
   if (hotel === 'Detelina') return 180;
   if (hotel === 'Toro Negro') return 130;
   if (hotel === 'Kabakum') return 150;
   if (hotel === 'ВСУ') return 70;
   return 0;
};

export default function DraftTab({ groupRows, saveRoster, submitGroupToCart }) {
   const t = useTranslations('DraftTab');

   // Translated accommodation options
   const accommodationOptions = [
      { label: t('accNone') || 'Без нощувка', value: 'None' },
      { label: 'Detelina', value: 'Detelina' },
      { label: 'Toro Negro', value: 'Toro Negro' },
      { label: 'Kabakum', value: 'Kabakum' },
      { label: 'ВСУ', value: 'ВСУ' }
   ];

   const [searchQuery, setSearchQuery] = useState("");
   const [passFilter, setPassFilter] = useState("All");
   const [bulkAddCount, setBulkAddCount] = useState(1);

   // Drag-to-Select States
   const [selectedDrafts, setSelectedDrafts] = useState([]);
   const [isDragging, setIsDragging] = useState(false);
   const [dragMode, setDragMode] = useState(true);

   // Inline Row Validation State
   const [rowErrors, setRowErrors] = useState({});

   const { showPopup } = usePopup();

   const filteredDrafts = groupRows.filter(r => {
      const matchesSearch = r.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPass = passFilter === "All" || (r.type || "").toLowerCase() === passFilter.toLowerCase();
      return matchesSearch && matchesPass;
   });

   // Global Math Calculations
   let totalSales = 0;
   let totalCommission = 0;
   groupRows.forEach(row => {
      totalSales += getPrice(row.type) + getHotelPrice(row.accommodation);
      totalCommission += getCommission(row.type);
   });
   const amountOwed = totalSales - totalCommission;

   useEffect(() => {
      const handleMouseUp = () => setIsDragging(false);
      window.addEventListener("mouseup", handleMouseUp);
      return () => window.removeEventListener("mouseup", handleMouseUp);
   }, []);

   const handleMouseDownOnRow = (id) => {
      setIsDragging(true);
      const isCurrentlySelected = selectedDrafts.includes(id);
      const newDragMode = !isCurrentlySelected;
      setDragMode(newDragMode);
      if (newDragMode) setSelectedDrafts(prev => [...new Set([...prev, id])]);
      else setSelectedDrafts(prev => prev.filter(rowId => rowId !== id));
   };

   const handleMouseEnterOnRow = (id) => {
      if (!isDragging) return;
      if (dragMode) setSelectedDrafts(prev => [...new Set([...prev, id])]);
      else setSelectedDrafts(prev => prev.filter(rowId => rowId !== id));
   };

   const handleSelectAll = (e) => {
      if (e.target.checked) setSelectedDrafts(filteredDrafts.map(r => r.id));
      else setSelectedDrafts([]);
   };

   const handleBulkAdd = () => {
      const count = parseInt(bulkAddCount) || 1;
      if (count < 1) {
         showPopup({ type: "error", title: t('errAmountTitle') || "Invalid Amount", message: t('errAmountMsg') || "Please enter a valid number.", confirmText: t('okBtn') || "OK" });
         return;
      }
      if (groupRows.length + count > 100) {
         showPopup({ type: "error", title: t('errLimitTitle') || "Limit Reached", message: t('errLimitMsg') || "You can only draft up to 100 tickets at once.", confirmText: t('gotItBtn') || "Got it" });
         return;
      }

      const newRows = Array.from({ length: count }).map((_, i) => ({
         id: Date.now() + i,
         name: "",
         type: "Full Pass",
         accommodation: "None"
      }));

      saveRoster([...groupRows, ...newRows]);
      setBulkAddCount(1);
   };

   const confirmMassDelete = () => {
      showPopup({
         type: "info",
         title: t('deleteTitle') || "Delete Rows",
         message: t('deleteMsgMass', { count: selectedDrafts.length }) || `Are you sure you want to delete ${selectedDrafts.length} row(s)?`,
         confirmText: t('deleteBtn') || "Delete",
         cancelText: t('cancelBtn') || "Cancel",
         onConfirm: () => {
            saveRoster(groupRows.filter(row => !selectedDrafts.includes(row.id)));
            setSelectedDrafts([]);
            setRowErrors(prev => {
               const newErrs = { ...prev };
               selectedDrafts.forEach(id => delete newErrs[id]);
               return newErrs;
            });
         }
      });
   };

   const confirmRemoveRow = (id, name) => {
      const displayMsg = name ? (t('deleteMsgSingle', { name: name.toUpperCase() }) || `Remove ${name.toUpperCase()} from roster?`) : (t('deleteMsgEmpty') || "Delete this empty row?");
      showPopup({
         type: "info",
         title: t('deleteTitle') || "Delete Row",
         message: displayMsg,
         confirmText: t('deleteBtn') || "Delete",
         cancelText: t('cancelBtn') || "Cancel",
         onConfirm: () => {
            saveRoster(groupRows.filter(row => row.id !== id));
            setSelectedDrafts(prev => prev.filter(rowId => rowId !== id));
            setRowErrors(prev => {
               const newErrs = { ...prev };
               delete newErrs[id];
               return newErrs;
            });
         }
      });
   };

   // MULTI-SELECT MASS UPDATE LOGIC
   const updateRow = (id, field, value) => {
      if (selectedDrafts.length > 1 && selectedDrafts.includes(id)) {
         saveRoster(groupRows.map(row =>
            selectedDrafts.includes(row.id) ? { ...row, [field]: value } : row
         ));
      } else {
         saveRoster(groupRows.map(row => row.id === id ? { ...row, [field]: value } : row));
      }
   };

   const validateRowName = (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) {
         setRowErrors(prev => ({ ...prev, [id]: t('errReq') || "Required" }));
         return false;
      }
      if (trimmed.length < 2) {
         setRowErrors(prev => ({ ...prev, [id]: t('errMin') || "Too short" }));
         return false;
      }
      const nameRegex = /^[\p{L}\s\-']+$/u;
      if (!nameRegex.test(trimmed)) {
         setRowErrors(prev => ({ ...prev, [id]: t('errLetters') || "Letters only" }));
         return false;
      }
      setRowErrors(prev => {
         const newErrs = { ...prev };
         delete newErrs[id];
         return newErrs;
      });
      return true;
   };

   const handleNameChange = (id, newName) => {
      const forcedUpper = newName.toUpperCase();
      // Text inputs only update the single row being typed in, even if multi-selected
      saveRoster(groupRows.map(row => row.id === id ? { ...row, name: forcedUpper } : row));

      if (rowErrors[id]) {
         setRowErrors(prev => {
            const newErrs = { ...prev };
            delete newErrs[id];
            return newErrs;
         });
      }
   };

   const handleRegistrationConfirm = () => {
      if (groupRows.length === 0 || groupRows.some(r => !r.name || rowErrors[r.id])) return;

      const fullCount = groupRows.filter(r => r.type === 'Full Pass').length;
      const perfCount = groupRows.filter(r => r.type === 'Performers Pass').length;
      const freeCount = groupRows.filter(r => r.type === 'Free Full Pass').length;

      const summary = `
${t('summaryDancers') || "DANCERS TO REGISTER"}: ${groupRows.length}
----------------------------------------
• ${t('summaryFull') || "Full Passes"}: ${fullCount}
• ${t('summaryPerf') || "Performers Passes"}: ${perfCount}
• ${t('summaryFree') || "Free Full Passes"}: ${freeCount}

${t('summaryMath') || "MATH BREAKDOWN"}
----------------------------------------
${t('summarySales') || "Sum of Sales"}: €${totalSales}
${t('summaryComm') || "Commission Earned"}: -€${totalCommission}
----------------------------------------
${t('summaryDue') || "AMOUNT DUE TO FESTIVAL"}: €${amountOwed}
      `.trim();

      showPopup({
         type: "info",
         title: t('confirmTitle') || "Confirm Registrations",
         message: summary,
         confirmText: t('confirmSubmit') || "Submit & Activate",
         cancelText: t('btnCancel') || "Cancel",
         onConfirm: () => submitGroupToCart()
      });
   };

   return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">

         {/* SEARCH & FILTERS */}
         <div className="flex flex-col xl:flex-row gap-4 mb-8 w-full relative z-40 px-0">
            <div className="relative flex-grow group">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
               <input type="text" maxLength={50} placeholder={t('searchPlaceholder') || "Search names..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full p-4 pl-14 bg-white border border-gray-200 rounded-2xl font-bold text-xs uppercase outline-none focus:border-slate-900 transition-all font-montserrat text-slate-900 shadow-sm" />
            </div>
            <div className="relative w-full xl:w-auto z-40">
               <CustomDropdown
                  value={passFilter}
                  onChange={setPassFilter}
                  icon={Ticket}
                  options={[
                     { label: t('allPasses') || 'All Passes', value: 'All', isPill: true, colorClass: getPassStyle('All') },
                     { label: t('passFull') || 'Full Pass', value: 'Full Pass', isPill: true, colorClass: getPassStyle('Full Pass') },
                     { label: t('passPerformers') || 'Performers Pass', value: 'Performers Pass', isPill: true, colorClass: getPassStyle('Performers Pass') },
                     { label: t('passFree') || 'Free Full Pass', value: 'Free Full Pass', isPill: true, colorClass: getPassStyle('Free Full Pass') }
                  ]}
                  variant="filter"
               />
            </div>
         </div>

         {/* DATA CONTAINER */}
         <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative z-10">
            <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-6 shrink-0 rounded-t-[2rem] md:rounded-t-[3rem]">
               <div>
                  <h2 className="font-bebas tracking-wide text-3xl md:text-4xl text-slate-900 uppercase tracking-wide">{t('title') || 'Roster Draft'}</h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-500 mt-1 font-montserrat">{t('subtitle') || 'Manage your guest dancer registrations.'}</p>
               </div>
               <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center gap-2">
                     <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat">{t('drafted') || 'Drafted'}</span>
                     <span className={`font-bebas text-3xl leading-none ${groupRows.length >= 100 ? 'text-red-500' : 'text-slate-900'}`}>{groupRows.length}/100</span>
                  </div>
                  <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                     <input type="number" min="1" max="100" maxLength={3} value={bulkAddCount} onChange={(e) => setBulkAddCount(e.target.value)} className="w-16 px-3 py-2 text-xs font-bold text-center outline-none bg-transparent text-slate-900 font-montserrat" />
                     <button onClick={handleBulkAdd} className="cursor-pointer bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-[11px] uppercase flex items-center justify-center gap-2 hover:bg-salsa-pink hover:scale-105 transition-all duration-300 font-montserrat"><Plus size={14} /> {t('btnAdd') || 'Add'}</button>
                  </div>
               </div>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block overflow-x-visible w-full flex-grow pb-16">
               <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px] font-montserrat relative">
                  <thead className="bg-white text-[11px] font-bold uppercase text-slate-500 tracking-widest relative z-10">
                     <tr>
                        <th className="p-4 pl-8 font-bold w-16 border-b border-gray-100">
                           <input type="checkbox" className="w-4 h-4 accent-slate-900 rounded cursor-pointer hover:scale-110 transition-transform" checked={selectedDrafts.length > 0 && selectedDrafts.length === filteredDrafts.length} onChange={handleSelectAll} />
                        </th>
                        <th className="p-4 font-bold w-[30%] border-b border-gray-100">{t('thName') || 'Dancer Name'}</th>
                        <th className="p-4 font-bold w-48 border-b border-gray-100">{t('thPass') || 'Pass Type'}</th>
                        <th className="p-4 font-bold w-56 border-b border-gray-100">{t('thAccomm') || 'Accommodation'}</th>
                        <th className="p-4 font-bold text-right w-32 border-b border-gray-100">{t('thFinal') || 'Final Price'}</th>
                        <th className="p-4 pr-8 text-right font-bold w-16 border-b border-gray-100">
                           {selectedDrafts.length > 0 && <button onClick={confirmMassDelete} title={t('btnDeleteSel') || "Delete Selected"} className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg flex items-center justify-end ml-auto transition-colors cursor-pointer"><Trash2 size={20} /></button>}
                        </th>
                     </tr>
                  </thead>
                  <tbody className="uppercase text-xs font-bold text-slate-900 overflow-visible relative">
                     {filteredDrafts.map((row, index) => {
                        const hotelPrice = getHotelPrice(row.accommodation);
                        const rowBase = getPrice(row.type) + hotelPrice;
                        const rowCommission = getCommission(row.type);
                        const rowFinal = rowBase - rowCommission;

                        return (
                           <tr key={row.id} style={{ position: 'relative', zIndex: 100 - index }} className={`transition-colors group overflow-visible ${selectedDrafts.includes(row.id) ? 'bg-slate-100 shadow-inner' : 'hover:bg-slate-50/50'}`}>
                              <td className="p-4 pl-8 cursor-pointer align-middle border-b border-gray-50" onMouseDown={() => handleMouseDownOnRow(row.id)} onMouseEnter={() => handleMouseEnterOnRow(row.id)}>
                                 <div className="flex items-center gap-3 pointer-events-none h-full">
                                    <input type="checkbox" className="w-4 h-4 accent-slate-900 rounded cursor-pointer pointer-events-auto hover:scale-110 transition-transform" checked={selectedDrafts.includes(row.id)} readOnly />
                                    <span className={`text-[11px] font-bold w-6 text-right ${selectedDrafts.includes(row.id) ? 'text-slate-900' : 'text-slate-400'}`}>{index + 1}.</span>
                                 </div>
                              </td>

                              {/* 1. Name */}
                              <td className="p-4 align-middle border-b border-gray-50 overflow-visible">
                                 <div className="relative w-full">
                                    <input
                                       type="text"
                                       maxLength={50}
                                       value={row.name}
                                       placeholder={t('namePlaceholder') || "Enter Name..."}
                                       onChange={(e) => handleNameChange(row.id, e.target.value)}
                                       onBlur={() => validateRowName(row.id, row.name)}
                                       className={`w-full p-3 bg-white border ${rowErrors[row.id] ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'} rounded-xl outline-none font-bold uppercase tracking-wide text-sm text-slate-900 transition-all shadow-sm text-left font-montserrat`}
                                    />
                                    {rowErrors[row.id] && <span className="absolute -bottom-4 left-2 text-[9px] font-bold uppercase tracking-widest text-red-500 animate-in fade-in zoom-in duration-200">{rowErrors[row.id]}</span>}
                                 </div>
                              </td>

                              {/* 2. Pass Type */}
                              <td className="p-4 align-middle border-b border-gray-50 overflow-visible relative">
                                 <CustomDropdown
                                    value={row.type} variant="pill"
                                    onChange={(val) => updateRow(row.id, 'type', val)}
                                    options={[
                                       { label: t('passFull') || 'Full Pass', value: 'Full Pass', isPill: true, colorClass: getPassStyle('Full Pass') },
                                       { label: t('passPerformers') || 'Performers Pass', value: 'Performers Pass', isPill: true, colorClass: getPassStyle('Performers Pass') },
                                       { label: t('passFree') || 'Free Full Pass', value: 'Free Full Pass', isPill: true, colorClass: getPassStyle('Free Full Pass') }
                                    ]}
                                 />
                              </td>

                              {/* 3. Accommodation (Compact Native Select with text-sm) */}
                              <td className="p-4 align-middle border-b border-gray-50 overflow-visible relative">
                                 <div className="flex items-center gap-3">
                                    <div className="relative w-[150px] shrink-0">
                                       <select
                                          value={row.accommodation}
                                          onChange={(e) => updateRow(row.id, 'accommodation', e.target.value)}
                                          className="w-full appearance-none bg-gray-50 border border-gray-200 text-slate-700 text-sm font-bold rounded-xl px-3 py-2.5 pr-8 outline-none focus:border-slate-900 focus:bg-white transition-all cursor-pointer shadow-sm"
                                       >
                                          {accommodationOptions.map(opt => (
                                             <option key={opt.value} value={opt.value}>{opt.label}</option>
                                          ))}
                                       </select>
                                       <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                          <ChevronDown size={14} />
                                       </div>
                                    </div>
                                    {hotelPrice > 0 && (
                                       <span className="text-[14px] font-regular bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0 shadow-sm">
                                          +€{hotelPrice}
                                       </span>
                                    )}
                                 </div>
                              </td>

                              {/* 4. Final Price */}
                              <td className="p-4 text-right font-bold text-xl text-slate-900 align-middle border-b border-gray-50">€{rowFinal}</td>

                              {/* Trash */}
                              <td className="p-4 pr-8 text-right align-middle border-b border-gray-50">
                                 <div className="flex items-center justify-end h-full">
                                    {selectedDrafts.length <= 1 && (
                                       <button onClick={() => confirmRemoveRow(row.id, row.name)} title="Delete Row" className="text-gray-400 opacity-40 group-hover:opacity-100 hover:!text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all duration-300 hover:scale-110 cursor-pointer"><Trash2 size={18} /></button>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        );
                     })}
                     {filteredDrafts.length === 0 && <tr><td colSpan="6" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest font-montserrat border-b border-gray-50">{t('noDrafts') || 'No drafts found'}</td></tr>}
                  </tbody>
               </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="lg:hidden flex flex-col gap-4 p-4 sm:p-6 bg-slate-50 border-t border-gray-100 flex-grow pb-24 relative z-10">
               {filteredDrafts.map((row, index) => {
                  const hotelPrice = getHotelPrice(row.accommodation);
                  const rowBase = getPrice(row.type) + hotelPrice;
                  const rowCommission = getCommission(row.type);
                  const rowFinal = rowBase - rowCommission;

                  return (
                     <div key={row.id} style={{ zIndex: 100 - index }} className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col gap-4 relative overflow-visible transition-colors ${selectedDrafts.includes(row.id) ? 'bg-slate-100 ring-2 ring-slate-300' : 'border-gray-100'}`}>

                        {/* 1. Checkbox + Name + Trash */}
                        <div className="flex items-start gap-4 w-full">
                           <div className="flex flex-col items-center gap-2 mt-3 cursor-pointer shrink-0" onClick={() => handleMouseDownOnRow(row.id)}>
                              <span className="text-[10px] font-bold text-slate-400">{index + 1}.</span>
                              <input type="checkbox" className="w-4 h-4 accent-slate-900 rounded pointer-events-none" checked={selectedDrafts.includes(row.id)} readOnly />
                           </div>
                           <div className="flex-1 min-w-0 relative">
                              <input
                                 type="text"
                                 maxLength={50}
                                 value={row.name}
                                 placeholder={t('namePlaceholder') || "Enter Name..."}
                                 onChange={(e) => handleNameChange(row.id, e.target.value)}
                                 onBlur={() => validateRowName(row.id, row.name)}
                                 className={`w-full p-3 pr-12 bg-white border ${rowErrors[row.id] ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'} rounded-xl outline-none font-bold uppercase text-sm text-slate-900 transition-all font-montserrat shadow-sm`}
                              />
                              {selectedDrafts.length <= 1 && (
                                 <button onClick={() => confirmRemoveRow(row.id, row.name)} className="absolute top-1/2 -translate-y-1/2 right-2 text-gray-400 hover:text-red-500 p-2 rounded-lg transition-all cursor-pointer z-10 bg-gray-50 hover:bg-red-50"><Trash2 size={16} /></button>
                              )}
                              {rowErrors[row.id] && <span className="absolute -bottom-4 left-2 text-[9px] font-bold uppercase tracking-widest text-red-500 animate-in fade-in zoom-in duration-200">{rowErrors[row.id]}</span>}
                           </div>
                        </div>

                        {/* 2 & 3. Pass Type & Accommodation */}
                        <div className="flex flex-col gap-3 w-full pl-8 relative z-20">
                           <div className="w-full">
                              <CustomDropdown
                                 value={row.type} variant="pill"
                                 onChange={(val) => updateRow(row.id, 'type', val)}
                                 options={[
                                    { label: t('passFull') || 'Full Pass', value: 'Full Pass', colorClass: 'bg-salsa-pink text-white' },
                                    { label: t('passPerformers') || 'Performers', value: 'Performers Pass', colorClass: 'bg-violet-600 text-white' },
                                    { label: t('passFree') || 'Free Pass', value: 'Free Full Pass', colorClass: 'bg-yellow-400 text-yellow-900' }
                                 ]}
                              />
                           </div>

                           <div className="relative z-10 flex items-center gap-3">
                              <div className="relative w-[150px] shrink-0">
                                 <select
                                    value={row.accommodation}
                                    onChange={(e) => updateRow(row.id, 'accommodation', e.target.value)}
                                    className="w-full appearance-none bg-gray-50 border border-gray-200 text-slate-700 text-sm font-bold rounded-xl px-3 py-2.5 pr-8 outline-none focus:border-slate-900 focus:bg-white transition-all cursor-pointer shadow-sm"
                                 >
                                    {accommodationOptions.map(opt => (
                                       <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                 </select>
                                 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={14} />
                                 </div>
                              </div>
                              {hotelPrice > 0 && (
                                 <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0 shadow-sm">+€{hotelPrice}</span>
                              )}
                           </div>
                        </div>

                        {/* 4. Final Price at the bottom */}
                        <div className="flex items-center justify-end w-full pl-8 mt-2 pt-3 border-t border-gray-50">
                           <div className="text-right">
                              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{t('thFinal') || 'Final Price'}</span>
                              <span className="block text-3xl font-black text-slate-900 leading-none">€{rowFinal}</span>
                           </div>
                        </div>
                     </div>
                  );
               })}
               {filteredDrafts.length === 0 && <div className="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border border-gray-100">{t('noDrafts') || 'No drafts found'}</div>}
            </div>

            {/* STICKY BOTTOM BAR (MATH FORMULA) */}
            <div className="p-6 md:p-8 bg-slate-50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 shrink-0 mt-auto md:rounded-b-[3rem] relative z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">

               {/* Left Side: Mass Delete */}
               <div className="w-full md:w-auto flex justify-center md:justify-start">
                  {selectedDrafts.length > 0 ? (
                     <button onClick={confirmMassDelete} className="text-red-500 hover:text-white hover:bg-red-500 border border-red-500 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm cursor-pointer w-full md:w-auto">
                        {t('btnDeleteSel', { count: selectedDrafts.length }) || `Delete ${selectedDrafts.length}`}
                     </button>
                  ) : (
                     <span className="hidden md:block text-slate-400 text-[11px] font-bold uppercase tracking-widest opacity-60 px-2">{t('selectToDelete') || 'Select rows to delete'}</span>
                  )}
               </div>

               {/* Right Side: Formula & Submit */}
               <div className="flex flex-col lg:flex-row items-center gap-8 w-full md:w-auto">

                  {/* The Math Formula */}
                  <div className="flex flex-wrap justify-center md:justify-end items-end gap-3 md:gap-4 w-full md:w-auto">
                     <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('sumSales') || 'Sum of Sales'}</span>
                        <span className="text-xl font-bold text-slate-700">€{totalSales}</span>
                     </div>
                     <span className="text-2xl font-bold text-slate-300 mb-0.5">-</span>
                     <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">{t('commission') || 'Commission'}</span>
                        <span className="text-xl font-bold text-emerald-500">€{totalCommission}</span>
                     </div>
                     <span className="text-2xl font-bold text-slate-300 mb-0.5">=</span>
                     <div className="flex flex-col items-end">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('amountOwed') || 'Amount Owed'}</span>
                        <span className="text-4xl font-black text-slate-900 leading-none">€{amountOwed}</span>
                     </div>
                  </div>

                  <button
                     onClick={handleRegistrationConfirm}
                     disabled={groupRows.length === 0 || groupRows.some(r => !r.name || rowErrors[r.id])}
                     className="w-full md:w-auto cursor-pointer bg-slate-900 text-white font-bold px-8 py-4 rounded-2xl shadow-xl hover:bg-emerald-500 hover:shadow-emerald-500/20 transition-all duration-300 tracking-widest text-[11px] uppercase flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-montserrat shrink-0"
                  >
                     <ShieldCheck size={18} /> {t('btnRegister') || 'Register & Activate'}
                  </button>
               </div>

            </div>
         </div>
      </div>
   );
}