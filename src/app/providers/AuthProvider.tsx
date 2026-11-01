import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { BlocksOidcUserInfo } from "@seliseblocks/client";
import { fetchSessionClaims, logout as blocksLogout, startLogin } from "@/lib/blocks/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  claims: BlocksOidcUserInfo | null;
  login: (returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const STATUS_POLL_MS = 5 * 60 * 1000;

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Single source of truth for session state. Auth is decided by asking IAM
 * (`userInfo()`) — never by inspecting local storage; the cookie flow keeps
 * no locally readable token by design. Refreshes on mount, every five minutes
 * as a backup, and whenever the tab regains visibility.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [claims, setClaims] = useState<BlocksOidcUserInfo | null>(null);
  const refreshing = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const next = await fetchSessionClaims();
      if (!next) {
        setClaims(null);
        setStatus("unauthenticated");
        return;
      }
      setClaims(next);
      setStatus("authenticated");
    } catch {
      setClaims(null);
      setStatus("unauthenticated");
    } finally {
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refresh();
    }, STATUS_POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const login = useCallback(async (returnTo?: string) => {
    setStatus("loading");
    try {
      await startLogin(returnTo);
      // `startLogin` navigates away on success; reaching here means it didn't.
      setStatus("unauthenticated");
    } catch (error) {
      setStatus("unauthenticated");
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await blocksLogout();
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ status, claims, login, logout, refresh }),
    [status, claims, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}

/** Display name from the session claims — email local-part covers invited
    accounts that have not supplied a name yet. */
export function useDisplayName(): string {
  const { claims } = useAuth();
  return claims?.name?.trim() || claims?.email?.split("@")[0] || "Signed-in user";
}
