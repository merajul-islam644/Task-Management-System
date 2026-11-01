import type { Activity } from "@/types";
import * as blocksData from "@/services/blocksData";

/** Activity-inbox repository over the Blocks Data Gateway. */

export async function listActivities(): Promise<Activity[]> {
  return blocksData.listActivities();
}

export async function createActivity(activity: Activity): Promise<void> {
  await blocksData.activities.create(blocksData.activityPayload(activity));
}

export async function markActivityRead(id: string): Promise<void> {
  await blocksData.activities.update(id, { read: true });
}

export async function markAllActivitiesRead(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => blocksData.activities.update(id, { read: true })));
}
