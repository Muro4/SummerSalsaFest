"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MapPin, Map, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

export default function InfoPage() {
  const t = useTranslations("Info");
  const [openFaq, setOpenFaq] = useState(null);
  const [activeMap, setActiveMap] = useState(null);
  const [selectedDay, setSelectedDay] = useState("friday");

  const faqs = [
    { q: t("faq1q"), a: t("faq1a") },
    { q: t("faq2q"), a: t("faq2a") },
    { q: t("faq3q"), a: t("faq3a") },
    { q: t("faq4q"), a: t("faq4a") },
  ];

  const daysSchedule = {
    thursday: {
      label: "Thursday",
      tagline: "The Kick-Off",
      items: [
        {
          time: "Evening",
          title: "Pre-Party ",
          location: "Varna Free university",
          description: "Not included in full pass"
        }
      ]
    },
    friday: {
      label: "Friday",
      tagline: "Opening Day & Competitions",
      items: [
        {
          time: "14:00 – 03:00",
          title: "All-Day Registration",
          location: "Info Desk at Varna Free university",
          description: "Pass collection, wristband check-in, and attendee support."
        },
        {
          time: "14:00 – 18:00",
          title: "Beach Fiesta",
          location: "Ash Beach Bar",
          description: "For you convinience there will be a info desk at the beach fiesta"
        },
        {
          time: "21:30",
          title: "J&J Competition Qualifications",
          location: "Varna Free University",
          description: "Jack & Jill competition qualifying rounds."
        },
        {
          time: "23:00 - 05:00",
          title: "Welcome Party",
          location: "4 Outdoor Halls at Varna Free University",
          
        },
        {
          time: "01:00",
          title: "J&J Finals",
          location: "Varna Free University",
          description: "The championship finals of the Jack & Jill competition."
        }
      ]
    },
    saturday: {
      label: "Saturday",
      tagline: "Workshops, Beach & Shows",
      items: [
        {
          time: "10:00 – 14:00",
          title: "Workshops",
          location: "3 Halls at Varna Free University",
          
        },
        {
          time: "14:00 – 18:00",
          title: "Beach Fiesta",
          location: "Ash Beach Bar ",
          description: "For you convinience there will be a info desk at the beach fiesta"
          
        },
        {
          time: "18:00 – 20:00",
          title: "Workshops",
          location: "3 Halls at Varna Free University",
        },
        {
          time: "22:00",
          title: "Show",
          location: "Varna Free University",
          description: "Spectacular stage performances by international guest artists & world stars."
        },
        {
          time: "23:00 – 05:00",
          title: "Party",
          location: "4 Outdoor Halls at Varna Free University",
          description: "In case of rain there will be 3 indoor party halls"
        }
      ]
    },
    sunday: {
      label: "Sunday",
      tagline: "Workshops, Beach & Shows",
      items: [
        {
          time: "10:00 – 14:00",
          title: "Workshops",
          location: "3 Halls at Varna Free University",
        },
        {
          time: "14:00 – 18:00",
          title: "Beach Fiesta",
          location: "Ash Beach Bar",
          description: "For you convinience there will be a info desk at the beach fiesta"
        },
        {
          time: "18:00 – 20:00",
          title: "Workshops",
          location: "3 Halls at Varna Free University",
        },
        {
          time: "22:00",
          title: "Show",
          location: "Varna Free University",
          description: "Evening performance lineup with guest couples and teams."
        },
        {
          time: "23:00 – 05:00",
          title: "Party",
          location: "4 Outdoor Halls at Varna Free University",
          description: "In case of rain there will be 3 indoor party halls"
        },
        {
          time: "05:00 – 06:00",
          title: "Mixed After Party",
          location: "Hall 1 at Varna Free University",
          description: "Welcoming the sunrise"
        }
      ]
    },
    monday: {
      label: "Monday",
      tagline: "The Finale",
      items: [
        {
          time: "14:00 – 18:00",
          title: "Charity Beach Fiesta",
          location: "Ash Beach Bar"
        },
        {
          time: "21:00",
          title: "Goodbye Party",
          description: "Not included in the full pass"
        }
      ]
    }
  };

  const activeDayData = daysSchedule[selectedDay];

  return (
    <main className="min-h-screen bg-salsa-white font-montserrat selection:bg-slate-900 selection:text-white">
      <Navbar />

      <div className="pt-32 pb-16 px-4 sm:px-6 max-w-5xl mx-auto">
        
        {/* ACCOMMODATION NOTICE */}
        <section className="mb-14">
  <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm text-center max-w-3xl mx-auto">
    <span className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 block mb-2">
      {t('noticeBadge')}
    </span>
    <h2 className="font-bebas text-4xl sm:text-5xl tracking-wide uppercase text-slate-900 leading-none">
      {t('noticeTitle')}
    </h2>
    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-4 max-w-2xl mx-auto font-medium">
      {t('noticeDesc')}
    </p>
  </div>
</section>

        {/* FESTIVAL SCHEDULE */}
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-slate-400 font-black text-[11px] uppercase tracking-[0.25em]">Festival Program</span>
            <h2 className="font-bebas tracking-wide text-5xl sm:text-6xl text-slate-900 mt-1">Daily Schedule</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">Select a day below to view the daily timetable.</p>
          </div>

          {/* DAY TABS */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-3 mb-8 scrollbar-none border-b border-slate-100">
            {Object.entries(daysSchedule).map(([key, day]) => {
              const isSelected = selectedDay === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(key)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>

          {/* DAY HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-4 px-2 gap-1">
            <h3 className="font-bebas text-3xl sm:text-4xl text-slate-900 tracking-wide">{activeDayData.label}</h3>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{activeDayData.tagline}</span>
          </div>

          {/* SCHEDULE TABLE */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-widest font-black">
                    <th className="py-4 px-6 w-44 sm:w-56 whitespace-nowrap">Time</th>
                    <th className="py-4 px-6">Event Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {activeDayData.items.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className="hover:bg-slate-50/75 transition-colors"
                    >
                      {/* Column 1: Time */}
                      <td className="py-6 px-6 align-top whitespace-nowrap">
                        <span className="font-bebas text-2xl sm:text-3xl tracking-wide text-slate-900 leading-none block">
                          {item.time}
                        </span>
                      </td>

                      {/* Column 2: Event Details */}
                      <td className="py-6 px-6 align-top">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                            <MapPin size={13} className="shrink-0 text-slate-400" />
                            <span>{item.location}</span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed pt-1">
                            {item.description}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>

      {/* LOCATIONS */}
      <section className="relative w-full h-[600px] md:h-[500px] flex flex-col md:flex-row bg-slate-900 overflow-hidden border-t border-slate-200 selection:bg-transparent">
        
        {/* VENUE 1: DAY (Workshops) */}
        <div className={`relative group transition-all duration-700 md:hover:flex-[1.5] border-b md:border-b-0 md:border-r border-white/10 z-10 ${activeMap === 0 ? 'flex-[2] md:flex-1' : 'flex-1'}`}>
          <div 
            className={`absolute inset-0 z-20 md:hidden ${activeMap === 0 ? 'pointer-events-none' : 'cursor-pointer'}`}
            onClick={() => setActiveMap(0)}
          />
          <div className="absolute inset-0 z-0 bg-slate-800 md:grayscale md:group-hover:grayscale-0 transition-all duration-700">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3455.4723564554483!2d28.024766005037964!3d43.25782794375787!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40a4f925ce066ce1%3A0x2656e289c2bed1b9!2z0JLQsNGA0L3QtdC90YHQutC4INGB0LLQvtCx0L7QtNC10L0g0YPQvdC40LLQtdGA0YHQuNGC0LXRgiAi0KfQtdGA0L3QvtGA0LjQt9C10YYg0KXRgNCw0LHRitGAIg!5e0!3m2!1sen!2sbg!4v1773153290390!5m2!1sen!2sbg" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen="" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <div className={`absolute inset-0 transition-colors duration-700 pointer-events-none md:group-hover:bg-transparent ${activeMap === 0 ? 'bg-transparent md:bg-slate-900/60' : 'bg-slate-900/30 md:bg-slate-900/60'}`}></div>
          </div>
          
          <div className="relative z-10 h-full p-6 md:p-10 flex flex-col justify-end pointer-events-none">
            <span className="text-slate-400 font-black text-[11px] uppercase tracking-[0.4em] mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t('venue1Pre')}</span>
            <h3 className="font-bebas tracking-wide text-4xl md:text-5xl text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">{t('venue1Title')}</h3>
            <div className="mt-2 flex items-center gap-2 text-white/90 text-xs md:text-sm font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <MapPin size={16} className="text-white shrink-0" /> 
              <span className="truncate">{t('venue1Addr')}</span>
            </div>
          </div>

          <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-12 h-12 bg-white rounded-full z-30 flex items-center justify-center shadow-2xl hidden md:flex pointer-events-none border-4 border-slate-900 transition-transform duration-700">
          </div>
        </div>

        {/* VENUE 2: NIGHT (Parties) */}
        <div className={`relative group transition-all duration-700 md:hover:flex-[1.5] z-0 ${activeMap === 1 ? 'flex-[2] md:flex-1' : 'flex-1'}`}>
          <div 
            className={`absolute inset-0 z-20 md:hidden ${activeMap === 1 ? 'pointer-events-none' : 'cursor-pointer'}`}
            onClick={() => setActiveMap(1)}
          />
          <div className="absolute inset-0 z-0 bg-slate-800 md:grayscale md:group-hover:grayscale-0 transition-all duration-700">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2906.066094722916!2d28.026275676782408!3d43.25003657112416!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40a457000712be27%3A0xaacbf088342cb7f5!2sAsh%20beach%20bar!5e0!3m2!1sen!2sbg!4v1793466966579!5m2!1sen!2sbg" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen="" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <div className={`absolute inset-0 transition-colors duration-700 pointer-events-none md:group-hover:bg-transparent ${activeMap === 1 ? 'bg-transparent md:bg-slate-900/60' : 'bg-slate-900/30 md:bg-slate-900/60'}`}></div>
          </div>
          
          <div className="relative z-10 h-full p-6 md:p-10 flex flex-col justify-end pointer-events-none">
            <span className="text-slate-400 font-black text-[11px] uppercase tracking-[0.4em] mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t('venue2Pre')}</span>
            <h3 className="font-bebas tracking-wide text-4xl md:text-5xl text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">{t('venue2Title')}</h3>
            <div className="mt-2 flex items-center gap-2 text-white/90 text-xs md:text-sm font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <MapPin size={16} className="text-white shrink-0" /> {t('venue2Addr')}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-24 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-slate-400 font-black text-[11px] uppercase tracking-[0.4em]">{t('faqPre')}</span>
          <h2 className="font-bebas tracking-wide text-6xl text-slate-900 mt-2">{t('faqTitle')}</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className={`border rounded-2xl overflow-hidden transition-all duration-300 ${openFaq === i ? 'bg-white shadow-md border-slate-900 ring-1 ring-slate-900' : 'border-slate-200/90 bg-white hover:bg-slate-50'}`}
            >
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full px-8 py-6 flex items-center justify-between font-bold text-left text-slate-900 cursor-pointer"
              >
                {faq.q}
                <ChevronDown size={20} className={`text-slate-700 transition-transform duration-300 shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`px-8 overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-60 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}