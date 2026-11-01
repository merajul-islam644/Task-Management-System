import { CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore, type ToastVariant } from "@/store/toast";

const variantIcon: Record<ToastVariant, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "text-ok" },
  error: { icon: AlertTriangle, className: "text-danger" },
  info: { icon: Info, className: "text-accent" },
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-70 flex flex-col items-center gap-2 px-4 pb-4 sm:items-end sm:pr-5"
    >
      {toasts.map((t) => {
        const { icon: Icon, className } = variantIcon[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-card border border-line bg-surface px-3.5 py-3 shadow-pop data-[state=open]:animate-[ft-pop-in_150ms_ease-out]"
          >
            <Icon size={16} className={cn("mt-px shrink-0", className)} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink">{t.title}</p>
              {t.description ? <p className="mt-0.5 text-xs text-ink-2">{t.description}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-[5px] p-0.5 text-ink-3 transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-ink-3">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <h3 className="mt-3 text-[13.5px] font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-1 max-w-64 text-[13px] leading-relaxed text-ink-2">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-[6px] bg-surface-hover", className)} />;
}
