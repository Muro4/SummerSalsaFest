"use client";
import { useState, useEffect, Suspense } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/routing"; 
import Button from "@/components/Button";
import { Eye, EyeOff, Lock, Mail, User as UserIcon, CheckCircle2, Circle, ArrowLeft, Loader2, Key } from "lucide-react";
import { useTranslations } from 'next-intl';
import Cookies from 'js-cookie'; // <-- IMPORT COOKIES

// --- DYNAMIC PASSWORD ACCORDION ---
function PasswordAccordion({ passReqs, isFocused, passwordLength, t }) {
  const showAccordion = isFocused || passwordLength > 0;
  
  const reqs = [
    { label: t('reqLength'), met: passReqs.length },
    { label: t('reqUpper'), met: passReqs.upper },
    { label: t('reqNum'), met: passReqs.number },
    { label: t('reqSpec'), met: passReqs.special },
  ];

  return (
    <div className={`grid transition-all duration-500 ease-in-out ${showAccordion ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
      <div className="overflow-hidden">
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
          <div className="mb-1">
            <p className="text-[11px] font-black uppercase text-slate-500 tracking-widest">{t('passReqsLabel')}</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reqs.map((req, idx) => (
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
  const t = useTranslations('Auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const urlMode = searchParams.get('mode');

  // Default to Login, unless the URL says 'signup' or they are a guest
  const [isLogin, setIsLogin] = useState(urlMode !== 'signup');
  const [isResetMode, setIsResetMode] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  // Form State
  const [name, setName] = useState(""); 
  const [identifier, setIdentifier] = useState(""); 
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  
  // Status State
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Real-time onBlur Validation States
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  // --- AUTO-DETECT GUESTS ---
  useEffect(() => {
    if (sessionStorage.getItem("guestSessionID") || urlMode === 'signup') {
      setIsLogin(false);
    }
  }, [urlMode]);

  // Handle Cooldown Timer
  useEffect(() => {
    let timer;
    if (resetCooldown > 0) {
      timer = setInterval(() => setResetCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resetCooldown]);

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

  // The Magic Trigger: Hides the Google Button when user starts typing password
  const hideSocials = passwordFocused || password.length > 0;

  // --- ONBLUR HANDLERS ---
  const handleNameBlur = (e) => {
    const val = e.target.value.trim();
    if (val !== "" && val.length < 2) {
      setNameError(t('errNameLen'));
    }
  };

  const handleEmailBlur = (e) => {
    const val = e.target.value.trim();
    if (val !== "" && !emailRegex.test(val)) {
      setEmailError(t('errEmailInvalid'));
    }
  };

  const handlePasswordBlur = () => {
    setTimeout(() => setPasswordFocused(false), 150);
    if (password.length > 0 && !isPasswordValid) {
      setPasswordError(t('errPassReqs'));
    }
  };

  // Auto-clear password error when it becomes valid
  useEffect(() => {
    if (passwordError && isPasswordValid) {
      setPasswordError("");
    }
  }, [isPasswordValid, passwordError]);

  // --- FIRESTORE SYNC & COOKIE STAMPING ---
  const syncUserToFirestore = async (user, displayName) => {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: displayName || user.displayName || "Dancer",
        email: user.email,
        role: "user", // Default new users to basic role
        createdAt: new Date().toISOString(),
      });
      return "user"; // Return the default role
    }
    
    return snap.data().role || "user"; // Return the existing role
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
      
      // 1. Sync DB and get their role
      const role = await syncUserToFirestore(result.user);
      console.log("FIREBASE SUCCESS. The role is:", role);
      // 2. STAMP THE COOKIE (Valid for 7 days)
      Cookies.set('userRole', role, { expires: 7, path: '/' });
      
      const transferred = await transferGuestTickets(result.user.uid);
      if (transferred) {
        router.push("/account");
      } else {
        router.push("/"); 
      }
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return; 
      setError(t('errGoogleFail'));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      let loginEmail = identifier.trim();

      // If they typed a name instead of an email, look it up in Firestore
      if (!emailRegex.test(loginEmail)) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("displayName", "==", loginEmail));
        const snap = await getDocs(q);

        if (snap.empty) throw new Error(`No account found with the name "${loginEmail}".`);
        loginEmail = snap.docs[0].data().email;
      }

      const result = await signInWithEmailAndPassword(auth, loginEmail, password);
      
      // 1. Sync DB and get their role (catches existing admins logging in)
      const role = await syncUserToFirestore(result.user);
      console.log("FIREBASE SUCCESS. The role is:", role);
      // 2. STAMP THE COOKIE
      Cookies.set('userRole', role, { expires: 7, path: '/' });
      
      const transferred = await transferGuestTickets(result.user.uid);
      if (transferred) {
        router.push("/account");
      } else {
        router.push("/"); 
      }
      
    } catch (err) {
      if (err.code === "permission-denied" || err.message.includes("Missing or insufficient permissions")) {
        setError(t('errDbBlocked'));
      } else {
        setError(err.message.includes("No account found") ? err.message : t('errInvalidCreds'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setEmailError("");
    setNameError("");
    setPasswordError("");
    
    if (name.trim().length < 2) {
      setNameError(t('errNameLen'));
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setEmailError(t('errEmailInvalid'));
      return;
    }
    if (!isPasswordValid) {
      setPasswordError(t('errPassReqs'));
      return;
    }

    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(res.user, { displayName: name.trim() });
      
      // 1. Sync DB and get their role (will be 'user' for new accounts)
      const role = await syncUserToFirestore(res.user, name.trim());
      console.log("FIREBASE SUCCESS. The role is:", role);
      // 2. STAMP THE COOKIE
      Cookies.set('userRole', role, { expires: 7, path: '/' });
      
      const transferred = await transferGuestTickets(res.user.uid);
      if (transferred) {
        router.push("/account");
      } else {
        router.push("/"); 
      }
    } catch (err) {
      setError(err.message.includes("email-already-in-use") ? t('errEmailInUse') : t('errCreateFail'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const targetEmail = isLogin ? identifier.trim() : email.trim();

    if (!targetEmail || !emailRegex.test(targetEmail)) {
      setError(t('errResetEmpty'));
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setSuccessMsg(t('msgResetSuccess'));
      setResetCooldown(60);
    } catch (err) {
      console.error(err);
      setError(err.code === 'auth/user-not-found' ? t('errResetNoUser') : t('errResetFail'));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsResetMode(false);
    setError("");
    setSuccessMsg("");
    setEmailError("");
    setNameError("");
    setPasswordError("");
    setPassword("");
    setEmail("");
    setName("");
    setIdentifier("");
  };

  return (
    <div className="relative w-full max-w-4xl min-h-[750px] md:min-h-[600px] md:h-[clamp(600px,90vh,700px)] bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col md:flex-row mt-16 md:mt-0">
      
      {/* =========================================
         LOGIN / RESET FORM
      ========================================= */}
      <div className={`${isLogin ? 'flex' : 'hidden'} md:flex flex-col justify-center w-full md:w-1/2 p-8 lg:p-12 absolute top-0 md:left-0 h-full z-10 bg-white md:bg-transparent`}>
        
        {!isResetMode ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <h1 className="font-bebas tracking-wide text-5xl md:text-6xl text-slate-900 mb-6 uppercase text-center tracking-wide">{t('loginTitle')}</h1>
            
            <form onSubmit={handleLogin} className="space-y-5 relative z-10">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 ml-2">{t('lblEmailName')}</label>
                <div className="relative flex items-center">
                  <input 
                    required 
                    type="text" 
                    maxLength={30} 
                    value={identifier} 
                    onChange={e => setIdentifier(e.target.value)} 
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="username"
                    className="input-standard pl-12 !normal-case" 
                  />
                  <UserIcon className="absolute left-4 text-gray-500" size={18} />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 ml-2">{t('lblPassword')}</label>
                <div className="relative flex items-center">
                  <input 
                    required 
                    type={showPassword ? "text" : "password"} 
                    maxLength={50} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="input-standard pl-12 pr-12 !normal-case" 
                  />
                  <Lock className="absolute left-4 text-gray-500" size={18} />
                  <div className="absolute right-1 top-1 bottom-1 w-10 bg-white flex items-center justify-center rounded-xl z-10">
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer text-gray-500 hover:text-slate-900 transition">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button type="button" onClick={() => { setIsResetMode(true); setError(""); }} className="text-[10px] font-bold text-salsa-pink hover:underline uppercase tracking-widest cursor-pointer">
                    {t('forgotPass')}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-500 text-[11px] font-black tracking-widest uppercase text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
              
              <Button type="submit" variant="primary" className="w-full mt-4 !py-4" disabled={loading} isLoading={loading}>
                {loading ? t('btnAuthenticating') : t('btnLogin')}
              </Button>

              <div className="relative mb-6 mt-6 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative inline-block bg-white px-4 text-[11px] uppercase font-black text-slate-600 tracking-widest">{t('or')}</div>
              </div>

              <Button type="button" onClick={handleGoogleAuth} variant="outline" className="w-full !py-3">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 mr-1 bg-white rounded-full" alt="google" />
                {t('btnGoogle')}
              </Button>
              
              <div className="mt-8 text-center text-[11px] font-bold text-slate-600 uppercase tracking-widest md:hidden">
                {t('newHere')}
                <button type="button" onClick={toggleMode} className="cursor-pointer text-salsa-pink font-black ml-1 hover:underline transition-colors">
                  {t('btnSignUp')}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <button onClick={() => { setIsResetMode(false); setError(""); setSuccessMsg(""); }} className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors cursor-pointer">
              <ArrowLeft size={14} /> {t('btnBackLogin')}
            </button>
            <h1 className="font-bebas tracking-wide text-5xl md:text-6xl text-slate-900 mb-2 uppercase tracking-wide leading-none">{t('resetTitle')}</h1>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-8 leading-relaxed">{t('resetDesc')}</p>

            <form onSubmit={handlePasswordReset} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 ml-2">{t('lblEmail')}</label>
                <div className="relative flex items-center">
                  <input 
                    required 
                    type="email" 
                    maxLength={50} 
                    value={identifier} 
                    onChange={e => setIdentifier(e.target.value)} 
                    placeholder={t('placeholderEmail')}
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="input-standard pl-12 !normal-case" 
                  />
                  <Mail className="absolute left-4 text-gray-500" size={18} />
                </div>
              </div>

              {error && <p className="text-red-500 text-[11px] font-black tracking-widest uppercase text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
              {successMsg && <p className="text-emerald-600 text-[11px] font-black tracking-widest uppercase text-center bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center justify-center gap-2"><CheckCircle2 size={16}/> {successMsg}</p>}

              <button 
                type="submit" 
                disabled={loading || resetCooldown > 0} 
                className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-salsa-pink transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                {resetCooldown > 0 ? t('btnWait', { s: resetCooldown }) : t('btnSendReset')}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* =========================================
         SIGN UP FORM 
      ========================================= */}
      <div className={`${!isLogin ? 'flex' : 'hidden'} md:flex flex-col justify-center w-full md:w-1/2 p-8 lg:p-10 absolute top-0 md:right-0 h-full z-10 bg-white md:bg-transparent`}>
        <h1 className="font-bebas tracking-wide text-5xl md:text-6xl text-slate-900 mb-6 uppercase text-center tracking-wide leading-none">{t('signUpTitle')}</h1>
        
        <form onSubmit={handleSignUp} className="space-y-3 relative z-10">
          
          {/* Name Field */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 ml-2">{t('lblName')}</label>
            <div className="relative flex items-center">
              <input 
                required 
                type="text" 
                maxLength={30} 
                value={name} 
                onChange={(e) => {
                  const val = e.target.value;
                  setName(val);
                  if (nameError && val.trim().length >= 2) setNameError("");
                }} 
                onBlur={handleNameBlur}
                autoComplete="name"
                autoCapitalize="words"
                autoCorrect="off"
                className={`input-standard pl-12 !py-3.5 !normal-case ${nameError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'}`} 
              />
              <UserIcon className={`absolute left-4 ${nameError ? 'text-red-400' : 'text-gray-500'}`} size={18} />
            </div>
            {nameError && (
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-2 animate-in fade-in slide-in-from-top-1">
                {nameError}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 ml-2">{t('lblEmail')}</label>
            <div className="relative flex items-center">
              <input 
                required 
                type="email" 
                maxLength={50} 
                value={email} 
                onChange={(e) => {
                  const val = e.target.value;
                  setEmail(val);
                  if (emailError && (emailRegex.test(val.trim()) || val === "")) {
                    setEmailError("");
                  }
                }} 
                onBlur={handleEmailBlur}
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                className={`input-standard pl-12 !py-3.5 !normal-case ${emailError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'}`} 
              />
              <Mail className={`absolute left-4 ${emailError ? 'text-red-400' : 'text-gray-500'}`} size={18} />
            </div>
            {emailError && (
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-2 animate-in fade-in slide-in-from-top-1">
                {emailError}
              </p>
            )}
          </div>
          
          {/* Password Field */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 ml-2">{t('lblCreatePass')}</label>
            <div className="relative flex items-center">
              <input 
                required 
                type={showPassword ? "text" : "password"} 
                maxLength={50} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                onFocus={() => setPasswordFocused(true)}
                onBlur={handlePasswordBlur}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                className={`input-standard pl-12 pr-12 !normal-case !py-3.5 ${passwordError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-slate-900'}`} 
              />
              <Lock className={`absolute left-4 ${passwordError ? 'text-red-400' : 'text-gray-500'}`} size={18} />
              <div className="absolute right-1 top-1 bottom-1 w-10 bg-white flex items-center justify-center rounded-xl z-10">
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer text-gray-500 hover:text-slate-900 transition">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            {passwordError && (
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-2 mt-1 animate-in fade-in slide-in-from-top-1">
                {passwordError}
              </p>
            )}

            <PasswordAccordion passReqs={passReqs} isFocused={passwordFocused} passwordLength={password.length} t={t} />
          </div>

          {error && !isLogin && <p className="text-red-500 text-[11px] font-black tracking-widest uppercase text-center bg-red-50 p-3 rounded-xl border border-red-100 mt-4">{error}</p>}
          
          <Button type="submit" variant="primary" className="w-full mt-2 !py-4" disabled={loading || !isPasswordValid || !!emailError || !!nameError} isLoading={loading}>
            {loading ? t('btnCreating') : t('btnSignUp')}
          </Button>

          {/* THE MAGIC DISAPPEARING GOOGLE BUTTON */}
          <div className={`grid transition-all duration-500 ease-in-out ${hideSocials ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
            <div className="overflow-hidden">
              <div className="p-1">
                <div className="relative mb-4 mt-3 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                  <div className="relative inline-block bg-white px-4 text-[11px] uppercase font-black text-slate-600 tracking-widest">{t('or')}</div>
                </div>

                <Button type="button" onClick={handleGoogleAuth} variant="outline" className="w-full !py-3">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 mr-1 bg-white rounded-full" alt="google" />
                  {t('btnGoogle')}
                </Button>
              </div>
            </div>
          </div>
          
          <div className={`mt-4 text-center text-[11px] font-bold text-slate-600 uppercase tracking-widest md:hidden transition-opacity duration-300 ${hideSocials ? 'opacity-0' : 'opacity-100'}`}>
            {t('alreadyHaveAcc')}
            <button type="button" onClick={toggleMode} className="cursor-pointer text-salsa-pink font-black ml-1 hover:underline transition-colors">
              {t('btnLogin')}
            </button>
          </div>
        </form>
      </div>

      {/* =========================================
         THE MAGIC SLIDING OVERLAY
      ========================================= */}
      <div className={`hidden md:flex absolute top-0 left-0 w-1/2 h-full z-30 transition-transform duration-700 ease-in-out ${isLogin ? 'translate-x-full' : 'translate-x-0'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-salsa-mint shadow-2xl">
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0a0024 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        </div>
        
        <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-8 lg:p-12">
          <div className={`absolute inset-0 flex flex-col items-center justify-center px-12 transition-all duration-700 ${isLogin ? 'opacity-100 translate-x-0 delay-300 pointer-events-auto' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
            <h2 className="font-bebas tracking-wide text-6xl mb-4 text-slate-900 leading-none">{t('deskLoginTitle')}</h2>
            <p className="font-bold text-slate-800 leading-relaxed mb-8">
              {t('deskLoginDesc')}
            </p>
            <Button onClick={toggleMode} variant="outline" className="border-slate-900 text-slate-900 hover:bg-teal-600 hover:border-teal-600 hover:text-white px-10 py-4">
              {t('btnSignUp')}
            </Button>
          </div>

          <div className={`absolute inset-0 flex flex-col items-center justify-center px-12 transition-all duration-700 ${!isLogin ? 'opacity-100 translate-x-0 delay-300 pointer-events-auto' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
            <h2 className="font-bebas tracking-wide text-6xl mb-4 text-slate-900 leading-none">{t('deskSignupTitle')}</h2>
            <p className="font-bold text-slate-800 leading-relaxed mb-8">
              {t('deskSignupDesc')}
            </p>
            <Button onClick={toggleMode} variant="outline" className="border-slate-900 text-slate-900 hover:bg-teal-600 hover:border-teal-600 hover:text-white px-10 py-4">
              {t('btnLogin')}
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}

// --- REQUIRED DEFAULT EXPORT ---
export default function LoginPage() {
  const t = useTranslations('Auth');
  return (
    <main className="min-h-screen bg-salsa-white flex items-center justify-center p-4 font-montserrat relative">
      <Button 
        href="/" 
        variant="ghost" 
        icon={ArrowLeft} 
        className="absolute top-8 left-4 md:left-8 z-50 text-slate-800 hover:text-salsa-pink border-none"
      >
        {t('btnHome')}
      </Button>
      <Suspense fallback={<div className="w-full max-w-4xl min-h-[700px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-salsa-pink border-t-transparent rounded-full animate-spin"></div></div>}>
        <LoginContent />
      </Suspense>
    </main>
  );
}