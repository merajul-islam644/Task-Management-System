import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/app/providers/AuthProvider";
import { completeLogin } from "@/lib/blocks/auth";

/**
 * Handles IAM's redirect back to `/login/callback`. Deliberately NOT wrapped in
 * RequireAuth/RedirectIfAuthenticated — the user is unauthenticated by design
 * when they land here. The one-shot effect is ref-guarded against Strict Mode's
 * double-invoke, which would otherwise replay the callback twice.
 */
export function CallbackPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const result = await completeLogin(window.location.href);
      if (!result.ok) {
        setError(result.message ?? "Sign-in failed.");
        return;
      }
      await refresh();
      navigate(result.returnTo, { replace: true });
    })();
  }, [refresh, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 text-center shadow-pop">
        {error ? (
          <>
            <p className="text-[13px] font-semibold text-danger">Sign-in failed</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-2">{error}</p>
            <Button
              variant="secondary"
              size="lg"
              className="mt-4"
              onClick={() => navigate("/login", { replace: true })}
            >
              Back to sign-in
            </Button>
          </>
        ) : (
          <p className="text-[13px] text-ink-2">Completing sign-in…</p>
        )}
      </div>
    </main>
  );
}
