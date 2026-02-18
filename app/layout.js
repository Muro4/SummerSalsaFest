import { Bebas_Neue, Montserrat } from "next/font/google";
import "./globals.css";

// 1. Configure Bebas Neue (for headings)
const bebas = Bebas_Neue({ 
  weight: '400', 
  subsets: ["latin"], 
  variable: '--font-bebas' 
});

// 2. Configure Montserrat (for body text)
const montserrat = Montserrat({ 
  subsets: ["latin"], 
  variable: '--font-montserrat' 
});

export const metadata = {
  title: "Summer Salsa Varna 2026",
  description: "The 14th edition of Summer Salsa Fest",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* 3. Apply the font variables to the body */}
      <body className={`${bebas.variable} ${montserrat.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}