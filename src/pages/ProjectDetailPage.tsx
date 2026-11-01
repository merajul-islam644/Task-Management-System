import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  Archive,
  ArchiveRestore,
  CalendarPlus,
  ChevronLeft,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react";
import { hueMeta, columnOptions, projectStatusMeta } from "@/lib/meta";
import type { ProjectStatus } from "@/types";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { toast } from "@/store/toast";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { ProgressBar } from "@/components/ui/Meters";
import { AvatarStack } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/DropdownMenu";
import { Select } from "@/components/ui/Select";
import { TaskRow } from "@/components/tasks/TaskRow";
import type { User } from "@/types";
import { dueLabel } from "@/lib/utils";

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const projects = useDataStore((s) => s.projects);
  const tasks = useDataStore((s) => s.tasks);
  const users = useDataStore((s) => s.users);
  const boardColumns = useDataStore((s) => s.boardColumns);
  const updateProject = useDataStore((s) => s.updateProject);
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const openProjectForm = useUiStore((s) => s.openProjectForm);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const project = projects.find((p) => p.id === projectId);

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === projectId),
    [tasks, projectId],
  );

  if (!project) {
    return (
      <div className="rounded-card border border-line bg-surface">
        <EmptyState
          icon={Archive}
          title="Project not found"
          description="It may have been archived or removed in this demo session."
          action={
            <Button variant="secondary" size="sm" onClick={() => navigate("/projects")}>
              Back to projects
            </Button>
          }
        />
      </div>
    );
  }

  const stats = {
    total: projectTasks.length,
    done: projectTasks.filter((t) => t.status === "done").length,
  };
  const pct = stats.total === 0 ? 0 : (stats.done / stats.total) * 100;
  const status = projectStatusMeta[project.status];
  const members = project.memberIds
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is User => u !== undefined);
  const visible = statusFilter ? projectTasks.filter((t) => t.status === statusFilter) : projectTasks;

  const setArchived = async (archived: boolean) => {
    try {
      await updateProject(project.id, { archived });
      toast.success(archived ? "Project archived" : "Project restored", project.name);
      if (archived) navigate("/projects");
    } catch {
      toast.error("Could not update the project", "Please try again.");
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div>
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-3 transition-colors hover:text-ink"
        >
          <ChevronLeft size={14} aria-hidden />
          Projects
        </button>

        {/* Project header */}
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-line bg-surface p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                aria-hidden
                className={`h-2.5 w-2.5 rounded-full ${hueMeta[project.color].dot}`}
              />
              <h2 className="text-[20px] font-semibold tracking-[-0.02em]">{project.name}</h2>
              <Badge className={status.chip}>{status.label}</Badge>
            </div>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-ink-2">{project.description}</p>
            <div className="tnum mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-3">
              <span>
                <span className="font-semibold text-ink-2">{stats.total - stats.done}</span> open
              </span>
              <span>
                <span className="font-semibold text-ink-2">{stats.done}</span> done
              </span>
              <span>{project.targetDate ? `Target ${dueLabel(project.targetDate)?.text}` : "No target date"}</span>
              <span>Started {format(new Date(project.createdAt), "d MMM yyyy")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AvatarStack users={members} size="sm" />
            <Menu>
              <MenuTrigger asChild>
                <IconButton label="Project actions" variant="secondary">
                  <MoreVertical size={15} />
                </IconButton>
              </MenuTrigger>
              <MenuContent>
                <MenuItem onSelect={() => openProjectForm(project.id)}>
                  <Pencil size={13} aria-hidden /> Edit details
                </MenuItem>
                <MenuItem
                  onSelect={() =>
                    void updateProject(project.id, { status: nextStatus(project.status) }).then(() =>
                      toast.success("Project status updated", project.name),
                    )
                  }
                >
                  <RefreshCw size={13} aria-hidden /> Cycle status
                </MenuItem>
                <MenuItem danger onSelect={() => void setArchived(!project.archived)}>
                  {project.archived ? <ArchiveRestore size={13} aria-hidden /> : <Archive size={13} aria-hidden />}
                  {project.archived ? "Restore project" : "Archive project"}
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </header>

        {/* Progress */}
        <div className="mt-3 flex items-center gap-3 rounded-card border border-line bg-surface px-5 py-4">
          <ProgressBar
            value={pct}
            label={`${project.name}: ${Math.round(pct)}% complete`}
            className="max-w-80"
          />
          <span className="tnum text-[12.5px] font-semibold text-ink-2">{Math.round(pct)}% complete</span>
        </div>
      </div>

      {/* Task list */}
      <section aria-label={`Tasks in ${project.name}`} className="overflow-hidden rounded-card border border-line bg-surface">
        <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <h3 className="mr-auto text-[13.5px] font-semibold">Tasks</h3>
          <Select
            ariaLabel="Filter tasks by status"
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[{ value: "", label: "All statuses" }, ...columnOptions(boardColumns)]}
          />
          <Button variant="secondary" size="sm" onClick={() => openTaskForm({ projectId: project.id })}>
            <Plus size={13} aria-hidden />
            Add task
          </Button>
        </header>
        {visible.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="No tasks here yet"
            description={`Add the first task to ${project.name}.`}
            action={
              <Button variant="primary" size="sm" onClick={() => openTaskForm({ projectId: project.id })}>
                <Plus size={13} aria-hidden /> Add task
              </Button>
            }
          />
        ) : (
          <ul role="list">
            {visible.map((task) => (
              <TaskRow key={task.id} task={task} showProject={false} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function nextStatus(current: ProjectStatus): ProjectStatus {
  const order: ProjectStatus[] = ["on_track", "at_risk", "paused"];
  return order[(order.indexOf(current) + 1) % order.length];
}
