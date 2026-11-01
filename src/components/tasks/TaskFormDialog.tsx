import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PRIORITIES, STATUSES, priorityMeta, statusMeta } from "@/lib/meta";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { toast } from "@/store/toast";
import type { TaskPriority, TaskStatus } from "@/types";

/** Create/edit task dialog. One instance, mounted app-wide. */
export function TaskFormDialog() {
  const { open, taskId, projectId, status, dueDate } = useUiStore((s) => s.taskForm);
  const close = useUiStore((s) => s.closeTaskForm);
  const tasks = useDataStore((s) => s.tasks);
  const projects = useDataStore((s) => s.projects);
  const users = useDataStore((s) => s.users);
  const currentUserId = useDataStore((s) => s.currentUserId);
  const createTask = useDataStore((s) => s.createTask);
  const updateTask = useDataStore((s) => s.updateTask);

  const editing = taskId ? tasks.find((t) => t.id === taskId) : undefined;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proj, setProj] = useState<string>("");
  const [stat, setStat] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState<string>(currentUserId);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(undefined);
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setProj(editing.projectId);
      setStat(editing.status);
      setPriority(editing.priority);
      setDue(editing.dueDate ? editing.dueDate.slice(0, 10) : "");
      setAssignee(editing.assigneeId ?? "");
    } else {
      setTitle("");
      setDescription("");
      setProj(projectId ?? projects[0]?.id ?? "");
      setStat((status as TaskStatus) ?? "todo");
      setPriority("medium");
      setDue(dueDate ? dueDate.slice(0, 10) : "");
      setAssignee(currentUserId);
    }
  }, [open, editing, projectId, status, dueDate, projects, currentUserId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) {
      setError("Give the task a title.");
      return;
    }
    setSaving(true);
    try {
      const patch = {
        title: clean,
        description: description.trim(),
        projectId: proj,
        status: stat,
        priority,
        dueDate: due ? new Date(`${due}T12:00:00`).toISOString() : undefined,
        assigneeId: assignee || undefined,
      };
      if (editing) {
        await updateTask(editing.id, patch);
        toast.success("Task updated", clean);
      } else {
        await createTask(patch);
        toast.success("Task created", clean);
      }
      close();
    } catch {
      toast.error("Could not save the task", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader
          title={editing ? "Edit task" : "New task"}
          description={editing ? undefined : "Add it to a project — you can move it later."}
        />
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <Field label="Title" htmlFor="task-title" error={error}>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(undefined);
              }}
              placeholder="e.g. Review the checkout flow"
              aria-invalid={!!error}
              aria-describedby={error ? "task-title-error" : undefined}
              autoFocus
            />
          </Field>

          <Field label="Description" htmlFor="task-desc" hint="Optional — context, links, acceptance criteria.">
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does done look like?"
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Project" htmlFor="task-project">
              <Select
                ariaLabel="Project"
                value={proj}
                onValueChange={setProj}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
              />
            </Field>
            <Field label="Assignee" htmlFor="task-assignee">
              <Select
                ariaLabel="Assignee"
                value={assignee}
                onValueChange={setAssignee}
                options={[
                  { value: "", label: "Unassigned" },
                  ...users.map((u) => ({ value: u.id, label: u.name })),
                ]}
              />
            </Field>
            <Field label="Status" htmlFor="task-status">
              <Select
                ariaLabel="Status"
                value={stat}
                onValueChange={(v) => setStat(v as TaskStatus)}
                options={STATUSES.map((s) => ({ value: s, label: statusMeta[s].label }))}
              />
            </Field>
            <Field label="Priority" htmlFor="task-priority">
              <Select
                ariaLabel="Priority"
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
                options={PRIORITIES.map((p) => ({ value: p, label: priorityMeta[p].label }))}
              />
            </Field>
            <Field label="Due date" htmlFor="task-due" className="col-span-2">
              <Input id="task-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
          </div>

          <div className="mt-1 flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
