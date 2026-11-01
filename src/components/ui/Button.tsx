import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent-solid text-on-accent border border-transparent hover:bg-accent-solid-hover active:translate-y-px",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-surface-hover active:translate-y-px",
  ghost: "bg-transparent text-ink-2 border border-transparent hover:bg-surface-hover hover:text-ink",
  danger:
    "bg-surface text-danger border border-danger-line hover:bg-danger-soft active:translate-y-px",
  soft: "bg-accent-soft text-accent-ink border border-accent-soft-line hover:bg-accent-soft/70",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-7 gap-1.5 px-2 text-[12.5px] rounded-[6px]",
  md: "h-8 gap-1.5 px-3 text-[13px] rounded-ctl",
  lg: "h-9 gap-2 px-3.5 text-sm rounded-ctl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 select-none",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  label: string;
}

const iconSizeClasses = {
  sm: "h-7 w-7 rounded-[6px]",
  md: "h-8 w-8 rounded-ctl",
} as const;

/** Square button for a single icon. `label` names it for assistive tech. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant = "ghost", size = "md", label, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center text-ink-2 transition-colors duration-150",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        iconSizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});
