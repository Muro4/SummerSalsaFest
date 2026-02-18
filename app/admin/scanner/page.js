"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { Html5QrcodeScanner } from "html5-qrcode";
import Navbar from "@/components/Navbar";
import { CheckCircle, RefreshCw, ShieldAlert, Loader2, Search, Camera, AlertCircle } from "lucide-react";

export default function AdminScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [manualID, setManualID] = useState("");
  const [errorMessage, setErrorMessage] = useState(null); // Inline error message
  const [loading, setLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const d = await getDoc(doc(db, "users", user.uid));
        if (d.data()?.role === "superadmin" || d.data()?.role === "admin") setHasAccess(true);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Initialize camera ONLY when no result is being displayed
  useEffect(() => {
    if (!hasAccess || scanResult) return;
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
    scanner.render((text) => {
        scanner.clear(); // Halt camera
        handleLookup(text);
    });
    return () => scanner.clear().catch(() => {});
  }, [hasAccess, scanResult]);

  const handleLookup = async (id) => {
  if (!id || id.trim() === "") {
    setErrorMessage("Please enter a valid Ticket ID");
    return;
  }

  setLoading(true);
  setErrorMessage(null);

  try {
    const q = query(
      collection(db, "tickets"), 
      where("ticketID", "==", id.toUpperCase().trim())
    );
    
    const snap = await getDocs(q);

    if (snap.empty) {
      setErrorMessage("Ticket not found in database.");
    } else {
      setScanResult({ id: snap.docs[0].id, ...snap.docs[0].data() });
    }
  } catch (e) {
    // THIS LOG IS CRITICAL:
    console.error("Firestore Error:", e.code, e.message);
    
    if (e.code === 'permission-denied') {
        setErrorMessage("Access Denied: Check your Admin role.");
    } else {
        setErrorMessage("System error. Check console (F12).");
    }
  }
  setLoading(false);
};

  const handleCheckIn = async () => {
    setLoading(true);
    await updateDoc(doc(db, "tickets", scanResult.id), { status: "used", checkInTime: new Date().toISOString() });
    setScanResult({ ...scanResult, status: "used" });
    setLoading(false);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center font-bebas text-5xl text-salsa-pink animate-pulse">Staff Login...</div>;
  if (!hasAccess) return <div className="min-h-screen flex items-center justify-center font-bebas text-4xl text-red-500">Authorized Personnel Only</div>;

  return (
    <main className="min-h-screen bg-salsa-white pt-24 pb-20 font-montserrat">
      <Navbar />
      <div className="max-w-md mx-auto px-4 mt-10">
        
        {!scanResult && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-center">
                <h1 className="font-bebas text-6xl text-gray-900 uppercase leading-none">Gate Entry</h1>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Festival Check-in System</p>
            </div>

            <div className="bg-white rounded-[2.5rem] border-2 border-salsa-mint/20 shadow-2xl overflow-hidden min-h-[300px] flex items-center justify-center">
               <div id="reader" className="w-full"></div>
            </div>

            {/* INLINE RED ERROR MESSAGE */}
            {errorMessage && (
                <div className="flex items-center justify-center gap-2 text-red-500 font-bold text-[11px] uppercase tracking-widest px-4 animate-in slide-in-from-top-2">
                    <AlertCircle size={14} /> {errorMessage}
                </div>
            )}

            <div className="bg-white p-6 rounded-[2.5rem] border-2 border-salsa-mint/20 shadow-lg">
                <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="ENTER ID..." 
                      className="flex-grow p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 ring-salsa-mint/10 font-mono font-bold uppercase text-center"
                      value={manualID}
                      onChange={(e) => {
                          setManualID(e.target.value);
                          if(errorMessage) setErrorMessage(null);
                      }}
                    />
                    <button onClick={() => handleLookup(manualID)} className="bg-gray-900 text-white p-4 px-6 rounded-2xl hover:bg-emerald-500 transition-all">
                        {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* INFO SCREEN (ONLY FOR SUCCESSFUL SEARCH) */}
        {scanResult && (
          <div className={`p-10 rounded-[3.5rem] border-4 animate-in zoom-in duration-300 shadow-2xl ${scanResult.status === 'used' ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-300"}`}>
              <div className="text-center">
                <div className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase mb-8 ${scanResult.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                    {scanResult.status === 'active' ? 'Valid Pass' : 'Entry Denied'}
                </div>
                
                <h2 className="font-bebas text-6xl text-gray-900 leading-none uppercase">{scanResult.userName}</h2>
                <p className="font-black text-salsa-pink text-xs uppercase tracking-widest mt-2 mb-10">{scanResult.passType}</p>

                {scanResult.status === 'active' ? (
                  <button onClick={handleCheckIn} disabled={loading} className="w-full bg-emerald-600 text-white font-black py-6 rounded-3xl shadow-xl flex items-center justify-center gap-3 text-sm uppercase tracking-widest">
                      {loading ? <Loader2 className="animate-spin" /> : <>Check-in Guest</>}
                  </button>
                ) : (
                  <div className="bg-white/80 p-6 rounded-[2rem] border-2 border-amber-200 flex flex-col items-center gap-2">
                     <ShieldAlert className="text-amber-500" />
                     <p className="text-[10px] font-black text-amber-900 uppercase">ALREADY SCANNED</p>
                  </div>
                )}
                
                <button 
                    onClick={() => { setScanResult(null); setManualID(""); }} 
                    className="mt-10 flex items-center gap-2 mx-auto text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-salsa-pink transition"
                >
                    <RefreshCw size={14}/> Reset Scanner
                </button>
              </div>
          </div>
        )}
      </div>
    </main>
  );
}