import { CalendarClock, CircleAlert, Clock } from "lucide-react";
import type { Project, TaskPriority, TaskStatus } from "@/types";
import { hueMeta, priorityMeta, statusMeta } from "@/lib/meta";
import { cn, dueLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export function StatusChip({ status, className }: { status: TaskStatus; className?: string }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <Badge className={cn(meta.chip, className)}>
      <Icon size={11} strokeWidth={2} aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function PriorityChip({ priority, className }: { priority: TaskPriority; className?: string }) {
  const meta = priorityMeta[priority];
  return (
    <Badge className={cn(meta.chip, className)} dot={meta.dot}>
      {meta.label}
    </Badge>
  );
}

export function ProjectChip({
  project,
  className,
  size = "md",
}: {
  project: Project | undefined;
  className?: string;
  size?: "sm" | "md";
}) {
  if (!project) return null;
  return (
    <span
      title={project.name}
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 text-ink-2",
        size === "sm" ? "text-[11.5px]" : "text-[12.5px]",
        className,
      )}
    >
      <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", hueMeta[project.color].dot)} />
      <span className="truncate">{project.name}</span>
    </span>
  );
}

/** Due-date chip. State is carried by icon + text, never color alone. */
export function DueChip({
  due,
  done,
  compact,
  className,
}: {
  due?: string;
  done?: boolean;
  /** Shorter text for fixed-width table columns. */
  compact?: boolean;
  className?: string;
}) {
  const label = dueLabel(due, done ? { done: true } : compact ? { compact: true } : undefined);
  if (!label) return null;
  const full = dueLabel(due);
  const Icon = label.tone === "overdue" && !done ? CircleAlert : label.tone === "today" && !done ? CalendarClock : Clock;
  return (
    <span
      title={full ? (done ? `Was due ${full.text}` : `Due ${full.text}`) : undefined}
      className={cn(
        "inline-flex items-center gap-1 text-[11.5px] font-medium whitespace-nowrap",
        !done && label.tone === "overdue" && "text-danger",
        !done && label.tone === "today" && "text-accent-ink",
        (!label.tone || label.tone === "normal" || label.tone === "soon" || done) && "text-ink-3",
        className,
      )}
    >
      <Icon size={12} aria-hidden />
      {label.text}
    </span>
  );
}
