import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";
import { displayColumns } from "@/lib/meta";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { toast } from "@/store/toast";
import { Avatar } from "@/components/ui/Avatar";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/DropdownMenu";
import { IconButton } from "@/components/ui/Button";
import { TaskCheck } from "./TaskCheck";
import { DueChip, PriorityChip, ProjectChip, StatusChip } from "./chips";

interface TaskRowProps {
  task: Task;
  /** Hide the project column inside a project's own task list. */
  showProject?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

/** One list row. Grid on desktop; stacked card under md. */
export function TaskRow({ task, showProject = true, onEdit, onDelete }: TaskRowProps) {
  const users = useDataStore((s) => s.users);
  const projects = useDataStore((s) => s.projects);
  const boardColumns = useDataStore((s) => s.boardColumns);
  const columnOrder = useDataStore((s) => s.columnOrder);
  const toggleDone = useDataStore((s) => s.toggleTaskDone);
  const updateTask = useDataStore((s) => s.updateTask);
  const openTask = useUiStore((s) => s.openTask);

  const project = projects.find((p) => p.id === task.projectId);
  const assignee = users.find((u) => u.id === task.assigneeId);
  const done = task.status === "done";
  const subtasks = task.subtasks?.length ?? 0;
  const subtasksDone = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const moveTargets = displayColumns(boardColumns, columnOrder).filter((c) => c.id !== task.status);
  // Default surfaces; the optional props let a page override them.
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const askDeleteTask = useUiStore((s) => s.askDeleteTask);

  const changeStatus = async (status: string) => {
    try {
      await updateTask(task.id, { status });
      if (status === "done") toast.success("Task completed", task.title);
    } catch {
      toast.error("Could not update the task", "Please try again.");
    }
  };

  const toggle = async () => {
    try {
      await toggleDone(task.id);
      if (!done) toast.success("Task completed", task.title);
    } catch {
      toast.error("Could not update the task", "Please try again.");
    }
  };

  return (
    <li className="group relative">
      <div
        className={cn(
          "grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 border-b border-line px-3 py-2 transition-colors md:gap-3",
          showProject
            ? "md:grid-cols-[auto_minmax(0,1fr)_132px_112px_92px_112px_auto]"
            : "md:grid-cols-[auto_minmax(0,1fr)_112px_92px_112px_auto]",
          "hover:bg-surface-hover/60",
        )}
      >
        <TaskCheck done={done} onToggle={toggle} title={task.title} />

        {/* Title + mobile meta */}
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => openTask(task.id)}
            className={cn(
              "block w-full truncate rounded-[4px] text-left text-[13.5px] font-medium transition-colors",
              done ? "text-ink-3 line-through" : "text-ink hover:text-accent-ink",
            )}
          >
            {task.title}
          </button>
          {subtasks > 0 && (
            <p className="tnum mt-0.5 text-[11px] text-ink-3 md:hidden">
              {subtasksDone}/{subtasks} subtasks
            </p>
          )}
          <div className="mt-1 flex items-center gap-2.5 md:hidden">
            <ProjectChip project={project} size="sm" />
            <StatusChip status={task.status} />
            <DueChip due={task.dueDate} done={done} />
          </div>
        </div>

        {/* Desktop columns */}
        {showProject && (
          <div className="hidden md:block">
            <ProjectChip project={project} />
          </div>
        )}
        <div className="hidden md:block">
          <StatusChip status={task.status} />
        </div>
        <div className="hidden md:block">
          <PriorityChip priority={task.priority} />
        </div>
        <div className="hidden md:block">
          <DueChip due={task.dueDate} done={done} compact />
        </div>

        <div className="flex items-center justify-end gap-1">
          {assignee && (
            <span className="mr-0.5 hidden sm:block">
              <Avatar user={assignee} size="sm" />
            </span>
          )}
          <Menu>
            <MenuTrigger asChild>
              <IconButton label={`Actions for “${task.title}”`} size="sm" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100">
                <MoreHorizontal size={15} />
              </IconButton>
            </MenuTrigger>
            <MenuContent>
              <MenuLabel>Move to</MenuLabel>
              {moveTargets.map((column) => {
                const Icon = column.icon;
                return (
                  <MenuItem key={column.id} onSelect={() => void changeStatus(column.id)}>
                    <Icon size={13} aria-hidden className={column.dot} />
                    {column.label}
                  </MenuItem>
                );
              })}
              <MenuSeparator />
              <MenuItem onSelect={() => (onEdit ? onEdit(task) : openTaskForm({ taskId: task.id }))}>
                <Pencil size={13} aria-hidden /> Edit task
              </MenuItem>
              <MenuItem danger onSelect={() => (onDelete ? onDelete(task) : askDeleteTask(task.id))}>
                <Trash2 size={13} aria-hidden /> Delete task
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>
    </li>
  );
}
