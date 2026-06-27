import toast from "react-hot-toast";
import { create } from "zustand";
import { messageApi } from "../api/messageApi.js";
import { userApi } from "../api/userApi.js";
import { showAppNotification } from "../utils/pwa.js";

const socketSubscriptions = new WeakMap();

const getId = (value) => {
  if (!value) return null;
  return typeof value === "object" ? value._id?.toString() : value.toString();
};

const createTempId = () =>
  `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const matchesMessage = (message, incoming) =>
  getId(message._id) === getId(incoming._id) ||
  Boolean(
    incoming.clientTempId &&
      (message.clientTempId === incoming.clientTempId ||
        getId(message._id) === incoming.clientTempId)
  );

const upsertMessage = (messages, incoming) => {
  const index = messages.findIndex((message) =>
    matchesMessage(message, incoming)
  );

  if (index === -1) return [...messages, incoming];

  return messages.map((message, messageIndex) =>
    messageIndex === index
      ? { ...message, ...incoming, clientTempId: undefined }
      : message
  );
};

const updateMessagesById = (messages, messageIds, changes) => {
  const ids = new Set(messageIds.map(getId).filter(Boolean));
  if (!ids.size) return messages;

  return messages.map((message) =>
    ids.has(getId(message._id)) ? { ...message, ...changes } : message
  );
};

const removeUnread = (unreadByUser, userId) => {
  const nextUnread = { ...unreadByUser };
  delete nextUnread[userId];
  return nextUnread;
};

export const useChatStore = create((set, get) => ({
  users: [],
  selectedUser: null,
  messages: [],
  typingUsers: {},
  unreadByUser: {},
  authUserId: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  setSelectedUser: (user) => {
    if (!user) {
      set({
        selectedUser: null,
        messages: [],
        isMessagesLoading: false
      });
      return;
    }

    const userId = getId(user);
    set({
      selectedUser: user,
      messages: [],
      unreadByUser: removeUnread(get().unreadByUser, userId),
      isMessagesLoading: true
    });
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

  getMessages: async (userId) => {
    if (!userId) return;

    const requestedUserId = getId(userId);
    set({ isMessagesLoading: true });

    try {
      const { data } = await messageApi.getMessages(requestedUserId);
      if (getId(get().selectedUser) === requestedUserId) {
        set({
          messages: data.messages,
          unreadByUser: removeUnread(get().unreadByUser, requestedUserId)
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load messages");
    } finally {
      if (getId(get().selectedUser) === requestedUserId) {
        set({ isMessagesLoading: false });
      }
    }
  },

  sendMessage: async (receiverId, content, socket) => {
    const isTextMessage = typeof content === "string";
    const text = isTextMessage ? content.trim() : content;
    if (isTextMessage && !text) return false;

    if (isTextMessage && socket?.connected) {
      const clientTempId = createTempId();
      const now = new Date().toISOString();
      const optimisticMessage = {
        _id: clientTempId,
        clientTempId,
        senderId: get().authUserId,
        receiverId,
        text,
        attachments: [],
        reactions: [],
        status: "sent",
        createdAt: now,
        updatedAt: now
      };

      set((state) => ({
        messages: upsertMessage(state.messages, optimisticMessage)
      }));

      socket.emit(
        "message:new",
        { receiverId, text, clientTempId },
        (response) => {
          if (!response?.success || !response.message) {
            set((state) => ({
              messages: state.messages.filter(
                (message) =>
                  getId(message._id) !== clientTempId &&
                  message.clientTempId !== clientTempId
              )
            }));
            toast.error(response?.message || "Message failed");
            return;
          }

          set((state) => ({
            messages: upsertMessage(state.messages, {
              ...response.message,
              clientTempId
            })
          }));
        }
      );

      return true;
    }

    try {
      const payload = content instanceof FormData ? content : { text };
      const { data } = await messageApi.sendMessage(receiverId, payload);
      set((state) => ({
        messages: upsertMessage(state.messages, data.message)
      }));
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Message failed");
      return false;
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const { data } = await messageApi.editMessage(messageId, text);
      set((state) => ({
        messages: upsertMessage(state.messages, data.message)
      }));
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not edit message");
      return false;
    }
  },

  deleteMessage: async (messageId, everyone = false) => {
    try {
      const { data } = await messageApi.deleteMessage(messageId, everyone);
      set((state) => ({
        messages:
          everyone && data.message
            ? upsertMessage(state.messages, data.message)
            : state.messages.filter(
                (message) => getId(message._id) !== getId(messageId)
              )
      }));
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete message");
      return false;
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const { data } = await messageApi.reactToMessage(messageId, emoji);
      set((state) => ({
        messages: upsertMessage(state.messages, data.message)
      }));
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not add reaction");
      return false;
    }
  },

  subscribeToMessages: (socket, authUserId) => {
    if (!socket || !authUserId) return () => {};

    socketSubscriptions.get(socket)?.();

    const currentUserId = getId(authUserId);
    const processedIncomingIds = new Set();
    set({ authUserId: currentUserId });

    const handleNewMessage = (message) => {
      const messageId = getId(message?._id);
      const senderId = getId(message?.senderId);
      const receiverId = getId(message?.receiverId);
      if (!messageId || !senderId || !receiverId) return;

      const state = get();
      const selectedUserId = getId(state.selectedUser);
      const isOwnMessage = senderId === currentUserId;
      const isIncomingMessage =
        receiverId === currentUserId && senderId !== currentUserId;
      const isOpenConversation =
        (isIncomingMessage && selectedUserId === senderId) ||
        (isOwnMessage && selectedUserId === receiverId);

      if (isOpenConversation) {
        set((currentState) => ({
          messages: upsertMessage(currentState.messages, message)
        }));
      }

      if (!isIncomingMessage) return;

      socket.emit("message:delivered", {
        messageId,
        senderId
      });

      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        const sender = state.users.find(
          (user) => getId(user) === senderId
        );
        showAppNotification({
          title: sender?.name || "New message",
          body: message.text || "Sent an attachment",
          tag: `message-${messageId}`
        });
      }

      if (isOpenConversation) {
        socket.emit("message:seen", {
          senderId,
          messageIds: [messageId]
        });
        set((currentState) => ({
          unreadByUser: removeUnread(
            currentState.unreadByUser,
            senderId
          )
        }));
        return;
      }

      if (!processedIncomingIds.has(messageId)) {
        processedIncomingIds.add(messageId);
        set((currentState) => ({
          unreadByUser: {
            ...currentState.unreadByUser,
            [senderId]: (currentState.unreadByUser[senderId] || 0) + 1
          }
        }));
      }
    };

    const handleDelivered = (payload = {}) => {
      const messageIds =
        payload.messageIds || (payload._id ? [payload._id] : []);
      set((state) => ({
        messages: updateMessagesById(state.messages, messageIds, {
          status: "delivered",
          deliveredAt: payload.deliveredAt || new Date().toISOString()
        })
      }));
    };

    const handleSeen = (payload = {}) => {
      const messageIds = payload.messageIds || [];
      const seenAt = payload.seenAt || new Date().toISOString();
      set((state) => ({
        messages: updateMessagesById(state.messages, messageIds, {
          status: "seen",
          deliveredAt: seenAt,
          seenAt
        })
      }));
    };

    const handleMessageUpdate = (message) => {
      if (!message?._id) return;
      set((state) => ({
        messages: upsertMessage(state.messages, message)
      }));
    };

    const handleDeleted = (payload = {}) => {
      const { messageId, everyone, message } = payload;
      if (!messageId) return;

      set((state) => ({
        messages:
          everyone && message
            ? upsertMessage(state.messages, message)
            : state.messages.filter(
                (item) => getId(item._id) !== getId(messageId)
              )
      }));
    };

    const handleTyping = ({ senderId } = {}) => {
      const id = getId(senderId);
      if (!id) return;
      set((state) => ({
        typingUsers: { ...state.typingUsers, [id]: true }
      }));
    };

    const handleStopTyping = ({ senderId } = {}) => {
      const id = getId(senderId);
      if (!id) return;

      set((state) => {
        const typingUsers = { ...state.typingUsers };
        delete typingUsers[id];
        return { typingUsers };
      });
    };

    const handleUserOffline = ({ userId, lastSeen } = {}) => {
      const offlineUserId = getId(userId);
      if (!offlineUserId) return;

      set((state) => ({
        users: state.users.map((user) =>
          getId(user) === offlineUserId
            ? { ...user, isOnline: false, lastSeen }
            : user
        ),
        selectedUser:
          getId(state.selectedUser) === offlineUserId
            ? { ...state.selectedUser, isOnline: false, lastSeen }
            : state.selectedUser
      }));
    };

    const listeners = [
      ["message:new", handleNewMessage],
      ["receive-message", handleNewMessage],
      ["message:delivered", handleDelivered],
      ["message-delivered", handleDelivered],
      ["message:seen", handleSeen],
      ["message-seen", handleSeen],
      ["message:edited", handleMessageUpdate],
      ["message:deleted", handleDeleted],
      ["message:reaction", handleMessageUpdate],
      ["message-updated", handleMessageUpdate],
      ["message-deleted", handleDeleted],
      ["typing", handleTyping],
      ["stop-typing", handleStopTyping],
      ["user-offline", handleUserOffline]
    ];

    listeners.forEach(([event, handler]) => socket.on(event, handler));

    const unsubscribe = () => {
      listeners.forEach(([event, handler]) => socket.off(event, handler));
      if (socketSubscriptions.get(socket) === unsubscribe) {
        socketSubscriptions.delete(socket);
      }
    };

    socketSubscriptions.set(socket, unsubscribe);
    return unsubscribe;
  },

  markConversationSeen: (socket, senderId) => {
    if (!socket || !senderId) return;

    const currentUserId = get().authUserId;
    const senderUserId = getId(senderId);
    const messageIds = get()
      .messages.filter(
        (message) =>
          getId(message.senderId) === senderUserId &&
          getId(message.receiverId) === currentUserId &&
          message.status !== "seen" &&
          !getId(message._id)?.startsWith("temp-")
      )
      .map((message) => getId(message._id));

    set((state) => ({
      unreadByUser: removeUnread(state.unreadByUser, senderUserId)
    }));

    if (messageIds.length) {
      socket.emit("message:seen", {
        senderId: senderUserId,
        messageIds
      });
    }
  }
}));
