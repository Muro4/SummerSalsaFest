"use client";
import { useEffect, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { Html5QrcodeScanner } from "html5-qrcode";
import Navbar from "@/components/Navbar";
import { usePopup } from "@/components/PopupProvider";
import { 
  CheckCircle, RefreshCw, Loader2, Search, 
  AlertCircle, ShieldAlert, XCircle 
} from "lucide-react";

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

export default function AdminScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [manualID, setManualID] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  // HOT CAMERA LOCKS
  const isProcessingRef = useRef(false);
  const scannerInitialized = useRef(false);

  const { showPopup } = usePopup();

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

  // Initialize camera ONLY ONCE on mount. It stays active permanently.
  // Initialize camera ONLY ONCE on mount. It stays active permanently.
  useEffect(() => {
    if (!hasAccess || scannerInitialized.current) return;
    
    scannerInitialized.current = true;
    
    const scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0, 
        // 🚀 MOBILE FIX 1: Explicitly demand the rear camera
        videoConstraints: {
            facingMode: "environment"
        }
    }, false);
    
    scanner.render((text) => {
        // If we are already processing a scan or looking at a result, ignore new scans
        if (isProcessingRef.current) return;
        
        isProcessingRef.current = true;
        handleLookup(text);
    });

    // 🚀 MOBILE FIX 2: Force iOS Safari to play the video inline (preventing black screens)
    // We use a slight delay to ensure the library has injected the <video> element into the DOM first
    setTimeout(() => {
        const videoElement = document.querySelector("#reader video");
        if (videoElement) {
            videoElement.setAttribute("playsinline", "true");
            videoElement.setAttribute("webkit-playsinline", "true");
            videoElement.setAttribute("muted", "true");
        }
    }, 1500);
    
    return () => {
        scanner.clear().catch(() => {});
        scannerInitialized.current = false;
    };
  }, [hasAccess]);

  const handleLookup = async (id) => {
    if (!id || id.trim() === "") {
      setErrorMessage("Please enter a valid Ticket ID");
      isProcessingRef.current = false;
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
        // Release lock after a tiny delay so they can scan another code
        setTimeout(() => { isProcessingRef.current = false; }, 1500);
      } else {
        setScanResult({ id: snap.docs[0].id, ...snap.docs[0].data() });
        // We LEAVE the lock active. They must click "Scan Next" to release it.
      }
    } catch (e) {
      console.error("Firestore Error:", e.code, e.message);
      setErrorMessage(e.code === 'permission-denied' ? "Access Denied: Check Admin permissions." : "System error. Please try again.");
      setTimeout(() => { isProcessingRef.current = false; }, 1500);
    }
    setLoading(false);
  };

  const triggerManualLookup = () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    handleLookup(manualID);
  };

  const resetScanner = () => {
    setScanResult(null);
    setManualID("");
    setErrorMessage(null);
    
    // 1.5s Cooldown: Prevents the camera from instantly re-scanning the same ticket as you pull your phone away
    setTimeout(() => {
        isProcessingRef.current = false;
    }, 1500);
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "tickets", scanResult.id), { 
        status: "used", 
        checkInTime: new Date().toISOString() 
      });
      
      setScanResult(prev => ({ ...prev, status: "used" }));
      
      showPopup({
        type: "success",
        title: "Guest Checked In!",
        message: `${scanResult.userName} is successfully marked as USED.`,
        confirmText: "Scan Next Guest",
        cancelText: "Stay on Ticket",
        onConfirm: resetScanner
      });

    } catch (error) {
      console.error("Error checking in:", error);
      setErrorMessage("Failed to check in. Check your connection.");
    }
    setLoading(false);
  };

  if (authLoading) return <div className="h-dvh flex items-center justify-center font-bebas text-5xl text-salsa-pink animate-pulse">Staff Login...</div>;
  if (!hasAccess) return <div className="h-dvh flex items-center justify-center font-bebas text-4xl text-red-500">Authorized Personnel Only</div>;

  return (
    <main className="h-dvh bg-salsa-white pt-24 pb-8 font-montserrat flex flex-col">
      <Navbar />

      <style dangerouslySetInnerHTML={{__html: `
        #reader { border: none !important; background: transparent !important; }
        #reader__scan_region { min-height: 300px !important; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 2.5rem; background: #f8fafc; }
        #reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; border-radius: 2.5rem !important; }
        #reader__dashboard_section_csr span { display: none !important; }
        #reader__dashboard_section_csr button { background: #0f172a !important; color: white !important; border-radius: 1rem !important; padding: 0.75rem 1.5rem !important; border: none !important; font-family: 'Montserrat', sans-serif !important; font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-size: 11px !important; margin: 10px auto !important; display: block !important; cursor: pointer; }
        #reader__dashboard_section_swaplink { text-decoration: none !important; color: #94a3b8 !important; font-weight: 700 !important; font-size: 10px !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; margin-top: 10px !important; display: inline-block !important; }
        #reader__camera_selection { border: 2px solid #e2e8f0 !important; border-radius: 1rem !important; padding: 0.5rem !important; font-family: 'Montserrat', sans-serif !important; font-weight: 700 !important; font-size: 11px !important; color: #475569 !important; outline: none !important; width: 100% !important; max-width: 250px !important; display: block !important; margin: 0 auto 10px auto !important; }
      `}} />
      
      <div className="max-w-md mx-auto px-4 w-full flex-grow flex flex-col justify-center">
        
        {/* CSS GRID OVERLAP TRICK: Both the Scanner and the Result live in the same cell.
            This prevents layout jumps and allows the camera to stay active but invisible! */}
        <div className="grid grid-cols-1 grid-rows-1 w-full items-center justify-center">

            {/* LAYER 1: HOT CAMERA & MANUAL INPUT */}
            <div className={`col-start-1 row-start-1 flex flex-col gap-4 w-full transition-opacity duration-300 ${scanResult ? 'opacity-0 pointer-events-none' : 'opacity-100 z-10'}`}>
                
                {/* INLINE ERROR MESSAGE */}
                {errorMessage && (
                    <div className="flex items-center justify-center gap-2 text-red-500 font-bold text-[11px] uppercase tracking-widest px-4 py-2 shrink-0 animate-in slide-in-from-top-2 bg-red-50 rounded-xl border border-red-100 mx-auto w-max">
                        <AlertCircle size={14} /> {errorMessage}
                    </div>
                )}

                {/* EXPANDED SCANNER CONTAINER */}
                <div className="bg-white rounded-[3rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex items-center justify-center p-3 w-full shrink-0">
                  <div id="reader" className="w-full rounded-[2.5rem] overflow-hidden flex flex-col min-h-[300px]"></div>
                </div>

                {/* MANUAL ID ENTRY */}
                <div className="bg-white p-3.5 rounded-[2.5rem] border border-gray-100 shadow-sm shrink-0 w-full">
                    <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="ENTER TICKET ID..." 
                          maxLength={12}
                          className="flex-grow p-4 bg-transparent border-2 border-gray-100 rounded-[1.5rem] outline-none focus:border-slate-900 font-mono font-bold uppercase text-center tracking-widest text-sm transition-colors"
                          value={manualID}
                          onChange={(e) => {
                              setManualID(e.target.value);
                              if(errorMessage) setErrorMessage(null);
                          }}
                        />
                        <button 
                          onClick={triggerManualLookup} 
                          disabled={loading || !manualID.trim()}
                          className="bg-slate-900 text-white p-4 px-6 rounded-[1.5rem] hover:bg-salsa-pink disabled:opacity-50 transition-all flex items-center justify-center shrink-0"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* LAYER 2: SCAN RESULT CARD */}
            {scanResult && (
              <div className={`col-start-1 row-start-1 w-full rounded-[3rem] border-2 animate-in zoom-in duration-300 shadow-2xl relative flex flex-col z-20 min-h-[450px] ${
                scanResult.status === 'used' ? "bg-orange-50 border-orange-200" : 
                scanResult.status === 'pending' ? "bg-slate-50 border-gray-200" : 
                "bg-emerald-50 border-emerald-200"
              }`}>
                  
                  {/* TOP LEFT SECONDARY ESCAPE HATCH */}
                  <button 
                      onClick={resetScanner} 
                      className="absolute top-5 left-5 flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors p-2.5 rounded-xl hover:bg-white/60 bg-white/40 z-30 shadow-sm"
                  >
                      <RefreshCw size={14}/> Scan Next
                  </button>

                  <div className="flex-grow flex flex-col items-center justify-center text-center px-6 pt-20 pb-10 relative z-10">
                    
                    {/* 1. TICKET STATUS */}
                    <div className={`flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest mb-6 ${
                      scanResult.status === 'used' ? 'text-orange-500' : 
                      scanResult.status === 'pending' ? 'text-slate-400' :
                      'text-emerald-500'
                    }`}>
                        {scanResult.status === 'used' ? <><XCircle size={20}/> Already Scanned</> : 
                        scanResult.status === 'pending' ? <><AlertCircle size={20}/> Pending Payment</> : 
                        <><CheckCircle size={20}/> Valid Pass</>}
                    </div>
                    
                    {/* 2. ATTENDEE NAME */}
                    <h2 className="font-bebas text-6xl text-slate-900 leading-none uppercase break-words whitespace-normal mb-8 px-2 tracking-wider">
                      {scanResult.userName}
                    </h2>
                    
                    {/* 3. PASS TYPE PILL */}
                    <span className={`inline-flex items-center justify-center px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${getPassStyle(scanResult.passType)}`}>
                      {scanResult.passType}
                    </span>

                  </div>

                  {/* ACTION BUTTONS (Dynamic based on status) */}
                  <div className="p-6 pt-0 w-full shrink-0">
                    {scanResult.status === 'active' ? (
                      <button 
                        onClick={handleCheckIn} 
                        disabled={loading} 
                        className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-lg hover:bg-emerald-500 hover:shadow-emerald-500/20 flex items-center justify-center gap-3 text-sm uppercase tracking-widest transition-all"
                      >
                          {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={20} /> Check-in Guest</>}
                      </button>
                    ) : (
                      <button 
                        onClick={resetScanner} 
                        className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-lg hover:bg-slate-800 flex items-center justify-center gap-3 text-sm uppercase tracking-widest transition-all"
                      >
                          <RefreshCw size={20} /> Scan Next Guest
                      </button>
                    )}
                  </div>

              </div>
            )}
            
        </div>
      </div>
    </main>
  );
}