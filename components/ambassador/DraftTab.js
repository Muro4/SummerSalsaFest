"use client";
import { useState, useEffect } from "react";
import { Search, Filter, Trash2, Plus, ArrowRight, Ticket } from "lucide-react";
import CustomDropdown from "@/components/CustomDropdown";
import { usePopup } from "@/components/PopupProvider";

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
const getPrice = (type) => {
   const t = (type || '').toLowerCase();
   if (t.includes('full')) return 150;
   if (t.includes('party')) return 80;
   if (t.includes('day')) return 60;
   return 0;
};
const getPassStyle = (type) => `${getPassBgColor(type)} ${getPassTextColor(type)} border-transparent`;
const draftPassTypes = ["Full Pass", "Party Pass", "Day Pass"];

export default function DraftTab({ groupRows, saveRoster, submitGroupToCart }) {
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

   const draftTotal = groupRows.reduce((acc, row) => acc + getPrice(row.type), 0);

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
      if (count < 1) { showPopup({ type: "error", title: "Invalid Amount", message: "You must add at least 1 row.", confirmText: "OK" }); return; }
      if (groupRows.length + count > 100) { showPopup({ type: "error", title: "Limit Reached", message: "The maximum draft size is 100 passes.", confirmText: "Got It" }); return; }
      const newRows = Array.from({ length: count }).map((_, i) => ({ id: Date.now() + i, name: "", type: "Full Pass" }));
      saveRoster([...groupRows, ...newRows]);
      setBulkAddCount(1);
   };

   const confirmMassDelete = () => {
      showPopup({
         type: "info", title: "Delete Rows?", message: `Are you sure you want to delete ${selectedDrafts.length} selected row(s)?`, confirmText: "Yes, Delete", cancelText: "Cancel",
         onConfirm: () => {
            saveRoster(groupRows.filter(row => !selectedDrafts.includes(row.id)));
            setSelectedDrafts([]);
            
            // Clean up errors for deleted rows
            setRowErrors(prev => {
               const newErrs = { ...prev };
               selectedDrafts.forEach(id => delete newErrs[id]);
               return newErrs;
            });
         }
      });
   };

   const confirmRemoveRow = (id, name) => {
      showPopup({
         type: "info", title: "Delete Row?", message: `Are you sure you want to remove ${name ? `'${name.toUpperCase()}'` : "this empty row"}?`, confirmText: "Yes, Delete", cancelText: "Cancel",
         onConfirm: () => {
            saveRoster(groupRows.filter(row => row.id !== id));
            setSelectedDrafts(prev => prev.filter(rowId => rowId !== id));
            
            // Clean up error state
            setRowErrors(prev => {
               const newErrs = { ...prev };
               delete newErrs[id];
               return newErrs;
            });
         }
      });
   };

   const updateRow = (id, field, value) => saveRoster(groupRows.map(row => row.id === id ? { ...row, [field]: value } : row));

   // Inline Validation Logic (Triggered onBlur)
   const validateRowName = (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) {
         setRowErrors(prev => ({ ...prev, [id]: "Name is required" }));
         return false;
      }
      if (trimmed.length < 2) {
         setRowErrors(prev => ({ ...prev, [id]: "Min 2 letters" }));
         return false;
      }
      const nameRegex = /^[\p{L}\s\-']+$/u;
      if (!nameRegex.test(trimmed)) {
         setRowErrors(prev => ({ ...prev, [id]: "Letters only" }));
         return false;
      }
      // Clear error if valid
      setRowErrors(prev => {
         const newErrs = { ...prev };
         delete newErrs[id];
         return newErrs;
      });
      return true;
   };

   const handleNameChange = (id, newName) => {
      // Force uppercase immediately
      const forcedUpper = newName.toUpperCase();
      updateRow(id, 'name', forcedUpper);
      
      // Clear active error while they type
      if (rowErrors[id]) {
         setRowErrors(prev => {
            const newErrs = { ...prev };
            delete newErrs[id];
            return newErrs;
         });
      }
   };

   return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
         
         {/* SEARCH & FILTERS */}
         <div className="flex flex-col xl:flex-row gap-3 md:gap-4 mb-6 md:mb-8 w-full relative z-40 px-0">
            <div className="relative flex-grow group">
               <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
               <input type="text" maxLength={50} placeholder="SEARCH DRAFT NAMES..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full p-4 md:p-5 pl-12 md:pl-14 bg-white border border-gray-200 rounded-2xl font-bold text-[10px] md:text-xs uppercase outline-none focus:border-slate-900 transition-all font-montserrat text-slate-900 shadow-sm" />
            </div>
            <div className="relative w-full xl:w-auto z-40">
               <CustomDropdown value={passFilter} onChange={setPassFilter} icon={Ticket} options={[{ label: 'All Passes', value: 'All', isPill: true, colorClass: getPassStyle('All') }, { label: 'Full Pass', value: 'Full Pass', isPill: true, colorClass: getPassStyle('Full Pass') }, { label: 'Party Pass', value: 'Party Pass', isPill: true, colorClass: getPassStyle('Party Pass') }, { label: 'Day Pass', value: 'Day Pass', isPill: true, colorClass: getPassStyle('Day Pass') }]} variant="filter" />
            </div>
         </div>

         {/* DATA CONTAINER */}
         <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative z-10">
            <div className="p-5 md:p-10 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-4 md:gap-6 shrink-0 rounded-t-[2rem] md:rounded-t-[3rem]">
               <div>
                  <h2 className="font-bebas text-3xl md:text-4xl text-slate-900 uppercase tracking-wide">Pending Group</h2>
                  <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1 font-montserrat">Draft names and select passes. Changes save automatically.</p>
               </div>
               <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] md:text-[11px] font-bold uppercase text-slate-400 tracking-widest font-montserrat">Drafted:</span>
                     <span className={`font-bebas text-2xl md:text-3xl leading-none ${groupRows.length >= 100 ? 'text-red-500' : 'text-slate-900'}`}>{groupRows.length}/100</span>
                  </div>
                  <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                     <input type="number" min="1" max="100" maxLength={3} value={bulkAddCount} onChange={(e) => setBulkAddCount(e.target.value)} className="w-12 md:w-16 px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-bold text-center outline-none bg-transparent text-slate-900 font-montserrat" />
                     <button onClick={handleBulkAdd} className="cursor-pointer bg-slate-900 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-black text-[10px] md:text-[11px] uppercase flex items-center justify-center gap-1 md:gap-2 hover:bg-salsa-pink hover:scale-105 transition-all duration-300 font-montserrat"><Plus size={14} /> Add</button>
                  </div>
               </div>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block overflow-x-auto w-full flex-grow pb-40">
               <table className="w-full text-left border-separate border-spacing-0 min-w-[800px] font-montserrat relative">
                  <thead className="bg-white text-[11px] font-bold uppercase text-slate-400 tracking-widest relative z-10">
                     <tr>
                        <th className="p-6 pl-10 font-bold w-20 border-b border-gray-100">
                           <div className="flex items-center gap-3">
                              <input type="checkbox" className="w-4 h-4 accent-slate-900 rounded cursor-pointer hover:scale-110 transition-transform" checked={selectedDrafts.length > 0 && selectedDrafts.length === filteredDrafts.length} onChange={handleSelectAll} />
                              {selectedDrafts.length > 0 && <span className="text-slate-700 font-bold absolute ml-6 whitespace-nowrap">{selectedDrafts.length} Selected</span>}
                           </div>
                        </th>
                        <th className="p-6 font-bold w-1/3 border-b border-gray-100">Legal Name (As Per ID)</th>
                        <th className="p-6 font-bold text-center border-b border-gray-100">Pass Selection</th>
                        <th className="p-6 font-bold text-right w-32 border-b border-gray-100">Price</th>
                        <th className="p-6 pr-10 text-right font-bold w-24 border-b border-gray-100">
                           {selectedDrafts.length > 0 && <button onClick={confirmMassDelete} title="Delete Selected" className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg flex items-center justify-end ml-auto transition-colors cursor-pointer"><Trash2 size={24} /></button>}
                        </th>
                     </tr>
                  </thead>
                  <tbody className="uppercase text-xs font-bold text-slate-900">
                     {filteredDrafts.map((row, index) => (
                        <tr key={row.id} className={`transition-colors group ${selectedDrafts.includes(row.id) ? 'bg-slate-100/80' : 'hover:bg-slate-50/50'}`}>
                           <td className="p-6 pl-10 cursor-pointer align-middle border-b border-gray-50" onMouseDown={() => handleMouseDownOnRow(row.id)} onMouseEnter={() => handleMouseEnterOnRow(row.id)}>
                              <div className="flex items-center gap-4 pointer-events-none h-full mt-1">
                                 <input type="checkbox" className="w-4 h-4 accent-slate-900 rounded cursor-pointer pointer-events-auto hover:scale-110 transition-transform" checked={selectedDrafts.includes(row.id)} readOnly />
                                 <span className={`text-[11px] font-black w-6 text-right ${selectedDrafts.includes(row.id) ? 'text-slate-900' : 'text-slate-500'}`}>{index + 1}.</span>
                              </div>
                           </td>
                           <td className="p-6 align-middle border-b border-gray-50">
                              <div className="relative w-full max-w-[280px]">
                                 <input 
                                    type="text" 
                                    maxLength={50} 
                                    value={row.name} 
                                    placeholder="ATTENDEE NAME" 
                                    onChange={(e) => handleNameChange(row.id, e.target.value)} 
                                    onBlur={() => validateRowName(row.id, row.name)}
                                    className={`w-full p-3 bg-gray-50 border ${rowErrors[row.id] ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'} rounded-xl outline-none focus:bg-white font-bold uppercase text- tracking-wide text-slate-900 transition-all shadow-inner text-left font-montserrat`} 
                                 />
                                 {rowErrors[row.id] && (
                                    <span className="absolute -bottom-5 left-2 text-[9px] font-black uppercase tracking-widest text-red-500 animate-in fade-in zoom-in duration-200">
                                       {rowErrors[row.id]}
                                    </span>
                                 )}
                              </div>
                           </td>
                           <td className="p-6 align-middle border-b border-gray-50">
                              <div className="flex justify-center w-full">
                                 <div className="relative flex items-center bg-gray-100 p-1.5 rounded-full w-full min-w-[320px] shadow-inner">
                                    <div className={`absolute top-1.5 bottom-1.5 w-[calc((100%-0.75rem)/3)] rounded-full transition-all duration-300 ease-out shadow-sm ${getPassBgColor(row.type)}`} style={{ left: `calc(0.375rem + ${draftPassTypes.indexOf(row.type)} * ((100% - 0.75rem) / 3))` }} />
                                    {draftPassTypes.map((type) => (
                                       <button key={type} onClick={() => updateRow(row.id, 'type', type)} className={`relative z-10 flex-1 py-2 text-[11px] font-sans font-black uppercase tracking-widest transition-colors duration-300 cursor-pointer ${row.type === type ? getPassTextColor(type) : 'text-gray-400 hover:text-gray-700'}`}>{type}</button>
                                    ))}
                                 </div>
                              </div>
                           </td>
                           <td className="p-6 text-right font-bold text-base text-slate-700 align-middle border-b border-gray-50">€{getPrice(row.type)}</td>
                           <td className="p-6 pr-10 text-right align-middle border-b border-gray-50">
                              <div className="flex items-center justify-end h-full mt-1">
                                 <button onClick={() => confirmRemoveRow(row.id, row.name)} title="Delete Row" className="text-gray-400 opacity-40 group-hover:opacity-100 hover:!text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all duration-300 hover:scale-110 cursor-pointer"><Trash2 size={18} /></button>
                              </div>
                           </td>
                        </tr>
                     ))}
                     {filteredDrafts.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest font-montserrat border-b border-gray-50">No drafts found. Try adding rows.</td></tr>}
                  </tbody>
               </table>
            </div>

            {/* MOBILE CARDS */}
            {/* Removed overflow-hidden from parent so z-index stacking allows dropdowns to break out */}
            <div className="lg:hidden flex flex-col gap-3 p-3 sm:p-4 bg-slate-50 border-t border-gray-100 flex-grow pb-24">
               {filteredDrafts.map((row, index) => (
                  <div 
                     key={row.id} 
                     // THE FIX: Dynamically set z-index so the first items are higher than the later items
                     style={{ zIndex: filteredDrafts.length - index }} 
                     className={`bg-white rounded-3xl p-4 sm:p-5 border shadow-sm flex flex-col gap-3 relative overflow-visible transition-colors ${selectedDrafts.includes(row.id) ? 'ring-2 ring-slate-900 bg-slate-50' : 'border-gray-100'}`}
                  >
                     
                     {/* Top Row: Checkbox, Name Input, Inline Trash */}
                     <div className="flex items-start gap-3 w-full">
                        <div className="flex flex-col items-center gap-1.5 mt-2.5 cursor-pointer shrink-0" onClick={() => handleMouseDownOnRow(row.id)}>
                           <span className="text-[10px] font-black text-slate-400">{index + 1}.</span>
                           <input type="checkbox" className="w-4 h-4 accent-slate-900 rounded pointer-events-none" checked={selectedDrafts.includes(row.id)} readOnly />
                        </div>
                        <div className="flex-1 min-w-0 relative">
                           <input 
                              type="text" 
                              maxLength={50} 
                              value={row.name} 
                              placeholder="ATTENDEE NAME" 
                              onChange={(e) => handleNameChange(row.id, e.target.value)} 
                              onBlur={() => validateRowName(row.id, row.name)}
                              className={`w-full p-3 pr-10 bg-gray-50 border ${rowErrors[row.id] ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'} rounded-xl outline-none focus:bg-white font-bold uppercase text-xs sm:text-sm text-slate-900 transition-all font-montserrat shadow-inner`} 
                           />
                           <button onClick={() => confirmRemoveRow(row.id, row.name)} className="absolute top-1/2 -translate-y-1/2 right-2 text-gray-400 hover:text-red-500 p-2 rounded-lg transition-all cursor-pointer z-10 bg-gray-50 hover:bg-red-50">
                              <Trash2 size={16} />
                           </button>
                           {rowErrors[row.id] && (
                              <span className="absolute -bottom-4 left-2 text-[9px] font-black uppercase tracking-widest text-red-500 animate-in fade-in zoom-in duration-200">
                                 {rowErrors[row.id]}
                              </span>
                           )}
                        </div>
                     </div>

                     {/* Bottom Row: Dropdown and Price */}
                     <div className="flex items-center justify-between w-full relative z-50 pl-7 mt-1">
                        <div className="w-[140px] sm:w-[160px] relative z-50">
                           <CustomDropdown
                              value={row.type} variant="pill"
                              onChange={(val) => updateRow(row.id, 'type', val)}
                              options={[{ label: 'Full Pass', value: 'Full Pass', colorClass: 'bg-salsa-pink text-white' }, { label: 'Party Pass', value: 'Party Pass', colorClass: 'bg-violet-600 text-white' }, { label: 'Day Pass', value: 'Day Pass', colorClass: 'bg-teal-300 text-teal-950' }]}
                           />
                        </div>
                        <span className="text-xl font-black text-slate-700 leading-none">€{getPrice(row.type)}</span>
                     </div>
                  </div>
               ))}
               {filteredDrafts.length === 0 && <div className="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border border-gray-100">No drafts found.</div>}
            </div>

            <div className="p-5 md:p-8 bg-slate-50 border-t border-gray-100 flex flex-col md:flex-row justify-between md:justify-end items-center gap-4 md:gap-6 shrink-0 mt-auto md:rounded-b-[3rem] relative z-10">
               {selectedDrafts.length > 0 && (
                  <button onClick={confirmMassDelete} className="w-full md:w-auto text-red-500 hover:text-white hover:bg-red-500 border border-red-500 px-6 py-3 md:py-4 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-sm cursor-pointer">
                     Delete Selected ({selectedDrafts.length})
                  </button>
               )}
               <div className="text-center md:text-right w-full md:w-auto">
                  <span className="block text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest font-montserrat">Total Amount</span>
                  <span className="block font-montserrat text-3xl md:text-4xl font-black text-slate-900">€{draftTotal}</span>
               </div>
               <button 
                  onClick={submitGroupToCart} 
                  disabled={groupRows.length === 0 || groupRows.some(r => !r.name || rowErrors[r.id])} 
                  className="w-full md:w-auto cursor-pointer bg-slate-900 text-white font-black px-8 py-4 md:px-10 rounded-2xl shadow-xl hover:bg-emerald-500 hover:shadow-emerald-500/20 transition-all duration-300 tracking-widest text-[10px] md:text-[11px] uppercase flex items-center justify-center gap-2 md:gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-montserrat"
               >
                  Send to Cart <ArrowRight size={16} />
               </button>
            </div>
         </div>
      </div>
   );
}