import { blocksClient } from "@/lib/blocks/client";
import { assertSuccess } from "@/lib/blocks/envelope";

/**
 * IAM roles & permissions admin layer — the access-control skill's write side
 * as an in-app admin screen. Every mutating call here is legitimate only
 * behind the settings screen's explicit confirm dialogs; nothing in this
 * service runs on its own initiative.
 *
 * Field notes from the platform: roles are keyed by `slug` everywhere except
 * role item ids; permission assignment takes permission `itemId`s (not
 * resource strings); `assignPermissions` is a delta (add/remove), not a
 * full-set replace. Every IAM response shape is loosely typed, so extraction
 * stays defensive.
 */

export interface RoleInfo {
  itemId: string;
  name: string;
  slug: string;
  description: string;
  isBuiltIn: boolean;
}

export interface PermissionInfo {
  itemId: string;
  name: string;
  resource: string;
  resourceGroup: string;
  /** IAM ResourceType: 1 = Endpoint (gateway-enforced), 2 = FrontendAction (SPA gate). */
  type: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** List responses put rows on `.data` (SDK typing) — accept a few spellings. */
function rowsOf(response: unknown): Record<string, unknown>[] {
  const record = isRecord(response) ? response : {};
  for (const key of ["data", "items", "roles", "permissions"]) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }
  return [];
}

function toRole(raw: Record<string, unknown>): RoleInfo | null {
  const itemId = str(raw.itemId) || str(raw.ItemId);
  const name = str(raw.name) || str(raw.Name);
  if (!itemId || !name) return null;
  return {
    itemId,
    name,
    slug: str(raw.slug) || str(raw.Slug) || name.toLowerCase().replace(/\s+/g, "-"),
    description: str(raw.description),
    isBuiltIn: raw.isBuiltIn === true,
  };
}

function toPermission(raw: Record<string, unknown>): PermissionInfo | null {
  const itemId = str(raw.itemId) || str(raw.ItemId);
  if (!itemId) return null;
  return {
    itemId,
    name: str(raw.name) || str(raw.resource),
    resource: str(raw.resource),
    resourceGroup: str(raw.resourceGroup),
    type: num(raw.type),
  };
}

/** All role definitions in the tenant. */
export async function listRoles(): Promise<RoleInfo[]> {
  const response = await blocksClient.iam.roles.list({ pageNo: 1, pageSize: 100 });
  return rowsOf(response)
    .map(toRole)
    .filter((role): role is RoleInfo => role !== null);
}

/** Role slugs the signed-in admin may hand out — invite/role pickers populate
    from this, never from listRoles(), so nobody grants above their authority. */
export async function listAssignableRoleSlugs(): Promise<string[]> {
  const response = await blocksClient.iam.roles.assignable();
  const rows = Array.isArray(response) ? response.filter(isRecord) : rowsOf(response);
  const slugs = rows
    .map((row) => str(row.slug) || str(row.Slug) || (typeof row.name === "string" ? row.name : ""))
    .filter((slug) => slug.length > 0);
  // Some IAM versions answer with a plain string array instead of objects.
  if (slugs.length === 0 && Array.isArray(response)) {
    return response.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  return slugs;
}

/** The full permission catalog — the role editor's picker source. One call at
    pageSize 500: IAM serves the whole tenant catalog in a single read and
    IGNORES pageNo (page 2 re-serves page 1), so paginating here would either
    hang or silently drop rows. 500 covers this tenant's 220 with headroom. */
export async function listPermissions(): Promise<PermissionInfo[]> {
  const response = await blocksClient.iam.permissions.list({ pageNo: 1, pageSize: 500 });
  const seen = new Set<string>();
  const collected: PermissionInfo[] = [];
  for (const row of rowsOf(response)) {
    const permission = toPermission(row);
    if (permission && !seen.has(permission.itemId)) {
      seen.add(permission.itemId);
      collected.push(permission);
    }
  }
  return collected;
}

/** The permission itemIds a role currently holds — the manage-permissions
    dialog's initial checked state. IAM accepts a roles filter on the
    permissions list POST-read. */
export async function listRolePermissionIds(slug: string): Promise<string[]> {
  const response = await blocksClient.iam.permissions.list({ pageNo: 1, pageSize: 500, roles: [slug] });
  return rowsOf(response)
    .map((row) => str(row.itemId) || str(row.ItemId))
    .filter((id) => id.length > 0);
}

/** Define a role. `slug` is its stable key; derive a URL-safe one from the
    name unless the admin-facing form ever needs to override it. */
export async function createRole(name: string, description = ""): Promise<void> {
  const body: Record<string, unknown> = {
    name,
    slug: name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  };
  if (description) body.description = description;
  assertSuccess(await blocksClient.iam.roles.create(body));
}

/** Attach/detach permissions on a role — delta only, itemIds only. */
export async function assignRolePermissions(
  slug: string,
  addPermissions: string[],
  removePermissions: string[],
): Promise<void> {
  const body: Record<string, unknown> = { slug };
  if (addPermissions.length > 0) body.addPermissions = addPermissions;
  if (removePermissions.length > 0) body.removePermissions = removePermissions;
  assertSuccess(await blocksClient.iam.roles.assignPermissions(body));
}
