import { blocksClient } from "@/lib/blocks/client";
import { assertSuccess } from "@/lib/blocks/envelope";
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

/**
 * Invite (provision) a user into this tenant with an initial role. A
 * tenant-mutating admin action — the settings screen's confirm dialog is the
 * human sign-off this call lives behind. Roles are slugs.
 */
export async function inviteUser(
  email: string,
  firstName: string,
  lastName: string,
  roles: string[],
): Promise<void> {
  const body: Record<string, unknown> = { email };
  if (firstName) body.firstName = firstName;
  if (lastName) body.lastName = lastName;
  if (roles.length > 0) body.roles = roles;
  assertSuccess(await blocksClient.iam.users.create(body));
}

/**
 * Make a user a member of an organization with a role there — IAM's
 * `users/access` grant. This is the ONLY membership path that works:
 * `organizationIds` on the user record is read-only via users.update, and a
 * grant "first adds the organization" before listing roles. Roles are slugs.
 */
export async function grantUserOrganizationRole(
  userId: string,
  organizationId: string,
  roles: string[],
): Promise<void> {
  assertSuccess(
    await blocksClient.iam.users.updateAccess({ userId, organizationId, roles }),
  );
}

/**
 * A user's DIRECT permissions (granted to the person, not through a role) in
 * one organization. `users.get` reports them as a per-org map
 * (`OrganizationsPermissions`); the flat `permissions` list on the same
 * record mirrors the active org's set — read the map first, fall back
 * defensively since IAM response shapes vary between versions.
 */
export async function listUserPermissionIds(
  userId: string,
  organizationId?: string,
): Promise<string[]> {
  const response = await blocksClient.iam.users.get(userId, organizationId ? { organizationId } : undefined);
  const record: Record<string, unknown> = response && typeof response === "object" ? (response as Record<string, unknown>) : {};
  const data: Record<string, unknown> =
    record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : record;
  const ids = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
  const perOrg = data.OrganizationsPermissions ?? data.organizationsPermissions;
  if (perOrg && typeof perOrg === "object") {
    const map = perOrg as Record<string, unknown>;
    const list = organizationId ? map[organizationId] : undefined;
    if (organizationId && Array.isArray(list)) return ids(list);
    // No org requested: union every org's set (dedup — the flat mirror repeats entries).
    const all = new Set<string>();
    for (const list of Object.values(map)) for (const id of ids(list)) all.add(id);
    return [...all];
  }
  return ids(data.permissions) || ids(data.Permissions);
}

/**
 * Overwrite a user's direct permission set in one organization. IAM's
 * `users/access` REPLACES a non-empty permissions list for that org (it is a
 * delta nowhere), so this takes the FULL new set. Roles are omitted — an
 * omitted list is kept for an existing member, so role-based grants stay
 * untouched and user-specific permissions layer on top of them.
 */
export async function setUserPermissions(
  userId: string,
  organizationId: string,
  permissionIds: string[],
): Promise<void> {
  assertSuccess(
    await blocksClient.iam.users.updateAccess({ userId, organizationId, permissions: permissionIds }),
  );
}
