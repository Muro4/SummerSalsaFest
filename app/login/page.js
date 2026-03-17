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
import Button from "@/components/Button";
import { Eye, EyeOff, Lock, Mail, User as UserIcon, CheckCircle2, Circle, ArrowLeft } from "lucide-react";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form State
  const [name, setName] = useState(""); 
  const [identifier, setIdentifier] = useState(""); 
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  
  // Status State
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // --- REGEX & VALIDATION ---
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Removed the 'lower' requirement entirely
  const getPasswordReqs = (pass) => ({
    length: pass.length >= 8,
    upper: /[A-Z]/.test(pass),
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
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return; 
      setError("Google authentication failed.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      let loginEmail = identifier.trim();

      if (!emailRegex.test(loginEmail)) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("displayName", "==", loginEmail));
        const snap = await getDocs(q);

        if (snap.empty) throw new Error(`No account found with the name "${loginEmail}".`);
        loginEmail = snap.docs[0].data().email;
      }

      await signInWithEmailAndPassword(auth, loginEmail, password);
      router.push("/"); 
      
    } catch (err) {
      if (err.code === "permission-denied" || err.message.includes("Missing or insufficient permissions")) {
        setError("Database blocked the search. Update Firestore Rules.");
      } else {
        setError(err.message.includes("No account found") ? err.message : "Invalid credentials.");
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
      
      <Button 
        href="/" 
        variant="ghost" 
        icon={ArrowLeft} 
        className="absolute top-8 left-4 md:left-8 z-50 text-slate-800 hover:text-salsa-pink border-none"
      >
        Home
      </Button>

      <div className="relative w-full max-w-4xl min-h-[700px] h-auto md:h-[700px] bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col md:flex-row mt-16 md:mt-0">
        
        {/* =========================================
            MOBILE VIEW
        ========================================= */}
        <div className="md:hidden flex flex-col w-full p-8 relative z-10">
          <div className="text-center mb-8">
            <h1 className="font-bebas text-5xl text-slate-900 mb-2 uppercase">{isLogin ? "Login" : "Create Account"}</h1>
          </div>

          <Button onClick={handleGoogleAuth} variant="outline" className="w-full py-4 mb-6">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5" alt="google" />
            Join with Google
          </Button>

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
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 ml-2">Email or Name</label>
              <div className="relative flex items-center">
                <input required type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-medium rounded-2xl px-6 py-4 pl-12 focus:bg-white focus:border-slate-900 focus:shadow-md focus:ring-0 transition-all outline-none" />
                <UserIcon className="absolute left-4 text-gray-500" size={18} />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 ml-2">Password</label>
              <div className="relative flex items-center">
                <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-medium rounded-2xl px-6 py-4 pl-12 focus:bg-white focus:border-slate-900 focus:shadow-md focus:ring-0 transition-all outline-none" />
                <Lock className="absolute left-4 text-gray-500" size={18} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer absolute right-4 text-gray-500 hover:text-slate-900 transition">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && isLogin && <p className="text-red-500 text-[10px] font-black tracking-widest uppercase text-center bg-red-50 p-3 rounded-xl">{error}</p>}
            
            <Button type="submit" variant="primary" className="w-full mt-4 !py-4" disabled={loading} isLoading={loading}>
              {loading ? "Authenticating..." : "Login"}
            </Button>

            <div className="relative mb-6 mt-6 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative inline-block bg-white px-4 text-[10px] uppercase font-black text-slate-600 tracking-widest">Or</div>
            </div>

            <Button type="button" onClick={handleGoogleAuth} variant="outline" className="w-full !py-3">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 mr-1 bg-white rounded-full" alt="google" />
              Join with Google
            </Button>
          </form>
        </div>

        {/* =========================================
            DESKTOP VIEW: SIGN UP FORM
        ========================================= */}
        <div className="hidden md:flex flex-col justify-center w-1/2 p-10 absolute right-0 h-full z-10">
          <h1 className="font-bebas text-6xl text-slate-900 mb-2 uppercase text-center tracking-wide">Create Account</h1>
          
          <form onSubmit={handleSignUp} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 ml-2">Full Name</label>
              <div className="relative flex items-center">
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-slate-900 font-medium rounded-2xl px-6 py-3.5 pl-12 focus:bg-white focus:border-slate-900 focus:shadow-md focus:ring-0 transition-all outline-none" />
                <UserIcon className="absolute left-4 text-gray-500" size={18} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 ml-2">Email Address</label>
              <div className="relative flex items-center">
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={`w-full bg-gray-50 border text-slate-900 font-medium rounded-2xl px-6 py-3.5 pl-12 focus:bg-white focus:shadow-md focus:ring-0 transition-all outline-none ${isEmailInvalid ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'}`} />
                <Mail className={`absolute left-4 ${isEmailInvalid ? 'text-red-400' : 'text-gray-500'}`} size={18} />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 ml-2">Create Password</label>
              <div className="relative flex items-center">
                <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className={`w-full bg-gray-50 border text-slate-900 font-medium rounded-2xl px-6 py-3.5 pl-12 focus:bg-white focus:shadow-md focus:ring-0 transition-all outline-none ${isPasswordInvalid ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'}`} />
                <Lock className={`absolute left-4 ${isPasswordInvalid ? 'text-red-400' : 'text-gray-500'}`} size={18} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer absolute right-4 text-gray-500 hover:text-slate-900 transition">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* CLEAR 4-PILL VALIDATION: Expanded labels, more breathing room */}
              <div className="flex justify-between w-full mt-2 pt-1 gap-1.5">
                {[
                  { req: passReqs.length, label: "8+ Chars" },
                  { req: passReqs.upper, label: "Upper" },
                  { req: passReqs.number, label: "Number" },
                  { req: passReqs.special, label: "Symbol" },
                ].map((r, idx) => (
                  <span key={idx} className={`flex items-center justify-center gap-1 w-full text-[9px] font-black uppercase tracking-widest px-2 py-1.5 rounded-md border transition-colors ${r.req ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                    {r.req ? <CheckCircle2 size={10} className="shrink-0" /> : <Circle size={10} className="shrink-0" />} {r.label}
                  </span>
                ))}
              </div>
            </div>

            {error && !isLogin && <p className="text-red-500 text-[10px] font-black tracking-widest uppercase text-center bg-red-50 p-3 rounded-xl">{error}</p>}
            
            <Button type="submit" variant="primary" className="w-full mt-2 !py-4" disabled={loading || !isPasswordValid} isLoading={loading}>
              {loading ? "Creating..." : "Sign Up"}
            </Button>

            <div className="relative mb-6 mt-4 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative inline-block bg-white px-4 text-[10px] uppercase font-black text-slate-600 tracking-widest">Or</div>
            </div>

            <Button type="button" onClick={handleGoogleAuth} variant="outline" className="w-full !py-3">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 mr-1 bg-white rounded-full" alt="google" />
              Join with Google
            </Button>
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
                Don't have an account yet? Sign up!
              </p>
              <Button onClick={toggleMode} variant="outline" className="border-slate-900 text-slate-900 hover:bg-teal-600 hover:border-teal-600 hover:text-white px-10 py-4">
                Sign Up
              </Button>
            </div>

            <div className={`absolute inset-0 flex flex-col items-center justify-center px-12 transition-all duration-700 ${!isLogin ? 'opacity-100 translate-x-0 delay-300 pointer-events-auto' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
              <h2 className="font-bebas text-6xl mb-4 tracking-wide text-slate-900">Welcome, Dancer!</h2>
              <p className="font-bold text-slate-800 leading-relaxed mb-8">
                Already registered? Login!
              </p>
              <Button onClick={toggleMode} variant="outline" className="border-slate-900 text-slate-900 hover:bg-teal-600 hover:border-teal-600 hover:text-white px-10 py-4">
                Login
              </Button>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}