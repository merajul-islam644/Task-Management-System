import { blocksClient } from "@/lib/blocks/client";
import { assertSuccess } from "@/lib/blocks/envelope";

/**
 * The signed-in user acting on their own IAM account — the self-service half
 * of IAM. Admin edits of OTHER users live in userService; nothing here ever
 * passes a user id (the backend resolves "me" from the access token).
 */

export interface MyAccount {
  firstName: string;
  lastName: string;
  email: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** The signed-in user's own IAM record (`GET /iam/v4/iam/me` — the user
    fields arrive inside the `{data}` envelope, not at the top level). */
export async function getMyAccount(): Promise<MyAccount> {
  const res = await blocksClient.iam.me();
  const data = isRecord(res) && isRecord(res.data) ? res.data : {};
  return {
    firstName: str(data.firstName),
    lastName: str(data.lastName),
    email: str(data.email),
  };
}

/** Update the signed-in user's own name (`POST /iam/v4/iam/me`). */
export async function updateMyName(firstName: string, lastName: string): Promise<void> {
  const res = await blocksClient.iam.updateMe({ firstName, lastName });
  assertSuccess(res);
}

/** Authenticated password change (`POST /iam/v4/auth/change-password`). The
    auth client resolves non-2xx bodies instead of throwing, so the envelope
    check is what surfaces a wrong current password to the caller. */
export async function changeMyPassword(oldPassword: string, newPassword: string): Promise<void> {
  const res = await blocksClient.auth.changePassword({ oldPassword, newPassword });
  assertSuccess(res);
}
