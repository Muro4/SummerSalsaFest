import { Modak, Montserrat } from "next/font/google";
import localFont from "next/font/local"; // <--- 1. Import localFont
import "./globals.css";
import { PopupProvider } from '@/components/PopupProvider'; 
import CookieBanner from "@/components/CookieBanner";
import Analytics from "@/components/Analytics";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';

// 2. Load your custom Cyrillic Bebas font
const bebas = localFont({
  src: '../fonts/BebasNeueCyrillic.ttf', // Make sure this path matches your file!
  variable: '--font-bebas',
  display: 'swap',
});

const montserrat = Montserrat({ 
  subsets: ["latin", "cyrillic"], 
  variable: '--font-montserrat',
  display: 'swap',
});

const modak = Modak({
  weight: '400',
  subsets: ["latin"],
  variable: '--font-modak',
  display: 'swap',
});

export const metadata = {
  title: "Summer Salsa Varna 2026",
  description: "The 14th edition of Summer Salsa Fest",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children, params }) {
  const { locale } = await params;

  if (!['en', 'bg'].includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className="scroll-smooth">
      {/* 3. Inject the local Bebas variable into the body */}
      <body className={`${modak.variable} ${bebas.variable} ${montserrat.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <PopupProvider>
            {children}
          </PopupProvider>
          <CookieBanner />
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}