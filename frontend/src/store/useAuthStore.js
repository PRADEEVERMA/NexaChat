import toast from "react-hot-toast";
import { create } from "zustand";
import { io } from "socket.io-client";
import { authApi } from "../api/authApi.js";
import { userApi } from "../api/userApi.js";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  token: localStorage.getItem("chat-token"),
  socket: null,
  onlineUsers: [],
  isCheckingAuth: true,
  isAuthLoading: false,
  isProfileLoading: false,

  checkAuth: async () => {
    try {
      const { data } = await authApi.me();
      set({ authUser: data.user });
      get().connectSocket();
    } catch {
      set({ authUser: null, token: null });
      localStorage.removeItem("chat-token");
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  register: async (payload) => {
    set({ isAuthLoading: true });
    try {
      const { data } = await authApi.register(payload);
      localStorage.setItem("chat-token", data.token);
      set({ authUser: data.user, token: data.token });
      get().connectSocket();
      toast.success("Account created");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
      return false;
    } finally {
      set({ isAuthLoading: false });
    }
  },

  login: async (payload) => {
    set({ isAuthLoading: true });
    try {
      const { data } = await authApi.login(payload);
      localStorage.setItem("chat-token", data.token);
      set({ authUser: data.user, token: data.token });
      get().connectSocket();
      toast.success("Welcome back");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
      return false;
    } finally {
      set({ isAuthLoading: false });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Client logout should continue even if the network request fails.
    } finally {
      localStorage.removeItem("chat-token");
      get().disconnectSocket();
      set({ authUser: null, token: null, onlineUsers: [] });
      toast.success("Logged out");
    }
  },

  updateProfile: async (formData) => {
    set({ isProfileLoading: true });
    try {
      const { data } = await userApi.updateProfile(formData);
      set({ authUser: data.user });
      toast.success("Profile updated");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Profile update failed");
      return false;
    } finally {
      set({ isProfileLoading: false });
    }
  },

  connectSocket: () => {
    const { authUser, socket, token } = get();
    if (!authUser || socket) return;

    const nextSocket = io(socketUrl, {
      withCredentials: true,
      auth: { token: token || localStorage.getItem("chat-token") }
    });

    nextSocket.on("online-users", (users) => set({ onlineUsers: users }));
    nextSocket.on("user-online", (userId) =>
      set({ onlineUsers: Array.from(new Set([...get().onlineUsers, userId])) })
    );
    nextSocket.on("user-offline", ({ userId }) =>
      set({ onlineUsers: get().onlineUsers.filter((id) => id !== userId) })
    );
    nextSocket.on("connect_error", () => {
      set({ onlineUsers: [] });
    });

    set({ socket: nextSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) socket.disconnect();
    set({ socket: null });
  }
}));
