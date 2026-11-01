import { useNavigate } from "react-router-dom";
import { isAfter, parseISO, startOfWeek } from "date-fns";
import { AlarmClock, CircleCheck, CircleAlert, ListTodo } from "lucide-react";
import { useDataStore } from "@/store/data";
import { cn } from "@/lib/utils";

/** The four headline numbers. One surface, hairline dividers, no card grid. */
export function SummaryStrip() {
  const tasks = useDataStore((s) => s.tasks);
  const currentUserId = useDataStore((s) => s.currentUserId);
  const navigate = useNavigate();

  const mine = tasks;
  const open = mine.filter((t) => t.status !== "done");
  const today = new Date();
  const dueToday = open.filter((t) => t.dueDate && isSameDay(parseISO(t.dueDate), today));
  const overdue = open.filter((t) => t.dueDate && parseISO(t.dueDate) < today && !isSameDay(parseISO(t.dueDate), today));
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const completedThisWeek = mine.filter(
    (t) => t.status === "done" && t.updatedAt && isAfter(parseISO(t.updatedAt), weekStart),
  );

  const cells = [
    {
      label: "My open tasks",
      value: open.filter((t) => t.assigneeId === currentUserId).length,
      note: `${open.length} across the workspace`,
      icon: ListTodo,
      tone: "text-ink-3",
      to: "/tasks",
    },
    {
      label: "Due today",
      value: dueToday.length,
      note: dueToday.length > 0 ? "Block time before the day fills" : "Nothing scheduled today",
      icon: AlarmClock,
      tone: "text-accent-ink",
      to: "/tasks?due=today",
    },
    {
      label: "Completed this week",
      value: completedThisWeek.length,
      note: "Since Monday",
      icon: CircleCheck,
      tone: "text-ok",
      to: "/tasks",
    },
    {
      label: "Overdue",
      value: overdue.length,
      note: overdue.length > 0 ? "Reschedule or close these first" : "All clear",
      icon: CircleAlert,
      tone: overdue.length > 0 ? "text-danger" : "text-ink-3",
      to: "/tasks?due=overdue",
    },
  ];

  return (
    <section aria-label="This week at a glance" className="grid grid-cols-2 divide-line rounded-card border border-line bg-surface lg:grid-cols-4 lg:divide-x">
      {cells.map((cell) => (
        <button
          key={cell.label}
          type="button"
          onClick={() => navigate(cell.to)}
          className="group flex flex-col items-start gap-1 px-4 py-3.5 text-left transition-colors first:rounded-tl-card first:rounded-bl-card hover:bg-surface-hover/60 last:rounded-tr-card last:rounded-br-card lg:[&:nth-child(3)]:rounded-none"
        >
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-2">
            <cell.icon size={13} strokeWidth={2} aria-hidden className={cell.tone} />
            {cell.label}
          </span>
          <span className="tnum text-[24px] leading-7 font-semibold tracking-[-0.02em] group-hover:text-accent-ink">
            {cell.value}
          </span>
          <span className={cn("text-[11.5px] text-ink-3")}>{cell.note}</span>
        </button>
      ))}
    </section>
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}
