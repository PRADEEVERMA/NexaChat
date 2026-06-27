import { Server } from "socket.io";
import { env } from "../config/env.js";
import { Call } from "../models/Call.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";

export let io;

const userSocketMap = new Map();
const callTimeouts = new Map();

export const getReceiverSocketIds = (userId) =>
  Array.from(userSocketMap.get(userId.toString()) || []);

export const getReceiverSocketId = (userId) => getReceiverSocketIds(userId)[0];

export const emitToUser = (userId, event, payload) => {
  getReceiverSocketIds(userId).forEach((socketId) => io.to(socketId).emit(event, payload));
};

const emitOnlineUsers = () => {
  io.emit("online-users", Array.from(userSocketMap.keys()));
};

const emitMessageUpdate = (userId, event, payload) => {
  emitToUser(userId, event, payload);
};

const markIncomingAsDelivered = async (receiverId) => {
  const deliveredAt = new Date();
  const messages = await Message.find({
    receiverId,
    status: "sent"
  });

  if (!messages.length) return;

  const messageIds = messages.map((message) => message._id);
  await Message.updateMany(
    { _id: { $in: messageIds }, status: "sent" },
    { status: "delivered", deliveredAt }
  );

  messages.forEach((message) => {
    const payload = {
      messageIds: [message._id.toString()],
      receiverId: receiverId.toString(),
      deliveredAt
    };
    emitMessageUpdate(message.senderId, "message:delivered", payload);
    emitMessageUpdate(message.senderId, "message-delivered", payload);
    emitMessageUpdate(receiverId, "message:delivered", payload);
  });
};

