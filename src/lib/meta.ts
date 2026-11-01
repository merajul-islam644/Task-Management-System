import {
  AlarmClock,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  AtSign,
  CircleCheck,
  CircleDashed,
  Circle,
  Eye,
  Megaphone,
  MessageSquare,
  Timer,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";
import type {
  ActivityKind,
  HueName,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from "@/types";

/* ------------------------------------------------------------------ status */

export const STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
];

export const statusMeta: Record<
  TaskStatus,
  { label: string; icon: LucideIcon; chip: string; dot: string }
> = {
  backlog: {
    label: "Backlog",
    icon: CircleDashed,
    chip: "bg-surface-hover text-ink-2 border-line",
    dot: "text-ink-3",
  },
  todo: {
    label: "To do",
    icon: Circle,
    chip: "bg-surface-hover text-ink border-line",
    dot: "text-ink-3",
  },
  in_progress: {
    label: "In progress",
    icon: Timer,
    chip: "bg-accent-soft text-accent-ink border-accent-soft-line",
    dot: "text-accent",
  },
  in_review: {
    label: "In review",
    icon: Eye,
    chip: "bg-warn-soft text-warn border-warn-line",
    dot: "text-warn",
  },
  done: {
    label: "Done",
    icon: CircleCheck,
    chip: "bg-ok-soft text-ok border-ok-line",
    dot: "text-ok",
  },
};

/* ---------------------------------------------------------------- priority */

export const PRIORITIES: TaskPriority[] = ["urgent", "high", "medium", "low"];

export const priorityMeta: Record<
  TaskPriority,
  { label: string; icon: LucideIcon; chip: string; dot: string; rank: number }
> = {
  urgent: {
    label: "Urgent",
    icon: ArrowUp,
    chip: "bg-danger-soft text-danger border-danger-line",
    dot: "bg-danger",
    rank: 0,
  },
  high: {
    label: "High",
    icon: ArrowUp,
    chip: "bg-warn-soft text-warn border-warn-line",
    dot: "bg-warn",
    rank: 1,
  },
  medium: {
    label: "Medium",
    icon: ArrowDown,
    chip: "bg-surface-hover text-ink-2 border-line",
    dot: "bg-ink-3",
    rank: 2,
  },
  low: {
    label: "Low",
    icon: ArrowDown,
    chip: "bg-surface-hover text-ink-3 border-line",
    dot: "bg-line-strong",
    rank: 3,
  },
};

/* ---------------------------------------------------------------- projects */

export const projectStatusMeta: Record<
  ProjectStatus,
  { label: string; chip: string; dot: string; text: string }
> = {
  on_track: {
    label: "On track",
    chip: "bg-ok-soft text-ok border-ok-line",
    dot: "bg-ok",
    text: "text-ok",
  },
  at_risk: {
    label: "At risk",
    chip: "bg-warn-soft text-warn border-warn-line",
    dot: "bg-warn",
    text: "text-warn",
  },
  paused: {
    label: "Paused",
    chip: "bg-surface-hover text-ink-2 border-line",
    dot: "bg-ink-3",
    text: "text-ink-3",
  },
};

/** Identity hues for projects/avatars. Always paired with a text label. */
export const hueMeta: Record<HueName, { text: string; soft: string; dot: string }> =
  {
    iris: {
      text: "text-hue-iris",
      soft: "bg-accent-soft",
      dot: "bg-hue-iris",
    },
    teal: {
      text: "text-hue-teal",
      soft: "bg-ok-soft",
      dot: "bg-hue-teal",
    },
    amber: {
      text: "text-hue-amber",
      soft: "bg-warn-soft",
      dot: "bg-hue-amber",
    },
    rose: {
      text: "text-hue-rose",
      soft: "bg-danger-soft",
      dot: "bg-hue-rose",
    },
    green: {
      text: "text-hue-green",
      soft: "bg-ok-soft",
      dot: "bg-hue-green",
    },
  };

/* ---------------------------------------------------------------- activity */

export const activityMeta: Record<ActivityKind, { icon: LucideIcon }> = {
  assigned: { icon: UserRoundPlus },
  due_soon: { icon: AlarmClock },
  comment: { icon: MessageSquare },
  mention: { icon: AtSign },
  status_changed: { icon: ArrowLeftRight },
  completed: { icon: CircleCheck },
  project_update: { icon: Megaphone },
};
