import { api } from "./axios.js";

export const callApi = {
  getHistory: () => api.get("/calls")
};
