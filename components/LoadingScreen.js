"use client";
import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react"; // Swapped for something more energetic than a standard spinner

export default function LoadingScreen({ isLoaded, text = "Loading workspace" }) {
   const [progress, setProgress] = useState(0);
   const [isVisible, setIsVisible] = useState(true);

   useEffect(() => {
      if (isLoaded) {
         // When data is ready, snap to 100% immediately
         setProgress(100);
         // Wait a tiny moment for the 100% animation to finish, then fade out
         const timeout = setTimeout(() => setIsVisible(false), 400);
         return () => clearTimeout(timeout);
      }

      // Simulated progress behavior
      const interval = setInterval(() => {
         setProgress((prev) => {
            // Fast up to 80%, then creep slowly so it never actually hits 100% on its own
            const increment = prev < 80 ? Math.random() * 15 : Math.random() * 2;
            return Math.min(prev + increment, 95); 
         });
      }, 300);

      return () => clearInterval(interval);
   }, [isLoaded]);

   if (!isVisible) return null;

   return (
      <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-md font-montserrat transition-opacity duration-500 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}>
         
         <div className="w-72 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
            
            {/* Pulsing Icon Wrapper */}
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-salsa-pink/10">
               <div className="absolute inset-0 rounded-full bg-salsa-pink/20 animate-ping opacity-75"></div>
               <Sparkles className="w-8 h-8 text-salsa-pink relative z-10" strokeWidth={2.5} />
            </div>

            <div className="w-full space-y-3">
               {/* Text & Percentage */}
               <div className="flex justify-between w-full text-xs font-bold uppercase tracking-widest text-slate-500">
                  <span className="animate-pulse">{text}...</span>
                  <span className="text-salsa-pink font-black">{Math.round(progress)}%</span>
               </div>

               {/* Progress Bar Track */}
               <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  {/* Progress Bar Fill */}
                  <div 
                     className="h-full bg-salsa-pink rounded-full transition-all duration-300 ease-out"
                     style={{ width: `${progress}%` }}
                  />
               </div>
            </div>

         </div>
      </div>
   );
}