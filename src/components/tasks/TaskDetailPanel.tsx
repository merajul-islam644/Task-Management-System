import { format } from "date-fns";
import { CalendarClock, Pencil, Trash2 } from "lucide-react";
import { Dialog, SheetContent } from "@/components/ui/Dialog";
import { Button, IconButton } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Switch";
import { Select } from "@/components/ui/Select";
import { DueChip, ProjectChip } from "./chips";
import { TaskCheck } from "./TaskCheck";
import { PRIORITIES, STATUSES, priorityMeta, statusMeta } from "@/lib/meta";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/types";

/** Right-hand sheet with the full task: quick edits, subtasks, meta, delete. */
export function TaskDetailPanel() {
  const taskId = useUiStore((s) => s.taskDetailId);
  const close = useUiStore((s) => s.closeTask);
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const askDeleteTask = useUiStore((s) => s.askDeleteTask);
  const tasks = useDataStore((s) => s.tasks);
  const projects = useDataStore((s) => s.projects);
  const users = useDataStore((s) => s.users);
  const updateTask = useDataStore((s) => s.updateTask);
  const toggleDone = useDataStore((s) => s.toggleTaskDone);

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const project = projects.find((p) => p.id === task.projectId);
  const done = task.status === "done";
  const subtasks = task.subtasks ?? [];
  const subtasksDone = subtasks.filter((s) => s.completed).length;

  const change = async (patch: Parameters<typeof updateTask>[1], successMessage?: string) => {
    try {
      await updateTask(task.id, patch);
      if (successMessage) toast.success(successMessage, task.title);
    } catch {
      toast.error("Could not update the task", "Please try again.");
    }
  };

  const toggleSubtask = async (subtaskId: string) => {
    const next = subtasks.map((s) => (s.id === subtaskId ? { ...s, completed: !s.completed } : s));
    await change({ subtasks: next });
  };

  return (
    <Dialog open={!!taskId} onOpenChange={(o) => !o && close()}>
      <SheetContent label="Task details" width="md">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <span className="mt-0.5">
            <TaskCheck done={done} onToggle={() => void toggleDone(task.id)} title={task.title} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className={cn("text-[15.5px] leading-snug font-semibold tracking-[-0.01em]", done && "text-ink-3 line-through")}>
              {task.title}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <ProjectChip project={project} size="sm" />
              <DueChip due={task.dueDate} done={done} />
            </div>
          </div>
          <IconButton label="Edit task" size="sm" onClick={() => openTaskForm({ taskId: task.id })}>
            <Pencil size={14} />
          </IconButton>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
          {task.description ? (
            <p className="text-[13px] leading-relaxed text-ink-2">{task.description}</p>
          ) : null}

          {/* Quick-change fields */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select
                ariaLabel="Status"
                value={task.status}
                onValueChange={(v) => void change({ status: v as TaskStatus })}
                options={STATUSES.map((s) => ({ value: s, label: statusMeta[s].label }))}
                className="w-full"
              />
            </Field>
            <Field label="Priority">
              <Select
                ariaLabel="Priority"
                value={task.priority}
                onValueChange={(v) => void change({ priority: v as TaskPriority })}
                options={PRIORITIES.map((p) => ({ value: p, label: priorityMeta[p].label }))}
                className="w-full"
              />
            </Field>
            <Field label="Assignee">
              <Select
                ariaLabel="Assignee"
                value={task.assigneeId ?? ""}
                onValueChange={(v) => void change({ assigneeId: v || undefined })}
                options={[
                  { value: "", label: "Unassigned" },
                  ...users.map((u) => ({ value: u.id, label: u.name })),
                ]}
                className="w-full"
              />
            </Field>
            <Field label="Project">
              <Select
                ariaLabel="Project"
                value={task.projectId}
                onValueChange={(v) => void change({ projectId: v })}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                className="w-full"
              />
            </Field>
          </div>

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <section aria-label="Subtasks">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[12.5px] font-semibold text-ink-2">
                  Subtasks{" "}
                  <span className="tnum font-normal text-ink-3">
                    {subtasksDone}/{subtasks.length}
                  </span>
                </h3>
              </div>
              <ul className="flex flex-col gap-1">
                {subtasks.map((sub) => (
                  <li key={sub.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-ctl px-1.5 py-1.5 text-[13px] transition-colors hover:bg-surface-hover">
                      <Checkbox
                        checked={sub.completed}
                        onCheckedChange={() => void toggleSubtask(sub.id)}
                        aria-label={sub.title}
                      />
                      <span className={cn(sub.completed ? "text-ink-3 line-through" : "text-ink")}>
                        {sub.title}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Labels */}
          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-line bg-surface-hover px-2 py-px text-[11.5px] font-medium text-ink-2"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Meta */}
          <dl className="flex flex-col gap-1.5 border-t border-line pt-4 text-[12px] text-ink-3">
            <div className="flex items-center justify-between">
              <dt>Created</dt>
              <dd className="tnum">{format(new Date(task.createdAt), "d MMM yyyy, HH:mm")}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Updated</dt>
              <dd className="tnum">{format(new Date(task.updatedAt), "d MMM yyyy, HH:mm")}</dd>
            </div>
          </dl>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-line px-5 py-3">
          <Button variant="danger" size="sm" onClick={() => askDeleteTask(task.id)}>
            <Trash2 size={13} aria-hidden />
            Delete
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {!done && (
              <Button variant="soft" size="sm" onClick={() => void toggleDone(task.id)}>
                <CalendarClock size={13} aria-hidden />
                Mark complete
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={close}>
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11.5px] font-medium text-ink-3">{label}</span>
      {children}
    </div>
  );
}
