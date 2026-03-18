   "use client";
   import { useEffect, useState } from "react";
   import { auth, db } from "@/lib/firebase";
   import { collection, doc, getDoc, updateDoc, onSnapshot, deleteDoc } from "firebase/firestore";
   import { useRouter } from "next/navigation";
   import Navbar from "@/components/Navbar";
   import CustomDropdown from "@/components/CustomDropdown"; // Imported global component
   import { usePopup } from "@/components/PopupProvider";
   import Button from "@/components/Button";
   import {
      Users, Ticket, Search, Download,
      ShieldAlert, Gift, Filter, CheckCircle,
      Clock, Trash2, Loader2, BarChart3, UserCog,
      Undo2, Redo2, Save, Eye
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
      return 'bg-gray-200'; // Default
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

   export default function AdminDashboard() {
      const [activeTab, setActiveTab] = useState("analytics");
      const [data, setData] = useState({ users: [], tickets: [] });
      const [loading, setLoading] = useState(true);
      const [isAdmin, setIsAdmin] = useState(false);
      const router = useRouter();
      const { showPopup } = usePopup();

      // Filters & Search State
      const [selectedYear, setSelectedYear] = useState("2026");
      const [searchTerm, setSearchTerm] = useState("");
      const [statusFilter, setStatusFilter] = useState("all");
      const [passFilter, setPassFilter] = useState("all");
      const [roleFilter, setRoleFilter] = useState("all");
      const [timeRange, setTimeRange] = useState("week");

      // Undo/Redo/Staging State
      const [history, setHistory] = useState([{}]);
      const [historyIndex, setHistoryIndex] = useState(0);

      useEffect(() => {
         // 1. Initialize the unsubs with empty functions
         let unsubUsers = () => { };
         let unsubTickets = () => { };

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
               } else {
                  router.push("/");
               }
            } else {
               // 2. THE PERMANENT FIX: Kill the page listeners BEFORE redirecting
               unsubUsers();
               unsubTickets();
               router.push("/login");
            }
         });

         return () => {
            unsubAuth();
            unsubUsers();
            unsubTickets();
         };
      }, [router]);

      // --- STAGING ACTIONS (Undo/Redo Logic) ---
      const handleStageChange = (collection, id, updates) => {
         const currentStaged = history[historyIndex];
         const newStaged = {
            ...currentStaged,
            [`${collection}_${id}`]: {
               ...(currentStaged[`${collection}_${id}`] || {}),
               ...updates,
               _meta: { collection, id } // keep track for DB save
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

         try {
            for (const key of Object.keys(changes)) {
               const { _meta, _deleted, ...updates } = changes[key];
               if (_deleted) {
                  await deleteDoc(doc(db, _meta.collection, _meta.id));
               } else if (Object.keys(updates).length > 0) {
                  await updateDoc(doc(db, _meta.collection, _meta.id), updates);
               }
            }

            // Reset history baseline after successful save
            setHistory([{}]);
            setHistoryIndex(0);
            showPopup({ type: "success", title: "Success", message: "All changes saved to database.", confirmText: "Done" });
         } catch (err) {
            console.error(err);
            showPopup({ type: "error", title: "Error", message: "Failed to save changes to database." });
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

      // --- APPLY STAGED CHANGES TO LOCAL DATA FOR PREVIEW ---
      const effectiveTickets = data.tickets.map(t => {
         const staged = history[historyIndex]?.[`tickets_${t.id}`];
         return staged ? { ...t, ...staged } : t;
      }).filter(t => !t._deleted);

      const effectiveUsers = data.users.map(u => {
         const staged = history[historyIndex]?.[`users_${u.id}`];
         return staged ? { ...u, ...staged } : u;
      });

      // --- FILTERED LISTS ---
      const filteredTickets = effectiveTickets.filter(t => {
         const matchesYear = t.festivalYear?.toString() === selectedYear;
         const purchaser = effectiveUsers.find(u => u.id === t.userId);
         const ambTag = purchaser?.ambassadorDisplayName || "";

         const matchesSearch =
            t.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.ticketID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ambTag.toLowerCase().includes(searchTerm.toLowerCase());

         const matchesStatus = statusFilter === "all" || t.status === statusFilter;
         const matchesPass = passFilter === "all" || t.passType === passFilter;

         return matchesYear && matchesSearch && matchesStatus && matchesPass;
      });

      const filteredUsers = effectiveUsers.filter(u =>
         (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
         (roleFilter === "all" || u.role === roleFilter)
      );

      // --- CHART LOGIC (AGGREGATION) ---
      const getChartData = () => {
         const tickets = effectiveTickets.filter(t => t.status === 'active' && t.festivalYear?.toString() === selectedYear);

         if (timeRange === 'year') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const aggregated = Object.fromEntries(months.map(m => [m, 0]));
            tickets.forEach(t => {
               const d = new Date(t.purchaseDate);
               if (!isNaN(d)) aggregated[months[d.getMonth()]] += (t.price || 0);
            });
            return months.map(name => ({ name, revenue: aggregated[name] }));
         }

         if (timeRange === 'week') {
            const aggregated = {};
            tickets.forEach(t => {
               const d = new Date(t.purchaseDate);
               if (!isNaN(d)) {
                  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const key = d.toISOString().split('T')[0];
                  if (!aggregated[key]) aggregated[key] = { name: dateStr, revenue: 0, dateObj: d };
                  aggregated[key].revenue += (t.price || 0);
               }
            });
            return Object.values(aggregated).sort((a, b) => a.dateObj - b.dateObj).slice(-7).map(({ name, revenue }) => ({ name, revenue }));
         }

         if (timeRange === 'day') {
            const aggregated = {};
            tickets.forEach(t => {
               const d = new Date(t.purchaseDate);
               if (!isNaN(d)) {
                  const hourStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  const key = d.toISOString().substring(0, 13);
                  if (!aggregated[key]) aggregated[key] = { name: hourStr, revenue: 0, timestamp: d.getTime() };
                  aggregated[key].revenue += (t.price || 0);
               }
            });
            return Object.values(aggregated).sort((a, b) => a.timestamp - b.timestamp).slice(-24).map(({ name, revenue }) => ({ name, revenue }));
         }

         return [];
      };

      if (!isAdmin || loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>;

      return (
         <main className="min-h-screen bg-salsa-white font-montserrat pt-32 pb-24 select-none">
            <Navbar />
            <div className="max-w-7xl mx-auto px-6">

               {/* HEADER - z-30 safely under Navbar */}
               <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 relative z-30">
                  <div>
                     <h1 className="font-bebas text-6xl md:text-7xl leading-none text-slate-900 uppercase">Event Overview</h1>
                     <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] mt-2">Summer Salsa Fest Management</p>
                  </div>
                  <div className="flex flex-col items-end z-20">
                     <label className="text-[12px] font-black text-slate-400 uppercase mb-2 tracking-widest">Event Archive</label>
                     <CustomDropdown
                        value={selectedYear}
                        onChange={setSelectedYear}
                        options={[
                           { label: 'SSF 2026', value: '2026' },
                           { label: 'SSF 2025', value: '2025' },
                           { label: 'SSF 2024', value: '2024' }
                        ]}
                        variant="compact"
                     />
                  </div>
               </div>

               {/* CONTROLS LEVEL: Tabs + Undo/Redo/Save */}
               <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6 w-full">

                  {/* 3-WAY ANIMATED TABS */}
                  <div className="relative flex bg-slate-50 border border-gray-100 p-1.5 rounded-2xl w-full lg:w-[450px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)]">
                     <div
                        className="absolute top-1.5 bottom-1.5 w-[calc((100%-0.75rem)/3)] bg-slate-900 rounded-xl transition-all duration-300 ease-out shadow-sm"
                        style={{
                           left: activeTab === 'analytics' ? '0.375rem' :
                              activeTab === 'tickets' ? 'calc(0.375rem + (100% - 0.75rem) / 3)' :
                                 'calc(0.375rem + ((100% - 0.75rem) / 3) * 2)'
                        }}
                     />
                     <button onClick={() => setActiveTab("analytics")} className={`tab-button cursor-pointer ${activeTab === 'analytics' ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}><BarChart3 size={14} /> Analytics</button>
                     <button onClick={() => setActiveTab("tickets")} className={`tab-button cursor-pointer ${activeTab === 'tickets' ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}><Ticket size={14} /> Tickets</button>
                     <button onClick={() => setActiveTab("users")} className={`tab-button cursor-pointer ${activeTab === 'users' ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}><UserCog size={14} /> Users</button>
                  </div>

                  {/* ACTION BUTTONS (UNDO / REDO / SAVE) */}
                  <div className="flex items-center gap-3 w-full lg:w-auto">
                     <Button
                        variant="outline"
                        size="icon"
                        icon={Undo2}
                        onClick={() => historyIndex > 0 && setHistoryIndex(historyIndex - 1)}
                        disabled={historyIndex <= 0}
                        title="Undo Stage"
                        className="border-gray-200 bg-white p-3.5"
                     />
                     <Button
                        variant="outline"
                        size="icon"
                        icon={Redo2}
                        onClick={() => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1)}
                        disabled={historyIndex >= history.length - 1}
                        title="Redo Stage"
                        className="border-gray-200 bg-white p-3.5"
                     />
                     <Button
                        variant="secondary"
                        size="lg"
                        icon={Save}
                        onClick={handleSaveChanges}
                        disabled={historyIndex === 0}
                     >
                        Save
                     </Button>
                  </div>
               </div>

               <div className="relative min-h-[500px] w-full">

                  {/* ANALYTICS TAB */}
                  {activeTab === 'analytics' && (
                     <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                           <div className="bg-white p-10 rounded-[3rem] border border-gray-200 shadow-xl flex flex-col justify-center hover:shadow-2xl transition-shadow">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Total Revenue</p>
                              <p className="font-bebas text-5xl xl:text-6xl text-salsa-pink leading-none">€{filteredTickets.filter(t => t.status === 'active').reduce((a, b) => a + (b.price || 0), 0)}</p>
                           </div>
                           <div className="bg-white p-10 rounded-[3rem] border border-gray-200 shadow-xl flex flex-col justify-center hover:shadow-2xl transition-shadow">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Tickets Sold</p>
                              <p className="font-bebas text-5xl xl:text-6xl text-slate-900 leading-none">{filteredTickets.filter(t => t.status === 'active').length}</p>
                           </div>
                           <div className="bg-white p-10 rounded-[3rem] border border-gray-200 shadow-xl flex flex-col justify-center hover:shadow-2xl transition-shadow">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Ticket Breakdown</p>
                              <div className="space-y-4 font-montserrat">
                                 <div className="flex justify-between items-center"><span className="flex items-center gap-3 text-sm font-bold uppercase text-slate-500"><div className="w-4 h-4 rounded-full bg-salsa-pink"></div> Full Pass</span> <span className="text-slate-900 text-2xl font-black leading-none">{filteredTickets.filter(t => t.passType === "Full Pass").length}</span></div>
                                 <div className="flex justify-between items-center"><span className="flex items-center gap-3 text-sm font-bold uppercase text-slate-500"><div className="w-4 h-4 rounded-full bg-violet-600"></div> Party Pass</span> <span className="text-slate-900 text-2xl font-black leading-none">{filteredTickets.filter(t => t.passType === "Party Pass").length}</span></div>
                                 <div className="flex justify-between items-center"><span className="flex items-center gap-3 text-sm font-bold uppercase text-slate-500"><div className="w-4 h-4 rounded-full bg-teal-300"></div> Day Pass</span> <span className="text-slate-900 text-2xl font-black leading-none">{filteredTickets.filter(t => t.passType === "Day Pass").length}</span></div>
                              </div>
                           </div>
                        </div>
                        <div className="bg-white p-12 rounded-[3.5rem] border border-gray-200 shadow-xl relative z-10">
                           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                              <h2 className="font-bebas text-5xl text-slate-900 uppercase tracking-tight">Revenue Stream</h2>
                              <div className="relative flex bg-gray-100 p-1.5 rounded-xl w-full md:w-64 shadow-inner">
                                 <div
                                    className="absolute top-1.5 bottom-1.5 w-[calc((100%-0.75rem)/3)] bg-white rounded-lg transition-all duration-300 ease-out shadow-sm"
                                    style={{
                                       left: timeRange === 'day' ? '0.375rem' :
                                          timeRange === 'week' ? 'calc(0.375rem + (100% - 0.75rem) / 3)' :
                                             'calc(0.375rem + ((100% - 0.75rem) / 3) * 2)'
                                    }}
                                 />
                                 {['day', 'week', 'year'].map(r => (
                                    <button key={r} onClick={() => setTimeRange(r)} className={`relative z-10 flex-1 py-2 text-[11px] font-black uppercase transition-colors duration-300 font-montserrat cursor-pointer ${timeRange === r ? 'text-salsa-pink' : 'text-slate-400 hover:text-slate-700'}`}>{r}</button>
                                 ))}
                              </div>
                           </div>
                           <div className="h-[400px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                 <AreaChart data={getChartData()}>
                                    <defs>
                                       <linearGradient id="cs" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#e84b8a" stopOpacity={0.2} />
                                          <stop offset="95%" stopColor="#e84b8a" stopOpacity={0} />
                                       </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8', fontFamily: 'Montserrat' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8', fontFamily: 'Montserrat' }} dx={-10} label={{ value: 'Revenue (€)', angle: -90, position: 'insideLeft', offset: 20, fill: '#94a3b8', dy: -10 }} />
                                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'Montserrat', fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }} />
                                    <Area type="monotone" dataKey="revenue" stroke="#e84b8a" strokeWidth={4} fill="url(#cs)" />
                                 </AreaChart>
                              </ResponsiveContainer>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* TICKETS TAB */}
                  {activeTab === 'tickets' && (
                     <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 z-20 relative">

                        {/* Controls */}
                        <div className="flex flex-col xl:flex-row gap-4">
                           <div className="relative flex-grow group">
                              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
                              <input
                                 type="text"
                                 value={searchTerm || ""}
                                 placeholder="Search"
                                 className="input-standard"
                                 onChange={e => setSearchTerm(e.target.value)}
                              />
                           </div>
                           <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                              <div className="relative w-full md:w-auto">
                                 <CustomDropdown
                                    icon={Filter}
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    options={[
                                       { label: 'All Statuses', value: 'all' },
                                       { label: 'Active', value: 'active', textColor: 'text-emerald-500' },
                                       { label: 'Pending', value: 'pending', textColor: 'text-amber-500' }
                                    ]}
                                    variant="filter"
                                 />
                              </div>
                              <div className="relative w-full md:w-auto">
                                 {/* OMITTED FREE PASS FROM TOP FILTER */}
                                 <CustomDropdown
                                    icon={Ticket}
                                    value={passFilter}
                                    onChange={setPassFilter}
                                    options={[
                                       { label: 'All Passes', value: 'all', isPill: true, colorClass: 'bg-slate-100 text-slate-600' },
                                       { label: 'Full Pass', value: 'Full Pass', isPill: true, colorClass: 'bg-salsa-pink text-white' },
                                       { label: 'Party Pass', value: 'Party Pass', isPill: true, colorClass: 'bg-violet-600 text-white' },
                                       { label: 'Day Pass', value: 'Day Pass', isPill: true, colorClass: 'bg-teal-300 text-teal-950' }
                                    ]}
                                    variant="filter"
                                 />
                              </div>
                           </div>
                        </div>

                        {/* Tickets Table Wrapper (Overflow Hidden + Extra PB padding) */}
                        <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                           <div className="overflow-x-auto w-full pb-40">
                              <table className="w-full text-left border-separate border-spacing-0 min-w-[950px] font-montserrat relative">
                                 <thead className="bg-white text-[11px] font-bold uppercase text-slate-400 tracking-widest relative z-10">
                                    <tr>
                                       <th className="p-6 pl-10 font-bold w-48 rounded-tl-[3rem] border-b border-gray-100">Ambassador</th>
                                       <th className="p-6 font-bold w-1/4 border-b border-gray-100">Attendee Name</th>
                                       <th className="p-6 font-bold w-56 border-b border-gray-100">Pass Type</th>
                                       <th className="p-6 font-bold text-center w-32 border-b border-gray-100">Status</th>
                                       <th className="p-6 font-bold text-center w-32 border-b border-gray-100">Price</th>
                                       <th className="p-6 pr-10 text-right font-bold w-32 rounded-tr-[3rem] border-b border-gray-100">Action</th>
                                    </tr>
                                 </thead>
                                 <tbody className="uppercase text-xs">
                                    {filteredTickets.map((t, i) => {
                                       const purchaser = effectiveUsers.find(u => u.id === t.userId);
                                       const ambTag = purchaser?.ambassadorDisplayName;

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

                                                      // Auto-update price only if pending
                                                      if (t.status === 'pending') {
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
                                                      ...(t.status === 'pending' || t.passType === 'Free Pass'
                                                         ? [{ label: 'Free Pass', value: 'Free Pass', colorClass: 'bg-yellow-400 text-yellow-900' }]
                                                         : []
                                                      )
                                                   ]}
                                                />
                                             </td>
                                             <td className="p-6 align-middle text-center border-b border-gray-50">
                                                <div className={`flex items-center justify-center gap-1.5 text-xs font-black tracking-widest uppercase ${t.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                   {t.status === 'active' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                                   {t.status}
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
                     </div>
                  )}

                  {/* USERS TAB */}
                  {activeTab === 'users' && (
                     <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">

                        {/* Controls */}
                        <div className="flex flex-col xl:flex-row gap-4">
                           <div className="relative flex-grow group">
                              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-salsa-pink transition-colors" size={16} />
                              <input
                                 type="text"
                                 value={searchTerm || ""}
                                 placeholder="Search"
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

                        {/* Users Table Wrapper (Overflow Hidden + Extra PB padding) */}
                        <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
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
                                                      value={u.role}
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
                     </div>
                  )}

               </div>
            </div>
         </main>
      );
   }