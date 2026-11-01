import { blocksClient } from "@/lib/blocks/client";

/**
 * Profile-avatar repository. The image bytes live in Blocks Storage (`Default`
 * Azure configuration); the UserProfile Data record maps each IAM user to the
 * file id of their current picture. Replaced pictures are soft-deleted.
 */

const CONFIGURATION_NAME = "Default";
const MAX_FILE_BYTES = 5 * 1024 * 1024; // storage config's 50 MB cap is generous; avatars don't need it

const userProfiles = blocksClient.data.collection<Record<string, unknown>>("UserProfile", {
  fields: ["userId", "email", "avatarFileId"],
});

export const AVATAR_MAX_FILE_BYTES = MAX_FILE_BYTES;

interface ProfileRow {
  itemId: string;
  userId: string;
  email: string;
  avatarFileId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function listProfiles(): Promise<ProfileRow[]> {
  const rows: ProfileRow[] = [];
  let pageNo = 1;
  let totalCount = Number.POSITIVE_INFINITY;
  while (rows.length < totalCount) {
    const response = await userProfiles.list({ pageNo, pageSize: 200 });
    const record = isRecord(response) ? response : {};
    const data = isRecord(record.data) ? record.data : {};
    const gateway = isRecord(data.getUserProfiles) ? (data.getUserProfiles as { items?: unknown[]; totalCount?: number }) : undefined;
    const page = Array.isArray(gateway?.items) ? gateway.items : [];
    const total = typeof gateway?.totalCount === "number" ? gateway.totalCount : page.length;
    for (const item of page) {
      if (!isRecord(item)) continue;
      rows.push({
        itemId: str(item.ItemId) || str(item.itemId),
        userId: str(item.userId),
        email: str(item.email),
        avatarFileId: str(item.avatarFileId),
      });
    }
    totalCount = total;
    if (page.length === 0) break;
    pageNo += 1;
  }
  return rows;
}

/** File ids for every member who has a picture, keyed by userId AND email —
    one read serves the whole workspace's avatars, and the email key keeps a
    picture findable when the session's internal user id changes between SSO
    logins. */
export async function getAllAvatarFileIds(): Promise<Record<string, string>> {
  const rows = await listProfiles();
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (!row.avatarFileId) continue;
    if (row.userId) map[row.userId] = row.avatarFileId;
    if (row.email) map[row.email.toLowerCase()] = row.avatarFileId;
  }
  return map;
}

/** Point a user's profile at a (newly uploaded) file id, creating the row if
    needed. The row is found by userId OR email — so a picture saved under an
    earlier identity's id is picked up and re-keyed to the current one. */
export async function saveAvatar(userId: string, fileId: string, email = ""): Promise<void> {
  const rows = await listProfiles();
  const normalizedEmail = email.toLowerCase();
  const existing = rows.find(
    (row) =>
      (row.userId && row.userId === userId) ||
      (normalizedEmail && row.email && row.email.toLowerCase() === normalizedEmail),
  );
  if (existing?.itemId) {
    await userProfiles.update(existing.itemId, { userId, avatarFileId: fileId, email });
    return;
  }
  const result = await userProfiles.create({ userId, email, avatarFileId: fileId });
  // A failed create would leave the upload orphaned — surface it.
  const record = isRecord(result) ? result : {};
  const data = isRecord(record.data) ? record.data : {};
  const acknowledged = Object.values(data).some(
    (value) => isRecord(value) && value.acknowledged === true,
  );
  if (!acknowledged && !str(record.itemId)) {
    throw new Error("Avatar record could not be saved.");
  }
}

/**
 * Upload an image and return its Blocks Data file id. Cloud path: presign,
 * provider-direct PUT. This configuration doesn't require upload completion,
 * so the file is usable as soon as the PUT lands.
 */
export async function uploadAvatarFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Please pick an image under 5 MB.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Please pick an image file.");
  }

  const presign = await blocksClient.data.files.presignedUploadUrl({
    name: file.name,
    configurationName: CONFIGURATION_NAME,
    accessModifier: "Private",
  });
  const record = isRecord(presign) ? presign : {};
  const uploadUrl = str(record.uploadUrl);
  const fileId = str(record.fileId);
  if (record.isSuccess === false || !uploadUrl || !fileId) {
    throw new Error("Upload could not be started.");
  }

  await blocksClient.data.files.uploadToUrl({
    url: uploadUrl,
    body: file,
    contentType: file.type || "application/octet-stream",
  });
  return fileId;
}

/** Retire a replaced picture — soft delete keeps it restorable from trash. */
export async function deleteAvatarFile(fileId: string): Promise<void> {
  await blocksClient.data.files.delete({ fileId, permanent: false });
}

/**
 * Resolve a file id to a provider download URL. Pre-signed URLs expire, so
 * callers cache briefly (see lib/avatar.ts) rather than forever.
 */
export async function resolveAvatarUrl(fileId: string): Promise<string> {
  const response = await blocksClient.data.files.get(fileId, { configurationName: CONFIGURATION_NAME });
  return findDownloadUrl(response, 0);
}

function findDownloadUrl(value: unknown, depth: number): string {
  if (depth > 3 || !isRecord(value)) return "";
  for (const [key, nested] of Object.entries(value)) {
    if (/url$/i.test(key) && typeof nested === "string" && /^https?:\/\//.test(nested)) return nested;
  }
  for (const nested of Object.values(value)) {
    if (isRecord(nested)) {
      const found = findDownloadUrl(nested, depth + 1);
      if (found) return found;
    }
  }
  return "";
}
