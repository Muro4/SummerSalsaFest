"use client";
import { useState, useEffect, Suspense } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  updateProfile 
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import { Eye, EyeOff, Lock, Mail, User as UserIcon, CheckCircle2, Circle, ArrowLeft } from "lucide-react";

// --- DYNAMIC PASSWORD ACCORDION ---
function PasswordAccordion({ passReqs, isFocused, passwordLength }) {
  const showAccordion = isFocused || passwordLength > 0;
  
  const reqs = [
    { label: "8+ Characters", met: passReqs.length },
    { label: "Uppercase Letter", met: passReqs.upper },
    { label: "Lowercase Letter", met: passReqs.lower },
    { label: "Number", met: passReqs.number },
    { label: "Special Symbol", met: passReqs.special },
  ];

  return (
    <div className={`grid transition-all duration-500 ease-in-out ${showAccordion ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
      <div className="overflow-hidden">
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
          <div className="mb-1">
            <p className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Password Requirements</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reqs.map((req, idx) => (
              // Bumped to text-[11px] and made unmet conditions red
              <div key={idx} className={`flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors duration-300 ${req.met ? 'text-emerald-600' : 'text-red-500'}`}>
                {req.met ? <CheckCircle2 size={16} className="shrink-0 text-emerald-500" /> : <Circle size={16} className="shrink-0 text-red-400" />}
                <span className="truncate">{req.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN LOGIN LOGIC CONTENT ---
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const urlMode = searchParams.get('mode');

  // Default to Login, unless the URL says 'signup' or they are a guest
  const [isLogin, setIsLogin] = useState(urlMode !== 'signup');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  // Form State
  const [name, setName] = useState(""); 
  const [identifier, setIdentifier] = useState(""); 
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  
  // Status State
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- AUTO-DETECT GUESTS ---
  useEffect(() => {
    if (sessionStorage.getItem("guestSessionID") || urlMode === 'signup') {
      setIsLogin(false);
    }
  }, [urlMode]);

  // --- REGEX & VALIDATION ---
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  const getPasswordReqs = (pass) => ({
    length: pass.length >= 8,
    lower: /[a-z]/.test(pass),
    upper: /[A-Z]/.test(pass),
    number: /[0-9]/.test(pass),
    special: /[^A-Za-z0-9]/.test(pass), 
  });
  
  const passReqs = getPasswordReqs(password);
  const passwordScore = Object.values(passReqs).filter(Boolean).length;
  
  // STRICT: All 5 requirements must be met!
  const isPasswordValid = passwordScore === 5;
  
  const isPasswordInvalid = password.length > 0 && !isPasswordValid && !isLogin;
  const isEmailInvalid = email.length > 0 && !emailRegex.test(email) && !isLogin;

  // The Magic Trigger: Hides the Google Button when user starts typing password
  const hideSocials = passwordFocused || password.length > 0;

  const handlePasswordBlur = () => {
    setTimeout(() => setPasswordFocused(false), 150);
  };

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

  const transferGuestTickets = async (newUid) => {
    const guestId = sessionStorage.getItem("guestSessionID");
    if (!guestId) return false;

    try {
      const q = query(collection(db, "tickets"), where("userId", "==", guestId));
      const snap = await getDocs(q);
      
      if (snap.empty) return false;

      const updatePromises = snap.docs.map(document => 
        updateDoc(doc(db, "tickets", document.id), { userId: newUid })
      );
      
      await Promise.all(updatePromises);
      sessionStorage.removeItem("guestSessionID");
      return true;
    } catch (err) {
      console.error("Failed to transfer guest tickets:", err);
      return false;
    }
  };

  // --- AUTH METHODS ---
  const handleGoogleAuth = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncUserToFirestore(result.user);
      
      const transferred = await transferGuestTickets(result.user.uid);
      if (transferred) {
        router.push("/account");
      } else {
        router.push("/"); 
      }
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

      const result = await signInWithEmailAndPassword(auth, loginEmail, password);
      
      const transferred = await transferGuestTickets(result.user.uid);
      if (transferred) {
        router.push("/account");
      } else {
        router.push("/"); 
      }
      
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
    if (!isPasswordValid) return setError("Please fulfill all password requirements.");

    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(res.user, { displayName: name });
      await syncUserToFirestore(res.user, name);
      
      const transferred = await transferGuestTickets(res.user.uid);
      if (transferred) {
        router.push("/account");
      } else {
        router.push("/"); 
      }
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
    <div className="relative w-full max-w-4xl min-h-[750px] md:h-[700px] bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col md:flex-row mt-16 md:mt-0">
      
      {/* =========================================
          LOGIN FORM (Visible on Mobile if isLogin)
      ========================================= */}
      <div className={`${isLogin ? 'flex' : 'hidden'} md:flex flex-col justify-center w-full md:w-1/2 p-8 md:p-12 absolute top-0 md:left-0 h-full z-10 bg-white md:bg-transparent`}>
        <h1 className="font-bebas text-5xl md:text-6xl text-slate-900 mb-6 uppercase text-center tracking-wide">Login</h1>
        
        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 ml-2">Email or Name</label>
            <div className="relative flex items-center">
              <input required type="text" maxLength={150} value={identifier} onChange={e => setIdentifier(e.target.value)} className="input-standard pl-12" />
              <UserIcon className="absolute left-4 text-gray-500" size={18} />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 ml-2">Password</label>
            <div className="relative flex items-center">
              <input required type={showPassword ? "text" : "password"} maxLength={100} value={password} onChange={e => setPassword(e.target.value)} className="input-standard pl-12 pr-12 !normal-case" />
              <Lock className="absolute left-4 text-gray-500" size={18} />
              <div className="absolute right-1 top-1 bottom-1 w-10 bg-white flex items-center justify-center rounded-xl z-10">
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer text-gray-500 hover:text-slate-900 transition">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {error && isLogin && <p className="text-red-500 text-[11px] font-black tracking-widest uppercase text-center bg-red-50 p-3 rounded-xl">{error}</p>}
          
          <Button type="submit" variant="primary" className="w-full mt-4 !py-4" disabled={loading} isLoading={loading}>
            {loading ? "Authenticating..." : "Login"}
          </Button>

          <div className="relative mb-6 mt-6 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative inline-block bg-white px-4 text-[11px] uppercase font-black text-slate-600 tracking-widest">Or</div>
          </div>

          <Button type="button" onClick={handleGoogleAuth} variant="outline" className="w-full !py-3">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 mr-1 bg-white rounded-full" alt="google" />
            Join with Google
          </Button>
          
          {/* Mobile Only Toggle */}
          <div className="mt-8 text-center text-[11px] font-bold text-slate-600 uppercase tracking-widest md:hidden">
            New here?
            <button type="button" onClick={toggleMode} className="cursor-pointer text-salsa-pink font-black ml-1 hover:underline transition-colors">
              Sign Up
            </button>
          </div>
        </form>
      </div>

      {/* =========================================
          SIGN UP FORM (Visible on Mobile if !isLogin)
      ========================================= */}
      <div className={`${!isLogin ? 'flex' : 'hidden'} md:flex flex-col justify-center w-full md:w-1/2 p-8 md:p-10 absolute top-0 md:right-0 h-full z-10 bg-white md:bg-transparent`}>
        <h1 className="font-bebas text-5xl md:text-6xl text-slate-900 mb-6 uppercase text-center tracking-wide leading-none">Create Account</h1>
        
        <form onSubmit={handleSignUp} className="space-y-3 relative z-10 flex flex-col h-full justify-center">
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 ml-2">Full Name</label>
            <div className="relative flex items-center">
              <input required type="text" maxLength={100} value={name} onChange={e => setName(e.target.value)} className="input-standard pl-12 !py-3.5" />
              <UserIcon className="absolute left-4 text-gray-500" size={18} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 ml-2">Email Address</label>
            <div className="relative flex items-center">
              <input required type="email" maxLength={100} value={email} onChange={e => setEmail(e.target.value)} className={`input-standard pl-12 !py-3.5 ${isEmailInvalid ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'}`} />
              <Mail className={`absolute left-4 ${isEmailInvalid ? 'text-red-400' : 'text-gray-500'}`} size={18} />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 ml-2">Create Password</label>
            <div className="relative flex items-center">
              <input 
                required 
                type={showPassword ? "text" : "password"} 
                maxLength={100} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                onFocus={() => setPasswordFocused(true)}
                onBlur={handlePasswordBlur}
                className={`input-standard pl-12 pr-12 !normal-case !py-3.5 ${isPasswordInvalid ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'}`} 
              />
              <Lock className={`absolute left-4 ${isPasswordInvalid ? 'text-red-400' : 'text-gray-500'}`} size={18} />
              <div className="absolute right-1 top-1 bottom-1 w-10 bg-white flex items-center justify-center rounded-xl z-10">
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer text-gray-500 hover:text-slate-900 transition">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            {/* The Accordion Checklist */}
            <PasswordAccordion passReqs={passReqs} isFocused={passwordFocused} passwordLength={password.length} />
          </div>

          {error && !isLogin && <p className="text-red-500 text-[11px] font-black tracking-widest uppercase text-center bg-red-50 p-3 rounded-xl mt-4">{error}</p>}
          
          <Button type="submit" variant="primary" className="w-full mt-2 !py-4" disabled={loading || !isPasswordValid} isLoading={loading}>
            {loading ? "Creating..." : "Sign Up"}
          </Button>

          {/* THE MAGIC DISAPPEARING GOOGLE BUTTON */}
          <div className={`grid transition-all duration-500 ease-in-out ${hideSocials ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
            <div className="overflow-hidden">
              <div className="relative mb-4 mt-4 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative inline-block bg-white px-4 text-[11px] uppercase font-black text-slate-600 tracking-widest">Or</div>
              </div>

              <Button type="button" onClick={handleGoogleAuth} variant="outline" className="w-full !py-3">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 mr-1 bg-white rounded-full" alt="google" />
                Join with Google
              </Button>
            </div>
          </div>
          
          {/* Mobile Only Toggle */}
          <div className={`mt-4 text-center text-[11px] font-bold text-slate-600 uppercase tracking-widest md:hidden transition-opacity duration-300 ${hideSocials ? 'opacity-0' : 'opacity-100'}`}>
            Already have an account?
            <button type="button" onClick={toggleMode} className="cursor-pointer text-salsa-pink font-black ml-1 hover:underline transition-colors">
              Login
            </button>
          </div>
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
            <h2 className="font-bebas text-6xl mb-4 tracking-wide text-slate-900 leading-none">Welcome Back!</h2>
            <p className="font-bold text-slate-800 leading-relaxed mb-8">
              Don't have an account yet? Sign up!
            </p>
            <Button onClick={toggleMode} variant="outline" className="border-slate-900 text-slate-900 hover:bg-teal-600 hover:border-teal-600 hover:text-white px-10 py-4">
              Sign Up
            </Button>
          </div>

          <div className={`absolute inset-0 flex flex-col items-center justify-center px-12 transition-all duration-700 ${!isLogin ? 'opacity-100 translate-x-0 delay-300 pointer-events-auto' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
            <h2 className="font-bebas text-6xl mb-4 tracking-wide text-slate-900 leading-none">Welcome, Dancer!</h2>
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
  );
}

// --- REQUIRED DEFAULT EXPORT ---
export default function LoginPage() {
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
      <Suspense fallback={<div className="w-full max-w-4xl min-h-[700px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-salsa-pink border-t-transparent rounded-full animate-spin"></div></div>}>
        <LoginContent />
      </Suspense>
    </main>
  );
}