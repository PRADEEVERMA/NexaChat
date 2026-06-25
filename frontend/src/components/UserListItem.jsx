import Avatar from "./Avatar.jsx";
import { cn } from "../utils/cn.js";

const UserListItem = ({ user, active, online, unread = 0, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg p-3 text-left transition",
        active ? "bg-teal-300/15 ring-1 ring-teal-300/25" : "hover:bg-white/5"
      )}
    >
      <Avatar user={user} online={online} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-100">{user.name}</span>
        <span className={cn("block truncate text-xs", online ? "text-emerald-300" : "text-slate-500")}>
          {online ? "Online" : "Offline"}
        </span>
      </span>
      {unread > 0 && (
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-pink-300 px-2 text-xs font-bold text-slate-950">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
};

export default UserListItem;
