"use client";
import { useState, useEffect, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, onSnapshot, updateDoc, query, where } from "firebase/firestore";
import Button from "@/components/Button";
import { usePopup } from "@/components/PopupProvider";
import logoImg from "../assets/logo.png";
import Image from "next/image";
import { ShoppingCart, User as UserIcon, LogOut, LogIn, ShieldAlert, Menu, X, QrCode, Shield, Ticket } from "lucide-react";
import Cookies from 'js-cookie';

import { useTranslations } from 'next-intl';
import LanguageSwitcher from "./LanguageSwitcher";

import { Link, usePathname, useRouter } from "@/routing";

export default function Navbar() {
  const t = useTranslations('Navbar');

  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);

  const [dropdownOpen, setDropdownOpen] = useState(false); 
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); 
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false); 

  const [scrolled, setScrolled] = useState(false);
  
  /* Split state to track both standard merchandise and pending festival tickets */
  const [merchCount, setMerchCount] = useState(0);
  const [ticketCount, setTicketCount] = useState(0);
  const totalCartItems = merchCount + ticketCount;

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

  /* Local cart synchronization fallback for strictly non-authenticated edge cases */
  useEffect(() => {
    const updateLocalCart = () => {
      if (!auth.currentUser) {
        try {
          const localCart = JSON.parse(localStorage.getItem('cart')) || [];
          let total = 0;
          localCart.forEach(item => total += (item.quantity || 1));
          setMerchCount(total);
        } catch (e) {
          console.warn("Error reading local cart", e);
        }
      }
    };

    updateLocalCart();
    window.addEventListener('cartUpdated', updateLocalCart);
    window.addEventListener('storage', updateLocalCart);

    return () => {
      window.removeEventListener('cartUpdated', updateLocalCart);
      window.removeEventListener('storage', updateLocalCart);
    };
  }, []);

  /* Primary Real-Time Authentication and Dual Cart Synchronization */
  useEffect(() => {
    let unsubCart = null;
    let unsubTickets = null;

    const unsubAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const uDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (uDoc.exists()) {
          const data = uDoc.data();
          setUserData(data);

          if ((data.applicationStatus === "approved" || data.applicationStatus === "rejected") && !data.applicationNotified) {
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

        /* 1. Merchandise Cart Listener */
        const cartRef = collection(db, "users", currentUser.uid, "cart");
        unsubCart = onSnapshot(cartRef, (snap) => {
          let totalItems = 0;
          snap.forEach((itemDoc) => { totalItems += (itemDoc.data().quantity || 1); });
          setMerchCount(totalItems);
        }, (error) => { if (error.code !== 'permission-denied') console.warn("Cart sync issue:", error.message); });

        /* 2. Pending Tickets Cart Listener (Fixes the ticket cart reactivity) */
        const ticketsQuery = query(
          collection(db, "tickets"),
          where("userId", "==", currentUser.uid),
          where("status", "==", "pending")
        );
        unsubTickets = onSnapshot(ticketsQuery, (snap) => {
          setTicketCount(snap.size);
        }, (error) => { if (error.code !== 'permission-denied') console.warn("Ticket sync issue:", error.message); });

      } else {
        if (unsubCart) { unsubCart(); unsubCart = null; }
        if (unsubTickets) { unsubTickets(); unsubTickets = null; }
        setUserData(null);
        setTicketCount(0);
        try {
          const localCart = JSON.parse(localStorage.getItem('cart')) || [];
          setMerchCount(localCart.reduce((acc, item) => acc + (item.quantity || 1), 0));
        } catch(e) { setMerchCount(0); }
      }
    });

    return () => {
      unsubAuth();
      if (unsubCart) unsubCart();
      if (unsubTickets) unsubTickets();
    };
  }, [router, showPopup]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  useEffect(() => {
    if (mobileMenuOpen || mobileAccountOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [mobileMenuOpen, mobileAccountOpen]);

  const toggleAccountMenu = () => {
    if (window.innerWidth >= 768) {
      setDropdownOpen(!dropdownOpen);
    } else {
      setMobileAccountOpen(true);
      setMobileMenuOpen(false);
    }
  };

  const handleSignOut = () => {
  setDropdownOpen(false);
  setMobileMenuOpen(false);
  setMobileAccountOpen(false);
  
  // CLEAR THE COOKIE SO THEY LOSE ADMIN ACCESS INSTANTLY
  Cookies.remove('userRole', { path: '/' }); 
  
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
    ? (scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm py-3 md:py-4' : 'bg-transparent py-4 md:py-6')
    : 'bg-white shadow-sm py-3 md:py-4 border-b border-gray-200';

  const textColorClass = isTransparent ? "text-white" : "text-slate-800";

  const isActive = (path) => pathname === path;
  
  const desktopLinkClass = (path) => 
    `relative py-1 transition-all duration-300 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-salsa-pink after:transition-all after:duration-300 ease-in-out ${
      isActive(path) ? 'after:w-full' : 'after:w-0 hover:after:w-full'
    }`;

  const mobileWrapperClass = (path) => 
    `px-4 py-5 border-b border-gray-50 flex items-center justify-center transition-colors w-full ${
      isActive(path) ? 'bg-salsa-pink/10' : 'active:bg-slate-50'
    }`;

  const mobileTextClass = (path) => 
    `font-black text-sm uppercase tracking-widest text-center transition-colors ${
      isActive(path) ? 'text-salsa-pink' : 'text-slate-800'
    }`;

  const accountLinkClass = (path, isMobile = false) => {
    const defaultColor = isMobile ? 'text-slate-800' : 'text-slate-600';
    return `w-full justify-start ${isActive(path) ? '!text-salsa-pink !bg-salsa-pink/10' : defaultColor}`;
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 font-montserrat ${navBackgroundClass}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">

          <div className="flex-1 flex justify-start items-center">
            <Link href="/" className="hover:opacity-80 transition-opacity" onClick={() => { setMobileMenuOpen(false); setMobileAccountOpen(false); setDropdownOpen(false); }}>
              <div className={`relative h-11 w-32 transition-all duration-300 ${isTransparent ? 'brightness-0 invert' : 'brightness-0 opacity-85'}`}>
                <Image src={logoImg} alt="Salsa Fest Logo" fill className="object-contain object-left" priority />
              </div>
            </Link>
          </div>

          <div className={`hidden md:flex justify-center items-center gap-8 text-[11px] font-black uppercase tracking-widest ${textColorClass}`}>
            <Link href="/" className={desktopLinkClass('/')}>{t('home')}</Link>
            <Link href="/tickets" className={desktopLinkClass('/tickets')}>{t('prices')}</Link>
            <Link href="/info" className={desktopLinkClass('/info')}>{t('info')}</Link>
            <Link href="/artists" className={desktopLinkClass('/artists')}>{t('artists')}</Link>
            <Link href="/gallery" className={desktopLinkClass('/gallery')}>{t('gallery')}</Link>
            <Link href="/about" className={desktopLinkClass('/about')}>{t('about')}</Link>
            <Link href="/contact" className={desktopLinkClass('/contact')}>{t('contact')}</Link>
          </div>

          <div className="flex-1 flex justify-end items-center gap-3 md:gap-4">
            
            <LanguageSwitcher isTransparent={isTransparent} />

            {/* FIXED RESPONSIVE CART INDICATOR */}
            <div className="relative flex items-center justify-center">
              <Link href="/cart" onClick={() => { setMobileMenuOpen(false); setMobileAccountOpen(false); setDropdownOpen(false); }} className={`relative w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full transition-all duration-300 border border-transparent ${isTransparent ? 'hover:bg-white/20' : 'hover:bg-slate-100 hover:text-salsa-pink'} ${textColorClass}`}>
                <ShoppingCart size={20} className="md:w-[22px] md:h-[22px]" />
                
                {totalCartItems > 0 && (
                  <span className={`absolute -top-1 -right-1 md:-top-0.5 md:-right-0.5 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full text-[9px] md:text-[11px] font-black text-white bg-salsa-pink border-2 shadow-sm ${isTransparent ? 'border-transparent' : 'border-white'}`}>
                    {totalCartItems}
                  </span>
                )}
              </Link>
            </div>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button onClick={toggleAccountMenu} className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-salsa-pink via-violet-500 to-salsa-pink shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
                  <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center transition-colors duration-300 ${isTransparent ? 'bg-slate-900/80 text-white' : 'bg-white text-slate-800'}`}>
                    {user.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" /> : <UserIcon size={18} />}
                  </div>
                </button>

                {dropdownOpen && (
                  <div className="hidden md:flex absolute right-0 mt-4 w-64 bg-white rounded-3xl shadow-2xl p-3 border border-gray-100 flex-col animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    <div className="px-4 py-3 border-b border-gray-50 mb-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-salsa-pink via-violet-500 to-salsa-pink shrink-0">
                        <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                          {user.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" /> : <UserIcon size={16} className="text-slate-400" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        {user.isAnonymous ? (
                          <p className="text-sm font-black text-slate-900 truncate">Guest</p>
                        ) : (
                          <>
                            <p className="text-sm font-black text-slate-900 truncate">{userData?.displayName || "Dancer"}</p>
                            <p className="text-[11px] font-bold text-slate-500 truncate lowercase tracking-wide mt-0.5">{user.email}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      
                      {!user.isAnonymous && (
                        <>
                          <Button href="/account" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={UserIcon} className={accountLinkClass('/account')}>{t('myAccount')}</Button>
                          {(userData?.role === 'ambassador' || userData?.role === 'superadmin') && <Button href="/guest-dancer" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={Shield} className={accountLinkClass('/guest-dancer')}>{t('dashboard')}</Button>}
                          
                          {(userData?.role === 'admin' || userData?.role === 'superadmin') && <Button href="/admin/tickets" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={Ticket} className={accountLinkClass('/admin/tickets')}>{t('ticketsDb')}</Button>}
                          {(userData?.role === 'admin' || userData?.role === 'superadmin' || userData?.role === 'scanner') && <Button href="/admin/scanner" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={QrCode} className={accountLinkClass('/admin/scanner')}>{t('gateScanner')}</Button>}
                          
                          {userData?.role === 'superadmin' && <Button href="/admin" onClick={() => setDropdownOpen(false)} variant="ghost" size="md" icon={ShieldAlert} className={accountLinkClass('/admin')}>{t('adminPanel')}</Button>}
                          <div className="h-px bg-gray-100 w-full my-2" />
                        </>
                      )}
                      
                      {/* DYNAMIC BUTTON: Primary Login for Guests, Danger Sign Out for Users */}
                      {user.isAnonymous ? (
                        <Button onClick={handleSignOut} variant="primary" size="md" icon={LogIn} className="w-full justify-start">{t('login')}</Button>
                      ) : (
                        <Button onClick={handleSignOut} variant="danger" size="md" icon={LogOut} className="w-full justify-start">{t('signOut')}</Button>
                      )}
                      
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button href="/login" variant={isTransparent ? "ghost" : "secondary"} size="sm" className={`hidden md:flex px-8 transition-all duration-300 shadow-md ${isTransparent ? '!bg-white !text-slate-900 hover:!bg-gray-100' : 'hover:!bg-salsa-pink'}`}>
                {t('login')}
              </Button>
            )}

            <div className="md:hidden relative">
              <button onClick={() => { setMobileMenuOpen(true); setMobileAccountOpen(false); }} className={`p-2 transition-colors duration-300 ${textColorClass} cursor-pointer`}>
                <Menu size={28} />
              </button>
            </div>

          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex justify-end font-montserrat">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-[70%] bg-white h-[100dvh] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
              <span className="font-black text-slate-900 uppercase tracking-widest text-xs truncate">{t('menu')}</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-salsa-pink transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className={mobileWrapperClass('/')}><span className={mobileTextClass('/')}>{t('home')}</span></Link>
              <Link href="/tickets" onClick={() => setMobileMenuOpen(false)} className={mobileWrapperClass('/tickets')}><span className={mobileTextClass('/tickets')}>{t('prices')}</span></Link>
              <Link href="/info" onClick={() => setMobileMenuOpen(false)} className={mobileWrapperClass('/info')}><span className={mobileTextClass('/info')}>{t('info')}</span></Link>
              <Link href="/artists" onClick={() => setMobileMenuOpen(false)} className={mobileWrapperClass('/artists')}><span className={mobileTextClass('/artists')}>{t('artists')}</span></Link>
              <Link href="/gallery" onClick={() => setMobileMenuOpen(false)} className={mobileWrapperClass('/gallery')}><span className={mobileTextClass('/gallery')}>{t('gallery')}</span></Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className={mobileWrapperClass('/about')}><span className={mobileTextClass('/about')}>{t('about')}</span></Link>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className={mobileWrapperClass('/contact')}><span className={mobileTextClass('/contact')}>{t('contact')}</span></Link>
            </div>
            {!user && (
              <div className="p-4 border-t border-gray-100 shrink-0 pb-safe">
                <Button href="/login" onClick={() => setMobileMenuOpen(false)} variant="primary" size="md" className="w-full justify-center text-xs">{t('login')}</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {mobileAccountOpen && user && (
        <div className="md:hidden fixed inset-0 z-[100] flex justify-end font-montserrat">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setMobileAccountOpen(false)} />
          <div className="relative w-[70%] bg-white h-[100dvh] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10">

            <div className="p-4 bg-slate-50 border-b border-gray-100 flex flex-col items-center justify-center shrink-0 relative">
              <button onClick={() => setMobileAccountOpen(false)} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-salsa-pink transition-colors"><X size={20} /></button>
              <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-salsa-pink via-violet-500 to-salsa-pink shrink-0 mb-2">
                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                  {user.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" /> : <UserIcon size={20} className="text-slate-400" />}
                </div>
              </div>
              <div className="w-full text-center min-w-0">
                {user.isAnonymous ? (
                  <p className="text-sm font-black text-slate-900 truncate tracking-tight leading-tight">Guest</p>
                ) : (
                  <>
                    <p className="text-sm font-black text-slate-900 truncate tracking-tight leading-tight">{userData?.displayName || "Dancer"}</p>
                    <p className="text-[10px] font-bold text-slate-500 truncate tracking-widest mt-0.5">{user.email}</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {!user.isAnonymous && (
                <>
                  <Button href="/account" onClick={() => setMobileAccountOpen(false)} variant="ghost" size="lg" icon={UserIcon} className={accountLinkClass('/account', true)}>{t('myAccount')}</Button>
                  {(userData?.role === 'ambassador' || userData?.role === 'superadmin') && <Button href="/guest-dancer" onClick={() => setMobileAccountOpen(false)} variant="ghost" size="lg" icon={Shield} className={accountLinkClass('/guest-dancer', true)}>{t('dashboard')}</Button>}
                  
                  {(userData?.role === 'admin' || userData?.role === 'superadmin') && <Button href="/admin/tickets" onClick={() => setMobileAccountOpen(false)} variant="ghost" size="lg" icon={Ticket} className={accountLinkClass('/admin/tickets', true)}>{t('ticketsDb')}</Button>}
                  {(userData?.role === 'admin' || userData?.role === 'superadmin' || userData?.role === 'scanner') && <Button href="/admin/scanner" onClick={() => setMobileAccountOpen(false)} variant="ghost" size="lg" icon={QrCode} className={accountLinkClass('/admin/scanner', true)}>{t('gateScanner')}</Button>}
                  
                  {userData?.role === 'superadmin' && <Button href="/admin" onClick={() => setMobileAccountOpen(false)} variant="ghost" size="lg" icon={ShieldAlert} className={accountLinkClass('/admin', true)}>{t('adminPanel')}</Button>}
                </>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 shrink-0 pb-safe">
              {/* DYNAMIC BUTTON: Primary Login for Guests, Danger Sign Out for Users */}
              {user.isAnonymous ? (
                <Button onClick={handleSignOut} variant="primary" size="md" className="w-full justify-center text-xs shadow-sm">{t('login')}</Button>
              ) : (
                <Button onClick={handleSignOut} variant="danger" size="md" className="w-full justify-center text-xs shadow-sm">{t('signOut')}</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}