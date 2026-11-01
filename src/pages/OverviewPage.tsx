import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight, ListTodo, Plus, Sparkles, Sun } from "lucide-react";
import type { Task } from "@/types";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { useDisplayName } from "@/app/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { TaskRow } from "@/components/tasks/TaskRow";
import { SummaryStrip } from "@/components/dashboard/SummaryStrip";
import { FocusPanel } from "@/components/dashboard/FocusPanel";
import { ProjectProgressPanel } from "@/components/dashboard/ProjectProgressPanel";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { greeting, parseDate } from "@/lib/utils";
import { priorityMeta } from "@/lib/meta";
import { Skeleton } from "@/components/ui/Feedback";

export function OverviewPage() {
  const tasks = useDataStore((s) => s.tasks);
  const status = useDataStore((s) => s.status);
  const displayName = useDisplayName();
  const setAiOpen = useUiStore((s) => s.setAiOpen);
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const navigate = useNavigate();

  const today = new Date();
  const isDue = (t: Task, d: Date) => t.dueDate && parseDate(t.dueDate) <= endOfDay(d);
  const openTasks = tasks.filter((t) => t.status !== "done");

  const overdue = openTasks.filter((t) => t.dueDate && parseDate(t.dueDate) < startOfDay(today));
  const dueToday = openTasks.filter((t) => isDue(t, today) && !(t.dueDate && parseDate(t.dueDate) < startOfDay(today)));
  const todaySorted = [...overdue, ...dueToday].sort(
    (a, b) => priorityMeta[a.priority].rank - priorityMeta[b.priority].rank,
  );
  const upcoming = openTasks
    .filter((t) => t.dueDate && parseDate(t.dueDate) > endOfDay(today))
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="tnum text-[12px] font-medium text-ink-3">{format(today, "EEEE, d MMMM yyyy")}</p>
          <h2 className="mt-0.5 text-[22px] font-semibold tracking-[-0.02em]">
            {greeting()}, {displayName.split(" ")[0]}
          </h2>
          <p className="mt-1 text-[13.5px] text-ink-2">Here's what's happening with your work.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="lg" onClick={() => setAiOpen(true)}>
            <Sparkles size={15} aria-hidden className="text-accent-ink" />
            Ask AI
          </Button>
          <Button variant="primary" size="lg" onClick={() => openTaskForm()}>
            <Plus size={15} strokeWidth={2.25} aria-hidden />
            Create task
          </Button>
        </div>
      </header>

      <SummaryStrip />

      {status === "loading" ? (
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="flex flex-col gap-5 xl:col-span-2">
            <Skeleton className="h-64 rounded-card" />
            <Skeleton className="h-40 rounded-card" />
          </div>
          <div className="flex flex-col gap-5">
            <Skeleton className="h-28 rounded-card" />
            <Skeleton className="h-48 rounded-card" />
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-3">
          {/* Today + Upcoming */}
          <div className="flex min-w-0 flex-col gap-5 xl:col-span-2">
            <section aria-label="Today" className="overflow-hidden rounded-card border border-line bg-surface">
              <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                <h3 className="flex items-center gap-2 text-[13.5px] font-semibold">
                  <Sun size={14} aria-hidden className="text-warn" />
                  Today
                  <span className="tnum text-[12px] font-normal text-ink-3">{todaySorted.length}</span>
                </h3>
                <Link to="/tasks?due=today" className="flex items-center gap-1 text-[12px] font-medium text-accent-ink hover:underline">
                  My Tasks <ArrowRight size={12} aria-hidden />
                </Link>
              </header>
              {todaySorted.length === 0 ? (
                <EmptyState
                  icon={Sun}
                  title="Nothing due today"
                  description="Enjoy the clear runway, or pull a task forward from the backlog."
                  action={
                    <Button variant="secondary" size="sm" onClick={() => navigate("/tasks")}>
                      Browse My Tasks
                    </Button>
                  }
                />
              ) : (
                <ul role="list">
                  {todaySorted.slice(0, 6).map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </ul>
              )}
            </section>

            <section aria-label="Upcoming" className="overflow-hidden rounded-card border border-line bg-surface">
              <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                <h3 className="text-[13.5px] font-semibold">Upcoming</h3>
              </header>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={ListTodo}
                  title="Nothing scheduled ahead"
                  description="Tasks with future due dates will appear here."
                />
              ) : (
                <ul role="list">
                  {upcoming.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Right rail */}
          <div className="flex min-w-0 flex-col gap-5">
            <FocusPanel />
            <ProjectProgressPanel />
            <ActivityFeed />
          </div>
        </div>
      )}
    </div>
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
