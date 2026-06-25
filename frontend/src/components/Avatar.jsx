import { cn } from "../utils/cn.js";

const Avatar = ({ user, size = "md", online = false }) => {
  const sizes = {
    sm: "h-9 w-9 text-sm",
    md: "h-11 w-11 text-base",
    lg: "h-20 w-20 text-2xl"
  };

  const initials = user?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative shrink-0">
      <div className={cn("grid place-items-center overflow-hidden rounded-full bg-gradient-to-br from-teal-300 to-pink-300 font-bold text-slate-950", sizes[size])}>
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
        ) : (
          initials || "U"
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
      )}
    </div>
  );
};

export default Avatar;
