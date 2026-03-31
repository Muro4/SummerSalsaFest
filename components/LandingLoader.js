"use client";

import { useState, useEffect } from "react";
import { Modak } from "next/font/google";

const modak = Modak({ 
  weight: "400", 
  subsets: ["latin"],
  display: "swap" 
});

const words = ["SUMMER", "SALSA", "FEST"];

export default function LandingLoader({ onComplete }) {
  const [wordIndex, setWordIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    let isCancelled = false;
    let timer;

    const runSequence = async () => {
      for (let i = 0; i < words.length; i++) {
        if (isCancelled) return;
        setWordIndex(i);

        const wordLength = words[i].length;
        const staggerTotalTime = (wordLength - 1) * 50; 
        const animationDuration = 200; 
        const pauseTime = 300; 

        const totalWait = staggerTotalTime + animationDuration + pauseTime;

        await new Promise((resolve) => {
          timer = setTimeout(resolve, totalWait);
        });
      }

      if (isCancelled) return;

      // Trigger the Zoom + Fade Out
      setIsRevealed(true);

      // Wait for the transition to finish before unmounting
      await new Promise((resolve) => {
        timer = setTimeout(resolve, 1000);
      });

      if (isCancelled) return;

      document.body.style.overflow = "";
      setIsHidden(true);
      if (onComplete) onComplete();
    };

    runSequence();

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [onComplete]);

  if (isHidden) return null;

  const currentWord = words[wordIndex];

  return (
    <>
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-[800ms] ease-[cubic-bezier(0.7,0,0.3,1)] ${
          isRevealed 
            ? "scale-[1.5] opacity-0 pointer-events-none" 
            : "scale-100 opacity-100"
        }`}
        style={{ backgroundColor: "#e84b8a" }} /* Salsa Pink Background */
      >
        <h1
          key={wordIndex}
          className={`${modak.className} text-white text-[7vw] leading-none uppercase text-center flex overflow-hidden py-4 tracking-wide`}
        >
          {currentWord.split("").map((char, index) => (
            <span
              key={index}
              className="animate-drop-in inline-block"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </h1>
      </div>

      <style jsx global>{`
        @keyframes drop-in {
          0% {
            opacity: 0;
            transform: translateY(-100%);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-drop-in {
          animation: drop-in 250ms cubic-bezier(0.16, 1, 0.3, 1) both;
          will-change: transform, opacity;
        }
      `}</style>
    </>
  );
}