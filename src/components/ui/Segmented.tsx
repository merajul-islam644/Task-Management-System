import { cn } from "@/lib/utils";

/** Segmented toggle group (aria-pressed buttons). For single-choice filters. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center gap-0.5 rounded-ctl border border-line bg-surface p-0.5", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-6.5 items-center gap-1.5 rounded-[6px] px-2.5 text-[12.5px] font-medium transition-colors duration-150",
              active
                ? "bg-surface-hover text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]"
                : "text-ink-2 hover:text-ink",
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cn("tnum text-[11px]", active ? "text-ink-2" : "text-ink-3")}>
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
