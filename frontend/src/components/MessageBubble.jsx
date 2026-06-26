import { Check, CheckCheck, Copy, Download, FileText, MoreVertical, Pencil, Reply, SmilePlus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Avatar from "./Avatar.jsx";
import { cn } from "../utils/cn.js";
import { formatMessageTime } from "../utils/formatDate.js";
import { useChatStore } from "../store/useChatStore.js";

const StatusIcon = ({ status }) => {
  if (status === "seen") return <CheckCheck size={14} className="text-sky-500" />;
  if (status === "delivered") return <CheckCheck size={14} className="text-slate-500" />;
  return <Check size={14} className="text-slate-500" />;
};

const AttachmentPreview = ({ attachment, onOpenImage }) => {
  if (attachment.type === "image") {
    return (
      <button type="button" className="mt-2 block max-w-full overflow-hidden rounded-lg" onClick={() => onOpenImage(attachment)}>
        <img
          src={attachment.url}
          alt={attachment.name || "Image"}
          loading="lazy"
          className="max-h-72 max-w-full object-cover transition hover:opacity-90"
        />
      </button>
    );
  }

  if (attachment.type === "video") {
    return <video src={attachment.url} controls className="mt-2 max-h-72 w-full max-w-full rounded-lg" />;
  }

  if (attachment.type === "audio") {
    return <audio src={attachment.url} controls className="mt-2 w-64 max-w-full" />;
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex items-center gap-2 rounded-lg bg-black/10 p-2 text-sm underline-offset-2 hover:underline"
    >
      <FileText size={17} />
      <span className="truncate">{attachment.name || "Download file"}</span>
    </a>
  );
};

const MenuButton = ({ children, icon: Icon, onClick }) => (
  <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/10" onClick={onClick}>
    <Icon size={14} />
    {children}
  </button>
);

const MessageBubble = ({ message, mine, user, showSenderName = false, latestSeen = false }) => {
  const { editMessage, deleteMessage, reactToMessage } = useChatStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const longPressRef = useRef(null);
  const isDeletedForEveryone = message.isDeleted || message.deletedForEveryone;

  const closeMenu = () => setMenuOpen(false);

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message.text || "");
    closeMenu();
    toast.success("Copied");
  };

  const handleEdit = async () => {
    const nextText = window.prompt("Edit message", message.text || "");
    if (nextText !== null) await editMessage(message._id, nextText);
    closeMenu();
  };

  const handleDeleteForMe = async () => {
    await deleteMessage(message._id, false);
    closeMenu();
  };

  const handleDeleteForEveryone = async () => {
    await deleteMessage(message._id, true);
    closeMenu();
  };

  const handleReact = async () => {
    await reactToMessage(message._id, "👍");
    closeMenu();
  };

  const handleReply = () => {
    closeMenu();
    toast("Reply selected");
  };

  useEffect(() => {
    if (!menuOpen) return undefined;
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [menuOpen]);

  return (
    <>
      <div
      className={cn("group flex min-w-0 items-end gap-2", mine ? "justify-end" : "justify-start")}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenuOpen(true);
      }}
      onTouchStart={() => {
        longPressRef.current = setTimeout(() => setMenuOpen(true), 520);
      }}
      onTouchEnd={() => clearTimeout(longPressRef.current)}
    >
      {!mine && <Avatar user={user} size="sm" />}
      <div className={cn("relative flex max-w-[75%] min-w-0 items-start gap-1", mine && "flex-row-reverse")}>
        <div
          className={cn(
            "min-w-0 max-w-full overflow-hidden rounded-2xl px-3 py-2 shadow-md",
            mine ? "rounded-br-md bg-[#d9fdd3] text-slate-950" : "rounded-bl-md bg-slate-800 text-slate-100"
          )}
        >
          {!mine && showSenderName && typeof user === "object" && (
            <p className="mb-1 truncate text-xs font-bold text-teal-200">{user?.name}</p>
          )}
          {message.replyTo && (
            <div className="mb-2 rounded border-l-2 border-slate-400/80 bg-black/10 px-2 py-1 text-xs opacity-80">
              {message.replyTo.text || "Attachment"}
            </div>
          )}
          {isDeletedForEveryone ? (
            <p className="whitespace-pre-wrap break-words text-sm italic leading-6 text-slate-500">
              {mine ? "You deleted this message" : "This message was deleted"}
            </p>
          ) : (
            <>
              {message.text && <p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{message.text}</p>}
              {message.attachments?.map((attachment) => (
                <AttachmentPreview key={attachment.url} attachment={attachment} onOpenImage={setFullscreenImage} />
              ))}
            </>
          )}
          {!isDeletedForEveryone && message.reactions?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {message.reactions.map((reaction) => (
                <span key={`${reaction.userId}-${reaction.emoji}`} className="rounded-full bg-black/10 px-2 py-0.5 text-xs">
                  {reaction.emoji}
                </span>
              ))}
            </div>
          )}
          <div className={cn("mt-1 flex items-center justify-end gap-1 text-[11px]", mine ? "text-slate-600" : "text-slate-400")}>
            <span>{formatMessageTime(message.createdAt)}</span>
            {message.editedAt && <span>Edited</span>}
            {mine && <StatusIcon status={message.status} />}
          </div>
          {latestSeen && <p className="mt-1 text-right text-[11px] font-semibold text-sky-600">Seen</p>}
        </div>

        <button
          type="button"
          className="mt-1 hidden h-7 w-7 place-items-center rounded-full text-slate-400 opacity-0 transition hover:bg-white/10 hover:text-slate-100 group-hover:opacity-100 focus:opacity-100 sm:grid"
          title="Message options"
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((value) => !value);
          }}
        >
          <MoreVertical size={16} />
        </button>

        {menuOpen && (
          <div
            className={cn(
              "absolute top-8 z-20 w-48 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-white/10 bg-slate-950/95 py-1 text-sm text-slate-100 shadow-2xl",
              mine ? "right-0 sm:right-8" : "left-0 sm:left-8"
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <MenuButton icon={Reply} onClick={handleReply}>Reply</MenuButton>
            {!isDeletedForEveryone && message.text && <MenuButton icon={Copy} onClick={copyMessage}>Copy</MenuButton>}
            {!isDeletedForEveryone && mine && message.text && <MenuButton icon={Pencil} onClick={handleEdit}>Edit</MenuButton>}
            <MenuButton icon={Trash2} onClick={handleDeleteForMe}>Delete for me</MenuButton>
            {!isDeletedForEveryone && mine && <MenuButton icon={Trash2} onClick={handleDeleteForEveryone}>Delete for everyone</MenuButton>}
            {!isDeletedForEveryone && <MenuButton icon={SmilePlus} onClick={handleReact}>React</MenuButton>}
          </div>
        )}
      </div>
    </div>
      {fullscreenImage && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95">
          <header className="flex items-center justify-end gap-2 border-b border-white/10 p-3">
            <a
              href={fullscreenImage.url}
              download={fullscreenImage.name || "image"}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/50 px-3 text-sm font-bold text-slate-100 transition hover:bg-slate-800/70"
            >
              <Download size={17} />
              Download
            </a>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-700/80 bg-slate-900/50 text-slate-100 transition hover:bg-slate-800/70"
              title="Close image"
              onClick={() => setFullscreenImage(null)}
            >
              <X size={18} />
            </button>
          </header>
          <div className="grid min-h-0 flex-1 place-items-center p-3">
            <img src={fullscreenImage.url} alt={fullscreenImage.name || "Image"} className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      )}
    </>
  );
};

export default MessageBubble;
