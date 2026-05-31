import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { API_URL } from "@/src/lib/config";
import { clearAuthSnapshot, loadAuthSnapshot, saveAuthSnapshot } from "@/src/lib/storage";
import type { User } from "@/src/types";

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: "student" | "lecturer";
  nim?: string;
  lecturer_id?: number;
  prodi?: string;
  thesis_title?: string;
  nip?: string;
  faculty?: string;
  keahlian?: string;
};

type ApiOptions = RequestInit & {
  auth?: boolean;
};

type AuthContextValue = {
  booting: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
  api: <T>(path: string, options?: ApiOptions) => Promise<T>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function translateError(rawError: string): string {
  if (!rawError) return "An unexpected error occurred. Please try again.";
  const errStr = String(rawError);

  // 1. Password min tag validation
  if (errStr.includes("failed on the 'min' tag") && errStr.includes("'Password'")) {
    return "Password is too short. It must be at least 8 characters long.";
  }

  // 2. Email validation tag
  if (errStr.includes("failed on the 'email' tag") && errStr.includes("'Email'")) {
    return "Invalid email address format. Please enter a valid email address (e.g., name@university.edu).";
  }

  // 3. Required fields validation tags
  if (errStr.includes("failed on the 'required' tag")) {
    const fieldMatch = errStr.match(/Field validation for '([^']+)' failed/);
    const fieldName = fieldMatch ? fieldMatch[1] : "";
    if (fieldName === "Email") return "Email address cannot be empty.";
    if (fieldName === "Password") return "Password cannot be empty.";
    if (fieldName === "Name") return "Full name cannot be empty.";
    if (fieldName === "Role") return "Please select your role (Student or Lecturer).";
    if (fieldName === "NIM") return "Student ID (NIM) cannot be empty.";
    if (fieldName === "NIP") return "Advisor ID (NIP) cannot be empty.";
    if (fieldName === "LecturerID") return "Please select your academic advisor.";
    return `The ${fieldName || "field"} is required. Please fill in all required fields.`;
  }

  // 4. Duplicate database entries
  if (errStr.includes("Duplicate entry") || errStr.includes("already registered") || errStr.includes("uni_users_email") || errStr.includes("duplicate key")) {
    return "This email address is already registered. Please sign in or use another email.";
  }
  if (errStr.includes("uni_students_nim")) {
    return "This Student ID (NIM) is already registered. Please check your Student ID.";
  }
  if (errStr.includes("uni_lecturers_nip")) {
    return "This Advisor ID (NIP) is already registered. Please check your Advisor ID.";
  }

  // 4b. Database foreign key and relational constraints
  if (errStr.includes("foreign key constraint fails") && errStr.includes("fk_students_lecturer")) {
    return "The selected Academic Advisor ID does not exist. Please verify the Advisor ID and try again.";
  }
  if (errStr.includes("foreign key constraint fails")) {
    return "This action cannot be completed because a related database record is missing or linked incorrectly.";
  }
  if (errStr.includes("Cannot delete or update a parent row") || errStr.includes("Error 1451")) {
    return "This record cannot be deleted or modified because it is currently referenced by other active items in the system.";
  }

  // 5. Authentication errors
  if (errStr.includes("Email atau password salah") || errStr.includes("unauthorized") || errStr.includes("incorrect password") || errStr.includes("crypto/bcrypt")) {
    return "Incorrect email or password. Please try again.";
  }

  // 6. Network / connection errors
  if (errStr.includes("Failed to fetch") || errStr.includes("NetworkError") || errStr.includes("connection failed")) {
    return "Failed to connect to the server. Please check your internet connection or try again in a few moments.";
  }

  // 7. NVIDIA NIM model/API errors
  if (errStr.includes("NVIDIA API error") || errStr.includes("NVIDIA NIM") || errStr.includes("integrate.api.nvidia.com")) {
    if (errStr.includes("404") || errStr.includes("Not Found") || errStr.includes("400")) {
      return "NVIDIA NIM model selection error. Please make sure your NVIDIA API key is active and has access to the chosen model in your AI Gateway settings.";
    }
    return "NVIDIA NIM API error. Please verify that your NVIDIA API Key is correct and active.";
  }

  return rawError;
}

