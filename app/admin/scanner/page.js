"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, getDoc, addDoc } from "firebase/firestore";
import { getPriceAtDate } from "@/lib/pricing"; // Import the pricing engine
import Navbar from "@/components/Navbar";
import { 
  Users, Ticket, TrendingUp, Search, 
  Download, Database, Loader2 
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [timeRange, setTimeRange] = useState("week"); // day, week, year
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    const tSnap = await getDocs(collection(db, "tickets"));
    const uSnap = await getDocs(collection(db, "users"));
    setTickets(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };
  const seedFakeData = async () => {
  const names = ["Ivan Petrov", "Maria Garcia", "John Doe", "Elena Koleva", "Luca Rossi", "Sofia Mueller", "Ahmed Silva", "Zoe Wright"];
  const passes = ["Full Pass", "Party Pass", "Day Pass", "Performers Pass"];
  
  for (let i = 0; i < 40; i++) {
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomPass = passes[Math.floor(Math.random() * passes.length)];
    
    // Generate a random date in the last 120 days
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 120));
    
    const price = getPriceAtDate(randomPass, date);

    await addDoc(collection(db, "tickets"), {
      userId: "fake-user-" + i,
      userName: randomName.toUpperCase(),
      passType: randomPass,
      price: price,
      status: "active",
      purchaseDate: date.toISOString(),
      ticketID: Math.random().toString(36).substring(2, 8).toUpperCase()
    });
  }
  alert("40 Tickets Added! Refreshing...");
  fetchData();
};
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const d = await getDoc(doc(db, "users", user.uid));
        if (d.data()?.role === "superadmin") { setIsAdmin(true); fetchData(); }
      }
    });
    return () => unsubscribe();
  }, []);

  // --- CSV EXPORT LOGIC ---
  const exportToCSV = () => {
    const headers = ["Ticket ID, Name, Pass Type, Price, Purchase Date\n"];
    const rows = tickets.map(t => `${t.ticketID}, ${t.userName}, ${t.passType}, ${t.price}, ${t.purchaseDate}\n`);
    const blob = new Blob([headers, ...rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SummerSalsa_Guests_${new Date().toLocaleDateString()}.csv`;
    a.click();
  };

  // --- CHART DATA LOGIC (ACCURATE) ---
  const getProcessedChartData = () => {
    const dataMap = {};
    const now = new Date();

    tickets.forEach(t => {
      const d = new Date(t.purchaseDate);
      let label;
      
      if (timeRange === 'day') label = d.getHours() + ":00";
      else if (timeRange === 'week') label = d.toLocaleDateString('en-US', { weekday: 'short' });
      else label = d.toLocaleDateString('en-US', { month: 'short' });

      dataMap[label] = (dataMap[label] || 0) + t.price;
    });

    // Simple sort/map for Recharts
    return Object.entries(dataMap).map(([name, sales]) => ({ name, sales }));
  };

  if (!isAdmin || loading) return <div className="p-20 font-bebas text-4xl">Authenticating...</div>;

  return (
    <main className="min-h-screen bg-white font-montserrat pt-24 pb-20">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6">
        
        {/* TOP BAR */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="font-bebas text-7xl text-gray-900 tracking-tighter leading-none">Event Overview</h1>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-2">Summer Salsa Fest 2025</p>
          </div>
          <div className="flex gap-3">
             <button onClick={seedFakeData} className="bg-amber-500 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2"><Database size={14}/> SEED FAKE DATA</button>
             <button onClick={exportToCSV} className="border-2 border-salsa-pink text-salsa-pink px-6 py-2.5 rounded-xl font-black text-[10px] tracking-widest hover:bg-salsa-pink hover:text-white transition uppercase flex items-center gap-2"><Download size={16}/> Export Guest List</button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-8 rounded-[2rem] border-2 border-salsa-mint/20">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Total Revenue</p>
            <p className="font-bebas text-6xl text-salsa-pink">€{tickets.reduce((a, b) => a + b.price, 0)}</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border-2 border-salsa-mint/20">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Tickets Sold</p>
            <p className="font-bebas text-6xl text-gray-900">{tickets.length}</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border-2 border-salsa-mint/20">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Ticket Distribution</p>
            <div className="space-y-1 text-[10px] font-black uppercase text-gray-500">
               <div className="flex justify-between"><span>Full</span> <span className="text-salsa-pink">{tickets.filter(t => t.passType === "Full Pass").length}</span></div>
               <div className="flex justify-between"><span>Party</span> <span className="text-salsa-pink">{tickets.filter(t => t.passType === "Party Pass").length}</span></div>
               <div className="flex justify-between"><span>Performers</span> <span className="text-salsa-pink">{tickets.filter(t => t.passType === "Performers Pass").length}</span></div>
            </div>
          </div>
        </div>

        {/* CHART SECTION */}
        <div className="bg-white p-10 rounded-[3rem] border-2 border-salsa-mint/20 shadow-sm mb-12">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bebas text-4xl">Sales Velocity</h3>
            <div className="flex bg-gray-50 p-1 rounded-xl">
              {['day', 'week', 'year'].map(r => (
                <button 
                  key={r} onClick={() => setTimeRange(r)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition ${timeRange === r ? 'bg-white shadow-md text-salsa-pink' : 'text-gray-400'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getProcessedChartData()}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e84b8a" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#e84b8a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} />
                <YAxis hide />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#e84b8a" strokeWidth={4} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative mb-8">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" />
            <input 
                type="text" placeholder="Search by name or ticket ID..."
                className="w-full p-6 pl-16 bg-white border-2 border-salsa-mint rounded-3xl outline-none font-bold"
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        {/* TABLE LOGIC (Update per character search) */}
        {/* ... (Use the filteredTickets table from previous step) ... */}

      </div>
    </main>
  );
}