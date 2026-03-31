// app/[locale]/loading.js
import { Loader2 } from "lucide-react";

export default function Loading() {
  // You can add any UI inside here, including a logo, 
  // skeletons, or a simple spinner.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-salsa-white">
      <Loader2 className="animate-spin text-salsa-pink mb-4" size={60} />
    </div>
  );
}