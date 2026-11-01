"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTranslations } from "next-intl";

export default function TermsPage() {
  const t = useTranslations("Terms");

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat selection:bg-slate-900 selection:text-white">
      <Navbar />

      {/* HEADER SECTION */}
      <section className="pt-36 pb-12 px-6 max-w-4xl mx-auto text-center">
        <h1 className="font-bebas text-5xl sm:text-6xl md:text-7xl text-slate-900 uppercase tracking-wide">
          {t("heroTitle1")} {t("heroTitle2")}
        </h1>
      </section>

      {/* DOCUMENT SECTION */}
      <section className="px-4 sm:px-6 max-w-4xl mx-auto mb-24">
        <div className="bg-white p-8 sm:p-12 md:p-16 rounded-2xl shadow-sm border border-gray-200 text-slate-700 leading-relaxed space-y-12">
          
          {/* 1. Acceptance of Terms */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t("s1Title")}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t("s1Text")}
            </p>
          </div>

          {/* 2. Tickets, Transfers & Refunds */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t("s2Title")}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t("s2Text")}
            </p>
          </div>

          {/* 3. Code of Conduct */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t("s3Title")}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t("s3Text")}
            </p>
          </div>

          {/* 4. Guest Dancer & Promoter Program */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t("s4Title")}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t("s4Text")}
            </p>
          </div>

          {/* 5. Media Release */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t("s5Title")}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t("s5Text")}
            </p>
          </div>

          {/* 6. Liability Waiver */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t("s6Title")}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t("s6Text")}
            </p>
          </div>

          {/* 7. Pre-Party & Goodbye Party */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t("s7Title")}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t("s7Text")}
            </p>
          </div>

          {/* 8. On-Site Purchases & Info Desk */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t("s8Title")}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t("s8Text")}
            </p>
          </div>

          {/* 9. Pass Collection */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t("s9Title")}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t("s9Text")}
            </p>
          </div>

          {/* 10. Privacy & Data Protection */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t("s10Title")}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t("s10Text")}
            </p>
          </div>

          {/* 11. Age Restrictions & Minors */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t("s11Title")}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t("s11Text")}
            </p>
          </div>

          {/* 12. Wristbands & Event Access */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t("s12Title")}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t("s12Text")}
            </p>
          </div>

          {/* 13. Governing Law & Jurisdiction */}
          <div>
            <h2 className="font-bebas tracking-wide text-2xl sm:text-3xl text-slate-900 uppercase mb-4">
              {t("s13Title")}
            </h2>
            <p className="font-medium text-sm sm:text-base text-slate-600 text-justify">
              {t("s13Text")}
            </p>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}