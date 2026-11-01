import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isAfter, parseISO, startOfDay } from "date-fns";
import { FilterX, ListTodo, Plus, Search, Calendar, Columns3 } from "lucide-react";
import type { TaskPriority, TaskStatus } from "@/types";
import { PRIORITIES, STATUSES, priorityMeta, statusMeta } from "@/lib/meta";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { TaskRow } from "@/components/tasks/TaskRow";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { CalendarView } from "@/components/tasks/CalendarView";
import { cn } from "@/lib/utils";

type DueFilter = "" | "overdue" | "today" | "week" | "none";
type SortKey = "due" | "priority" | "created" | "title";
type View = "list" | "board" | "calendar";

export function TasksPage() {
  const tasks = useDataStore((s) => s.tasks);
  const status = useDataStore((s) => s.status);
  const projects = useDataStore((s) => s.projects);
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const [params, setParams] = useSearchParams();

  const view = (params.get("view") as View) || "list";
  const [query, setQuery] = useState("");
  const [fStatus, setFStatus] = useState<TaskStatus | "">("");
  const [fPriority, setFPriority] = useState<TaskPriority | "">("");
  const [fProject, setFProject] = useState("");
  const [fDue, setFDue] = useState<DueFilter>(((params.get("due") as DueFilter) || "") as DueFilter);
  const [sort, setSort] = useState<SortKey>("due");

  const setView = (v: View) => {
    setParams(v === "list" ? {} : { view: v }, { replace: true });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = startOfDay(new Date());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const list = tasks.filter((t) => {
      if (q && !`${t.title} ${t.description ?? ""} ${t.labels.join(" ")}`.toLowerCase().includes(q)) return false;
      if (fStatus && t.status !== fStatus) return false;
      if (fPriority && t.priority !== fPriority) return false;
      if (fProject && t.projectId !== fProject) return false;
      if (fDue) {
        const due = t.dueDate ? parseISO(t.dueDate) : undefined;
        if (fDue === "none" && due) return false;
        if (fDue === "overdue" && (!due || t.status === "done" || due >= today)) return false;
        if (fDue === "today" && (!due || due < today || due >= new Date(today.getTime() + 86400000))) return false;
        if (fDue === "week" && (!due || due < today || isAfter(due, weekEnd))) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      switch (sort) {
        case "due": {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        case "priority":
          return priorityMeta[a.priority].rank - priorityMeta[b.priority].rank;
        case "created":
          return b.createdAt.localeCompare(a.createdAt);
        case "title":
          return a.title.localeCompare(b.title);
      }
    });
  }, [tasks, query, fStatus, fPriority, fProject, fDue, sort]);

  const hasFilters = !!(query || fStatus || fPriority || fProject || fDue);
  const reset = () => {
    setQuery("");
    setFStatus("");
    setFPriority("");
    setFProject("");
    setFDue("");
    setSort("due");
  };

  const views: { value: View; label: string; icon: typeof ListTodo }[] = [
    { value: "list", label: "List", icon: ListTodo },
    { value: "board", label: "Board", icon: Columns3 },
    { value: "calendar", label: "Calendar", icon: Calendar },
  ];

  return (
    <div className="flex h-full min-w-0 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold tracking-[-0.02em]">My Tasks</h2>
          <p className="tnum mt-1 text-[13.5px] text-ink-2">
            {status === "ready" ? `${filtered.length} of ${tasks.length} tasks` : "Loading your workspace…"}
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => openTaskForm()}>
          <Plus size={15} strokeWidth={2.25} aria-hidden />
          Create task
        </Button>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-44 flex-1">
            <Search size={14} aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-3" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              aria-label="Search tasks"
              className="pl-8"
            />
          </div>

          <Select
            ariaLabel="Filter by status"
            placeholder="Status"
            value={fStatus}
            onValueChange={(v) => setFStatus(v as TaskStatus | "")}
            options={[
              { value: "", label: "All statuses" },
              ...STATUSES.map((s) => ({ value: s, label: statusMeta[s].label })),
            ]}
          />
          <Select
            ariaLabel="Filter by priority"
            placeholder="Priority"
            value={fPriority}
            onValueChange={(v) => setFPriority(v as TaskPriority | "")}
            options={[
              { value: "", label: "All priorities" },
              ...PRIORITIES.map((p) => ({ value: p, label: priorityMeta[p].label })),
            ]}
          />
          <Select
            ariaLabel="Filter by project"
            placeholder="Project"
            value={fProject}
            onValueChange={setFProject}
            options={[{ value: "", label: "All projects" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
          />
          <Select
            ariaLabel="Filter by due date"
            placeholder="Due"
            value={fDue}
            onValueChange={(v) => setFDue(v as DueFilter)}
            options={[
              { value: "", label: "Any due date" },
              { value: "overdue", label: "Overdue" },
              { value: "today", label: "Due today" },
              { value: "week", label: "Next 7 days" },
              { value: "none", label: "No due date" },
            ]}
          />
          <Select
            ariaLabel="Sort tasks"
            placeholder="Sort"
            value={sort}
            onValueChange={(v) => setSort(v as SortKey)}
            options={[
              { value: "due", label: "Sort: due date" },
              { value: "priority", label: "Sort: priority" },
              { value: "created", label: "Sort: newest" },
              { value: "title", label: "Sort: title" },
            ]}
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <FilterX size={13} aria-hidden />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* View switcher */}
      <div className="flex items-center justify-between gap-2">
        <div role="tablist" aria-label="Task view" className="inline-flex items-center gap-0.5 rounded-ctl border border-line bg-surface p-0.5">
          {views.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={view === v.value}
              onClick={() => setView(v.value)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2.5 text-[12.5px] font-medium transition-colors",
                view === v.value ? "bg-surface-hover text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]" : "text-ink-2 hover:text-ink",
              )}
            >
              <v.icon size={13} aria-hidden />
              {v.label}
            </button>
          ))}
        </div>
        {hasFilters && <span className="tnum text-[12px] text-ink-3">{filtered.length} matching</span>}
      </div>

      {/* Views */}
      {status === "loading" ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
        </div>
      ) : view === "list" ? (
        filtered.length === 0 ? (
          <div className="rounded-card border border-line bg-surface">
            <EmptyState
              icon={ListTodo}
              title="No tasks match"
              description="Try changing the search or filters — or create the task you're looking for."
              action={
                <div className="flex gap-2">
                  {hasFilters && (
                    <Button variant="secondary" size="sm" onClick={reset}>
                      Clear filters
                    </Button>
                  )}
                  <Button variant="primary" size="sm" onClick={() => openTaskForm()}>
                    <Plus size={13} aria-hidden /> New task
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <ul role="list" className="overflow-hidden rounded-card border border-line bg-surface">
            {filtered.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        )
      ) : view === "board" ? (
        <div className="min-h-0 flex-1">
          <KanbanBoard tasks={filtered} />
        </div>
      ) : (
        <CalendarView tasks={filtered} />
      )}
    </div>
  );
}
