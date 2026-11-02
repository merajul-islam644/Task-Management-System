import { blocksClient } from "@/lib/blocks/client";
import { assertSuccess } from "@/lib/blocks/envelope";

/**
 * Blocks IAM organizations layer — the read-and-switch surface only: the
 * signed-in user's own org list and the active-context switch. Creating or
 * editing organizations mutates tenant state (a tenant-isolation boundary),
 * so those calls stay out of this service and behind explicit human
 * confirmation wherever they eventually live.
 */

export interface MyOrganization {
  id: string;
  name: string;
}

export interface MyOrganizationsResult {
  organizations: MyOrganization[];
  /** The org the session is currently scoped to, when IAM marks one. */
  activeId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Org id spelling varies across IAM response versions; pick defensively. */
function orgId(org: Record<string, unknown>): string {
  return str(org.itemId) || str(org.ItemId) || str(org.organizationId) || str(org.OrganizationId) || str(org.id);
}

/** True when an org row marks itself as the session's active one. */
function isActiveFlag(org: Record<string, unknown>): boolean {
  return org.isActive === true || org.IsActive === true || org.isCurrent === true;
}

/** The signed-in user's organizations — the org switcher's data source. */
export async function listMyOrganizations(): Promise<MyOrganizationsResult> {
  const response = await blocksClient.iam.organizations.my();
  const record = isRecord(response) ? response : {};
  const raw = Array.isArray(record.organizations) ? record.organizations : [];
  const organizations: MyOrganization[] = [];
  let activeId = str(record.activeOrganizationId) || str(record.ActiveOrganizationId);
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = orgId(item);
    if (!id) continue;
    organizations.push({ id, name: str(item.name) || str(item.Name) || id });
    if (!activeId && isActiveFlag(item)) activeId = id;
  }
  return { organizations, activeId };
}

/**
 * Move the session to another organization. The cookie flow keeps no local
 * tokens: IAM re-issues the session cookie scoped to the new org server-side,
 * so the caller must refetch session claims and workspace data afterwards —
 * until it does, every in-memory list still shows the previous org's data.
 */
export async function switchOrganization(organizationId: string): Promise<void> {
  await blocksClient.auth.switchOrganization({ organizationId });
}

/** The signed-in user's identity bits that gate org UI: role slugs (e.g.
    only `clouduser` sees the create-organization control) and the session's
    ACTIVE organization id — `organizations/my` never marks one, so this is
    the only authoritative source for which org the session is scoped to. */
export async function fetchMyIdentity(): Promise<{ roles: string[]; activeOrganizationId: string }> {
  const response = await blocksClient.iam.me();
  const record = isRecord(response) ? response : {};
  const data = isRecord(record.data) ? record.data : {};
  return {
    roles: Array.isArray(data.roles)
      ? data.roles.filter((role): role is string => typeof role === "string")
      : [],
    activeOrganizationId: str(data.organizationId) || str(data.OrganizationId),
  };
}

/**
 * Create an organization record and return its id. This mutates tenant state
 * — the tenant-isolation boundary — so it belongs only behind an explicit
 * human action: the settings screen's confirm dialog, never an automatic
 * call. IAM does not add the creator as a member; the caller patches the
 * creator's `organizationIds` afterwards.
 */
export async function createOrganization(name: string, description = ""): Promise<string> {
  const body: Record<string, unknown> = { name };
  if (description) body.description = description;
  const response = await blocksClient.iam.organizations.create(body);
  assertSuccess(response);
  const record = isRecord(response) ? response : {};
  return str(record.itemId) || str(record.ItemId);
}
