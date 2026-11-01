import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Task completion control. A real button so it's keyboard operable everywhere. */
export function TaskCheck({
  done,
  onToggle,
  title,
  className,
}: {
  done: boolean;
  onToggle: () => void;
  title: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? `Mark “${title}” as not done` : `Mark “${title}” as done`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-150",
        done
          ? "border-accent-solid bg-accent-solid text-white"
          : "border-line-strong bg-surface hover:border-accent",
        className,
      )}
    >
      {done && <Check size={11} strokeWidth={3} aria-hidden />}
    </button>
  );
}
