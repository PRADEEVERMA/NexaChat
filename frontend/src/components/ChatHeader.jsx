import { ArrowLeft, Phone, Video } from "lucide-react";
import Avatar from "./Avatar.jsx";
import Button from "./Button.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import { useCallStore } from "../store/useCallStore.js";

const ChatHeader = ({ user, isGroup = false, onBack }) => {
  const { onlineUsers, socket } = useAuthStore();
  const { startCall } = useCallStore();
  const isOnline = onlineUsers.includes(user?._id) || user?.isOnline;

  return (
    <header className="sticky top-0 z-20 flex shrink-0 items-center gap-2 border-b border-white/10 bg-slate-950/95 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-3 sm:p-3 md:static md:bg-slate-950/80 md:p-4">
      <Button type="button" variant="ghost" className="h-10 w-10 shrink-0 px-0 lg:hidden" title="Back" onClick={onBack}>
        <ArrowLeft size={18} />
      </Button>
      <Avatar user={user} online={isOnline} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-bold">{user?.name}</h2>
        <p className={isOnline ? "text-xs text-emerald-300" : "text-xs text-slate-500"}>
          {isGroup ? `${user?.members?.length || 0} members` : isOnline ? "Online" : "Offline"}
        </p>
      </div>
      {!isGroup && <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-10 w-10 px-0"
          title="Audio call"
          onClick={() => startCall({ socket, user, type: "audio" })}
        >
          <Phone size={17} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 w-10 px-0"
          title="Video call"
          onClick={() => startCall({ socket, user, type: "video" })}
        >
          <Video size={17} />
        </Button>
      </div>}
    </header>
  );
};

export default ChatHeader;
