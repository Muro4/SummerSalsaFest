"use client";
import { useEffect, useState } from "react";
import Script from "next/script";

// MUST have "export default" here!
export default function Analytics() {
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    const checkConsent = () => {
      if (localStorage.getItem("ssf_cookie_consent") === "all") {
        setConsentGranted(true);
      }
    };

    checkConsent();

    window.addEventListener("cookieConsentChanged", checkConsent);
    return () => window.removeEventListener("cookieConsentChanged", checkConsent);
  }, []);

  if (!consentGranted) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-XXXXXXXXXX', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}