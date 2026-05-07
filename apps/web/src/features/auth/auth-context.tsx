import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { apiRequest } from "../../api/client.js";

interface SessionUser {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface AuthContextValue {
  authReady: boolean;
  token: string | null;
  user: SessionUser | null;
  login: (email: string, password: string, selectedRole?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("halal-token"));
  const [user, setUser] = useState<SessionUser | null>(() => {
    const raw = localStorage.getItem("halal-user");
    return raw ? JSON.parse(raw) as SessionUser : null;
  });
  const [authReady, setAuthReady] = useState(false);
  const justLoggedIn = useRef(false);

  useEffect(() => {
    if (token) localStorage.setItem("halal-token", token);
    else localStorage.removeItem("halal-token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("halal-user", JSON.stringify(user));
    else localStorage.removeItem("halal-user");
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSession() {
      if (!token) {
        if (!cancelled) { setUser(null); setAuthReady(true); }
        return;
      }

      // Skip /auth/me call if we just logged in — we already have user data
      if (justLoggedIn.current) {
        justLoggedIn.current = false;
        if (!cancelled) setAuthReady(true);
        return;
      }

      try {
        const sessionUser = await apiRequest<SessionUser>("/auth/me", {}, token);
        if (!cancelled) setUser(sessionUser);
      } catch {
        if (!cancelled) { setToken(null); setUser(null); }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }

    setAuthReady(false);
    void hydrateSession();
    return () => { cancelled = true; };
  }, [token]);

  async function login(email: string, password: string, selectedRole?: string) {
    const payload = await apiRequest<{ token: string; user: SessionUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (selectedRole && payload.user.role !== selectedRole) {
      throw new Error("ROLE_MISMATCH");
    }
    justLoggedIn.current = true;
    setToken(payload.token);
    setUser(payload.user);
    setAuthReady(true);
  }

  function logout() {
    justLoggedIn.current = false;
    setToken(null);
    setUser(null);
    setAuthReady(true);
  }

  return (
    <AuthContext.Provider value={{ authReady, token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
