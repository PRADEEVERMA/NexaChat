import { cn } from "../utils/cn.js";

const Input = ({ label, icon: Icon, className, ...props }) => {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>}
      <span className="relative block">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />}
        <input
          className={cn(
            "h-12 w-full rounded-lg border border-slate-700/70 bg-slate-950/45 px-4 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-300/70 focus:ring-4 focus:ring-teal-300/10",
            Icon && "pl-10",
            className
          )}
          {...props}
        />
      </span>
    </label>
  );
};

export default Input;
