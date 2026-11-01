import {
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from "date-fns";
import { twMerge } from "tailwind-merge";

/** Classnames joiner; later classes win conflicts (e.g. `hidden` over `inline-flex`). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return twMerge(parts.filter(Boolean).join(" "));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function uid(prefix = "t"): string {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${raw}`;
}

/* ------------------------------------------------------------------ dates */

export function isoDay(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** A date `days` from today at a specific local time. */
export function dayAt(daysFromToday: number, hours = 17, minutes = 0): string {
  const d = startOfToday();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export function parseDate(value: string): Date {
  return parseISO(value);
}

export interface DueLabel {
  text: string;
  tone: "overdue" | "today" | "soon" | "normal";
}

interface DueLabelOptions {
  /** Shorter strings that fit dense table columns. */
  compact?: boolean;
  /** Completed tasks read as past ("2d ago") instead of owed ("2d overdue"). */
  done?: boolean;
}

/** Human due-date label; overdue/today states carry a tone for icon+color. */
export function dueLabel(due?: string, options?: DueLabelOptions): DueLabel | null {
  if (!due) return null;
  const date = parseDate(due);
  const days = differenceInCalendarDays(date, new Date());
  const { compact = false, done = false } = options ?? {};

  if (isToday(date)) {
    if (done || compact) return { text: "Today", tone: done ? "normal" : "today" };
    return { text: `Today, ${format(date, "HH:mm")}`, tone: "today" };
  }
  if (isTomorrow(date)) {
    if (done || compact) return { text: "Tomorrow", tone: done ? "normal" : "soon" };
    return { text: `Tomorrow, ${format(date, "HH:mm")}`, tone: "soon" };
  }
  if (isYesterday(date)) {
    return { text: "Yesterday", tone: done ? "normal" : "overdue" };
  }
  if (days < -1) {
    return done
      ? { text: `${Math.abs(days)}d ago`, tone: "normal" }
      : { text: compact ? `${Math.abs(days)}d overdue` : `${Math.abs(days)} days overdue`, tone: "overdue" };
  }
  if (days > 1 && days < 7) {
    return { text: compact ? format(date, "EEE d MMM") : format(date, "EEE, d MMM"), tone: "normal" };
  }
  return { text: format(date, "d MMM yyyy"), tone: "normal" };
}

export function formatFullDate(date: Date): string {
  return format(date, "EEEE, d MMMM yyyy");
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
