import { blocksClient } from "@/lib/blocks/client";
import type { Activity, Project, ProjectInput, Subtask, Task, TaskInput } from "@/types";

/**
 * Blocks Data Gateway layer. One collection helper per schema; the query names
 * below are read from each schema's `querySchema` (the gateway pluralizes by
 * naive concatenation — `Activitys`, not `Activities`).
 */

const PAGE_SIZE = 200;

export const tasks = blocksClient.data.collection<Record<string, unknown>>("Task", {
  fields: [
    "title",
    "description",
    "status",
    "priority",
    "projectId",
    "assigneeId",
    "dueDate",
    "labels",
    "subtasks",
    "CreatedDate",
    "LastUpdatedDate",
  ],
});

export const projects = blocksClient.data.collection<Record<string, unknown>>("Project", {
  fields: [
    "name",
    "description",
    "status",
    "color",
    "targetDate",
    "memberIds",
    "archived",
    "CreatedDate",
  ],
});

export const activities = blocksClient.data.collection<Record<string, unknown>>("Activity", {
  fields: ["kind", "actorId", "taskId", "projectId", "message", "read", "CreatedDate"],
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optStr(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function iso(value: unknown): string {
  if (typeof value === "string" && value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Reads the new record's id out of an insert mutation response. The gateway
 * nests it under the mutation name: `{ data: { insertTask: { itemId } } }`.
 */
export function resultItemId(response: unknown): string {
  const record = isRecord(response) ? response : {};
  const direct = str(record.itemId);
  if (direct) return direct;
  const data = isRecord(record.data) ? record.data : {};
  const nested = str(data.itemId);
  if (nested) return nested;
  for (const value of Object.values(data)) {
    if (isRecord(value)) {
      const id = str(value.itemId);
      if (id) return id;
    }
  }
  return "";
}

/**
 * One page through the raw gateway. `collection.list` can't select nested Dto
 * fields (every field must be a bare GraphQL name), so callers with composite
 * fields hand-write their query and go through here.
 */
async function gatewayPage(
  queryName: string,
  query: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await blocksClient.data.graphql({ operationName: queryName, query, variables: { input } });
  return isRecord(response) ? response : {};
}

function unwrapGatewayPage(
  record: Record<string, unknown>,
  queryName: string,
): { items: Record<string, unknown>[]; total: number } {
  const firstError = record.errors;
  if (Array.isArray(firstError) && firstError.length > 0) {
    const message = isRecord(firstError[0]) && typeof firstError[0].message === "string" ? firstError[0].message : "Gateway query failed.";
    throw new Error(message);
  }
  const data = isRecord(record.data) ? record.data : {};
  const gateway = isRecord(data[queryName]) ? (data[queryName] as { items?: unknown[]; totalCount?: number }) : undefined;
  const items = (Array.isArray(gateway?.items) ? gateway.items : []).filter(isRecord);
  const total = typeof gateway?.totalCount === "number" ? gateway.totalCount : items.length;
  return { items, total };
}

async function paginate(
  queryName: string,
  fetchPage: (pageNo: number) => Promise<Record<string, unknown>>,
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let pageNo = 1;
  let totalCount = Number.POSITIVE_INFINITY;
  while (items.length < totalCount) {
    const { items: page, total } = unwrapGatewayPage(await fetchPage(pageNo), queryName);
    items.push(...page);
    totalCount = total;
    if (page.length === 0) break;
    pageNo += 1;
  }
  return items;
}

async function listRecords(
  collection: ReturnType<typeof blocksClient.data.collection<Record<string, unknown>>>,
  queryName: string,
): Promise<Record<string, unknown>[]> {
  return paginate(queryName, (pageNo) => collection.list({ pageNo, pageSize: PAGE_SIZE }).then((r) => (isRecord(r) ? r : {})));
}

// ---------- Record ↔ domain mappers ----------

function toSubtasks(value: unknown): Subtask[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const subtasks = value
    .filter(isRecord)
    .map((item) => ({ id: str(item.id), title: str(item.title), completed: item.completed === true }));
  return subtasks.length > 0 ? subtasks : undefined;
}

export function toTask(record: Record<string, unknown>): Task {
  return {
    id: str(record.ItemId) || str(record.itemId),
    title: str(record.title) || "Untitled task",
    description: optStr(record.description),
    status: (str(record.status) || "todo") as Task["status"],
    priority: (str(record.priority) || "medium") as Task["priority"],
    projectId: str(record.projectId),
    dueDate: optStr(record.dueDate),
    assigneeId: optStr(record.assigneeId),
    labels: strArray(record.labels),
    subtasks: toSubtasks(record.subtasks),
    createdAt: iso(record.CreatedDate),
    updatedAt: iso(record.LastUpdatedDate ?? record.CreatedDate),
  };
}

export function toProject(record: Record<string, unknown>): Project {
  return {
    id: str(record.ItemId) || str(record.itemId),
    name: str(record.name) || "Untitled project",
    description: str(record.description),
    status: (str(record.status) || "on_track") as Project["status"],
    color: (str(record.color) || "iris") as Project["color"],
    targetDate: optStr(record.targetDate),
    memberIds: strArray(record.memberIds),
    archived: record.archived === true,
    createdAt: iso(record.CreatedDate),
  };
}

export function toActivity(record: Record<string, unknown>): Activity {
  return {
    id: str(record.ItemId) || str(record.itemId),
    kind: (str(record.kind) || "project_update") as Activity["kind"],
    actorId: optStr(record.actorId),
    taskId: optStr(record.taskId),
    projectId: optStr(record.projectId),
    message: str(record.message),
    read: record.read === true,
    createdAt: iso(record.CreatedDate),
  };
}

// ---------- List ----------

/**
 * Task lists and reads are hand-written because `subtasks` is a nested Subtask
 * Dto and needs a selection set, which `collection.list` cannot express.
 */
const TASK_QUERY = `
query getTasks($input: DynamicQueryInput) {
  getTasks(input: $input) {
    items {
      ItemId
      title
      description
      status
      priority
      projectId
      assigneeId
      dueDate
      labels
      subtasks { id title completed }
      CreatedDate
      LastUpdatedDate
    }
    totalCount
    pageNo
    pageSize
    totalPages
    hasNextPage
    hasPreviousPage
  }
}`;

export async function listTasks(): Promise<Task[]> {
  const records = await paginate("getTasks", (pageNo) => gatewayPage("getTasks", TASK_QUERY, { pageNo, pageSize: PAGE_SIZE }));
  return records.map(toTask);
}

export async function listProjects(): Promise<Project[]> {
  return (await listRecords(projects, "getProjects")).map(toProject);
}

export async function listActivities(): Promise<Activity[]> {
  return (await listRecords(activities, "getActivitys")).map(toActivity);
}

export async function getTask(id: string): Promise<Task | undefined> {
  const record = await gatewayPage("getTasks", TASK_QUERY, {
    filter: JSON.stringify({ ItemId: id }),
    pageNo: 1,
    pageSize: 1,
  });
  const { items } = unwrapGatewayPage(record, "getTasks");
  const source = items.find((item) => str(item.ItemId) === id || str(item.itemId) === id);
  return source ? toTask(source) : undefined;
}

// ---------- Write payloads ----------

export function taskPayload(patch: TaskInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.description !== undefined) payload.description = patch.description || "";
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.priority !== undefined) payload.priority = patch.priority;
  if (patch.projectId !== undefined) payload.projectId = patch.projectId;
  if (patch.assigneeId !== undefined) payload.assigneeId = patch.assigneeId || "";
  if (patch.dueDate !== undefined) payload.dueDate = patch.dueDate || null;
  if (patch.labels !== undefined) payload.labels = patch.labels;
  if (patch.subtasks !== undefined) payload.subtasks = patch.subtasks;
  return payload;
}

export function projectPayload(patch: ProjectInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description || "";
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.color !== undefined) payload.color = patch.color;
  if (patch.targetDate !== undefined) payload.targetDate = patch.targetDate || null;
  if (patch.memberIds !== undefined) payload.memberIds = patch.memberIds;
  if (patch.archived !== undefined) payload.archived = patch.archived;
  return payload;
}

export function activityPayload(activity: Activity): Record<string, unknown> {
  return {
    kind: activity.kind,
    actorId: activity.actorId ?? "",
    taskId: activity.taskId ?? "",
    projectId: activity.projectId ?? "",
    message: activity.message,
    read: activity.read,
  };
}

// ---------- Local merges (kept in one place so services stay thin) ----------

/** Same clear-semantics as the old mock: omitted keeps, "" clears. */
export function mergeTask(prev: Task, patch: TaskInput): Task {
  const merged: Task = { ...prev, updatedAt: new Date().toISOString() };
  if (patch.title !== undefined) merged.title = patch.title;
  if (patch.description !== undefined) merged.description = patch.description || undefined;
  if (patch.status !== undefined) merged.status = patch.status;
  if (patch.priority !== undefined) merged.priority = patch.priority;
  if (patch.projectId !== undefined) merged.projectId = patch.projectId;
  if (patch.dueDate !== undefined) merged.dueDate = patch.dueDate || undefined;
  if (patch.assigneeId !== undefined) merged.assigneeId = patch.assigneeId || undefined;
  if (patch.labels !== undefined) merged.labels = patch.labels;
  if (patch.subtasks !== undefined) merged.subtasks = patch.subtasks;
  return merged;
}

export function mergeProject(prev: Project, patch: ProjectInput): Project {
  const merged: Project = { ...prev };
  if (patch.name !== undefined) merged.name = patch.name;
  if (patch.description !== undefined) merged.description = patch.description || "";
  if (patch.status !== undefined) merged.status = patch.status;
  if (patch.color !== undefined) merged.color = patch.color;
  if (patch.targetDate !== undefined) merged.targetDate = patch.targetDate || undefined;
  if (patch.memberIds !== undefined) merged.memberIds = patch.memberIds;
  if (patch.archived !== undefined) merged.archived = patch.archived;
  return merged;
}
