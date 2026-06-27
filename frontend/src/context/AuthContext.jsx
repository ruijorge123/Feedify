import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { resetCreditsCache } from "@/lib/credits";
import { resetConfigCache } from "@/lib/config";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("feedify_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      localStorage.setItem("feedify_user", JSON.stringify(data));
    } catch {
      localStorage.removeItem("feedify_token");
      localStorage.removeItem("feedify_user");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("feedify_token", data.token);
    localStorage.setItem("feedify_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    // Backend now returns requires_verification instead of token
    return data; // { requires_verification: true, email }
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
    localStorage.clear();
    sessionStorage.clear();
    resetCreditsCache();
    resetConfigCache();
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
