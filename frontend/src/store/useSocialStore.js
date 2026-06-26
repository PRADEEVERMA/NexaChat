import toast from "react-hot-toast";
import { create } from "zustand";
import { groupApi } from "../api/groupApi.js";
import { statusApi } from "../api/statusApi.js";

export const useSocialStore = create((set, get) => ({
  groups: [],
  groupMessages: [],
  statuses: [],
  isGroupsLoading: false,
  isGroupMessagesLoading: false,
  isStatusesLoading: false,

  getGroups: async (search = "") => {
    set({ isGroupsLoading: true });
    try {
      const { data } = await groupApi.getGroups(search);
      set({ groups: data.groups });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async ({ name, members, avatar }) => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("members", JSON.stringify(members));
    if (avatar) formData.append("avatar", avatar);

    try {
      const { data } = await groupApi.createGroup(formData);
      set({ groups: [data.group, ...get().groups] });
      toast.success("Group created");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create group");
      return false;
    }
  },

  getGroupMessages: async (groupId) => {
    if (!groupId) return;

    set({ isGroupMessagesLoading: true, groupMessages: [] });
    try {
      const { data } = await groupApi.getMessages(groupId);
      set({ groupMessages: data.messages });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load group messages");
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  sendGroupMessage: async (groupId, text) => {
    if (typeof text === "string" && !text.trim()) return false;

    try {
      const payload = text instanceof FormData ? text : (() => {
        const formData = new FormData();
        formData.append("text", text);
        return formData;
      })();
      const { data } = await groupApi.sendMessage(groupId, payload);
      const existing = get().groupMessages.some((item) => item._id === data.message._id);
      if (!existing) set({ groupMessages: [...get().groupMessages, data.message] });
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Group message failed");
      return false;
    }
  },

  appendGroupMessage: (message) => {
    const existing = get().groupMessages.some((item) => item._id === message._id);
    if (!existing) set({ groupMessages: [...get().groupMessages, message] });
  },

  getStatuses: async () => {
    set({ isStatusesLoading: true });
    try {
      const { data } = await statusApi.getStatuses();
      set({ statuses: data.statuses });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load status updates");
    } finally {
      set({ isStatusesLoading: false });
    }
  },

  createStatus: async ({ text, media }) => {
    const formData = new FormData();
    formData.append("text", text || "");
    if (media) formData.append("media", media);

    try {
      const { data } = await statusApi.createStatus(formData);
      set({ statuses: [data.status, ...get().statuses] });
      toast.success("Status shared");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not share status");
      return false;
    }
  }
}));
