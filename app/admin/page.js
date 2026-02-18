"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, onSnapshot, addDoc, setDoc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { 
  Users, Ticket, TrendingUp, Search, Download, 
  Database, ShieldAlert, Gift, Filter, CheckCircle, 
  Clock, XCircle, Trash2, Loader2 
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [data, setData] = useState({ users: [], tickets: [] });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Filters & Search State
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
      // FIRST: Check role via getDoc (allowed for everyone to read their own doc)
      const myDoc = await getDoc(doc(db, "users", user.uid));
      
      if (myDoc.exists() && myDoc.data().role === "superadmin") {
        setIsAdmin(true);
        
        // SECOND: Only start global listeners after role is confirmed
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
  const seedDatabase = async () => {
    const names = ["MARIA S.", "IVAN K.", "ELENA V.", "LUCA M.", "SOFIA R."];
    const passes = ["Full Pass", "Party Pass", "Day Pass"];
    for (let i = 0; i < 10; i++) {
      const name = names[Math.floor(Math.random()*names.length)];
      const uid = "gen_" + Math.random().toString(36).substr(2, 6);
      await setDoc(doc(db, "users", uid), { uid, displayName: name, email: name.toLowerCase().replace(" ", "") + "@test.com", role: "user", createdAt: new Date().toISOString() });
      await addDoc(collection(db, "tickets"), { userId: uid, userName: name, passType: passes[Math.floor(Math.random()*3)], price: 115, status: "active", purchaseDate: new Date().toISOString(), ticketID: "SLS" + Math.random().toString(36).substr(2,4).toUpperCase() });
    }
    alert("Data Injected!");
  };

  const exportCSV = () => {
    const csv = "ID,Name,Type,Price,Status\n" + data.tickets.map(t => `${t.ticketID},${t.userName},${t.passType},${t.price},${t.status}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'GuestList.csv'; a.click();
  };

  // --- CHART LOGIC (SUM AGGREGATION) ---
  const getChartData = () => {
    const aggregated = {};
    data.tickets.filter(t => t.status === 'active').forEach(t => {
      const d = new Date(t.purchaseDate);
      let label = d.toLocaleDateString('en-US', { weekday: 'short' });
      if (timeRange === 'day') label = `${d.getHours()}:00`;
      if (timeRange === 'year') label = d.toLocaleDateString('en-US', { month: 'short' });
      aggregated[label] = (aggregated[label] || 0) + (t.price || 0);
    });
    return Object.entries(aggregated).map(([name, sales]) => ({ name, sales }));
  };

  // --- FILTERED LISTS ---
  const filteredTickets = data.tickets.filter(t => 
    (t.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || t.ticketID?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === "all" || t.status === statusFilter) &&
    (passFilter === "all" || t.passType === passFilter)
  );

  const filteredUsers = data.users.filter(u => 
    (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (roleFilter === "all" || u.role === roleFilter)
  );

  if (!isAdmin || loading) return <div className="min-h-screen flex items-center justify-center font-bebas text-5xl text-salsa-pink">Loading System...</div>;

  return (
    <main className="min-h-screen bg-white font-montserrat pt-24 pb-20">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-10">
           <div>
              <h1 className="font-bebas text-7xl tracking-tighter">Event Overview</h1>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Summer Salsa Fest 2025</p>
           </div>
           <div className="flex gap-3">
              <button onClick={seedDatabase} className="bg-amber-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase"><Database size={14}/></button>
              <button onClick={exportCSV} className="border-2 border-salsa-pink text-salsa-pink px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-salsa-pink hover:text-white transition tracking-widest">Export Guest List</button>
           </div>
        </div>

        {/* TABS */}
        <div className="flex gap-4 mb-12 border-b border-gray-100 pb-4">
           {['analytics', 'tickets', 'users'].map(tab => (
             <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition ${activeTab === tab ? 'bg-salsa-pink text-white shadow-lg' : 'text-gray-400'}`}>{tab}</button>
           ))}
        </div>

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-[2.5rem] border-2 border-salsa-mint/20 shadow-sm">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Total Revenue</p>
                   <p className="font-bebas text-6xl text-salsa-pink">€{data.tickets.filter(t => t.status === 'active').reduce((a, b) => a + (b.price || 0), 0)}</p>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border-2 border-salsa-mint/20 shadow-sm">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Tickets Sold</p>
                   <p className="font-bebas text-6xl text-gray-900">{data.tickets.filter(t => t.status === 'active').length}</p>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border-2 border-salsa-mint/20 shadow-sm">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Ticket Breakdown</p>
                   <div className="space-y-1 text-[10px] font-black uppercase text-gray-400">
                      <div className="flex justify-between"><span>Full Pass</span> <span className="text-gray-900">{data.tickets.filter(t => t.passType === "Full Pass").length}</span></div>
                      <div className="flex justify-between"><span>Party Pass</span> <span className="text-gray-900">{data.tickets.filter(t => t.passType === "Party Pass").length}</span></div>
                   </div>
                </div>
             </div>
             <div className="bg-white p-12 rounded-[3.5rem] border-2 border-salsa-mint/20 shadow-sm">
                <div className="flex justify-between items-center mb-10">
                   <h2 className="font-bebas text-5xl uppercase tracking-tight">Sales Velocity</h2>
                   <div className="flex bg-gray-50 p-1 rounded-xl">
                      {['day', 'week', 'year'].map(r => (
                        <button key={r} onClick={() => setTimeRange(r)} className={`px-4 py-2 rounded-lg text-[10px] font-black transition ${timeRange === r ? 'bg-white shadow-md text-salsa-pink' : 'text-gray-400'}`}>{r.toUpperCase()}</button>
                      ))}
                   </div>
                </div>
                <div className="h-[400px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={getChartData()}><defs><linearGradient id="cs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#e84b8a" stopOpacity={0.2}/><stop offset="95%" stopColor="#e84b8a" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#cbd5e1'}} dy={10} /><Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} /><Area type="monotone" dataKey="sales" stroke="#e84b8a" strokeWidth={4} fill="url(#cs)" /></AreaChart></ResponsiveContainer></div>
             </div>
          </div>
        )}

        {/* TICKETS */}
        {activeTab === 'tickets' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300"/><input type="text" placeholder="Search attendee or ID..." className="w-full p-6 pl-16 bg-white border-2 border-salsa-mint rounded-3xl font-bold outline-none" onChange={e => setSearchTerm(e.target.value)}/></div>
                <select onChange={e => setStatusFilter(e.target.value)} className="p-5 bg-white border-2 border-salsa-mint rounded-2xl font-black text-[10px] uppercase outline-none"><option value="all">All Statuses</option><option value="active">Active</option><option value="pending">Pending</option></select>
                <select onChange={e => setPassFilter(e.target.value)} className="p-5 bg-white border-2 border-salsa-mint rounded-2xl font-black text-[10px] uppercase outline-none"><option value="all">All Passes</option><option value="Full Pass">Full Pass</option><option value="Party Pass">Party Pass</option></select>
             </div>
             <div className="bg-white rounded-[2.5rem] border-2 border-salsa-mint/20 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                   <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <tr><th className="p-8">ID</th><th className="p-8">Attendee</th><th className="p-8">Pass</th><th className="p-8">Status</th><th className="p-8">Price</th><th className="p-8 text-right">Action</th></tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50 uppercase text-xs font-bold">
                      {filteredTickets.map(t => (
                        <tr key={t.id} className="hover:bg-salsa-white/50 transition">
                           <td className="p-8 font-mono text-salsa-pink">{t.ticketID}</td>
                           <td className="p-8">{t.userName}</td>
                           <td className="p-8">
                              <select value={t.passType} onChange={async (e) => await updateDoc(doc(db, "tickets", t.id), { passType: e.target.value })} className="bg-gray-100 p-2 rounded-lg text-[10px] font-black uppercase outline-none border-none"><option value="Full Pass">Full Pass</option><option value="Party Pass">Party Pass</option><option value="Day Pass">Day Pass</option></select>
                           </td>
                           <td className="p-8"><span className={`px-3 py-1 rounded-full text-[10px] font-black ${t.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100'}`}>{t.status}</span></td>
                           <td className="p-8 font-bebas text-2xl">€{t.price}</td>
                           <td className="p-8 text-right flex justify-end gap-2">
                              <button onClick={() => updateDoc(doc(db, "tickets", t.id), {price: 0, passType: 'FREE PASS', status: 'active'})} className="p-2 bg-salsa-pink/10 text-salsa-pink rounded-lg hover:bg-salsa-pink hover:text-white transition"><Gift size={16}/></button>
                              <button onClick={() => deleteDoc(doc(db, "tickets", t.id))} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 relative"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300"/><input type="text" placeholder="Search user name or email..." className="w-full p-6 pl-16 bg-white border-2 border-salsa-mint rounded-3xl font-bold outline-none" onChange={e => setSearchTerm(e.target.value)}/></div>
                <select onChange={e => setRoleFilter(e.target.value)} className="p-5 bg-white border-2 border-salsa-mint rounded-2xl font-black text-[10px] uppercase outline-none"><option value="all">All Roles</option><option value="user">User</option><option value="ambassador">Ambassador</option><option value="admin">Admin</option></select>
             </div>
             <div className="bg-white rounded-[2.5rem] border-2 border-salsa-mint/20 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                   <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <tr><th className="p-8">Name</th><th className="p-8">Email</th><th className="p-8">Role</th><th className="p-8 text-right">Change Role</th></tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50 uppercase text-xs font-bold">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-salsa-white/50 transition">
                           <td className="p-8">{u.displayName}</td>
                           <td className="p-8 text-gray-400 lowercase font-medium">{u.email}</td>
                           <td className="p-8"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${u.role === 'superadmin' ? 'bg-black text-white' : 'bg-salsa-mint/10 text-salsa-mint'}`}>{u.role}</span></td>
                           <td className="p-8 text-right">
                              <select value={u.role} onChange={async (e) => await updateDoc(doc(db, "users", u.id), { role: e.target.value })} className="p-2 bg-gray-100 rounded-lg text-[10px] font-black outline-none border-none"><option value="user">User</option><option value="ambassador">Ambassador</option><option value="admin">Admin</option><option value="superadmin">SuperAdmin</option></select>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>
    </main>
  );
}