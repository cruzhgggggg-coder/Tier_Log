type AuthSnapshot = {
  accessToken: string | null;
  refreshToken: string | null;
  user: unknown;
};

const AUTH_KEY = "tierlog.auth";

export function loadAuthSnapshot(): AuthSnapshot | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSnapshot;
  } catch {
    return null;
  }
}

export function saveAuthSnapshot(snapshot: AuthSnapshot) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(AUTH_KEY, JSON.stringify(snapshot));
}

export function clearAuthSnapshot() {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.removeItem(AUTH_KEY);
}
