"use client";
import { useState } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  updateProfile 
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, User as UserIcon, ChevronDown, ChevronUp, CheckCircle2, Circle, ArrowLeft } from "lucide-react";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showReqs, setShowReqs] = useState(false);
  
  // Form State
  const [name, setName] = useState(""); // Used for Sign Up
  const [identifier, setIdentifier] = useState(""); // Used for Login (Email OR Name)
  const [email, setEmail] = useState(""); // Used for Sign Up
  const [password, setPassword] = useState(""); 
  
  // Status State
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // --- REGEX & VALIDATION ---
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  const getPasswordReqs = (pass) => ({
    length: pass.length >= 8,
    upper: /[A-Z]/.test(pass),
    lower: /[a-z]/.test(pass),
    number: /[0-9]/.test(pass),
    special: /[^A-Za-z0-9]/.test(pass),
  });
  
  const passReqs = getPasswordReqs(password);
  const isPasswordValid = Object.values(passReqs).every(Boolean);
  
  const isPasswordInvalid = password.length > 0 && !isPasswordValid && !isLogin;
  const isEmailInvalid = email.length > 0 && !emailRegex.test(email) && !isLogin;

  // --- FIRESTORE SYNC ---
  const syncUserToFirestore = async (user, displayName) => {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: displayName || user.displayName || "Dancer",
        email: user.email,
        role: "user",
        createdAt: new Date().toISOString(),
      });
    }
  };

  // --- AUTH METHODS ---
  const handleGoogleAuth = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncUserToFirestore(result.user);
      router.push("/"); 
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return; 
      }
      setError("Google authentication failed.");
    }
  };

  // UPDATED: UNIFIED LOGIN LOGIC
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      let loginEmail = identifier.trim();

      // If the input does NOT look like an email, we assume it's their Name
      if (!emailRegex.test(loginEmail)) {
        const usersRef = collection(db, "users");
        // Search Firestore for a matching displayName
        const q = query(usersRef, where("displayName", "==", loginEmail));
        const snap = await getDocs(q);

        if (snap.empty) {
          throw new Error(`No account found with the name "${loginEmail}". (Check exact spelling & capital letters!)`);
        }
        
        // Grab the email associated with that Name
        loginEmail = snap.docs[0].data().email;
      }

      // Finally, log them in using Firebase Auth
      await signInWithEmailAndPassword(auth, loginEmail, password);
      router.push("/"); 
      
    } catch (err) {
      console.error("Login Error details:", err); // <-- This will show the real error in your browser console (F12)
      
      // Check if Firebase Security Rules are blocking the read
      if (err.code === "permission-denied" || err.message.includes("Missing or insufficient permissions")) {
        setError("Database blocked the search. Please update your Firestore Security Rules.");
      } else {
        // Show our custom message, otherwise generic invalid
        setError(err.message.includes("No account found") ? err.message : "Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!emailRegex.test(email)) return setError("Please enter a valid email address.");
    if (!isPasswordValid) return setError("Please meet all password requirements.");

    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(res.user, { displayName: name });
      await syncUserToFirestore(res.user, name);
      router.push("/"); 
    } catch (err) {
      setError(err.message.includes("email-already-in-use") ? "This email is already registered." : "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setPassword("");
    setEmail("");
    setName("");
    setIdentifier("");
  };

  return (
    <main className="min-h-screen bg-salsa-white flex items-center justify-center p-4 font-montserrat relative">
      
      {/* GLOBAL BACK BUTTON */}
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-800 hover:text-salsa-pink font-black text-[10px] uppercase tracking-widest transition-colors z-50">
        <ArrowLeft size={16} /> Home
      </Link>

      <div className="relative w-full max-w-4xl min-h-[700px] bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col md:flex-row mt-12 md:mt-0">
        
        {/* =========================================
            MOBILE VIEW
        ========================================= */}
        <div className="md:hidden flex flex-col w-full p-8 relative z-10">
          <div className="text-center mb-8">
            <h1 className="font-bebas text-5xl text-slate-900 mb-2 uppercase">{isLogin ? "Login" : "Create Account"}</h1>
          </div>

          <button type="button" onClick={handleGoogleAuth} className="cursor-pointer w-full flex items-center justify-center gap-3 border-2 border-gray-200 py-4 rounded-2xl hover:scale-105 hover:shadow-md transition-all mb-6 font-black tracking-widest text-xs uppercase text-slate-800">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5" alt="google" />
            Join with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-white px-4 text-slate-600 tracking-widest">Or Email</span></div>
          </div>

          {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-xl mb-4">{error}</p>}

          <div className="mt-8 text-center text-xs font-bold text-slate-600 uppercase tracking-widest">
            {isLogin ? "New here? " : "Already have an account? "}
            <button type="button" onClick={toggleMode} className="cursor-pointer text-slate-900 font-black ml-1 hover:text-salsa-pink transition-colors">
              {isLogin ? "Sign Up" : "Login"}
            </button>
          </div>
        </div>

        {/* =========================================
            DESKTOP VIEW: LOGIN FORM
        ========================================= */}
        <div className="hidden md:flex flex-col justify-center w-1/2 p-12 absolute left-0 h-full z-10">
          <h1 className="font-bebas text-6xl text-slate-900 mb-2 uppercase text-center tracking-wide">Login</h1>
          
          <button type="button" onClick={handleGoogleAuth} className="cursor-pointer w-full flex items-center justify-center gap-3 border-2 border-gray-200 py-3 rounded-2xl hover:scale-105 hover:shadow-md transition-all mb-6 font-black tracking-widest text-[10px] uppercase text-slate-800 mt-4 group">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 bg-white rounded-full group-hover:scale-110 transition-transform" alt="google" />
            Join with Google
          </button>
          
          <div className="relative mb-6 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative inline-block bg-white px-4 text-[10px] uppercase font-black text-slate-600 tracking-widest">Or use credentials</div>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 ml-2">Email or Name</label>
              <div className="relative flex items-center">
                {/* Changed to type="text" to allow Names, and bound to identifier state */}
                <input required type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-medium rounded-2xl px-6 py-4 pl-12 focus:bg-white focus:border-salsa-mint focus:ring-2 focus:ring-salsa-mint/30 transition-all outline-none" />
                <UserIcon className="absolute left-4 text-gray-500" size={18} />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 ml-2">Password</label>
              <div className="relative flex items-center">
                <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-medium rounded-2xl px-6 py-4 pl-12 focus:bg-white focus:border-salsa-mint focus:ring-2 focus:ring-salsa-mint/30 transition-all outline-none" />
                <Lock className="absolute left-4 text-gray-500" size={18} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer absolute right-4 text-gray-500 hover:text-slate-900 transition">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && isLogin && <p className="text-red-500 text-[10px] font-black tracking-widest uppercase text-center bg-red-50 p-3 rounded-xl">{error}</p>}
            
            <button type="submit" disabled={loading} className="cursor-pointer w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-salsa-pink transition-all tracking-widest text-xs uppercase shadow-xl mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Authenticating..." : "Login"}
            </button>
          </form>
        </div>

        {/* =========================================
            DESKTOP VIEW: SIGN UP FORM
        ========================================= */}
        <div className="hidden md:flex flex-col justify-center w-1/2 p-12 absolute right-0 h-full z-10">
          <h1 className="font-bebas text-6xl text-slate-900 mb-2 uppercase text-center tracking-wide">Create Account</h1>
          
          <button type="button" onClick={handleGoogleAuth} className="cursor-pointer w-full flex items-center justify-center gap-3 border-2 border-gray-200 py-3 rounded-2xl hover:scale-105 hover:shadow-md transition-all mb-6 font-black tracking-widest text-[10px] uppercase text-slate-800 mt-4 group">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 bg-white rounded-full group-hover:scale-110 transition-transform" alt="google" />
            Join with Google
          </button>
          
          <div className="relative mb-6 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative inline-block bg-white px-4 text-[10px] uppercase font-black text-slate-600 tracking-widest">Or use email</div>
          </div>
          
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 ml-2">Full Name</label>
              <div className="relative flex items-center">
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-medium rounded-2xl px-4 py-3 pl-12 focus:bg-white focus:border-salsa-mint focus:ring-2 focus:ring-salsa-mint/30 transition-all outline-none" />
                <UserIcon className="absolute left-4 text-gray-500" size={18} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 ml-2">Email Address</label>
              <div className="relative flex items-center">
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={`w-full bg-gray-50 border text-slate-900 font-medium rounded-2xl px-6 py-3 pl-12 focus:bg-white focus:ring-2 transition-all outline-none ${isEmailInvalid ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : 'border-gray-200 focus:border-salsa-mint focus:ring-salsa-mint/30'}`} />
                <Mail className={`absolute left-4 ${isEmailInvalid ? 'text-red-400' : 'text-gray-500'}`} size={18} />
              </div>
              {isEmailInvalid && <p className="text-red-500 text-[10px] font-bold mt-1 ml-2 tracking-widest">Please enter a valid email.</p>}
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 ml-2">Create Password</label>
              <div className="relative flex items-center">
                <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className={`w-full bg-gray-50 border text-slate-900 font-medium rounded-2xl px-6 py-3 pl-12 focus:bg-white focus:ring-2 transition-all outline-none ${isPasswordInvalid ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : 'border-gray-200 focus:border-salsa-mint focus:ring-salsa-mint/30'}`} />
                <Lock className={`absolute left-4 ${isPasswordInvalid ? 'text-red-400' : 'text-gray-500'}`} size={18} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer absolute right-4 text-gray-500 hover:text-slate-900 transition">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {isPasswordInvalid && <p className="text-red-500 text-[10px] font-bold mt-1 ml-2 tracking-widest">Password must meet all requirements.</p>}

              <div className={`mt-2 bg-gray-50 rounded-xl overflow-hidden border ${isPasswordInvalid ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                <button type="button" onClick={() => setShowReqs(!showReqs)} className={`cursor-pointer w-full flex items-center justify-between p-3 text-[10px] font-black uppercase tracking-widest transition-colors ${isPasswordInvalid ? 'text-red-500' : 'text-slate-800 hover:text-slate-900'}`}>
                  Password Requirements
                  {showReqs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <div className={`transition-all duration-300 px-4 space-y-2 overflow-hidden ${showReqs || isPasswordInvalid ? 'max-h-40 pb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {[
                    { req: passReqs.length, text: "At least 8 characters" },
                    { req: passReqs.upper, text: "One uppercase letter" },
                    { req: passReqs.lower, text: "One lowercase letter" },
                    { req: passReqs.number, text: "One number" },
                    { req: passReqs.special, text: "One special character" },
                  ].map((r, idx) => (
                    <div key={idx} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${r.req ? 'text-slate-900' : 'text-gray-400'}`}>
                      {r.req ? <CheckCircle2 size={12} /> : <Circle size={12} />} {r.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && !isLogin && <p className="text-red-500 text-[10px] font-black tracking-widest uppercase text-center bg-red-50 p-3 rounded-xl">{error}</p>}
            
            <button type="submit" disabled={loading || !isPasswordValid} className="cursor-pointer w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-salsa-pink transition-all tracking-widest text-xs uppercase shadow-xl mt-2 disabled:opacity-50 disabled:bg-slate-900 disabled:cursor-not-allowed">
              {loading ? "Creating..." : "Sign Up"}
            </button>
          </form>
        </div>

        {/* =========================================
            THE MAGIC SLIDING OVERLAY (Mint Gradient)
        ========================================= */}
        <div className={`hidden md:flex absolute top-0 left-0 w-1/2 h-full z-30 transition-transform duration-700 ease-in-out ${isLogin ? 'translate-x-full' : 'translate-x-0'}`}>
          
          <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-salsa-mint shadow-2xl">
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0a0024 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          </div>
          
          <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-12">
            
            <div className={`absolute inset-0 flex flex-col items-center justify-center px-12 transition-all duration-700 ${isLogin ? 'opacity-100 translate-x-0 delay-300 pointer-events-auto' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
              <h2 className="font-bebas text-6xl mb-4 tracking-wide text-slate-900">Welcome Back!</h2>
              <p className="font-bold text-slate-800 leading-relaxed mb-8">
                Don't have an account yet? Sign up to access your tickets, view the schedule, and join the biggest summer festival in the Balkans.
              </p>
              <button onClick={toggleMode} className="cursor-pointer border-2 border-slate-900 text-slate-900 font-black px-10 py-4 rounded-2xl hover:bg-teal-600 hover:border-teal-600 hover:text-white active:bg-teal-700 transition-all tracking-widest text-xs uppercase">
                Sign Up
              </button>
            </div>

            <div className={`absolute inset-0 flex flex-col items-center justify-center px-12 transition-all duration-700 ${!isLogin ? 'opacity-100 translate-x-0 delay-300 pointer-events-auto' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
              <h2 className="font-bebas text-6xl mb-4 tracking-wide text-slate-900">Welcome, Dancer!</h2>
              <p className="font-bold text-slate-800 leading-relaxed mb-8">
                Already registered? Login to your account to view your passes, update your profile, and get ready for the music.
              </p>
              <button onClick={toggleMode} className="cursor-pointer border-2 border-slate-900 text-slate-900 font-black px-10 py-4 rounded-2xl hover:bg-teal-600 hover:border-teal-600 hover:text-white active:bg-teal-700 transition-all tracking-widest text-xs uppercase">
                Login
              </button>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}