import { blocksClient } from "@/lib/blocks/client";
import type { HueName, User } from "@/types";

/**
 * Workspace members, read from IAM — the people tasks can be assigned to and
 * notifications can be pushed to. The signed-in user is one of them; teammates
 * appear here as soon as they are provisioned in the tenant.
 */

const PAGE_SIZE = 50;
const HUES: HueName[] = ["iris", "teal", "amber", "rose", "green"];

/** Stable avatar color per user, derived from their id. */
function hueFor(id: string): HueName {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return HUES[hash % HUES.length];
}

/** IAM returns roles as a slug array on some endpoints and a map like
    `{ default: ["clouduser"] }` on others — normalize defensively. */
function firstRole(raw: unknown): string {
  const flat = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? Object.values(raw as Record<string, unknown>).flat()
      : [];
  const slug = flat.find((role): role is string => typeof role === "string" && role.length > 0);
  // "clouduser" is IAM's default member role slug; the UI says "Member".
  return slug === "clouduser" ? "Member" : (slug ?? "Member");
}

function toUser(raw: Record<string, unknown>): User | null {
  const id = typeof raw.itemId === "string" ? raw.itemId : "";
  if (!id) return null;
  const email = typeof raw.email === "string" ? raw.email : "";
  const name =
    [raw.firstName, raw.lastName]
      .filter((part): part is string => typeof part === "string")
      .join(" ")
      .trim() ||
    email.split("@")[0] ||
    "User";
  return { id, name, email, role: firstRole(raw.roles), hue: hueFor(id) };
}

/** All IAM members of this tenant. */
export async function listWorkspaceUsers(): Promise<User[]> {
  const res = await blocksClient.iam.users.list({ pageNo: 1, pageSize: PAGE_SIZE });
  return (res.data ?? [])
    .map((member) => toUser(member as Record<string, unknown>))
    .filter((user): user is User => user !== null);
}
