"use client";
import { useEffect, useState, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, updateDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import CustomDropdown from "@/components/CustomDropdown"; 
import { usePopup } from "@/components/PopupProvider";
import Button from "@/components/Button";
import InboxManager from "@/components/admin/InboxManager"; 
import {
   Users, Ticket, Search, Download,
   ShieldAlert, Gift, Filter, CheckCircle,
   Clock, Trash2, Loader2, BarChart3, UserCog,
   Undo2, Redo2, Save, Eye, Mail, ChevronLeft, ChevronRight, Calendar,
   CheckCircle2, AlertTriangle, XCircle 
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

// --- SHARED ROLE STYLING ---
const getRoleBgColor = (role) => {
   const r = (role || '').toLowerCase();
   if (r === 'superadmin') return 'bg-slate-600';
   if (r === 'admin') return 'bg-salsa-pink';
   if (r === 'ambassador') return 'bg-teal-300';
   if (r === 'user') return 'bg-sky-200';
   return 'bg-gray-200'; 
};

const getRoleTextColor = (role) => {
   const r = (role || '').toLowerCase();
   if (r === 'superadmin' || r === 'admin') return 'text-white';
   if (r === 'ambassador') return 'text-teal-950';
   if (r === 'user') return 'text-sky-900';
   return 'text-slate-700';
};

const getRoleStyle = (role) => {
   return `${getRoleBgColor(role)} ${getRoleTextColor(role)} border-transparent`;
};

// Global Date Helpers
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const formatDateDMY = (date) => {
   const d = date.getDate().toString().padStart(2, '0');
   const m = (date.getMonth() + 1).toString().padStart(2, '0');
   const y = date.getFullYear();
   return `${d}.${m}.${y}`;
};

// --- ENLARGED TEXT-BASED STATUS TOGGLE ---
function StatusToggle({ currentStatus, onChange }) {
   if (currentStatus === 'pending') {
     return (
       <div className="flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-500 w-28">
         <AlertTriangle size={16} /> Pending
       </div>
     );
   }
 
   return (
     <button 
       type="button"
       onClick={() => onChange(currentStatus === 'active' ? 'used' : 'active')}
       className="relative block h-7 w-28 overflow-hidden outline-none cursor-pointer hover:opacity-80 active:scale-95 transition-transform"
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

export default function AdminDashboard() {
   const [activeTab, setActiveTab] = useState("analytics");
   const [data, setData] = useState({ users: [], tickets: [] });
   const [loading, setLoading] = useState(true);
   const [isAdmin, setIsAdmin] = useState(false);
   const [saving, setSaving] = useState(false);
   
   const [unreadInboxCount, setUnreadInboxCount] = useState(0);
   
   const router = useRouter();
   const { showPopup } = usePopup();

   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
   const [searchTerm, setSearchTerm] = useState("");
   const [statusFilter, setStatusFilter] = useState("all");
   const [passFilter, setPassFilter] = useState("all");
   const [roleFilter, setRoleFilter] = useState("all");
   
   // --- ANALYTICS FILTERS ---
   const [timeRange, setTimeRange] = useState("week"); 
   const [timeOffset, setTimeOffset] = useState(0); 
   const [chartMetric, setChartMetric] = useState("revenue"); 
   const [manualDateInput, setManualDateInput] = useState("");

   // Undo/Redo/Staging State
   const [history, setHistory] = useState([{}]);
   const [historyIndex, setHistoryIndex] = useState(0);

   // --- INITIAL LISTENER SETUP ---
   useEffect(() => {
      let unsubUsers = () => { };
      let unsubTickets = () => { };
      let unsubMessages = () => { }; 

      const unsubAuth = auth.onAuthStateChanged(async (user) => {
         if (user) {
            const myDoc = await getDoc(doc(db, "users", user.uid));

            if (myDoc.exists() && myDoc.data().role === "superadmin") {
               setIsAdmin(true);

               unsubUsers = onSnapshot(collection(db, "users"), (uS) => {
                  setData(prev => ({ ...prev, users: uS.docs.map(d => ({ id: d.id, ...d.data() })) }));
               });

               unsubTickets = onSnapshot(collection(db, "tickets"), (tS) => {
                  setData(prev => ({ ...prev, tickets: tS.docs.map(d => ({ id: d.id, ...d.data() })) }));
                  setLoading(false);
               });

               unsubMessages = onSnapshot(collection(db, "contact_messages"), (mS) => {
                  const unread = mS.docs.filter(d => d.data().status === "unread").length;
                  setUnreadInboxCount(unread);
               });

            } else {
               router.push("/");
            }
         } else {
            unsubUsers();
            unsubTickets();
            unsubMessages(); 
            router.push("/login");
         }
      });

      return () => {
         unsubAuth();
         unsubUsers();
         unsubTickets();
         unsubMessages(); 
      };
   }, [router]);

   // --- BROWSER REFRESH & IN-APP NAVIGATION PROTECTOR ---
   useEffect(() => {
      const handleBeforeUnload = (e) => {
         if (historyIndex > 0) {
            e.preventDefault();
            e.returnValue = ''; 
         }
      };

      const handleLinkClick = (e) => {
         if (historyIndex === 0) return; 

         const anchor = e.target.closest('a');
         
         if (anchor && anchor.href) {
            const url = new URL(anchor.href);
            const targetPath = url.pathname;
            
            if (targetPath && targetPath !== window.location.pathname) {
               e.preventDefault(); 
               e.stopPropagation();

               showPopup({
                  type: "info",
                  title: "Unsaved Changes",
                  message: "You have unsaved edits! If you leave this page now, your changes will be lost.",
                  confirmText: "Discard & Leave",
                  cancelText: "Stay Here",
                  onConfirm: () => {
                     setHistory([{}]);
                     setHistoryIndex(0);
                     router.push(targetPath);
                  }
               });
            }
         }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('click', handleLinkClick, { capture: true });

      return () => {
         window.removeEventListener('beforeunload', handleBeforeUnload);
         document.removeEventListener('click', handleLinkClick, { capture: true });
      };
   }, [historyIndex, router, showPopup]);

   // --- STAGING ACTIONS (Undo/Redo Logic) ---
   const handleStageChange = (collection, id, updates) => {
      const currentStaged = history[historyIndex];
      const newStaged = {
         ...currentStaged,
         [`${collection}_${id}`]: {
            ...(currentStaged[`${collection}_${id}`] || {}),
            ...updates,
            _meta: { collection, id } 
         }
      };

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newStaged);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
   };

   const handleSaveChanges = async () => {
      const changes = history[historyIndex];
      if (!changes || Object.keys(changes).length === 0) return;

      setSaving(true);
      try {
         for (const key of Object.keys(changes)) {
            const { _meta, _deleted, ...updates } = changes[key];
            if (_deleted) {
               await deleteDoc(doc(db, _meta.collection, _meta.id));
            } else if (Object.keys(updates).length > 0) {
               await updateDoc(doc(db, _meta.collection, _meta.id), updates);
            }
         }

         setHistory([{}]);
         setHistoryIndex(0);
         showPopup({ type: "success", title: "Success", message: "All changes saved to database.", confirmText: "Done" });
      } catch (err) {
         console.error(err);
         showPopup({ type: "error", title: "Error", message: "Failed to save changes to database." });
      } finally {
         setSaving(false);
      }
   };

   const confirmDelete = (t) => {
      showPopup({
         type: "info",
         title: "Stage Deletion?",
         message: `Delete ${t.userName}'s ticket (ID: ${t.ticketID})? (Will be saved locally until committed)`,
         confirmText: "Yes, Stage Delete",
         cancelText: "Cancel",
         onConfirm: () => handleStageChange('tickets', t.id, { _deleted: true })
      });
   };

   const effectiveTickets = data.tickets.map(t => {
      const staged = history[historyIndex]?.[`tickets_${t.id}`];
      return staged ? { ...t, ...staged } : t;
   }).filter(t => !t._deleted);

   const effectiveUsers = data.users.map(u => {
      const staged = history[historyIndex]?.[`users_${u.id}`];
      return staged ? { ...u, ...staged } : u;
   });

   // --- FILTERED LISTS FOR TICKET/USER TABS ---
   const filteredTickets = effectiveTickets.filter(t => {
      const matchesYear = t.festivalYear?.toString() === selectedYear;
      const purchaser = effectiveUsers.find(u => u.id === t.userId);
      const ambTag = purchaser?.ambassadorDisplayName || "";

      const displayStatus = history[historyIndex]?.[`tickets_${t.id}`]?.status || t.status;

      const matchesSearch =
         t.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         t.ticketID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         ambTag.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || displayStatus === statusFilter;
      const matchesPass = passFilter === "all" || t.passType === passFilter;

      return matchesYear && matchesSearch && matchesStatus && matchesPass;
   });

   const filteredUsers = effectiveUsers.filter(u =>
      (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (roleFilter === "all" || u.role === roleFilter)
   );

   // --- ANALYTICS TIME ENGINE ---
   const getBaseDate = useCallback(() => {
      const d = startOfDay(new Date());
      if (timeRange === 'day') {
          d.setDate(d.getDate() + timeOffset);
      } else if (timeRange === 'week') {
          const day = d.getDay() || 7;
          d.setDate(d.getDate() - day + 1 + (timeOffset * 7));
      } else if (timeRange === 'year') {
          d.setFullYear(d.getFullYear() + timeOffset);
      }
      return d;
   }, [timeRange, timeOffset]);

   const getPeriodBounds = useCallback(() => {
      const base = getBaseDate();
      if (timeRange === 'year') {
          return { start: new Date(base.getFullYear(), 0, 1), end: new Date(base.getFullYear(), 11, 31, 23, 59, 59, 999) };
      } else if (timeRange === 'week') {
          const end = new Date(base);
          end.setDate(end.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          return { start: base, end };
      } else {
          const end = new Date(base);
          end.setHours(23, 59, 59, 999);
          return { start: base, end };
      }
   }, [timeRange, getBaseDate]);

   const getPeriodLabel = useCallback(() => {
      const base = getBaseDate();
      if (timeRange === 'year') return base.getFullYear().toString();
      if (timeRange === 'week') {
          const e = new Date(base);
          e.setDate(e.getDate() + 6);
          return `${formatDateDMY(base)} - ${formatDateDMY(e)}`;
      }
      return formatDateDMY(base);
   }, [timeRange, getBaseDate]);

   useEffect(() => {
      setManualDateInput(getPeriodLabel());
   }, [timeRange, timeOffset, getPeriodLabel]);

   const handleTimeRangeChange = (r) => {
      setTimeRange(r);
      setTimeOffset(0); 
   };

   const handleTimeOffsetChange = (direction) => {
      setTimeOffset(prev => prev + direction);
   };

   const jumpToDate = (targetDate) => {
      if (isNaN(targetDate)) return;
      const now = startOfDay(new Date());
      
      if (timeRange === 'day') {
          const diff = Math.round((targetDate - now) / 86400000);
          setTimeOffset(diff);
      } else if (timeRange === 'week') {
          const targetMonday = new Date(targetDate);
          const day = targetMonday.getDay() || 7;
          targetMonday.setDate(targetMonday.getDate() - day + 1);

          const nowMonday = new Date(now);
          const nDay = nowMonday.getDay() || 7;
          nowMonday.setDate(nowMonday.getDate() - nDay + 1);

          const diff = Math.round((targetMonday - nowMonday) / (86400000 * 7));
          setTimeOffset(diff);
      } else if (timeRange === 'year') {
          const diff = targetDate.getFullYear() - now.getFullYear();
          setTimeOffset(diff);
      }
   };

   const handleManualDateSubmit = () => {
      const parts = manualDateInput.split('.');
      if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          const targetDate = new Date(y, m, d);
          jumpToDate(targetDate);
      } else if (parts.length === 1 && manualDateInput.length === 4) {
          const y = parseInt(manualDateInput, 10);
          const targetDate = new Date(y, 0, 1);
          jumpToDate(targetDate);
      } else {
         setManualDateInput(getPeriodLabel());
      }
   };

   const bounds = getPeriodBounds();
   const periodTickets = effectiveTickets.filter(t => {
      if (t.status !== 'active' && t.status !== 'used') return false;
      const d = new Date(t.purchaseDate);
      return d >= bounds.start && d <= bounds.end;
   });

   const getChartData = () => {
      if (timeRange === 'day') {
         const hours = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);
         const chartData = Object.fromEntries(hours.map(h => [h, 0]));
         
         periodTickets.forEach(t => {
            const d = new Date(t.purchaseDate);
            const h = `${d.getHours().toString().padStart(2, '0')}:00`;
            chartData[h] += chartMetric === 'revenue' ? (t.price || 0) : 1;
         });
         return hours.map(name => ({ name, value: chartData[name] }));
      }
      
      if (timeRange === 'week') {
         const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
         const chartData = Object.fromEntries(days.map(d => [d, 0]));
         
         periodTickets.forEach(t => {
            const d = new Date(t.purchaseDate);
            let dayIdx = d.getDay() - 1;
            if(dayIdx === -1) dayIdx = 6; 
            chartData[days[dayIdx]] += chartMetric === 'revenue' ? (t.price || 0) : 1;
         });
         return days.map(name => ({ name, value: chartData[name] }));
      }
      
      if (timeRange === 'year') {
         const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
         const chartData = Object.fromEntries(months.map(m => [m, 0]));
         const baseYear = getBaseDate().getFullYear();
         
         periodTickets.forEach(t => {
            const d = new Date(t.purchaseDate);
            if (d.getFullYear() === baseYear) {
               chartData[months[d.getMonth()]] += chartMetric === 'revenue' ? (t.price || 0) : 1;
            }
         });
         return months.map(name => ({ name, value: chartData[name] }));
      }
      return [];
   };

   const activeYearOptions = ['2024', '2025', '2026', '2027'];
   if (!activeYearOptions.includes(selectedYear)) activeYearOptions.push(selectedYear);
   const dynamicYearDropdown = activeYearOptions.sort().reverse().map(y => ({ label: `SSF ${y}`, value: y }));

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

   if (!isAdmin || loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>;

   return (
      <main className="min-h-screen bg-salsa-white font-montserrat pt-32 pb-40 select-none relative">
         <Navbar />
         <div className="max-w-7xl mx-auto px-4 md:px-6">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 relative z-30">
               <div>
                  <h1 className="font-bebas text-5xl md:text-7xl leading-none text-slate-900 uppercase">Event Overview</h1>
                  <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] mt-2">Summer Salsa Fest Management</p>
               </div>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6 w-full relative z-20">

               {/* --- NO-SCROLL MOBILE GRID NAVIGATOR --- */}
               <div className="bg-slate-50 border border-gray-100 p-1.5 rounded-2xl w-full lg:w-[550px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] grid grid-cols-2 lg:flex relative gap-1 lg:gap-0">
                  
                  {/* DESKTOP SLIDING PILL (Hidden on Mobile) */}
                  <div
                     className="hidden lg:block absolute top-1.5 bottom-1.5 w-[calc((100%-0.75rem)/4)] bg-slate-900 rounded-xl transition-all duration-300 ease-out shadow-sm"
                     style={{
                        left: activeTab === 'analytics' ? '0.375rem' :
                           activeTab === 'inbox' ? 'calc(0.375rem + (100% - 0.75rem) / 4)' :
                           activeTab === 'tickets' ? 'calc(0.375rem + ((100% - 0.75rem) / 4) * 2)' :
                              'calc(0.375rem + ((100% - 0.75rem) / 4) * 3)'
                     }}
                  />
                  
                  <button onClick={() => setActiveTab("analytics")} className={`relative z-10 py-3 lg:py-2.5 rounded-xl lg:rounded-none flex-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors duration-300 cursor-pointer ${activeTab === 'analytics' ? 'bg-slate-900 lg:bg-transparent text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 lg:hover:bg-transparent'}`}>
                     <BarChart3 size={14} /> Analytics
                  </button>
                  
                  <button onClick={() => setActiveTab("inbox")} className={`relative z-10 py-3 lg:py-2.5 rounded-xl lg:rounded-none flex-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors duration-300 cursor-pointer ${activeTab === 'inbox' ? 'bg-slate-900 lg:bg-transparent text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 lg:hover:bg-transparent'}`}>
                     <Mail size={14} /> 
                     Inbox
                     {unreadInboxCount > 0 && (
                        <span className="bg-salsa-pink text-white text-[9px] px-1.5 py-0.5 rounded-full leading-none font-bold animate-pulse">
                           {unreadInboxCount}
                        </span>
                     )}
                  </button>

                  <button onClick={() => setActiveTab("tickets")} className={`relative z-10 py-3 lg:py-2.5 rounded-xl lg:rounded-none flex-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors duration-300 cursor-pointer ${activeTab === 'tickets' ? 'bg-slate-900 lg:bg-transparent text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 lg:hover:bg-transparent'}`}>
                     <Ticket size={14} /> Tickets
                  </button>
                  
                  <button onClick={() => setActiveTab("users")} className={`relative z-10 py-3 lg:py-2.5 rounded-xl lg:rounded-none flex-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors duration-300 cursor-pointer ${activeTab === 'users' ? 'bg-slate-900 lg:bg-transparent text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 lg:hover:bg-transparent'}`}>
                     <UserCog size={14} /> Users
                  </button>
               </div>

               {/* --- DESKTOP ACTION BUTTONS --- */}
               {['tickets', 'users'].includes(activeTab) && (
                  <div className="hidden lg:flex items-center gap-3 w-full lg:w-auto animate-in fade-in duration-300">
                     <Button
                        variant="outline"
                        size="icon"
                        icon={Undo2}
                        onClick={() => historyIndex > 0 && setHistoryIndex(historyIndex - 1)}
                        disabled={historyIndex <= 0 || saving}
                        title="Undo Stage"
                        className="border-gray-200 bg-white p-3.5"
                     />
                     <Button
                        variant="outline"
                        size="icon"
                        icon={Redo2}
                        onClick={() => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1)}
                        disabled={historyIndex >= history.length - 1 || saving}
                        title="Redo Stage"
                        className="border-gray-200 bg-white p-3.5"
                     />
                     <Button
                        variant="secondary"
                        size="lg"
                        icon={Save}
                        onClick={handleSaveChanges}
                        disabled={historyIndex === 0 || saving}
                     >
                        {saving ? "Saving..." : "Save Changes"}
                     </Button>
                  </div>
               )}
            </div>

            <div className="relative w-full z-10">

               {/* =========================================
                   ANALYTICS TAB
                   ========================================= */}
               {activeTab === 'analytics' && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     
                     <div className="bg-white px-8 py-5 rounded-[2rem] border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="relative flex bg-slate-50 border border-gray-100 p-1 rounded-xl w-full md:w-[280px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)]">
                           <div
                              className="absolute top-1 bottom-1 w-[calc((100%-0.5rem)/3)] bg-slate-900 rounded-lg transition-all duration-300 ease-out shadow-sm"
                              style={{
                                 left: timeRange === 'day' ? '0.25rem' :
                                    timeRange === 'week' ? 'calc(0.25rem + (100% - 0.5rem) / 3)' :
                                       'calc(0.25rem + ((100% - 0.5rem) / 3) * 2)'
                              }}
                           />
                           {['day', 'week', 'year'].map(r => (
                              <button key={r} onClick={() => handleTimeRangeChange(r)} className={`relative z-10 flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 cursor-pointer ${timeRange === r ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}>{r}</button>
                           ))}
                        </div>

                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl p-1.5 w-full md:w-auto justify-between md:justify-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] focus-within:border-slate-900 transition-colors">
                           <button 
                              onClick={() => handleTimeOffsetChange(-1)} 
                              className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-all cursor-pointer"
                           >
                              <ChevronLeft size={16} />
                           </button>
                           
                           <div className="relative flex items-center justify-center min-w-[140px] px-1 group">
                              <input 
                                 type="text"
                                 value={manualDateInput}
                                 onChange={(e) => setManualDateInput(e.target.value)}
                                 onBlur={handleManualDateSubmit}
                                 onKeyDown={(e) => e.key === 'Enter' && handleManualDateSubmit()}
                                 className="w-full text-center text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none bg-transparent selection:bg-salsa-pink selection:text-white"
                                 placeholder="DD.MM.YYYY"
                              />
                           </div>

                           <div className="relative flex items-center justify-center p-2 text-slate-400 hover:text-salsa-pink hover:bg-pink-50 rounded-lg cursor-pointer transition-colors overflow-hidden">
                              <Calendar size={14} className="relative z-10 pointer-events-none" />
                              <input 
                                 type="date"
                                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                 onChange={(e) => {
                                    if(e.target.value) jumpToDate(new Date(e.target.value));
                                 }}
                                 title="Select Date"
                              />
                           </div>

                           <button 
                              onClick={() => handleTimeOffsetChange(1)} 
                              className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-all cursor-pointer"
                           >
                              <ChevronRight size={16} />
                           </button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white p-10 rounded-[3rem] border border-gray-200 shadow-xl flex flex-col justify-center">
                           <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Total Revenue</p>
                           <p className="font-bebas text-5xl xl:text-6xl text-emerald-500 leading-none">
                              €{periodTickets.reduce((a, b) => a + (b.price || 0), 0)}
                           </p>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border border-gray-200 shadow-xl flex flex-col justify-center">
                           <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Tickets Sold</p>
                           <p className="font-bebas text-5xl xl:text-6xl text-slate-900 leading-none">
                              {periodTickets.length}
                           </p>
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

                     <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-gray-200 shadow-xl relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                           <div>
                              <h2 className="font-bebas text-5xl text-slate-900 uppercase tracking-tight leading-none">Performance</h2>
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-2">Displaying metrics for {getPeriodLabel()}</p>
                           </div>

                           <div className="relative flex bg-slate-50 border border-gray-100 p-1 rounded-xl w-full md:w-[240px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)]">
                              <div
                                 className="absolute top-1 bottom-1 w-[calc((100%-0.5rem)/2)] bg-slate-900 rounded-lg transition-all duration-300 ease-out shadow-sm"
                                 style={{
                                    left: chartMetric === 'revenue' ? '0.25rem' : 'calc(0.25rem + (100% - 0.5rem) / 2)'
                                 }}
                              />
                              <button onClick={() => setChartMetric('revenue')} className={`relative z-10 flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 cursor-pointer ${chartMetric === 'revenue' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}>Revenue</button>
                              <button onClick={() => setChartMetric('tickets')} className={`relative z-10 flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 cursor-pointer ${chartMetric === 'tickets' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}>Tickets</button>
                           </div>
                        </div>

                        <div className="w-full overflow-x-auto pb-4">
                           <div className="h-[400px] min-w-[800px]">
                              <ResponsiveContainer width="100%" height="100%">
                                 <AreaChart data={getChartData()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                       <linearGradient id="cs" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor={chartMetric === 'revenue' ? "#10b981" : "#e84b8a"} stopOpacity={0.2} />
                                          <stop offset="95%" stopColor={chartMetric === 'revenue' ? "#10b981" : "#e84b8a"} stopOpacity={0} />
                                       </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8', fontFamily: 'Montserrat' }} dy={10} />
                                    <YAxis 
                                       axisLine={false} 
                                       tickLine={false} 
                                       tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8', fontFamily: 'Montserrat' }} 
                                       dx={-10} 
                                       label={{ value: chartMetric === 'revenue' ? 'Revenue (EUR)' : 'Tickets Sold', angle: -90, position: 'insideLeft', offset: 10, fill: '#94a3b8', dy: -10, fontSize: 10, fontWeight: 700, fontFamily: 'Montserrat' }} 
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }} />
                                    <Area type="monotone" dataKey="value" stroke={chartMetric === 'revenue' ? "#10b981" : "#e84b8a"} strokeWidth={4} fill="url(#cs)" />
                                 </AreaChart>
                              </ResponsiveContainer>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* =========================================
                   INBOX TAB
                   ========================================= */}
               {activeTab === 'inbox' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                     <InboxManager />
                  </div>
               )}

               {/* =========================================
                   TICKETS TAB
                   ========================================= */}
               {activeTab === 'tickets' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                     
                     <div className="flex flex-col xl:flex-row gap-4 relative z-40">
                        <div className="relative flex-grow group w-full lg:min-w-[400px]">
                           <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
                           <input
                              type="text"
                              value={searchTerm || ""}
                              placeholder="SEARCH BY NAME, ID, OR AMBASSADOR..."
                              className="input-standard w-full"
                              onChange={e => setSearchTerm(e.target.value)}
                           />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto shrink-0">
                           
                           <div className="relative w-full sm:w-auto z-40">
                              <CustomDropdown
                                 icon={Calendar}
                                 value={selectedYear}
                                 onChange={setSelectedYear}
                                 options={dynamicYearDropdown}
                                 variant="filter"
                              />
                           </div>
                           
                           <div className="relative w-full sm:w-auto z-30">
                              <CustomDropdown
                                 icon={Filter}
                                 value={statusFilter}
                                 onChange={setStatusFilter}
                                 options={[
                                    { label: 'All Statuses', value: 'all' },
                                    { label: 'Active', value: 'active', textColor: 'text-emerald-500' },
                                    { label: 'Used', value: 'used', textColor: 'text-orange-500' },
                                    { label: 'Pending', value: 'pending', textColor: 'text-amber-500' }
                                 ]}
                                 variant="filter"
                              />
                           </div>
                           
                           <div className="relative w-full sm:w-auto z-20">
                              <CustomDropdown
                                 icon={Ticket}
                                 value={passFilter}
                                 onChange={setPassFilter}
                                 options={[
                                    { label: 'All Passes', value: 'all', isPill: true, colorClass: 'bg-slate-100 text-slate-600' },
                                    { label: 'Full Pass', value: 'Full Pass', isPill: true, colorClass: 'bg-salsa-pink text-white' },
                                    { label: 'Party Pass', value: 'Party Pass', isPill: true, colorClass: 'bg-violet-600 text-white' },
                                    { label: 'Day Pass', value: 'Day Pass', isPill: true, colorClass: 'bg-teal-300 text-teal-950' },
                                    { label: 'Free Pass', value: 'Free Pass', isPill: true, colorClass: 'bg-yellow-400 text-yellow-900' }
                                 ]}
                                 variant="filter"
                              />
                           </div>
                        </div>
                     </div>

                     {/* DESKTOP TABLE */}
                     <div className="hidden lg:block bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
                        <div className="overflow-x-auto w-full pb-40">
                           <table className="w-full text-left border-separate border-spacing-0 min-w-[950px] font-montserrat relative">
                              <thead className="bg-white text-[11px] font-bold uppercase text-slate-400 tracking-widest relative z-10">
                                 <tr>
                                    <th className="p-6 pl-10 font-bold w-48 rounded-tl-[3rem] border-b border-gray-100">Ambassador</th>
                                    <th className="p-6 font-bold w-1/4 border-b border-gray-100">Attendee Name</th>
                                    <th className="p-6 font-bold w-56 border-b border-gray-100">Pass Type</th>
                                    <th className="p-6 font-bold text-center w-40 border-b border-gray-100">Status</th>
                                    <th className="p-6 font-bold text-center w-32 border-b border-gray-100">Price</th>
                                    <th className="p-6 pr-10 text-right font-bold w-32 rounded-tr-[3rem] border-b border-gray-100">Action</th>
                                 </tr>
                              </thead>
                              <tbody className="uppercase text-xs">
                                 {filteredTickets.map((t, i) => {
                                    const purchaser = effectiveUsers.find(u => u.id === t.userId);
                                    const ambTag = purchaser?.ambassadorDisplayName;
                                    
                                    const displayStatus = history[historyIndex]?.[`tickets_${t.id}`]?.status || t.status;

                                    return (
                                       <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                          <td className="p-6 pl-10 align-middle border-b border-gray-50">
                                             {ambTag ? (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest"><Users size={12} className="text-slate-400" /> {ambTag}</span>
                                             ) : (
                                                <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Direct</span>
                                             )}
                                          </td>
                                          <td className="p-6 align-middle truncate max-w-[200px] border-b border-gray-50">
                                             <span className="block text-base font-bold font-montserrat text-slate-700 tracking-wide">{t.userName}</span>
                                             <span className="block text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">ID: {t.ticketID}</span>
                                          </td>
                                          <td className="p-6 align-middle border-b border-gray-50">
                                             <CustomDropdown
                                                value={t.passType}
                                                variant="pill"
                                                onChange={(val) => {
                                                   const updateData = { passType: val };
                                                   if (displayStatus === 'pending') {
                                                      if (val === 'Free Pass') updateData.price = 0;
                                                      else if (val === 'Full Pass') updateData.price = 150;
                                                      else if (val === 'Party Pass') updateData.price = 80;
                                                      else if (val === 'Day Pass') updateData.price = 60;
                                                   }
                                                   handleStageChange('tickets', t.id, updateData);
                                                }}
                                                options={[
                                                   { label: 'Full Pass', value: 'Full Pass', colorClass: 'bg-salsa-pink text-white' },
                                                   { label: 'Party Pass', value: 'Party Pass', colorClass: 'bg-violet-600 text-white' },
                                                   { label: 'Day Pass', value: 'Day Pass', colorClass: 'bg-teal-300 text-teal-950' },
                                                   ...(displayStatus === 'pending' || t.passType === 'Free Pass'
                                                      ? [{ label: 'Free Pass', value: 'Free Pass', colorClass: 'bg-yellow-400 text-yellow-900' }]
                                                      : []
                                                   )
                                                ]}
                                             />
                                          </td>
                                          
                                          <td className="p-6 align-middle border-b border-gray-50">
                                             <div className="flex justify-center">
                                                <StatusToggle 
                                                   currentStatus={displayStatus}
                                                   onChange={(newStat) => handleStageChange('tickets', t.id, { status: newStat })}
                                                />
                                             </div>
                                          </td>
                                          
                                          <td className="p-6 align-middle text-center font-bold text-base text-slate-700 border-b border-gray-50">€{t.price}</td>
                                          <td className="p-6 pr-10 align-middle text-right border-b border-gray-50">
                                             <div className="flex justify-end gap-2 h-full items-center">
                                                <Button
                                                   variant="actionIcon"
                                                   size="icon"
                                                   icon={Trash2}
                                                   onClick={() => confirmDelete(t)}
                                                   title="Delete Ticket"
                                                   className="opacity-40 group-hover:opacity-100 hover:!text-red-500 hover:bg-red-50"
                                                />
                                             </div>
                                          </td>
                                       </tr>
                                    )
                                 })}
                                 {filteredTickets.length === 0 && (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest font-montserrat border-b border-gray-50">No tickets match your search.</td></tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>

                     {/* 1-TO-1 MOBILE TICKET CARDS */}
                     <div className="lg:hidden flex flex-col gap-4 relative z-10 pb-20">
                        {filteredTickets.map((t) => {
                           const purchaser = data.users.find(u => u.id === t.userId);
                           const ambTag = purchaser?.ambassadorDisplayName;
                           const displayStatus = history[historyIndex]?.[`tickets_${t.id}`]?.status || t.status;

                           return (
                              <div key={t.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-visible">
                                 
                                 <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0 pr-2">
                                       <span className="block text-lg font-black font-montserrat text-slate-900 uppercase leading-tight tracking-widest break-words whitespace-normal">{t.userName}</span>
                                       <span className="block text-sm font-bold text-slate-500 mt-1.5 uppercase tracking-widest font-mono">ID: {t.ticketID}</span>
                                    </div>
                                    
                                    {/* Mobile Dropdown Pill */}
                                    <div className="shrink-0 relative z-40 mt-1">
                                       <CustomDropdown
                                          value={t.passType}
                                          variant="pill"
                                          onChange={(val) => {
                                             const updateData = { passType: val };
                                             if (displayStatus === 'pending') {
                                                if (val === 'Free Pass') updateData.price = 0;
                                                else if (val === 'Full Pass') updateData.price = 150;
                                                else if (val === 'Party Pass') updateData.price = 80;
                                                else if (val === 'Day Pass') updateData.price = 60;
                                             }
                                             handleStageChange('tickets', t.id, updateData);
                                          }}
                                          options={[
                                             { label: 'Full Pass', value: 'Full Pass', colorClass: 'bg-salsa-pink text-white' },
                                             { label: 'Party Pass', value: 'Party Pass', colorClass: 'bg-violet-600 text-white' },
                                             { label: 'Day Pass', value: 'Day Pass', colorClass: 'bg-teal-300 text-teal-950' },
                                             ...(displayStatus === 'pending' || t.passType === 'Free Pass'
                                                ? [{ label: 'Free Pass', value: 'Free Pass', colorClass: 'bg-yellow-400 text-yellow-900' }]
                                                : []
                                             )
                                          ]}
                                       />
                                    </div>
                                 </div>

                                 <div className="flex items-center w-full mt-1 relative z-10">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">Ambassador</span>
                                    <div className="flex-grow border-b-2 border-dotted border-gray-200 mx-3 relative top-[1px]"></div>
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 shrink-0">
                                       <Users size={12} className="text-slate-400" />
                                       {ambTag ? ambTag : <span className="text-slate-300">Direct</span>}
                                    </span>
                                 </div>
                                 
                                 <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-1 w-full relative z-10">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</span>
                                    <StatusToggle 
                                       currentStatus={displayStatus}
                                       onChange={(newStat) => handleStageChange('tickets', t.id, { status: newStat })}
                                    />
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
               )}

               {/* =========================================
                   USERS TAB
                   ========================================= */}
               {activeTab === 'users' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
                     <div className="flex flex-col xl:flex-row gap-4">
                        <div className="relative flex-grow group">
                           <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
                           <input
                              type="text"
                              value={searchTerm || ""}
                              placeholder="Search users..."
                              className="input-standard"
                              onChange={e => setSearchTerm(e.target.value)}
                           />
                        </div>
                        <div className="relative w-full xl:w-auto">
                           <CustomDropdown
                              icon={ShieldAlert}
                              value={roleFilter}
                              onChange={setRoleFilter}
                              options={[
                                 { label: 'All Roles', value: 'all', isPill: true, colorClass: getRoleStyle('all') },
                                 { label: 'User', value: 'user', isPill: true, colorClass: getRoleStyle('user') },
                                 { label: 'Ambassador', value: 'ambassador', isPill: true, colorClass: getRoleStyle('ambassador') },
                                 { label: 'Admin', value: 'admin', isPill: true, colorClass: getRoleStyle('admin') },
                                 { label: 'SuperAdmin', value: 'superadmin', isPill: true, colorClass: getRoleStyle('superadmin') }
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
                                    <th className="p-6 pl-10 font-bold w-1/4 rounded-tl-[3rem] border-b border-gray-100">Name</th>
                                    <th className="p-6 font-bold w-48 border-b border-gray-100">Ambassador Tag</th>
                                    <th className="p-6 font-bold w-1/4 border-b border-gray-100">Email</th>
                                    <th className="p-6 pl-16 text-left font-bold w-56 rounded-tr-[3rem] border-b border-gray-100">Role</th>
                                 </tr>
                              </thead>
                              <tbody className="uppercase text-xs">
                                 {filteredUsers.map((u, i) => {
                                    const isMySuperAdmin = auth.currentUser?.uid === u.id && u.role === 'superadmin';
                                    const displayRole = history[historyIndex]?.[`users_${u.id}`]?.role || u.role;

                                    return (
                                       <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                          <td className="p-6 pl-10 align-middle border-b border-gray-50">
                                             <span className="block text-base font-bold font-montserrat text-slate-700 tracking-wide">{u.displayName || "Unregistered"}</span>
                                          </td>
                                          <td className="p-6 align-middle border-b border-gray-50">
                                             {u.role === 'ambassador' && u.ambassadorDisplayName ? (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest"><Users size={12} className="text-slate-400" /> {u.ambassadorDisplayName}</span>
                                             ) : (
                                                <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">-</span>
                                             )}
                                          </td>
                                          <td className="p-6 align-middle text-slate-500 lowercase font-bold text-xs tracking-wide border-b border-gray-50">{u.email}</td>
                                          <td className="p-6 pl-16 pr-12 align-middle border-b border-gray-50">
                                             <div className="flex justify-start">
                                                <CustomDropdown
                                                   value={displayRole}
                                                   onChange={(val) => handleStageChange('users', u.id, { role: val })}
                                                   disabled={isMySuperAdmin}
                                                   title={isMySuperAdmin ? "You cannot demote yourself" : "Stage User Role Change"}
                                                   hideChevron={isMySuperAdmin}
                                                   options={[
                                                      { label: 'User', value: 'user', isPill: true, colorClass: getRoleStyle('user') },
                                                      { label: 'Ambassador', value: 'ambassador', isPill: true, colorClass: getRoleStyle('ambassador') },
                                                      { label: 'Admin', value: 'admin', isPill: true, colorClass: getRoleStyle('admin') },
                                                      { label: 'SuperAdmin', value: 'superadmin', isPill: true, colorClass: getRoleStyle('superadmin') }
                                                   ]}
                                                   variant="pill"
                                                />
                                             </div>
                                          </td>
                                       </tr>
                                    )
                                 })}
                                 {filteredUsers.length === 0 && (
                                    <tr><td colSpan="4" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest font-montserrat border-b border-gray-50">No users match your search.</td></tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>

                     {/* MOBILE CARDS */}
                     <div className="lg:hidden flex flex-col gap-4 pb-20">
                        {filteredUsers.map((u) => {
                           const isMySuperAdmin = auth.currentUser?.uid === u.id && u.role === 'superadmin';
                           const displayRole = history[historyIndex]?.[`users_${u.id}`]?.role || u.role;

                           return (
                              <div key={u.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4 relative overflow-visible">
                                 <div>
                                    <span className="block text-lg font-black font-montserrat text-slate-900 tracking-wide">{u.displayName || "Unregistered"}</span>
                                    <span className="block text-sm font-bold text-slate-500 lowercase mt-0.5">{u.email}</span>
                                 </div>
                                 
                                 <div className="flex items-center w-full relative z-10">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">Amb. Tag</span>
                                    <div className="flex-grow border-b-2 border-dotted border-gray-200 mx-3 relative top-[1px]"></div>
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 shrink-0">
                                       <Users size={12} className="text-slate-400" />
                                       {u.role === 'ambassador' && u.ambassadorDisplayName ? u.ambassadorDisplayName : <span className="text-slate-300">-</span>}
                                    </span>
                                 </div>

                                 <div className="flex items-center justify-between pt-4 border-t border-gray-50 w-full relative z-20">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Role</span>
                                    <CustomDropdown
                                       value={displayRole}
                                       onChange={(val) => handleStageChange('users', u.id, { role: val })}
                                       disabled={isMySuperAdmin}
                                       hideChevron={isMySuperAdmin}
                                       options={[
                                          { label: 'User', value: 'user', isPill: true, colorClass: getRoleStyle('user') },
                                          { label: 'Ambassador', value: 'ambassador', isPill: true, colorClass: getRoleStyle('ambassador') },
                                          { label: 'Admin', value: 'admin', isPill: true, colorClass: getRoleStyle('admin') },
                                          { label: 'SuperAdmin', value: 'superadmin', isPill: true, colorClass: getRoleStyle('superadmin') }
                                       ]}
                                       variant="pill"
                                    />
                                 </div>
                              </div>
                           );
                        })}
                        {filteredUsers.length === 0 && (
                           <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border border-gray-100">
                              No users match your search.
                           </div>
                        )}
                     </div>
                  </div>
               )}

            </div>
         </div>

         {/* ==============================================
             MOBILE FLOATING ACTION BAR
             ============================================== */}
         <div 
            className={`lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-4 z-50 flex items-center justify-between transition-transform duration-500 ease-out ${
               historyIndex > 0 ? "translate-y-0" : "translate-y-full"
            }`}
         >
            <div className="w-full flex items-center justify-between gap-4">
               <div className="flex items-center gap-2">
                  <button 
                     onClick={() => historyIndex > 0 && setHistoryIndex(historyIndex - 1)} 
                     disabled={historyIndex <= 0 || saving}
                     className="p-3 bg-gray-100 text-slate-600 rounded-xl hover:bg-gray-200 disabled:opacity-30 transition-colors"
                  >
                     <Undo2 size={18} />
                  </button>
                  <button 
                     onClick={() => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1)} 
                     disabled={historyIndex >= history.length - 1 || saving}
                     className="p-3 bg-gray-100 text-slate-600 rounded-xl hover:bg-gray-200 disabled:opacity-30 transition-colors"
                  >
                     <Redo2 size={18} />
                  </button>
               </div>
               
               <button 
                  onClick={handleSaveChanges}
                  disabled={historyIndex === 0 || saving}
                  className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest px-6 py-3.5 rounded-xl hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2 flex-1 justify-center disabled:opacity-50"
               >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Saving..." : "Save Edits"}
               </button>
            </div>
         </div>

      </main>
   );
}