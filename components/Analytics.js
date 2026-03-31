"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

// Replace this with your actual Google Analytics Measurement ID
const GA_MEASUREMENT_ID = "G-XXXXXXXXXX"; 

export default function Analytics() {
  const [consentGranted, setConsentGranted] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Listen for Cookie Consent
  useEffect(() => {
    const checkConsent = () => {
      if (localStorage.getItem("ssf_cookie_consent") === "all") {
        setConsentGranted(true);
      }
    };

    checkConsent(); // Check immediately on mount

    window.addEventListener("cookieConsentChanged", checkConsent);
    return () => window.removeEventListener("cookieConsentChanged", checkConsent);
  }, []);

  // 2. Track Page Views on Client-Side Navigations
  useEffect(() => {
    if (consentGranted && pathname && typeof window !== "undefined" && window.gtag) {
      let url = pathname;
      if (searchParams && searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
      
      // Manually push the new page view to GA
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: url,
      });
    }
  }, [pathname, searchParams, consentGranted]);

  // Don't render the scripts at all if consent is not granted
  if (!consentGranted) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          
          // Note: Initial page view is handled by the useEffect hook above
          gtag('config', '${GA_MEASUREMENT_ID}', {
            send_page_view: false 
          });
        `}
      </Script>
    </>
  );
}