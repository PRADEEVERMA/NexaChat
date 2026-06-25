import { ArrowLeft, Phone, Video } from "lucide-react";
import Avatar from "./Avatar.jsx";
import Button from "./Button.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import { useCallStore } from "../store/useCallStore.js";

const ChatHeader = ({ user, onBack }) => {
  const { onlineUsers, socket } = useAuthStore();
  const { startCall } = useCallStore();
  const isOnline = onlineUsers.includes(user?._id) || user?.isOnline;

  return (
    <header className="flex items-center gap-3 border-b border-white/10 p-4">
      <Button type="button" variant="ghost" className="h-10 w-10 px-0 lg:hidden" title="Back" onClick={onBack}>
        <ArrowLeft size={18} />
      </Button>
      <Avatar user={user} online={isOnline} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-bold">{user?.name}</h2>
        <p className={isOnline ? "text-xs text-emerald-300" : "text-xs text-slate-500"}>
          {isOnline ? "Online" : "Offline"}
        </p>
      </div>
      <div className="flex items-center gap-2">
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
      </div>
    </header>
  );
};

export default ChatHeader;
