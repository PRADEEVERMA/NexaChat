import { Mail, Sparkles } from "lucide-react";
import Avatar from "./Avatar.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import { formatLastSeen } from "../utils/formatDate.js";

const ProfilePanel = ({ user }) => {
  const { onlineUsers } = useAuthStore();
  const isOnline = onlineUsers.includes(user?._id) || user?.isOnline;

  return (
    <aside className="glass hidden h-full min-h-0 flex-col rounded-lg p-5 xl:flex">
      <div className="flex flex-col items-center border-b border-white/10 pb-6 text-center">
        <Avatar user={user} online={isOnline} size="lg" />
        <h2 className="mt-4 max-w-full truncate text-xl font-extrabold">{user?.name}</h2>
        <p className={isOnline ? "mt-1 text-sm text-emerald-300" : "mt-1 text-sm text-slate-500"}>
          {isOnline ? "Online" : formatLastSeen(user?.lastSeen)}
        </p>
      </div>

      <div className="space-y-4 py-5">
        <div className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Mail size={16} />
            Email
          </div>
          <p className="break-words text-sm text-slate-400">{user?.email}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Sparkles size={16} />
            Details
          </div>
          <p className="text-sm text-slate-400">
            {user?.isBot ? "NexaChat helper" : "NexaChat friend"}
          </p>
        </div>
      </div>
    </aside>
  );
};

export default ProfilePanel;
