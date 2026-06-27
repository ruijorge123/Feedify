import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("feedify_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.headers?.["x-maintenance"]) {
      if (window.location.pathname !== "/maintenance") {
        window.location.href = "/maintenance";
      }
      return Promise.reject(err);
    }
    if (err?.response?.status === 401) {
      const path = window.location.pathname;
      if (!["/login", "/register"].includes(path)) {
        localStorage.removeItem("feedify_token");
        localStorage.removeItem("feedify_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
