import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ListChecks, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/lib/i18n";
import { isLoginConfigured } from "@/lib/blocks/config";

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isLoginConfigured();

  async function onSignIn() {
    setPending(true);
    setError(null);
    try {
      await login(returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start sign-in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-pop">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-ctl bg-accent-solid text-on-accent">
            <ListChecks size={16} aria-hidden />
          </span>
          <div>
            <h1 className="text-sm font-semibold text-ink">FlowTask</h1>
            <p className="text-xs text-ink-2">{t("auth.tagline")}</p>
          </div>
        </div>

        {configured ? (
          <>
            <p className="mt-5 text-[13px] leading-relaxed text-ink-2">
              {t("auth.signInPrompt")}
            </p>
            <Button
              variant="primary"
              size="lg"
              className="mt-4 w-full"
              onClick={() => void onSignIn()}
              disabled={pending}
            >
              <LogIn size={15} aria-hidden />
              {pending ? t("auth.redirecting") : t("auth.signIn")}
            </Button>
            {error ? (
              <p role="alert" className="mt-3 rounded-ctl border border-danger-line bg-danger-soft px-3 py-2 text-xs text-danger">
                {error}
              </p>
            ) : null}
          </>
        ) : (
          <p
            role="alert"
            className="mt-5 rounded-ctl border border-danger-line bg-danger-soft px-3 py-2.5 text-xs leading-relaxed text-danger"
          >
            Login is not configured. Register the callback URL{" "}
            <code className="font-mono">{window.location.origin}/login/callback</code>{" "}
            with the project's OIDC client, and set the{" "}
            <code className="font-mono">VITE_BLOCKS_*</code> values in{" "}
            <code className="font-mono">.env</code>.
          </p>
        )}
      </div>
    </main>
  );
}
