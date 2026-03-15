"use client";
import { useEffect, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, onSnapshot, addDoc, setDoc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { usePopup } from "@/components/PopupProvider";
import { 
  Users, Ticket, TrendingUp, Search, Download, 
  Database, ShieldAlert, Gift, Filter, CheckCircle, 
  Clock, XCircle, Trash2, Loader2, BarChart3, UserCog, ChevronDown
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

// --- CUSTOM REUSABLE DROPDOWN ---
function CustomDropdown({ value, options, onChange, icon: Icon, customIcon, buttonClassName, dropdownClassName, disabled, title, hideChevron }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || { label: value, value: value };

  return (
    <div className="relative inline-block font-montserrat w-full" ref={dropdownRef} title={title}>
      <button 
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          {customIcon ? customIcon : (Icon && <Icon size={14} className="opacity-50 shrink-0" />)}
          <span className="truncate">{selectedOption.label}</span>
        </div>
        {!hideChevron && <ChevronDown size={14} strokeWidth={3} className={`shrink-0 transition-transform duration-200 ml-2 opacity-50 ${isOpen ? 'rotate-180' : ''}`} />}
      </button>
      
      {isOpen && (
        <div className={`absolute z-50 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 min-w-max w-full ${dropdownClassName}`}>
          {options.map((opt) => (
            opt.isPass ? (
              // Pill Style inside Dropdown
              <div key={opt.value} className="px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full px-5 py-3 rounded-full text-[10px] uppercase font-black tracking-widest shadow-sm transition-transform hover:scale-105 cursor-pointer ${getPassStyle(opt.value)}`}
                >
                  {opt.label}
                </button>
              </div>
            ) : (
              // Standard Text Style inside Dropdown
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-[10px] uppercase font-black tracking-widest ${value === opt.value ? 'bg-slate-50 text-slate-900' : (opt.textColor || 'text-slate-500')}`}
              >
                {opt.label}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}

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

  useEffect(() => {
    let unsubUsers = () => {};
    let unsubTickets = () => {};

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
        router.push("/login");
      }
    });

    return () => {
      unsubAuth();
      unsubUsers();
      unsubTickets();
    };
  }, [router]);

  // --- ACTIONS ---
  const confirmGift = (t) => {
    showPopup({
      type: "info",
      title: "Gift Ticket?",
      message: `Are you sure you want to convert ${t.userName}'s ticket (ID: ${t.ticketID}) to a Free Pass?`,
      confirmText: "Yes, Convert",
      cancelText: "Cancel",
      onConfirm: async () => await updateDoc(doc(db, "tickets", t.id), { price: 0, passType: 'Free Pass', status: 'active' })
    });
  };

  const confirmDelete = (t) => {
    showPopup({
      type: "info",
      title: "Delete Ticket?",
      message: `Are you sure you want to permanently delete ${t.userName}'s ticket (ID: ${t.ticketID})?`,
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      onConfirm: async () => await deleteDoc(doc(db, "tickets", t.id))
    });
  };

  // --- FILTERED LISTS ---
  const filteredTickets = data.tickets.filter(t => {
    const matchesYear = t.festivalYear?.toString() === selectedYear;
    const purchaser = data.users.find(u => u.id === t.userId);
    const ambTag = purchaser?.ambassadorDisplayName || "";
    
    const matchesSearch = 
      t.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.ticketID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ambTag.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesPass = passFilter === "all" || t.passType === passFilter;

    return matchesYear && matchesSearch && matchesStatus && matchesPass;
  });

  const filteredUsers = data.users.filter(u => 
    (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (roleFilter === "all" || u.role === roleFilter)
  );

  // --- CHART LOGIC (CORRECTED CHRONOLOGICAL AGGREGATION) ---
  const getChartData = () => {
    const tickets = data.tickets.filter(t => t.status === 'active' && t.festivalYear?.toString() === selectedYear);
    
    if (timeRange === 'year') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const aggregated = Object.fromEntries(months.map(m => [m, 0]));
      tickets.forEach(t => {
        const d = new Date(t.purchaseDate);
        if (!isNaN(d)) aggregated[months[d.getMonth()]] += (t.price || 0);
      });
      return months.map(name => ({ name, sales: aggregated[name] }));
    } 
    
    if (timeRange === 'week') {
       const aggregated = {};
       tickets.forEach(t => {
          const d = new Date(t.purchaseDate);
          if (!isNaN(d)) {
             const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
             const key = d.toISOString().split('T')[0]; 
             if (!aggregated[key]) aggregated[key] = { name: dateStr, sales: 0, dateObj: d };
             aggregated[key].sales += (t.price || 0);
          }
       });
       return Object.values(aggregated).sort((a, b) => a.dateObj - b.dateObj).slice(-7).map(({name, sales}) => ({name, sales}));
    }

    if (timeRange === 'day') {
       const aggregated = {};
       tickets.forEach(t => {
          const d = new Date(t.purchaseDate);
          if (!isNaN(d)) {
             const hourStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
             const key = d.toISOString().substring(0, 13); 
             if (!aggregated[key]) aggregated[key] = { name: hourStr, sales: 0, timestamp: d.getTime() };
             aggregated[key].sales += (t.price || 0);
          }
       });
       return Object.values(aggregated).sort((a, b) => a.timestamp - b.timestamp).slice(-24).map(({name, sales}) => ({name, sales}));
    }
    
    return [];
  };

  if (!isAdmin || loading) return <div className="min-h-screen flex items-center justify-center bg-salsa-white"><Loader2 className="animate-spin text-salsa-pink" size={48}/></div>;

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat pt-32 pb-24 select-none">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
           <div>
              <h1 className="font-bebas text-6xl md:text-7xl leading-none text-slate-900 uppercase tracking-tighter">Event Overview</h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Summer Salsa Fest Management</p>
           </div>
           <div className="flex flex-col items-end z-20">
              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Event Archive</label>
              <CustomDropdown
                value={selectedYear}
                onChange={setSelectedYear}
                options={[
                  { label: 'SSF 2026', value: '2026' },
                  { label: 'SSF 2025', value: '2025' },
                  { label: 'SSF 2024', value: '2024' }
                ]}
                buttonClassName="bg-white border border-gray-200 p-2.5 px-6 rounded-xl text-xs font-black uppercase shadow-sm transition-all font-montserrat text-slate-900 hover:border-slate-300 w-40 cursor-pointer"
                dropdownClassName="right-0 w-40"
              />
           </div>
        </div>

        {/* 3-WAY ANIMATED TABS */}
        <div className="relative flex bg-gray-100 p-1.5 rounded-2xl w-full lg:w-[450px] shadow-inner mb-12">
          <div 
            className="absolute top-1.5 bottom-1.5 w-[calc((100%-0.75rem)/3)] bg-slate-900 rounded-xl transition-all duration-300 ease-out shadow-sm"
            style={{ 
              left: activeTab === 'analytics' ? '0.375rem' : 
                    activeTab === 'tickets' ? 'calc(0.375rem + (100% - 0.75rem) / 3)' : 
                    'calc(0.375rem + ((100% - 0.75rem) / 3) * 2)' 
            }}
          />
          <button onClick={() => setActiveTab("analytics")} className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3.5 text-[10px] font-black uppercase transition-colors duration-300 font-montserrat cursor-pointer ${activeTab === 'analytics' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}><BarChart3 size={14}/> Analytics</button>
          <button onClick={() => setActiveTab("tickets")} className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3.5 text-[10px] font-black uppercase transition-colors duration-300 font-montserrat cursor-pointer ${activeTab === 'tickets' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}><Ticket size={14}/> Tickets</button>
          <button onClick={() => setActiveTab("users")} className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3.5 text-[10px] font-black uppercase transition-colors duration-300 font-montserrat cursor-pointer ${activeTab === 'users' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}><UserCog size={14}/> Users</button>
        </div>

        <div className="relative min-h-[500px] w-full">
          
          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-10 rounded-[3rem] border border-gray-200 shadow-xl flex flex-col justify-center">
                     <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Total Revenue</p>
                     <p className="font-bebas text-5xl xl:text-6xl text-salsa-pink leading-none">€{filteredTickets.filter(t => t.status === 'active').reduce((a, b) => a + (b.price || 0), 0)}</p>
                  </div>
                  <div className="bg-white p-10 rounded-[3rem] border border-gray-200 shadow-xl flex flex-col justify-center">
                     <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Tickets Sold</p>
                     <p className="font-bebas text-5xl xl:text-6xl text-slate-900 leading-none">{filteredTickets.filter(t => t.status === 'active').length}</p>
                  </div>
                  <div className="bg-white p-10 rounded-[3rem] border border-gray-200 shadow-xl flex flex-col justify-center">
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
                     <h2 className="font-bebas text-5xl text-slate-900 uppercase tracking-tight">Sales Velocity</h2>
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
                          <button key={r} onClick={() => setTimeRange(r)} className={`relative z-10 flex-1 py-2 text-[10px] font-black uppercase transition-colors duration-300 font-montserrat cursor-pointer ${timeRange === r ? 'text-salsa-pink' : 'text-slate-400 hover:text-slate-700'}`}>{r}</button>
                        ))}
                     </div>
                  </div>
                  <div className="h-[400px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getChartData()}>
                           <defs>
                              <linearGradient id="cs" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#e84b8a" stopOpacity={0.2}/>
                                 <stop offset="95%" stopColor="#e84b8a" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8', fontFamily: 'Montserrat'}} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8', fontFamily: 'Montserrat'}} dx={-10}/>
                           <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'Montserrat', fontSize: '12px', fontWeight: 'bold', color: '#0f172a'}} />
                           <Area type="monotone" dataKey="sales" stroke="#e84b8a" strokeWidth={4} fill="url(#cs)" />
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
                  <div className="relative flex-grow">
                     <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                     <input 
                        type="text" 
                        value={searchTerm || ""}
                        placeholder="Search by Attendee, ID, or Ambassador Tag..." 
                        className="w-full p-5 pl-14 bg-white border border-gray-200 rounded-2xl font-bold text-xs uppercase outline-none focus:border-slate-900 transition-all shadow-sm font-montserrat text-slate-900" 
                        onChange={e => setSearchTerm(e.target.value)}
                     />
                  </div>
                  <div className="flex gap-4 w-full xl:w-auto">
                     <div className="relative w-full xl:w-48">
                        <CustomDropdown
                          icon={Filter}
                          value={statusFilter}
                          onChange={setStatusFilter}
                          options={[
                            { label: 'All Statuses', value: 'all' },
                            { label: 'Active', value: 'active', textColor: 'text-emerald-500' },
                            { label: 'Pending', value: 'pending', textColor: 'text-amber-500' }
                          ]}
                          buttonClassName="w-full p-5 pl-4 bg-white border border-gray-200 rounded-2xl font-bold text-[10px] uppercase shadow-sm font-montserrat text-slate-900 hover:border-slate-300"
                          dropdownClassName="w-48"
                        />
                     </div>
                     <div className="relative w-full xl:w-56">
                        <CustomDropdown
                          icon={Ticket}
                          value={passFilter}
                          onChange={setPassFilter}
                          options={[
                            { label: 'All Passes', value: 'all', isPass: true },
                            { label: 'Full Pass', value: 'Full Pass', isPass: true },
                            { label: 'Party Pass', value: 'Party Pass', isPass: true },
                            { label: 'Day Pass', value: 'Day Pass', isPass: true },
                            { label: 'Free Pass', value: 'Free Pass', isPass: true }
                          ]}
                          buttonClassName="w-full p-5 pl-4 bg-white border border-gray-200 rounded-2xl font-bold text-[10px] uppercase shadow-sm font-montserrat text-slate-900 hover:border-slate-300"
                          dropdownClassName="w-56"
                        />
                     </div>
                  </div>
               </div>

               {/* Tickets Table */}
               <div className="bg-white rounded-[3rem] border border-gray-100 overflow-visible shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="overflow-x-auto overflow-y-visible w-full pb-12">
                     <table className="w-full text-left border-collapse min-w-[950px] font-montserrat relative">
                        <thead className="bg-white text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-gray-100 relative z-10">
                           <tr>
                              <th className="p-6 pl-10 font-bold w-48">Ambassador</th>
                              <th className="p-6 font-bold w-1/4">Attendee Name</th>
                              <th className="p-6 font-bold w-56">Pass Type</th>
                              <th className="p-6 font-bold text-center w-32">Status</th>
                              <th className="p-6 font-bold text-center w-32">Price</th>
                              <th className="p-6 pr-10 text-right font-bold w-32">Action</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 uppercase text-xs">
                           {filteredTickets.map((t, i) => {
                              const purchaser = data.users.find(u => u.id === t.userId);
                              const ambTag = purchaser?.ambassadorDisplayName;

                              return (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                   <td className="p-6 pl-10 align-middle">
                                      {ambTag ? (
                                         <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black text-slate-600 bg-slate-100 uppercase tracking-widest border border-slate-200"><Users size={12}/> {ambTag}</span>
                                      ) : (
                                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direct</span>
                                      )}
                                   </td>
                                   <td className="p-6 align-middle truncate max-w-[200px]">
                                      <span className="block text-sm font-bold text-slate-900">{t.userName}</span>
                                      <span className="block text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest">ID: {t.ticketID}</span>
                                   </td>
                                   <td className="p-6 align-middle">
                                      {/* Colored Pill Dropdown Button */}
                                      <CustomDropdown
                                        value={t.passType}
                                        onChange={async (val) => await updateDoc(doc(db, "tickets", t.id), { passType: val })}
                                        options={[
                                          { label: 'Full Pass', value: 'Full Pass', isPass: true },
                                          { label: 'Party Pass', value: 'Party Pass', isPass: true },
                                          { label: 'Day Pass', value: 'Day Pass', isPass: true },
                                          { label: 'Free Pass', value: 'Free Pass', isPass: true }
                                        ]}
                                        buttonClassName={`w-40 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm transition-all hover:scale-105 border border-transparent ${getPassStyle(t.passType)}`}
                                        dropdownClassName="left-0 w-48"
                                      />
                                   </td>
                                   <td className="p-6 align-middle text-center">
                                      <div className="flex justify-center">
                                         <CustomDropdown
                                           value={t.status}
                                           onChange={async (val) => await updateDoc(doc(db, "tickets", t.id), { status: val })}
                                           options={[
                                             { label: 'Active', value: 'active', textColor: 'text-emerald-500' },
                                             { label: 'Pending', value: 'pending', textColor: 'text-amber-500' }
                                           ]}
                                           buttonClassName={`flex items-center gap-1.5 text-xs font-black tracking-widest uppercase outline-none transition-all cursor-pointer ${t.status === 'active' ? 'text-emerald-500 hover:text-emerald-600' : 'text-amber-500 hover:text-amber-600'}`}
                                           dropdownClassName="w-32 left-1/2 -translate-x-1/2"
                                           hideChevron={true}
                                           customIcon={t.status === 'active' ? <CheckCircle size={14}/> : <Clock size={14}/>}
                                         />
                                      </div>
                                   </td>
                                   <td className="p-6 align-middle text-center font-semibold text-[15px] text-slate-900">€{t.price}</td>
                                   <td className="p-6 pr-10 align-middle text-right">
                                      <div className="flex justify-end gap-2 h-full items-center">
                                         {t.status === 'pending' && (
                                           <button onClick={() => confirmGift(t)} title="Convert to Free Pass" className="p-2.5 bg-white text-yellow-500 rounded-xl hover:bg-yellow-400 hover:text-white transition-colors border border-gray-200 hover:border-yellow-400 shadow-sm cursor-pointer"><Gift size={16}/></button>
                                         )}
                                         <button onClick={() => confirmDelete(t)} title="Delete Ticket" className="p-2.5 bg-white text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-colors border border-gray-200 hover:border-red-500 shadow-sm cursor-pointer"><Trash2 size={16}/></button>
                                      </div>
                                   </td>
                                </tr>
                              )
                           })}
                           {filteredTickets.length === 0 && (
                             <tr><td colSpan="6" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest font-montserrat">No tickets match your search.</td></tr>
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
                  <div className="relative flex-grow">
                     <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                     <input 
                        type="text" 
                        value={searchTerm || ""}
                        placeholder="Search user name or email..." 
                        className="w-full p-5 pl-14 bg-white border border-gray-200 rounded-2xl font-bold text-xs uppercase outline-none focus:border-slate-900 transition-all shadow-sm font-montserrat text-slate-900" 
                        onChange={e => setSearchTerm(e.target.value)}
                     />
                  </div>
                  <div className="relative w-full xl:w-64">
                     <CustomDropdown
                        icon={ShieldAlert}
                        value={roleFilter}
                        onChange={setRoleFilter}
                        options={[
                          { label: 'All Roles', value: 'all' },
                          { label: 'Standard User', value: 'user' },
                          { label: 'Ambassador', value: 'ambassador' },
                          { label: 'Admin', value: 'admin' },
                          { label: 'SuperAdmin', value: 'superadmin' }
                        ]}
                        buttonClassName="w-full p-5 pl-4 bg-white border border-gray-200 rounded-2xl font-bold text-[10px] uppercase shadow-sm font-montserrat text-slate-900 hover:border-slate-300"
                     />
                  </div>
               </div>

               {/* Users Table */}
               <div className="bg-white rounded-[3rem] border border-gray-100 overflow-visible shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="overflow-x-auto overflow-y-visible w-full pb-12">
                     <table className="w-full text-left border-collapse min-w-[900px] font-montserrat relative">
                        <thead className="bg-white text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-gray-100 relative z-10">
                           <tr>
                              <th className="p-6 pl-10 font-bold w-1/4">Name</th>
                              <th className="p-6 font-bold w-48">Ambassador Tag</th>
                              <th className="p-6 font-bold w-1/4">Email</th>
                              <th className="p-6 font-bold w-40">Current Role</th>
                              <th className="p-6 pr-10 text-right font-bold w-40">Change Role</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 uppercase text-xs">
                           {filteredUsers.map((u, i) => (
                              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                 <td className="p-6 pl-10 align-middle">
                                    <span className="block text-sm font-bold text-slate-900">{u.displayName || "Unregistered"}</span>
                                 </td>
                                 <td className="p-6 align-middle">
                                    {u.role === 'ambassador' && u.ambassadorDisplayName ? (
                                       <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest"><Users size={12} className="text-slate-400"/> {u.ambassadorDisplayName}</span>
                                    ) : (
                                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">-</span>
                                    )}
                                 </td>
                                 <td className="p-6 align-middle text-gray-500 lowercase font-medium text-sm tracking-wide">{u.email}</td>
                                 <td className="p-6 align-middle">
                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest shadow-sm inline-block ${
                                       u.role === 'superadmin' ? 'bg-slate-900 text-white' : 
                                       u.role === 'admin' ? 'bg-salsa-pink text-white' :
                                       u.role === 'ambassador' ? 'bg-emerald-100 text-emerald-700' :
                                       'bg-gray-100 text-slate-600'
                                    }`}>
                                       {u.role}
                                    </span>
                                 </td>
                                 <td className="p-6 pr-10 align-middle text-right">
                                    <div className="flex justify-end">
                                       <CustomDropdown
                                          value={u.role}
                                          onChange={async (val) => await updateDoc(doc(db, "users", u.id), { role: val })}
                                          disabled={auth.currentUser?.uid === u.id && u.role === 'superadmin'}
                                          title={auth.currentUser?.uid === u.id && u.role === 'superadmin' ? "You cannot demote yourself" : "Change User Role"}
                                          options={[
                                            { label: 'User', value: 'user' },
                                            { label: 'Ambassador', value: 'ambassador' },
                                            { label: 'Admin', value: 'admin' },
                                            { label: 'SuperAdmin', value: 'superadmin' }
                                          ]}
                                          buttonClassName="p-3 pl-4 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase shadow-sm text-slate-900 hover:border-slate-300 w-36"
                                          dropdownClassName="right-0 w-36"
                                       />
                                    </div>
                                 </td>
                              </tr>
                           ))}
                           {filteredUsers.length === 0 && (
                             <tr><td colSpan="5" className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest font-montserrat">No users match your search.</td></tr>
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