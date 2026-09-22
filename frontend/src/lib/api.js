import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("feedify_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Client picker: when the owner is producing for a specific client, every
  // request carries who that is, so the generators read that brand's data.
  // Read straight from storage rather than importing clientPicker — api.js is
  // imported by clientPicker itself, and the cycle would break the build.
  // The backend ignores this header for anyone who is not an admin.
  try {
    // "Lihat sebagai klien" wins over the tools' picker: while the owner is
    // inside a client's dashboard, every screen must answer as that client.
    const raw = localStorage.getItem("feedify_view_as")
             || localStorage.getItem("feedify_active_client");
    if (raw) {
      const id = JSON.parse(raw)?.user_id;
      if (id) config.headers["X-Client-Id"] = id;
    }
  } catch { /* blocked storage — just send the request without it */ }

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
        // Dispatch event — AuthContext handles soft redirect via React Router (no full page reload)
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
    }
    return Promise.reject(err);
  }
);

export default api;