async function parseError(response: Response) {
  try {
    const data = await response.json();
    const rawMsg = data.error || data.message || "Request failed";
    return translateError(rawMsg);
  } catch {
    return "Failed to communicate with the server. Please try again.";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  const persist = useCallback((nextUser: User | null, nextAccess: string | null, nextRefresh: string | null) => {
    setUser(nextUser);
    setAccessToken(nextAccess);
    setRefreshToken(nextRefresh);
    if (nextUser || nextAccess || nextRefresh) {
      saveAuthSnapshot({ user: nextUser, accessToken: nextAccess, refreshToken: nextRefresh });
    } else {
      clearAuthSnapshot();
    }
  }, []);

  useEffect(() => {
    const snapshot = loadAuthSnapshot();
    if (!snapshot) {
      setBooting(false);
      return;
    }

    // Helper: decode JWT exp claim without a library
    const getTokenExp = (token: string | null): number | null => {
      if (!token) return null;
      try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        return typeof payload.exp === "number" ? payload.exp : null;
      } catch {
        return null;
      }
    };

    const exp = getTokenExp(snapshot.accessToken);
    const nowSec = Math.floor(Date.now() / 1000);
    const isExpiredOrExpiringSoon = exp === null || exp - nowSec < 5 * 60; // < 5 minutes left

    if (isExpiredOrExpiringSoon && snapshot.refreshToken) {
      // Proactively refresh before rendering anything
      fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: snapshot.refreshToken }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.access_token) {
            const freshUser = (data.user as User | null) ?? (snapshot.user as User | null) ?? null;
            setUser(freshUser);
            setAccessToken(data.access_token);
            setRefreshToken(data.refresh_token ?? snapshot.refreshToken);
            saveAuthSnapshot({
              user: freshUser,
              accessToken: data.access_token,
              refreshToken: data.refresh_token ?? snapshot.refreshToken,
            });
          } else {
            // Refresh token also invalid — force re-login
            clearAuthSnapshot();
          }
        })
        .catch(() => {
          // Network error during boot — restore snapshot anyway, let 401 handler deal with it
          setUser((snapshot.user as User | null) ?? null);
          setAccessToken(snapshot.accessToken);
          setRefreshToken(snapshot.refreshToken);
        })
        .finally(() => setBooting(false));
    } else {
      // Token still valid — restore directly
      setUser((snapshot.user as User | null) ?? null);
      setAccessToken(snapshot.accessToken);
      setRefreshToken(snapshot.refreshToken);
      setBooting(false);
    }
  }, []);

  const refreshPromiseRef = React.useRef<Promise<string | null> | null>(null);

  const refresh = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    if (!refreshToken) {
      return null;
    }

    const promise = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          persist(null, null, null);
          return null;
        }

        const data = await response.json();
        persist(data.user, data.access_token, data.refresh_token);
        return data.access_token as string;
      } catch (err) {
        console.error("Token refresh failed:", err);
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, [persist, refreshToken]);

  const api = useCallback(
    async <T,>(path: string, options: ApiOptions = {}) => {
      const headers = new Headers(options.headers ?? {});
      if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }
      if (options.auth !== false && accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }

      const run = async (token?: string | null) => {
        const nextHeaders = new Headers(headers);
        if (options.auth !== false && token) {
          nextHeaders.set("Authorization", `Bearer ${token}`);
        }
        return fetch(`${API_URL}${path}`, { ...options, headers: nextHeaders });
      };

      let response = await run(accessToken);
      if (response.status === 401 && options.auth !== false && refreshToken) {
        const nextToken = await refresh();
        if (nextToken) {
          response = await run(nextToken);
        }
      }

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    },
    [accessToken, refresh, refreshToken]
  );

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await api<{
        user: User;
        access_token: string;
        refresh_token: string;
      }>("/auth/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify(input),
      });

      persist(response.user, response.access_token, response.refresh_token);
    },
    [api, persist]
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const response = await api<{
        user: User;
        access_token: string;
        refresh_token: string;
      }>("/auth/register", {
        method: "POST",
        auth: false,
        body: JSON.stringify(input),
      });

      persist(response.user, response.access_token, response.refresh_token);
    },
    [api, persist]
  );

  const logout = useCallback(async () => {
    if (refreshToken) {
      try {
        await api("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
      }
    }
    persist(null, null, null);
  }, [api, persist, refreshToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      booting,
      user,
      accessToken,
      refreshToken,
      login,
      register,
      logout,
      refresh,
      api,
      setUser,
    }),
    [accessToken, api, booting, login, logout, refresh, refreshToken, register, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
