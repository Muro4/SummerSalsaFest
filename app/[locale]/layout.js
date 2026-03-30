import { Modak, Bebas_Neue, Montserrat } from "next/font/google";
import "./globals.css";
import { PopupProvider } from '@/components/PopupProvider'; 
import CookieBanner from "@/components/CookieBanner";
import Analytics from "@/components/Analytics";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Cyrillic added to Bebas Neue
const bebas = Bebas_Neue({ 
  weight: '400', 
  subsets: ["latin", "cyrillic"], 
  variable: '--font-bebas' 
});

// Cyrillic added to Montserrat
const montserrat = Montserrat({ 
  subsets: ["latin", "cyrillic"], 
  variable: '--font-montserrat' 
});

// Modak remains Latin-only
const modak = Modak({
  weight: '400',
  subsets: ["latin"],
  variable: '--font-modak' 
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