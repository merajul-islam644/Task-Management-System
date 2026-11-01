import { Fragment, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckSquare, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";
import { displayColumns, hueMeta } from "@/lib/meta";
import type { StatusMeta } from "@/lib/meta";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { toast } from "@/store/toast";
import { Avatar } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/DropdownMenu";
import { DueChip, PriorityChip } from "./chips";

/** One board column as rendered: built-ins and customs share this shape. */
interface BoardColumnView {
  id: string;
  label: string;
  icon: StatusMeta["icon"];
  dot: string;
  isDefault: boolean;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Please try again.";
}

/**
 * Kanban board. The five built-in columns are immutable; user-created columns
 * can be added before or after ANY column, renamed, and deleted (while empty).
 * The column sequence itself is persisted, so customs can sit between
 * built-ins. Cards drag between columns (HTML5 DnD); every card also has a
 * "Move to" menu so status changes never depend on dragging (a11y requirement).
 */
export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  /** Open add-column composer's index in the display order; null = closed. */
  const [composerAt, setComposerAt] = useState<number | null>(null);
  const boardColumns = useDataStore((s) => s.boardColumns);
  const columnOrder = useDataStore((s) => s.columnOrder);
  const updateTask = useDataStore((s) => s.updateTask);
  const openTaskForm = useUiStore((s) => s.openTaskForm);

  const columns = displayColumns(boardColumns, columnOrder);

  const moveTo = async (taskId: string, status: string) => {
    try {
      await updateTask(taskId, { status });
      if (status === "done") toast.success("Task completed");
    } catch {
      toast.error("Could not move the task", "Please try again.");
    }
  };

  return (
    <div className="-mx-4 flex h-full min-h-0 gap-3 overflow-x-auto px-4 pt-1 pb-4 sm:-mx-6 sm:px-6">
      {composerAt === 0 && <AddColumnCard position={0} onDone={() => setComposerAt(null)} />}
      {columns.map((column, i) => {        const columnTasks = tasks.filter((t) => t.status === column.id);
        const isOver = overColumn === column.id;
        return (
          <Fragment key={column.id}>
            <section
              aria-label={`${column.label} column, ${columnTasks.length} tasks`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverColumn(column.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverColumn(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setOverColumn(null);
                const id = dragId ?? e.dataTransfer.getData("text/plain");
                if (id) void moveTo(id, column.id);
                setDragId(null);
              }}
              className={cn(
                "flex min-w-[264px] flex-1 flex-col rounded-card border bg-canvas transition-colors",
                isOver ? "border-accent bg-accent-soft/40" : "border-line",
              )}
            >
              <ColumnHeader
                column={column}
                count={columnTasks.length}
                onAddTask={() => openTaskForm({ status: column.id })}
                onInsertBefore={() => setComposerAt(i)}
                onInsertAfter={() => setComposerAt(i + 1)}
              />

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
            {composerAt === i + 1 && <AddColumnCard position={i + 1} onDone={() => setComposerAt(null)} />}
          </Fragment>
        );
      })}
    </div>
  );
}

function ColumnHeader({
  column,
  count,
  onAddTask,
  onInsertBefore,
  onInsertAfter,
}: {
  column: BoardColumnView;
  count: number;
  onAddTask: () => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
}) {
  const renameColumn = useDataStore((s) => s.renameColumn);
  const deleteColumn = useDataStore((s) => s.deleteColumn);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(column.label);
  const savingRef = useRef(false);
  const Icon = column.icon;

  const saveRename = async () => {
    if (savingRef.current) return;
    const clean = draft.trim();
    setRenaming(false);
    if (!clean || clean === column.label) return;
    savingRef.current = true;
    try {
      await renameColumn(column.id, clean);
      toast.success("Column renamed", clean);
    } catch (error) {
      toast.error("Could not rename the column", errorMessage(error));
    } finally {
      savingRef.current = false;
    }
  };

  const remove = async () => {
    try {
      await deleteColumn(column.id);
      toast.success("Column deleted", column.label);
    } catch (error) {
      // Custom columns refuse to delete while tasks still sit in them.
      toast.error("Could not delete the column", errorMessage(error));
    }
  };

  return (
    <header className="flex items-center gap-2 px-3 pt-3 pb-2">
      <Icon size={13.5} aria-hidden className={column.dot} />
      {renaming ? (
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void saveRename()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void saveRename();
            }
            if (e.key === "Escape") {
              setRenaming(false);
              setDraft(column.label);
            }
          }}
          aria-label="Column name"
          autoFocus
          className="h-6 flex-1 px-1.5 text-[12.5px] font-semibold"
        />
      ) : (
        <h3 className="text-[12.5px] font-semibold text-ink">{column.label}</h3>
      )}
      <span className="tnum rounded-full bg-surface-hover px-1.5 text-[11px] font-medium text-ink-2">
        {count}
      </span>
      <IconButton
        label={`Add task to ${column.label}`}
        size="sm"
        className="ml-auto"
        onClick={onAddTask}
      >
        <Plus size={14} />
      </IconButton>
      {!renaming && (
        <Menu>
          <MenuTrigger asChild>
            <IconButton label={`Column options for ${column.label}`} size="sm">
              <MoreHorizontal size={14} />
            </IconButton>
          </MenuTrigger>
          <MenuContent>
            <MenuItem onSelect={onInsertBefore}>
              <ArrowLeft size={13} aria-hidden /> Insert column before
            </MenuItem>
            <MenuItem onSelect={onInsertAfter}>
              <ArrowRight size={13} aria-hidden /> Insert column after
            </MenuItem>
            {!column.isDefault && (
              <>
                <MenuSeparator />
                <MenuItem
                  onSelect={() => {
                    setDraft(column.label);
                    setRenaming(true);
                  }}
                >
                  <Pencil size={13} aria-hidden /> Rename column
                </MenuItem>
                <MenuItem danger onSelect={() => void remove()}>
                  <Trash2 size={13} aria-hidden /> Delete column
                </MenuItem>
              </>
            )}
          </MenuContent>
        </Menu>
      )}
    </header>
  );
}

