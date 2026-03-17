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
  // --- BASE STYLES ---
  // Applies the standard font, tracking, and our custom 'btn-interact' click animation
  const baseStyles = "inline-flex items-center justify-center gap-2 font-black uppercase tracking-widest outline-none disabled:opacity-50 disabled:cursor-not-allowed btn-interact font-montserrat whitespace-nowrap";

  // --- SIZES ---
  const sizes = {
    sm: "py-2 px-4 text-[10px] rounded-xl",
    md: "py-3 px-6 text-xs rounded-2xl",
    lg: "py-4 px-8 text-sm rounded-2xl",
    icon: "p-2 rounded-xl", // For buttons that are ONLY an icon
  };

  // --- VARIANTS (The Visual Hierarchy) ---
  const variants = {
    // Tier 1: The main action (Buy Pass, Save Changes)
    primary: "bg-salsa-pink text-white shadow-md hover:bg-[#d03a78] hover:shadow-lg",
    
    // Tier 2: Secondary actions (Cancel, Go Back)
    secondary: "bg-slate-800 text-white shadow-md hover:bg-slate-700 hover:shadow-lg",
    
    // Tier 3: Subtle actions (Ghost buttons, filters)
    ghost: "bg-transparent text-slate-500 hover:text-slate-800",
    
    // Tier 4: Outlined buttons for high contrast without heavy background
    outline: "bg-transparent border-2 border-slate-200 text-slate-800 hover:border-slate-800",
    
    // Danger: Delete, Remove, Sign Out
    danger: "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white",
    
    // Action Icons: The new soft black icons that colorize on hover
    actionIcon: "bg-transparent text-slate-800 hover:bg-slate-50 hover:text-salsa-pink",
  };

  const combinedClasses = `${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`;

  const InnerContent = () => (
    <>
      {isLoading && <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />}
      {!isLoading && Icon && iconPosition === "left" && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
      {!isLoading && Icon && iconPosition === "right" && <Icon size={size === 'sm' ? 14 : 16} />}
    </>
  );

  // If an href is provided, render a Next.js Link
  if (href) {
    return (
      <Link href={href} className={combinedClasses} title={title}>
        <InnerContent />
      </Link>
    );
  }

  // Otherwise, render a standard HTML button
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