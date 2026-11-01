import {
  AlarmClock,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  AtSign,
  CircleCheck,
  CircleDashed,
  Circle,
  Columns3,
  Eye,
  Megaphone,
  MessageSquare,
  Timer,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";
import type {
  ActivityKind,
  BoardColumn,
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

export interface StatusMeta {
  label: string;
  icon: LucideIcon;
  chip: string;
  dot: string;
}

export const statusMeta: Record<TaskStatus, StatusMeta> = {
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

/** Neutral look for user-created columns (and ids whose column went missing). */
const customColumnMeta: StatusMeta = {
  label: "",
  icon: Columns3,
  chip: "bg-surface-hover text-ink-2 border-line",
  dot: "text-ink-3",
};

/** Meta for any status id: built-ins resolve to statusMeta, custom columns to
    a neutral treatment carrying the column's own label. */
export function columnMeta(status: string, columns: BoardColumn[]): StatusMeta {
  const builtIn = statusMeta[status as TaskStatus];
  if (builtIn) return builtIn;
  const label = columns.find((c) => c.id === status)?.label;
  return { ...customColumnMeta, label: label || status };
}

/** Human label for any status id, tolerating ids whose column was deleted. */
export function columnLabel(status: string, columns: BoardColumn[]): string {
  return columnMeta(status, columns).label;
}

/** The board's full column sequence: persisted order first (skipping unknown
    ids), then anything not yet placed — built-ins and customs always end up
    present, defaults trailing if the layout predates them. */
export function fullColumnOrder(columns: BoardColumn[], order: string[] = []): string[] {
  const builtInSet = new Set<string>(STATUSES);
  const customIds = new Set(columns.map((c) => c.id));
  const placed = order.filter((id) => builtInSet.has(id) || customIds.has(id));
  const rest = [
    ...STATUSES,
    ...[...columns].sort((a, b) => a.order - b.order).map((c) => c.id),
  ].filter((id) => !placed.includes(id));
  return [...placed, ...rest];
}

/** Ordered board columns for the Kanban view, honoring the persisted layout.
    `isDefault` marks the immutable five. */
export function displayColumns(
  columns: BoardColumn[],
  order: string[] = [],
): { id: string; label: string; icon: LucideIcon; dot: string; isDefault: boolean }[] {
  const customById = new Map(columns.map((c) => [c.id, c]));
  return fullColumnOrder(columns, order).map((id) => {
    const builtIn = statusMeta[id as TaskStatus];
    if (builtIn) {
      return { id, label: builtIn.label, icon: builtIn.icon, dot: builtIn.dot, isDefault: true };
    }
    const custom = customById.get(id);
    return {
      id,
      label: custom?.label || id,
      icon: customColumnMeta.icon,
      dot: customColumnMeta.dot,
      isDefault: false,
    };
  });
}

/** Options for a status <Select>: built-ins first, then custom columns. */
export function columnOptions(
  columns: BoardColumn[],
): { value: string; label: string }[] {
  return [
    ...STATUSES.map((s) => ({ value: s, label: statusMeta[s].label })),
    ...[...columns]
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ value: c.id, label: c.label })),
  ];
}

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
