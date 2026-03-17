"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import Button from "@/components/Button";
import { ShoppingCart, User as UserIcon, LogOut, ShieldAlert, Menu, X, QrCode, Shield } from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const dropdownRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  
  // Check if we are on the landing page
  const isHome = pathname === "/";
  // The navbar is ONLY transparent when we are on the home page AND haven't scrolled yet
  const isTransparent = isHome && !scrolled;

  // Handle scroll effect for background blur (Only needed for Home)
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch Auth & Role
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const uDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (uDoc.exists()) {
          setUserData(uDoc.data());
        }
      } else {
        setUserData(null);
      }
    });
    return () => unsubAuth();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    setDropdownOpen(false);
    router.push("/login");
  };

  // Determine Nav Background Style
  const navBackgroundClass = isHome 
    ? (scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6') 
    : 'bg-white shadow-sm py-4 border-b border-gray-200';

  // Dynamic Text Color for Links and Icons
  const textColorClass = isTransparent ? "text-white" : "text-slate-800";

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 font-montserrat ${navBackgroundClass}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        
        {/* LEFT: LOGO */}
        <div className="flex-1 flex justify-start items-center">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            {/* The brightness-0 invert trick makes the logo pure white on transparent mode */}
            <img 
              src="/images/logo.png" 
              alt="Salsa Fest Logo" 
              className={`h-10 w-auto object-contain transition-all duration-300 ${isTransparent ? 'brightness-0 invert' : ''}`} 
            />
          </Link>
        </div>

        {/* CENTER: DESKTOP LINKS */}
        <div className={`hidden md:flex justify-center items-center gap-8 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${textColorClass}`}>
          <Link href="/" className="hover:text-salsa-pink transition-colors">Home</Link>
          <Link href="/tickets" className="hover:text-salsa-pink transition-colors">Prices</Link>
          <Link href="/info" className="hover:text-salsa-pink transition-colors">Info</Link>
          <Link href="/gallery" className="hover:text-salsa-pink transition-colors">Gallery</Link>
          <Link href="/about" className="hover:text-salsa-pink transition-colors">About Us</Link>
        </div>

        {/* RIGHT: ACTIONS & ICONS */}
        <div className="flex-1 flex justify-end items-center gap-4">
          
          {/* CART ICON */}
          {user && (
            <Link href="/cart" className={`relative p-2 hover:text-salsa-pink transition-colors duration-300 ${textColorClass}`}>
              <ShoppingCart size={20} />
            </Link>
          )}

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)} 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm cursor-pointer duration-300
                  ${isTransparent 
                    ? 'bg-white/20 border border-white/30 text-white hover:bg-white/30' 
                    : 'bg-gray-50 border border-gray-200 text-slate-800 hover:bg-salsa-pink hover:text-white hover:border-salsa-pink'}`}
              >
                <UserIcon size={18} />
              </button>

              {/* DROPDOWN MENU (Always white background for readability) */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl py-2 border border-gray-100 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                  
                  {/* User Info Header */}
                  <div className="px-5 py-3 border-b border-gray-50 mb-2">
                    <p className="text-xs font-bold text-slate-900 truncate">{userData?.displayName || "Dancer"}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">{user.email}</p>
                  </div>
                  
                  <Link href="/account" onClick={() => setDropdownOpen(false)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <UserIcon size={20} /> My Account
                  </Link>

                  {userData?.role === 'ambassador' && (
                    <Link href="/ambassador" onClick={() => setDropdownOpen(false)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-salsa-pink hover:bg-salsa-pink/10 transition-colors flex items-center gap-2">
                      <Shield size={20} />Dashboard
                    </Link>
                  )}

                  {(userData?.role === 'admin' || userData?.role === 'superadmin') && (
                    <Link href="/admin/scanner" onClick={() => setDropdownOpen(false)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-2">
                      <QrCode size={20} /> Scanner
                    </Link>
                  )}

                  {userData?.role === 'superadmin' && (
                    <Link href="/admin" onClick={() => setDropdownOpen(false)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-salsa-pink hover:bg-salsa-pink/10 transition-colors flex items-center gap-2">
                      <Shield size={20} /> Admin Dashboard
                    </Link>
                  )}

                  <button onClick={handleSignOut} className="w-full text-left px-5 py-2.5 mt-2 border-t border-gray-50 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer">
                    <LogOut size={20} /> Sign Out
                  </button>

                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className={`hidden md:flex px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md duration-300
              ${isTransparent 
                ? 'bg-white text-slate-900 hover:bg-gray-100' 
                : 'bg-slate-900 text-white hover:bg-salsa-pink'}`}
            >
              Login
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`md:hidden p-2 transition-colors duration-300 ${textColorClass}`}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-100 shadow-xl flex flex-col py-4 px-6 gap-4 animate-in slide-in-from-top-4 duration-300">
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-xs font-black uppercase tracking-widest text-slate-800 hover:text-salsa-pink">Home</Link>
          <Link href="/tickets" onClick={() => setMobileMenuOpen(false)} className="text-xs font-black uppercase tracking-widest text-slate-800 hover:text-salsa-pink">Prices</Link>
          <Link href="/info" onClick={() => setMobileMenuOpen(false)} className="text-xs font-black uppercase tracking-widest text-slate-800 hover:text-salsa-pink">Info</Link>
          <Link href="/gallery" onClick={() => setMobileMenuOpen(false)} className="text-xs font-black uppercase tracking-widest text-slate-800 hover:text-salsa-pink">Gallery</Link>
          <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-xs font-black uppercase tracking-widest text-slate-800 hover:text-salsa-pink">About Us</Link>
          {!user && <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-xs font-black uppercase tracking-widest text-salsa-pink mt-4 pt-4 border-t border-gray-50">Login / Sign Up</Link>}
        </div>
      )}
    </nav>
  );
}