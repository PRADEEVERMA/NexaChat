import { api } from "./axios.js";

export const groupApi = {
  getGroups: (search = "") => api.get("/groups", { params: { search } }),
  createGroup: (formData) =>
    api.post("/groups", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }),
  updateGroup: (groupId, formData) =>
    api.patch(`/groups/${groupId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }),
  addMembers: (groupId, members) => api.post(`/groups/${groupId}/members`, { members }),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  getMessages: (groupId) => api.get(`/groups/${groupId}/messages`),
  sendMessage: (groupId, formData) =>
    api.post(`/groups/${groupId}/messages`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })
};
