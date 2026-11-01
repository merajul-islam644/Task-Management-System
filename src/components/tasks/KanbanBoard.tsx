import { useState } from "react";
import { CheckSquare, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { Task, TaskStatus } from "@/types";
import { cn } from "@/lib/utils";
import { STATUSES, hueMeta, statusMeta } from "@/lib/meta";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { toast } from "@/store/toast";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/DropdownMenu";
import { DueChip, PriorityChip } from "./chips";

/**
 * Kanban board. Cards drag between columns (HTML5 DnD); every card also has a
 * "Move to" menu so status changes never depend on dragging (a11y requirement).
 */
export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const updateTask = useDataStore((s) => s.updateTask);
  const openTaskForm = useUiStore((s) => s.openTaskForm);

  const moveTo = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTask(taskId, { status });
      if (status === "done") toast.success("Task completed");
    } catch {
      toast.error("Could not move the task", "Please try again.");
    }
  };

  return (
    <div className="-mx-4 flex h-full min-h-0 gap-3 overflow-x-auto px-4 pt-1 pb-4 sm:-mx-6 sm:px-6">
      {STATUSES.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        const meta = statusMeta[status];
        const isOver = overColumn === status;
        return (
          <section
            key={status}
            aria-label={`${meta.label} column, ${columnTasks.length} tasks`}
            onDragOver={(e) => {
              e.preventDefault();
              setOverColumn(status);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverColumn(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setOverColumn(null);
              const id = dragId ?? e.dataTransfer.getData("text/plain");
              if (id) void moveTo(id, status);
              setDragId(null);
            }}
            className={cn(
              "flex min-w-[188px] flex-1 flex-col rounded-card border bg-canvas transition-colors",
              isOver ? "border-accent bg-accent-soft/40" : "border-line",
            )}
          >
            <header className="flex items-center gap-2 px-3 pt-3 pb-2">
              <meta.icon size={13.5} aria-hidden className={meta.dot} />
              <h3 className="text-[12.5px] font-semibold text-ink">{meta.label}</h3>
              <span className="tnum rounded-full bg-surface-hover px-1.5 text-[11px] font-medium text-ink-2">
                {columnTasks.length}
              </span>
              <IconButton
                label={`Add task to ${meta.label}`}
                size="sm"
                className="ml-auto"
                onClick={() => openTaskForm({ status })}
              >
                <Plus size={14} />
              </IconButton>
            </header>

            <div className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {columnTasks.map((task) => (
                <TaskCard key={task.id} task={task} onDragStart={() => setDragId(task.id)} />
              ))}
              {columnTasks.length === 0 && (
                <p className="rounded-ctl border border-dashed border-line px-3 py-4 text-center text-[12px] text-ink-3">
                  Nothing here — drag a card over or add one.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TaskCard({ task, onDragStart }: { task: Task; onDragStart: () => void }) {
  const users = useDataStore((s) => s.users);
  const projects = useDataStore((s) => s.projects);
  const openTask = useUiStore((s) => s.openTask);
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const askDeleteTask = useUiStore((s) => s.askDeleteTask);
  const updateTask = useDataStore((s) => s.updateTask);

  const project = projects.find((p) => p.id === task.projectId);
  const assignee = users.find((u) => u.id === task.assigneeId);
  const subtasks = task.subtasks?.length ?? 0;
  const subtasksDone = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const done = task.status === "done";

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      className="group cursor-grab rounded-[9px] border border-line bg-surface p-2.5 shadow-[0_1px_2px_rgba(28,27,23,0.04)] transition-shadow hover:shadow-pop active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => openTask(task.id)}
          className={cn(
            "min-w-0 flex-1 text-left text-[13px] leading-snug font-medium",
            done ? "text-ink-3 line-through" : "text-ink",
          )}
        >
          {task.title}
        </button>
        <Menu>
          <MenuTrigger asChild>
            <IconButton label={`Actions for “${task.title}”`} size="sm" className="h-6 w-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100">
              <MoreHorizontal size={14} />
            </IconButton>
          </MenuTrigger>
          <MenuContent>
            <MenuLabel>Move to</MenuLabel>
            {STATUSES.filter((s) => s !== task.status).map((s) => {
              const Icon = statusMeta[s].icon;
              return (
                <MenuItem
                  key={s}
                  onSelect={() => {
                    void updateTask(task.id, { status: s }).then(() => {
                      if (s === "done") toast.success("Task completed", task.title);
                    });
                  }}
                >
                  <Icon size={13} aria-hidden className={statusMeta[s].dot} />
                  {statusMeta[s].label}
                </MenuItem>
              );
            })}
            <MenuSeparator />
            <MenuItem onSelect={() => openTaskForm({ taskId: task.id })}>
              <Pencil size={13} aria-hidden /> Edit task
            </MenuItem>
            <MenuItem danger onSelect={() => askDeleteTask(task.id)}>
              <Trash2 size={13} aria-hidden /> Delete task
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <PriorityChip priority={task.priority} />
        {project && (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11.5px] text-ink-2">
            <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", hueMeta[project.color].dot)} />
            <span className="truncate">{project.name}</span>
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <DueChip due={task.dueDate} done={done} />
          {subtasks > 0 && (
            <span className="tnum inline-flex items-center gap-1 text-[11px] text-ink-3">
              <CheckSquare size={11} aria-hidden />
              {subtasksDone}/{subtasks}
            </span>
          )}
        </div>
        {assignee && <Avatar user={assignee} size="xs" />}
      </div>
    </article>
  );
}
