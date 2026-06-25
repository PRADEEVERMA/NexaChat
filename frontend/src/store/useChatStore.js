import toast from "react-hot-toast";
import { create } from "zustand";
import { messageApi } from "../api/messageApi.js";
import { userApi } from "../api/userApi.js";
import { showAppNotification } from "../utils/pwa.js";

export const useChatStore = create((set, get) => ({
  users: [],
  selectedUser: null,
  messages: [],
  typingUsers: {},
  unreadByUser: {},
  isUsersLoading: false,
  isMessagesLoading: false,

  setSelectedUser: (user) => {
    if (!user) {
      set({ selectedUser: null, messages: [] });
      return;
    }

    const unreadByUser = { ...get().unreadByUser };
    delete unreadByUser[user._id];
    set({ selectedUser: user, messages: [], unreadByUser, isMessagesLoading: true });
  },

  getUsers: async (search = "") => {
    set({ isUsersLoading: true });
    try {
      const { data } = await userApi.getUsers(search);
      set({ users: data.users });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (receiverId) => {
    if (!receiverId) return;

    set({ isMessagesLoading: true });
    try {
      const { data } = await messageApi.getMessages(receiverId);
      set({ messages: data.messages });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (receiverId, text, socket) => {
    if (typeof text === "string" && !text.trim()) return;

    if (socket?.connected && typeof text === "string") {
      socket.emit("send-message", { receiverId, text }, (response) => {
        if (!response?.success) {
          toast.error(response?.message || "Message failed");
          return;
        }
        const existing = get().messages.some((item) => item._id === response.message._id);
        if (!existing) set({ messages: [...get().messages, response.message] });
      });
      return true;
    }

    try {
      const payload =
        text instanceof FormData ? text : { text };
      const { data } = await messageApi.sendMessage(receiverId, payload);
      set({ messages: [...get().messages, data.message] });
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Message failed");
      return false;
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const { data } = await messageApi.editMessage(messageId, text);
      set({
        messages: get().messages.map((message) =>
          message._id === messageId ? data.message : message
        )
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not edit message");
    }
  },

  deleteMessage: async (messageId, everyone = false) => {
    try {
      const { data } = await messageApi.deleteMessage(messageId, everyone);
      if (everyone && data.message) {
        set({
          messages: get().messages.map((message) =>
            message._id === messageId ? data.message : message
          )
        });
        return;
      }

      set({ messages: get().messages.filter((message) => message._id !== messageId) });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete message");
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const { data } = await messageApi.reactToMessage(messageId, emoji);
      set({
        messages: get().messages.map((message) =>
          message._id === messageId ? data.message : message
        )
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not add reaction");
    }
  },

  subscribeToMessages: (socket, authUserId) => {
    if (!socket) return;

    socket.off("receive-message");
    socket.off("message-delivered");
    socket.off("message-seen");
    socket.off("message-updated");
    socket.off("message-deleted");
    socket.off("typing");
    socket.off("stop-typing");
    socket.off("user-offline");

    socket.on("receive-message", (message) => {
      const { selectedUser, messages, unreadByUser } = get();
      const belongsToOpenChat =
        selectedUser?._id === message.senderId || selectedUser?._id === message.receiverId;

      if (document.visibilityState === "hidden" && message.receiverId === authUserId) {
        const sender = get().users.find((user) => user._id === message.senderId);
        showAppNotification({
          title: sender?.name || "New message",
          body: message.text || "Sent an attachment",
          tag: `message-${message._id}`
        });
      }

      if (belongsToOpenChat) {
        set({ messages: [...messages, message] });
        socket.emit("message-seen", {
          senderId: message.senderId,
          messageIds: [message._id]
        });
      } else if (message.receiverId === authUserId) {
        set({
          unreadByUser: {
            ...unreadByUser,
            [message.senderId]: (unreadByUser[message.senderId] || 0) + 1
          }
        });
      }
    });

    socket.on("message-delivered", (message) => {
      const existing = get().messages.some((item) => item._id === message._id);
      if (!existing && message.senderId === authUserId) {
        set({ messages: [...get().messages, message] });
      }
    });

    socket.on("message-seen", ({ messageIds }) => {
      set({
        messages: get().messages.map((message) =>
          messageIds.includes(message._id) ? { ...message, status: "seen" } : message
        )
      });
    });

    socket.on("message-updated", (updatedMessage) => {
      set({
        messages: get().messages.map((message) =>
          message._id === updatedMessage._id ? updatedMessage : message
        )
      });
    });

    socket.on("message-deleted", ({ messageId, everyone, message: deletedMessage }) => {
      if (everyone && deletedMessage) {
        set({
          messages: get().messages.map((message) =>
            message._id === messageId ? deletedMessage : message
          )
        });
        return;
      }

      set({ messages: get().messages.filter((message) => message._id !== messageId) });
    });

    socket.on("typing", ({ senderId }) => {
      set({ typingUsers: { ...get().typingUsers, [senderId]: true } });
    });

    socket.on("stop-typing", ({ senderId }) => {
      const nextTypingUsers = { ...get().typingUsers };
      delete nextTypingUsers[senderId];
      set({ typingUsers: nextTypingUsers });
    });

    socket.on("user-offline", ({ userId, lastSeen }) => {
      const nextUsers = get().users.map((user) =>
        user._id === userId ? { ...user, isOnline: false, lastSeen } : user
      );
      const selectedUser = get().selectedUser;
      set({
        users: nextUsers,
        selectedUser:
          selectedUser?._id === userId ? { ...selectedUser, isOnline: false, lastSeen } : selectedUser
      });
    });
  }
}));
