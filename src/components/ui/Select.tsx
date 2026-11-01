import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Single-select menu built on Radix Select (full keyboard + SR support). */
export function Select<T extends string>({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  className,
  align = "start",
}: {
  value: T | undefined;
  onValueChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  align?: "start" | "end";
}) {
  return (
    <RadixSelect.Root value={value ?? ""} onValueChange={(v) => onValueChange(v as T)}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-ctl border border-line-strong bg-surface px-2.5 text-[13px] font-medium text-ink",
          "transition-colors duration-150 hover:bg-surface-hover data-[placeholder]:text-ink-3",
          "focus:outline-none disabled:opacity-60",
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder ?? "Select"} />
        <ChevronDown size={13} className="text-ink-3" aria-hidden />
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          align={align}
          position="popper"
          sideOffset={6}
          className={cn(
            "z-60 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[10px] border border-line bg-surface p-1 shadow-pop",
            "data-[state=open]:animate-[ft-pop-in_130ms_ease-out]",
          )}
        >
          <RadixSelect.Viewport>
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[13px] text-ink outline-none select-none",
                  "data-[highlighted]:bg-surface-hover",
                )}
              >
                {option.icon}
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="ml-auto text-accent">
                  <Check size={13} aria-hidden />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
