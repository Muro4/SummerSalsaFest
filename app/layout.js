// app/layout.js
import { Modak, Bebas_Neue, Montserrat } from "next/font/google";
import "./globals.css";
import { PopupProvider } from '@/components/PopupProvider'; 
import CookieBanner from "@/components/CookieBanner";
import Analytics from "@/components/Analytics";

const bebas = Bebas_Neue({ 
  weight: '400', 
  subsets: ["latin"], 
  variable: '--font-bebas' 
});

const montserrat = Montserrat({ 
  subsets: ["latin"], 
  variable: '--font-montserrat' 
});

const modak = Modak({
  weight: '400',
  subsets: ["latin"],
  variable: '--font-modak' 
});

export const metadata = {
  title: "Summer Salsa Varna 2026",
  description: "The 14th edition of Summer Salsa Fest",
};

// ✅ ADDED: This totally prevents iOS Safari from auto-zooming into small inputs!
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${modak.variable} ${bebas.variable} ${montserrat.variable} antialiased`}>
        
          <PopupProvider>
            {children}
          </PopupProvider>
          <CookieBanner />
          <Analytics />
        
      </body>
    </html>
  );
}