import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { resetCreditsCache } from "@/lib/credits";
import { resetConfigCache } from "@/lib/config";
import { resetActiveBrandCache } from "@/lib/activeBrand";
import { linkWebpushrUser, unlinkWebpushrUser } from "@/lib/pushNotifications";

const AuthContext = createContext(null);

function getCachedUser() {
  try {
    const raw = localStorage.getItem("feedify_user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  // Seed immediately from localStorage — no loading flash if user is already cached
  const [user, setUser]       = useState(getCachedUser);
  const [loading, setLoading] = useState(
    !!localStorage.getItem("feedify_token") && !getCachedUser()
  );

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("feedify_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      // 5-second timeout — if backend is unreachable, fall back to cached user
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const { data } = await api.get("/auth/me", { signal: controller.signal });
      clearTimeout(timer);
      setUser(data);
      localStorage.setItem("feedify_user", JSON.stringify(data));
    } catch (err) {
      if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
        // Timeout — keep cached user, don't log out
      } else if (err?.response?.status === 401) {
        // Token genuinely invalid — clear everything
        localStorage.removeItem("feedify_token");
        localStorage.removeItem("feedify_user");
        setUser(null);
      }
      // Any other network error — keep cached user
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Tag this browser's Webpushr subscriber with our user id whenever it changes,
  // so scheduled reminders can be targeted straight to this account.
  useEffect(() => {
    if (user?.id) linkWebpushrUser(user.id);
  }, [user?.id]);

  // Listen for 401s from any API call — clear auth state and let ProtectedRoute redirect via React Router (no full page reload)
  useEffect(() => {
    const handle = () => { setUser(null); };
    window.addEventListener("auth:unauthorized", handle);
    return () => window.removeEventListener("auth:unauthorized", handle);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("feedify_token", data.token);
    localStorage.setItem("feedify_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    return data;
  };

  const loginWithToken = (token, userData) => {
    localStorage.setItem("feedify_token", token);
    localStorage.setItem("feedify_user", JSON.stringify(userData));
    setUser(userData);
  };

  const loginWithGoogle = async (credential) => {
    const { data } = await api.post("/auth/google", { credential });
    localStorage.setItem("feedify_token", data.token);
    localStorage.setItem("feedify_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    unlinkWebpushrUser();
    localStorage.clear();
    sessionStorage.clear();
    resetCreditsCache();
    resetConfigCache();
    resetActiveBrandCache();
    setUser(null);
    window.location.href = "/login";
  };

  const refreshUser = loadUser;

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithToken, loginWithGoogle, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
