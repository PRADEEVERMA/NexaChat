import { Loader2 } from "lucide-react";
import { cn } from "../utils/cn.js";

const Button = ({ children, className, loading = false, variant = "primary", ...props }) => {
  const variants = {
    primary: "bg-gradient-to-r from-teal-300 to-pink-300 text-slate-950 hover:opacity-95",
    ghost: "border border-slate-700/80 bg-slate-900/50 text-slate-100 hover:bg-slate-800/70",
    danger: "bg-rose-500 text-white hover:bg-rose-400"
  };

  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  );
};

export default Button;
