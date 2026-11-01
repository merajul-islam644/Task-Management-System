/** API-shaped types. Keep these stable — a backend will implement them later. */

export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done";

/** A custom board column added by the user. Tasks reference it by `id`. */
export interface BoardColumn {
  /** Stable id stored on Task.status; never collides with a TaskStatus value. */
  id: string;
  label: string;
  /** Sort position after the built-in columns. */
  order: number;
  /** Blocks record id, set once the column is persisted. */
  itemId?: string;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  /** A built-in TaskStatus, or the id of a custom board column. */
  status: string;
  priority: TaskPriority;
  projectId: string;
  /** ISO date-time, or undefined when unscheduled */
  dueDate?: string;
  assigneeId?: string;
  labels: string[];
  subtasks?: Subtask[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = "on_track" | "at_risk" | "paused";
export type HueName = "iris" | "teal" | "amber" | "rose" | "green";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  color: Exclude<HueName, "green">;
  targetDate?: string;
  memberIds: string[];
  createdAt: string;
  /** Client-side archive. Nothing is deleted. */
  archived?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  hue: HueName;
}

export type ActivityKind =
  | "assigned"
  | "due_soon"
  | "comment"
  | "mention"
  | "status_changed"
  | "completed"
  | "project_update";

export interface Activity {
  id: string;
  kind: ActivityKind;
  actorId?: string;
  taskId?: string;
  projectId?: string;
  message: string;
  createdAt: string;
  read: boolean;
}

/** A single task proposed by the (simulated) AI assistant. */
export interface AISuggestedTask {
  id: string;
  title: string;
  priority: TaskPriority;
  /** Days from today; undefined = no due date */
  dueInDays?: number;
  projectId?: string;
  rationale?: string;
}

export interface AIResponse {
  headline: string;
  summary: string;
  suggestions: AISuggestedTask[];
}

/** Input for creating/updating a task (omits server-managed fields). */
export type TaskInput = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "status"
    | "priority"
    | "projectId"
    | "dueDate"
    | "assigneeId"
    | "labels"
    | "subtasks"
  >
>;

export type ProjectInput = Partial<
  Pick<
    Project,
    | "name"
    | "description"
    | "status"
    | "color"
    | "targetDate"
    | "memberIds"
    | "archived"
  >
>;
