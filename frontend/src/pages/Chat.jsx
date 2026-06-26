import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import CallModal from "../components/CallModal.jsx";
import ChatHeader from "../components/ChatHeader.jsx";
import EmptyChat from "../components/EmptyChat.jsx";
import MessageBubble from "../components/MessageBubble.jsx";
import MessageInput from "../components/MessageInput.jsx";
import ProfileSettingsModal from "../components/ProfileSettingsModal.jsx";
import Sidebar from "../components/Sidebar.jsx";
import Skeleton from "../components/Skeleton.jsx";
import { useDebounce } from "../hooks/useDebounce.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useCallStore } from "../store/useCallStore.js";
import { useChatStore } from "../store/useChatStore.js";
import { useSocialStore } from "../store/useSocialStore.js";

const getSenderId = (message) =>
  typeof message.senderId === "object" ? message.senderId?._id : message.senderId;

const Chat = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [profileOpen, setProfileOpen] = useState(false);
  const bottomRef = useRef(null);
  const touchStartRef = useRef(null);
  const { authUser, socket } = useAuthStore();
  const { subscribeToCalls } = useCallStore();
  const {
    groupMessages,
    getGroupMessages,
    appendGroupMessage,
    isGroupMessagesLoading
  } = useSocialStore();
  const {
    selectedUser,
    messages,
    getUsers,
    getMessages,
    setSelectedUser,
    subscribeToMessages,
    isMessagesLoading,
    typingUsers
  } = useChatStore();

  const selectedConversation = selectedUser;
  const isGroupChat = selectedConversation?.isGroup;
  const visibleMessages = isGroupChat ? groupMessages : messages;
  const loadingMessages = isGroupChat ? isGroupMessagesLoading : isMessagesLoading;

  const handleTouchStart = (event) => {
    touchStartRef.current = event.touches[0]?.clientX || 0;
  };

  const handleTouchEnd = (event) => {
    const startX = touchStartRef.current;
    const endX = event.changedTouches[0]?.clientX || 0;
    touchStartRef.current = null;

    if (startX < 36 && endX - startX > 90) {
      setSelectedUser(null);
    }
  };

  useEffect(() => {
    getUsers(debouncedSearch);
  }, [debouncedSearch, getUsers]);

  useEffect(() => {
    if (!selectedConversation?._id) return;
    if (isGroupChat) {
      getGroupMessages(selectedConversation._id);
      return;
    }
    getMessages(selectedConversation._id);
  }, [getGroupMessages, getMessages, isGroupChat, selectedConversation?._id]);

  useEffect(() => {
    if (!socket || !isGroupChat || !selectedConversation?._id) return undefined;

    socket.emit("join-group", { groupId: selectedConversation._id });
    const handleGroupMessage = (message) => {
      if (message.groupId === selectedConversation._id) appendGroupMessage(message);
    };

    socket.on("receive-group-message", handleGroupMessage);
    return () => {
      socket.emit("leave-group", { groupId: selectedConversation._id });
      socket.off("receive-group-message", handleGroupMessage);
    };
  }, [appendGroupMessage, isGroupChat, selectedConversation?._id, socket]);

  useEffect(() => {
    subscribeToMessages(socket, authUser?._id);
  }, [socket, authUser?._id, subscribeToMessages]);

  useEffect(() => {
    subscribeToCalls(socket);
  }, [socket, subscribeToCalls]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages, typingUsers, selectedConversation]);

  useEffect(() => {
    if (!socket || !selectedConversation || isGroupChat || messages.length === 0) return;

    const unseen = messages
      .filter((message) => message.senderId === selectedConversation._id && message.status !== "seen")
      .map((message) => message._id);

    if (unseen.length) {
      socket.emit("message-seen", { senderId: selectedConversation._id, messageIds: unseen });
    }
  }, [isGroupChat, messages, selectedConversation, socket]);

  return (
    <main className="h-screen h-dvh overflow-hidden md:p-3 lg:p-4">
      <div className="mx-auto grid h-full w-full max-w-full overflow-hidden lg:max-w-7xl lg:grid-cols-[350px_minmax(0,1fr)] lg:gap-3">
        <div className={selectedConversation ? "hidden lg:block" : "block min-h-0"}>
          <Sidebar search={search} setSearch={setSearch} onOpenProfile={() => setProfileOpen(true)} />
        </div>

        {!selectedConversation && <EmptyChat />}

        {selectedConversation && (
          <section
            className="flex h-full min-h-0 w-full max-w-full touch-pan-y flex-col overflow-hidden bg-slate-950/70 md:glass md:rounded-lg"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
              <ChatHeader user={selectedConversation} isGroup={isGroupChat} onBack={() => setSelectedUser(null)} />
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-4 md:px-6">
                {loadingMessages ? (
                  <div className="space-y-4">
                    {Array.from({ length: 7 }).map((_, index) => (
                      <Skeleton key={index} className={`h-16 ${index % 2 ? "ml-auto w-2/3" : "w-2/3"}`} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence initial={false}>
                      {visibleMessages.map((message, index) => (
                        <motion.div
                          key={message._id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <MessageBubble
                            message={message}
                            mine={getSenderId(message) === authUser?._id}
                            user={isGroupChat ? message.senderId : selectedConversation}
                            showSenderName={isGroupChat}
                            latestSeen={
                              getSenderId(message) === authUser?._id &&
                              message.status === "seen" &&
                              index === visibleMessages.length - 1
                            }
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {!isGroupChat && typingUsers[selectedConversation._id] && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-teal-300" />
                        {selectedConversation.name} is typing
                      </div>
                    )}

                    {visibleMessages.length === 0 && (
                      <div className="grid min-h-[55vh] place-items-center text-center">
                        <div>
                          <h2 className="text-xl font-bold">Start the conversation</h2>
                          <p className="mt-2 text-sm text-slate-500">Send a message to {selectedConversation.name}.</p>
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>
              <MessageInput receiverId={selectedConversation._id} isGroup={isGroupChat} />
            </section>
        )}
      </div>
      <ProfileSettingsModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <CallModal />
    </main>
  );
};

export default Chat;