const clearCallTimer = (callId) => {
  const timer = callTimeouts.get(callId?.toString());
  if (timer) clearTimeout(timer);
  callTimeouts.delete(callId?.toString());
};

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: env.clientUrl,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split(";")
          .find((cookie) => cookie.trim().startsWith("jwt="))
          ?.split("=")[1];

      if (!token) return next(new Error("Authentication required"));

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Socket authentication failed"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    const userSockets = userSocketMap.get(userId) || new Set();
    userSockets.add(socket.id);
    userSocketMap.set(userId, userSockets);

    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    socket.broadcast.emit("user-online", userId);
    emitOnlineUsers();
    await markIncomingAsDelivered(userId);

    socket.on("typing", ({ receiverId }) => {
      emitToUser(receiverId, "typing", { senderId: userId });
    });

    socket.on("stop-typing", ({ receiverId }) => {
      emitToUser(receiverId, "stop-typing", { senderId: userId });
    });

    const handleNewMessage = async ({ receiverId, text, clientTempId }, ack) => {
      try {
        if (!text?.trim()) return;

        const message = await Message.create({
          senderId: userId,
          receiverId,
          text: text.trim(),
          status: "sent"
        });

        const payload = { ...message.toObject(), clientTempId };
        socket.emit("message:new", payload);
        emitToUser(receiverId, "message:new", message);

        if (typeof ack === "function") ack({ success: true, message, clientTempId });
      } catch (error) {
        if (typeof ack === "function") ack({ success: false, message: error.message });
      }
    };

    socket.on("message:new", handleNewMessage);

    socket.on("send-message", async (payload, ack) => {
      await handleNewMessage(payload, ack);
    });

    const handleDelivered = async ({ messageId, messageIds = [], senderId }) => {
      const ids = messageId ? [messageId] : messageIds;
      if (!ids.length) return;

      const deliveredAt = new Date();
      const messages = await Message.find({
        _id: { $in: ids },
        receiverId: userId,
        status: "sent"
      });

      if (!messages.length) return;

      await Message.updateMany(
        { _id: { $in: messages.map((message) => message._id) }, receiverId: userId, status: "sent" },
        { status: "delivered", deliveredAt }
      );

      const payload = {
        messageIds: messages.map((message) => message._id.toString()),
        receiverId: userId,
        deliveredAt
      };
      const targetSenderId = senderId || messages[0].senderId;
      emitToUser(targetSenderId, "message:delivered", payload);
      emitToUser(targetSenderId, "message-delivered", payload);
      socket.emit("message:delivered", payload);
    };

    socket.on("message:delivered", handleDelivered);

    const handleSeen = async ({ senderId, messageIds = [] }) => {
      if (!senderId) return;

      const seenAt = new Date();
      const query = {
        senderId,
        receiverId: userId,
        status: { $ne: "seen" }
      };
      if (messageIds.length) query._id = { $in: messageIds };

      const messages = await Message.find(query);
      if (!messages.length) return;

      const ids = messages.map((message) => message._id);
      await Message.updateMany(
        { _id: { $in: ids }, receiverId: userId },
        { status: "seen", seenAt, deliveredAt: seenAt }
      );

      const payload = {
        messageIds: ids.map((id) => id.toString()),
        seenBy: userId,
        seenAt
      };
      emitToUser(senderId, "message:seen", payload);
      emitToUser(senderId, "message-seen", payload);
      socket.emit("message:seen", payload);
    };

    socket.on("message:seen", handleSeen);

    socket.on("message-seen", async (payload) => {
      await handleSeen(payload);
    });

    socket.on("join-group", ({ groupId }) => {
      if (groupId) socket.join(`group:${groupId}`);
    });

    socket.on("leave-group", ({ groupId }) => {
      if (groupId) socket.leave(`group:${groupId}`);
    });

    socket.on("call-user", async ({ receiverId, offer, callType }, ack) => {
      try {
        if (
          !receiverId ||
          receiverId === userId ||
          !["audio", "video"].includes(callType) ||
          offer?.type !== "offer" ||
          !offer?.sdp
        ) {
          if (typeof ack === "function") ack({ success: false, message: "Invalid call offer" });
          return;
        }

        console.log("[WebRTC] Offer received", { callerId: userId, receiverId, callType });
        const call = await Call.create({
          callerId: userId,
          receiverId,
          type: callType,
          status: "ringing"
        });

        const callId = call._id.toString();
        const timeout = setTimeout(async () => {
          const activeCall = await Call.findById(callId);
          if (!activeCall || !["calling", "ringing"].includes(activeCall.status)) return;

          activeCall.status = "missed";
          activeCall.endedAt = new Date();
          await activeCall.save();
          emitToUser(receiverId, "missed-call", { callId, callerId: userId });
          emitToUser(userId, "call-timeout", { callId, receiverId });
        }, 30000);

        callTimeouts.set(callId, timeout);

        if (typeof ack === "function") ack({ success: true, callId });
        emitToUser(userId, "call-ringing", { callId, receiverId });
        emitToUser(receiverId, "incoming-call", {
          callId,
          caller: socket.user,
          offer: { type: offer.type, sdp: offer.sdp },
          callType
        });
      } catch (error) {
        console.error("[WebRTC] Offer handling failed", error);
        if (typeof ack === "function") ack({ success: false, message: "Could not start call" });
      }
    });

    socket.on("accept-call", async ({ receiverId, answer, callId }) => {
      try {
        if (!receiverId || answer?.type !== "answer" || !answer?.sdp || !callId) return;

        const call = await Call.findOne({
          _id: callId,
          callerId: receiverId,
          receiverId: userId,
          status: { $in: ["calling", "ringing"] }
        });
        if (!call) return;

        console.log("[WebRTC] Answer received", { receiverId, answererId: userId, callId });
        clearCallTimer(callId);
        call.status = "connected";
        call.answeredAt = new Date();
        await call.save();
        emitToUser(receiverId, "call-answered", {
          answer: { type: answer.type, sdp: answer.sdp },
          userId,
          callId
        });
      } catch (error) {
        console.error("[WebRTC] Answer handling failed", error);
      }
    });

    socket.on("ice-candidate", async ({ receiverId, candidate, callId }) => {
      try {
        if (!receiverId || !candidate?.candidate || !callId) return;

        const call = await Call.findOne({
          _id: callId,
          status: { $in: ["calling", "ringing", "connected"] },
          $or: [
            { callerId: userId, receiverId },
            { callerId: receiverId, receiverId: userId }
          ]
        }).select("_id");
        if (!call) return;

        console.log("[WebRTC] ICE relayed", { from: userId, receiverId, callId });
        emitToUser(receiverId, "ice-candidate", {
          candidate,
          userId,
          callId
        });
      } catch (error) {
        console.error("[WebRTC] ICE relay failed", error);
      }
    });

    socket.on("reject-call", async ({ receiverId, callId }) => {
      if (!receiverId || !callId) return;

      const call = await Call.findOne({
        _id: callId,
        status: { $in: ["calling", "ringing"] },
        $or: [
          { callerId: userId, receiverId },
          { callerId: receiverId, receiverId: userId }
        ]
      });
      if (!call) return;

      clearCallTimer(callId);
      call.status = "rejected";
      call.endedAt = new Date();
      await call.save();
      emitToUser(receiverId, "reject-call", { userId, callId });
    });

    socket.on("call-ended", async ({ receiverId, callId }) => {
      if (!receiverId || !callId) return;

      const call = await Call.findOne({
        _id: callId,
        status: { $in: ["calling", "ringing", "connected"] },
        $or: [
          { callerId: userId, receiverId },
          { callerId: receiverId, receiverId: userId }
        ]
      });
      if (!call) return;

      clearCallTimer(callId);
      call.status = "ended";
      call.endedAt = new Date();
      await call.save();
      emitToUser(receiverId, "call-ended", { userId, callId });
    });

    socket.on("disconnect", async () => {
      const activeSockets = userSocketMap.get(userId);
      activeSockets?.delete(socket.id);

      if (!activeSockets?.size) {
        userSocketMap.delete(userId);
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
        socket.broadcast.emit("user-offline", { userId, lastSeen });

        const disconnectedCalls = await Call.find({
          status: { $in: ["calling", "ringing", "connected"] },
          $or: [{ callerId: userId }, { receiverId: userId }]
        });

        for (const call of disconnectedCalls) {
          clearCallTimer(call._id);
          call.status = "ended";
          call.endedAt = new Date();
          await call.save();

          const otherUserId =
            call.callerId.toString() === userId
              ? call.receiverId
              : call.callerId;
          emitToUser(otherUserId, "call-ended", {
            userId,
            callId: call._id.toString()
          });
        }
      }
      emitOnlineUsers();
    });
  });

  return io;
};
