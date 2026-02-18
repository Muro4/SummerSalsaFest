"use client";
import { useState } from "react";
import { auth, db, googleProvider } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, User, Mail, Lock } from "lucide-react";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const syncUserToFirestore = async (user, displayName) => {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: displayName || user.displayName,
        email: user.email,
        role: "user", // ALWAYS default to user
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncUserToFirestore(result.user);
      router.push("/tickets");
    } catch (e) { alert(e.message); }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(res.user, { displayName: name });
      await syncUserToFirestore(res.user, name);
      router.push("/tickets");
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-salsa-white flex items-center justify-center p-4 font-montserrat">
      <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-salsa-mint">
        <h1 className="font-bebas text-5xl text-center mb-6 uppercase tracking-tight">Create Account</h1>
        
        <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 border-2 border-gray-100 py-3 rounded-2xl hover:bg-salsa-white transition mb-6 font-bold text-sm">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5" />
          Join with Google
        </button>

        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div className="relative">
            <input type="text" placeholder="Full Name" required className="w-full p-4 bg-gray-50 rounded-xl outline-none focus:ring-2 ring-salsa-mint pl-12" onChange={e => setName(e.target.value)} />
            <User className="absolute left-4 top-4 text-gray-300" size={20} />
          </div>
          <div className="relative">
            <input type="email" placeholder="Email" required className="w-full p-4 bg-gray-50 rounded-xl outline-none focus:ring-2 ring-salsa-mint pl-12" onChange={e => setEmail(e.target.value)} />
            <Mail className="absolute left-4 top-4 text-gray-300" size={20} />
          </div>
          <div className="relative">
            <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" required 
                className="w-full p-4 bg-gray-50 rounded-xl outline-none focus:ring-2 ring-salsa-mint pl-12" 
                onChange={e => setPassword(e.target.value)} 
            />
            <Lock className="absolute left-4 top-4 text-gray-300" size={20} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button disabled={loading} className="w-full bg-salsa-pink text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest disabled:opacity-50">
            {loading ? "Creating..." : "SIGN UP"}
          </button>
        </form>
        <p className="text-center mt-6 text-xs font-bold text-gray-400 uppercase">Already have an account? <Link href="/login" className="text-salsa-pink">Login</Link></p>
      </div>
    </main>
  );
}