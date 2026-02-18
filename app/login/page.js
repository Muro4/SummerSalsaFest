"use client";
import { useState } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 1. Handle Google Login
  const handleGoogleLogin = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user exists in Firestore, if not, create them
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          role: "user",
          createdAt: new Date().toISOString(),
        });
      }
      router.push("/tickets");
    } catch (err) {
      setError("Google Login failed. Please try again.");
    }
  };

  // 2. Handle Email/Password Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/tickets");
    } catch (err) {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-salsa-white flex items-center justify-center p-4 font-montserrat">
      <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-salsa-mint">
        <div className="text-center mb-8">
          <h1 className="font-bebas text-5xl text-gray-900 mb-2 uppercase tracking-tight">Welcome Back</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Login to your account</p>
        </div>

        {/* Google Login Button */}
        <button 
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-100 py-4 rounded-2xl hover:bg-salsa-white transition mb-6 font-bold text-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5" alt="google" />
          Continue with Google
        </button>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-white px-4 text-gray-400 tracking-widest">Or Email</span></div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="relative">
            <input 
              type="email" placeholder="Email Address" required 
              className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 ring-salsa-mint pl-12"
              onChange={e => setEmail(e.target.value)}
            />
            <Mail className="absolute left-4 top-4 text-gray-300" size={20} />
          </div>

          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" required 
              className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 ring-salsa-mint pl-12"
              onChange={e => setPassword(e.target.value)}
            />
            <Lock className="absolute left-4 top-4 text-gray-300" size={20} />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-4 text-gray-400 hover:text-salsa-pink transition"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          
          {error && <p className="text-salsa-pink text-xs font-bold text-center bg-red-50 p-2 rounded-lg">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-salsa-pink text-white font-black py-4 rounded-2xl shadow-lg hover:opacity-90 transition tracking-widest disabled:opacity-50"
          >
            {loading ? "AUTHENTICATING..." : "LOGIN"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
          New to the festival? <Link href="/signup" className="text-salsa-pink">Create Account</Link>
        </div>
      </div>
    </main>
  );
}