"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, onSnapshot, updateDoc } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import Button from "@/components/Button";
import { usePopup } from "@/components/PopupProvider";
import { ShoppingCart, User as UserIcon, LogOut, ShieldAlert, Menu, X, QrCode, Shield, Ticket, ChevronRight } from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  
  // States for Desktop vs Mobile Menus
  const [dropdownOpen, setDropdownOpen] = useState(false); // Desktop Account Dropdown
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile Navigation Drawer
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false); // Mobile Account Drawer
  
  const [scrolled, setScrolled] = useState(false);
  const [cartItems, setCartItems] = useState(0); 

  const dropdownRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const { showPopup } = usePopup();
  
  const isHome = pathname === "/";
  const isTransparent = isHome && !scrolled;

  // --- Scroll Listener ---
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- Safe Listener Management ---
  useEffect(() => {
    let unsubCart = null; 

    const unsubAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const uDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (uDoc.exists()) {
          const data = uDoc.data();
          setUserData(data);

          if (
            (data.applicationStatus === "approved" || data.applicationStatus === "rejected") && 
            !data.applicationNotified
          ) {
            updateDoc(doc(db, "users", currentUser.uid), { applicationNotified: true }).catch(console.error);

            if (data.applicationStatus === "approved") {
              showPopup({
                type: "success", title: "Application Approved!", message: "Congratulations! You have been approved as a Guest Dancer. You can now access your Ambassador Dashboard.",
                confirmText: "Go to Dashboard", cancelText: "Dismiss", onConfirm: () => router.push("/ambassador")
              });
            } else if (data.applicationStatus === "rejected") {
              showPopup({
                type: "info", title: "Application Update", message: "Thank you for applying. Unfortunately, we are unable to accept your Guest Dancer application at this time.", confirmText: "Okay"
              });
            }
          }
        }

        if (unsubCart) unsubCart();
        const cartRef = collection(db, "users", currentUser.uid, "cart");
        unsubCart = onSnapshot(cartRef, (snap) => {
            let totalItems = 0;
            snap.forEach((itemDoc) => { totalItems += (itemDoc.data().quantity || 1); });
            setCartItems(totalItems);
          },
          (error) => { if (error.code !== 'permission-denied') console.warn("Cart sync issue:", error.message); }
        );

      } else {
        if (unsubCart) { unsubCart(); unsubCart = null; }
        setUserData(null);
        setCartItems(0);
      }
    });

    return () => {
      unsubAuth();
      if (unsubCart) unsubCart(); 
    };
  }, [router, showPopup]);

  // --- Click Outside & Body Lock ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen || mobileAccountOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [mobileMenuOpen, mobileAccountOpen]);

  const handleSignOut = () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    setMobileAccountOpen(false);
    router.push("/login");
    setTimeout(async () => { try { await signOut(auth); } catch (err) { console.error("Sign out error:", err); } }, 800); 
  };

  const navBackgroundClass = isHome 
    ? (scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm py-3 md:py-4' : 'bg-transparent py-4 md:py-6') 
    : 'bg-white shadow-sm py-3 md:py-4 border-b border-gray-200';

  const textColorClass = isTransparent ? "text-white" : "text-slate-800";

  return (
    <>
      <nav className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 font-montserrat ${navBackgroundClass}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          
          {/* LEFT: LOGO */}
          <div className="flex-1 flex justify-start items-center">
            <Link href="/" className="hover:opacity-80 transition-opacity" onClick={() => {setMobileMenuOpen(false); setMobileAccountOpen(false); setDropdownOpen(false);}}>
              <img src="/images/logo.png" alt="Salsa Fest Logo" className={`h-8 md:h-10 w-auto object-contain transition-all duration-300 ${isTransparent ? 'brightness-0 invert' : ''}`} />
            </Link>
          </div>

          {/* CENTER: DESKTOP LINKS */}
          <div className={`hidden md:flex justify-center items-center gap-8 text-[11px] font-black uppercase tracking-widest transition-colors duration-300 ${textColorClass}`}>
            <Link href="/" className="hover:text-salsa-pink transition-colors">Home</Link>
            <Link href="/tickets" className="hover:text-salsa-pink transition-colors">Prices</Link>
            <Link href="/info" className="hover:text-salsa-pink transition-colors">Info</Link>
            <Link href="/gallery" className="hover:text-salsa-pink transition-colors">Gallery</Link>
            <Link href="/about" className="hover:text-salsa-pink transition-colors">About Us</Link>
          </div>

          {/* RIGHT: ACTIONS & ICONS */}
          <div className="flex-1 flex justify-end items-center gap-3 md:gap-4">
            
            {/* 1. CART ICON */}
            {user && (
              <div className="relative">
                <Link 
                  href="/cart" onClick={() => {setMobileMenuOpen(false); setMobileAccountOpen(false); setDropdownOpen(false);}}
                  className={`w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full transition-all duration-300 border border-transparent 
                    ${isTransparent ? 'hover:bg-white/20' : 'hover:bg-slate-100 hover:text-salsa-pink'} ${textColorClass}`}
                >
                  <ShoppingCart size={20} className="md:w-[22px] md:h-[22px]" />
                </Link>
                {cartItems > 0 && (
                  <span className={`absolute top-0 right-0 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full text-[9px] md:text-[11px] font-black text-white bg-salsa-pink border-2 shadow-sm ${isTransparent ? 'border-transparent' : 'border-white'}`}>
                    {cartItems}
                  </span>
                )}
              </div>
            )}

            {/* 2. AVATAR (ACCOUNT MENU) */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => { setDropdownOpen(!dropdownOpen); setMobileAccountOpen(true); setMobileMenuOpen(false); }} 
                  className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-salsa-pink via-violet-500 to-salsa-pink shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer"
                >
                  <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center transition-colors duration-300 ${isTransparent ? 'bg-slate-900/80 text-white' : 'bg-white text-slate-800'}`}>
                    {user.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" /> : <UserIcon size={18} />}
                  </div>
                </button>

                {/* Desktop Account Dropdown */}
                {dropdownOpen && (
                  <div className="hidden md:flex absolute right-0 mt-4 w-64 bg-white rounded-3xl shadow-2xl p-3 border border-gray-100 flex-col animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    <div className="px-4 py-3 border-b border-gray-50 mb-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-salsa-pink via-violet-500 to-salsa-pink shrink-0">
                        <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                          {user.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" /> : <UserIcon size={16} className="text-slate-400" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{userData?.displayName || "Dancer"}</p>
                        <p className="text-[11px] font-bold text-slate-500 truncate lowercase tracking-wide mt-0.5">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button href="/account" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={UserIcon} className="w-full justify-start text-slate-600">My Account</Button>
                      {(userData?.role === 'ambassador' || userData?.role === 'superadmin') && <Button href="/guest-dancer" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={Shield} className="w-full justify-start text-salsa-pink hover:bg-salsa-pink/10">Dashboard</Button>}
                      {userData?.role === 'admin' && <Button href="/admin/tickets" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={Ticket} className="w-full justify-start text-indigo-600 hover:bg-indigo-50">Tickets Database</Button>}
                      {(userData?.role === 'admin' || userData?.role === 'superadmin') && <Button href="/admin/scanner" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={QrCode} className="w-full justify-start text-indigo-600 hover:bg-indigo-50">Gate Scanner</Button>}
                      {userData?.role === 'superadmin' && <Button href="/admin" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={ShieldAlert} className="w-full justify-start text-salsa-pink hover:bg-salsa-pink/10">Admin Panel</Button>}
                      <div className="h-px bg-gray-100 w-full my-2" />
                      <Button onClick={handleSignOut} variant="danger" size="md" icon={LogOut} className="w-full justify-start">Sign Out</Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button href="/login" variant={isTransparent ? "ghost" : "secondary"} size="sm" className={`hidden md:flex px-8 transition-all duration-300 shadow-md ${isTransparent ? '!bg-white !text-slate-900 hover:!bg-gray-100' : 'hover:!bg-salsa-pink'}`}>
                Login
              </Button>
            )}

            {/* 3. HAMBURGER MENU (MOBILE NAVIGATION) */}
            <div className="md:hidden relative">
              <button 
                onClick={() => { setMobileMenuOpen(true); setMobileAccountOpen(false); }} 
                className={`p-2 transition-colors duration-300 ${textColorClass} cursor-pointer`}
              >
                <Menu size={28} />
              </button>
            </div>
            
          </div>
        </div>
      </nav>

      {/* ==================================================== */}
      {/* MOBILE NAVIGATION SIDE DRAWER (50% Width) */}
      {/* ==================================================== */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex justify-end font-montserrat">
          {/* Dark Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          
          {/* Sliding Drawer - Width set to 50% */}
          <div className="relative w-[70%] bg-white h-[100dvh] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
              <span className="font-black text-slate-900 uppercase tracking-widest text-xs truncate">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-salsa-pink transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Drawer Links */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="px-4 py-4 border-b border-gray-50 flex items-center justify-center active:bg-slate-50 transition-colors w-full">
                <span className="font-black text-sm text-slate-800 uppercase tracking-widest text-center">Home</span>
              </Link>
              <Link href="/tickets" onClick={() => setMobileMenuOpen(false)} className="px-4 py-4 border-b border-gray-50 flex items-center justify-center active:bg-slate-50 transition-colors w-full">
                <span className="font-black text-sm text-slate-800 uppercase tracking-widest text-center">Prices</span>
              </Link>
              <Link href="/info" onClick={() => setMobileMenuOpen(false)} className="px-4 py-4 border-b border-gray-50 flex items-center justify-center active:bg-slate-50 transition-colors w-full">
                <span className="font-black text-sm text-slate-800 uppercase tracking-widest text-center">Info</span>
              </Link>
              <Link href="/gallery" onClick={() => setMobileMenuOpen(false)} className="px-4 py-4 border-b border-gray-50 flex items-center justify-center active:bg-slate-50 transition-colors w-full">
                <span className="font-black text-sm text-slate-800 uppercase tracking-widest text-center">Gallery</span>
              </Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="px-4 py-4 border-b border-gray-50 flex items-center justify-center active:bg-slate-50 transition-colors w-full">
                <span className="font-black text-sm text-slate-800 uppercase tracking-widest text-center">About Us</span>
              </Link>
            </div>

            {/* Drawer Footer */}
            {!user && (
              <div className="p-4 border-t border-gray-100 shrink-0 pb-safe">
                <Button href="/login" onClick={() => setMobileMenuOpen(false)} variant="primary" size="md" className="w-full justify-center text-xs">
                  Login
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MOBILE ACCOUNT SIDE DRAWER (50% Width) */}
      {/* ==================================================== */}
      {mobileAccountOpen && user && (
        <div className="md:hidden fixed inset-0 z-[100] flex justify-end font-montserrat">
          {/* Dark Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setMobileAccountOpen(false)} 
          />
          
          {/* Sliding Drawer - Width set to 50% */}
          <div className="relative w-[70%] bg-white h-[100dvh] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10">
            
            {/* User Info Header */}
            <div className="p-4 bg-slate-50 border-b border-gray-100 flex flex-col items-center justify-center shrink-0 relative">
              <button onClick={() => setMobileAccountOpen(false)} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-salsa-pink transition-colors">
                <X size={20} />
              </button>
              <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-salsa-pink via-violet-500 to-salsa-pink shrink-0 mb-2">
                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                  {user.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" /> : <UserIcon size={20} className="text-slate-400" />}
                </div>
              </div>
              <div className="w-full text-center min-w-0">
                <p className="text-sm font-black text-slate-900 truncate tracking-tight leading-tight">{userData?.displayName || "Dancer"}</p>
                <p className="text-[10px] font-bold text-slate-500 truncate tracking-widest mt-0.5">{user.email}</p>
              </div>
            </div>

            {/* Account Links */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-2 pt-2">Your Portal</p>
  
  <Button href="/account" onClick={() => setMobileAccountOpen(false)} variant="ghost" size="lg" icon={UserIcon} className="w-full justify-start text-slate-800">
    My Account
  </Button>
  
  {(userData?.role === 'ambassador' || userData?.role === 'superadmin') && (
    <Button href="/guest-dancer" onClick={() => setMobileAccountOpen(false)} variant="ghost" size="lg" icon={Shield} className="w-full justify-start text-salsa-pink">
      Dashboard
    </Button>
  )}
  
  {userData?.role === 'admin' && (
    <Button href="/admin/tickets" onClick={() => setMobileAccountOpen(false)} variant="ghost" size="lg" icon={Ticket} className="w-full justify-start text-indigo-600">
      Tickets Database
    </Button>
  )}
  
  {(userData?.role === 'admin' || userData?.role === 'superadmin') && (
    <Button href="/admin/scanner" onClick={() => setMobileAccountOpen(false)} variant="ghost" size="lg" icon={QrCode} className="w-full justify-start text-indigo-600">
      Gate Scanner
    </Button>
  )}
  
  {userData?.role === 'superadmin' && (
    <Button href="/admin" onClick={() => setMobileAccountOpen(false)} variant="ghost" size="lg" icon={ShieldAlert} className="w-full justify-start text-salsa-pink">
      Admin Panel
    </Button>
  )}
</div>

            {/* Sign Out Footer */}
            <div className="p-4 border-t border-gray-100 shrink-0 pb-safe">
              <Button onClick={handleSignOut} variant="danger" size="md" className="w-full justify-center text-xs shadow-sm">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}