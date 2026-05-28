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

async function parseError(response: Response) {
  try {
    const data = await response.json();
    return data.error || data.message || "Request failed";
  } catch {
    return "Request failed";
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
    if (snapshot) {
      setUser((snapshot.user as User | null) ?? null);
      setAccessToken(snapshot.accessToken);
      setRefreshToken(snapshot.refreshToken);
    }
    setBooting(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!refreshToken) {
      return null;
    }

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
