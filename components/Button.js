import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function Button({
  children,
  onClick,
  href,
  type = "button",
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  isLoading = false,
  disabled = false,
  className = "",
  title,
}) {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-montserrat uppercase outline-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-all duration-300 font-black";

  // --- SIZES ---
  const sizes = {
    sm: "py-2 px-4 text-[11px] rounded-xl tracking-widest",
    md: "py-3 px-6 text-xs rounded-2xl tracking-widest",
    lg: "py-4 px-8 text-sm rounded-2xl tracking-widest",
    icon: "p-2 rounded-xl",
    sliderTab: "w-full py-3 text-[12px] rounded-xl tracking-[0.1em]",
    subSliderTab: "w-full py-2 text-[11px] rounded-[10px] tracking-[0.1em]",
  };

  // --- VARIANTS ---
  const variants = {
    primary: "bg-salsa-pink text-white shadow-md hover:bg-[#d03a78] hover:shadow-lg",
    secondary: "bg-slate-800 text-white shadow-md hover:bg-slate-700 hover:shadow-lg",
    ghost: "bg-transparent text-slate-500 hover:text-slate-800",
    outline: "bg-transparent border-2 border-slate-200 text-slate-800 hover:border-slate-800",
    danger: "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white",
    actionIcon: "bg-transparent text-slate-800 hover:bg-slate-50 hover:text-salsa-pink",
  };

  const combinedClasses = `${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`;

  const InnerContent = () => (
    <>
      {isLoading && <Loader2 size={size === 'subSliderTab' ? 14 : 16} className="animate-spin" />}
      {!isLoading && Icon && iconPosition === "left" && <Icon size={size === 'subSliderTab' ? 14 : 16} />}
      
      {/* THE FIX: Removed the <span> wrapper around children so flexbox works perfectly again */}
      {children}
      
      {!isLoading && Icon && iconPosition === "right" && <Icon size={size === 'subSliderTab' ? 14 : 16} />}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={combinedClasses} title={title}>
        <InnerContent />
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={combinedClasses}
      title={title}
    >
      <InnerContent />
    </button>
  );
}