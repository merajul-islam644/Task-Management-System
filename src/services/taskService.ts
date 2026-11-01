import type { Activity, BoardColumn, Task, TaskInput } from "@/types";
import * as blocksData from "@/services/blocksData";
import { columnLabel } from "@/lib/meta";

/**
 * Task repository over the Blocks Data Gateway. Omitted patch fields keep
 * their stored value; "" clears (the gateway stores ""/null the same way).
 */

export async function listTasks(): Promise<Task[]> {
  return blocksData.listTasks();
}

export async function createTask(input: TaskInput): Promise<Task> {
  const result = await blocksData.tasks.create(blocksData.taskPayload(input));
  const now = new Date().toISOString();
  return {
    id: blocksData.resultItemId(result),
    title: input.title?.trim() ?? "Untitled task",
    description: input.description?.trim() || undefined,
    status: input.status ?? "todo",
    priority: input.priority ?? "medium",
    projectId: input.projectId ?? "",
    dueDate: input.dueDate || undefined,
    assigneeId: input.assigneeId || undefined,
    labels: input.labels ?? [],
    subtasks: input.subtasks,
    createdAt: now,
    updatedAt: now,
  };
}

export interface UpdateResult {
  task: Task;
  activity?: Activity;
}

export async function updateTask(
  id: string,
  patch: TaskInput,
  prev: Task,
  actorId: string,
  columns: BoardColumn[] = [],
): Promise<UpdateResult> {
  const activity: Activity | undefined =
    patch.status && patch.status !== prev.status
      ? {
          id: "",
          kind: "status_changed",
          actorId,
          taskId: id,
          projectId: prev.projectId,
          message: `moved “${prev.title}” to ${columnLabel(patch.status, columns)}.`,
          createdAt: new Date().toISOString(),
          read: true,
        }
      : undefined;

  const result = await blocksData.tasks.update(id, blocksData.taskPayload(patch));

  if (activity) {
    // The task update already succeeded; an activity-record failure shouldn't
    // roll it back — the inbox just misses one line.
    try {
      await blocksData.activities.create(blocksData.activityPayload(activity));
    } catch {
      // Inbox line is best-effort.
    }
  }

  return {
    task: { ...blocksData.mergeTask(prev, patch), id: blocksData.resultItemId(result) || id },
    activity,
  };
}

export async function deleteTask(id: string): Promise<void> {
  await blocksData.tasks.delete(id);
}

export async function getTask(id: string): Promise<Task | undefined> {
  return blocksData.getTask(id);
}
