import { useMemo, useState } from "react";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight, CircleAlert, X } from "lucide-react";
import type { Task } from "@/types";
import { cn, formatFullDate } from "@/lib/utils";
import { hueMeta } from "@/lib/meta";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { Button, IconButton } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { TaskCheck } from "./TaskCheck";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

/** Month/week calendar backed by mock tasks. Selecting a day opens its tasks. */
export function CalendarView({ tasks }: { tasks: Task[] }) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const projects = useDataStore((s) => s.projects);
  const toggleDone = useDataStore((s) => s.toggleTaskDone);
  const openTask = useUiStore((s) => s.openTask);
  const openTaskForm = useUiStore((s) => s.openTaskForm);

  const days = useMemo(() => {
    if (mode === "week") {
      return eachDayOfInterval({
        start: startOfWeek(cursor, { weekStartsOn: 1 }),
        end: endOfWeek(cursor, { weekStartsOn: 1 }),
      });
    }
    const first = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const last = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: first, end: last });
  }, [cursor, mode]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = format(parseISO(task.dueDate), "yyyy-MM-dd");
      const list = map.get(key);
      if (list) list.push(task);
      else map.set(key, [task]);
    }
    return map;
  }, [tasks]);

  const forDay = (d: Date): Task[] => {
    const list = tasksByDay.get(format(d, "yyyy-MM-dd")) ?? [];
    return [...list].sort((a, b) => {
      if (!a.dueDate || !b.dueDate) return 0;
      return a.dueDate.localeCompare(b.dueDate);
    });
  };

  const periodLabel =
    mode === "month"
      ? format(cursor, "MMMM yyyy")
      : `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM")} – ${format(
          endOfWeek(cursor, { weekStartsOn: 1 }),
          "d MMM yyyy",
        )}`;

  const shift = (dir: 1 | -1) => {
    setCursor((c) => (mode === "month" ? (dir === 1 ? addMonths(c, 1) : subMonths(c, 1)) : dir === 1 ? addWeeks(c, 1) : subWeeks(c, 1)));
  };

  const selectedTasks = selected ? forDay(selected) : [];

  return (
    <div className="flex flex-col gap-3 xl:flex-row">
      <div className="min-w-0 flex-1">
        {/* Toolbar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="tnum mr-auto text-[15px] font-semibold tracking-[-0.01em]">{periodLabel}</h2>
          <div className="flex items-center gap-1">
            <IconButton label="Previous period" variant="secondary" size="sm" onClick={() => shift(-1)}>
              <ChevronLeft size={14} />
            </IconButton>
            <IconButton label="Next period" variant="secondary" size="sm" onClick={() => shift(1)}>
              <ChevronRight size={14} />
            </IconButton>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCursor(new Date());
                setSelected(new Date());
              }}
            >
              Today
            </Button>
          </div>
          <Segmented
            label="Calendar mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "month", label: "Month" },
              { value: "week", label: "Week" },
            ]}
          />
        </div>

        {/* Grid */}
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="grid grid-cols-7 border-b border-line">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-1.5 text-center text-[11px] font-medium text-ink-3">
                {d}
              </div>
            ))}
          </div>

          {mode === "month" ? (
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayTasks = forDay(day);
                const inMonth = isSameMonth(day, cursor);
                const selectedDay = selected ? isSameDay(day, selected) : false;
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelected(day)}
                    aria-label={`${formatFullDate(day)}, ${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"}`}
                    aria-pressed={selectedDay}
                    className={cn(
                      "flex min-h-[84px] flex-col items-stretch gap-1 border-r border-b border-line p-1.5 text-left transition-colors last:border-r-0",
                      "hover:bg-surface-hover/60 focus-visible:bg-surface-hover",
                      !inMonth && "bg-canvas/60",
                      selectedDay && "bg-accent-soft/50 ring-1 ring-inset ring-accent-soft-line",
                      "[&:nth-child(7n)]:border-r-0",
                    )}
                  >
                    <span className="flex items-center justify-between px-0.5">
                      <span
                        className={cn(
                          "tnum flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11.5px] font-medium",
                          isToday(day) ? "bg-accent-solid text-on-accent" : inMonth ? "text-ink-2" : "text-ink-3",
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="tnum text-[10px] text-ink-3">{dayTasks.length}</span>
                      )}
                    </span>
                    <span className="flex flex-col gap-0.5 overflow-hidden">
                      {dayTasks.slice(0, MAX_CHIPS).map((task) => {
                        const project = projects.find((p) => p.id === task.projectId);
                        return (
                          <span
                            key={task.id}
                            className={cn(
                              "flex items-center gap-1 truncate rounded-[4px] px-1 py-px text-[10.5px]",
                              task.status === "done" ? "text-ink-3 line-through" : "text-ink-2",
                            )}
                          >
                            <span
                              aria-hidden
                              className={cn("h-1.5 w-1.5 shrink-0 rounded-full", project ? hueMeta[project.color].dot : "bg-ink-3")}
                            />
                            <span className="hidden truncate sm:inline">{task.title}</span>
                          </span>
                        );
                      })}
                      {dayTasks.length > MAX_CHIPS && (
                        <span className="whitespace-nowrap px-1 text-[10px] font-medium text-accent-ink">
                          +{dayTasks.length - MAX_CHIPS}
                          <span className="hidden sm:inline"> more</span>
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-7">
              {days.map((day) => {
                const dayTasks = forDay(day);
                const selectedDay = selected ? isSameDay(day, selected) : false;
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-32 border-r border-b border-line p-1.5 last:border-r-0 sm:[&:nth-child(7)]:border-r-0",
                      selectedDay && "bg-accent-soft/40",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(day)}
                      aria-pressed={selectedDay}
                      className={cn(
                        "tnum mb-1 flex h-5 items-center gap-1 rounded-full px-1.5 text-[11.5px] font-medium",
                        isToday(day) ? "bg-accent-solid text-on-accent" : "text-ink-2 hover:bg-surface-hover",
                      )}
                    >
                      {format(day, "EEE d")}
                    </button>
                    <div className="flex flex-col gap-1">
                      {dayTasks.map((task) => {
                        const project = projects.find((p) => p.id === task.projectId);
                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => openTask(task.id)}
                            className={cn(
                              "flex items-center gap-1 truncate rounded-[5px] border border-line px-1.5 py-1 text-left text-[11px] transition-colors hover:bg-surface-hover",
                              task.status === "done" ? "text-ink-3 line-through" : "text-ink-2",
                            )}
                          >
                            <span
                              aria-hidden
                              className={cn("h-1.5 w-1.5 shrink-0 rounded-full", project ? hueMeta[project.color].dot : "bg-ink-3")}
                            />
                            <span className="truncate">{task.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Day panel */}
      {selected && (
        <aside
          aria-label={`Tasks for ${formatFullDate(selected)}`}
          className="w-full shrink-0 rounded-card border border-line bg-surface xl:w-72"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h3 className="text-[13px] font-semibold">{formatFullDate(selected)}</h3>
            <IconButton label="Close day panel" size="sm" onClick={() => setSelected(null)}>
              <X size={14} />
            </IconButton>
          </div>
          <div className="flex flex-col gap-1 p-2">
            {selectedTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <p className="text-[13px] font-medium text-ink-2">Nothing scheduled</p>
                <p className="text-xs text-ink-3">A clear day. Add work or protect the focus time.</p>
              </div>
            ) : (
              selectedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-2.5 rounded-ctl px-2 py-2 transition-colors hover:bg-surface-hover"
                >
                  <span className="mt-0.5">
                    <TaskCheck
                      done={task.status === "done"}
                      onToggle={() => void toggleDone(task.id)}
                      title={task.title}
                    />
                  </span>
                  <button
                    type="button"
                    onClick={() => openTask(task.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span
                      className={cn(
                        "block truncate text-[13px] font-medium",
                        task.status === "done" ? "text-ink-3 line-through" : "text-ink",
                      )}
                    >
                      {task.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-3">
                      {task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done" ? (
                        <>
                          <CircleAlert size={11} className="text-danger" aria-hidden />
                          Overdue
                        </>
                      ) : (
                        <>
                          <span
                            aria-hidden
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              hueMeta[projects.find((p) => p.id === task.projectId)?.color ?? "iris"].dot,
                            )}
                          />
                          {projects.find((p) => p.id === task.projectId)?.name}
                        </>
                      )}
                    </span>
                  </button>
                </div>
              ))
            )}
            <Button
              variant="secondary"
              size="sm"
              className="mt-1"
              onClick={() => openTaskForm({ dueDate: selected.toISOString() })}
            >
              <CalendarPlus size={13} aria-hidden />
              Add task on this day
            </Button>
          </div>
        </aside>
      )}
    </div>
  );
}
