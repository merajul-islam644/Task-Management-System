import { blocksClient } from "@/lib/blocks/client";
import type { Activity, ActivityKind } from "@/types";

/**
 * The Blocks Notifier service: a per-user, server-side notification inbox.
 * Notifications survive sessions and devices — unlike the local Activity
 * trail, which only records what happened on this device.
 */

/** The project's notification configuration, created once with
    `blocks notification save --name TaskNotification --channel 0 --type 2
    --enable-persistence` — persistence is what lands items in the inbox. */
const NOTIFICATION_CONFIGURATION = "TaskNotification";
const PAGE_SIZE = 50;

/** What we embed in each notification's denormalizedPayload. */
export interface NotificationPayload {
  kind: ActivityKind;
  message: string;
  actorId?: string;
  taskId?: string;
  projectId?: string;
}

/** The signed-in user's inbox, newest first, mapped onto the shared Activity
    shape so the notification panel renders it like any other activity. */
export async function listNotifications(): Promise<Activity[]> {
  const res = await blocksClient.notifier.getNotifications({
    page: 1,
    pageSize: PAGE_SIZE,
    sortDescending: true,
  });
  return (res.notifications ?? [])
    .map((raw) => toActivity(raw))
    .filter((a): a is Activity => a !== null);
}

function toActivity(raw: Record<string, unknown>): Activity | null {
  const id = typeof raw.id === "string" ? raw.id : "";
  if (!id) return null;
  let payload: Partial<NotificationPayload> = {};
  if (typeof raw.denormalizedPayload === "string" && raw.denormalizedPayload) {
    try {
      payload = JSON.parse(raw.denormalizedPayload) as Partial<NotificationPayload>;
    } catch {
      // A plain-text payload is still worth showing.
      payload = { message: raw.denormalizedPayload };
    }
  }
  return {
    id,
    kind: payload.kind ?? "project_update",
    message: payload.message ?? "Notification",
    actorId: payload.actorId,
    taskId: payload.taskId,
    projectId: payload.projectId,
    createdAt:
      typeof raw.createdTime === "string" ? raw.createdTime : new Date().toISOString(),
    read: raw.isRead === true,
  };
}

/** Push a notification through the TaskNotification configuration. The
    sender's role needs `blocks-logic::notifier::send`. */
export async function sendTaskNotification(target: {
  userIds: string[];
  payload: NotificationPayload;
}): Promise<void> {
  await blocksClient.notifier.notify({
    configurationName: NOTIFICATION_CONFIGURATION,
    userIds: target.userIds,
    denormalizedPayload: JSON.stringify(target.payload),
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  await blocksClient.notifier.markNotificationAsRead({ id });
}

export async function markAllNotificationsRead(): Promise<void> {
  await blocksClient.notifier.markAllNotificationAsRead();
}
