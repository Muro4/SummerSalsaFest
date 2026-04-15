"use client";
import { useEffect, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { Html5Qrcode } from "html5-qrcode"; 
import Navbar from "@/components/Navbar";
import { usePopup } from "@/components/PopupProvider";
import { 
  CheckCircle, RefreshCw, Loader2, Search, 
  AlertCircle, ShieldAlert, XCircle 
} from "lucide-react";

// Shared pass styling
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

// Dynamic font sizing for long names
const getScannerNameSize = (name) => {
  if (!name) return "text-5xl";
  if (name.length > 22) return "text-3xl leading-tight";
  if (name.length > 12) return "text-4xl leading-tight";
  return "text-6xl leading-none";
};

export default function AdminScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [manualID, setManualID] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Camera Engine State Refs
  const isProcessingRef = useRef(false);
  const scannerInitialized = useRef(false);
  const scannerInstance = useRef(null); // Tracks the active camera instance

  const { showPopup } = usePopup();

  // Authentication validation
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const d = await getDoc(doc(db, "users", user.uid));
        // Allow superadmin, admin, and scanner roles
        if (["superadmin", "admin", "scanner"].includes(d.data()?.role)) {
          setHasAccess(true);
        }
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Initialize camera ONLY ONCE on mount.
  useEffect(() => {
    if (!hasAccess || scannerInitialized.current) return;
    
    scannerInitialized.current = true;
    
    const initializeScanner = async () => {
      try {
        scannerInstance.current = new Html5Qrcode("reader");
        
        await scannerInstance.current.start(
          { facingMode: "environment" }, 
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (text) => {
            if (isProcessingRef.current) return;
            isProcessingRef.current = true;
            handleLookup(text);
          },
          (errorMessage) => {
            // Ignore background scan errors safely
          }
        );
      } catch (err) {
        console.error("Camera access denied or failed:", err);
        setErrorMessage("Camera blocked or unavailable. Please use manual entry.");
      }
    };

    initializeScanner();
    
    // Cleanup function strictly stops the camera if the component is fully unmounted
    return () => {
      if (scannerInstance.current) {
        try {
          const state = scannerInstance.current.getState();
          // 1 = NOT_STARTED, 2 = SCANNING, 3 = PAUSED
          if (state !== 1) {
            scannerInstance.current.stop().then(() => scannerInstance.current.clear()).catch(console.error);
          }
        } catch (e) {
          console.error("Camera cleanup error:", e);
        }
      }
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
        // Release the lock so they can immediately try scanning again
        setTimeout(() => { isProcessingRef.current = false; }, 1500);
      } else {
        // SUCCESS: Explicitly pause the camera feed to prevent the browser from 
        // silently killing the background video stream while the overlay is shown.
        if (scannerInstance.current) {
          try {
            if (scannerInstance.current.getState() === 2) { // 2 = SCANNING
              scannerInstance.current.pause(true); // 'true' pauses the video hardware
            }
          } catch (e) {
            console.warn("Could not pause camera:", e);
          }
        }

        setScanResult({ id: snap.docs[0].id, ...snap.docs[0].data() });
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

  // Resets the UI and wakes the camera back up
  const resetScanner = () => {
    setScanResult(null);
    setManualID("");
    setErrorMessage(null);
    
    // WAKE UP: Explicitly resume the camera feed
    if (scannerInstance.current) {
      try {
        if (scannerInstance.current.getState() === 3) { // 3 = PAUSED
          scannerInstance.current.resume();
        }
      } catch (e) {
        console.warn("Could not resume camera:", e);
      }
    }

    // Short delay before accepting new QR codes to prevent accidental double-scans
    setTimeout(() => {
        isProcessingRef.current = false;
    }, 1000);
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

      <div className="max-w-md mx-auto px-4 w-full flex-grow flex flex-col justify-center">
        
        <div className="grid grid-cols-1 grid-rows-1 w-full items-center justify-center">

            {/* LAYER 1: HOT CAMERA & MANUAL INPUT */}
            <div className={`col-start-1 row-start-1 flex flex-col gap-4 w-full transition-opacity duration-300 ${scanResult ? 'opacity-0 pointer-events-none' : 'opacity-100 z-10'}`}>
                
                {errorMessage && (
                    <div className="flex items-center justify-center gap-2 text-red-500 font-bold text-[11px] uppercase tracking-widest px-4 py-2 shrink-0 animate-in slide-in-from-top-2 bg-red-50 rounded-xl border border-red-100 mx-auto w-max max-w-full text-center">
                        <AlertCircle size={14} className="shrink-0" /> <span className="truncate">{errorMessage}</span>
                    </div>
                )}

                {/* EXPANDED SCANNER CONTAINER */}
                <div className="bg-white rounded-[3rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex items-center justify-center p-3 w-full shrink-0">
                  <div 
                    id="reader" 
                    className="w-full rounded-[2.5rem] overflow-hidden flex flex-col min-h-[300px] bg-slate-100 relative [&>video]:object-cover [&>video]:w-full [&>video]:h-full [&>video]:absolute [&>video]:inset-0 [&>video]:rounded-[2.5rem]"
                  ></div>
                </div>

                {/* MANUAL ID ENTRY */}
                <div className="bg-white p-3.5 rounded-[2.5rem] border border-gray-100 shadow-sm shrink-0 w-full">
                    <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="ENTER TICKET ID..." 
                          maxLength={12}
                          className="flex-grow w-full min-w-0 p-4 bg-transparent border-2 border-gray-100 rounded-[1.5rem] outline-none focus:border-slate-900 font-mono font-bold uppercase text-center tracking-widest text-sm transition-colors"
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

                  <div className="flex-grow flex flex-col items-center justify-center text-center px-4 pt-20 pb-10 relative z-10 w-full overflow-hidden">
                    
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
                    
                    {/* 2. ATTENDEE NAME (Now dynamic and wrap-safe!) */}
                    <h2 className={`font-bebas text-slate-900 uppercase break-words hyphens-auto mb-8 px-2 tracking-wider w-full ${getScannerNameSize(scanResult.userName)}`}>
                      {scanResult.userName}
                    </h2>
                    
                    {/* 3. PASS TYPE PILL */}
                    <span className={`inline-flex items-center justify-center px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${getPassStyle(scanResult.passType)}`}>
                      {scanResult.passType}
                    </span>

                  </div>

                  {/* ACTION BUTTONS */}
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
                          {loading ? <Loader2 className="animate-spin" size={20} /> : <><RefreshCw size={20} /> Scan Next Guest</>}
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