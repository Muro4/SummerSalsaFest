"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import Link from 'next/link';
import { User, Ticket, LogOut, ChevronDown, ShieldAlert, ShoppingCart, Camera, Settings } from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    let unsubCart = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setUserData(docSnap.data());

        const q = query(collection(db, "tickets"), where("userId", "==", currentUser.uid), where("status", "==", "pending"));
        unsubCart = onSnapshot(q, (snap) => setCartCount(snap.docs.length));
      } else {
        setUserData(null);
        setCartCount(0);
        unsubCart();
      }
    });
    return () => { unsubscribeAuth(); unsubCart(); };
  }, []);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b-2 border-salsa-mint px-6 py-3 flex items-center justify-between font-montserrat">
      
      {/* 1. CUSTOM LOGO SECTION */}
      <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
  <img 
    // CHANGE THIS PATH TO MATCH YOUR EXACT FILE NAME IN THE PUBLIC FOLDER
    src="/images/logo.png" 
    
    // Added 'drop-shadow-md' to the end
    className="h-10 w-auto object-contain [filter:drop-shadow(1px_1px_1px_#2e0d1d)]" 
  />
</Link>

      {/* 2. NAVIGATION LINKS */}
      <div className="hidden lg:flex items-center gap-8 text-[10px] font-black text-gray-700 tracking-[0.2em] uppercase">
        <Link href="/" className="hover:text-salsa-pink transition">Home</Link>
        <Link href="/#prices" className="hover:text-salsa-pink transition">Prices</Link>
        <Link href="/#info" className="hover:text-salsa-pink transition">Info</Link>
        <Link href="/#gallery" className="hover:text-salsa-pink transition">Gallery</Link>
        <Link href="/#about" className="hover:text-salsa-pink transition">About Us</Link>
      </div>

      {/* 3. CART & PROFILE SECTION */}
      <div className="flex items-center gap-4 relative">
        {user && (
          <Link href="/cart" className="relative p-2 text-gray-600 hover:text-salsa-pink transition">
            <ShoppingCart size={22} />
            {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-salsa-pink text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{cartCount}</span>}
          </Link>
        )}

        {user ? (
          <div className="relative">
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 bg-salsa-white border border-salsa-mint/30 p-1 pr-3 rounded-full hover:bg-white transition shadow-sm">
              <div className="w-8 h-8 bg-salsa-pink rounded-full flex items-center justify-center text-white font-bold text-xs uppercase">{user.displayName?.[0] || 'U'}</div>
              <ChevronDown size={14} className={isDropdownOpen ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
            {isDropdownOpen && (
              <div className="absolute top-12 right-0 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl py-3 z-50 animate-in fade-in slide-in-from-top-2">
                {(userData?.role === 'superadmin' || userData?.role === 'admin') && (
                  <Link href="/admin/scanner" className="flex items-center gap-3 px-4 py-3 text-xs font-black text-emerald-600 hover:bg-emerald-50 transition border-b border-gray-50 mb-1">
                    <Camera size={16} /> SCANNER
                  </Link>
                )}
                {userData?.role === 'superadmin' && (
                  <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-xs font-black text-salsa-pink hover:bg-salsa-pink/5 border-b border-gray-50 mb-1">
                    <ShieldAlert size={16} /> ADMIN PANEL
                  </Link>
                )}
                <Link href="/account" className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-salsa-white transition">
                  <User size={16} /> MY ACCOUNT
                </Link>
                <button onClick={() => signOut(auth)} className="w-full mt-2 flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 border-t border-gray-50 transition">
                  <LogOut size={16} /> LOGOUT
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className="bg-salsa-pink text-white text-[10px] font-black px-6 py-2.5 rounded-lg tracking-widest uppercase">Login</Link>
        )}
      </div>
    </nav>
  );
}