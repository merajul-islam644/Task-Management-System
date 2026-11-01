import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { hueMeta, projectStatusMeta } from "@/lib/meta";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types";

const COLORS = ["iris", "teal", "amber", "rose"] as const;
type ProjectColor = (typeof COLORS)[number];

/** Create/edit project dialog, mounted app-wide. */
export function ProjectFormDialog() {
  const { open, projectId } = useUiStore((s) => s.projectForm);
  const close = useUiStore((s) => s.closeProjectForm);
  const projects = useDataStore((s) => s.projects);
  const users = useDataStore((s) => s.users);
  const currentUserId = useDataStore((s) => s.currentUserId);
  const createProject = useDataStore((s) => s.createProject);
  const updateProject = useDataStore((s) => s.updateProject);

  const editing = projects.find((p) => p.id === projectId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("on_track");
  const [color, setColor] = useState<ProjectColor>("iris");
  const [members, setMembers] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setDescription(editing.description);
        setStatus(editing.status);
        setColor(editing.color);
        setMembers([...editing.memberIds]);
        setTarget(editing.targetDate ? format(parseISO(editing.targetDate), "yyyy-MM-dd") : "");
      } else {
        setName("");
        setDescription("");
        setStatus("on_track");
        setColor(pickFreeColor(projects));
        setMembers([currentUserId]);
        setTarget("");
      }
      setError(undefined);
    }
    // Reset from the project snapshot at open time only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const toggleMember = (id: string) => {
    setMembers((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setError("Give the project a name.");
      return;
    }
    setSaving(true);
    try {
      const patch = {
        name: clean,
        description: description.trim(),
        status,
        color,
        memberIds: members.length > 0 ? members : [currentUserId],
        targetDate: target ? new Date(`${target}T12:00:00`).toISOString() : undefined,
      };
      if (editing) {
        await updateProject(editing.id, patch);
        toast.success("Project updated", clean);
      } else {
        await createProject(patch);
        toast.success("Project created", clean);
      }
      close();
    } catch {
      toast.error(editing ? "Could not update the project" : "Could not create the project", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader
          title={editing ? "Edit project" : "New project"}
          description={editing ? "Update the details — tasks stay put." : "Group tasks, people, and a target date."}
        />
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 px-5 py-4">
          <Field label="Name" htmlFor="project-name" error={error}>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(undefined);
              }}
              placeholder="e.g. Onboarding revamp"
              aria-invalid={!!error}
              aria-describedby={error ? "project-name-error" : undefined}
              autoFocus
            />
          </Field>

          <Field label="Description" htmlFor="project-desc">
            <Textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project trying to achieve?"
              rows={2}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status" htmlFor="project-status">
              <Select
                ariaLabel="Project status"
                value={status}
                onValueChange={(v) => setStatus(v as ProjectStatus)}
                options={(Object.keys(projectStatusMeta) as ProjectStatus[]).map((s) => ({
                  value: s,
                  label: projectStatusMeta[s].label,
                }))}
              />
            </Field>
            <Field label="Target date" htmlFor="project-target">
              <Input id="project-target" type="date" value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
          </div>

          <Field label="Color" htmlFor="project-color" hint="Used for the project's dots in lists and the calendar.">
            <div id="project-color" className="flex gap-2" role="radiogroup" aria-label="Project color">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={`${c} dot`}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    hueMeta[c].dot,
                    color === c ? "border-ink scale-110" : "border-transparent hover:scale-105",
                  )}
                />
              ))}
            </div>
          </Field>

          <Field label="Team" htmlFor="project-team" hint="Who should this appear for?">
            <div id="project-team" className="flex flex-wrap gap-1.5">
              {users.map((user) => {
                const active = members.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleMember(user.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[12px] font-medium transition-colors",
                      active
                        ? "border-accent-soft-line bg-accent-soft text-accent-ink"
                        : "border-line bg-surface text-ink-2 hover:bg-surface-hover",
                    )}
                  >
                    <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", hueMeta[user.hue].dot)} />
                    {user.name}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="mt-1 flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function pickFreeColor(projects: { color: string }[]): ProjectColor {
  const used = new Set(projects.map((p) => p.color));
  return COLORS.find((c) => !used.has(c)) ?? "iris";
}
