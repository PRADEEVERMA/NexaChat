import { api } from "./axios.js";

export const userApi = {
  getUsers: (search = "") => api.get("/users", { params: { search } }),
  getUserById: (id) => api.get(`/users/${id}`),
  updateProfile: (formData) =>
    api.patch("/users/profile/me", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })
};
