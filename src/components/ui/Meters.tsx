import { cn } from "@/lib/utils";

/** Thin horizontal meter. The value is always written beside it as text. */
export function ProgressBar({
  value,
  label,
  className,
  barClassName,
}: {
  value: number;
  label: string;
  className?: string;
  barClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-hover", className)}
    >
      <div
        className={cn("h-full rounded-full bg-accent-solid transition-[width] duration-300", barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/** Compact ring meter for a single value (focus progress). */
export function ProgressRing({
  value,
  label,
  size = 64,
  className,
}: {
  value: number;
  label: string;
  size?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} aria-hidden className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface-hover"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-accent-solid transition-[stroke-dashoffset] duration-500"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
        />
      </svg>
      <span className="tnum absolute text-[13px] font-semibold text-ink">{clamped}%</span>
    </div>
  );
}
