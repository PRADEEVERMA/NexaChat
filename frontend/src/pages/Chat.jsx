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

const Chat = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [profileOpen, setProfileOpen] = useState(false);
  const bottomRef = useRef(null);
  const { authUser, socket } = useAuthStore();
  const { subscribeToCalls } = useCallStore();
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

  useEffect(() => {
    getUsers(debouncedSearch);
  }, [debouncedSearch, getUsers]);

  useEffect(() => {
    if (selectedUser?._id) getMessages(selectedUser._id);
  }, [selectedUser?._id, getMessages]);

  useEffect(() => {
    subscribeToMessages(socket, authUser?._id);
  }, [socket, authUser?._id, subscribeToMessages]);

  useEffect(() => {
    subscribeToCalls(socket);
  }, [socket, subscribeToCalls]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers, selectedUser]);

  useEffect(() => {
    if (!socket || !selectedUser || messages.length === 0) return;

    const unseen = messages
      .filter((message) => message.senderId === selectedUser._id && message.status !== "seen")
      .map((message) => message._id);

    if (unseen.length) {
      socket.emit("message-seen", { senderId: selectedUser._id, messageIds: unseen });
    }
  }, [messages, selectedUser, socket]);

  return (
    <main className="h-screen h-dvh overflow-hidden p-2 sm:p-4">
      <div className="mx-auto grid h-full max-w-7xl gap-3 lg:grid-cols-[350px_1fr]">
        <div className={selectedUser ? "hidden lg:block" : "block"}>
          <Sidebar search={search} setSearch={setSearch} onOpenProfile={() => setProfileOpen(true)} />
        </div>

        {!selectedUser && <EmptyChat />}

        {selectedUser && (
          <section className="glass flex min-h-0 flex-col rounded-lg">
              <ChatHeader user={selectedUser} onBack={() => setSelectedUser(null)} />
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
                {isMessagesLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 7 }).map((_, index) => (
                      <Skeleton key={index} className={`h-16 ${index % 2 ? "ml-auto w-2/3" : "w-2/3"}`} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence initial={false}>
                      {messages.map((message, index) => (
                        <motion.div
                          key={message._id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <MessageBubble
                            message={message}
                            mine={message.senderId === authUser?._id}
                            user={selectedUser}
                            latestSeen={
                              message.senderId === authUser?._id &&
                              message.status === "seen" &&
                              index === messages.length - 1
                            }
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {typingUsers[selectedUser._id] && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-teal-300" />
                        {selectedUser.name} is typing
                      </div>
                    )}

                    {messages.length === 0 && (
                      <div className="grid min-h-[55vh] place-items-center text-center">
                        <div>
                          <h2 className="text-xl font-bold">Start the conversation</h2>
                          <p className="mt-2 text-sm text-slate-500">Send a message to {selectedUser.name}.</p>
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>
              <MessageInput receiverId={selectedUser._id} />
            </section>
        )}
      </div>
      <ProfileSettingsModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <CallModal />
    </main>
  );
};

export default Chat;
