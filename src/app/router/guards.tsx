import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden
          className="h-6 w-6 animate-spin rounded-full border-2 border-line-strong border-t-accent"
        />
        <p className="text-[13px] text-ink-2">Checking your session…</p>
      </div>
    </div>
  );
}

/** Wraps every protected route: waits for the session check, then bounces to /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "unauthenticated") {
      const returnTo = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?returnTo=${returnTo}`, { replace: true });
    }
  }, [status, location.pathname, location.search, navigate]);

  if (status !== "authenticated") return <LoadingScreen />;
  return <>{children}</>;
}

/** Wraps /login itself: an already-signed-in visitor goes straight through. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = searchParams.get("returnTo") ?? "/";

  useEffect(() => {
    if (status === "authenticated") navigate(returnTo, { replace: true });
  }, [status, returnTo, navigate]);

  if (status === "authenticated") return null;
  return <>{children}</>;
}
