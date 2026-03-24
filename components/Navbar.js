"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, onSnapshot, updateDoc } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import Button from "@/components/Button";
import { usePopup } from "@/components/PopupProvider";
import { ShoppingCart, User as UserIcon, LogOut, ShieldAlert, Menu, X, QrCode, Shield, Ticket } from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const [cartItems, setCartItems] = useState(0); 

  const dropdownRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const { showPopup } = usePopup();
  
  const isHome = pathname === "/";
  const isTransparent = isHome && !scrolled;

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
        // Fetch User Role Data
        const uDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (uDoc.exists()) {
          const data = uDoc.data();
          setUserData(data);

          // ONE-TIME APPLICATION NOTIFICATION CHECK
          if (
            (data.applicationStatus === "approved" || data.applicationStatus === "rejected") && 
            !data.applicationNotified
          ) {
            // Update Firestore immediately so it doesn't fire twice
            updateDoc(doc(db, "users", currentUser.uid), { applicationNotified: true }).catch(console.error);

            if (data.applicationStatus === "approved") {
              showPopup({
                type: "success",
                title: "Application Approved!",
                message: "Congratulations! You have been approved as a Guest Dancer. You can now access your Ambassador Dashboard.",
                confirmText: "Go to Dashboard",
                cancelText: "Dismiss",
                onConfirm: () => router.push("/ambassador")
              });
            } else if (data.applicationStatus === "rejected") {
              showPopup({
                type: "info",
                title: "Application Update",
                message: "Thank you for applying. Unfortunately, we are unable to accept your Guest Dancer application at this time.",
                confirmText: "Okay"
              });
            }
          }
        }

        if (unsubCart) unsubCart();

        // Listen for Cart Items safely
        const cartRef = collection(db, "users", currentUser.uid, "cart");
        unsubCart = onSnapshot(
          cartRef, 
          (snap) => {
            let totalItems = 0;
            snap.forEach((itemDoc) => {
              totalItems += (itemDoc.data().quantity || 1);
            });
            setCartItems(totalItems);
          },
          (error) => {
            if (error.code === 'permission-denied') return;
            console.warn("Cart sync issue:", error.message);
          }
        );

      } else {
        if (unsubCart) {
          unsubCart();
          unsubCart = null;
        }
        setUserData(null);
        setCartItems(0);
      }
    });

    return () => {
      unsubAuth();
      if (unsubCart) unsubCart(); 
    };
  }, [router, showPopup]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setDropdownOpen(false);
    router.push("/login");
    
    setTimeout(async () => {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Sign out error:", err);
      }
    }, 800); 
  };

  const navBackgroundClass = isHome 
    ? (scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6') 
    : 'bg-white shadow-sm py-4 border-b border-gray-200';

  const textColorClass = isTransparent ? "text-white" : "text-slate-800";

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 font-montserrat ${navBackgroundClass}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        
        {/* LEFT: LOGO */}
        <div className="flex-1 flex justify-start items-center">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img 
              src="/images/logo.png" 
              alt="Salsa Fest Logo" 
              className={`h-10 w-auto object-contain transition-all duration-300 ${isTransparent ? 'brightness-0 invert' : ''}`} 
            />
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
        <div className="flex-1 flex justify-end items-center gap-4">
          
          {/* CART ICON WITH BADGE */}
          {user && (
            <div className="relative">
              <Link 
                href="/cart" 
                className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 border border-transparent 
                  ${isTransparent ? 'hover:bg-white/20' : 'hover:bg-slate-100 hover:text-salsa-pink'} ${textColorClass}`}
              >
                <ShoppingCart size={22} />
              </Link>
              
              {cartItems > 0 && (
                <span className={`absolute top-0 right-0 w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-black text-white bg-salsa-pink border-2 shadow-sm ${isTransparent ? 'border-transparent' : 'border-white'}`}>
                  {cartItems}
                </span>
              )}
            </div>
          )}

          {user ? (
            <div className="relative" ref={dropdownRef}>
              
              {/* AVATAR BUTTON (Gradient Ring) */}
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)} 
                className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-salsa-pink via-violet-500 to-salsa-pink shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer"
              >
                <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center transition-colors duration-300 ${isTransparent ? 'bg-slate-900/80 text-white' : 'bg-white text-slate-800'}`}>
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="w-full h-full object-cover rounded-full" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <UserIcon size={18} />
                  )}
                </div>
              </button>

              {/* DROPDOWN MENU */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-4 w-64 bg-white rounded-3xl shadow-2xl p-3 border border-gray-100 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                  
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-gray-50 mb-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-salsa-pink via-violet-500 to-salsa-pink shrink-0">
                      <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                          <UserIcon size={16} className="text-slate-400" />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{userData?.displayName || "Dancer"}</p>
                      <p className="text-[11px] font-bold text-slate-500 truncate lowercase tracking-wide mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    
                    {/* 1. ALL USERS GET MY ACCOUNT */}
                    <Button href="/account" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={UserIcon} className="w-full justify-start text-slate-600">
                      My Account
                    </Button>

                    {/* 2. AMBASSADOR & SUPERADMIN: Ambassador Dashboard */}
                    {(userData?.role === 'ambassador' || userData?.role === 'superadmin') && (
                      <Button href="/guest-dancer" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={Shield} className="w-full justify-start text-salsa-pink hover:bg-salsa-pink/10">
                        Dashboard
                      </Button>
                    )}

                    {/* 3. ADMIN: Tickets Database */}
                    {userData?.role === 'admin' && (
                      <Button href="/admin/tickets" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={Ticket} className="w-full justify-start text-indigo-600 hover:bg-indigo-50">
                        Tickets Database
                      </Button>
                    )}

                    {/* 4. ADMIN & SUPERADMIN: Gate Scanner */}
                    {(userData?.role === 'admin' || userData?.role === 'superadmin') && (
                      <Button href="/admin/scanner" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={QrCode} className="w-full justify-start text-indigo-600 hover:bg-indigo-50">
                        Gate Scanner
                      </Button>
                    )}

                    {/* 5. SUPERADMIN: Master Dashboard */}
                    {userData?.role === 'superadmin' && (
                      <Button href="/admin" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={ShieldAlert} className="w-full justify-start text-salsa-pink hover:bg-salsa-pink/10">
                        Admin Panel
                      </Button>
                    )}

                    <div className="h-px bg-gray-100 w-full my-2" />

                    <Button onClick={handleSignOut} variant="danger" size="md" icon={LogOut} className="w-full justify-start">
                      Sign Out
                    </Button>
                  </div>

                </div>
              )}
            </div>
          ) : (
            <Button 
              href="/login" 
              variant={isTransparent ? "ghost" : "secondary"}
              size="sm"
              className={`hidden md:flex px-8 transition-all duration-300 shadow-md ${isTransparent ? '!bg-white !text-slate-900 hover:!bg-gray-100' : 'hover:!bg-salsa-pink'}`}
            >
              Login
            </Button>
          )}

          {/* MOBILE MENU TOGGLE */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className={`md:hidden p-2 transition-colors duration-300 ${textColorClass}`}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-100 shadow-xl flex flex-col p-6 gap-3 animate-in slide-in-from-top-4 duration-300">
          <Button href="/" onClick={() => setMobileMenuOpen(false)} variant="ghost" size="md" className="w-full justify-start">Home</Button>
          <Button href="/tickets" onClick={() => setMobileMenuOpen(false)} variant="ghost" size="md" className="w-full justify-start">Prices</Button>
          <Button href="/info" onClick={() => setMobileMenuOpen(false)} variant="ghost" size="md" className="w-full justify-start">Info</Button>
          <Button href="/gallery" onClick={() => setMobileMenuOpen(false)} variant="ghost" size="md" className="w-full justify-start">Gallery</Button>
          <Button href="/about" onClick={() => setMobileMenuOpen(false)} variant="ghost" size="md" className="w-full justify-start">About Us</Button>
          
          {!user && (
            <>
              <div className="h-px bg-gray-100 w-full my-3" />
              <Button href="/login" onClick={() => setMobileMenuOpen(false)} variant="primary" size="md" className="w-full">
                Login / Sign Up
              </Button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}