/** Inline composer at a given spot in the column sequence. Enter adds,
    Escape cancels. */
function AddColumnCard({ position, onDone }: { position: number; onDone: () => void }) {
  const createColumn = useDataStore((s) => s.createColumn);
  const [draft, setDraft] = useState("");
  const savingRef = useRef(false);

  const submit = async () => {
    if (savingRef.current) return;
    const clean = draft.trim();
    if (!clean) {
      onDone();
      return;
    }
    savingRef.current = true;
    try {
      await createColumn(clean, position);
      toast.success("Column added", clean);
      onDone();
    } catch (error) {
      toast.error("Could not add the column", errorMessage(error));
    } finally {
      savingRef.current = false;
    }
  };

  const cancel = () => {
    setDraft("");
    onDone();
  };

  return (
    <div className="flex w-[264px] shrink-0 flex-col gap-2 self-start rounded-card border border-accent bg-canvas p-2">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
          if (e.key === "Escape") cancel();
        }}
        onBlur={() => void submit()}
        placeholder="Column name"
        aria-label="New column name"
        autoFocus
      />
      <div className="flex justify-end gap-1.5">
        <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={cancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => void submit()}>
          Add
        </Button>
      </div>
    </div>
  );
}

function TaskCard({ task, onDragStart }: { task: Task; onDragStart: () => void }) {
  const users = useDataStore((s) => s.users);
  const projects = useDataStore((s) => s.projects);
  const boardColumns = useDataStore((s) => s.boardColumns);
  const columnOrder = useDataStore((s) => s.columnOrder);
  const openTask = useUiStore((s) => s.openTask);
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const askDeleteTask = useUiStore((s) => s.askDeleteTask);
  const updateTask = useDataStore((s) => s.updateTask);

  const project = projects.find((p) => p.id === task.projectId);
  const assignee = users.find((u) => u.id === task.assigneeId);
  const subtasks = task.subtasks?.length ?? 0;
  const subtasksDone = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const done = task.status === "done";
  const moveTargets = displayColumns(boardColumns, columnOrder).filter((c) => c.id !== task.status);

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
            "min-w-0 flex-1 rounded-[4px] text-left text-[13px] leading-snug font-medium decoration-1 underline-offset-2 transition-colors hover:text-accent-ink hover:underline",
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
            {moveTargets.map((column) => {
              const Icon = column.icon;
              return (
                <MenuItem
                  key={column.id}
                  onSelect={() => {
                    void updateTask(task.id, { status: column.id }).then(() => {
                      if (column.id === "done") toast.success("Task completed", task.title);
                    });
                  }}
                >
                  <Icon size={13} aria-hidden className={column.dot} />
                  {column.label}
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
