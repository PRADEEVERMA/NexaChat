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

    socket.on("typing", ({ receiverId }) => {
      emitToUser(receiverId, "typing", { senderId: userId });
    });

    socket.on("stop-typing", ({ receiverId }) => {
      emitToUser(receiverId, "stop-typing", { senderId: userId });
    });

    socket.on("send-message", async ({ receiverId, text }, ack) => {
      try {
        if (!text?.trim()) return;

        const receiverSocketIds = getReceiverSocketIds(receiverId);
        const message = await Message.create({
          senderId: userId,
          receiverId,
          text: text.trim(),
          status: receiverSocketIds.length ? "delivered" : "sent"
        });

        emitToUser(receiverId, "receive-message", message);

        socket.emit("message-delivered", message);
        if (typeof ack === "function") ack({ success: true, message });
      } catch (error) {
        if (typeof ack === "function") ack({ success: false, message: error.message });
      }
    });

    socket.on("message-seen", async ({ messageIds = [], senderId }) => {
      await Message.updateMany(
        { _id: { $in: messageIds }, receiverId: userId },
        { status: "seen" }
      );

      emitToUser(senderId, "message-seen", { messageIds, seenBy: userId });
    });

    socket.on("join-group", ({ groupId }) => {
      if (groupId) socket.join(`group:${groupId}`);
    });

    socket.on("leave-group", ({ groupId }) => {
      if (groupId) socket.leave(`group:${groupId}`);
    });

    socket.on("call-user", async ({ receiverId, offer, callType }, ack) => {
      try {
        if (!receiverId || !offer?.type || !offer?.sdp) {
          if (typeof ack === "function") ack({ success: false, message: "Invalid call offer" });
          return;
        }

        console.log("Offer Received", { callerId: userId, receiverId, callType });
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
          offer,
          callType
        });
      } catch (error) {
        console.error("Offer handling failed", error);
        if (typeof ack === "function") ack({ success: false, message: "Could not start call" });
      }
    });

    socket.on("accept-call", async ({ receiverId, answer, callId }) => {
      try {
        if (!receiverId || !answer?.type || !answer?.sdp) return;

        console.log("Answer Received", { receiverId, answererId: userId, callId });
        clearCallTimer(callId);
        if (callId) {
          await Call.findByIdAndUpdate(callId, {
            status: "connected",
            answeredAt: new Date()
          });
        }
        emitToUser(receiverId, "call-answered", { answer, userId, callId });
      } catch (error) {
        console.error("Answer handling failed", error);
      }
    });

    socket.on("ice-candidate", ({ receiverId, candidate, callId }) => {
      if (!receiverId || !candidate) return;

      console.log("ICE Received", { from: userId, receiverId, callId });
      emitToUser(receiverId, "ice-candidate", { candidate, userId, callId });
    });

    socket.on("reject-call", async ({ receiverId, callId }) => {
      clearCallTimer(callId);
      if (callId) {
        await Call.findByIdAndUpdate(callId, {
          status: "rejected",
          endedAt: new Date()
        });
      }
      emitToUser(receiverId, "reject-call", { userId, callId });
    });

    socket.on("call-ended", async ({ receiverId, callId }) => {
      clearCallTimer(callId);
      if (callId) {
        await Call.findByIdAndUpdate(callId, {
          status: "ended",
          endedAt: new Date()
        });
      }
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
      }
      emitOnlineUsers();
    });
  });

  return io;
};
