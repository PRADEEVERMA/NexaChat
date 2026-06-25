import { api } from "./axios.js";

export const messageApi = {
  getMessages: (receiverId) => api.get(`/messages/${receiverId}`),
  sendMessage: (receiverId, payload) => api.post(`/messages/send/${receiverId}`, payload),
  editMessage: (messageId, text) => api.patch(`/messages/${messageId}`, { text }),
  deleteMessage: (messageId, everyone = false) =>
    api.delete(`/messages/${messageId}`, { params: { everyone } }),
  reactToMessage: (messageId, emoji) => api.post(`/messages/${messageId}/reactions`, { emoji })
};
