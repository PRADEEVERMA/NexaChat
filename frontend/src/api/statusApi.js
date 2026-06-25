import { api } from "./axios.js";

export const statusApi = {
  getStatuses: () => api.get("/statuses"),
  createStatus: (formData) =>
    api.post("/statuses", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })
};
